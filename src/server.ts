// src/server.ts
import express from "express";
import multer from "multer";
import { lookupMemory } from "./lookupMemory.js"; // ✅ memory lookup from long_term_memory
import fs from "fs";
import path from "path";
import cors from "cors";
import { storeMessage } from "./memory.js"; // ✅ Add this
import { extractTextFromEasyOCR } from "./ocr/ocrClient.js"; // ✅ import OCR client
import { storeToMemory } from "./storeToMemory.js";
import { ENV } from "./env.js";
import { ingestMaterial } from "./ingest.js";
import { getAgentExecutor } from "./agent.js";
import { getRetrieverForMaterial } from "./retrieval.js";
import { QA_PROMPT } from "./prompts.js";

import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { reflectOnAnswer } from "./reflector.js";
import axios from "axios";

/* ---------- Multer storage: keep correct file extension ---------- */
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads"),
  filename: (_req, file, cb) => {
    const origExt = path.extname(file.originalname || "");
    const guessed =
      !origExt &&
      (file.mimetype === "application/pdf"
        ? ".pdf"
        : file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? ".docx"
        : "");
    const ext = origExt || guessed || "";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage });

/* ---------- Express ---------- */
const app = express();
app.use(cors());
app.use(express.json()); // 👈 ADD THIS LINE

/* ---------- Helper: build chat model (no undefined apiKey) ---------- */
function makeChatModel() {
  if (ENV.CHAT_PROVIDER === "groq") {
    if (!ENV.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is required when CHAT_PROVIDER=groq");
    }
    return new ChatGroq({ model: ENV.CHAT_MODEL, apiKey: ENV.GROQ_API_KEY });
  }
  if (ENV.CHAT_PROVIDER === "openai") {
    if (!ENV.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when CHAT_PROVIDER=openai");
    }
    return new ChatOpenAI({
      model: ENV.CHAT_MODEL,
      apiKey: ENV.OPENAI_API_KEY,
    });
  }
  // If you truly only want Groq, you can throw here instead:
  throw new Error(
    `Unsupported CHAT_PROVIDER: ${ENV.CHAT_PROVIDER}. Use 'groq' or 'openai'.`
  );
}

/* ---------- Upload -> Ingest ---------- */
app.post("/api/materials/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      throw new Error("No file uploaded (form-data key must be 'file').");

    const mime = req.file.mimetype || "";
    const ext = path.extname(req.file.originalname).toLowerCase();
    const detectedType =
      mime === "application/pdf" || ext === ".pdf"
        ? "pdf"
        : mime.startsWith("image/")
        ? "image"
        : mime ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? "docx"
        : (String(req.body.type) as "pdf" | "docx" | "image" | "txt");
    const meta = {
      tenantId: String(req.body.tenantId || ""),
      classId: String(req.body.classId || ""),
      sectionId: String(req.body.sectionId || ""),
      subjectId: String(req.body.subjectId || ""),
      teacherId: String(req.body.teacherId || ""),
      title: String(req.body.title || req.file.originalname || "Material"),
      type: detectedType,
      materialId: String(req.body.materialId || ""),
      path: req.file.path,
    };

    if (!meta.materialId) throw new Error("materialId is required.");

    // 👇 If image → send to OCR microservice first
    if (detectedType === "image") {
      console.log("🧠 Sending image to OCR service...");
      const extractedText = await extractTextFromEasyOCR(req.file.path);
      console.log("✅ OCR extracted text length:", extractedText.length);

      // Save extracted text to temp .txt
      const txtPath = path.join(
        "uploads",
        `${path.parse(req.file.filename).name}.txt`
      );
      fs.writeFileSync(txtPath, extractedText);
      meta.path = txtPath;
      meta.type = "txt";
    }

    // 🧩 Proceed to ingestion (same as before)
    const out = await ingestMaterial(meta);

    res.json({
      ok: true,
      materialId: meta.materialId,
      type: meta.type,
      ocr: detectedType === "image" ? true : false,
      chunks: out.chunks,
      stats: out.stats,
    });
  } catch (e: any) {
    console.error("UPLOAD/INGEST ERROR:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/* ---------- Chat (agent first, simple RAG fallback) ---------- */
app.post("/api/rag/chat", async (req, res) => {
  try {
    const { materialId, input, chat_history = [], mode = "concise" } = req.body;
    if (!materialId || !input || typeof input !== "string" || input.trim().length < 2) {
      return res.status(400).json({ ok: false, error: "Invalid input." });
    }

    console.log("💬 User Input:", input);

    // --- 1️⃣ Memory lookup ---
    const memoryResult = await lookupMemory.func({ query: input });
    let parsed: any;
    try {
      parsed = JSON.parse(memoryResult);
    } catch {
      parsed = {};
    }

    const similarityScore = Number(parsed.bestMatchScore ?? 0);
    const isValidMemory =
      parsed.text &&
      typeof parsed.text === "string" &&
      !parsed.text.includes("No relevant memories") &&
      similarityScore >= 0.6;

    if (isValidMemory) {
      const reflection = await reflectOnAnswer(input, parsed.text);
      await storeMessage("default-session", "guest", "user", input);
      await storeMessage("default-session", "guest", "assistant", parsed.text);
      await storeToMemory(parsed.text, "guest");
      return res.json({ ok: true, output: parsed.text, reflection });
    }

    // --- 2️⃣ Agentic Path ---
    const agent = await getAgentExecutor();
    const result = await agent.invoke({
      input: `Mode: ${mode}. Material ID: ${materialId}. User says: ${input}.
              When you call tools, ALWAYS include this materialId.`,
      chat_history,
    });

    if (result?.output) {
      let reflection = await reflectOnAnswer(input, result.output);
      if (reflection?.needsImprovement && reflection?.suggestions) {
        const improved = await agent.invoke({
          input: `${input}\n\nImprove your previous answer using these notes:\n${reflection.suggestions}`,
          chat_history,
        });
        if (improved?.output) {
          await storeMessage("default-session", "guest", "user", input);
          await storeMessage(
            "default-session",
            "guest",
            "assistant",
            improved.output
          );
          await storeToMemory(improved.output, "guest");
          return res.json({
            ok: true,
            output: improved.output,
            reflection,
            improved: true,
          });
        }
      }
      await storeMessage("default-session", "guest", "user", input);
      await storeMessage(
        "default-session",
        "guest",
        "assistant",
        result.output
      );
      await storeToMemory(result.output, "guest");
      return res.json({
        ok: true,
        output: result.output,
        reflection,
        improved: false,
      });
    }

    // --- 3️⃣ Simple RAG Fallback ---
    const retriever = await getRetrieverForMaterial(materialId, 8);
    const docs = await retriever.getRelevantDocuments(input);
    const context = docs.map((d) => d.pageContent).join("\n---\n");
    const llm = makeChatModel();
    const chain = RunnableSequence.from([
      QA_PROMPT,
      llm,
      new StringOutputParser(),
    ]);
    let text = await chain.invoke({ question: input, context });

    const reflection = await reflectOnAnswer(input, text);
    await storeToMemory(text, "guest");
    await storeMessage("default-session", "guest", "user", input);
    await storeMessage("default-session", "guest", "assistant", text);

    const sources =
      "Sources: " +
      Array.from(new Set(docs.map((d) => `p.${d.metadata?.page ?? "?"}`))).join(
        "; "
      );

    return res.json({ ok: true, output: `${text}\n\n${sources}`, reflection });
  } catch (e: any) {
    console.error("CHAT ERROR:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/* ---------- Health ---------- */
app.get("/", (_req, res) =>
  res.send("CampusFlow Agentic RAG (Groq/OpenAI + HF embeddings) up")
);

app.listen(ENV.PORT, () => console.log("Server on", ENV.PORT));

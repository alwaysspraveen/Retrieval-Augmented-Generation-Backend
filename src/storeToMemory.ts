import { getMemoryVectorStore } from "./vectorstore.js";
import { Document } from "@langchain/core/documents";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function storeToMemory(text: string, userId = "guest") {
  const store = await getMemoryVectorStore();

  const doc = new Document({
    pageContent: text,
    metadata: {
      id: uuidv4(),
      type: "memory",
      userId,
      timestamp: Date.now(),
    },
  });

  console.log("🧠 Adding to memory:", text.slice(0, 100));
  await store.addDocuments([doc]);

  const dir = join(process.cwd(), "vectorstores", "long_term_memory");
  await store.save(dir); // ⬅ force save FAISS index

  console.log("✅ Stored and saved memory to:", dir);
}

// scripts/initMemory.ts
import { getEmbeddings } from "../src/vectorstore.js";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "@langchain/core/documents";
import { join } from "path";

async function initMemoryStore() {
  const dir = join("vectorstores", "long_term_memory");
  const embeddings = await getEmbeddings();
  const docs = [
    new Document({
      pageContent: "Welcome to memory store. This is a seed document.",
      metadata: { init: true },
    }),
  ];
  const store = await FaissStore.fromDocuments(docs, embeddings);
  await store.save(dir);
  console.log("✅ long_term_memory FAISS store initialized!");
}

initMemoryStore();

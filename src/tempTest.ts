import { getMemoryVectorStore } from "./vectorstore.js";

const test = async () => {
  const store = await getMemoryVectorStore();

  const retriever = store.asRetriever({ k: 3 });
  const results = await retriever.getRelevantDocuments("Padma Shri");

  console.log("🔍 Retrieved:", results.map(r => r.pageContent));
};

test();

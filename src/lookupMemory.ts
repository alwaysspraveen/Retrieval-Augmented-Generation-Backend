import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { getMemoryVectorStore } from "./vectorstore.js";
import { Document } from "@langchain/core/documents";

export const lookupMemory = new DynamicStructuredTool({
  name: "lookup_memory",
  description:
    "Search long-term memory for previously stored facts or answers. Use this when the answer might already be known or was seen earlier.",

  schema: z.object({
    query: z.string().describe("The topic or question to look up in memory"),
  }),

  func: async ({ query }) => {
    if (!query || query.trim().length < 3) {
      return JSON.stringify({
        text: "No relevant memories found.",
        bestMatchScore: 0,
      });
    }

    const memoryStore = await getMemoryVectorStore();
    const k = 5;

    const raw = await memoryStore.similaritySearchWithScore(query, k);
    if (!raw.length) {
      return JSON.stringify({
        text: "No relevant memories found.",
        bestMatchScore: 0,
      });
    }

    // distance -> similarity (0..1), e.g., sim = 1/(1+dist)
    const toSim = (dist: number) => 1 / (1 + dist);
    const results = raw.map(([doc, dist]) => [doc, toSim(dist)] as const);

    console.log("🔍 SIMILARITY RESULTS:");
    results.forEach(([doc, sim], i) => {
      console.log(
        `Result ${i + 1}: sim=${sim.toFixed(
          4
        )}, content="${doc.pageContent.slice(0, 100)}..."`
      );
    });

    // exclude seeded doc by metadata.init
    const cleanedResults = results.filter(
      ([doc]) => !(doc.metadata as any)?.init
    );

    if (!cleanedResults.length) {
      return JSON.stringify({
        text: "No relevant memories found.",
        bestMatchScore: 0,
      });
    }

    // adaptive threshold on similarity
    const avgSim =
      cleanedResults.reduce((a, [, s]) => a + s, 0) / cleanedResults.length;
    const minSim = Math.max(0.65, avgSim * 0.9);

    // Replace your cleanedQ logic with:
    const stopwords = [
      "who",
      "what",
      "is",
      "are",
      "the",
      "a",
      "an",
      "to",
      "of",
      "how",
    ];

    // robust tokenization with unicode
    const tokens = query.match(/\b[\p{L}\p{N}_-]+\b/gu) ?? [];
    const meaningful = tokens.filter(
      (w) => !stopwords.includes(w.toLowerCase()) && w.length > 2
    );

    // ✅ allow single-topic lookups (e.g., "Kuvempu")
    if (meaningful.length < 1) {
      return JSON.stringify({
        text: "Query too vague to search memory.",
        bestMatchScore: 0,
      });
    }

    const filtered = cleanedResults
      .filter(([doc, sim]) => sim >= minSim && doc.pageContent)
      .sort((a, b) => b[1] - a[1]); // best first

    if (!filtered.length) {
      return JSON.stringify({
        text: "No relevant memories found.",
        bestMatchScore: 0,
      });
    }

    const formatted = filtered
      .map(
        ([doc, sim]) =>
          `• ${doc.pageContent.slice(0, 300)} (sim: ${sim.toFixed(3)})`
      )
      .join("\n\n");

    return JSON.stringify({
      text: `Here are ${filtered.length} related memories:\n\n${formatted}`,
      bestMatchScore: filtered[0]?.[1] ?? 0, // ✅ this is required
    });
  },
});

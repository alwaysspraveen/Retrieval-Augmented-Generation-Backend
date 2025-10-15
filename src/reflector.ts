import { z } from "zod";
import { chatModel } from "./agent.js";
import { storeReflection } from "./reflectionMemory.js";
import { REFLECTION_PROMPT } from "./prompts.js";

export const ReflectionSchema = z.object({
  score: z.number().min(0).max(1),
  critique: z.string(),
  needsImprovement: z.boolean(),
  suggestions: z.union([z.string(), z.null(), z.undefined()]).transform((v) => v ?? ""),
});
export type ReflectionResult = z.infer<typeof ReflectionSchema>;

export async function reflectOnAnswer(
  query: string,
  answer: string,
  retrievedContext?: string
): Promise<ReflectionResult> {
  let llm = chatModel();

  const structured = llm.withStructuredOutput(ReflectionSchema);
  const prompt = `${REFLECTION_PROMPT}
Question: ${query}
Answer: ${answer}
Context: ${retrievedContext || "(none)"}`;

  let reflection: ReflectionResult;

  try {
    const raw = await structured.invoke(prompt);
    reflection = {
      score: raw.score,
      critique: raw.critique,
      needsImprovement: raw.needsImprovement,
      suggestions: raw.suggestions ?? "",
    };
  } catch {
    reflection = {
      score: 0.5,
      critique: "Reflection parsing failed.",
      needsImprovement: false,
      suggestions: "",
    };
  }

  console.log("🪞 Reflection parsed:", reflection);
  await storeReflection({ query, answer, ...reflection });
  return reflection;
}

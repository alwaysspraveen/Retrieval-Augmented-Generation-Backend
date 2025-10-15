import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ENV } from "./env.js";
import { ALL_TOOLS } from "./tools.js";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

/* ---------------- BASE AGENT PROMPT ---------------- */
const AGENT_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are CampusFlow's Agentic RAG for School LMS.

You have tools to retrieve documents, summarize, generate quizzes, and recall long-term memory.

💡 When the user asks to remember, recall, or reference earlier answers — use the tool: 'lookup_memory'.

Otherwise:
→ retrieve_context → answer_with_context or summarize_context or quiz_from_context.

Always respond in 4–6 sentences maximum. Be concise and student-friendly. 
Use citations like [p.X] and end with a "Sources:" line if context is used.`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

export function chatModel() {
  const model = ENV.CHAT_MODEL;
  if (ENV.CHAT_PROVIDER === "groq") {
    if (!ENV.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");
    return new ChatGroq({ model, apiKey: ENV.GROQ_API_KEY });
  }
  if (ENV.CHAT_PROVIDER === "openai") {
    if (!ENV.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
    return new ChatOpenAI({ model, apiKey: ENV.OPENAI_API_KEY });
  }
  throw new Error(`Unsupported CHAT_PROVIDER: ${ENV.CHAT_PROVIDER}`);
}

export async function getAgentExecutor(): Promise<AgentExecutor> {
  const agent = await createOpenAIFunctionsAgent({
    llm: chatModel() as any,
    tools: ALL_TOOLS,
    prompt: AGENT_PROMPT,
  });
  return new AgentExecutor({ agent, tools: ALL_TOOLS });
}

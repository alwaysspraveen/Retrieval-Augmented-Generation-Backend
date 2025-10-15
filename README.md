
# 🧠 Self-Reflection Agentic RAG Backend

A production-ready **Agentic RAG (Retrieval-Augmented Generation)** backend built with **Node.js + TypeScript**, designed to provide **autonomous reasoning, memory, and self-improving AI responses**.  
It combines **retrieval, self-reflection, memory storage, and planning** to deliver more accurate, contextual, and human-like answers over time.

---

## 🚀 Overview

This backend goes beyond simple RAG by adding **agentic intelligence** and **self-reflection** capabilities:

- 🤖 **Agentic Planning** – Breaks complex queries into subtasks and executes them step-by-step.  
- 🧠 **Self-Reflection** – After every response, the agent evaluates quality, identifies gaps, and refines future answers.  
- 📚 **Memory System** – Stores both short-term (conversation) and long-term (vector) memory for continuous learning.  
- 🔍 **Retrieval-Augmented Generation** – Combines semantic search with LLM reasoning for grounded, factual results.  
- 🧰 **Extensible Tools** – Modular toolset for searching, reasoning, summarizing, and more.

---

## 🗂️ Project Structure

```
agentic-rag-backend/
│
├─ src/
│  ├─ agent/               # Core agent logic
│  │   ├─ planner.ts       # Breaks queries into subtasks
│  │   ├─ reflection.ts    # Self-reflection loop
│  │   ├─ executor.ts      # Tool orchestration
│  │   └─ memory.ts        # Short-term & long-term memory
│  │
│  ├─ retrieval/           # Vector store & retrieval logic
│  │   ├─ embedder.ts      # Embedding generation
│  │   ├─ vectorStore.ts   # FAISS / SQLite storage
│  │   └─ retriever.ts     # Semantic search
│  │
│  ├─ api/                 # Express REST API
│  │   └─ routes.ts        # `/rag/query`, `/ingest`, etc.
│  │
│  ├─ utils/               # Helpers & config
│  │   └─ logger.ts
│  │
│  └─ server.ts            # Entry point
│
├─ .env.example            # Environment variable template
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/agentic-rag-backend.git
cd agentic-rag-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Set your keys and configs:
```
OPENAI_API_KEY=your_openai_key
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_DB_PATH=./data/vectorstore.db
```

---

## ▶️ Running the Server

### Development
```bash
npx tsx initMemory
```
```bash
npx tsx server
```
### Production
```bash
npm run build
npm start
```

Server will run on:  
👉 `http://localhost:5000`

---

## 🔥 API Endpoints

### 📥 Ingest Document  
**POST** `/api/ingest`  
Upload and embed documents into the vector database.

**Body:**
```json
{
  "text": "Paste or upload your document content here."
}
```

---

### 🤖 Query Agent  
**POST** `/api/rag/query`  
Ask a question — the agent retrieves, reasons, reflects, and responds.

**Body:**
```json
{
  "query": "What are the main challenges in quantum computing?"
}
```

**Response:**
```json
{
  "answer": "The main challenges include error correction, qubit stability, and scalability...",
  "reflection": "The initial answer lacked detail on scalability. Future responses will elaborate further.",
  "sources": []
}
```

---

## 🧠 Core Architecture

### 1. Retrieval Layer  
- Ingests documents and converts them into embeddings  
- Uses FAISS / SQLite for semantic vector search  

### 2. Agent Core  
- Plans multi-step tasks  
- Calls appropriate tools (search, summarization, etc.)  
- Executes reasoning chain

### 3. Self-Reflection Loop  
- Analyzes its own answers  
- Detects weaknesses or missing info  
- Stores “insights” into memory for future responses

### 4. Memory System  
- **Short-Term Memory:** Session-based context  
- **Long-Term Memory:** Persistent vector database  
- **Reflections:** Stored as metadata to guide future behavior

---

## 🧰 Tech Stack

| Component              | Technology                      |
|------------------------|-------------------------------|
| Server                | Node.js + Express.js          |
| Language              | TypeScript                    |
| Vector DB            | FAISS / SQLite               |
| LLM Integration      | OpenAI / Groq / Ollama APIs  |
| Memory               | Custom embedding store        |
| Self-Reflection      | Custom reasoning pipeline     |

---

## 🧠 Example Flow

1. 📄 **Ingest:** Upload docs → embedded → vector DB  
2. 🔎 **Retrieve:** Agent searches relevant chunks  
3. 🧩 **Plan:** Planner splits complex question into subtasks  
4. 🧠 **Reflect:** Checks output quality → improves reasoning  
5. 📚 **Store:** Reflection & context saved for future sessions  

---

## 🧪 Roadmap

- [ ] Multi-user isolated memory  
- [ ] Autonomous multi-step reasoning  
- [ ] Web UI chat with reflection view  
- [ ] Tool-calling for external APIs  
- [ ] Local LLM integration (Ollama / GGUF)

---

## 🤝 Contributing

Contributions are welcome!  
1. Fork the repo  
2. Create a feature branch: `git checkout -b feature/new-feature`  
3. Commit changes: `git commit -m "Add new feature"`  
4. Push: `git push origin feature/new-feature`  
5. Open a PR 🚀

---

## 📜 License

MIT License © 2025 [Your Name / Sysnut Technologies]

---

## 🌟 Acknowledgements

- Inspired by LangChain Agents, ReAct, and Self-Reflective AI research.  
- Built for production-grade RAG applications with continuous learning.

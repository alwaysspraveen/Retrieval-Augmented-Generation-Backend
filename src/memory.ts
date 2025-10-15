import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

const db = new Database("./vectorstores/agent_memory.sqlite");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  sessionId TEXT,
  userId TEXT,
  role TEXT, -- user | assistant
  content TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

export function storeMessage(
  sessionId: string,
  userId: string,
  role: string,
  content: string
) {
  const id = uuid();
  db.prepare(
    `INSERT INTO memories (id, sessionId, userId, role, content) VALUES (?, ?, ?, ?, ?)`
  ).run(id, sessionId, userId, role, content);
}

export function loadMessages(
  sessionId: string,
  userId: string,
  limit = 20
): Array<{ role: string; content: string }> {
  const rows = db
    .prepare(
      `SELECT role, content FROM memories WHERE sessionId = ? AND userId = ? ORDER BY createdAt DESC LIMIT ?`
    )
    .all(sessionId, userId, limit) as Array<{ role: string; content: string }>;

  return rows.reverse(); // Return in oldest → newest order
}

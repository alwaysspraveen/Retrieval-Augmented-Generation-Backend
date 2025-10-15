// src/reflectionMemory.ts
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "vectorstores");
const REFLECTION_FILE = path.join(ROOT, "reflection_log.json");

export async function storeReflection(reflection: any) {
  try {
    // ensure dir exists
    if (!fs.existsSync(ROOT)) {
      fs.mkdirSync(ROOT, { recursive: true });
    }

    let data: any[] = [];
    if (fs.existsSync(REFLECTION_FILE)) {
      try {
        const raw = fs.readFileSync(REFLECTION_FILE, "utf8");
        data = raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn("⚠️ reflection_log.json unreadable, resetting file:", e);
        data = [];
      }
    }

    data.push({ ...reflection, timestamp: new Date().toISOString() });

    fs.writeFileSync(REFLECTION_FILE, JSON.stringify(data, null, 2));
    console.log("📝 Reflection stored at:", REFLECTION_FILE);
  } catch (e) {
    console.error("❌ Failed to store reflection:", e);
  }
}

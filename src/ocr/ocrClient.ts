import fs from "fs";
import axios from "axios";
import FormData from "form-data";

/**
 * Sends an image or PDF to EasyOCR microservice and returns extracted text.
 */
export async function extractTextFromEasyOCR(filePath: string): Promise<string> {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const response = await axios.post("http://127.0.0.1:5001/ocr", form, {
      headers: form.getHeaders(),
      timeout: 60000, // 60s
    });

    if (response.data?.text) {
      console.log("✅ OCR text length:", response.data.text.length);
      return response.data.text.trim();
    }

    throw new Error(response.data?.error || "Empty OCR response");
  } catch (err: any) {
    console.error("❌ EasyOCR extraction failed:", err.message);
    return "";
  }
}

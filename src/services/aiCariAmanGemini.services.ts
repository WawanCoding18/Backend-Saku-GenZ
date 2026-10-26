import "dotenv/config";
import { aiConfig } from "../utils/config/ai.config";
import { GoogleGenAI } from "@google/genai";
import { FULL_SYSTEM_INSTRUCTION_OJK } from "../utils/OJK.prompts";

const aiText = new GoogleGenAI({ apiKey: aiConfig.gemini.apiKey });

export const streamGemini = async (
  message: string,
  ojkMatchStatus: string,
  res: any
): Promise<void> => {
 
  const totalChars = (message?.length || 0) + FULL_SYSTEM_INSTRUCTION_OJK.length;
  const estimatedTokens = Math.ceil(totalChars / 3.5);

  console.log("--------------------------------------------------");
  console.log("💬 [DEBUG DATA TEXT]");
  console.log(" Panjang Pesan User   :", message?.length || 0, "karakter");
  console.log(
    " Panjang System Prompt:",
    FULL_SYSTEM_INSTRUCTION_OJK.length,
    "karakter System Prompt"
  );
  console.log(" Total Karakter Teks  :", totalChars, "karakter");
  console.log(" Est. Input Tokens    : ~" + estimatedTokens, "tokens");
  console.log("--------------------------------------------------");

  const responseStream = await aiText.models.generateContentStream({
    model: aiConfig.gemini.model, 
    contents: `Teks/hasil yang diterima pengguna:\n"""${message}"""\n\nVariabel ojk_match_status dari backend: ${ojkMatchStatus}`,
    config: {
      systemInstruction: FULL_SYSTEM_INSTRUCTION_OJK,
      responseMimeType: "application/json",
      maxOutputTokens: 2048
    },
  });

  for await (const chunk of responseStream) {
    const parts = chunk.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        res.write(
          `data: ${JSON.stringify({ type: "answer", text: part.text })}\n\n`
        );
      }
    }
  }
};

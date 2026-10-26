import { aiConfig } from "../utils/config/ai.config";
import { FULL_SYSTEM_INSTRUCTION_KALKULATOR_BUNGA } from "../utils/KalkulatorBunga.prompts";

export const streamGroq = async (message: string, res: any): Promise<void> => {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const userMsgLength = message?.length || 0;
  const systemPromptLength = FULL_SYSTEM_INSTRUCTION_KALKULATOR_BUNGA?.length || 0;

  const totalChars = userMsgLength + systemPromptLength;
  const estimatedTokens = Math.ceil(totalChars / 3.5);

  console.log("--------------------------------------------------");
  console.log("💬 [DEBUG DATA TEXT]");
  console.log(" Panjang Pesan User   :", userMsgLength, "karakter");
  console.log(" Panjang System Prompt:", systemPromptLength, "karakter");
  console.log(" Total Karakter Teks  :", totalChars, "karakter");
  console.log(" Est. Input Tokens    : ~" + estimatedTokens, "tokens");
  console.log("--------------------------------------------------");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiConfig.groq.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiConfig.groq.model,
      messages: [
        {
          role: "system",
          content: FULL_SYSTEM_INSTRUCTION_KALKULATOR_BUNGA,
        },
        {
          role: "user",
          content: `Data/Hasil Kalkulasi Pinjaman Pengguna:\n"""${message}"""`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }
  if (!response.body) {
    throw new Error("Groq API tidak mengembalikan response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let inThinkingMode = false;
  let hasReceivedContent = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      if (line.includes("[DONE]")) break;
      if (!line.startsWith("data: ")) continue;

      try {
        const parsed = JSON.parse(line.slice(6));
        let content = parsed.choices?.[0]?.delta?.content || "";
        if (!content) continue;

        if (content.includes("<think>")) {
          inThinkingMode = true;
          content = content.replace("<think>", "");
        }
        if (content.includes("</think>")) {
          inThinkingMode = false;
          content = content.replace("</think>", "");
          continue;
        }
        if (inThinkingMode) continue;

        res.write(
          `data: ${JSON.stringify({ type: "answer", text: content })}\n\n`,
        );
        hasReceivedContent = true;
      } catch (e) {
  
      }
    }
  }

  if (!hasReceivedContent) {
    throw new Error("Groq stream selesai tanpa mengirim konten apapun");
  }
};

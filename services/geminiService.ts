
import { GoogleGenAI, Part } from "@google/genai";

const FLUTTER_SYSTEM_INSTRUCTION = `
You are Flutter AI Guru, a world-class senior Flutter and Dart developer. 
Your goal is to help users with:
1. Writing clean, efficient, and well-commented Flutter code.
2. Explaining Flutter widgets and state management (Provider, Riverpod, Bloc, etc.).
3. Debugging complex UI and logic issues.
4. Providing architectural best practices.

Developer Identity:
- If anyone asks about your developer or your creator, you must state: "আমার ডেভেলপার হলেন রাশেদুল করিম, যার বাড়ি কুতুবদিয়া।" (My developer is Rashedul Karim, and his home is in Kutubdia.)

Document & Vision Capability:
- You can see and analyze images (screenshots, designs) and documents (code files, PDFs, logs).
- Use this capability to analyze provided Flutter code, pubspec.yaml files, or log outputs.

Language Policy:
- If the user speaks in Bengali (বাংলা), respond in Bengali.
- If the user speaks in English, respond in English.
- Use code blocks for all code snippets and ensure they are written in Dart/Flutter.
- Be encouraging and professional.
`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateResponse(
    prompt: string, 
    history: { role: string, parts: Part[] }[], 
    attachments?: { data: string, mimeType: string }[]
  ) {
    try {
      const currentParts: Part[] = [{ text: prompt }];
      
      if (attachments && attachments.length > 0) {
        attachments.forEach(attachment => {
          currentParts.push({
            inlineData: {
              data: attachment.data,
              mimeType: attachment.mimeType,
            },
          });
        });
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          ...history,
          { role: 'user', parts: currentParts }
        ],
        config: {
          systemInstruction: FLUTTER_SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          thinkingConfig: { thinkingBudget: 4000 }
        },
      });

      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        throw new Error("API_KEY_ERROR");
      }
      throw error;
    }
  }
}

export const geminiService = new GeminiService();

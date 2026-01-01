
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  async brainstormCard(topic: string): Promise<{ title: string; content: string; tags: string[] }> {
    if (!topic) topic = 'Something random and interesting';

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a creative sticky note about: "${topic}". 
        Return a JSON object with 'title' (max 5 words), 'content' (max 20 words), and 'tags' (array of 1-3 strings).
        Keep the tone playful and handwritten.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              tags: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      throw new Error('No response text');
    } catch (error) {
      console.error('AI Error:', error);
      return {
        title: 'Oops!',
        content: 'The creativity genie is sleeping. Try again later.',
        tags: ['error', 'try-again']
      };
    }
  }

  async polishText(text: string, mode: 'fix' | 'expand' | 'tone'): Promise<string> {
    try {
      let prompt = '';
      if (mode === 'fix') prompt = 'Fix grammar and spelling. Keep the formatting markdown.';
      if (mode === 'expand') prompt = 'Expand on this thought with 1-2 sentences. Keep it informal.';
      if (mode === 'tone') prompt = 'Rewrite this to sound more enthusiastic and playful.';

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${prompt}\n\nInput Text:\n${text}`,
      });
      return response.text || text;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function gemini(apiKey: string, contents: string, schema?: object): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contents }] }],
        ...(schema ? { generationConfig: { responseMimeType: 'application/json', responseSchema: schema } } : {}),
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Gemini error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { action } = body;

  try {
    if (action === 'brainstorm') {
      const topic = (body['topic'] as string) || 'Something random and interesting';
      const text = await gemini(
        apiKey,
        `Create a creative sticky note about: "${topic}". Return a JSON object with 'title' (max 5 words), 'content' (max 20 words), and 'tags' (array of 1-3 strings). Keep the tone playful and handwritten.`,
        {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            content: { type: 'STRING' },
            tags: { type: 'ARRAY', items: { type: 'STRING' } },
          },
        }
      );
      return json(JSON.parse(text));
    }

    if (action === 'polish') {
      const text = body['text'] as string;
      const mode = body['mode'] as string;
      const prompts: Record<string, string> = {
        fix: 'Fix grammar and spelling. Keep the formatting markdown.',
        expand: 'Expand on this thought with 1-2 sentences. Keep the same tone but clean it up.',
        tone: 'Rewrite this to sound more clear, confident, and engaging. Keep the meaning intact.',
      };
      if (!prompts[mode]) return json({ error: 'Unknown mode' }, 400);
      const result = await gemini(apiKey, `${prompts[mode]}\n\nInput Text:\n${text}`);
      return json({ text: result });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function gemini(apiKey: string, contents: string, schema?: object): Promise<string> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { error: authErr } = await client.auth.getUser();
  if (authErr) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { action } = body;

  try {
    if (action === 'brainstorm') {
      const raw = (body['topic'] as string) || '';
      const topic = raw.slice(0, 500) || 'Something random and interesting';
      const text = await gemini(
        apiKey,
        `Create a sticky note about: "${topic}". Return a JSON object with 'title' (max 5 words), 'content' (max 20 words), and 'tags' (array of 1-3 strings).`,
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
      const text = ((body['text'] as string) ?? '').slice(0, 3000);
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
  } catch {
    return json({ error: 'AI request failed' }, 500);
  }
});

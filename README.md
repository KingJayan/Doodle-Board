<div align="center">
<h2><code>KingJayan/Doodle-Board</code></h2>
<p>A visual knowledge board for brainstorming, ideas, and notes with folders, AI-assisted ideation, and offline-first storage.</p>

<img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/Gemini-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
<br>
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
<img src="https://img.shields.io/badge/Bun-F9F1E1?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
<img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />

</div>
<p align="center">
  <img src="https://img.shields.io/badge/version-1.3.0-blue">
</p>

>[!IMPORTANT]
> currently in (open) beta, actively developed(kinda)

> note: uses [husky](https://github.com/KingJayan/Doodle-Board/blob/main/.husky/commit-msg) for inline commit versioning. 
> just append 'major', 'minor', or 'patch' to the end of a commit message to bump the version

<!--
<p align="center">
  <img src="./docs/demo.png" width="800">
</p>
-->

## current features

- create and organize sticky notes with drag-and-drop support
- full markdown compat (import/export, editing, rendering)
- folder(board) organization
- ai-powered brainstorming (via Gemini)
- themes + custom themes
- export/import, auto-save to dexie.js
- filtering + search all
- pin + max/minimize notes
- cloud sync across devices (Supabase, anonymous auth + account linking)
- snapshot sharing with expiry

## v1+
- live collaboration through cf workers + partykit
- paid team features
- language support, browser extension integrations
- more ai providers + webLLM support(llama 3 8b + qwen 2.5 1.5b dep on hardware -- chunk context, run on sw, few-shot)
- image ocr(all platforms) + photo-to-note(mobile)
- docx import support + google docs easy migration


## quickstart

### prereqs

- node 20+ and bun
- a [Supabase](https://supabase.com) project
- a [Google AI API key](https://aistudio.google.com/app/apikey) (for AI features)

### installation

1. clone the repo:
```bash
git clone https://github.com/KingJayan/Doodle-Board.git
cd Doodle-Board
```

2. install deps:
```bash
bun install
```

3. set up env variables:
```bash
cp .env.example .env
```

edit `.env` with your Supabase project credentials (found in Project Settings → API):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. apply the database schema:

create a project at [supabase.com/dashboard](https://supabase.com/dashboard), then run the contents of `supabase/schema.sql` in the SQL editor, or via CLI:
```bash
bunx supabase login
bunx supabase init
bunx supabase link --project-ref your-project-ref
cat supabase/schema.sql | bunx supabase db query --linked
```

5. deploy the AI proxy edge function and set the Gemini secret:
```bash
bunx supabase functions deploy ai-proxy
bunx supabase secrets set GEMINI_API_KEY=your_google_ai_api_key_here
```

6. run the dev server:
```bash
bun dev # http://localhost:5173
```

7. building for prod:

```bash
bun run build # outputs to dist
```


## license

+ GNU GPL-3.0

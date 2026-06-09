<div align="center">
<h2><code>KingJayan/Doodle-Board</code></h2>
<p>A visual knowledge board for brainstorming, ideas, and notes with folders, AI-assisted ideation, and offline-first storage.</p>

<img src="https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white" alt="angular" />
<img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
<img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="tailwindcss" />
<img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="vite" />
<img src="https://img.shields.io/badge/bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white" alt="bun" />
<img src="https://img.shields.io/badge/google%20gemini-%238E75B2.svg?style=for-the-badge&logo=googlegemini&logoColor=white" alt="gemini" />
</div>
<p align="center">
  <img src="https://img.shields.io/badge/version-0.17.0-blue">
</p>

>[!IMPORTANT]
> currently in beta, actively developed(kinda)

> note: uses [husky](https://github.com/KingJayan/Doodle-Board/blob/main/.husky/commit-msg) for inline commit versioning. 
> just append 'major', 'minor', or 'patch' to the end of a commit message to bump the version

<!--
<p align="center">
  <img src="./docs/demo.png" width="800">
</p>
-->

## current features

- create and organize sticky notes
- folder organization
- ai-powered brainstorming (via Gemini)
- themes
- export/import, auto-save to localStorage
- filtering + search
- pin + max/minimize
- cloud sync across devices (Supabase + Dexie.js, anonymous auth + account linking)
- snapshot sharing with expiry

## planned features until v1
- user-custom themes
- performance optimizations for low hardware
- improved file CRUD + folder organization (boards over folders, +nested)

## v1+
- live collaboration through cf workers + partykit (leads to team features--paid)
- language support, browser extension integrations
- more ai providers + webLLM alternative support(llama 3 8b or qwen 2.5 1.5b)
- full markdown editing, rendering, import, and export support


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

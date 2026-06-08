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
  <img src="https://img.shields.io/badge/version-0.13.4-blue">
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

## planned features until v1
- improved themes with full customization/personalization
- performance optimizations for low hardware
- improved file CRUD + folder organization (boards over folders, +nested)
- cloud sync across devices(supabase + dexiejs)

## v1+
- live collaboration through cf workers + partykit
- language support, browser extension integrations
- more ai providers + webLLM alternative support(llama 3 8b or qwen 2.5 1.5b)
- full markdown editing, rendering, import, and export support


## quickstart

### prereqs

- node 18+ and bun
- a google ai api key (for ai features)

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

edit `.env` and add your [Google AI API key](https://aistudio.google.com/app/apikey):
```
VITE_API_KEY=your_google_ai_api_key_here
```

4. run the dev server:
```bash
bun dev # http://localhost:5173
```

5. building for prod:

```bash
bun run build # outputs to dist
```


## license

+ GNU GPL-3.0

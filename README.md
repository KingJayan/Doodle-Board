<div align="center">
<h2><code>KingJayan/Doodle-Board</code></h2>
</div> 

A collaborative visual knowledge board for brainstorming, ideas, and notes with folders, AI-assisted ideation, and offline-first storage.

![Version](https://img.shields.io/badge/version-0.13.4-blue)

>[!IMPORTANT]
> currently in beta
<!-->
<p align="center">
  <img src="./docs/demo.png" width="800">
</p>
-->

## features

- create and organize sticky notes
- folder organization
- ai-powered brainstorming (via Gemini)
- themes
- export/import, auto-save to localStorage
- filtering + search
- pin + max/minimize

## planned features for v1
- supabase + dexiejs for cloud storage accross devices
- performance optimizations on low hardware
- language support, various browser extensions support
- md typing support
- more ai providers + webLLM alternative support(llama 3 8b or qwen 2.5 1.5b)
- improved file CRUD + folder organization (boards over folders, +nested)
- live collaboration through cf workers + partyKit (supabase/firebase realtime or pusher channels are other options)


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

> [!NOTE]
> uses [husky](https://github.com/KingJayan/Doodle-Board/blob/main/.husky/commit-msg) for inline commit versioning. just append 'major', 'minor', or 'patch' to the end of a commit message to bump the version

## stack

- **framework**: Angular 18
- **build tool**: Vite 6
- **styling**: Tailwind CSS 3
- **ai features**: Google Gemini API
- **storage**: localStorage (browser-based)

## license

+ GNU GPL-3.0

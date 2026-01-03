# DoodleBoard 

A playful, collaborative knowledge board built with Angular 18 and Vite.

## Features

- Create and organize sticky notes
- Folder-based organization
- AI-powered brainstorming (via Google Gemini)
- Multiple themes (Paper, Chalkboard, Blueprint)
- Export/Import notes as Markdown or ZIP
- Tag-based filtering
- Search functionality
- Pin and minimize notes
- Auto-save to localStorage
 
## Getting Started

### Prerequisites

- Node.js 18+ and npm, or bun
- A Google AI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/KingJayan/Doodle-Board.git
cd Doodle-Board
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Google AI API key:
```
VITE_API_KEY=your_google_ai_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

4. Run the development server:
```bash
bun run dev
# or
npm run dev
```

5. Open your browser to `http://localhost:3000`

### Building for Production

```bash
bun run build
# or
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Creating Notes
- Click to "+ New Note" button to create a new sticky note
- Click on a note to edit it
- Use to ↗ button to open the full editor

### Organizing Notes
- Create folders in the sidebar
- Drag notes using the drag handle (top-left of each note)
- Use tags to categorize notes
- Pin important notes so they stay at the top

### AI Features
- Click to "Genie" button to brainstorm topics
- In the editor, use "Fix Grammar" or "Expand" to enhance your content
- Note: AI features require a valid Google AI API key

### Exporting/Importing
- Use to "Share" to export notes
- Export entire folders as ZIP files
- Import individual `.md` or `.txt` files
- Import ZIP files to add multiple notes\

## Tech Stack

- **Framework**: Angular 18 (Standalone Components)
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 3
- **AI**: Google Gemini API
- **Storage**: localStorage (browser-based)
- **Fonts**: Patrick Hand, Permanent Marker, Indie Flower

## License
+ 
+ MIT

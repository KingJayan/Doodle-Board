# DoodleBoard

A playful, collaborative knowledge board built with Angular 18 and Vite.

## How to Deploy to Vercel

1.  **Download** all the files from the project.
2.  **Upload to GitHub**:
    *   Create a new Repository on GitHub.
    *   Upload all files to the repository.
3.  **Deploy on Vercel**:
    *   Log in to Vercel.
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your **DoodleBoard** repository.
    *   **Framework Preset**: Vercel should auto-detect **Vite** or **Angular**.
    *   **Environment Variables**:
        *   Add `API_KEY` with your Google Gemini API Key.
    *   Click **Deploy**.

## Local Development (Optional)

If you want to run this locally to remove the red errors in your editor:

1.  Open a terminal in this folder.
2.  Run `npm install` (this downloads the missing modules).
3.  Run `npm run dev`.

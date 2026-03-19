# Clean Reader

Clean Reader is a fast, minimalist web application that extracts the readable content from articles and blog posts, stripping away ads, popups, and clutter so you can focus on what matters.

It uses the **Firefox Reader View engine** (`@mozilla/readability`) under the hood to reliably parse and format content.

## Features

- **Article Mode**: Extract clean, readable text from any specific article URL.
- **Index Mode**: Scan a homepage or blog feed to automatically find and list readable articles.
- **No Ads, No Clutter**: Enjoy a pure reading experience.
- **Serverless Ready**: Built with a modular backend ready for deployment on platforms like Netlify.

## Local Development

**Prerequisites:** Node.js (v18+ recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment:** (Optional)
   Copy `.env.example` to `.env.local` if you need to override the default `APP_URL`.
   ```bash
   cp .env.example .env.local
   ```
3. **Run the development server:**
   ```bash
   npm run dev
   ```
   This will start both the Vite frontend and the Express backend API on `http://localhost:3000`.

## Deployment (Netlify)

This project is pre-configured for easy deployment to Netlify using Netlify Functions.

1. Create a repository (GitHub, GitLab, etc.) and push your code.
2. Connect the repository to Netlify.
3. Netlify will automatically use the settings in `netlify.toml` to build the app and deploy the API as a serverless function.

Alternatively, you can use the Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Express.js, serverless-http (for Netlify deployment)
- **Engine**: `@mozilla/readability`, `jsdom`, `dompurify`

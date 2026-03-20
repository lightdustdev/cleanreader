# Clean Reader

Clean Reader is a fast, minimalist web application that extracts the readable content from articles and blog posts, stripping away ads, popups, and clutter so you can focus on what matters.

It uses the **Firefox Reader View engine** (`@mozilla/readability`) under the hood to reliably parse and format content.

## Features

- **Article Mode**: Extract clean, readable text from any specific article URL.
- **Index Mode**: Scan a homepage or blog feed to automatically find and list readable articles.
- **No Ads, No Clutter**: Enjoy a pure reading experience.
- **Serverless Ready**: Deployed on Vercel using native serverless API functions.

## Local Development

**Prerequisites:** Node.js (v18+ recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the development server:**
   ```bash
   npm run dev
   ```
   This will start both the Vite frontend and the Express backend API on `http://localhost:3000`.

## Deployment (Vercel)

This project is pre-configured for deployment to [Vercel](https://vercel.com).

1. Push your code to a GitHub repository.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Vercel will automatically detect the `vercel.json` config, run `npm run build`, and deploy the API functions from the `api/` directory.

Alternatively, use the Vercel CLI:
```bash
npm install -g vercel
vercel --prod
```

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Express.js (local dev), Vercel Serverless Functions (production)
- **Engine**: `@mozilla/readability`, `jsdom`, `dompurify`

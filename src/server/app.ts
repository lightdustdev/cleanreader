import express from "express";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": "\"Windows\"",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};

const app = express();
app.use(express.json());

// API routes
// Note: Netlify functions often prefix with /.netlify/functions/api
// but we'll handle routing in the function wrapper or netlify.toml
const router = express.Router();

router.post("/extract", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(400).json({ error: `Target website returned an error (${response.status} ${response.statusText}). They might be blocking automated readers.` });
    }

    let html = await response.text();
    
    // Workaround for jsdom/cssstyle bug with CSS variables
    html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/\sstyle=(['"])[^\1]*?\1/gi, '');

    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).json({ error: "Failed to extract content from the page" });
    }

    res.json({
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      dir: article.dir,
      siteName: article.siteName,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({ error: "An error occurred while extracting content" });
  }
});

router.post("/extract-index", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(400).json({ error: `Target website returned an error (${response.status} ${response.statusText}). They might be blocking automated readers.` });
    }

    let html = await response.text();
    
    // Workaround for jsdom/cssstyle bug with CSS variables
    html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/\sstyle=(['"])[^\1]*?\1/gi, '');

    const doc = new JSDOM(html, { url });
    const links: {title: string, url: string}[] = [];
    const seenUrls = new Set<string>();

    let mainNode = doc.window.document.querySelector('main, [role="main"], #main, .main, #content, .content');
    let searchRoot = mainNode || doc.window.document.body || doc.window.document;

    searchRoot.querySelectorAll('a').forEach((a: any) => {
      const title = a.textContent?.trim().replace(/\s+/g, ' ') || '';
      let href = a.getAttribute('href');
      
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
      
      try {
        const absoluteUrl = new URL(href, url).href;
        const isHeading = a.closest('h1, h2, h3, h4, h5, h6');
        
        const isLikelyArticle = title.length > 20 || (isHeading && title.length > 5);
        const isNotMenu = !title.toLowerCase().match(/^(home|about|contact|privacy|terms|sign in|log in|subscribe)$/);
        
        if (isLikelyArticle && isNotMenu && !seenUrls.has(absoluteUrl)) {
          seenUrls.add(absoluteUrl);
          links.push({ title, url: absoluteUrl });
        }
      } catch (e) {
        // ignore invalid URLs
      }
    });

    res.json({ links });
  } catch (error) {
    console.error("Index extraction error:", error);
    res.status(500).json({ error: "An error occurred while extracting the index" });
  }
});

// For local dev, we might mount this at /api
// For Netlify, the function itself handles the routing based on filename
app.use("/api", router);

// Also expose router directly for Netlify serverless-http wrapper
export { app, router };

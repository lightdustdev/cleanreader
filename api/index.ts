// Single self-contained Vercel serverless function for all /api/* routes.
// All logic is inlined here to avoid ESM cross-directory import issues
// caused by package.json "type": "module".
// Vercel accepts an Express app as a default export for Node.js functions.

import express from "express";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

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
  "Upgrade-Insecure-Requests": "1",
};

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(
      `Target website returned an error (${response.status} ${response.statusText}). They might be blocking automated readers.`
    );
  }

  return response.text();
}

function stripStyles(html: string, stripScripts = false): string {
  let result = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  if (stripScripts) {
    result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  return result
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sstyle='[^']*'/gi, "");
}

const app = express();
app.use(express.json());

// POST /api/extract — Article extraction
app.post("/api/extract", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    let html = await fetchHtml(url);
    html = stripStyles(html);

    // Inject <base> so Readability resolves relative URLs correctly
    const htmlWithBase = html.replace(/<head([^>]*)>/i, `<head$1><base href="${url}">`);
    const { document } = parseHTML(htmlWithBase);
    const article = new Readability(document as any).parse();

    if (!article) {
      return res.status(500).json({ error: "Failed to extract content from the page" });
    }

    return res.json({
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      dir: article.dir,
      siteName: article.siteName,
    });
  } catch (error: any) {
    console.error("Extraction error:", error);
    const message = error?.message?.includes("Target website")
      ? error.message
      : "An error occurred while extracting content";
    return res.status(500).json({ error: message });
  }
});

// POST /api/extract-index — Index/TOC extraction
app.post("/api/extract-index", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    let html = await fetchHtml(url);
    html = stripStyles(html, true);

    const { document } = parseHTML(html);
    const links: { title: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const mainNode = document.querySelector(
      'main, [role="main"], #main, .main, #content, .content'
    );
    const searchRoot = mainNode || document.body || document;

    (searchRoot as any).querySelectorAll("a").forEach((a: any) => {
      const title = a.textContent?.trim().replace(/\s+/g, " ") || "";
      const href = a.getAttribute("href");

      if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;

      try {
        const absoluteUrl = new URL(href, url).href;
        const isHeading = a.closest("h1, h2, h3, h4, h5, h6");
        const isLikelyArticle = title.length > 20 || (isHeading && title.length > 5);
        const isNotMenu = !title
          .toLowerCase()
          .match(/^(home|about|contact|privacy|terms|sign in|log in|subscribe)$/);

        if (isLikelyArticle && isNotMenu && !seenUrls.has(absoluteUrl)) {
          seenUrls.add(absoluteUrl);
          links.push({ title, url: absoluteUrl });
        }
      } catch {
        // ignore invalid URLs
      }
    });

    return res.json({ links });
  } catch (error: any) {
    console.error("Index extraction error:", error);
    const message = error?.message?.includes("Target website")
      ? error.message
      : "An error occurred while extracting the index";
    return res.status(500).json({ error: message });
  }
});

export default app;

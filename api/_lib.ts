// Shared extraction utilities used by all Vercel API functions.
// Files prefixed with _ are ignored by Vercel as API routes but
// are bundled when imported by other functions in this directory.

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export const BROWSER_HEADERS = {
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

export async function fetchHtml(url: string): Promise<string> {
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

export function stripStylesAndScripts(html: string, stripScripts = false): string {
  let result = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  if (stripScripts) {
    result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  result = result.replace(/\sstyle="[^"]*"/gi, "").replace(/\sstyle='[^']*'/gi, "");
  return result;
}

export interface ArticleResult {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
}

export function extractArticle(html: string, url: string): ArticleResult | null {
  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  return reader.parse() as ArticleResult | null;
}

export interface IndexLink {
  title: string;
  url: string;
}

export function extractIndex(html: string, baseUrl: string): IndexLink[] {
  const doc = new JSDOM(html, { url: baseUrl });
  const links: IndexLink[] = [];
  const seenUrls = new Set<string>();

  const mainNode = doc.window.document.querySelector(
    'main, [role="main"], #main, .main, #content, .content'
  );
  const searchRoot = mainNode || doc.window.document.body || doc.window.document;

  searchRoot.querySelectorAll("a").forEach((a: any) => {
    const title = a.textContent?.trim().replace(/\s+/g, " ") || "";
    const href = a.getAttribute("href");

    if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;

    try {
      const absoluteUrl = new URL(href, baseUrl).href;
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

  return links;
}

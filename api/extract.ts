import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchHtml, stripStylesAndScripts, extractArticle } from "../../src/server/extract";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body ?? {};
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    let html = await fetchHtml(url);
    html = stripStylesAndScripts(html);

    const article = extractArticle(html, url);
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
}

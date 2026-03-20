import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchHtml, stripStylesAndScripts, extractIndex } from "../../src/server/extract";

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
    html = stripStylesAndScripts(html, true);

    const links = extractIndex(html, url);
    return res.json({ links });
  } catch (error: any) {
    console.error("Index extraction error:", error);
    const message = error?.message?.includes("Target website")
      ? error.message
      : "An error occurred while extracting the index";
    return res.status(500).json({ error: message });
  }
}

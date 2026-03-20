import express from "express";
import { fetchHtml, stripStylesAndScripts, extractArticle, extractIndex } from "./extract";

const app = express();
app.use(express.json());

const router = express.Router();

router.post("/extract", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

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
});

router.post("/extract-index", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

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
});

app.use("/api", router);

export { app };

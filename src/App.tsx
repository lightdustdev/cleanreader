import { useState, FormEvent } from "react";
import { BookOpen, Loader2, ArrowLeft, ExternalLink, AlertCircle, List } from "lucide-react";
import DOMPurify from "dompurify";

interface Article {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
}

interface IndexLink {
  title: string;
  url: string;
}

type Mode = "article" | "index";

export default function App() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("article");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [article, setArticle] = useState<Article | null>(null);
  const [indexLinks, setIndexLinks] = useState<IndexLink[] | null>(null);

  const fetchArticle = async (targetUrl: string) => {
    setIsLoading(true);
    setError(null);
    setArticle(null);

    try {
      let validUrl = targetUrl;
      if (!/^https?:\/\//i.test(validUrl)) {
        validUrl = `https://${validUrl}`;
      }
      new URL(validUrl); // Will throw if invalid

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validUrl }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to extract content");
        }
        setArticle(data);
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error (${response.status}): The extraction service timed out or crashed. The page might be too large or complex.`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndex = async (targetUrl: string) => {
    setIsLoading(true);
    setError(null);
    setIndexLinks(null);

    try {
      let validUrl = targetUrl;
      if (!/^https?:\/\//i.test(validUrl)) {
        validUrl = `https://${validUrl}`;
      }
      new URL(validUrl);

      const response = await fetch("/api/extract-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validUrl }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to extract index");
        }
        setIndexLinks(data.links);
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error (${response.status}): The extraction service timed out or crashed. The page might be too large or complex.`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;

    if (mode === "article") {
      // Clear index links if we are directly fetching an article from home
      setIndexLinks(null);
      await fetchArticle(url);
    } else {
      await fetchIndex(url);
    }
  };

  const handleReset = () => {
    setArticle(null);
    setIndexLinks(null);
    setUrl("");
    setError(null);
  };

  const handleBackToToc = () => {
    setArticle(null);
    setError(null);
  };

  // View 1: Article View
  if (article) {
    const cleanHtml = DOMPurify.sanitize(article.content, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target'],
    });

    return (
      <div className="min-h-screen bg-[#fdfdfc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <header className="sticky top-0 z-10 bg-[#fdfdfc]/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            {indexLinks ? (
              <button
                onClick={handleBackToToc}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Index
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to search
              </button>
            )}
            
            <div className="flex items-center gap-4">
              {article.siteName && (
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider hidden sm:inline-block">
                  {article.siteName}
                </span>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Original
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
          <article className="prose prose-slate prose-lg md:prose-xl max-w-none prose-headings:font-semibold prose-a:text-indigo-600 hover:prose-a:text-indigo-700 prose-img:rounded-2xl prose-img:shadow-sm">
            <h1 className="mb-6 !text-4xl md:!text-5xl !leading-tight !tracking-tight text-slate-900">
              {article.title}
            </h1>
            
            {(article.byline || article.excerpt) && (
              <div className="mb-12 pb-8 border-b border-slate-200">
                {article.excerpt && (
                  <p className="text-xl text-slate-600 leading-relaxed mb-4 font-medium">
                    {article.excerpt}
                  </p>
                )}
                {article.byline && (
                  <p className="text-base text-slate-500 font-medium uppercase tracking-wide">
                    By {article.byline}
                  </p>
                )}
              </div>
            )}

            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ __html: cleanHtml }} 
            />
          </article>
        </main>
      </div>
    );
  }

  // View 2: Index / TOC View
  if (indexLinks) {
    return (
      <div className="min-h-screen bg-[#fdfdfc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <header className="sticky top-0 z-10 bg-[#fdfdfc]/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to search
            </button>
            <div className="flex items-center gap-4">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Original Index
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Table of Contents</h1>
            <p className="text-lg text-slate-600">
              Found {indexLinks.length} readable {indexLinks.length === 1 ? 'article' : 'articles'} on this page.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 mb-8 bg-red-50 text-red-700 rounded-2xl text-left border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {indexLinks.map((link, i) => (
              <button 
                key={i}
                onClick={() => {
                  setUrl(link.url);
                  fetchArticle(link.url);
                }}
                disabled={isLoading}
                className="block w-full text-left p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h2 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 leading-snug">
                  {link.title}
                </h2>
                <p className="text-sm text-slate-500 truncate">{link.url}</p>
              </button>
            ))}
            
            {indexLinks.length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                <List className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No articles found</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  We couldn't automatically detect any article links on this page. Try extracting a specific article URL instead.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // View 3: Home View
  return (
    <div className="min-h-screen bg-[#fdfdfc] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl mx-auto text-center space-y-10">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 mb-2 shadow-sm border border-indigo-100/50">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
            Clean Reader
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-lg mx-auto leading-relaxed">
            Strip away ads, popups, and clutter. Read only what matters.
          </p>
        </div>

        <div className="max-w-xl mx-auto w-full">
          {/* Segmented Control */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-1.5 rounded-xl inline-flex gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setMode('index')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  mode === 'index' 
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <List className="w-4 h-4" />
                Index Page
              </button>
              <button
                type="button"
                onClick={() => setMode('article')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  mode === 'article' 
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Article Page
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
            
            <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={mode === 'index' ? "https://example.com/blog" : "https://example.com/article"}
                className="flex-1 px-6 py-5 text-lg bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
                required
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="mr-3 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract"
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-4 text-sm text-slate-500 font-medium h-6">
            {mode === 'index' 
              ? "Extracts a clean list of articles from a blog or news homepage." 
              : "Extracts the clean reading view of a specific article."}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-2xl text-left max-w-xl mx-auto border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

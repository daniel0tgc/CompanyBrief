import { load } from "cheerio";
import { tavilyExtract } from "./tavily.js";

const MAX_CHARS = 6000;

const STRIP_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "noscript",
  "iframe",
  "[aria-hidden='true']",
].join(", ");

export async function scrapeUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CompanyBriefBot/1.0; +https://companybrief.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = load(html);

    $(STRIP_SELECTORS).remove();

    const text = $("body").text().replace(/\s+/g, " ").trim();

    if (text.length >= 200) {
      return text.slice(0, MAX_CHARS);
    }

    throw new Error("Insufficient content from cheerio");
  } catch {
    return tavilyExtract(url);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const root = parse(html);

    // Check for consent/privacy gates (common on EU news sites)
    const hasConsentGate =
      html.includes("privacy-gate") ||
      html.includes("consent") && html.includes("cookie") ||
      root.querySelector("[class*='consent']") ||
      root.querySelector("[class*='privacy']") ||
      root.querySelector("[id*='consent']");

    if (hasConsentGate && !root.querySelector("article")) {
      return NextResponse.json(
        { error: "This site requires cookie consent. Please copy the text manually." },
        { status: 400 }
      );
    }

    // Remove unwanted elements
    const removeSelectors = [
      "script", "style", "nav", "header", "footer", "aside", "noscript",
      "iframe", "form", "[class*='cookie']", "[class*='consent']",
      "[class*='newsletter']", "[class*='subscribe']", "[class*='social']",
      "[class*='share']", "[class*='comment']", "[class*='related']",
      "[class*='sidebar']", "[class*='advertisement']", "[class*='ad-']",
      "[class*='promo']", "[role='complementary']", "[role='navigation']"
    ];

    removeSelectors.forEach(selector => {
      try {
        root.querySelectorAll(selector).forEach((el) => el.remove());
      } catch {
        // Ignore invalid selectors
      }
    });

    // Try multiple content selectors in order of specificity
    const contentSelectors = [
      "[itemprop='articleBody']",
      "[class*='article-body']",
      "[class*='article-content']",
      "[class*='story-body']",
      "[class*='post-content']",
      "[class*='entry-content']",
      "[class*='content-body']",
      "article [class*='body']",
      "article [class*='content']",
      "article p",
      "article",
      "[role='main']",
      "main",
      ".content",
      "#content",
      "body"
    ];

    let content = null;
    let extractedText = "";

    for (const selector of contentSelectors) {
      try {
        const elements = root.querySelectorAll(selector);
        if (elements.length > 0) {
          // For paragraph selector, combine all paragraphs
          if (selector === "article p") {
            extractedText = elements
              .map(el => el.textContent.trim())
              .filter(t => t.length > 20) // Filter out short snippets
              .join(" ");
          } else {
            content = elements[0];
            extractedText = content.textContent;
          }

          if (extractedText && extractedText.trim().length > 100) {
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!extractedText) {
      return NextResponse.json({ error: "Could not extract content" }, { status: 400 });
    }

    // Clean up the text
    let text = extractedText
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim();

    // Remove common junk phrases
    const junkPatterns = [
      /read more\.?/gi,
      /continue reading\.?/gi,
      /click here\.?/gi,
      /subscribe( now)?\.?/gi,
      /sign up( for)?( our)?( newsletter)?\.?/gi,
      /newsletter/gi,
      /advertisement\.?/gi,
      /sponsored( content)?\.?/gi,
      /share this( article)?\.?/gi,
      /share on (facebook|twitter|linkedin|x)\.?/gi,
      /follow us( on)?\.?/gi,
      /related articles?\.?/gi,
      /recommended( for you)?\.?/gi,
      /you may also like\.?/gi,
      /more from\.?/gi,
      /trending( now)?\.?/gi,
      /popular( articles)?\.?/gi,
      /most read\.?/gi,
      /editors?[''']?s? picks?\.?/gi,
      /skip to (main )?content\.?/gi,
      /menu/gi,
      /search/gi,
      /log ?in/gi,
      /sign ?in/gi,
      /create( an)? account\.?/gi,
      /already a (member|subscriber)\??/gi,
      /\d+ min(ute)?s? read/gi,
      /reading time:? \d+ min(ute)?s?/gi,
      /published:?/gi,
      /updated:?/gi,
      /by [a-z]+ [a-z]+,? (staff|writer|reporter|editor|correspondent)/gi,
      /\|\s*$/g,
      /^\s*\|/g,
      /copyright ©?.*/gi,
      /all rights reserved\.?/gi,
      /terms (of (use|service)|and conditions)\.?/gi,
      /privacy policy\.?/gi,
      /cookie policy\.?/gi,
    ];

    for (const pattern of junkPatterns) {
      text = text.replace(pattern, " ");
    }

    // Clean up multiple spaces again after removal
    text = text.replace(/\s+/g, " ").trim();

    if (!text || text.length < 50) {
      return NextResponse.json({ error: "No readable content found" }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch URL" },
      { status: 500 }
    );
  }
}

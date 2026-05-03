export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TranslateRequest = {
  text?: string;
  source?: string;
  target?: string;
};

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  "hello and welcome to this practice lesson": "Xin chào và chào mừng bạn đến với bài luyện tập này.",
  "today we are learning how batteries work": "Hôm nay chúng ta đang học cách pin hoạt động.",
  "learning with short parts can make listening and typing easier": "Học bằng các phần ngắn có thể làm cho việc nghe và gõ lại dễ hơn.",
};

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslateRequest;
    const text = String(body.text || "").trim();
    const source = body.source || "en";
    const target = body.target || "vi";

    if (!text) {
      return Response.json({ error: "Missing text." }, { status: 400 });
    }

    const fallback = FALLBACK_TRANSLATIONS[normalize(text)] || "";
    const endpoint = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate";
    const apiKey = process.env.LIBRETRANSLATE_API_KEY || "";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: "text",
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.translatedText) {
        return Response.json({ translatedText: data.translatedText, source: "libretranslate" });
      }
    } catch {
      // Fall through to local fallback.
    }

    if (fallback) {
      return Response.json({ translatedText: fallback, source: "local" });
    }

    return Response.json(
      {
        error: "Translation unavailable.",
        details: "LibreTranslate did not return a translation and no local fallback exists.",
      },
      { status: 503 }
    );
  } catch (error: any) {
    return Response.json(
      { error: "Could not translate text.", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

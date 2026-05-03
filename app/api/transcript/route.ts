import { YoutubeTranscript } from "youtube-transcript";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TranscriptLine = {
  text: string;
  offset: number;
  duration: number;
};

function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

function cleanLine(text: string): string {
  return String(text || "")
    .replace(/^>>\s*/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^\)]+\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toSrtTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return (
    [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":") +
    "," +
    String(millis).padStart(3, "0")
  );
}

function buildTimedChunks(lines: TranscriptLine[]) {
  return lines
    .map((line, index) => {
      const text = cleanLine(line.text);
      if (!text) return null;
      const startMs = Number(line.offset ?? 0);
      const endMs = Number((line.offset ?? 0) + (line.duration ?? 0));
      return { id: index + 1, text, startMs, endMs };
    })
    .filter(Boolean);
}

function buildPlainTranscript(lines: TranscriptLine[]): string {
  return lines.map((line) => cleanLine(line.text)).filter(Boolean).join(" ");
}

function buildSrt(lines: TranscriptLine[]): string {
  return lines
    .map((line, index) => {
      const text = cleanLine(line.text);
      if (!text) return null;
      const start = Number(line.offset ?? 0);
      const end = Number((line.offset ?? 0) + (line.duration ?? 0));
      return [String(index + 1), `${toSrtTime(start)} --> ${toSrtTime(end)}`, text].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

async function fetchTranscript(videoId: string, lang: string) {
  // Default-first because several videos return data without a lang parameter
  // but return an empty list when lang=en is forced.
  try {
    const defaultTranscript = await YoutubeTranscript.fetchTranscript(videoId);
    if (defaultTranscript && defaultTranscript.length > 0) return defaultTranscript;
  } catch {}

  try {
    const langTranscript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    if (langTranscript && langTranscript.length > 0) return langTranscript;
  } catch {}

  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url") ?? "";
    const lang = searchParams.get("lang") ?? "en";
    const videoId = parseYouTubeId(url);

    if (!videoId) {
      return Response.json({ error: "Invalid YouTube URL or video ID." }, { status: 400 });
    }

    const transcript = await fetchTranscript(videoId, lang);

    if (!transcript || transcript.length === 0) {
      return Response.json(
        {
          error: "No transcript available for this video.",
          details: "Transcript fetch returned no subtitle lines. Try another video or paste subtitles manually.",
        },
        { status: 404 }
      );
    }

    const lines: TranscriptLine[] = transcript
      .map((item: any) => ({
        text: item.text ?? "",
        offset: Number(item.offset ?? 0),
        duration: Number(item.duration ?? 0),
      }))
      .filter((line) => cleanLine(line.text));

    if (lines.length === 0) {
      return Response.json(
        {
          error: "No usable transcript lines were found.",
          details: "Subtitle lines were empty after cleaning.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      videoId,
      lang,
      transcript: buildPlainTranscript(lines),
      timedChunks: buildTimedChunks(lines),
      srt: buildSrt(lines),
    });
  } catch (error: any) {
    return Response.json(
      {
        error: "Could not fetch transcript.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

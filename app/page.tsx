"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type TimedLine = { id: number; text: string; startMs: number; endMs: number };
type PracticeSegment = { id: number; text: string; startMs?: number; endMs?: number; sourceLineIds?: number[] };
type ReviewStatus = "correct" | "wrong" | "missing" | "extra";
type ReviewDetail = { expected: string; actual: string; status: ReviewStatus };
type ReviewResult = { accuracy: number; correct: number; total: number; details: ReviewDetail[] };
type WordEntry = { word: string; pronunciation: string; partOfSpeech: string; vietnamese: string; synonyms: string[]; example: string; note?: string };
type PopupInfo = { word: string; targetWord?: string; typedWord?: string; status?: ReviewStatus; entry: WordEntry };
type MistakeItem = { id: number; text: string; typed: string; accuracy: number; details: ReviewDetail[]; date: string };
type SpeakingAttempt = { id: number; target: string; heard: string; accuracy: number; completion: number; fluency: number; clarity: string; details: ReviewDetail[]; date: string };
type VocabItem = WordEntry & { savedAt: string };

const demoTranscript = `
Hello and welcome to this practice lesson.
Today we are learning how batteries work.
A battery stores chemical energy and converts it into electrical energy.
When you connect it to a device, electrons begin to flow through the circuit.
That flow of energy helps power the device.
Learning with short parts can make listening and typing easier.
`;

const WORD_DICTIONARY: Record<string, WordEntry> = {
  a: { word: "a", pronunciation: "/ə/ or /eɪ/", partOfSpeech: "article", vietnamese: "một", synonyms: ["one"], example: "I saw a bird.", note: "A is used before a singular countable noun." },
  the: { word: "the", pronunciation: "/ðə/ or /ðiː/", partOfSpeech: "article", vietnamese: "cái / đó", synonyms: ["that specific one"], example: "The book is on the table.", note: "The points to something specific." },
  and: { word: "and", pronunciation: "/ænd/ or /ən/", partOfSpeech: "conjunction", vietnamese: "và", synonyms: ["also", "plus"], example: "I like tea and coffee." },
  to: { word: "to", pronunciation: "/tuː/ or /tə/", partOfSpeech: "preposition", vietnamese: "đến / để", synonyms: ["toward", "in order to"], example: "I went to school." },
  of: { word: "of", pronunciation: "/əv/", partOfSpeech: "preposition", vietnamese: "của", synonyms: ["belonging to"], example: "The color of the sky is blue." },
  in: { word: "in", pronunciation: "/ɪn/", partOfSpeech: "preposition", vietnamese: "trong", synonyms: ["inside"], example: "She is in the room." },
  is: { word: "is", pronunciation: "/ɪz/", partOfSpeech: "verb", vietnamese: "là / thì", synonyms: ["exists as"], example: "This is important." },
  are: { word: "are", pronunciation: "/ɑːr/", partOfSpeech: "verb", vietnamese: "là / thì", synonyms: ["exist as"], example: "They are ready." },
  be: { word: "be", pronunciation: "/biː/", partOfSpeech: "verb", vietnamese: "là / trở thành", synonyms: ["exist", "become"], example: "Be careful." },
  this: { word: "this", pronunciation: "/ðɪs/", partOfSpeech: "determiner / pronoun", vietnamese: "này", synonyms: ["this one"], example: "This is my phone." },
  that: { word: "that", pronunciation: "/ðæt/", partOfSpeech: "determiner / pronoun", vietnamese: "đó", synonyms: ["that one"], example: "That is a good idea." },
  there: { word: "there", pronunciation: "/ðer/", partOfSpeech: "adverb", vietnamese: "ở đó / có", synonyms: ["in that place"], example: "There is a painting on the wall." },
  have: { word: "have", pronunciation: "/hæv/", partOfSpeech: "verb", vietnamese: "có", synonyms: ["own", "possess"], example: "I have a question." },
  has: { word: "has", pronunciation: "/hæz/", partOfSpeech: "verb", vietnamese: "có", synonyms: ["owns", "possesses"], example: "She has a car." },
  been: { word: "been", pronunciation: "/bɪn/ or /biːn/", partOfSpeech: "verb", vietnamese: "đã từng / đã", synonyms: ["existed", "remained"], example: "I have been busy." },
  helping: { word: "helping", pronunciation: "/ˈhɛlpɪŋ/", partOfSpeech: "verb", vietnamese: "giúp đỡ", synonyms: ["assisting", "supporting", "aiding"], example: "She is helping her friend with homework.", note: "Use helping when someone gives support or assistance." },
  teaching: { word: "teaching", pronunciation: "/ˈtiːtʃɪŋ/", partOfSpeech: "verb / noun", vietnamese: "dạy", synonyms: ["instructing", "educating"], example: "He enjoys teaching children." },
  malaysians: { word: "Malaysians", pronunciation: "/məˈleɪʒənz/", partOfSpeech: "noun", vietnamese: "người Malaysia", synonyms: ["people from Malaysia"], example: "Many Malaysians speak more than one language." },
  southeast: { word: "Southeast", pronunciation: "/ˌsaʊθˈiːst/", partOfSpeech: "adjective / noun", vietnamese: "Đông Nam", synonyms: ["south-eastern area"], example: "Vietnam is in Southeast Asia." },
  asians: { word: "Asians", pronunciation: "/ˈeɪʒənz/", partOfSpeech: "noun", vietnamese: "người châu Á", synonyms: ["people in Asia"], example: "Many Asians speak English as a second language." },
  english: { word: "English", pronunciation: "/ˈɪŋɡlɪʃ/", partOfSpeech: "noun / adjective", vietnamese: "tiếng Anh", synonyms: ["the English language"], example: "She wants to improve her English." },
  speak: { word: "speak", pronunciation: "/spiːk/", partOfSpeech: "verb", vietnamese: "nói", synonyms: ["talk", "say"], example: "He can speak English very well." },
  better: { word: "better", pronunciation: "/ˈbɛtər/", partOfSpeech: "adjective / adverb", vietnamese: "tốt hơn", synonyms: ["improved", "more effectively"], example: "She speaks better after more practice." },
  years: { word: "years", pronunciation: "/jɪrz/", partOfSpeech: "noun", vietnamese: "năm", synonyms: ["periods", "ages"], example: "They have lived there for many years." },
  practice: { word: "practice", pronunciation: "/ˈpræktɪs/", partOfSpeech: "noun / verb", vietnamese: "luyện tập", synonyms: ["training", "exercise"], example: "Daily practice improves listening skills." },
  listening: { word: "listening", pronunciation: "/ˈlɪsənɪŋ/", partOfSpeech: "verb / noun", vietnamese: "nghe", synonyms: ["hearing carefully"], example: "Listening every day helps your English." },
  painting: { word: "painting", pronunciation: "/ˈpeɪntɪŋ/", partOfSpeech: "noun", vietnamese: "bức tranh", synonyms: ["artwork", "picture"], example: "The painting is famous around the world." },
  people: { word: "people", pronunciation: "/ˈpiːpəl/", partOfSpeech: "noun", vietnamese: "người", synonyms: ["persons", "humans"], example: "Many people travel to see the painting." },
  travel: { word: "travel", pronunciation: "/ˈtrævəl/", partOfSpeech: "verb / noun", vietnamese: "du lịch / di chuyển", synonyms: ["journey", "go"], example: "People travel across the world." },
  world: { word: "world", pronunciation: "/wɝːld/", partOfSpeech: "noun", vietnamese: "thế giới", synonyms: ["earth", "globe"], example: "People across the world know this painting." },
  quiet: { word: "quiet", pronunciation: "/ˈkwaɪət/", partOfSpeech: "adjective", vietnamese: "yên tĩnh", synonyms: ["silent", "calm"], example: "The room is quiet." },
  moment: { word: "moment", pronunciation: "/ˈmoʊmənt/", partOfSpeech: "noun", vietnamese: "khoảnh khắc", synonyms: ["instant", "time"], example: "This is an important moment." },
  life: { word: "life", pronunciation: "/laɪf/", partOfSpeech: "noun", vietnamese: "cuộc sống / sự sống", synonyms: ["existence"], example: "Life is full of change." },
  hand: { word: "hand", pronunciation: "/hænd/", partOfSpeech: "noun", vietnamese: "bàn tay", synonyms: ["palm"], example: "He raised his hand." },
};

const PHRASE_DICTIONARY: Record<string, { vietnamese: string; meaning: string; example: string }> = {
  "for the past": { vietnamese: "trong suốt ... vừa qua", meaning: "used to talk about a period continuing until now", example: "For the past two years, I have studied English." },
  "southeast asians": { vietnamese: "người Đông Nam Á", meaning: "people from Southeast Asia", example: "Many Southeast Asians study English for work." },
  "across the world": { vietnamese: "khắp thế giới", meaning: "in many countries or places", example: "People travel across the world." },
  "not because": { vietnamese: "không phải vì", meaning: "used to reject one reason", example: "He came, not because it was easy, but because it mattered." },
  "reach toward": { vietnamese: "vươn về phía", meaning: "move your hand/body toward something", example: "The child reached toward the light." },
  "listen and type": { vietnamese: "nghe và gõ lại", meaning: "a dictation activity", example: "Listen and type the sentence." },
};

function cleanTranscript(raw: string) {
  return String(raw || "")
    .replace(/WEBVTT/gi, "")
    .replace(/^\d+$/gm, "")
    .replace(/\d{2}:\d{2}:\d{2}[\.,]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[\.,]\d{3}/g, "")
    .replace(/\d{2}:\d{2}[\.,]\d{3}\s+-->\s+\d{2}:\d{2}[\.,]\d{3}/g, "")
    .replace(/^>>\s*/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^\)]+\)/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function splitIntoUnits(text: string) {
  const lines = cleanTranscript(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const units: string[] = [];
  for (const line of lines) {
    const parts = line.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) units.push(...parts);
    else units.push(line);
  }
  return units;
}

function parseYouTubeId(url: string) {
  if (!url) return "";
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(url.trim()) ? url.trim() : "";
}

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compareTexts(target: string, typed: string): ReviewResult {
  const targetWords = normalize(target).split(" ").filter(Boolean);
  const typedWords = normalize(typed).split(" ").filter(Boolean);
  const length = Math.max(targetWords.length, typedWords.length, 1);
  let correct = 0;
  const details: ReviewDetail[] = [];

  for (let i = 0; i < length; i += 1) {
    const expected = targetWords[i] || "";
    const actual = typedWords[i] || "";
    if (expected && actual && expected === actual) {
      correct += 1;
      details.push({ expected, actual, status: "correct" });
    } else if (expected && actual && expected !== actual) {
      details.push({ expected, actual, status: "wrong" });
    } else if (expected && !actual) {
      details.push({ expected, actual, status: "missing" });
    } else if (!expected && actual) {
      details.push({ expected, actual, status: "extra" });
    }
  }

  return { accuracy: Math.round((correct / Math.max(targetWords.length, 1)) * 100), correct, total: targetWords.length, details };
}

function lookupKey(word: string) {
  return String(word || "").toLowerCase().replace(/[^a-z']/gi, "").trim();
}

function fallbackEntry(word: string): WordEntry {
  return { word, pronunciation: "IPA unavailable", partOfSpeech: "unknown", vietnamese: "chưa có dữ liệu cục bộ", synonyms: [], example: `Practice this word in context: ${word}.`, note: "This word is not in the starter dictionary yet." };
}

function getWordEntry(word: string): WordEntry {
  const key = lookupKey(word);
  return WORD_DICTIONARY[key] || fallbackEntry(word);
}

function groupTimedLinesByWordLimit(lines: TimedLine[], maxWords: number): PracticeSegment[] {
  const segments: PracticeSegment[] = [];
  let buffer: TimedLine[] = [];
  let bufferWords = 0;

  const pushBuffer = () => {
    if (!buffer.length) return;
    segments.push({
      id: segments.length + 1,
      text: buffer.map((line) => line.text.trim()).join(" "),
      startMs: buffer[0].startMs,
      endMs: buffer[buffer.length - 1].endMs,
      sourceLineIds: buffer.map((line) => line.id),
    });
    buffer = [];
    bufferWords = 0;
  };

  for (const line of lines) {
    const text = String(line.text || "").trim();
    if (!text) continue;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (buffer.length > 0) {
      const previous = buffer[buffer.length - 1];
      const gapMs = line.startMs - previous.endMs;
      const wouldExceed = bufferWords + wordCount > maxWords;
      const largePause = gapMs > 1200;
      if (wouldExceed || largePause) pushBuffer();
    }

    buffer.push(line);
    bufferWords += wordCount;
  }

  pushBuffer();
  return segments;
}

function groupTextByWordLimit(text: string, maxWords: number): PracticeSegment[] {
  const units = splitIntoUnits(text);
  const segments: PracticeSegment[] = [];
  let buffer: string[] = [];
  let bufferWords = 0;

  const pushBuffer = () => {
    if (!buffer.length) return;
    segments.push({ id: segments.length + 1, text: buffer.join(" ").trim() });
    buffer = [];
    bufferWords = 0;
  };

  for (const unit of units) {
    const words = unit.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      pushBuffer();
      for (let i = 0; i < words.length; i += maxWords) {
        segments.push({ id: segments.length + 1, text: words.slice(i, i + maxWords).join(" ") });
      }
      continue;
    }
    if (buffer.length > 0 && bufferWords + words.length > maxWords) pushBuffer();
    buffer.push(unit);
    bufferWords += words.length;
  }
  pushBuffer();
  return segments;
}

function sentenceTranslation(text: string) {
  const words = normalize(text).split(" ").filter(Boolean);
  if (!words.length) return "";
  return words.map((word) => `${word} = ${getWordEntry(word).vietnamese}`).join(" | ");
}

function phraseMatches(text: string) {
  const lower = normalize(text);
  return Object.entries(PHRASE_DICTIONARY).filter(([phrase]) => lower.includes(phrase));
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<"practice" | "speaking" | "mistakes" | "vocabulary" | "dashboard">("practice");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Paste a YouTube URL, or use manual subtitles. AI voice mode works even without timed subtitles.");
  const [showEditor, setShowEditor] = useState(false);
  const [editorText, setEditorText] = useState(demoTranscript.trim());
  const [appliedTranscript, setAppliedTranscript] = useState(demoTranscript.trim());
  const [timedLines, setTimedLines] = useState<TimedLine[]>([]);
  const [wordsPerPart, setWordsPerPart] = useState(10);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [voiceMode, setVoiceMode] = useState<"ai" | "original">("ai");
  const [repeatCount, setRepeatCount] = useState<number | "infinite">(1);
  const [repeatProgress, setRepeatProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [aiVoiceRate, setAiVoiceRate] = useState(0.9);
  const [aiVoicePitch, setAiVoicePitch] = useState(1);
  const [showLearningHelp, setShowLearningHelp] = useState(false);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [speakingHistory, setSpeakingHistory] = useState<SpeakingAttempt[]>([]);
  const [speechListening, setSpeechListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [machineTranslation, setMachineTranslation] = useState("");
  const [translationSource, setTranslationSource] = useState<"local" | "libretranslate" | "none">("local");
  const [translationLoading, setTranslationLoading] = useState(false);

  const playerRef = useRef<any>(null);
  const monitorRef = useRef<number | null>(null);
  const repeatTimeoutRef = useRef<number | null>(null);
  const currentRepeatRef = useRef(0);
  const currentTextRef = useRef("");
  const recognitionRef = useRef<any>(null);

  const practiceSegments = useMemo(() => {
    if (timedLines.length > 0) return groupTimedLinesByWordLimit(timedLines, wordsPerPart);
    return groupTextByWordLimit(appliedTranscript, wordsPerPart);
  }, [timedLines, appliedTranscript, wordsPerPart]);

  const currentSegment = practiceSegments[index] || null;
  const currentText = currentSegment?.text || "";
  const currentWords = currentText.split(/\s+/).filter(Boolean);
  const review = useMemo(() => compareTexts(currentText, typed), [currentText, typed]);
  const speakingReview = useMemo(() => compareTexts(currentText, spokenText), [currentText, spokenText]);
  const currentPhrases = useMemo(() => phraseMatches(currentText), [currentText]);
  const localVietnamese = useMemo(() => sentenceTranslation(currentText), [currentText]);
  const currentVietnamese = machineTranslation || localVietnamese;

  const typingAverage = useMemo(() => {
    const scores = mistakes.map((item) => item.accuracy);
    if (!scores.length && checked) return review.accuracy;
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [mistakes, checked, review.accuracy]);

  const speakingAverage = useMemo(() => {
    if (!speakingHistory.length) return 0;
    return Math.round(speakingHistory.reduce((sum, item) => sum + item.accuracy, 0) / speakingHistory.length);
  }, [speakingHistory]);

  useEffect(() => {
    currentTextRef.current = currentText;
    setChecked(false);
    setTyped("");
    setRevealCount(0);
    setShowSentence(false);
    setSpokenText("");
    setPopup(null);
  }, [index, currentText]);

  useEffect(() => {
    if (index > Math.max(practiceSegments.length - 1, 0)) setIndex(0);
  }, [practiceSegments.length, index]);

  useEffect(() => {
    const text = currentText.trim();
    setMachineTranslation("");
    setTranslationSource(localVietnamese ? "local" : "none");

    if (!text) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setTranslationLoading(true);
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, source: "en", target: "vi" }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data?.translatedText) {
          setMachineTranslation(String(data.translatedText));
          setTranslationSource(data?.source === "libretranslate" ? "libretranslate" : "local");
        }
      } catch {
        setTranslationSource(localVietnamese ? "local" : "none");
      } finally {
        setTranslationLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [currentText, localVietnamese]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yt-dictation-final-state");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (typeof parsed.youtubeUrl === "string") setYoutubeUrl(parsed.youtubeUrl);
      if (typeof parsed.videoId === "string") setVideoId(parsed.videoId);
      if (typeof parsed.appliedTranscript === "string") setAppliedTranscript(parsed.appliedTranscript);
      if (typeof parsed.editorText === "string") setEditorText(parsed.editorText);
      if (Array.isArray(parsed.timedLines)) setTimedLines(parsed.timedLines);
      if (typeof parsed.wordsPerPart === "number") setWordsPerPart(parsed.wordsPerPart);
      if (typeof parsed.voiceMode === "string") setVoiceMode(parsed.voiceMode);
      if (parsed.repeatCount) setRepeatCount(parsed.repeatCount);
      if (Array.isArray(parsed.mistakes)) setMistakes(parsed.mistakes);
      if (Array.isArray(parsed.vocabulary)) setVocabulary(parsed.vocabulary);
      if (Array.isArray(parsed.speakingHistory)) setSpeakingHistory(parsed.speakingHistory);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "yt-dictation-final-state",
        JSON.stringify({ youtubeUrl, videoId, appliedTranscript, editorText, timedLines, wordsPerPart, voiceMode, repeatCount, mistakes, vocabulary, speakingHistory })
      );
    } catch {}
  }, [youtubeUrl, videoId, appliedTranscript, editorText, timedLines, wordsPerPart, voiceMode, repeatCount, mistakes, vocabulary, speakingHistory]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (!selectedVoiceURI && voices.length) {
        const englishVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) || voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || voices[0];
        setSelectedVoiceURI(englishVoice.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoiceURI]);

  useEffect(() => {
    if (!videoId) return;
    const createOrUpdatePlayer = () => {
      if (!window.YT?.Player) return;
      if (playerRef.current) {
        playerRef.current.cueVideoById?.(videoId);
        return;
      }
      playerRef.current = new window.YT.Player("youtube-player", {
        videoId,
        playerVars: { playsinline: 1, rel: 0 },
        events: { onReady: () => setStatus("Player ready. Choose AI voice for exact text match or original voice for real listening.") },
      });
    };
    if (window.YT?.Player) { createOrUpdatePlayer(); return; }
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previousReady?.(); createOrUpdatePlayer(); };
  }, [videoId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingField = tag === "input" || tag === "textarea" || tag === "select";
      if (event.key === "Escape") { event.preventDefault(); stopPlayback(); setPopup(null); return; }
      if (event.key === "Alt" && !event.repeat) { event.preventDefault(); playSelectedVoiceMode(); return; }
      if (!isTypingField && event.key === "ArrowRight") { event.preventDefault(); handleNext(); return; }
      if (!isTypingField && event.key === "ArrowLeft") { event.preventDefault(); handlePrev(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); handleCheck(); }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [voiceMode, currentSegment, repeatCount, playbackRate, aiVoiceRate, aiVoicePitch, selectedVoiceURI, index, practiceSegments.length, typed]);

  useEffect(() => {
    return () => stopPlayback();
  }, []);

  function selectedAiVoice() {
    return availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI) || availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) || availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
  }

  function stopPlayback() {
    if (monitorRef.current) window.clearInterval(monitorRef.current);
    if (repeatTimeoutRef.current) window.clearTimeout(repeatTimeoutRef.current);
    monitorRef.current = null;
    repeatTimeoutRef.current = null;
    playerRef.current?.pauseVideo?.();
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    recognitionRef.current?.stop?.();
    currentRepeatRef.current = 0;
    setRepeatProgress(0);
    setIsPlaying(false);
    setSpeechListening(false);
  }

  function playSelectedVoiceMode() {
    if (voiceMode === "original") playOriginalVoice();
    else playAiVoice();
  }

  function playAiVoice() {
    if (!currentText) return;
    if (typeof window === "undefined" || !window.speechSynthesis) { setStatus("AI voice is not supported in this browser."); return; }
    stopPlayback();
    const voice = selectedAiVoice();
    const playOnce = () => {
      currentRepeatRef.current += 1;
      setRepeatProgress(currentRepeatRef.current);
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(currentText);
      utterance.lang = voice?.lang || "en-US";
      utterance.voice = voice;
      utterance.rate = aiVoiceRate;
      utterance.pitch = aiVoicePitch;
      utterance.onend = () => {
        const shouldRepeat = repeatCount === "infinite" || currentRepeatRef.current < repeatCount;
        if (shouldRepeat && currentTextRef.current === currentText) repeatTimeoutRef.current = window.setTimeout(playOnce, 280);
        else { setIsPlaying(false); currentRepeatRef.current = 0; setRepeatProgress(0); }
      };
      utterance.onerror = () => { setIsPlaying(false); setStatus("AI voice playback failed."); };
      window.speechSynthesis.speak(utterance);
    };
    playOnce();
  }

  function playOriginalVoice() {
    if (currentSegment?.startMs == null || currentSegment?.endMs == null || !videoId || !playerRef.current) {
      setStatus("Original voice needs timed subtitles. Switch to AI voice or paste timed subtitles from YouTube fetch.");
      return;
    }
    stopPlayback();
    const startSeconds = Math.max(0, currentSegment.startMs / 1000);
    const endSeconds = Math.max(startSeconds + 0.2, currentSegment.endMs / 1000);
    const playOnce = () => {
      currentRepeatRef.current += 1;
      setRepeatProgress(currentRepeatRef.current);
      setIsPlaying(true);
      try { playerRef.current.setPlaybackRate?.(playbackRate); } catch {}
      playerRef.current.loadVideoById?.({ videoId, startSeconds, endSeconds });
      monitorRef.current = window.setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;
        if (currentTime >= endSeconds - 0.05) {
          if (monitorRef.current) window.clearInterval(monitorRef.current);
          monitorRef.current = null;
          playerRef.current?.pauseVideo?.();
          const shouldRepeat = repeatCount === "infinite" || currentRepeatRef.current < repeatCount;
          if (shouldRepeat && currentTextRef.current === currentSegment.text) repeatTimeoutRef.current = window.setTimeout(playOnce, 280);
          else { setIsPlaying(false); currentRepeatRef.current = 0; setRepeatProgress(0); }
        }
      }, 100);
    };
    playOnce();
  }

  async function handleExtract() {
    const parsedId = parseYouTubeId(youtubeUrl);
    if (!parsedId) { setStatus("That URL does not look like a valid YouTube link."); return; }
    setLoading(true);
    setStatus("Fetching subtitles...");
    setVideoId(parsedId);
    try {
      const response = await fetch(`/api/transcript?url=${encodeURIComponent(youtubeUrl)}`);
      const data = await response.json();
      if (!response.ok || !data?.transcript || !data?.timedChunks?.length) throw new Error(data?.error || "No transcript available for this video.");
      const fetched: TimedLine[] = data.timedChunks.map((item: any, itemIndex: number) => ({ id: item.id ?? itemIndex + 1, text: String(item.text || "").trim(), startMs: Number(item.startMs ?? 0), endMs: Number(item.endMs ?? 0) })).filter((item: TimedLine) => item.text);
      setTimedLines(fetched);
      setAppliedTranscript(data.transcript || "");
      setEditorText(data.srt || data.transcript || "");
      setIndex(0);
      setTyped("");
      setChecked(false);
      setVoiceMode("ai");
      setStatus("Transcript loaded. AI voice is selected for exact text match; switch to original voice for real listening.");
    } catch (error: any) {
      setTimedLines([]);
      setShowEditor(true);
      setStatus(`${error?.message || "Could not fetch transcript."} You can paste subtitles manually.`);
    } finally {
      setLoading(false);
    }
  }

  function applyManualSubtitles() {
    const cleaned = cleanTranscript(editorText);
    if (!cleaned) { setStatus("Paste subtitles or transcript text first."); return; }
    stopPlayback();
    setTimedLines([]);
    setAppliedTranscript(editorText);
    setIndex(0);
    setTyped("");
    setChecked(false);
    setVoiceMode("ai");
    setStatus("Manual subtitles applied. AI voice mode is ready. Original voice sync needs timed subtitles from YouTube fetch.");
  }

  function loadDemo() {
    setTimedLines([]);
    setAppliedTranscript(demoTranscript.trim());
    setEditorText(demoTranscript.trim());
    setIndex(0);
    setTyped("");
    setChecked(false);
    setVoiceMode("ai");
    setStatus("Demo lesson loaded.");
  }

  function handleCheck() {
    stopPlayback();
    setChecked(true);
    const mistake: MistakeItem = { id: Date.now(), text: currentText, typed, accuracy: review.accuracy, details: review.details, date: new Date().toLocaleString() };
    if (review.accuracy < 100) setMistakes((prev) => [mistake, ...prev].slice(0, 50));
  }

  function handleNext() { stopPlayback(); if (index < practiceSegments.length - 1) setIndex((prev) => prev + 1); }
  function handlePrev() { stopPlayback(); if (index > 0) setIndex((prev) => prev - 1); }
  function handleReset() { stopPlayback(); setTyped(""); setChecked(false); setRevealCount(0); setShowSentence(false); setSpokenText(""); }
  function revealOneWord() { setRevealCount((prev) => Math.min(prev + 1, currentWords.length)); }

  function openWordPopup(word: string, status?: ReviewStatus, targetWord?: string, typedWord?: string) {
    const keyWord = targetWord || word;
    setPopup({ word: keyWord, status, targetWord, typedWord, entry: getWordEntry(keyWord) });
  }

  function saveWord(entry: WordEntry) {
    setVocabulary((prev) => {
      if (prev.some((item) => lookupKey(item.word) === lookupKey(entry.word))) return prev;
      return [{ ...entry, savedAt: new Date().toLocaleString() }, ...prev];
    });
  }

  function speakSingleWord(word: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const voice = selectedAiVoice();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.voice = voice;
    utterance.lang = voice?.lang || "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function startSpeaking() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSpeechError("Speech recognition is not supported in this browser. Try Chrome."); return; }
    stopPlayback();
    setSpeechError("");
    setSpokenText("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setSpeechListening(true);
    recognition.onerror = (event: any) => { setSpeechListening(false); setSpeechError(event?.error || "Speech recognition failed."); };
    recognition.onend = () => setSpeechListening(false);
    recognition.onresult = (event: any) => {
      const heard = event.results?.[0]?.[0]?.transcript || "";
      setSpokenText(heard);
      const result = compareTexts(currentText, heard);
      const completion = Math.min(100, Math.round((normalize(heard).split(" ").filter(Boolean).length / Math.max(normalize(currentText).split(" ").filter(Boolean).length, 1)) * 100));
      const fluency = Math.max(0, Math.min(100, Math.round((result.accuracy + completion) / 2)));
      const clarity = result.accuracy >= 85 ? "High" : result.accuracy >= 60 ? "Medium" : "Needs practice";
      const attempt: SpeakingAttempt = { id: Date.now(), target: currentText, heard, accuracy: result.accuracy, completion, fluency, clarity, details: result.details, date: new Date().toLocaleString() };
      setSpeakingHistory((prev) => [attempt, ...prev].slice(0, 30));
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopSpeakingOnly() { recognitionRef.current?.stop?.(); setSpeechListening(false); }

  function renderSentenceWords() {
    if (!currentText) return <div className="muted">No sentence loaded yet.</div>;
    return (
      <div className="words">
        {currentWords.map((word, wordIndex) => {
          const visible = showSentence || wordIndex < revealCount;
          const masked = "•".repeat(Math.max(word.replace(/[^a-zA-Z0-9']/g, "").length, 3));
          return (
            <button key={`${word}-${wordIndex}`} type="button" className={`wordChip clickable ${visible ? "" : "hiddenWord"}`} onClick={() => openWordPopup(word)}>
              {visible ? word : masked}
            </button>
          );
        })}
      </div>
    );
  }

  function renderReview() {
    if (!checked) return null;
    return (
      <div className="reviewBox">
        <div className="reviewTitle">Answer review</div>
        <div className="scoreLine">Accuracy: <strong>{review.accuracy}%</strong> ({review.correct}/{review.total})</div>
        <div className="pillWrap">
          {review.details.map((item, itemIndex) => {
            if (item.status === "correct") return <button key={itemIndex} className="pill correct" onClick={() => openWordPopup(item.actual, item.status, item.expected, item.actual)}>{item.actual}</button>;
            if (item.status === "wrong") return <button key={itemIndex} className="pill wrong" onClick={() => openWordPopup(item.expected, item.status, item.expected, item.actual)}><strong>{item.actual}</strong> → {item.expected}</button>;
            if (item.status === "missing") return <button key={itemIndex} className="pill missing" onClick={() => openWordPopup(item.expected, item.status, item.expected, item.actual)}>missing: {item.expected}</button>;
            return <button key={itemIndex} className="pill extra" onClick={() => openWordPopup(item.actual, item.status, item.expected, item.actual)}>extra: {item.actual}</button>;
          })}
        </div>
        <div className="compare">
          <div><div className="smallLabel">Correct sentence</div><div>{currentText}</div></div>
          <div><div className="smallLabel">Your answer</div><div>{typed || "—"}</div></div>
        </div>
      </div>
    );
  }

  function renderLearningHelp() {
    if (!showLearningHelp) return null;
    return (
      <div className="card">
        <h3>Learning help</h3>
        <div className="helpGrid top">
          <div className="helpItem"><div className="smallLabel">Vietnamese translation</div><p>{translationLoading ? "Translating..." : (currentVietnamese || "No sentence loaded.")}</p><p className="muted">Source: {translationSource === "libretranslate" ? "LibreTranslate API" : translationSource === "local" ? "local fallback glossary" : "none"}</p></div>
          <div className="helpItem"><div className="smallLabel">IPA pronunciation guide</div><p>{currentWords.map((word) => `${word}: ${getWordEntry(word).pronunciation}`).join(" | ")}</p></div>
        </div>
        {currentPhrases.length ? (
          <div className="top">
            <div className="smallLabel">Phrase help</div>
            <div className="list top">
              {currentPhrases.map(([phrase, info]) => (
                <div className="listItem" key={phrase}><strong>{phrase}</strong><br />{info.vietnamese}<br /><span className="muted">{info.meaning}</span><br /><em>{info.example}</em></div>
              ))}
            </div>
          </div>
        ) : <p className="muted top">No local phrase match for this sentence yet.</p>}
      </div>
    );
  }

  function currentSpeakingAttempt() { return speakingHistory.find((item) => item.target === currentText && item.heard === spokenText) || null; }
  const attempt = currentSpeakingAttempt();
  const repeatText = isPlaying ? (repeatCount === "infinite" ? `Repeating now: ${repeatProgress}...` : `Repeat ${repeatProgress} of ${repeatCount}`) : (repeatCount === "infinite" ? "Repeat count: Infinite" : `Repeat count: ${repeatCount}`);

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <div className="eyebrow">English listening and speaking practice</div>
          <h1>YouTube sentence trainer</h1>
          <p className="muted">AI voice gives exact text matching. Original voice gives real listening when timed subtitles are available. Review stays open until you press Next.</p>
          <div className="status">{status}</div>
        </section>

        <div className="tabs">
          {[
            ["practice", "Practice"], ["speaking", "Speaking"], ["mistakes", "Review mistakes"], ["vocabulary", "Vocabulary"], ["dashboard", "Dashboard"],
          ].map(([key, label]) => <button key={key} className={`tab ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key as any)}>{label}</button>)}
        </div>

        {activeTab === "practice" && (
          <div className="grid">
            <section>
              <div className="card">
                <h2>1. Paste video link</h2>
                <div className="row stack top">
                  <input className="input" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                  <button className="btn primary" onClick={handleExtract} disabled={loading}>{loading ? "Loading..." : "Extract subtitles"}</button>
                </div>
                <div className="playerWrap"><div id="youtube-player" /></div>
                <div className="row wrap top">
                  <button className="btn" onClick={() => setShowEditor((prev) => !prev)}>{showEditor ? "Hide manual subtitles" : "Paste subtitles manually"}</button>
                  <button className="btn" onClick={loadDemo}>Load demo lesson</button>
                </div>
                {showEditor && (
                  <div className="top">
                    <textarea className="textarea" value={editorText} onChange={(event) => setEditorText(event.target.value)} placeholder="Paste TXT, SRT, or VTT text here" />
                    <button className="btn top" onClick={applyManualSubtitles}>Apply manual subtitles</button>
                  </div>
                )}
              </div>

              <div className="card">
                <h2>2. Practice settings</h2>
                <div className="settings top">
                  <div><label className="label">Voice mode</label><select className="select" value={voiceMode} onChange={(e) => setVoiceMode(e.target.value as any)}><option value="ai">AI voice - best text match</option><option value="original">Original YouTube voice - real listening</option></select></div>
                  <div><label className="label">Repeat count</label><select className="select" value={String(repeatCount)} onChange={(e) => setRepeatCount(e.target.value === "infinite" ? "infinite" : Number(e.target.value))}><option value="1">1 time</option><option value="2">2 times</option><option value="3">3 times</option><option value="5">5 times</option><option value="infinite">Infinite</option></select></div>
                  <div><label className="label">Words per part</label><select className="select" value={String(wordsPerPart)} onChange={(e) => setWordsPerPart(Number(e.target.value))}><option value="4">4 words</option><option value="6">6 words</option><option value="8">8 words</option><option value="10">10 words</option><option value="12">12 words</option><option value="15">15 words</option><option value="20">20 words</option></select></div>
                  <div><label className="label">Original voice speed</label><select className="select" value={String(playbackRate)} onChange={(e) => setPlaybackRate(Number(e.target.value))}><option value="0.75">0.75x</option><option value="1">1.0x</option><option value="1.25">1.25x</option></select></div>
                  <div><label className="label">AI voice model</label><select className="select" value={selectedVoiceURI} onChange={(e) => setSelectedVoiceURI(e.target.value)}>{availableVoices.filter((v) => v.lang.toLowerCase().startsWith("en")).map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></div>
                  <div><label className="label">AI voice speed</label><select className="select" value={String(aiVoiceRate)} onChange={(e) => setAiVoiceRate(Number(e.target.value))}><option value="0.75">Slow</option><option value="0.9">Clear</option><option value="1">Normal</option><option value="1.15">Fast</option></select></div>
                  <div><label className="label">AI voice pitch</label><select className="select" value={String(aiVoicePitch)} onChange={(e) => setAiVoicePitch(Number(e.target.value))}><option value="0.8">Lower</option><option value="1">Normal</option><option value="1.2">Higher</option></select></div>
                </div>
                <p className="muted top">Alt = replay with selected repeat loop, even when typing in the answer box. Esc = stop. Left/Right Arrow = previous/next when not typing. Ctrl/Cmd + Enter = check.</p>
                <p className="muted">Original voice uses timed subtitle lines as the source of truth. Long subtitle lines are kept whole so text and audio stay matched.</p>
              </div>
            </section>

            <section>
              <div className="card">
                <div className="row spaceBetween wrap"><div><h2>Listen and type</h2><p className="muted">{practiceSegments.length ? `Part ${index + 1} of ${practiceSegments.length}` : "No part loaded"}</p></div><div className="muted">{repeatText}</div></div>
                <div className="row wrap top">
                  <button className="btn" onClick={playSelectedVoiceMode} disabled={!currentText}>Play</button>
                  <button className="btn" onClick={stopPlayback}>Stop</button>
                  <button className="btn" onClick={() => setShowSentence((prev) => !prev)}>{showSentence ? "Hide sentence" : "Show sentence"}</button>
                  <button className="btn" onClick={revealOneWord}>Reveal 1 word</button>
                  <button className="btn" onClick={() => setShowLearningHelp((prev) => !prev)}>{showLearningHelp ? "Hide learning help" : "Show learning help"}</button>
                </div>
                <div className="sentenceBox"><div className="smallLabel">Sentence</div>{renderSentenceWords()}</div>
                <textarea className="textarea top" value={typed} onChange={(e) => { setTyped(e.target.value); setChecked(false); }} placeholder="Type what you hear" />
                {renderReview()}
                <div className="row wrap top">
                  <button className="btn" onClick={handlePrev} disabled={index === 0}>Previous</button>
                  <button className="btn primary" onClick={handleCheck} disabled={!currentText}>Check</button>
                  <button className="btn" onClick={handleNext} disabled={index >= practiceSegments.length - 1}>Next</button>
                  <button className="btn" onClick={handleReset}>Reset</button>
                </div>
                <p className="muted top">The answer review stays open until you press Next or edit your answer.</p>
              </div>
              {renderLearningHelp()}
            </section>
          </div>
        )}

        {activeTab === "speaking" && (
          <div className="card top">
            <h2>Speaking analysis</h2>
            <p className="muted top">Read the current sentence aloud. This browser-based check compares recognized words with the target sentence.</p>
            <div className="sentenceBox"><div className="smallLabel">Target sentence</div><p>{currentText || "No sentence loaded"}</p></div>
            <div className="row wrap top"><button className="btn primary" onClick={startSpeaking} disabled={!currentText || speechListening}>{speechListening ? "Listening..." : "Start speaking"}</button><button className="btn" onClick={stopSpeakingOnly}>Stop speaking</button></div>
            {speechError && <div className="warning top">{speechError}</div>}
            {spokenText && <div className="reviewBox"><div className="reviewTitle">Speaking result</div><p><strong>Recognized text:</strong> {spokenText}</p><div className="stats"><div className="stat"><div className="smallLabel">Accuracy</div><div className="statValue">{speakingReview.accuracy}%</div></div><div className="stat"><div className="smallLabel">Completion</div><div className="statValue">{attempt?.completion ?? 0}%</div></div><div className="stat"><div className="smallLabel">Fluency</div><div className="statValue">{attempt?.fluency ?? 0}%</div></div><div className="stat"><div className="smallLabel">Clarity</div><div className="statValue">{attempt?.clarity ?? "—"}</div></div></div><div className="pillWrap top">{speakingReview.details.map((item, i) => <button key={i} className={`pill ${item.status}`} onClick={() => openWordPopup(item.expected || item.actual, item.status, item.expected, item.actual)}>{item.status === "correct" ? item.actual : item.status === "wrong" ? `${item.actual} → ${item.expected}` : item.status === "missing" ? `missing: ${item.expected}` : `extra: ${item.actual}`}</button>)}</div><div className="helpGrid top"><div className="helpItem"><strong>What you did well</strong><p>{speakingReview.accuracy >= 70 ? "Many key words were recognized." : "You completed the attempt and created a baseline score."}</p></div><div className="helpItem"><strong>What to improve</strong><p>{speakingReview.details.filter((x) => x.status !== "correct").slice(0, 4).map((x) => x.expected || x.actual).join(", ") || "Keep practicing rhythm and clarity."}</p></div></div></div>}
          </div>
        )}

        {activeTab === "mistakes" && <div className="card top"><h2>Review mistakes</h2><div className="list top">{mistakes.length ? mistakes.map((m) => <div className="listItem" key={m.id}><strong>{m.accuracy}%</strong> - {m.text}<br /><span className="muted">Your answer: {m.typed || "—"}</span></div>) : <p className="muted">No saved mistakes yet. Mistakes appear here after checking an answer below 100%.</p>}</div></div>}

        {activeTab === "vocabulary" && <div className="card top"><h2>Vocabulary</h2><div className="list top">{vocabulary.length ? vocabulary.map((v) => <div className="listItem" key={lookupKey(v.word)}><strong>{v.word}</strong> - {v.vietnamese}<br /><span className="muted">{v.pronunciation} | Saved {v.savedAt}</span></div>) : <p className="muted">Click a word popup and save it to build your vocabulary list.</p>}</div></div>}

        {activeTab === "dashboard" && <div className="card top"><h2>Dashboard</h2><div className="stats top"><div className="stat"><div className="smallLabel">Parts</div><div className="statValue">{practiceSegments.length}</div></div><div className="stat"><div className="smallLabel">Typing avg</div><div className="statValue">{typingAverage}%</div></div><div className="stat"><div className="smallLabel">Speaking avg</div><div className="statValue">{speakingAverage}%</div></div><div className="stat"><div className="smallLabel">Saved words</div><div className="statValue">{vocabulary.length}</div></div></div><div className="helpGrid top"><div className="helpItem"><strong>Recommendation</strong><p>{typingAverage < 70 ? "Use AI voice and choose fewer words per part." : "Try original voice mode for more realistic listening."}</p></div><div className="helpItem"><strong>Weak words</strong><p>{mistakes.flatMap((m) => m.details.filter((d) => d.status !== "correct").map((d) => d.expected || d.actual)).slice(0, 8).join(", ") || "No repeated weak words yet."}</p></div></div></div>}
      </div>

      {popup && (
        <div className="popupOverlay" onClick={() => setPopup(null)}>
          <div className="popupCard" onClick={(e) => e.stopPropagation()}>
            <div className="popupHead"><div><div className="popupWord">{popup.entry.word}</div><div className="popupPron">IPA: {popup.entry.pronunciation}</div></div><button className="btn" onClick={() => setPopup(null)}>Close</button></div>
            <div className="popupSection"><div className="popupLabel">Part of speech</div><div>{popup.entry.partOfSpeech}</div></div>
            <div className="popupSection"><div className="popupLabel">Vietnamese meaning</div><div>{popup.entry.vietnamese}</div></div>
            <div className="popupSection"><div className="popupLabel">Synonyms</div><div>{popup.entry.synonyms.length ? popup.entry.synonyms.join(", ") : "No local synonyms yet."}</div></div>
            <div className="popupSection"><div className="popupLabel">Example</div><div>{popup.entry.example}</div></div>
            {popup.status === "wrong" && <div className="popupSection"><div className="popupLabel">Your mistake</div><div>You typed <strong>{popup.typedWord}</strong>, but the correct word is <strong>{popup.targetWord}</strong>.</div></div>}
            {popup.status === "missing" && <div className="popupSection"><div className="popupLabel">Your mistake</div><div>You missed <strong>{popup.targetWord}</strong>.</div></div>}
            {popup.status === "extra" && <div className="popupSection"><div className="popupLabel">Your mistake</div><div>You added extra word <strong>{popup.typedWord}</strong>.</div></div>}
            {popup.entry.note && <div className="popupSection"><div className="popupLabel">Note</div><div>{popup.entry.note}</div></div>}
            <div className="row wrap top"><button className="btn" onClick={() => speakSingleWord(popup.entry.word)}>Play word</button><button className="btn primary" onClick={() => saveWord(popup.entry)}>Save word</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

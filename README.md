# YouTube Dictation App - final restored project

This project is a Next.js app for English listening, typing, vocabulary, and speaking practice.

## Main features

- YouTube URL input
- Auto subtitle fetch through `app/api/transcript/route.ts`
- Manual subtitle paste fallback
- Clean `Listen and type` interface
- AI voice mode for exact text matching
- Original YouTube voice mode for real listening when timed subtitles are available
- AI voice model dropdown
- AI voice speed and pitch controls
- Original voice playback speed
- Repeat count: 1, 2, 3, 5, infinite
- Alt = replay with selected voice mode and repeat loop
- Esc = stop immediately
- Left Arrow / Right Arrow = previous / next
- Words-per-part dropdown
- Sync-safe original voice splitting based on timed subtitle lines
- Check answer button that keeps review open until Next
- Correct / wrong / missing / extra highlights
- Clickable answer-review words
- Word popup with pronunciation, Vietnamese meaning, synonyms, example, mistake note, play word, and save word
- Vietnamese support for the current sentence
- Pronunciation guide for the current sentence
- Phrase help
- Speaking analysis with recognized text, word-by-word review, accuracy, completion, fluency, clarity, strengths, and improvement notes
- Review mistakes tab
- Vocabulary tab
- Dashboard tab
- Local progress saving through localStorage

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Notes

Auto subtitle fetch uses the unofficial `youtube-transcript` package. Some videos may fail or return no subtitles. The app includes manual subtitle paste and AI voice mode so practice can still work.

Original voice playback needs timed subtitles from the YouTube fetch. Manual pasted plain text works best with AI voice mode.

## Latest fixes

This version adds:

- Alt replay works globally, including while the cursor is inside the answer textarea.
- Pronunciation displays use IPA-style characters instead of simple respelling.
- Vietnamese sentence translation now tries `/api/translate` first.
- `/api/translate` uses LibreTranslate by default and falls back to a small local glossary if the API is unavailable.

### Optional translation environment variables

You can self-host LibreTranslate or use another compatible LibreTranslate endpoint:

```env
LIBRETRANSLATE_URL=https://your-libretranslate-server.com/translate
LIBRETRANSLATE_API_KEY=your_optional_key
```

If no environment variables are set, the app tries `https://libretranslate.com/translate`.

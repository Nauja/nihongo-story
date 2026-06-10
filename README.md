# 話 Nihongo Story

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-blue?logo=github)](https://nauja.github.io/nihongo-story)


Web app that generates short Japanese stories on any theme you choose, targeting your current proficiency (JLPT N5–N1 or WaniKani levels). Stories come with furigana, clickable vocabulary definitions, and optional WaniKani kanji details — making it easy to read above your comfort zone without a dictionary.

## Demo

The web app runs entirely in your browser — no API key or generated stories are ever uploaded.

**https://nauja.github.io/nihongo-story**

## Why

WaniKani teaches kanji and vocabulary through mnemonics and stories — but when you move on to reading real Japanese content, that context is gone. Tools like Yomitan can look up words on the fly, but they don't surface the mnemonics or level data you already learned. WaniKani Kanji Highlighter does show that WaniKani info, but as a browser extension it can't be installed on mobile unless you use Kiwi browser. Finding material at the right level is its own challenge: too easy and you don't progress, too hard and it's discouraging.

nihongo-story bridges these gaps: generate stories, dialogues, or other formats targeted to your current WaniKani level (or any JLPT level), with WaniKani info always one click away — no browser extension required, so it works on any device including mobile. Since content is AI-generated, errors in grammar, vocabulary, or kanji usage can occur — treat it as a reading aid, not a ground truth, and stay critical as you read.

A WaniKani API key is entirely optional. The app works without one — you can generate and read stories at any JLPT or WaniKani level without it. If you don't use WaniKani, you can still pair the app with Yomitan or any other lookup tool of your choice for word definitions.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

To build and deploy to GitHub Pages:

```bash
npm run deploy
```

## Generating a story

Open the **Generate** page and fill in three things:

**Theme** — a free-text prompt describing what the story should be about (e.g. "a cat who wants to become a chef", "a rainy day in Tokyo", "a samurai's last battle"). Leave it blank and the AI will choose a theme for you. An API key is the only hard requirement to generate a story.

**Story type** — choose the format that fits your study goal:

| Type | Japanese | Description |
|------|----------|-------------|
| Conversation | 会話 | Back-and-forth dialogue between characters |
| Novel | 物語 | Narrative prose with a small story arc |
| Diary | 日記 | First-person journal entry |
| Poem | 詩 | Short poetic form |
| News | ニュース | News article style |

**Target level** — choose between two systems:
- **JLPT**: N5 (beginner) through N1 (advanced). The AI targets vocabulary and grammar structures appropriate for that level.
- **WaniKani**: levels 1–60, with a slider and quick-jump buttons (1, 10, 20 … 60). The AI uses kanji and vocabulary up to the selected level. Levels 1–10 produce very simple text; 51–60 include rare kanji and literary vocabulary.

**Story length** — five presets ranging from Very Short (3–5 sentences) to Very Long (30–40 sentences). Defaults to Medium (10–15 sentences).

Once generated (10–30 seconds), you land directly on the story reader. The story is automatically saved to your library.

### Reading a story

The reader displays the Japanese text with furigana (reading hints) above kanji. A vocabulary list and an English summary are shown below the text.

- Toggle furigana on/off with the switch in the toolbar or by pressing **Tab**
- Use the **play/pause/stop** controls in the toolbar to listen to the story read aloud via the Web Speech API (Japanese voice, 0.9× speed). The progress bar shows the current line — click any position to jump to it. The active line is highlighted during playback.
- Use the **volume slider** in the toolbar to adjust playback volume.
- If a WaniKani API key is configured, hover or click any highlighted word to open a popup with its meanings, readings, and mnemonics pulled from WaniKani. Click outside to close.

## Library

The **Library** page lists every story you have generated. Each card shows:

- The Japanese title and its reading
- A colour-coded level badge (JLPT N5–N1 or WaniKani level)
- The story type icon
- A short English summary excerpt
- The theme and creation date

Click a card to open the story reader. To delete a story, hover the card and click the red × button — you will be asked to confirm before it is removed. Stories are ordered by generation date; there is no search or filter at the moment.

## Configuration

All settings are saved in your browser's localStorage and never sent anywhere except the respective AI service during generation.

### AI provider

Choose one of three providers in the Settings page:

| Provider | Cost | Setup |
|----------|------|-------|
| **Google Gemini** | Free tier (15 req/min, 1M tokens/day) | API key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Claude** (Anthropic) | Paid (~$0.003/story) | API key from [console.anthropic.com](https://console.anthropic.com/) |
| **Ollama** | Free, runs locally | [ollama.com](https://ollama.com) + `ollama pull qwen2.5:7b` |

For Gemini, you can also select the model version in Settings (Flash variants are faster and use less quota; Pro variants produce higher quality output).

For Ollama, you also set the base URL (default: `http://localhost:11434`) and the model name (recommended: `qwen2.5:7b` for speed, `qwen2.5:14b` for better quality).

### Appearance

The Settings page has a light/dark theme toggle. The preference is saved to localStorage.

### WaniKani (optional)

Paste your WaniKani personal access token (found in [account settings](https://www.wanikani.com/settings/personal_access_tokens)) to enable:

- Hover popups on any word in a story, showing meanings, readings, and mnemonics from WaniKani
- Your WaniKani username and level displayed in the app

### Data transfer

The Settings page lets you back up and restore your data:

- **Export config** — downloads your settings (API keys, provider, WaniKani token) as an encrypted file protected by a password you choose.
- **Import config** — restores settings from an encrypted export file using the password set at export time.
- **Export stories** — downloads all your stories as a `.json` file. Useful for moving to another device.
- **Import stories** — loads stories from a previously exported file; duplicates (matched by ID) are skipped automatically.

## Feedback & Support

Feedback, bug reports, and feature ideas are very welcome — feel free to [open an issue](https://github.com/Nauja/nihongo-story/issues) on GitHub.

If you find the app useful and want to support its development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/P8H4213C8K)


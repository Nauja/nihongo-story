# 話 Nihongo Story

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-blue?logo=github)](https://nauja.github.io/nihongo-story)


Web app that generates short Japanese stories on any theme you choose, targeting your current proficiency (JLPT N5–N1 or WaniKani levels). Stories come with furigana, clickable vocabulary definitions, a per-story level breakdown, and optional WaniKani kanji details — making it easy to read above your comfort zone without a dictionary.

## Demo

The web app runs entirely in your browser — no API key or generated stories are ever uploaded.

**https://nauja.github.io/nihongo-story**

## Why

WaniKani teaches kanji and vocabulary through mnemonics and stories — but when you move on to reading real Japanese content, that context is gone. Tools like Yomitan can look up words on the fly, but they don't surface the mnemonics or level data you already learned. WaniKani Kanji Highlighter does show that WaniKani info, but as a browser extension it can't be installed on mobile unless you use Kiwi browser. Finding material at the right level is its own challenge: too easy and you don't progress, too hard and it's discouraging.

nihongo-story bridges these gaps: generate stories, dialogues, or other formats targeted to your current WaniKani level (or any JLPT level), with WaniKani info always one click away — no browser extension required, so it works on any device including mobile. Since content is AI-generated, errors in grammar, vocabulary, or kanji usage can occur — treat it as a reading aid, not a ground truth, and stay critical as you read.

A WaniKani API key is entirely optional. The app works without one — you can generate and read stories at any JLPT or WaniKani level without it. Even without WaniKani you can see each story's JLPT level distribution and have kanji colour-coded or dimmed by JLPT level, using bundled kanji lists that need no key (see [JLPT level data](#jlpt-level-data-optional)). If you don't use WaniKani, you can still pair the app with Yomitan or any other lookup tool of your choice for word definitions.

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

Generation runs in the background, so you don't have to wait on the Generate page — navigate away and a spinner stays on the **Generate** tab while it works, then a toast pops up when the story is ready (tap it to open the reader). You can cancel an in-progress generation at any time.

### Reading a story

The reader displays the Japanese text with furigana (reading hints) above kanji. A vocabulary list and an English summary are shown below the text.

- Toggle furigana on/off from the header quick-settings panel (below) or by pressing **Tab**
- Use the **play/pause/stop** controls in the toolbar to listen to the story read aloud via the Web Speech API (Japanese voice, 0.9× speed). The progress bar shows the current line — click any position to jump to it. The active line is highlighted during playback.
- Use the **volume slider** in the toolbar to adjust playback volume.
- A **level distribution bar** above the text shows how the story's kanji spread across difficulty bands — JLPT N5–N1 or WaniKani groups (1–10 … 51–60), depending on the selected scheme — plus a grey **N/A** segment for kanji outside that scheme. Click a band to dim everything except the kanji in it, so you can see at a glance which characters belong to a given level.
- Known kanji can be **marked by level** (off, a translucent highlight, or a coloured underline), using the same easy→hard colour ramp as the distribution bar.
- Use the **word search box** ("lookup a kanji or word") to type any word and open its lookup popup directly, even if it isn't tappable in the text.
- If a WaniKani API key is configured (or its cache has been built), hover or click any highlighted word to open a popup with its meanings, readings, and mnemonics pulled from WaniKani. Click outside to close.

#### Quick-settings panel

A settings panel in the header gives one-tap control over how stories are displayed (preferences are saved to localStorage):

- **Furigana** — show/hide reading aids above kanji.
- **Level distribution** — choose the difficulty scale used by the bar and kanji marking: **JLPT** (always available) or **WK** (only selectable once a WaniKani key is set or its cache is built).
- **Kanji levels** — how known kanji are marked in the text: **Off**, **Highlight**, or **Underline**.

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

#### Using Ollama with the hosted site (CORS)

By default Ollama only accepts browser requests coming from `localhost`. When you use the **hosted** build at `https://nauja.github.io/nihongo-story`, requests come from `https://nauja.github.io`, so Ollama blocks them with a CORS error. Fix it by starting Ollama with `OLLAMA_ORIGINS` set to allow that origin:

- **Quick (any OS):**
  ```sh
  OLLAMA_ORIGINS="https://nauja.github.io" ollama serve
  ```
- **macOS (app):**
  ```sh
  launchctl setenv OLLAMA_ORIGINS "https://nauja.github.io"
  ```
  then quit and reopen Ollama.
- **Linux (systemd):**
  ```sh
  systemctl edit ollama.service
  ```
  add under `[Service]`:
  ```
  Environment="OLLAMA_ORIGINS=https://nauja.github.io"
  ```
  then `sudo systemctl daemon-reload && sudo systemctl restart ollama`.
- **Windows:** add a user environment variable `OLLAMA_ORIGINS=https://nauja.github.io`, then restart Ollama.

`OLLAMA_ORIGINS=*` also works but lets **any** website reach your local Ollama, so allowing the specific origin is safer. (Running the app locally on `http://localhost` needs none of this.)

### Appearance

The Settings page has a light/dark theme toggle. The preference is saved to localStorage.

### WaniKani (optional)

Paste your WaniKani personal access token (found in [account settings](https://www.wanikani.com/settings/personal_access_tokens)) to enable:

- Hover popups on any word in a story, showing meanings, readings, and mnemonics from WaniKani
- The WaniKani level scheme for the distribution bar and kanji marking
- Your WaniKani username and level displayed in the app

You can also tune two options:

- **Popup mode** — choose a **simple** (concise) or **advanced** (more detail) WaniKani popup.
- **Offline cache** — pre-load all WaniKani subjects (~9,000 kanji and vocabulary) into your browser. Once built, popups and WaniKani-level colouring work without re-querying the API on every story — and the WaniKani level scheme becomes usable even without keeping a key configured. Build, refresh, or clear the cache from Settings (it shows the cached count and size).

### JLPT level data (optional)

Build the **JLPT kanji cache** once from the bundled N5–N1 kanji lists (no API key, no network beyond the one-time load of files shipped with the app). It powers the JLPT level distribution bar and lets you colour or dim kanji by JLPT level. Build, refresh, or clear it from Settings, which shows the cached count and size. Kanji-list data is from [tanos.co.uk/jlpt](https://www.tanos.co.uk/jlpt/).

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


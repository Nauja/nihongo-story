import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateParams, Story, Segment, VocabItem } from "../types";

const STORY_TYPE_ILLUSTRATION_LABELS: Record<string, string> = {
  conversation: "dialogue scene",
  novel: "narrative scene",
  diary: "personal moment",
  poem: "poetic scene",
  news: "news scene",
};

const STORY_TYPE_LABELS: Record<string, string> = {
  conversation: "a short dialogue/conversation between two or more people",
  novel: "a short narrative story",
  diary: "a personal diary entry",
  poem: "a poem",
  news: "a short news article",
};

function buildLevelInstruction(level: GenerateParams["level"]): string {
  if (level.type === "wanikani") {
    if (level.value <= 10) {
      return `WaniKani level ${level.value} (very beginner: use only the simplest kanji and vocabulary, mostly hiragana, very short sentences)`;
    } else if (level.value <= 20) {
      return `WaniKani level ${level.value} (beginner: use basic kanji and common vocabulary)`;
    } else if (level.value <= 40) {
      return `WaniKani level ${level.value} (intermediate: use intermediate kanji and vocabulary)`;
    } else {
      return `WaniKani level ${level.value} (advanced: you may use complex kanji and vocabulary)`;
    }
  } else {
    const map: Record<number, string> = {
      5: "JLPT N5 (absolute beginner: ~800 words, basic hiragana/katakana, simple particles)",
      4: "JLPT N4 (beginner: ~1500 words, basic grammar patterns)",
      3: "JLPT N3 (intermediate: ~3750 words)",
      2: "JLPT N2 (upper intermediate: ~6000 words)",
      1: "JLPT N1 (advanced: ~10000 words, complex grammar)",
    };
    return map[level.value] ?? `JLPT N${level.value}`;
  }
}

const SYSTEM_PROMPT = `You are a Japanese language learning assistant. Generate a short Japanese story and return it as structured JSON.

Rules:
- Every kanji or vocabulary word MUST have a "reading" field in hiragana
- Pure hiragana or katakana: isInteractive: false, no reading field
- Punctuation (。、！？「」…): isInteractive: false, no reading field
- Kanji and kanji-compound vocabulary: isInteractive: true, include reading
- Particles (は、が、を、に、で、と、も、の、から、まで、より、か): isInteractive: false, no reading
- Break text into word-level tokens, not character-level
- Return ONLY valid JSON with no markdown, no code blocks, no extra text

JSON format:
{
  "title": "Story title in Japanese",
  "titleReading": "title reading in hiragana",
  "segments": [
    {"text": "今日", "reading": "きょう", "isInteractive": true},
    {"text": "は", "isInteractive": false},
    {"text": "いい", "isInteractive": false},
    {"text": "天気", "reading": "てんき", "isInteractive": true},
    {"text": "です", "isInteractive": false},
    {"text": "。", "isInteractive": false}
  ],
  "vocabulary": [
    {"word": "今日", "reading": "きょう", "meaning": "today"},
    {"word": "天気", "reading": "てんき", "meaning": "weather"}
  ],
  "englishSummary": "Brief English summary (1–3 sentences)"
}`;

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

interface RawStoryJSON {
  title?: unknown;
  titleReading?: unknown;
  segments?: unknown[];
  vocabulary?: unknown[];
  englishSummary?: unknown;
}

function parseStoryJSON(raw: RawStoryJSON, params: GenerateParams): Story {
  const segments: Segment[] = (raw.segments ?? []).map((s) => {
    const seg = s as Record<string, unknown>;
    return {
      text: String(seg.text ?? ""),
      reading: seg.reading ? String(seg.reading) : undefined,
      isInteractive: Boolean(seg.isInteractive),
    };
  });

  const vocabulary: VocabItem[] = (raw.vocabulary ?? []).map((v) => {
    const item = v as Record<string, unknown>;
    return {
      word: String(item.word ?? ""),
      reading: String(item.reading ?? ""),
      meaning: String(item.meaning ?? ""),
    };
  });

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: String(raw.title ?? "無題"),
    titleReading: String(raw.titleReading ?? ""),
    level: params.level,
    storyType: params.storyType,
    theme: params.theme,
    segments,
    vocabulary,
    englishSummary: String(raw.englishSummary ?? ""),
  };
}

const LENGTH_INSTRUCTIONS: Record<number, string> = {
  1: "3–5 sentences (very short)",
  2: "6–8 sentences (short)",
  3: "10–15 sentences (medium)",
  4: "18–25 sentences (long)",
  5: "30–40 sentences (very long)",
};

function buildUserPrompt(params: GenerateParams): string {
  const lengthInstruction = LENGTH_INSTRUCTIONS[params.length] ?? LENGTH_INSTRUCTIONS[3];
  const themeInstruction = params.theme.trim()
    ? `about: ${params.theme.trim()}`
    : `with a random, creative, and surprising theme of your own choosing`;
  return `Generate ${STORY_TYPE_LABELS[params.storyType]} ${themeInstruction}
Target level: ${buildLevelInstruction(params.level)}
Story length: ${lengthInstruction}`;
}

async function generateStoryAnthropic(params: GenerateParams): Promise<Story> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(params) }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const raw = JSON.parse(extractJSON(content.text)) as RawStoryJSON;
  return parseStoryJSON(raw, params);
}

async function generateStoryGemini(params: GenerateParams): Promise<Story> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({
    model: params.geminiModel || "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(buildUserPrompt(params));
  const text = result.response.text();

  const raw = JSON.parse(extractJSON(text)) as RawStoryJSON;
  return parseStoryJSON(raw, params);
}

interface OllamaResponse {
  message?: { content?: string };
}

async function generateStoryOllama(params: GenerateParams): Promise<Story> {
  const baseUrl = params.ollamaBaseUrl.replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.ollamaModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(params) },
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Ollama error ${res.status}. Make sure Ollama is running at ${params.ollamaBaseUrl} and the model "${params.ollamaModel}" is pulled.`,
    );
  }

  const data = (await res.json()) as OllamaResponse;
  const text = data.message?.content ?? "";

  let raw: RawStoryJSON;
  try {
    raw = JSON.parse(extractJSON(text)) as RawStoryJSON;
  } catch {
    throw new Error(
      `Failed to parse JSON from Ollama. The model "${params.ollamaModel}" may not follow instructions well enough. Try a larger model.`,
    );
  }

  return parseStoryJSON(raw, params);
}

async function generateIllustrationGemini(
  story: Story,
  apiKey: string,
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-preview-image-generation",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generationConfig: { responseModalities: ["IMAGE"] } as any,
    });

    const storyTypeLabel =
      STORY_TYPE_ILLUSTRATION_LABELS[story.storyType] ?? "scene";
    const prompt = `Create a beautiful watercolor illustration for a Japanese ${storyTypeLabel}. The story: ${story.englishSummary}. Style: soft pastel colors, gentle brushstrokes, Japanese aesthetic. No text, no words, no letters in the image.`;

    const result = await model.generateContent(prompt);
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      const inline = (part as unknown as Record<string, unknown>).inlineData as
        | { mimeType: string; data: string }
        | undefined;
      if (inline?.mimeType?.startsWith("image/") && inline.data) {
        return `data:${inline.mimeType};base64,${inline.data}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateIllustration(
  story: Story,
  params: Pick<GenerateParams, "provider" | "apiKey">,
): Promise<string | null> {
  if (params.provider !== "gemini") return null;
  return generateIllustrationGemini(story, params.apiKey);
}

export async function generateStory(params: GenerateParams): Promise<Story> {
  try {
    if (params.provider === "gemini") return await generateStoryGemini(params);
    if (params.provider === "ollama") return await generateStoryOllama(params);
    return await generateStoryAnthropic(params);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(
        "Failed to parse story JSON from AI response. Please try again.",
      );
    }
    throw err;
  }
}

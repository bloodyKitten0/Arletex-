// Media Utilities for Audio & Image processing in Arletex Renderer

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1]! : base64;
  const byteCharacters = atob(cleanBase64.trim());
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

let activeAudioElement: HTMLAudioElement | null = null;
let activeQueueId = 0;

export function stopCurrentAudio(): void {
  activeQueueId++;
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }
}

export async function playWavBase64(base64: string): Promise<HTMLAudioElement> {
  stopCurrentAudio();
  const dataUrl = base64.startsWith('data:') ? base64 : `data:audio/wav;base64,${base64}`;
  const audio = new Audio(dataUrl);
  activeAudioElement = audio;
  audio.onended = () => {
    if (activeAudioElement === audio) {
      activeAudioElement = null;
    }
  };
  await audio.play();
  return audio;
}

export interface SpeechChunk {
  text: string;
  tone?: string;
  leadPaddingMs: number;
}

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[tone:\s*[a-zA-Z]+\]/gi, '')
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/^[•\-\*]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function splitIntoSpeechChunks(rawText: string): SpeechChunk[] {
  if (!rawText) return [];

  // Match sentences ending in punctuation or end of string
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const rawSentences = rawText.match(sentenceRegex) || [rawText];

  const chunks: SpeechChunk[] = [];
  let buffer = '';
  let activeTone: string | undefined = undefined;

  for (const s of rawSentences) {
    let segment = s.trim();
    if (!segment) continue;

    // Detect and extract [tone: ...] tag if present
    const toneMatch = segment.match(/\[tone:\s*([a-zA-Z]+)\]/i);
    if (toneMatch) {
      activeTone = toneMatch[1]?.toLowerCase();
      segment = segment.replace(/\[tone:\s*[a-zA-Z]+\]/gi, '').trim();
    }

    const clean = cleanTextForSpeech(segment);
    if (!clean) continue;

    if (!buffer) {
      buffer = clean;
    } else if (buffer.length + clean.length < 240) {
      buffer += ' ' + clean;
    } else {
      // Avoid pushing an overly short opening chunk (< 45 chars) by itself
      if (chunks.length === 0 && buffer.length < 45) {
        buffer += ' ' + clean;
      } else {
        chunks.push({
          text: buffer,
          tone: activeTone,
          leadPaddingMs: chunks.length === 0 ? 280 : 0,
        });
        buffer = clean;
      }
    }
  }

  if (buffer) {
    chunks.push({
      text: buffer,
      tone: activeTone,
      leadPaddingMs: chunks.length === 0 ? 280 : 0,
    });
  }

  return chunks;
}

export async function playSpeechQueue(
  chunks: SpeechChunk[],
  synthesizeFn: (
    chunkText: string,
    tone?: string,
    leadPaddingMs?: number,
  ) => Promise<{ audioBase64?: string | null }>,
  onEnd?: () => void,
  onError?: (err: any) => void,
): Promise<void> {
  stopCurrentAudio();
  const queueId = ++activeQueueId;

  if (!chunks.length) {
    if (onEnd) onEnd();
    return;
  }

  // Pre-warm the audio hardware sink to prevent any initial clipping
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {}

  try {
    const firstChunk = chunks[0]!;
    let nextAudioPromise: Promise<{ audioBase64?: string | null }> | null = synthesizeFn(
      firstChunk.text,
      firstChunk.tone,
      firstChunk.leadPaddingMs,
    );

    for (let i = 0; i < chunks.length; i++) {
      if (queueId !== activeQueueId) return;

      const currentRes = await nextAudioPromise;
      if (queueId !== activeQueueId) return;

      // Pre-fetch next chunk in background while this one plays
      if (i + 1 < chunks.length) {
        const nextChunk = chunks[i + 1]!;
        nextAudioPromise = synthesizeFn(
          nextChunk.text,
          nextChunk.tone,
          nextChunk.leadPaddingMs,
        );
      } else {
        nextAudioPromise = null;
      }

      if (!currentRes?.audioBase64) continue;

      await new Promise<void>((resolve) => {
        if (queueId !== activeQueueId) {
          resolve();
          return;
        }
        const dataUrl = currentRes.audioBase64!.startsWith('data:')
          ? currentRes.audioBase64!
          : `data:audio/wav;base64,${currentRes.audioBase64}`;
        const audio = new Audio(dataUrl);
        activeAudioElement = audio;

        audio.onended = () => {
          if (activeAudioElement === audio) activeAudioElement = null;
          resolve();
        };

        audio.onerror = () => {
          if (activeAudioElement === audio) activeAudioElement = null;
          resolve();
        };

        audio.play().catch(() => {
          if (activeAudioElement === audio) activeAudioElement = null;
          resolve();
        });
      });
    }
  } catch (err) {
    if (onError) onError(err);
  } finally {
    if (queueId === activeQueueId) {
      if (onEnd) onEnd();
    }
  }
}

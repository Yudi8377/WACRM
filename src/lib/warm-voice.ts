import { getAndroidBridge } from "@/lib/printer";

export type WarmVoicePersonaId = "warm_friendly" | "calm_mentor" | "cheerful_host";

export interface WarmVoicePersona {
  id: WarmVoicePersonaId;
  name: string;
  tagline: string;
  rate: number;
  pitch: number;
  sampleGreeting: string;
}

export const WARM_VOICE_PERSONAS: WarmVoicePersona[] = [
  {
    id: "warm_friendly",
    name: "Sari · Ramah & Hangat",
    tagline: "Suara alami, akrab & menenangkan seperti rekan bisnis pribadi",
    rate: 0.96,
    pitch: 1.04,
    sampleGreeting:
      "Halo, selamat datang! Saya Sari, asisten pribadi suara Anda. Senang sekali bisa menemani usaha Anda hari ini. Ada yang bisa saya bantu?",
  },
  {
    id: "calm_mentor",
    name: "Nadia · Tenang & Elegan",
    tagline: "Intonasi lembut, jelas & terstruktur untuk analisis keuangan & laporan",
    rate: 0.91,
    pitch: 0.97,
    sampleGreeting:
      "Halo, saya Nadia. Saya siap membantu menganalisis omzet, stok gudang, dan prospek usaha Anda dengan tenang dan akurat.",
  },
  {
    id: "cheerful_host",
    name: "Bima · Ceria & Semangat",
    tagline: "Penuh energi positif untuk menyemangati penjualan harian Anda",
    rate: 1.03,
    pitch: 1.08,
    sampleGreeting:
      "Halo semangat pagi! Saya Bima, siap bantu kejar target penjualan dan follow up prospek hari ini. Yuk kita mulai!",
  },
];

let cachedVoices: SpeechSynthesisVoice[] = [];
let activeWatchdogTimer: ReturnType<typeof setInterval> | null = null;
let speechGenerationId = 0;

/**
 * Plays a very soft, warm 2-note chime via Web Audio API so browser audio context
 * unlocks immediately inside the user click gesture and confirms speaker output works.
 */
export function playWarmActivationChime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const notes = [523.25, 659.25]; // Soft C5 -> E5 warm interval
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.11 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.11 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.3);
    });
    setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 650);
    return true;
  } catch {
    return false;
  }
}

export function loadAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const list = window.speechSynthesis.getVoices();
  if (list.length > 0) cachedVoices = list;
  return cachedVoices;
}

export function subscribeVoicesChanged(onChange: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  const handler = () => {
    const list = loadAvailableVoices();
    onChange(list);
  };
  handler();
  window.speechSynthesis.addEventListener?.("voiceschanged", handler);
  // Some browsers populate voices slightly after mount without firing the event
  const t1 = setTimeout(handler, 350);
  const t2 = setTimeout(handler, 1200);
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
  };
}

/**
 * Selects the warmest, most natural Indonesian voice available in the browser.
 */
export function selectWarmIndonesianVoice(
  voices: SpeechSynthesisVoice[],
  preferredVoiceName?: string | null,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  if (preferredVoiceName) {
    const exact = voices.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    let score = 0;

    if (lang === "id-id" || lang === "id_id" || lang.startsWith("id")) score += 100;
    else if (lang.startsWith("ms")) score += 45; // Malay is close fallback if id-ID absent

    if (name.includes("natural") || name.includes("online") || name.includes("neural")) score += 40;
    if (name.includes("gadis")) score += 35; // Warm female Indonesian Microsoft Natural voice
    if (name.includes("google bahasa indonesia")) score += 32;
    if (name.includes("damayanti") || name.includes("siti")) score += 28;
    if (name.includes("ardi")) score += 22;
    if (name.includes("indonesia")) score += 20;
    if (v.default) score += 5;

    return score;
  };

  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] ?? null;
}

/**
 * Strips markdown, emojis, URLs, and code artifacts so spoken speech sounds genuinely human.
 */
export function prepareNaturalSpeechText(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/g, "tautan di layar")
    .replace(/[*_`~#>[\]()]/g, " ")
    .replace(/[🔒🔓🎙️🔊✨🚀🎉👍👎⚠️✅❌💡📊📈📉💬🤖]/g, " ")
    .replace(/\bRp\s*(\d[\d.]*)/gi, (_, num: string) => `rupiah ${num.replace(/\./g, "")}`)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits long text into natural sentence chunks (<= 165 chars) to prevent Chrome's
 * infamous silent cut-off on long SpeechSynthesis utterances.
 */
export function splitIntoNaturalSpeechChunks(text: string, maxLen = 165): string[] {
  const clean = prepareNaturalSpeechText(text);
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    if ((buffer + " " + sentence).trim().length <= maxLen) {
      buffer = (buffer + " " + sentence).trim();
    } else {
      if (buffer) chunks.push(buffer);
      if (sentence.length <= maxLen) {
        buffer = sentence.trim();
      } else {
        // Split very long clause at commas
        const parts = sentence.split(/,\s*/);
        let sub = "";
        for (const p of parts) {
          if ((sub + ", " + p).length <= maxLen) {
            sub = sub ? `${sub}, ${p}` : p;
          } else {
            if (sub) chunks.push(sub.trim());
            sub = p.trim();
          }
        }
        buffer = sub;
      }
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

export function stopWarmSpeech(): void {
  speechGenerationId += 1;
  if (activeWatchdogTimer) {
    clearInterval(activeWatchdogTimer);
    activeWatchdogTimer = null;
  }
  if (typeof window === "undefined") return;
  try {
    getAndroidBridge()?.stopSpeaking?.();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}

export function speakWarmIndonesian(params: {
  text: string;
  personaId?: WarmVoicePersonaId;
  preferredVoiceName?: string | null;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}): { engine: "android" | "web_speech" | "unavailable"; voiceName: string | null } {
  if (typeof window === "undefined") {
    return { engine: "unavailable", voiceName: null };
  }

  const naturalText = prepareNaturalSpeechText(params.text);
  if (!naturalText) {
    params.onEnd?.();
    return { engine: "unavailable", voiceName: null };
  }

  const android = getAndroidBridge();
  if (android?.speakText) {
    params.onStart?.();
    android.speakText(naturalText);
    const approxMs = Math.min(14000, Math.max(2200, naturalText.length * 62));
    setTimeout(() => params.onEnd?.(), approxMs);
    return { engine: "android", voiceName: "Android Native Bahasa Indonesia" };
  }

  if (!("speechSynthesis" in window)) {
    params.onError?.("Browser tidak mendukung Web Speech Synthesis.");
    return { engine: "unavailable", voiceName: null };
  }

  stopWarmSpeech();
  const genId = ++speechGenerationId;
  const persona =
    WARM_VOICE_PERSONAS.find((p) => p.id === params.personaId) ?? WARM_VOICE_PERSONAS[0];
  const voices = loadAvailableVoices();
  const chosenVoice = selectWarmIndonesianVoice(voices, params.preferredVoiceName);
  const chunks = splitIntoNaturalSpeechChunks(naturalText);

  if (chunks.length === 0) {
    params.onEnd?.();
    return { engine: "web_speech", voiceName: chosenVoice?.name ?? null };
  }

  // Ensure Chrome/Safari synthesis engine isn't stuck in paused state
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {
    // ignore
  }

  // Keep-alive watchdog prevents Chrome from silently pausing speech after ~14 seconds
  activeWatchdogTimer = setInterval(() => {
    if (genId !== speechGenerationId) {
      if (activeWatchdogTimer) clearInterval(activeWatchdogTimer);
      return;
    }
    try {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }, 10_000);

  let idx = 0;
  let startedNotified = false;

  const speakNext = () => {
    if (genId !== speechGenerationId) return;
    if (idx >= chunks.length) {
      if (activeWatchdogTimer) {
        clearInterval(activeWatchdogTimer);
        activeWatchdogTimer = null;
      }
      params.onEnd?.();
      return;
    }

    const utter = new SpeechSynthesisUtterance(chunks[idx]);
    utter.lang = chosenVoice?.lang || "id-ID";
    if (chosenVoice) utter.voice = chosenVoice;
    utter.rate = persona.rate;
    utter.pitch = persona.pitch;
    utter.volume = Math.min(1, Math.max(0.2, params.volume ?? 1));

    utter.onstart = () => {
      if (!startedNotified) {
        startedNotified = true;
        params.onStart?.();
      }
    };
    utter.onend = () => {
      idx += 1;
      speakNext();
    };
    utter.onerror = (ev) => {
      if (genId !== speechGenerationId) return;
      const errCode = (ev as { error?: string }).error || "unknown";
      if (errCode === "canceled" || errCode === "interrupted") return;
      if (activeWatchdogTimer) {
        clearInterval(activeWatchdogTimer);
        activeWatchdogTimer = null;
      }
      params.onError?.(
        errCode === "not-allowed"
          ? "Browser menahan audio otomatis — klik tombol 'Tes & Aktifkan Suara' terlebih dahulu."
          : `Kendala audio browser (${errCode}). Pastikan volume perangkat aktif.`,
      );
    };

    try {
      window.speechSynthesis.speak(utter);
    } catch {
      params.onError?.("Gagal memutar suara pada browser ini.");
    }
  };

  // Slight 40ms micro-delay after cancel() prevents Chrome from dropping the first chunk!
  setTimeout(speakNext, 40);

  return {
    engine: "web_speech",
    voiceName: chosenVoice?.name ?? "Default Bahasa Indonesia (Sistem)",
  };
}

/**
 * 音声入力ラッパー（Web Speech API / SpeechRecognition）。
 * ブラウザ標準・無料・APIキー不要。Chrome 系で利用可。
 *
 * 位置づけ: 音声 → テキスト化のみを担い、テキストは既存のタスク入力
 * （`parseTaskInput`）にそのまま流す。Gemini 等の課金 API は使わない。
 */

interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternativeLike;
}
interface SpeechResultListLike {
  readonly length: number;
  [index: number]: SpeechResultLike;
}
interface SpeechEventLike {
  resultIndex: number;
  results: SpeechResultListLike;
}
interface SpeechErrorEventLike {
  error?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** この環境で音声入力が使えるか。 */
export function isSpeechSupported(): boolean {
  return getCtor() !== null;
}

export interface SpeechRecognizer {
  start: () => void;
  stop: () => void;
}

export interface SpeechOptions {
  lang?: string;
  /** 確定前の暫定テキストも逐次通知するか（既定 true）。 */
  interim?: boolean;
  /** 認識テキスト。isFinal=false は暫定（入力欄プレビュー用）。 */
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * 認識器を生成する。非対応環境では null を返す（呼び出し側でボタンを隠す）。
 */
export function createSpeechRecognizer(opts: SpeechOptions): SpeechRecognizer | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = opts.lang ?? "ja-JP";
  rec.interimResults = opts.interim ?? true;
  rec.continuous = false;

  rec.onresult = (e) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0]?.transcript ?? "";
      if (r.isFinal) final += text;
      else interim += text;
    }
    if (final) opts.onResult(final, true);
    else if (interim) opts.onResult(interim, false);
  };
  rec.onerror = (e) => opts.onError?.(e.error ?? "speech-error");
  rec.onend = () => opts.onEnd?.();

  return {
    start: () => {
      try {
        rec.start();
      } catch {
        // 連続 start などの InvalidStateError は無視（既に録音中）。
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    },
  };
}

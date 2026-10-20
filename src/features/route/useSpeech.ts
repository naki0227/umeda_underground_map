import { useCallback, useEffect, useMemo } from 'react';

export interface Speech {
  /** ブラウザが読み上げ（Web Speech API）に対応しているか */
  supported: boolean;
  /** 読み上げ中のものを止めてから読む */
  speak: (text: string, language: string) => void;
  cancel: () => void;
}

/** 表示言語 → 読み上げの言語タグ */
function speechLang(language: string): string {
  return language.startsWith('ja') ? 'ja-JP' : 'en-US';
}

/**
 * ブラウザ標準の音声合成で読み上げる。外部サービスには送らない。
 * アンマウント時に読み上げを止める。
 */
export function useSpeech(): Speech {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const supported = synth !== undefined && typeof SpeechSynthesisUtterance !== 'undefined';

  const cancel = useCallback(() => synth?.cancel(), [synth]);

  const speak = useCallback(
    (text: string, language: string) => {
      if (!supported || synth === undefined) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang(language);
      synth.speak(utterance);
    },
    [supported, synth],
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ supported, speak, cancel }), [supported, speak, cancel]);
}

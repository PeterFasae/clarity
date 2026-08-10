import { useCallback, useEffect, useState } from 'react';

/**
 * Reading a note aloud.
 *
 * Design rule 4 is multimodal in and out: dictation covers the way in, this is
 * the way out. Some days reading is the hard part, and hearing the summary
 * while looking at the original is a genuinely different task from reading it.
 *
 * Speech synthesis is supported far more widely than recognition, but it is
 * still checked, and callers hide the control rather than showing a dead one.
 */

interface SpeechSynthesisApi {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisApi {
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const [speaking, setSpeaking] = useState(false);

  // Leaving the page mid-sentence otherwise keeps talking, because the speech
  // queue belongs to the browser rather than to this component.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = navigator.language || 'en-GB';
      // A shade under default. Note-taking prose read at full speed is hard to
      // follow, and this is being read by someone who asked for help following.
      utterance.rate = 0.95;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, stop };
}

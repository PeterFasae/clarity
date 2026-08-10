import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dictation, via the Web Speech API.
 *
 * In practice this means Chrome and Edge. Everywhere else `supported` comes
 * back false and the caller shows the text path instead — the rule is that
 * there is never a microphone button that does nothing when you press it. A
 * dead control is worse than an absent one, especially for someone who will
 * read the failure as their own.
 *
 * `transcript` is the finalised text; `interim` is what the engine currently
 * thinks it is hearing, which is worth showing because watching your own voice
 * become text is the moment this feature earns its place.
 */

interface SpeechRecognitionApi {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function constructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechRecognition(): SpeechRecognitionApi {
  const [supported] = useState(() => Boolean(constructor()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognition = useRef<SpeechRecognition | null>(null);
  // Held in a ref as well, so a restart appends rather than starting over.
  const finalised = useRef('');

  useEffect(() => {
    const Recognition = constructor();
    if (!Recognition) return;

    const instance = new Recognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = navigator.language || 'en-GB';

    instance.onresult = (event: SpeechRecognitionEvent) => {
      let pending = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalised.current += text;
        else pending += text;
      }

      setTranscript(finalised.current);
      setInterim(pending);
    };

    instance.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false);
      setError(readableError(event.error));
    };

    instance.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognition.current = instance;

    return () => {
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      try {
        instance.abort();
      } catch {
        // Already stopped. Nothing to do.
      }
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    try {
      recognition.current?.start();
      setListening(true);
    } catch {
      // start() throws if it is already running, which is harmless.
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalised.current = '';
    setTranscript('');
    setInterim('');
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}

/** The browser's error codes, said the way a person would say them. */
function readableError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Your browser is blocking the microphone. Allow it in the address bar, or just type instead.';
    case 'no-speech':
      return "Didn't catch anything. Try again, or type instead.";
    case 'audio-capture':
      return 'No microphone found. You can type instead.';
    case 'network':
      return 'Dictation needs a connection and could not reach it. Typing still works.';
    default:
      return 'Dictation stopped unexpectedly. You can type instead — nothing was lost.';
  }
}

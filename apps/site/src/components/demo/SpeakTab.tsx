import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * "Speak it" — live voice-to-text via the Web Speech API, entirely in-browser.
 * Never renders a broken mic: if the API is missing or permission is denied, it
 * falls back to a "Play sample" button that types a realistic transcript.
 */

const SAMPLE =
  "okay so for the essay I want to — wait, no, start with the second point actually, the thing about attention being a resource not a switch, because that's the bit the lecturer kept coming back to. um. and then there's the reading, the one with the blue cover, I need to find that again. anyway the main thing is: don't try to write it all in one go. small chunks. that's the whole idea really.";

type Support = "unknown" | "supported" | "unsupported";

export function SpeakTab() {
  const [support, setSupport] = useState<Support>("unknown");
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const typingRef = useRef<number | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupport(Ctor ? "supported" : "unsupported");
    return () => {
      recognitionRef.current?.abort();
      if (typingRef.current) window.clearTimeout(typingRef.current);
    };
  }, []);

  function startListening() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    setNotice(null);
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let live = "";
      let done = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) done += transcript;
        else live += transcript;
      }
      if (done) setFinalText((prev) => (prev + " " + done).trim());
      setInterim(live);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setNotice(
          "Your browser blocked microphone access. That's fine — you can watch a sample instead, or allow the mic and try again.",
        );
      } else if (event.error === "no-speech") {
        setNotice("Didn't catch anything. Try again and speak a little louder.");
      } else {
        setNotice("The microphone stopped unexpectedly. You can try again.");
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }

  // Fallback: type the sample at a natural, slightly uneven pace.
  function playSample() {
    setFinalText("");
    setInterim("");
    setNotice(null);
    setPlaying(true);
    const words = SAMPLE.split(" ");
    let i = 0;
    const tick = () => {
      i += 1;
      setFinalText(words.slice(0, i).join(" "));
      if (i < words.length) {
        const base = 55;
        const jitter = Math.random() * 90;
        const pause = /[—.,:]$/.test(words[i - 1]) ? 260 : 0;
        typingRef.current = window.setTimeout(tick, base + jitter + pause);
      } else {
        setPlaying(false);
      }
    };
    tick();
  }

  function stopSample() {
    if (typingRef.current) window.clearTimeout(typingRef.current);
    setPlaying(false);
  }

  const hasText = finalText.length > 0 || interim.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {support === "supported" ? (
          listening ? (
            <Button onClick={stopListening} variant="secondary" size="lg">
              <Square className="h-5 w-5" aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <Button onClick={startListening} size="lg">
              <Mic className="h-5 w-5" aria-hidden="true" />
              Start speaking
            </Button>
          )
        ) : support === "unsupported" ? (
          playing ? (
            <Button onClick={stopSample} variant="secondary" size="lg">
              <Square className="h-5 w-5" aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <Button onClick={playSample} size="lg">
              <Play className="h-5 w-5" aria-hidden="true" />
              Play a sample
            </Button>
          )
        ) : null}

        {/* Always offer the sample as an alternative when the mic is available too. */}
        {support === "supported" && !listening && (
          <Button onClick={playSample} variant="ghost" size="lg" disabled={playing}>
            <Play className="h-5 w-5" aria-hidden="true" />
            Or play a sample
          </Button>
        )}

        {listening && (
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <span className="h-3 w-3 animate-pulse-gentle rounded-full bg-lavender-ink" />
            Listening…
          </span>
        )}
      </div>

      {support === "unsupported" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <MicOff className="h-4 w-4" aria-hidden="true" />
          Your browser doesn&rsquo;t support in-page voice input — here&rsquo;s a
          sample of how it feels.
        </p>
      )}

      {notice && (
        <p role="status" className="mt-3 rounded-lg bg-lavender-soft p-3 text-ink">
          {notice}
        </p>
      )}

      <div
        aria-live="polite"
        className="mt-5 min-h-[8rem] rounded-lg border border-line bg-surface p-5 text-lg leading-relaxed"
      >
        {hasText ? (
          <p>
            <span className="text-ink">{finalText}</span>{" "}
            <span className="text-ink-muted">{interim}</span>
          </p>
        ) : (
          <p className="text-ink-muted">
            {support === "supported"
              ? "Press start and say anything — your words appear here as you speak."
              : "Your transcript will appear here."}
          </p>
        )}
      </div>
    </div>
  );
}

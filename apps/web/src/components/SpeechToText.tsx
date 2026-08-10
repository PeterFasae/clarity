
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, ClipboardCopy } from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { toast } from 'sonner';

interface SpeechToTextProps {
  onTranscriptReady?: (text: string) => void;
  className?: string;
}

const SpeechToText: React.FC<SpeechToTextProps> = ({ 
  onTranscriptReady,
  className = ""
}) => {
  const { 
    text, 
    isListening, 
    error, 
    startListening, 
    stopListening, 
    resetText,
    browserSupportsSpeechRecognition 
  } = useSpeechRecognition();

  // Show error if browser doesn't support speech recognition
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Your browser doesn't support speech recognition.");
    }
  }, [browserSupportsSpeechRecognition]);

  // Handle errors from speech recognition
  useEffect(() => {
    if (error) {
      toast.error(`Speech recognition error: ${error}`);
    }
  }, [error]);

  // Handle copy to clipboard
  const handleCopyToClipboard = () => {
    if (text) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success("Transcript copied to clipboard");
        })
        .catch(err => {
          toast.error("Failed to copy transcript");
          console.error('Failed to copy: ', err);
        });
    } else {
      toast.info("No transcript to copy");
    }
  };

  // Handle use transcript button
  const handleUseTranscript = () => {
    if (onTranscriptReady && text) {
      onTranscriptReady(text);
      resetText();
      toast.success("Transcript added to note");
    } else {
      toast.info("No transcript to add");
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className={`p-4 bg-red-50 text-red-800 rounded-md ${className}`}>
        Your browser doesn't support speech recognition.
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Speech to Text</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetText}
            disabled={!text}
            aria-label="Clear transcript"
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            disabled={!text}
            aria-label="Copy transcript to clipboard"
          >
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>

      <div 
        aria-live="polite" 
        className={`min-h-24 p-3 rounded-md border bg-white/50 overflow-y-auto ${text ? 'text-left' : 'text-muted-foreground text-center'}`}
      >
        {text ? text : isListening ? "Listening..." : "Click the microphone button to start recording"}
      </div>

      <div className="flex justify-between pt-2">
        <Button 
          variant={isListening ? "destructive" : "default"}
          onClick={toggleListening}
          aria-label={isListening ? "Stop listening" : "Start listening"}
          aria-pressed={isListening}
          className="gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start Listening
            </>
          )}
        </Button>

        {onTranscriptReady && (
          <Button 
            variant="outline" 
            onClick={handleUseTranscript}
            disabled={!text} 
            aria-label="Use transcript in note"
          >
            Use Transcript
          </Button>
        )}
      </div>

      {isListening && (
        <div className="text-sm text-center text-muted-foreground animate-pulse-gentle">
          Listening... Speak clearly
        </div>
      )}
    </div>
  );
};

export default SpeechToText;

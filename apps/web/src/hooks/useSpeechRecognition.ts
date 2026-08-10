
import { useState, useEffect, useCallback } from 'react';

interface SpeechRecognitionHook {
  text: string;
  isListening: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetText: () => void;
  browserSupportsSpeechRecognition: boolean;
}

const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);

  useEffect(() => {
    // Check if browser supports the Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionAPI();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setText(transcript);
      };
      
      recognitionInstance.onerror = (event) => {
        setError(event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      setBrowserSupportsSpeechRecognition(true);
    } else {
      setError('Your browser does not support speech recognition.');
      setBrowserSupportsSpeechRecognition(false);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        if (isListening) {
          recognition.stop();
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        // Handles the case where recognition is already started
        console.error('Speech recognition error:', error);
      }
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  const resetText = useCallback(() => {
    setText('');
  }, []);

  return {
    text,
    isListening,
    error,
    startListening,
    stopListening,
    resetText,
    browserSupportsSpeechRecognition
  };
};

export default useSpeechRecognition;

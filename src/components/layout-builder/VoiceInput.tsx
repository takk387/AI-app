'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionType extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionType, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionType, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionType, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionType, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  }
}

interface VoiceInputProps {
  /** Callback when speech is transcribed */
  onTranscript: (text: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Optional class name */
  className?: string;
  /** Placeholder text when not listening */
  placeholder?: string;
}

/**
 * VoiceInput Component
 *
 * Provides voice input using the Web Speech API.
 * Falls back gracefully when not supported.
 */
export function VoiceInput({
  onTranscript,
  onError,
  className = '',
  placeholder = 'Click to speak...',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Check for browser support
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        // Ignore no-speech errors
        return;
      }
      onError?.(event.error);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        setTranscript((prev) => prev + final);
        onTranscript(final.trim());
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript, onError]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setInterimTranscript('');
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <div className={`p-3 bg-slate-800 rounded-lg text-center ${className}`}>
        <p className="text-sm text-slate-400">Voice input is not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
          isListening
            ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
        }`}
      >
        {/* Microphone Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-700'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 text-left">
          {isListening ? (
            <div className="space-y-1">
              <div className="text-sm font-medium">Listening...</div>
              {interimTranscript && (
                <div className="text-xs opacity-70 truncate">{interimTranscript}</div>
              )}
            </div>
          ) : (
            <div className="text-sm">{placeholder}</div>
          )}
        </div>

        {/* Status indicator */}
        {isListening && (
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        )}
      </button>

      {/* Recent transcript display */}
      {transcript && !isListening && (
        <div className="mt-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Last spoken:</span>
            <button
              type="button"
              onClick={() => setTranscript('')}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
          <p className="text-sm text-slate-300 line-clamp-2">{transcript}</p>
        </div>
      )}
    </div>
  );
}

export default VoiceInput;

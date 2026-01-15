"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const WPM_OPTIONS = [300, 400, 500, 600];

export default function SpeedReader() {
  const [text, setText] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const intervalMs = (60 / wpm) * 1000;

  const parseText = useCallback((inputText: string) => {
    const parsed = inputText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWords(parsed);
    setCurrentIndex(0);
    setHasStarted(false);
    setIsPlaying(false);
  }, []);

  const handleStart = () => {
    if (words.length === 0) {
      parseText(text);
      return;
    }
    setHasStarted(true);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setHasStarted(false);
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    parseText(newText);
  };

  useEffect(() => {
    if (isPlaying && currentIndex < words.length) {
      intervalRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, intervalMs);
    } else if (currentIndex >= words.length && words.length > 0) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, words.length, intervalMs]);

  const progress =
    words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;
  const currentWord = words[currentIndex] || "";
  const isFinished = hasStarted && currentIndex >= words.length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-4">
      {!hasStarted ? (
        <div className="flex flex-col gap-4">
          <Textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Paste or type the text you want to speed read..."
            className="min-h-[200px] text-base"
          />
          <p className="text-sm text-muted-foreground text-center">
            {words.length > 0 ? `${words.length} words` : "Enter text to begin"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-center min-h-[180px] w-full">
            {isFinished ? (
              <p className="text-2xl text-muted-foreground">Done</p>
            ) : (
              <p className="text-5xl sm:text-6xl font-bold text-center break-all leading-tight" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
                {currentWord}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {Math.min(currentIndex + 1, words.length)} / {words.length}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground text-center">Words per minute</p>
          <div className="flex items-center justify-center gap-1">
            {WPM_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={wpm === option ? "default" : "outline"}
                size="sm"
                onClick={() => setWpm(option)}
                className={cn("flex-1 max-w-20")}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {!hasStarted ? (
            <Button
              onClick={handleStart}
              disabled={words.length === 0}
              className="flex-1 h-12 text-base"
              size="lg"
            >
              Start
            </Button>
          ) : (
            <>
              {isPlaying ? (
                <Button
                  onClick={handlePause}
                  variant="secondary"
                  className="flex-1 h-12 text-base"
                  size="lg"
                >
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (isFinished) {
                      setCurrentIndex(0);
                    }
                    setIsPlaying(true);
                  }}
                  className="flex-1 h-12 text-base"
                  size="lg"
                >
                  {isFinished ? "Replay" : "Resume"}
                </Button>
              )}
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 text-base px-6"
                size="lg"
              >
                New
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

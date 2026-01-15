"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const WPM_OPTIONS = [300, 400, 500, 600];

export default function SpeedReader() {
  const [text, setText] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [hasStarted, setHasStarted] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user has a system preference for dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkMode = document.documentElement.classList.contains("dark") || prefersDark;
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
  };

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
    setError("");
  };

  const handleClear = () => {
    setText("");
    setWords([]);
    setCurrentIndex(0);
    setHasStarted(false);
    setIsPlaying(false);
    setUrl("");
    setError("");
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch URL");
        return;
      }

      handleTextChange(data.text);
    } catch {
      setError("Failed to fetch URL");
    } finally {
      setIsLoading(false);
    }
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
      {!hasStarted && (
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
            Speed Reader
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="h-10 w-10"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </Button>
        </div>
      )}

      {!hasStarted ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a URL to fetch text..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFetchUrl();
                }
              }}
            />
            <Button
              onClick={handleFetchUrl}
              disabled={!url.trim() || isLoading}
              variant="secondary"
            >
              {isLoading ? "..." : "Fetch"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Or paste/type text directly..."
              className="min-h-[200px] text-base pr-16"
            />
            {(text || url) && (
              <Button
                onClick={handleClear}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {words.length > 0 ? `${words.length} words` : "Enter text to begin"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center min-h-[180px] w-full">
            {isFinished ? (
              <p className="text-2xl text-muted-foreground">Done</p>
            ) : (
              <p className="text-4xl sm:text-5xl font-bold text-center break-all leading-tight" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
                {currentWord}
              </p>
            )}
          </div>

          <div className="w-full flex flex-col gap-2">
            <Slider
              value={[currentIndex]}
              min={0}
              max={Math.max(0, words.length - 1)}
              step={1}
              onValueChange={([value]) => {
                setCurrentIndex(value);
                if (isFinished) {
                  setIsPlaying(false);
                }
              }}
              className="w-full touch-pan-y"
            />
            <p className="text-sm text-muted-foreground text-center">
              {Math.min(currentIndex + 1, words.length)} / {words.length}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground text-center">Words per minute</p>
          <div className="flex items-center justify-center gap-2">
            {WPM_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={wpm === option ? "default" : "outline"}
                onClick={() => setWpm(option)}
                className={cn("flex-1 h-12 text-base")}
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
              className="flex-1 h-14 text-lg"
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
                  className="flex-1 h-14 text-lg"
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
                  className="flex-1 h-14 text-lg"
                  size="lg"
                >
                  {isFinished ? "Replay" : "Resume"}
                </Button>
              )}
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-14 text-lg px-8"
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

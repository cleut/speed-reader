"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Link from "next/link";

const WPM_OPTIONS = [300, 400, 500, 600];
const STORAGE_KEY = "speed-reader-progress";
const STATS_KEY = "speed-reader-stats";

// Check if word ends with punctuation that needs a pause
function getPauseMultiplier(word: string): number {
  if (/[.!?]$/.test(word)) return 2.0; // Full stop, exclamation, question
  if (/[,;:]$/.test(word)) return 1.4; // Comma, semicolon, colon
  if (/[-—]$/.test(word)) return 1.2; // Dash
  return 1.0;
}

// Format time in minutes and seconds
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Estimate reading time
function estimateReadingTime(wordCount: number, wpm: number): string {
  const minutes = wordCount / wpm;
  if (minutes < 1) return "< 1 min";
  return `~${Math.ceil(minutes)} min`;
}

interface SavedProgress {
  text: string;
  url: string;
  currentIndex: number;
  wpm: number;
  timestamp: number;
}

interface SessionStats {
  totalWordsRead: number;
  totalTimeSpent: number; // in seconds
  sessionsCompleted: number;
  lastSession: number;
}

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
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [wordsReadThisSession, setWordsReadThisSession] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const baseIntervalMs = (60 / wpm) * 1000;
  const currentWord = words[currentIndex] || "";
  const pauseMultiplier = getPauseMultiplier(currentWord);
  const intervalMs = baseIntervalMs * pauseMultiplier;

  // Load saved progress and dark mode preference on mount
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkMode = document.documentElement.classList.contains("dark") || prefersDark;
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);

    // Check for saved progress
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSavedProgress(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
  };

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

  const saveProgress = useCallback(() => {
    if (words.length === 0) return;
    const progress: SavedProgress = {
      text,
      url,
      currentIndex,
      wpm,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [text, url, currentIndex, wpm, words.length]);

  const loadProgress = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const progress: SavedProgress = JSON.parse(saved);
      setText(progress.text);
      setUrl(progress.url);
      setWpm(progress.wpm);
      const parsed = progress.text.trim().split(/\s+/).filter((word) => word.length > 0);
      setWords(parsed);
      setCurrentIndex(progress.currentIndex);
      setHasStarted(true);
      setHasSavedProgress(false);
    }
  };

  const clearSavedProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedProgress(false);
  };

  const updateStats = useCallback((wordsRead: number, timeSpent: number, completed: boolean) => {
    const saved = localStorage.getItem(STATS_KEY);
    const stats: SessionStats = saved
      ? JSON.parse(saved)
      : { totalWordsRead: 0, totalTimeSpent: 0, sessionsCompleted: 0, lastSession: 0 };

    stats.totalWordsRead += wordsRead;
    stats.totalTimeSpent += timeSpent;
    if (completed) stats.sessionsCompleted += 1;
    stats.lastSession = Date.now();

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, []);

  const handleStart = () => {
    if (words.length === 0) {
      parseText(text);
      return;
    }
    setHasStarted(true);
    setIsPlaying(true);
    setSessionStartTime(Date.now());
    setWordsReadThisSession(0);
    clearSavedProgress();
  };

  const handlePause = () => {
    setIsPlaying(false);
    saveProgress();
  };

  const handleReset = () => {
    // Save stats before resetting
    if (sessionStartTime && wordsReadThisSession > 0) {
      const timeSpent = (Date.now() - sessionStartTime) / 1000;
      updateStats(wordsReadThisSession, timeSpent, currentIndex >= words.length);
    }
    setCurrentIndex(0);
    setIsPlaying(false);
    setHasStarted(false);
    setSessionStartTime(null);
    setWordsReadThisSession(0);
    clearSavedProgress();
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
    clearSavedProgress();
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
        setWordsReadThisSession((prev) => prev + 1);
      }, intervalMs);
    } else if (currentIndex >= words.length && words.length > 0 && isPlaying) {
      setIsPlaying(false);
      // Save final stats
      if (sessionStartTime) {
        const timeSpent = (Date.now() - sessionStartTime) / 1000;
        updateStats(wordsReadThisSession + 1, timeSpent, true);
      }
      clearSavedProgress();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, words.length, intervalMs, sessionStartTime, wordsReadThisSession, updateStats]);

  // Auto-save progress periodically while reading
  useEffect(() => {
    if (hasStarted && !isPlaying && words.length > 0 && currentIndex < words.length) {
      saveProgress();
    }
  }, [hasStarted, isPlaying, currentIndex, words.length, saveProgress]);

  const isFinished = hasStarted && currentIndex >= words.length;

  const renderWord = (word: string) => {
    if (!word) return null;
    return <span>{word}</span>;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-4">
      {!hasStarted && (
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
            Speed Reader
          </h1>
          <div className="flex gap-2">
            <Link href="/stats">
              <Button variant="outline" size="icon" className="h-10 w-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              </Button>
            </Link>
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
        </div>
      )}

      {!hasStarted ? (
        <div className="flex flex-col gap-4">
          {hasSavedProgress && (
            <div className="flex gap-2 p-3 bg-secondary rounded-lg">
              <p className="flex-1 text-sm">You have saved progress</p>
              <Button size="sm" onClick={loadProgress}>Resume</Button>
              <Button size="sm" variant="ghost" onClick={clearSavedProgress}>Dismiss</Button>
            </div>
          )}

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
            {words.length > 0
              ? `${words.length} words · ${estimateReadingTime(words.length, wpm)} at ${wpm} WPM`
              : "Enter text to begin"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center min-h-[180px] w-full">
            {isFinished ? (
              <p className="text-2xl text-muted-foreground">Done</p>
            ) : (
              <div className="relative w-full flex justify-center text-4xl sm:text-5xl font-bold" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
                {renderWord(currentWord)}
              </div>
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
                      setSessionStartTime(Date.now());
                      setWordsReadThisSession(0);
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

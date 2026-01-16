"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const STATS_KEY = "speed-reader-stats";

interface SessionStats {
  totalWordsRead: number;
  totalTimeSpent: number;
  sessionsCompleted: number;
  lastSession: number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StatsPage() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkMode = document.documentElement.classList.contains("dark") || prefersDark;
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);

    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      setStats(JSON.parse(saved));
    }
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
  };

  const clearStats = () => {
    localStorage.removeItem(STATS_KEY);
    setStats(null);
  };

  const avgWpm = stats && stats.totalTimeSpent > 0
    ? Math.round((stats.totalWordsRead / stats.totalTimeSpent) * 60)
    : 0;

  return (
    <main className="min-h-svh flex flex-col justify-center py-8">
      <div className="w-full max-w-xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
            Stats
          </h1>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="icon" className="h-10 w-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
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

        {stats ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Words Read</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
                  {stats.totalWordsRead.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
                  {formatTime(stats.totalTimeSpent)}
                </p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Sessions</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
                  {stats.sessionsCompleted}
                </p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Avg WPM</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>
                  {avgWpm}
                </p>
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Last Session</p>
              <p className="text-lg font-medium">
                {formatDate(stats.lastSession)}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={clearStats}
              className="w-full"
            >
              Clear Stats
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No reading stats yet</p>
            <Link href="/">
              <Button>Start Reading</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

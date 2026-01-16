import { NextResponse } from "next/server";

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
}

export interface HNStory {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  time: number;
  comments: number;
}

export async function GET() {
  try {
    // Fetch top story IDs
    const topStoriesRes = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!topStoriesRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch top stories" },
        { status: 500 }
      );
    }

    const storyIds: number[] = await topStoriesRes.json();
    const top10Ids = storyIds.slice(0, 10);

    // Fetch details for each story in parallel
    const storyPromises = top10Ids.map(async (id) => {
      const res = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        { next: { revalidate: 60 } }
      );
      return res.json() as Promise<HNItem>;
    });

    const stories = await Promise.all(storyPromises);

    // Filter to only stories with URLs (skip Ask HN, Show HN without links, etc.)
    const storiesWithUrls: HNStory[] = stories
      .filter((story) => story && story.url)
      .map((story) => ({
        id: story.id,
        title: story.title,
        url: story.url!,
        score: story.score,
        by: story.by,
        time: story.time,
        comments: story.descendants || 0,
      }));

    return NextResponse.json({ stories: storiesWithUrls });
  } catch (error) {
    console.error("Error fetching HN stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

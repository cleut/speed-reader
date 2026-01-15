import SpeedReader from "@/components/SpeedReader";

export default function Home() {
  return (
    <main className="min-h-svh flex flex-col justify-center py-8">
      <div className="text-center mb-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-faculty-glyphic)' }}>Speed Reader</h1>
        <p className="text-sm text-muted-foreground">
          RSVP — one word at a time, fixed position
        </p>
      </div>
      <SpeedReader />
    </main>
  );
}

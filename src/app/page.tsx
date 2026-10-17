import KatroGame from "@/components/KatroGame";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 py-6 flex flex-col items-center gap-6">
        <KatroGame />
        <section className="w-full max-w-3xl mt-2">
          <div
            className="w-full h-px"
            style={{ backgroundColor: "#6D4425" }}
          />
        </section>
        <footer className="mt-0 pb-2 w-full max-w-3xl flex items-center justify-between gap-4">
          <a
            href="https://lakabe.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm md:text-base tracking-wide transition-colors hover:opacity-80"
            style={{ color: "#6D4425" }}
          >
            LakaBe
          </a>
          <a
            href="https://zakaranda.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm md:text-base tracking-wide transition-colors hover:opacity-80"
            style={{ color: "#6D4425" }}
          >
            Mpanoratra
          </a>
        </footer>
      </main>
    </div>
  );
}

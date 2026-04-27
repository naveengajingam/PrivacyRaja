import { createFileRoute, Link } from "@tanstack/react-router";
import { SceneShell } from "@/components/SceneShell";
import { MughalFrame } from "@/components/MughalFrame";

export const Route = createFileRoute("/multiplayer-setup")({
  head: () => ({
    meta: [
      { title: "Multiplayer Setup — Privacy Raja" },
      { name: "description", content: "Create or join a Privacy Raja room, or play locally." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SceneShell>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <MughalFrame>
            <h1 className="text-gold-glow text-center font-display text-3xl md:text-4xl">
              Multiplayer Setup
            </h1>
            <p className="mt-4 text-center font-serif italic text-[var(--foreground)]/75">
              Create Online Room · Join with Code · Local Pass-and-Play
            </p>
            <p className="mt-8 text-center text-sm text-[var(--gold-soft)]/70">
              Coming in the next prompt.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/mode-select" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">← Back</Link>
              <Link to="/avatar-select" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">Skip →</Link>
            </div>
          </MughalFrame>
        </div>
      </main>
    </SceneShell>
  );
}

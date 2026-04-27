import { createFileRoute, Link } from "@tanstack/react-router";
import { SceneShell } from "@/components/SceneShell";
import { MughalFrame } from "@/components/MughalFrame";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "The Battlefield — Privacy Raja" },
      { name: "description", content: "Roll the fire-dice. Conquer the principles." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SceneShell>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <MughalFrame>
            <h1 className="text-gold-glow text-center font-display text-3xl md:text-4xl">
              The Battlefield
            </h1>
            <p className="mt-4 text-center font-serif italic text-[var(--foreground)]/75">
              The 3D board awaits its summoning.
            </p>
            <p className="mt-8 text-center text-sm text-[var(--gold-soft)]/70">
              Coming in a future prompt.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">← Hall</Link>
              <Link to="/result" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">Preview Result →</Link>
            </div>
          </MughalFrame>
        </div>
      </main>
    </SceneShell>
  );
}

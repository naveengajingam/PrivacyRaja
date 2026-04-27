import { createFileRoute, Link } from "@tanstack/react-router";
import { SceneShell } from "@/components/SceneShell";
import { MughalFrame } from "@/components/MughalFrame";

export const Route = createFileRoute("/avatar-select")({
  head: () => ({
    meta: [
      { title: "Choose Your Element — Privacy Raja" },
      { name: "description", content: "Pick one of the five Pancha Mahabhuta avatars." },
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
              Choose Your Element
            </h1>
            <p className="mt-4 text-center font-serif italic text-[var(--foreground)]/75">
              Pancha Mahabhuta — Earth · Water · Fire · Air · Ether
            </p>
            <p className="mt-8 text-center text-sm text-[var(--gold-soft)]/70">
              Coming in the next prompt.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/mode-select" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">← Back</Link>
              <Link to="/lobby" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">To Lobby →</Link>
            </div>
          </MughalFrame>
        </div>
      </main>
    </SceneShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { SceneShell } from "@/components/SceneShell";
import { MughalFrame } from "@/components/MughalFrame";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Verdict of the Realm — Privacy Raja" },
      { name: "description", content: "Who shall be crowned Privacy Raja?" },
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
              Verdict of the Realm
            </h1>
            <p className="mt-4 text-center font-serif italic text-[var(--foreground)]/75">
              The crown awaits.
            </p>
            <p className="mt-8 text-center text-sm text-[var(--gold-soft)]/70">
              Coming soon.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/" className="text-xs uppercase tracking-[0.4em] text-[var(--gold-soft)]/70 hover:text-[var(--gold)]">← Back to Hall</Link>
            </div>
          </MughalFrame>
        </div>
      </main>
    </SceneShell>
  );
}

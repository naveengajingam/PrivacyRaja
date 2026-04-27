import type { ReactNode } from "react";
import { EmberField } from "./EmberField";
import { AshokaChakra } from "./AshokaChakra";

interface Props {
  children: ReactNode;
  showFrame?: boolean;
}

/**
 * Shared atmospheric layout: dark heritage backdrop, ember particles,
 * and a watermark Ashoka Chakra in the corner.
 */
export function SceneShell({ children }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Backdrop layered glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, oklch(0.5 0.16 145 / 0.18), transparent 50%)," +
            "radial-gradient(ellipse at 80% 90%, oklch(0.748 0.171 55 / 0.22), transparent 55%)",
        }}
      />

      {/* Ashoka Chakra watermark, bottom-right */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 text-[var(--gold)]/15">
        <div className="animate-chakra-spin">
          <AshokaChakra size={520} strokeOpacity={0.7} />
        </div>
      </div>

      {/* Ember particles */}
      <EmberField count={70} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

import type { SVGProps } from "react";

/**
 * Credence-inspired geometric LATCH mark:
 * - 40x40 viewBox
 * - Dual-stroke architecture:
 *   - Outer protective boundary curve in luminous brand light green (stroke="var(--signal)")
 *   - Inner interlocking LATCH / "L" glyph in stroke="currentColor"
 * - strokeWidth="4", strokeLinecap="round", strokeLinejoin="round"
 */
export function LatchMark({
  className = "size-9 shrink-0",
  strokeWidth = 4,
  ...props
}: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Outer brand light-green arc / latch shield */}
      <path
        d="M31 9A15 15 0 1 0 31 31"
        stroke="var(--signal, #4efa94)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Inner interlocking L-latch hook */}
      <path
        d="M19 14v12h10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LatchLogo({
  badge,
  className = "flex items-center gap-2.5",
}: {
  badge?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-foreground">
        <LatchMark className="size-8 shrink-0" />
        <span>LATCH</span>
      </span>
      {badge && (
        <span className="hidden md:inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          {badge}
        </span>
      )}
    </div>
  );
}

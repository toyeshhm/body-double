/** A four-point gold sparkle (currentColor), for glints on glass and paper. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-13 -13 26 26" className={className} aria-hidden="true">
      <path d="M0,-13C2,-2 2,-2 13,0C2,2 2,2 0,13C-2,2 -2,2 -13,0C-2,-2 -2,-2 0,-13Z" fill="currentColor" />
    </svg>
  );
}

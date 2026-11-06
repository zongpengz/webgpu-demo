export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg aria-hidden="true" className={className}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function IconDefinitions() {
  return (
    <svg className="svg-defs" aria-hidden="true">
      <defs>
        <symbol id="i-cube" viewBox="0 0 24 24">
          <path d="m12 2 9 5v10l-9 5-9-5V7Z" />
          <path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5" />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </symbol>
        <symbol id="i-ship" viewBox="0 0 24 24">
          <path d="m12 3 8 16-8-4-8 4Z" />
          <path d="M10 19v2m4-2v2" />
        </symbol>
        <symbol id="i-grid" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </symbol>
        <symbol id="i-orbit" viewBox="0 0 24 24">
          <ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-40 12 12)" />
          <circle cx="12" cy="12" r="3" />
          <path d="m18 3 2-1 1 2" />
        </symbol>
        <symbol id="i-code" viewBox="0 0 24 24">
          <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-13-2 20" />
        </symbol>
        <symbol id="i-expand" viewBox="0 0 24 24">
          <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
        </symbol>
        <symbol id="i-reset" viewBox="0 0 24 24">
          <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
        </symbol>
        <symbol id="i-sound" viewBox="0 0 24 24">
          <path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </symbol>
        <symbol id="i-pause" viewBox="0 0 24 24">
          <path d="M8 5v14M16 5v14" />
        </symbol>
        <symbol id="i-book" viewBox="0 0 24 24">
          <path d="M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2Z" />
        </symbol>
        <symbol id="i-chip" viewBox="0 0 24 24">
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" />
        </symbol>
      </defs>
    </svg>
  );
}

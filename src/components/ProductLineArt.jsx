const baseProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'var(--text-primary)',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

const icons = {
  rosette: (
    <>
      <path d="M32 7c4 10 4 17 0 25C28 24 28 17 32 7Z" />
      <path d="M32 57c-4-10-4-17 0-25 4 8 4 15 0 25Z" />
      <path d="M7 32c10-4 17-4 25 0-8 4-15 4-25 0Z" />
      <path d="M57 32c-10 4-17 4-25 0 8-4 15-4 25 0Z" />
      <path d="M15 15c10 3 16 7 17 17-10-1-14-7-17-17Z" />
      <path d="M49 49c-10-3-16-7-17-17 10 1 14 7 17 17Z" />
      <path d="M49 15c-3 10-7 16-17 17 1-10 7-14 17-17Z" />
      <path d="M15 49c3-10 7-16 17-17-1 10-7 14-17 17Z" />
      <circle cx="32" cy="32" r="5" />
    </>
  ),
  water: (
    <>
      <path d="M19 31h19c5 0 9 4 9 9s-4 9-9 9H19V31Z" />
      <path d="M19 35h-6c-4 0-7 3-7 7s3 7 7 7h6" />
      <path d="M47 38h5c3 0 5-2 5-5s-2-5-5-5h-6" />
      <path d="M25 31V19c0-4 3-7 7-7s7 3 7 7v12" />
      <path d="M32 16v15" />
      <path d="M17 53h23" />
    </>
  ),
  sun: (
    <>
      <circle cx="32" cy="32" r="11" />
      <path d="M32 5v9" />
      <path d="M32 50v9" />
      <path d="M5 32h9" />
      <path d="M50 32h9" />
      <path d="m13 13 6 6" />
      <path d="m45 45 6 6" />
      <path d="m51 13-6 6" />
      <path d="m19 45-6 6" />
    </>
  ),
  package: (
    <>
      <path d="M10 21 32 9l22 12-22 12L10 21Z" />
      <path d="M10 21v24l22 12 22-12V21" />
      <path d="M32 33v24" />
      <path d="m21 15 22 12" />
      <path d="m43 15-22 12" />
    </>
  ),
  placement: (
    <>
      <path d="M12 9h40v31H12z" />
      <path d="M32 9v31" />
      <path d="M12 25h40" />
      <path d="M22 55h20" />
      <path d="M24 40h16l-3 15H27l-3-15Z" />
      <path d="M27 40c0-6 10-6 10 0" />
    </>
  ),
  soil: (
    <>
      <path d="M14 25h36l-5 26H19l-5-26Z" />
      <path d="M18 25c3-7 9-11 14-11s11 4 14 11" />
      <path d="M32 14v31" />
      <path d="M32 34c-8-3-13-8-15-16" />
      <path d="M32 34c8-3 13-8 15-16" />
      <path d="M24 45h16" />
    </>
  ),
  season: (
    <>
      <path d="M14 13h36v38H14z" />
      <path d="M14 23h36" />
      <path d="M23 9v8" />
      <path d="M41 9v8" />
      <path d="M23 34h18" />
      <path d="M23 42h10" />
      <path d="M42 36c5 1 8 4 8 8" />
      <path d="M45 43c-4 0-7 2-9 5" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 48c22 3 39-11 42-37-25 2-42 16-42 37Z" />
      <path d="M12 48c12-14 24-23 39-34" />
      <path d="M25 38c-1-6-4-11-9-15" />
      <path d="M35 29c-1-6-3-10-7-14" />
      <path d="M35 29c6 1 11 3 15 6" />
    </>
  ),
  roots: (
    <>
      <path d="M32 8v18" />
      <path d="M22 26h20" />
      <path d="M32 26v30" />
      <path d="M32 38c-8 0-13-4-17-10" />
      <path d="M32 40c8 0 13-4 17-10" />
      <path d="M32 48c-5 0-9 2-13 7" />
      <path d="M32 48c5 0 9 2 13 7" />
      <path d="M26 18c-5-1-9-4-12-9" />
      <path d="M38 18c5-1 9-4 12-9" />
    </>
  ),
};

export default function ProductLineArt({ name = 'rosette', className = 'h-6 w-6' }) {
  return (
    <svg {...baseProps} className={className}>
      {icons[name] || icons.rosette}
    </svg>
  );
}

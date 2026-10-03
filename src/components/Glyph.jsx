const PATHS = {
  eye: (
    <>
      <path d="M2.5 12c2.6-4.4 5.8-6.6 9.5-6.6s6.9 2.2 9.5 6.6c-2.6 4.4-5.8 6.6-9.5 6.6S5.1 16.4 2.5 12z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  brain: (
    <>
      <circle cx="6" cy="7" r="2" /><circle cx="18" cy="7" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="12" cy="11" r="1.6" />
      <path d="M7.7 8.1l2.9 2M16.3 8.1l-2.9 2M12 12.6V16M8 7h8M7 8.8l4 7.6M17 8.8l-4 7.6" />
    </>
  ),
  joint: (
    <>
      <path d="M4 20l5.5-7.5M12.2 10.2L19 5" />
      <circle cx="11" cy="11.4" r="2.6" /><circle cx="4" cy="20" r="1.4" /><path d="M17.5 3.5l3 3M19 5l1.8-0.6" />
    </>
  ),
  hands: (
    <>
      <circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" />
      <path d="M12 7.6v8.8" />
    </>
  ),
  signal: (
    <>
      <circle cx="12" cy="17" r="1.6" />
      <path d="M8.2 13.4a5.4 5.4 0 017.6 0M5.2 10.4a9.6 9.6 0 0113.6 0M2.4 7.4a13.6 13.6 0 0119.2 0" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5l8.5 4.6-8.5 4.6-8.5-4.6z" />
      <path d="M3.5 12.1l8.5 4.6 8.5-4.6M3.5 16l8.5 4.6 8.5-4.6" />
    </>
  ),
};

export default function Glyph({ name, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

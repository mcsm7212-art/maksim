const P: Record<string, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tool: '<path d="M14.5 4.5a4 4 0 0 0 5 5L11 18a2.1 2.1 0 0 1-3-3zM6 21l2-2"/>',
  spark: '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  drop: '<path d="M12 3C9 7.5 6.5 10.5 6.5 14a5.5 5.5 0 0 0 11 0C17.5 10.5 15 7.5 12 3Z"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  ne: '<path d="M7 17L17 7M9 7h8v8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  siren: '<path d="M6 18v-5a6 6 0 0 1 12 0v5M4 18h16M12 3v2M4.5 6l1.4 1.4M19.5 6l-1.4 1.4"/>',
};
export default function Icon({ name, size = 20, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden dangerouslySetInnerHTML={{ __html: P[name] ?? '' }} />;
}

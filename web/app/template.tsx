// Re-mounts on every page change: the new page fades in softly.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pagefade">{children}</div>;
}

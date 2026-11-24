/** "What happens next": three short steps with a mark on where the person is now. */
export default function NextSteps({ steps, now, tr }: { steps: string[]; now: number; tr: (s: string) => string }) {
  return (
    <ol className="next-steps" aria-label={tr('What happens next')}>
      {steps.map((s, i) => (
        <li key={s} className={i < now ? 'done' : i === now ? 'now' : ''} aria-current={i === now ? 'step' : undefined}>
          <i aria-hidden>{i < now ? '✓' : i + 1}</i><span>{tr(s)}{i === now && <small>{tr('You are here')}</small>}</span>
        </li>))}
    </ol>
  );
}

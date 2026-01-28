export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-8">
      <div className="animate-pulse text-sm text-[color:var(--color-muted-foreground)]">{label}</div>
    </div>
  );
}

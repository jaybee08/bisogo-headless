export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-8 text-center">
      <div className="text-sm font-semibold">{title}</div>
      {description ? <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{description}</div> : null}
    </div>
  );
}

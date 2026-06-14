export function ErrorBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="shrink-0 border-t bg-destructive/10 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-destructive">
        {title}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-destructive/90">{detail}</p>
    </div>
  );
}

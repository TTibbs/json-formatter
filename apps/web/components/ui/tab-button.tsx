export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded px-2 py-0.5 text-xs bg-accent text-accent-foreground"
          : "rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-accent-foreground"
      }
    >
      {children}
    </button>
  );
}

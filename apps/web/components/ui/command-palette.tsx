"use client";

import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CommandPaletteItem = {
  id: string;
  label: string;
  subtitle?: string;
  /** Extra tokens included in cmdk fuzzy matching */
  keywords?: string;
  /** When set, selecting the row navigates with the app router */
  href?: string;
  disabled?: boolean;
};

export type CommandPaletteGroup = {
  heading: string;
  items: CommandPaletteItem[];
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandPaletteGroup[];
  /**
   * Which group headings to render, in order. Defaults to first-seen order
   * of headings in `groups`.
   */
  groupOrder?: string[];
  title?: string;
  description?: string;
  placeholder?: string;
  emptyMessage?: string;
  /** Fires for items without `href` (and after close when `href` is used) */
  onItemSelect?: (item: CommandPaletteItem) => void;
  className?: string;
};

function itemSearchValue(item: CommandPaletteItem) {
  return [item.id, item.label, item.subtitle, item.keywords, item.href]
    .filter(Boolean)
    .join(" ");
}

function defaultGroupOrder(groups: CommandPaletteGroup[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) {
    if (seen.has(g.heading)) continue;
    seen.add(g.heading);
    out.push(g.heading);
  }
  return out;
}

export function CommandPalette({
  open,
  onOpenChange,
  groups,
  groupOrder,
  title = "Command palette",
  description = "Search for a command",
  placeholder = "Type a command or search…",
  emptyMessage = "No results found.",
  onItemSelect,
  className,
}: CommandPaletteProps) {
  const router = useRouter();
  const order = groupOrder ?? defaultGroupOrder(groups);

  const selectItem = (item: CommandPaletteItem) => {
    if (item.disabled) return;
    onOpenChange(false);
    if (item.href) {
      router.push(item.href);
      return;
    }
    onItemSelect?.(item);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn("overflow-hidden p-0", className)}>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {order.map((heading, orderIndex) => {
              const group = groups.find((g) => g.heading === heading);
              if (!group?.items.length) return null;
              return (
                <CommandGroup key={`${heading}-${orderIndex}`} heading={heading}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={`${heading}-${item.id}`}
                      value={itemSearchValue(item)}
                      disabled={item.disabled}
                      onSelect={() => selectItem(item)}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.subtitle ? (
                        <span className="ml-2 truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

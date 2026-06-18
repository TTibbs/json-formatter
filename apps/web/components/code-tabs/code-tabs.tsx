"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MorphTabs } from "@/components/ui/morph-tabs";
import { CodeBlock } from "@/components/ui/code-block";
import {
  DEFAULT_PACKAGE_MANAGERS,
  type CodeTab,
  type CodeTabsProps,
  type PackageManager,
} from "./types";

const PACKAGE_MANAGER_COMMANDS: Record<
  PackageManager,
  { install: (spec: string) => string; shadcnAdd: (target: string) => string }
> = {
  npm: {
    install: (spec) => `npm install ${spec}`,
    shadcnAdd: (target) => `npx shadcn@latest add ${target}`,
  },
  pnpm: {
    install: (spec) => `pnpm add ${spec}`,
    shadcnAdd: (target) => `pnpm dlx shadcn@latest add ${target}`,
  },
  yarn: {
    install: (spec) => `yarn add ${spec}`,
    shadcnAdd: (target) => `yarn dlx shadcn@latest add ${target}`,
  },
  bun: {
    install: (spec) => `bun add ${spec}`,
    shadcnAdd: (target) => `bunx shadcn@latest add ${target}`,
  },
};

export function createInstallTabs(
  packageSpec: string,
  managers: PackageManager[] = DEFAULT_PACKAGE_MANAGERS,
): CodeTab[] {
  return managers.map((manager) => ({
    id: manager,
    label: manager,
    code: PACKAGE_MANAGER_COMMANDS[manager].install(packageSpec),
    language: "bash",
    showLineNumbers: false,
  }));
}

export function createShadcnAddTabs(
  target: string,
  managers: PackageManager[] = DEFAULT_PACKAGE_MANAGERS,
): CodeTab[] {
  return managers.map((manager) => ({
    id: manager,
    label: manager,
    code: PACKAGE_MANAGER_COMMANDS[manager].shadcnAdd(target),
    language: "bash",
    showLineNumbers: false,
  }));
}

function resolveDefaultLabel(tabs: CodeTab[], defaultTab?: string): string {
  if (defaultTab) {
    const match = tabs.find((tab) => tab.id === defaultTab);
    if (match) return match.label;
  }
  return tabs[0]!.label;
}

export function CodeTabs({
  tabs,
  defaultTab,
  className,
  tabsListClassName,
  contentClassName,
  collapsible = false,
}: CodeTabsProps) {
  const [collapseResetKey, setCollapseResetKey] = useState(0);

  if (tabs.length === 0) {
    return null;
  }

  const morphTabLabels = tabs.map((tab) => tab.label);
  const panels = Object.fromEntries(
    tabs.map((tab) => [
      tab.label,
      <div key={tab.id} className={cn("text-left", contentClassName)}>
        <CodeBlock
          code={tab.code}
          language={tab.language ?? "bash"}
          filename={tab.filename}
          showLineNumbers={tab.showLineNumbers ?? false}
          collapsible={collapsible}
          collapseResetKey={collapseResetKey}
        />
      </div>,
    ]),
  );

  return (
    <MorphTabs
      tabs={morphTabLabels}
      defaultActive={resolveDefaultLabel(tabs, defaultTab)}
      onActiveChange={() => setCollapseResetKey((key) => key + 1)}
      className={cn("w-full", className, tabsListClassName)}
      panelClassName="border-0 bg-transparent p-0"
      glow={false}
      panels={panels}
    />
  );
}

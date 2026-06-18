export type CodeTab = {
  id: string;
  label: string;
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
};

export type CodeTabsProps = {
  tabs: CodeTab[];
  defaultTab?: string;
  className?: string;
  tabsListClassName?: string;
  contentClassName?: string;
  collapsible?: boolean;
};

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const DEFAULT_PACKAGE_MANAGERS: PackageManager[] = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
];

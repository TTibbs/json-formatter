"use client";

import { useEffect, useMemo } from "react";
import {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
} from "@/components/ui/command-palette";
import { HELP_SECTIONS, type HelpExample } from "@/components/help-dialog";
import { TEMPLATES, type Template } from "@/lib/templates";

type EditorMode = "builder" | "dsl";

export interface WorkbenchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorMode: EditorMode;
  onUseTemplate: (template: Template) => void;
  onTryExample: (example: HelpExample) => void;
  onSwitchMode: (mode: EditorMode) => void;
  onLoadInputSample: () => void;
  onLoadDslSample: () => void;
  onOpenTemplates: () => void;
  onOpenHelp: () => void;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function templateKeywords(template: Template) {
  const parts = [
    template.id,
    template.name,
    template.category,
    template.description,
  ];
  const arrow = template.name.split(" -> ");
  if (arrow.length === 2) {
    parts.push(arrow[0], arrow[1]);
  }
  return parts.join(" ");
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function WorkbenchCommandPalette({
  open,
  onOpenChange,
  editorMode,
  onUseTemplate,
  onTryExample,
  onSwitchMode,
  onLoadInputSample,
  onLoadDslSample,
  onOpenTemplates,
  onOpenHelp,
}: WorkbenchCommandPaletteProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "k") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      onOpenChange(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  const groups = useMemo((): CommandPaletteGroup[] => {
    const templateItems: CommandPaletteItem[] = TEMPLATES.map((template) => ({
      id: `template:${template.id}`,
      label: template.name,
      subtitle: template.category,
      keywords: templateKeywords(template),
    }));

    const actionItems: CommandPaletteItem[] = [
      {
        id: "action:switch-builder",
        label: "Switch to Builder",
        keywords: "builder visual editor mode",
        disabled: editorMode === "builder",
      },
      {
        id: "action:switch-dsl",
        label: "Switch to DSL",
        keywords: "dsl json code editor mode",
        disabled: editorMode === "dsl",
      },
      {
        id: "action:load-input-sample",
        label: "Load input sample",
        keywords: "sample input json load",
      },
      {
        id: "action:load-dsl-sample",
        label: "Load transform sample",
        keywords: "sample dsl transform load",
      },
      {
        id: "action:open-templates",
        label: "Browse templates",
        keywords: "templates gallery shopify stripe",
      },
      {
        id: "action:open-help",
        label: "Open help",
        keywords: "help documentation guide",
      },
    ];

    const exampleItems: CommandPaletteItem[] = HELP_SECTIONS.map((section) => ({
      id: `example:${slugify(section.title)}`,
      label: section.title,
      subtitle: section.description,
      keywords: `${section.title} ${section.description}`,
    }));

    return [
      { heading: "Templates", items: templateItems },
      { heading: "Actions", items: actionItems },
      { heading: "Help examples", items: exampleItems },
    ];
  }, [editorMode]);

  function handleItemSelect(item: CommandPaletteItem) {
    if (item.id.startsWith("template:")) {
      const templateId = item.id.slice("template:".length);
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (template) onUseTemplate(template);
      return;
    }

    if (item.id.startsWith("example:")) {
      const slug = item.id.slice("example:".length);
      const section = HELP_SECTIONS.find((s) => slugify(s.title) === slug);
      if (section) onTryExample(section.example);
      return;
    }

    switch (item.id) {
      case "action:switch-builder":
        onSwitchMode("builder");
        break;
      case "action:switch-dsl":
        onSwitchMode("dsl");
        break;
      case "action:load-input-sample":
        onLoadInputSample();
        break;
      case "action:load-dsl-sample":
        onLoadDslSample();
        break;
      case "action:open-templates":
        onOpenTemplates();
        break;
      case "action:open-help":
        onOpenHelp();
        break;
    }
  }

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      groups={groups}
      groupOrder={["Templates", "Actions", "Help examples"]}
      title="Command palette"
      description="Search templates, actions, and help examples"
      placeholder="Search templates, actions, help…"
      className="max-w-lg"
      onItemSelect={handleItemSelect}
    />
  );
}

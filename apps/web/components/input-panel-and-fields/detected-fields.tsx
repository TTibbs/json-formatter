"use client";

import { useMemo, useState } from "react";
import { inferFields } from "@json-transformer/core";
import { ChevronRight, File, Plus } from "lucide-react";
import { FileTree } from "@/components/ui/file-tree";
import {
  fieldNodesToFileTree,
  fieldTypeLabel,
  isFieldNodeMeta,
  mappingFor,
  type FieldMapping,
} from "@/lib/field-mapping";
import { cn } from "@/lib/utils";

const expandTransition = "duration-300 ease-in-out motion-reduce:transition-none";

interface DetectedFieldsProps {
  parsedInput: unknown;
  onMapField: (mapping: FieldMapping) => void;
}

export function DetectedFields({
  parsedInput,
  onMapField,
}: DetectedFieldsProps) {
  const [open, setOpen] = useState(true);

  const detectedFields = useMemo(() => inferFields(parsedInput), [parsedInput]);

  const detectedFieldTreeData = useMemo(
    () => fieldNodesToFileTree(detectedFields),
    [detectedFields],
  );

  if (detectedFields.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-t",
        open && "max-h-[45%]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full shrink-0 items-center gap-1 border-b px-3 py-1.5 text-left transition-colors hover:bg-accent/50"
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 origin-center text-muted-foreground transition-transform",
            expandTransition,
            open ? "rotate-90" : "rotate-0",
          )}
          aria-hidden
        />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Detected fields
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows]",
          expandTransition,
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          aria-hidden={!open}
          className={cn(
            "min-h-0 overflow-hidden transition-opacity",
            expandTransition,
            open ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="min-h-0 overflow-auto">
            <FileTree
              data={detectedFieldTreeData}
              variant="ghost"
              size="sm"
              defaultExpanded={true}
              aria-label="Detected fields"
              className="px-2 py-1.5"
              getIcon={(node) =>
                node.type === "file" ? (
                  <File className="size-3 shrink-0 text-muted-foreground" />
                ) : null
              }
              renderTrailing={(node) => {
                if (!isFieldNodeMeta(node.meta)) return null;
                const { fieldNode, arrayContext } = node.meta;
                const mapping = mappingFor(fieldNode, arrayContext);

                return (
                  <>
                    <span className="rounded bg-muted px-1 py-px text-[9px] uppercase tracking-wide text-muted-foreground/80">
                      {fieldTypeLabel(fieldNode)}
                    </span>
                    {mapping ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMapField(mapping);
                        }}
                        title={
                          mapping.operation === "map"
                            ? `Map array ${mapping.source}${mapping.select ? ` -> ${mapping.select}` : ""}`
                            : `Map field ${mapping.source}`
                        }
                        className="ml-auto hidden items-center gap-0.5 rounded border px-1 py-px text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground group-hover:flex"
                      >
                        <Plus className="size-2.5" />
                        map
                      </button>
                    ) : null}
                  </>
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

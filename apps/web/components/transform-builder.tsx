"use client";

import { useId } from "react";
import { ArrowDown, ArrowUp, CircleAlert, Plus, Trash2, X } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import {
  newRow,
  type BuilderOperation,
  type BuilderRow,
  type ConditionComparator,
} from "@/lib/builder";
import type { PathSuggestion } from "@/lib/json-paths";

const OPERATIONS: { value: BuilderOperation; label: string }[] = [
  { value: "path", label: "Map field" },
  { value: "expression", label: "Compute" },
  { value: "map", label: "Map array" },
  { value: "concat", label: "Concat" },
  { value: "condition", label: "If / Else" },
  { value: "literal", label: "Fixed value" },
];

const COMPARATORS: { value: ConditionComparator; label: string }[] = [
  { value: "==", label: "equals" },
  { value: "!=", label: "not equals" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: "truthy", label: "is true" },
  { value: "falsy", label: "is false" },
];

interface TransformBuilderProps {
  rows: BuilderRow[];
  paths: PathSuggestion[];
  /** Item-relative field suggestions per array source path. */
  itemFields: (arrayPath: string) => string[];
  /** Warning messages grouped by output field key. */
  rowErrors?: Record<string, string[]>;
  onChange: (rows: BuilderRow[]) => void;
}

export function TransformBuilder({
  rows,
  paths,
  itemFields,
  rowErrors = {},
  onChange,
}: TransformBuilderProps) {
  const listId = useId();
  const valuePathsId = `${listId}-value-paths`;
  const arrayPathsId = `${listId}-array-paths`;

  const valuePaths = paths.filter((p) => p.kind === "value");
  const arrayPaths = paths.filter((p) => p.kind === "array");

  function updateRow(id: string, patch: Partial<BuilderRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function moveRow(id: string, dir: -1 | 1) {
    const index = rows.findIndex((r) => r.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <datalist id={valuePathsId}>
        {valuePaths.map((p) => (
          <option key={p.path} value={p.path} />
        ))}
      </datalist>
      <datalist id={arrayPathsId}>
        {arrayPaths.map((p) => (
          <option key={p.path} value={p.path} />
        ))}
      </datalist>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {rows.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground/70">
            No output fields yet. Add one below to start shaping your output.
          </p>
        )}

        {rows.map((row, i) => {
          const errors = rowErrors[row.outputKey.trim()] ?? [];
          return (
            <div
              key={row.id}
              className={`rounded-lg border bg-card/40 p-2 ${
                errors.length > 0 ? "border-amber-500/40" : ""
              }`}
            >
              <div className="flex items-center gap-1.5">
                <input
                  value={row.outputKey}
                  onChange={(e) =>
                    updateRow(row.id, { outputKey: e.target.value })
                  }
                  placeholder="outputField"
                  spellCheck={false}
                  className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
                />
                <select
                  value={row.operation}
                  onChange={(e) =>
                    updateRow(row.id, {
                      operation: e.target.value as BuilderOperation,
                    })
                  }
                  className="rounded-md border bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:border-ring"
                >
                  {OPERATIONS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <ActionMenu
                  triggerLabel="Field actions"
                  triggerClassName="size-7 rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  actions={[
                    {
                      id: "move-up",
                      label: "Move up",
                      icon: <ArrowUp className="size-3.5" />,
                      disabled: i === 0,
                      onSelect: () => moveRow(row.id, -1),
                    },
                    {
                      id: "move-down",
                      label: "Move down",
                      icon: <ArrowDown className="size-3.5" />,
                      disabled: i === rows.length - 1,
                      onSelect: () => moveRow(row.id, 1),
                    },
                    { type: "separator" },
                    {
                      id: "remove",
                      label: "Remove field",
                      icon: <Trash2 className="size-3.5" />,
                      variant: "destructive",
                      onSelect: () => removeRow(row.id),
                    },
                  ]}
                />
              </div>

              <div className="mt-1.5 flex items-center gap-1.5">
                {row.operation === "path" && (
                  <ParamInput
                    value={row.source}
                    onChange={(source) => updateRow(row.id, { source })}
                    placeholder="user.name"
                    list={valuePathsId}
                  />
                )}

                {row.operation === "expression" && (
                  <ParamInput
                    value={row.source}
                    onChange={(source) => updateRow(row.id, { source })}
                    placeholder="$user.first + ' ' + $user.last"
                  />
                )}

                {row.operation === "map" && (
                  <>
                    <ParamInput
                      value={row.source}
                      onChange={(source) => updateRow(row.id, { source })}
                      placeholder="users"
                      list={arrayPathsId}
                    />
                    <span className="text-xs text-muted-foreground/70">
                      [].
                    </span>
                    <MapSelectInput
                      row={row}
                      fields={itemFields(row.source)}
                      onChange={(select) => updateRow(row.id, { select })}
                    />
                  </>
                )}

                {row.operation === "literal" && (
                  <ParamInput
                    value={row.value}
                    onChange={(value) => updateRow(row.id, { value })}
                    placeholder="e.g. api, 42, true"
                  />
                )}

                {row.operation === "concat" && (
                  <ConcatParams
                    row={row}
                    listId={valuePathsId}
                    onChange={(patch) => updateRow(row.id, patch)}
                  />
                )}

                {row.operation === "condition" && (
                  <ConditionParams
                    row={row}
                    listId={valuePathsId}
                    onChange={(patch) => updateRow(row.id, patch)}
                  />
                )}
              </div>

              {errors.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {errors.map((message, j) => (
                    <p
                      key={j}
                      className="flex items-start gap-1 text-[11px] text-amber-500"
                    >
                      <CircleAlert className="mt-px size-3 shrink-0" />
                      {message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => onChange([...rows, newRow()])}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="size-3" />
          Add output field
        </button>
      </div>
    </div>
  );
}

function ParamInput({
  value,
  onChange,
  placeholder,
  list,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  list?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      list={list}
      spellCheck={false}
      className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
    />
  );
}

function MapSelectInput({
  row,
  fields,
  onChange,
}: {
  row: BuilderRow;
  fields: string[];
  onChange: (select: string) => void;
}) {
  const id = useId();
  return (
    <>
      <datalist id={id}>
        {fields.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <input
        value={row.select}
        onChange={(e) => onChange(e.target.value)}
        placeholder="email (empty = whole item)"
        list={id}
        spellCheck={false}
        className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
      />
    </>
  );
}

function ConcatParams({
  row,
  listId,
  onChange,
}: {
  row: BuilderRow;
  listId: string;
  onChange: (patch: Partial<BuilderRow>) => void;
}) {
  function setPart(index: number, value: string) {
    const parts = [...row.parts];
    parts[index] = value;
    onChange({ parts });
  }

  function removePart(index: number) {
    onChange({ parts: row.parts.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      {row.parts.map((part, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-10 text-right text-[10px] text-muted-foreground/70">
            {i === 0 ? "join" : "with"}
          </span>
          <input
            value={part}
            onChange={(e) => setPart(i, e.target.value)}
            placeholder="user.first"
            list={listId}
            spellCheck={false}
            className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
          />
          {row.parts.length > 2 && (
            <IconButton label="Remove field" onClick={() => removePart(i)}>
              <X className="size-3" />
            </IconButton>
          )}
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-10" />
        <button
          type="button"
          onClick={() => onChange({ parts: [...row.parts, ""] })}
          className="flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="size-2.5" />
          field
        </button>
        <span className="ml-2 text-[10px] text-muted-foreground/70">
          separator
        </span>
        <input
          value={row.separator}
          onChange={(e) => onChange({ separator: e.target.value })}
          placeholder="(space)"
          spellCheck={false}
          className="w-20 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
        />
      </div>
    </div>
  );
}

function ConditionParams({
  row,
  listId,
  onChange,
}: {
  row: BuilderRow;
  listId: string;
  onChange: (patch: Partial<BuilderRow>) => void;
}) {
  const needsValue = row.condOp !== "truthy" && row.condOp !== "falsy";

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-10 text-right text-[10px] text-muted-foreground/70">
          if
        </span>
        <input
          value={row.condField}
          onChange={(e) => onChange({ condField: e.target.value })}
          placeholder="user.age"
          list={listId}
          spellCheck={false}
          className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
        />
        <select
          value={row.condOp}
          onChange={(e) =>
            onChange({ condOp: e.target.value as ConditionComparator })
          }
          className="rounded-md border bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:border-ring"
        >
          {COMPARATORS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {needsValue && (
          <input
            value={row.condValue}
            onChange={(e) => onChange({ condValue: e.target.value })}
            placeholder="18"
            spellCheck={false}
            className="w-24 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
          />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-10 text-right text-[10px] text-muted-foreground/70">
          then
        </span>
        <input
          value={row.thenValue}
          onChange={(e) => onChange({ thenValue: e.target.value })}
          placeholder="value or path (user.name)"
          list={listId}
          spellCheck={false}
          className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-10 text-right text-[10px] text-muted-foreground/70">
          else
        </span>
        <input
          value={row.elseValue}
          onChange={(e) => onChange({ elseValue: e.target.value })}
          placeholder="value or path"
          list={listId}
          spellCheck={false}
          className="w-0 min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring"
        />
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileJson,
  Image,
  FileType,
  Cog,
  Package,
} from "lucide-react";

export interface FileTreeNode {
  name: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
  meta?: unknown;
}

const fileTreeVariants = cva("font-mono text-sm select-none p-1", {
  variants: {
    variant: {
      default: "bg-background text-foreground",
      ghost: "bg-transparent",
      bordered: "bg-background border border-border rounded-lg p-2",
      elevated: "bg-card text-card-foreground shadow-md rounded-lg p-3",
    },
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const fileTreeItemVariants = cva(
  "flex items-center gap-2 py-0.5 px-1.5 rounded-sm cursor-pointer transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent/50",
        bordered: "hover:bg-accent hover:text-accent-foreground",
        elevated: "hover:bg-accent hover:text-accent-foreground",
      },
      state: {
        default: "",
        selected: "bg-accent text-accent-foreground",
        active: "bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
      state: "default",
    },
  },
);

const treeExpandTransition =
  "duration-300 ease-in-out motion-reduce:transition-none";

const getFileIcon = (filename: string, size: "sm" | "default" | "lg") => {
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const iconClass = "shrink-0";

  const ext = filename.split(".").pop()?.toLowerCase();

  const iconMap: Record<string, React.ReactNode> = {
    // JavaScript/TypeScript
    js: (
      <FileCode className={cn(iconClass, "text-yellow-500")} size={iconSize} />
    ),
    jsx: (
      <FileCode className={cn(iconClass, "text-yellow-500")} size={iconSize} />
    ),
    ts: <FileCode className={cn(iconClass, "text-blue-500")} size={iconSize} />,
    tsx: (
      <FileCode className={cn(iconClass, "text-blue-500")} size={iconSize} />
    ),
    // Web
    html: (
      <FileCode className={cn(iconClass, "text-orange-500")} size={iconSize} />
    ),
    css: (
      <FileCode className={cn(iconClass, "text-blue-400")} size={iconSize} />
    ),
    scss: (
      <FileCode className={cn(iconClass, "text-pink-400")} size={iconSize} />
    ),
    // Data
    json: (
      <FileJson className={cn(iconClass, "text-yellow-600")} size={iconSize} />
    ),
    yaml: (
      <FileText className={cn(iconClass, "text-red-400")} size={iconSize} />
    ),
    yml: <FileText className={cn(iconClass, "text-red-400")} size={iconSize} />,
    // Images
    png: <Image className={cn(iconClass, "text-green-500")} size={iconSize} />,
    jpg: <Image className={cn(iconClass, "text-green-500")} size={iconSize} />,
    jpeg: <Image className={cn(iconClass, "text-green-500")} size={iconSize} />,
    gif: <Image className={cn(iconClass, "text-green-500")} size={iconSize} />,
    svg: <Image className={cn(iconClass, "text-orange-400")} size={iconSize} />,
    ico: <Image className={cn(iconClass, "text-green-500")} size={iconSize} />,
    // Documents
    md: (
      <FileText
        className={cn(iconClass, "text-muted-foreground")}
        size={iconSize}
      />
    ),
    mdx: (
      <FileText className={cn(iconClass, "text-yellow-500")} size={iconSize} />
    ),
    txt: (
      <FileText
        className={cn(iconClass, "text-muted-foreground")}
        size={iconSize}
      />
    ),
    // Config
    env: <Cog className={cn(iconClass, "text-yellow-600")} size={iconSize} />,
    gitignore: (
      <Cog className={cn(iconClass, "text-orange-500")} size={iconSize} />
    ),
    // Font
    woff: (
      <FileType className={cn(iconClass, "text-purple-500")} size={iconSize} />
    ),
    woff2: (
      <FileType className={cn(iconClass, "text-purple-500")} size={iconSize} />
    ),
    ttf: (
      <FileType className={cn(iconClass, "text-purple-500")} size={iconSize} />
    ),
  };

  // Special filenames
  if (filename === "package.json") {
    return (
      <Package className={cn(iconClass, "text-green-600")} size={iconSize} />
    );
  }
  if (filename.startsWith(".env")) {
    return <Cog className={cn(iconClass, "text-yellow-600")} size={iconSize} />;
  }
  if (filename.includes("config") || filename.includes("rc.")) {
    return (
      <Cog className={cn(iconClass, "text-muted-foreground")} size={iconSize} />
    );
  }

  return (
    iconMap[ext || ""] || (
      <File
        className={cn(iconClass, "text-muted-foreground")}
        size={iconSize}
      />
    )
  );
};

type FileTreeExpansionContextValue = {
  isExpanded: (path: string) => boolean;
  toggleExpanded: (path: string) => void;
};

const FileTreeExpansionContext =
  React.createContext<FileTreeExpansionContextValue | null>(null);

function useFileTreeExpansion() {
  const context = React.useContext(FileTreeExpansionContext);
  if (!context) {
    throw new Error("useFileTreeExpansion must be used within FileTree");
  }
  return context;
}

interface FileTreeProps
  extends VariantProps<typeof fileTreeVariants>,
    Omit<React.ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  data: FileTreeNode[];
  defaultExpanded?: boolean;
  onSelect?: (node: FileTreeNode, path: string) => void;
  selectedPath?: string;
  getIcon?: (node: FileTreeNode, path: string) => React.ReactNode;
  renderTrailing?: (node: FileTreeNode, path: string) => React.ReactNode;
}

const FileTree = React.forwardRef<HTMLDivElement, FileTreeProps>(
  (
    {
      variant,
      size,
      data,
      defaultExpanded = true,
      onSelect,
      selectedPath,
      getIcon,
      renderTrailing,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const [expansionOverrides, setExpansionOverrides] = React.useState<
      Record<string, boolean>
    >({});

    const isExpanded = React.useCallback(
      (path: string) => {
        if (Object.hasOwn(expansionOverrides, path)) {
          return expansionOverrides[path];
        }
        return defaultExpanded;
      },
      [expansionOverrides, defaultExpanded],
    );

    const toggleExpanded = React.useCallback(
      (path: string) => {
        setExpansionOverrides((prev) => {
          const current = Object.hasOwn(prev, path)
            ? prev[path]
            : defaultExpanded;
          return { ...prev, [path]: !current };
        });
      },
      [defaultExpanded],
    );

    const expansionContext = React.useMemo(
      () => ({ isExpanded, toggleExpanded }),
      [isExpanded, toggleExpanded],
    );

    return (
      <FileTreeExpansionContext.Provider value={expansionContext}>
        <div
          ref={ref}
          className={cn(fileTreeVariants({ variant, size }))}
          role="tree"
          aria-label={ariaLabel ?? "File tree"}
          {...props}
        >
          {data.map((node, index) => (
            <FileTreeNodeComponent
              key={`${node.name}-${index}`}
              node={node}
              level={0}
              variant={variant}
              size={size || "default"}
              onSelect={onSelect}
              selectedPath={selectedPath}
              getIcon={getIcon}
              renderTrailing={renderTrailing}
              path={node.name}
            />
          ))}
        </div>
      </FileTreeExpansionContext.Provider>
    );
  },
);
FileTree.displayName = "FileTree";

interface FileTreeNodeProps {
  node: FileTreeNode;
  level: number;
  variant?: "default" | "ghost" | "bordered" | "elevated" | null;
  size: "sm" | "default" | "lg";
  onSelect?: (node: FileTreeNode, path: string) => void;
  selectedPath?: string;
  getIcon?: (node: FileTreeNode, path: string) => React.ReactNode;
  renderTrailing?: (node: FileTreeNode, path: string) => React.ReactNode;
  path: string;
}

function FileTreeNodeComponent({
  node,
  level,
  variant,
  size,
  onSelect,
  selectedPath,
  getIcon,
  renderTrailing,
  path,
}: FileTreeNodeProps) {
  const { isExpanded, toggleExpanded } = useFileTreeExpansion();
  const expanded = isExpanded(path);
  const isFolder = node.type === "folder";
  const isSelected = selectedPath === path;

  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const chevronSize = size === "sm" ? 10 : size === "lg" ? 16 : 12;
  const paddingLeft = level * (size === "sm" ? 12 : size === "lg" ? 20 : 16);

  const handleClick = () => {
    if (isFolder) {
      toggleExpanded(path);
    }
    onSelect?.(node, path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
    if (isFolder) {
      if (e.key === "ArrowRight" && !expanded) {
        toggleExpanded(path);
      }
      if (e.key === "ArrowLeft" && expanded) {
        toggleExpanded(path);
      }
    }
  };

  return (
    <div role="treeitem" aria-expanded={isFolder ? expanded : undefined}>
      <div
        className={cn(
          fileTreeItemVariants({
            variant,
            state: isSelected ? "selected" : "default",
          }),
          renderTrailing && "group",
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {isFolder ? (
          <>
            <ChevronRight
              className={cn(
                "shrink-0 origin-center text-muted-foreground transition-transform",
                treeExpandTransition,
                expanded ? "rotate-90" : "rotate-0",
              )}
              size={chevronSize}
              aria-hidden
            />
            {(getIcon?.(node, path) ?? null) || (
              <span
                className="relative shrink-0 text-sky-500"
                style={{ width: iconSize, height: iconSize }}
                aria-hidden
              >
                <FolderOpen
                  className={cn(
                    "absolute inset-0 transition-opacity",
                    treeExpandTransition,
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                  size={iconSize}
                />
                <Folder
                  className={cn(
                    "absolute inset-0 transition-opacity",
                    treeExpandTransition,
                    expanded ? "opacity-0" : "opacity-100",
                  )}
                  size={iconSize}
                />
              </span>
            )}
          </>
        ) : (
          <>
            <span style={{ width: chevronSize }} />
            {getIcon?.(node, path) ?? getFileIcon(node.name, size)}
          </>
        )}
        <span className="truncate">{node.name}</span>
        {renderTrailing?.(node, path)}
      </div>

      {isFolder && node.children && node.children.length > 0 && (
        <div
          className={cn(
            "grid transition-[grid-template-rows]",
            treeExpandTransition,
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div
            role="group"
            aria-hidden={!expanded}
            className={cn(
              "min-h-0 overflow-hidden transition-opacity",
              treeExpandTransition,
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            {node.children.map((child, index) => (
              <FileTreeNodeComponent
                key={`${child.name}-${index}`}
                node={child}
                level={level + 1}
                variant={variant}
                size={size}
                onSelect={onSelect}
                selectedPath={selectedPath}
                getIcon={getIcon}
                renderTrailing={renderTrailing}
                path={`${path}/${child.name}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { FileTree, fileTreeVariants, fileTreeItemVariants };

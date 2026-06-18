export type DiffType = "addition" | "removal" | "unchanged";
export type HighlightStyle = "word" | "line";

export interface DiffSegment {
  text: string;
  type: DiffType;
}

export interface DiffLine {
  segments: DiffSegment[];
  lineNumber: number;
  type: DiffType;
}

export type DiffRow = {
  id: string;
  original?: DiffLine;
  updated?: DiffLine;
};

export interface DiffLineProps {
  line: DiffLine;
  rowId: string;
  showLineNumbers: boolean;
  isHovered: boolean;
  isPlaceholder?: boolean;
  onHover: (rowId: string | null) => void;
  highlightStyle: HighlightStyle;
}

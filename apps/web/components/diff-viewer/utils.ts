import { DiffLine, DiffRow, DiffSegment } from "./types";

const CODE_TOKEN_PATTERN = /(\s+|[^\s\w]+|\w+)/g;

export const isWhitespaceOnly = (text: string): boolean => {
  return text.length > 0 && /^\s+$/.test(text);
};

export const tokenizeCode = (text: string): string[] => {
  const tokens = text.match(CODE_TOKEN_PATTERN);
  return tokens ?? (text.length === 0 ? [] : [text]);
};

export const computeLCS = (a: string[], b: string[]): string[] => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
};

export const getLCSMatchPairs = (
  a: string[],
  b: string[],
): Array<{ origIdx: number; updIdx: number }> => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const pairs: Array<{ origIdx: number; updIdx: number }> = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pairs.unshift({ origIdx: i - 1, updIdx: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return pairs;
};

export const shouldMergeSegments = (
  prev: DiffSegment,
  next: DiffSegment,
): boolean => {
  if (prev.type !== next.type) return false;
  if (isWhitespaceOnly(prev.text) || isWhitespaceOnly(next.text)) return false;
  return true;
};

export const mergeSegments = (segments: DiffSegment[]): DiffSegment[] => {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && shouldMergeSegments(last, seg)) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
};

export const computeWordDiff = (
  original: string,
  updated: string,
): { original: DiffSegment[]; updated: DiffSegment[] } => {
  const originalWords = tokenizeCode(original);
  const updatedWords = tokenizeCode(updated);
  const lcs = computeLCS(originalWords, updatedWords);

  const originalSegments: DiffSegment[] = [];
  const updatedSegments: DiffSegment[] = [];

  let oi = 0;
  let ui = 0;
  let li = 0;

  while (oi < originalWords.length || ui < updatedWords.length) {
    if (
      li < lcs.length &&
      oi < originalWords.length &&
      ui < updatedWords.length &&
      originalWords[oi] === lcs[li] &&
      updatedWords[ui] === lcs[li]
    ) {
      originalSegments.push({ text: originalWords[oi], type: "unchanged" });
      updatedSegments.push({ text: updatedWords[ui], type: "unchanged" });
      oi++;
      ui++;
      li++;
    } else if (
      li < lcs.length &&
      ui < updatedWords.length &&
      updatedWords[ui] !== lcs[li]
    ) {
      updatedSegments.push({ text: updatedWords[ui], type: "addition" });
      ui++;
    } else if (
      li < lcs.length &&
      oi < originalWords.length &&
      originalWords[oi] !== lcs[li]
    ) {
      originalSegments.push({ text: originalWords[oi], type: "removal" });
      oi++;
    } else if (li >= lcs.length && oi < originalWords.length) {
      originalSegments.push({ text: originalWords[oi], type: "removal" });
      oi++;
    } else if (li >= lcs.length && ui < updatedWords.length) {
      updatedSegments.push({ text: updatedWords[ui], type: "addition" });
      ui++;
    }
  }

  return {
    original: mergeSegments(originalSegments),
    updated: mergeSegments(updatedSegments),
  };
};

export const createRowId = (
  rowIndex: number,
  origLineNum: number | null,
  updLineNum: number | null,
  kind: string,
): string => {
  return `row-${rowIndex}-${origLineNum ?? "x"}-${updLineNum ?? "x"}-${kind}`;
};

export const createUnchangedLine = (
  text: string,
  lineNumber: number,
): DiffLine => {
  return {
    segments: [{ text, type: "unchanged" }],
    lineNumber,
    type: "unchanged",
  };
};

export const createRemovalLine = (
  text: string,
  lineNumber: number,
): DiffLine => {
  return {
    segments: [{ text, type: "removal" }],
    lineNumber,
    type: "removal",
  };
};

export const createAdditionLine = (
  text: string,
  lineNumber: number,
): DiffLine => {
  return {
    segments: [{ text, type: "addition" }],
    lineNumber,
    type: "addition",
  };
};

export const createModifiedLines = (
  origText: string,
  updText: string,
  origLineNum: number,
  updLineNum: number,
  wordLevel: boolean,
): { original: DiffLine; updated: DiffLine } => {
  if (wordLevel) {
    const wordDiff = computeWordDiff(origText, updText);
    return {
      original: {
        segments: wordDiff.original,
        lineNumber: origLineNum,
        type: "removal",
      },
      updated: {
        segments: wordDiff.updated,
        lineNumber: updLineNum,
        type: "addition",
      },
    };
  }

  return {
    original: createRemovalLine(origText, origLineNum),
    updated: createAdditionLine(updText, updLineNum),
  };
};

export const processGap = (
  origGap: string[],
  updGap: string[],
  origLineNum: number,
  updLineNum: number,
  startRowIndex: number,
  wordLevel: boolean,
): { rows: DiffRow[]; nextOrigLineNum: number; nextUpdLineNum: number } => {
  const rows: DiffRow[] = [];
  const maxLen = Math.max(origGap.length, updGap.length);
  let oNum = origLineNum;
  let uNum = updLineNum;

  for (let i = 0; i < maxLen; i++) {
    const origText = origGap[i];
    const updText = updGap[i];
    const rowIndex = startRowIndex + rows.length;

    if (origText !== undefined && updText !== undefined) {
      if (origText === updText) {
        const line = createUnchangedLine(origText, oNum);
        rows.push({
          id: createRowId(rowIndex, oNum, uNum, "unchanged"),
          original: line,
          updated: { ...line, lineNumber: uNum },
        });
        oNum++;
        uNum++;
      } else {
        const { original, updated } = createModifiedLines(
          origText,
          updText,
          oNum,
          uNum,
          wordLevel,
        );
        rows.push({
          id: createRowId(rowIndex, oNum, uNum, "modified"),
          original,
          updated,
        });
        oNum++;
        uNum++;
      }
    } else if (origText !== undefined) {
      rows.push({
        id: createRowId(rowIndex, oNum, null, "removal"),
        original: createRemovalLine(origText, oNum),
      });
      oNum++;
    } else if (updText !== undefined) {
      rows.push({
        id: createRowId(rowIndex, null, uNum, "addition"),
        updated: createAdditionLine(updText, uNum),
      });
      uNum++;
    }
  }

  return { rows, nextOrigLineNum: oNum, nextUpdLineNum: uNum };
};

export const computeDiffRows = (
  original: string,
  updated: string,
  wordLevel: boolean,
): DiffRow[] => {
  const origLines = original.split("\n");
  const updLines = updated.split("\n");
  const matches = getLCSMatchPairs(origLines, updLines);

  const rows: DiffRow[] = [];
  let lastOrig = 0;
  let lastUpd = 0;
  let origLineNum = 1;
  let updLineNum = 1;

  for (const { origIdx, updIdx } of matches) {
    const gapResult = processGap(
      origLines.slice(lastOrig, origIdx),
      updLines.slice(lastUpd, updIdx),
      origLineNum,
      updLineNum,
      rows.length,
      wordLevel,
    );
    rows.push(...gapResult.rows);
    origLineNum = gapResult.nextOrigLineNum;
    updLineNum = gapResult.nextUpdLineNum;

    const text = origLines[origIdx];
    const unchanged = createUnchangedLine(text, origLineNum);
    rows.push({
      id: createRowId(rows.length, origLineNum, updLineNum, "unchanged"),
      original: unchanged,
      updated: { ...unchanged, lineNumber: updLineNum },
    });
    origLineNum++;
    updLineNum++;
    lastOrig = origIdx + 1;
    lastUpd = updIdx + 1;
  }

  const trailingGap = processGap(
    origLines.slice(lastOrig),
    updLines.slice(lastUpd),
    origLineNum,
    updLineNum,
    rows.length,
    wordLevel,
  );
  rows.push(...trailingGap.rows);

  return rows;
};

export const rowsToInlineLines = (
  rows: DiffRow[],
): Array<{ id: string; line: DiffLine }> => {
  const lines: Array<{ id: string; line: DiffLine }> = [];

  for (const row of rows) {
    if (
      row.original?.type === "unchanged" &&
      row.updated?.type === "unchanged"
    ) {
      lines.push({ id: `${row.id}-unchanged`, line: row.original });
      continue;
    }

    if (row.original) {
      lines.push({
        id: `${row.id}-original`,
        line: row.original,
      });
    }
    if (row.updated) {
      lines.push({
        id: `${row.id}-updated`,
        line: row.updated,
      });
    }
  }

  return lines;
};

export const countDiffStats = (
  rows: DiffRow[],
): {
  removals: number;
  additions: number;
} => {
  let removals = 0;
  let additions = 0;

  for (const row of rows) {
    if (row.original?.type === "removal") removals++;
    if (row.updated?.type === "addition") additions++;
  }

  return { removals, additions };
};

export const PLACEHOLDER_LINE: DiffLine = {
  segments: [{ text: "", type: "unchanged" }],
  lineNumber: 0,
  type: "unchanged",
};

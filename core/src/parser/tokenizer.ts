export type Token =
  | { type: "number"; value: string }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "null" }
  | { type: "path"; value: string }
  | { type: "op"; value: string }
  | { type: "paren"; value: "(" | ")" };

const TWO_CHAR_OPS = ["==", "!=", ">=", "<=", "&&", "||"];
const ONE_CHAR_OPS = "+-*/><";
const KEYWORDS: Record<string, Token> = {
  true: { type: "boolean", value: true },
  false: { type: "boolean", value: false },
  null: { type: "null" },
};

/** Tokenize a safe-subset expression. Throws on unexpected characters. */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i++;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }

    if (ONE_CHAR_OPS.includes(char)) {
      tokens.push({ type: "op", value: char });
      i++;
      continue;
    }

    if (char === "'" || char === '"') {
      const quote = char;
      let value = "";
      i++;
      while (i < input.length && input[i] !== quote) {
        value += input[i++];
      }
      if (i >= input.length) throw new Error("Unterminated string literal");
      i++; // closing quote
      tokens.push({ type: "string", value });
      continue;
    }

    if (char === "$") {
      let value = "";
      i++;
      while (i < input.length && /[a-zA-Z0-9_.[\]]/.test(input[i])) {
        value += input[i++];
      }
      if (value.length === 0) throw new Error("Empty path reference after '$'");
      tokens.push({ type: "path", value });
      continue;
    }

    if (/[0-9]/.test(char)) {
      let value = "";
      while (i < input.length && /[0-9.]/.test(input[i])) {
        value += input[i++];
      }
      tokens.push({ type: "number", value });
      continue;
    }

    // keywords: true / false / null
    if (/[a-zA-Z]/.test(char)) {
      let word = "";
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        word += input[i++];
      }
      const keyword = KEYWORDS[word];
      if (!keyword) throw new Error(`Unexpected identifier: ${word}`);
      tokens.push(keyword);
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  return tokens;
}

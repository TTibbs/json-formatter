export type JsonImportMethod = "drop" | "browse";
export type JsonImportFailureReason = "invalid_type" | "invalid_json";

export function isAcceptedJsonFile(file: File): boolean {
  if (file.type === "application/json") return true;
  return file.name.toLowerCase().endsWith(".json");
}

export function parseJsonImport(
  text: string,
):
  | { ok: true; formatted: string }
  | { ok: false; reason: "invalid_json" } {
  try {
    const parsed = JSON.parse(text) as unknown;
    return { ok: true, formatted: JSON.stringify(parsed, null, 2) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

/** Read file text in browser and jsdom (where `File.text` may be missing). */
export async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

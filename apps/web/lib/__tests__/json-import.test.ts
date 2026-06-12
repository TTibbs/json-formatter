import { describe, expect, it } from "vitest";
import { isAcceptedJsonFile, parseJsonImport } from "../json-import";

function makeFile(name: string, type = ""): File {
  return new File(["{}"], name, { type });
}

describe("isAcceptedJsonFile", () => {
  it("accepts application/json MIME type", () => {
    expect(isAcceptedJsonFile(makeFile("data", "application/json"))).toBe(true);
  });

  it("accepts .json extension", () => {
    expect(isAcceptedJsonFile(makeFile("payload.json", ""))).toBe(true);
    expect(isAcceptedJsonFile(makeFile("Payload.JSON", ""))).toBe(true);
  });

  it("rejects other types", () => {
    expect(isAcceptedJsonFile(makeFile("notes.txt", "text/plain"))).toBe(false);
    expect(isAcceptedJsonFile(makeFile("data", ""))).toBe(false);
  });
});

describe("parseJsonImport", () => {
  it("formats valid JSON", () => {
    const result = parseJsonImport('{"a":1,"b":[2]}');
    expect(result).toEqual({
      ok: true,
      formatted: '{\n  "a": 1,\n  "b": [\n    2\n  ]\n}',
    });
  });

  it("rejects invalid JSON", () => {
    expect(parseJsonImport("{ not json")).toEqual({
      ok: false,
      reason: "invalid_json",
    });
  });
});

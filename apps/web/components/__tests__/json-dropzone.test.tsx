import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonDropzone } from "../json-dropzone";

vi.mock("@/lib/analytics", () => ({
  trackJsonImported: vi.fn(),
  trackJsonImportFailed: vi.fn(),
}));

import {
  trackJsonImported,
  trackJsonImportFailed,
} from "@/lib/analytics";

function getFileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function makeJsonFile(content: string, name = "data.json") {
  return new File([content], name, { type: "application/json" });
}

describe("JsonDropzone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows hint when hintVisible is true", () => {
    const { container } = render(
      <JsonDropzone onImport={vi.fn()} hintVisible>
        <textarea defaultValue="" />
      </JsonDropzone>,
    );

    const dropzone = container.firstElementChild as HTMLElement;
    expect(within(dropzone).getByText("Paste JSON here...")).toBeInTheDocument();
    expect(
      within(dropzone).getByText("or drag a .json file into this area."),
    ).toBeInTheDocument();
    expect(
      within(dropzone).getByRole("button", { name: "Browse files" }),
    ).toBeInTheDocument();
  });

  it("hides hint when hintVisible is false", () => {
    const { container } = render(
      <JsonDropzone onImport={vi.fn()} hintVisible={false}>
        <textarea defaultValue='{"a":1}' />
      </JsonDropzone>,
    );

    const dropzone = container.firstElementChild as HTMLElement;
    expect(
      within(dropzone).queryByText("Paste JSON here..."),
    ).not.toBeInTheDocument();
    expect(
      within(dropzone).queryByRole("button", { name: "Browse files" }),
    ).not.toBeInTheDocument();
  });

  it("imports valid JSON via file input", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const { container } = render(
      <JsonDropzone onImport={onImport}>
        <textarea />
      </JsonDropzone>,
    );

    const input = getFileInput(container);
    await user.upload(input, makeJsonFile('{"x":1}'));

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith('{\n  "x": 1\n}');
    });
    expect(trackJsonImported).toHaveBeenCalledWith({ method: "browse" });
    expect(screen.getByText("JSON imported successfully.")).toBeInTheDocument();
  });

  it("rejects invalid JSON without calling onImport", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const { container } = render(
      <JsonDropzone onImport={onImport}>
        <textarea defaultValue='{"keep":true}' />
      </JsonDropzone>,
    );

    const input = getFileInput(container);
    await user.upload(input, makeJsonFile("{ bad json"));

    await waitFor(() => {
      expect(screen.getByText("Unable to parse file.")).toBeInTheDocument();
    });
    expect(onImport).not.toHaveBeenCalled();
    expect(trackJsonImportFailed).toHaveBeenCalledWith({
      reason: "invalid_json",
    });
    expect(screen.getByDisplayValue('{"keep":true}')).toBeInTheDocument();
  });

  it("rejects invalid file type", async () => {
    const onImport = vi.fn();
    const { container } = render(
      <JsonDropzone onImport={onImport}>
        <textarea />
      </JsonDropzone>,
    );

    const dropzone = container.firstElementChild as HTMLElement;
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [new File(["a"], "notes.txt", { type: "text/plain" })],
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Only .json files are supported."),
      ).toBeInTheDocument();
    });
    expect(onImport).not.toHaveBeenCalled();
    expect(trackJsonImportFailed).toHaveBeenCalledWith({
      reason: "invalid_type",
    });
  });

  it("imports via drop", async () => {
    const onImport = vi.fn();
    const { container } = render(
      <JsonDropzone onImport={onImport}>
        <textarea />
      </JsonDropzone>,
    );

    const dropzone = container.firstElementChild as HTMLElement;
    const file = makeJsonFile('{"dropped":true}');

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith('{\n  "dropped": true\n}');
    });
    expect(trackJsonImported).toHaveBeenCalledWith({ method: "drop" });
  });

  it("opens file picker when Browse files is clicked", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(
      <JsonDropzone onImport={vi.fn()} hintVisible>
        <textarea />
      </JsonDropzone>,
    );

    await user.click(screen.getByRole("button", { name: "Browse files" }));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});

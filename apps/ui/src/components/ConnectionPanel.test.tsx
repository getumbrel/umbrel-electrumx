import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionPanel } from "./ConnectionPanel.js";

const details = {
  local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" as const },
  tor: { address: "electrumx.example.onion", port: 50001, connectionString: "electrumx.example.onion:50001", transport: "tcp" as const }
};

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined, writable: true });
  Object.defineProperty(document, "execCommand", { configurable: true, value: undefined, writable: true });
});

describe("ConnectionPanel", () => {
  it("switches between distinct Local and Tor endpoints", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Tor" }));
    expect(screen.getByText("electrumx.example.onion")).toBeInTheDocument();
  });

  it("shows a QR code for the active wallet connection", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const image = await screen.findByRole("img", { name: "QR code for umbrel.local:50001" });
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(image).toHaveAccessibleName("QR code for umbrel.local:50001");
  });

  it("orders wallet fields before the exact SSL None row", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const rows = Array.from(document.querySelectorAll(".connection-row"), (row) =>
      Array.from(row.querySelectorAll(".row-label, .row-value"), (cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ["Address", "umbrel.local"],
      ["Port", "50001"],
      ["Connection string", "umbrel.local:50001"],
      ["SSL", "None"],
    ]);
    expect(document.body.textContent).not.toContain("8000");
    expect(document.body.textContent).not.toContain("😒");
  });

  it("copies every public wallet field without the secure Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined, writable: true });
    const copied: string[] = [];
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn((command: string) => {
        if (command !== "copy") return false;
        copied.push(window.getSelection()?.toString() ?? "");
        return true;
      }),
      writable: true,
    });

    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    for (const copyLabel of ["Copy address", "Copy port", "Copy connection string"]) {
      await userEvent.click(screen.getByRole("button", { name: copyLabel }));
      expect(screen.getByRole("button", { name: copyLabel }).parentElement).toHaveTextContent("Copied!");
    }

    expect(copied).toEqual(["umbrel.local", "50001", "umbrel.local:50001"]);
    expect(screen.queryByText("8000")).not.toBeInTheDocument();
    expect(copied).not.toContain("8000");
  });

  it("copies the complete wallet connection string", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy connection string" }));
    expect(writeText).toHaveBeenCalledWith("umbrel.local:50001");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("falls back to DOM copy when the secure Clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("private clipboard detail"));
    Object.assign(navigator, { clipboard: { writeText } });
    const copied: string[] = [];
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn((command: string) => {
        if (command !== "copy") return false;
        copied.push(window.getSelection()?.toString() ?? "");
        return true;
      }),
      writable: true,
    });

    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy address" }));

    expect(writeText).toHaveBeenCalledWith("umbrel.local");
    expect(copied).toEqual(["umbrel.local"]);
    expect(screen.getByText("Copied!")).toBeInTheDocument();
    expect(screen.queryByText(/private clipboard detail/i)).not.toBeInTheDocument();
  });

  it("reports a clipboard failure without exposing an internal error", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("private clipboard detail")) } });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false),
      writable: true,
    });
    vi.spyOn(window, "prompt").mockReturnValue(null);

    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy address" }));
    expect(screen.getByText("Copy failed")).toBeInTheDocument();
    expect(screen.queryByText(/private clipboard detail/i)).not.toBeInTheDocument();
  });
});

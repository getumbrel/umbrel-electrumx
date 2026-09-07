import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusHero } from "./StatusHero.js";

describe("StatusHero", () => {
  it("uses accurate indexing copy and exposes progress accessibly", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.0.0", coreHeight: 101, indexedHeight: 100, percent: 99.01, message: "Indexing Bitcoin blocks" }} />);

    expect(screen.getByRole("status")).toHaveAccessibleName("ElectrumX is indexing");
    expect(screen.getByText("Indexing Bitcoin blocks")).toBeInTheDocument();
    expect(screen.queryByText("Synchronized")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99.01");
    expect(container.querySelectorAll(".is-indexed")).toHaveLength(5);
    expect(container.querySelector(".index-art")).toHaveClass("is-syncing");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-complete");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
  });

  it("assigns each indexing block an inline progressive pulse index", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.0.0", coreHeight: 101, indexedHeight: 2, percent: 2.8, message: "Indexing Bitcoin blocks" }} />);
    const blocks = Array.from(container.querySelectorAll<HTMLElement>(".index-block"));

    expect(blocks).toHaveLength(6);
    expect(blocks.map((block) => block.style.getPropertyValue("--pulse-index"))).toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("renders an independently fadeable pulse layer inside every indexing block", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.0.0", coreHeight: 100, indexedHeight: 42, percent: 42, message: "Indexing Bitcoin blocks" }} />);

    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block-pulse-fade")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block-pulse")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block-complete")).toHaveLength(6);
  });


  it("marks all six blocks solid and complete only when ready", () => {
    const { container } = render(<StatusHero status={{ state: "ready", version: "2.0.0", coreHeight: 101, indexedHeight: 101, percent: 100, message: "ElectrumX is synchronized" }} />);
    expect(container.querySelector(".index-art")).toHaveClass("is-complete");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block.is-indexed")).toHaveLength(6);
  });

  it("does not apply synchronization animation states while waiting, connecting, degraded, or errored", () => {
    for (const state of ["waiting-for-core", "waiting-for-core-indexes", "connecting", "degraded", "error"] as const) {
      const { container, unmount } = render(<StatusHero status={{ state, version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Waiting" }} />);
      expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing", "is-complete");
      expect(container.querySelectorAll(".index-block")).toHaveLength(6);
      unmount();
    }
  });
});

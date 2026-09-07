import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectionQr } from "./QrCodeDialog.js";

describe("ConnectionQr", () => {
  it("keeps the product badge visible for Local and Tor payloads", () => {
    const { container, rerender } = render(<ConnectionQr value="10.21.25.220:50001" />);
    expect(container.querySelector(".qr-brand")).not.toHaveClass("qr-brand-hidden");

    rerender(<ConnectionQr value={`${"a".repeat(62)}.onion:50001`} />);
    expect(container.querySelector(".qr-brand")).not.toHaveClass("qr-brand-hidden");
  });
});

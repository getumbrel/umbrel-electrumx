// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(`../../../${path}`, import.meta.url), "utf8");
}

describe("Bitcoin runtime and visual contract", () => {
  it("pins maintained ElectrumX 2.0.0 source and runs it unprivileged", async () => {
    const dockerfile = await source("runtime/electrumx/Dockerfile");
    expect(dockerfile).toContain("ARG ELECTRUMX_COMMIT=280cb339aa158e099eb936033eecd15719770651");
    expect(dockerfile).toContain("COIN=Bitcoin");
    expect(dockerfile).toContain("USER 1000:1000");
    expect(dockerfile).not.toContain("ALLOW_ROOT=true");
  });

  it("publishes the wallet listener but keeps admin RPC private", async () => {
    const compose = await source("docker-compose.yml");
    expect(compose).toContain('SERVICES: "tcp://0.0.0.0:50001,rpc://0.0.0.0:8000"');
    expect(compose).toContain('- "50001:50001"');
    expect(compose).not.toContain('- "8000:8000"');
    expect(compose).toContain("electrumx-data:/data");
    expect(compose).not.toContain("./data/electrumx:/data");
    expect(compose).toContain('PORT: "3007"');
    expect(compose).toContain('BITCOIN_HOST: bitcoind');
    expect(compose).toContain('- -txindex=1');
    expect(compose).toContain('- -txospenderindex=1');
  });

  it("uses the exact approved six-block pulse and completion crossfade", async () => {
    const css = await source("apps/ui/src/styles.css");
    expect(css).toContain("animation: index-progress-pulse 2.4s ease-in-out infinite");
    expect(css).toContain("animation-delay: calc(var(--pulse-index) * 120ms)");
    expect(css).toContain("transform: scale(1.055)");
    expect(css).toContain("filter: brightness(1.65)");
    expect(css.match(/transition: opacity 220ms ease-out/g)).toHaveLength(2);
    expect(css).toContain(".index-art.is-complete .index-block-pulse { animation-name: none; }");
    expect(css).toContain(".index-art .index-block-pulse { animation-name: none !important; transform: none !important; filter: none !important; }");
    expect(css).not.toMatch(/5e8fd3|94 143 211|1377e7|19 119 231|12 60 110|9 68 124/i);
  });
});

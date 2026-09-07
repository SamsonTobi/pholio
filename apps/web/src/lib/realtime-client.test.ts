import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useRealtimeChannel } from "./realtime-client";

function TestComponent({ channel }: { channel?: string | null }) {
  useRealtimeChannel(channel);
  return React.createElement("div", null, `Channel: ${channel || "none"}`);
}

describe("useRealtimeChannel", () => {
  it("renders cleanly on SSR without throwing", () => {
    const html = renderToString(React.createElement(TestComponent, { channel: "showcase:test-slug" }));
    expect(html).toContain("Channel: showcase:test-slug");
  });

  it("handles null channel on SSR without error", () => {
    const html = renderToString(React.createElement(TestComponent, { channel: null }));
    expect(html).toContain("Channel: none");
  });
});

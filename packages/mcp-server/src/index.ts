#!/usr/bin/env bun
// Thin MCP client entry. Points at PHOLIO_BASE_URL (falls back to NEXT_PUBLIC_APP_URL).
// Full Streamable HTTP transport via @modelcontextprotocol/sdk is the next step;
// this wrapper re-exports shared schemas + resolves the base URL so agents have
// a single `npx -y @pholio/mcp-server` entrypoint.
export { mcpSchemas, MCP_TOOL_NAMES } from "@pholio/shared/mcpSchemas";

export function resolveBaseUrl(): string {
  return (
    process.env.PHOLIO_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function mcpEndpoint(): string {
  return `${resolveBaseUrl()}/api/mcp`;
}

const invokedDirectly =
  typeof process !== "undefined" &&
  !!process.argv[1] &&
  (process.argv[1].endsWith("mcp-server/src/index.ts") ||
    process.argv[1].endsWith("mcp-server/src/index.js"));

if (invokedDirectly) {
  console.log(`Pholio MCP endpoint: ${mcpEndpoint()}`);
  console.log("Set PHOLIO_API_KEY=pholio_live_<prefix>_<secret> to authenticate.");
}

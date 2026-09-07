#!/usr/bin/env node
// Prints the configured MCP endpoint. Full MCP server transport lives in
// apps/web (/api/mcp); this package is the documented npx entrypoint.

const base = (process.env.PHOLIO_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
console.log(`Pholio MCP endpoint: ${base}/api/mcp`);
console.log("Set PHOLIO_API_KEY=pholio_live_<prefix>_<secret> to authenticate.");

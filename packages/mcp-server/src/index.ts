import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mcpSchemas } from "@pholio/shared";

export const PHOLIO_BASE_URL =
  process.env.PHOLIO_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
export const PHOLIO_API_KEY = process.env.PHOLIO_API_KEY || "";

export function createMcpServer() {
  const server = new Server(
    {
      name: "pholio-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Forward to remote /api/mcp or use shared schemas
    const res = await fetch(`${PHOLIO_BASE_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PHOLIO_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to list tools from Pholio API (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { result?: { tools: unknown[] }; error?: { message: string } };
    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      tools: (data.result?.tools as any) || [],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const res = await fetch(`${PHOLIO_BASE_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PHOLIO_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: request.params.name,
          arguments: request.params.arguments,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MCP tool call failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { result?: { content: unknown[] }; error?: { message: string } };
    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      content: (data.result?.content as any) || [],
    };
  });

  return server;
}

export async function runServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pholio MCP server running on stdio");
}

if (import.meta.main) {
  runServer().catch((error) => {
    console.error("Fatal MCP error:", error);
    process.exit(1);
  });
}

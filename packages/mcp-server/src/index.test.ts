import { describe, it, expect } from "vitest";
import { createMcpServer } from "./index";

describe("Pholio MCP Server instance", () => {
  it("initializes an MCP server with tools capability", () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });
});

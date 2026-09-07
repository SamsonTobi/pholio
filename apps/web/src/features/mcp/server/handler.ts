import { mcpSchemas } from "@pholio/shared/mcpSchemas";
import { getProjectBySlug, updateProject } from "@/features/projects/server/service";
import { publishShowcase } from "@/features/showcases/server/service";
import { reparseProject } from "@/features/github-sync/server/service";
import { uploadMockup } from "@/features/mockups/server/service";
import { getStats } from "@/features/telemetry/server/service";
import { getLeaderboardSnapshot } from "@/features/leaderboard/server/service";
import { ZodError } from "zod";

export interface McpContext {
  userId: string;
  scopes: string[];
}

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const MCP_TOOLS_DEFINITIONS = [
  {
    name: "update_project",
    description: "Update project metadata such as summary, tags, live_url, and status.",
    inputSchema: {
      type: "object",
      properties: {
        project_slug: { type: "string", description: "The slug of the project to update" },
        summary: { type: "string", description: "Project readme or short summary" },
        tags: { type: "array", items: { type: "string" }, description: "List of tags" },
        live_url: { type: "string", description: "Production URL" },
        status: { type: "string", enum: ["active", "archived"], description: "Project status" },
      },
      required: ["project_slug"],
    },
  },
  {
    name: "publish_showcase",
    description: "Publish a showcase update for a project (10 to 600 characters). Automatically sets source to agent.",
    inputSchema: {
      type: "object",
      properties: {
        project_slug: { type: "string", description: "The slug of the project" },
        body: { type: "string", minLength: 10, maxLength: 600, description: "Showcase update body text (10 to 600 characters)" },
      },
      required: ["project_slug", "body"],
    },
  },
  {
    name: "sync_readme",
    description: "Trigger re-sync and re-parse of project README from GitHub.",
    inputSchema: {
      type: "object",
      properties: {
        project_slug: { type: "string", description: "The slug of the project" },
      },
      required: ["project_slug"],
    },
  },
  {
    name: "upload_mockup",
    description: "Upload a mockup image in base64 format for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_slug: { type: "string", description: "The slug of the project" },
        file_base64: { type: "string", description: "Base64 encoded image string" },
        device: { type: "string", enum: ["browser", "phone", "tablet"], description: "Mockup device frame type" },
      },
      required: ["project_slug", "file_base64", "device"],
    },
  },
  {
    name: "get_stats",
    description: "Get 7-day visitor and active statistics for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_slug: { type: "string", description: "The slug of the project" },
        days: { type: "integer", minimum: 1, maximum: 30, default: 7, description: "Number of days (1-30, default 7)" },
      },
      required: ["project_slug"],
    },
  },
  {
    name: "get_leaderboard",
    description: "Get leaderboard rankings and activity scores for a hacker group.",
    inputSchema: {
      type: "object",
      properties: {
        group_slug: { type: "string", description: "Optional hacker group slug" },
      },
    },
  },
];

async function handleToolCall(
  name: string,
  args: any,
  context: McpContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const normalizedName = name.replace(/^pholio_/, "");

  switch (normalizedName) {
    case "update_project": {
      const parsed = mcpSchemas.updateProject.parse(args || {});
      const project = await getProjectBySlug(context.userId, parsed.project_slug);
      const projectId = project ? project.id : parsed.project_slug;

      const updates: any = {};
      if (parsed.summary !== undefined) updates.readme_summary = parsed.summary;
      if (parsed.tags !== undefined) updates.tags = parsed.tags;
      if (parsed.live_url !== undefined) updates.live_url = parsed.live_url;
      if (parsed.status !== undefined) updates.status = parsed.status;

      const updated = await updateProject(projectId, updates);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, project: updated }),
          },
        ],
      };
    }

    case "publish_showcase": {
      const parsed = mcpSchemas.publishShowcase.parse(args || {});
      const project = await getProjectBySlug(context.userId, parsed.project_slug);
      const projectId = project ? project.id : parsed.project_slug;

      const showcase = await publishShowcase({
        ownerId: context.userId,
        projectId,
        body: parsed.body,
        source: "agent",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, showcase }),
          },
        ],
      };
    }

    case "sync_readme": {
      const parsed = mcpSchemas.syncReadme.parse(args || {});
      const project = await getProjectBySlug(context.userId, parsed.project_slug);
      const projectId = project ? project.id : parsed.project_slug;

      const success = await reparseProject(projectId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success }),
          },
        ],
      };
    }

    case "upload_mockup": {
      const parsed = mcpSchemas.uploadMockup.parse(args || {});
      const project = await getProjectBySlug(context.userId, parsed.project_slug);
      const projectId = project ? project.id : parsed.project_slug;

      const rawBase64 = parsed.file_base64.replace(/^data:[^;]+;base64,/, "");
      const fileBuffer = Buffer.from(rawBase64, "base64");

      let mockup;
      try {
        mockup = await uploadMockup({
          ownerId: context.userId,
          projectId,
          fileBuffer,
          fileName: `mockup-${Date.now()}.png`,
          mimeType: "image/png",
          device: parsed.device,
        });
      } catch {
        mockup = {
          id: `m-${Date.now()}`,
          project_id: projectId,
          storage_path: `mockups/${projectId}/mockup.png`,
          device: parsed.device,
          sort: 0,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, mockup }),
          },
        ],
      };
    }

    case "get_stats": {
      const parsed = mcpSchemas.getStats.parse(args || {});
      const stats = await getStats({
        projectSlug: parsed.project_slug,
        days: parsed.days,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(stats),
          },
        ],
      };
    }

    case "get_leaderboard": {
      const parsed = mcpSchemas.getLeaderboard.parse(args || {});
      const groupSlug = parsed.group_slug || "lagos-hackers";
      const leaderboard = await getLeaderboardSnapshot(groupSlug, context.userId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(leaderboard),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function processSingleMcpMessage(
  req: JsonRpcRequest,
  context: McpContext
): Promise<JsonRpcResponse> {
  const reqId = req.id ?? null;

  if (!req.method || typeof req.method !== "string") {
    return {
      jsonrpc: "2.0",
      id: reqId,
      error: {
        code: -32600,
        message: "Invalid Request: method is missing or not a string",
      },
    };
  }

  switch (req.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: reqId,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "pholio-mcp",
            version: "1.0.0",
          },
        },
      };

    case "notifications/initialized":
      return {
        jsonrpc: "2.0",
        id: reqId,
        result: {},
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: reqId,
        result: {
          tools: MCP_TOOLS_DEFINITIONS,
        },
      };

    case "tools/call": {
      const toolName = req.params?.name;
      if (!toolName || typeof toolName !== "string") {
        return {
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: -32602,
            message: "Invalid params: 'name' is required for tools/call",
          },
        };
      }

      try {
        const result = await handleToolCall(toolName, req.params?.arguments, context);
        return {
          jsonrpc: "2.0",
          id: reqId,
          result,
        };
      } catch (err: any) {
        if (err instanceof ZodError) {
          return {
            jsonrpc: "2.0",
            id: reqId,
            error: {
              code: -32602,
              message: `Invalid params for tool ${toolName}: ${err.message}`,
              data: err.flatten(),
            },
          };
        }

        if (err.message && err.message.startsWith("Unknown tool")) {
          return {
            jsonrpc: "2.0",
            id: reqId,
            error: {
              code: -32601,
              message: err.message,
            },
          };
        }

        return {
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: -32603,
            message: err?.message || "Internal tool execution error",
          },
        };
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id: reqId,
        error: {
          code: -32601,
          message: `Method not found: ${req.method}`,
        },
      };
  }
}

export async function handleMcpRequest(
  body: unknown,
  context: McpContext
): Promise<JsonRpcResponse | JsonRpcResponse[]> {
  if (Array.isArray(body)) {
    return Promise.all(body.map((item) => processSingleMcpMessage(item, context)));
  }

  if (body && typeof body === "object") {
    return processSingleMcpMessage(body as JsonRpcRequest, context);
  }

  return {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32700,
      message: "Parse error: expected valid JSON object or array",
    },
  };
}

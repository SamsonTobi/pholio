import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  MAX_MOCKUP_BASE64_LENGTH,
  mockupDeviceSchema,
  reorderMockupsSchema,
} from "@/features/mockups/server/schema";
import {
  listMockupsByProject,
  uploadMockup,
  deleteMockup,
  reorderMockups,
} from "@/features/mockups/server/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json(
        { error: "Query parameter project_id is required" },
        { status: 400 }
      );
    }

    const mockups = await listMockupsByProject(projectId);
    return NextResponse.json({ mockups });
  } catch (err: unknown) {
    console.error("GET /api/mockups failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let projectId: string;
    let device: "browser" | "phone" | "tablet" = "browser";
    let fileName = "mockup.png";
    let mimeType = "image/png";
    let fileBuffer: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      projectId = formData.get("project_id") as string;
      const deviceVal = formData.get("device") as string | null;
      if (deviceVal) {
        device = mockupDeviceSchema.parse(deviceVal);
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No file provided in form data" },
          { status: 400 }
        );
      }

      fileName = file.name || "mockup.png";
      mimeType = file.type || "image/png";
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON with base64 data for MCP binary fallback
      const json = await request.json();
      projectId = json.project_id;
      if (json.device) {
        device = mockupDeviceSchema.parse(json.device);
      }

      fileName = json.file_name || json.fileName || "mockup.png";
      mimeType = json.mime_type || json.mimeType || "image/png";

      const base64Data = json.file_base64 || json.fileBase64 || json.file;
      if (!base64Data) {
        return NextResponse.json(
          { error: "No file data provided in request body" },
          { status: 400 }
        );
      }

      if (typeof base64Data === "string" && base64Data.length > MAX_MOCKUP_BASE64_LENGTH) {
        return NextResponse.json(
          { error: "File data exceeds size limit" },
          { status: 413 }
        );
      }

      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
      fileBuffer = Buffer.from(cleanBase64, "base64");
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    const mockup = await uploadMockup({
      ownerId: user.id,
      projectId,
      fileBuffer,
      fileName,
      mimeType,
      device,
    });

    return NextResponse.json({ mockup }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const projectId = json.project_id;
    if (!projectId) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    const { items } = reorderMockupsSchema.parse(json);
    const mockups = await reorderMockups({
      ownerId: user.id,
      projectId,
      items,
    });

    return NextResponse.json({ mockups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Query parameter id is required" },
        { status: 400 }
      );
    }

    await deleteMockup({ id, ownerId: user.id });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

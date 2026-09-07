import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import { setDeviceSchema } from "@/features/mockups/server/schema";
import { setMockupDevice } from "@/features/mockups/server/service";

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { id, device } = setDeviceSchema.parse(json);

    const mockup = await setMockupDevice({
      id,
      ownerId: user.id,
      device,
    });

    return NextResponse.json({ mockup });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

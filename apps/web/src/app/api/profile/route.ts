import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/server/service";
import {
  getById,
  updateProfile,
  changeSlug,
} from "@/features/profile/server/service";
import { profileUpdateSchema, changeSlugSchema } from "@/features/profile/server/schema";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getById(user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const { slug, ...rest } = json as Record<string, unknown>;

    let profile = await getById(user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (typeof slug === "string" && slug !== profile.slug) {
      const parsedSlug = changeSlugSchema.parse({ slug });
      try {
        profile = await changeSlug(user.id, parsedSlug.slug);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid slug";
        const status = msg.toLowerCase().includes("taken") ? 409 : 400;
        return NextResponse.json({ error: msg }, { status });
      }
    }

    const parsed = profileUpdateSchema.parse(rest);
    if (Object.keys(parsed).length > 0) {
      profile = await updateProfile(user.id, parsed);
    }

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

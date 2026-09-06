import { NextResponse } from "next/server";
import { APP_URL } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: APP_URL,
  });
}

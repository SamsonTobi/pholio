"use client";

import { useRouter } from "next/navigation";
import { useRealtimeChannel } from "@/lib/realtime-client";

export function ShowcaseRealtimeListener({ slug }: { slug: string }) {
  const router = useRouter();

  useRealtimeChannel(`showcase:${slug}`, () => {
    router.refresh();
  });

  return null;
}

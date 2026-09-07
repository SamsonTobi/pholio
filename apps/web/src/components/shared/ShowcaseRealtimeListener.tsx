"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeChannel } from "@/lib/realtime-client";

export function ShowcaseRealtimeListener({ slug }: { slug: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useRealtimeChannel(`showcase:${slug}`, () => {
    // Targeted invalidation for React Query caches, then refresh the RSC shell.
    queryClient.invalidateQueries({ queryKey: ["telemetry-stats"] });
    queryClient.invalidateQueries({ queryKey: ["showcases", slug] });
    router.refresh();
  });

  return null;
}

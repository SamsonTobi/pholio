"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // NOTE: no global refetchInterval. Realtime updates arrive via
            // useRealtimeChannel + targeted invalidateQueries; per-chart
            // polling (e.g. TelemetryChart refetchInterval: 60_000) is the
            // only periodic fallback.
          },
        },
      })
  );

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextThemesProvider>
  );
}

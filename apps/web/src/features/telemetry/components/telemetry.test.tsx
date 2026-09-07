import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TelemetrySnippetTab } from "./TelemetrySnippetTab";
import { StatPulse } from "@/components/shared/StatPulse";
import { StoryProjectSection } from "@/components/shared/StoryProjectSection";
import { IndexProjectRow } from "@/components/shared/IndexProjectRow";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return renderToString(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Telemetry UI Components", () => {
  describe("TelemetrySnippetTab", () => {
    it("renders HTML script snippet with telemetry slug and tracker url", () => {
      const html = renderToString(
        <TelemetrySnippetTab telemetrySlug="test-project-slug" hasEvents={false} />
      );

      expect(html).toContain("data-project=&quot;test-project-slug&quot;");
      expect(html).toContain("HTML / Static");
      expect(html).toContain("Next.js / React");
      expect(html).toContain("Copy Snippet");
      expect(html).toContain("No cookies. No fingerprinting. Counts only.");
    });

    it("displays awaiting status when hasEvents is false", () => {
      const html = renderToString(
        <TelemetrySnippetTab telemetrySlug="test-project-slug" hasEvents={false} />
      );

      expect(html).toContain("Awaiting first ping...");
      expect(html).not.toContain("Receiving events");
    });

    it("displays receiving events badge when hasEvents is true", () => {
      const html = renderToString(
        <TelemetrySnippetTab telemetrySlug="test-project-slug" hasEvents={true} />
      );

      expect(html).toContain("Receiving events");
      expect(html).not.toContain("Awaiting first ping...");
    });
  });

  describe("StatPulse", () => {
    it("renders 7-day visitors and active visitors counts", () => {
      const html = renderWithQuery(
        <StatPulse visitors7d={42} actives7d={15} />
      );

      expect(html).toContain("42 visitors · 15 active (7d)");
      expect(html).toContain("Privacy-first telemetry measured over the last 7 days");
    });

    it("handles singular visitor correctly", () => {
      const html = renderWithQuery(
        <StatPulse visitors7d={1} actives7d={1} />
      );

      expect(html).toContain("1 visitor · 1 active (7d)");
    });

    it("renders fallback with 0 counts when passed 0", () => {
      const html = renderWithQuery(
        <StatPulse visitors7d={0} actives7d={0} />
      );

      expect(html).toContain("0 visitors · 0 active (7d)");
    });
  });

  describe("Public Showcase Integration", () => {
    it("renders StatPulse inside StoryProjectSection", () => {
      const html = renderWithQuery(
        <StoryProjectSection
          id="p1"
          name="Test Project"
          showcase_slug="test-proj"
          visitors7d={120}
          actives7d={34}
        />
      );

      expect(html).toContain("Test Project");
      expect(html).toContain("120 visitors · 34 active (7d)");
    });

    it("renders StatPulse inside IndexProjectRow", () => {
      const html = renderWithQuery(
        <IndexProjectRow
          userSlug="alice"
          projectSlug="test-proj"
          name="Test Project"
          visitors7d={88}
          actives7d={21}
        />
      );

      expect(html).toContain("Test Project");
      expect(html).toContain("88 visitors · 21 active (7d)");
    });
  });
});

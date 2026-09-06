import { ImageResponse } from "next/og";
import { getBySlug } from "@/features/profile/server/service";

export const runtime = "edge";
export const alt = "Pholio Showcase";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { profile } = await getBySlug(slug);

  const displayName = profile?.display_name || slug;
  const headline = profile?.headline || "Product engineer";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              color: "#09090b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "24px",
            }}
          >
            p/
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.05em" }}>
            pholio
          </span>
        </div>

        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          {displayName}
        </div>

        <div
          style={{
            fontSize: "32px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          {headline}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

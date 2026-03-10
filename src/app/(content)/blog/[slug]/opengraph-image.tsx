import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DOMAIN_COLORS: Record<string, string> = {
  "ai-governance": "#3b82f6",
  cybersecurity: "#06b6d4",
  "data-privacy": "#8b5cf6",
  "e-invoicing": "#22c55e",
  esg: "#eab308",
  fintech: "#f59e0b",
  "hr-compliance": "#ec4899",
  "tax-compliance": "#6366f1",
};

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await db.contentPage.findUnique({
    where: { slug },
    select: { title: true, category: true, tags: true, author: true },
  });

  const title = post?.title || "AIGovHub Blog";
  const category = post?.category || "ai-governance";
  const tags = post?.tags?.slice(0, 3) || [];
  const accentColor = DOMAIN_COLORS[category] || "#3b82f6";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
          padding: 60,
          position: "relative",
        }}
      >
        {/* Accent bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
          }}
        />

        {/* Category badge + Tags */}
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              background: accentColor,
              color: "white",
              padding: "8px 20px",
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {category.replace(/-/g, " ")}
          </div>
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#94a3b8",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 16,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            color: "white",
            fontSize: title.length > 80 ? 36 : title.length > 50 ? 44 : 52,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 1000,
            marginTop: 40,
          }}
        >
          {title}
        </div>

        {/* Footer: logo + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "#2563eb",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                fontWeight: 700,
                marginRight: 12,
              }}
            >
              A
            </div>
            <span style={{ color: "white", fontSize: 28, fontWeight: 600 }}>
              AIGovHub
            </span>
          </div>
          <span style={{ color: "#64748b", fontSize: 20 }}>
            aigovhub.io
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

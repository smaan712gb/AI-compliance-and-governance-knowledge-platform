import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AIGovHub - AI Governance & Compliance Platform";

export default function OGImage() {
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
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: "#2563eb",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 36,
              fontWeight: 700,
              marginRight: 16,
            }}
          >
            A
          </div>
          <span style={{ color: "white", fontSize: 48, fontWeight: 700 }}>
            AIGovHub
          </span>
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: 28,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          AI Governance & Compliance Platform
        </div>
        <div
          style={{
            color: "#64748b",
            fontSize: 20,
            marginTop: 20,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          EU AI Act Compliance Tools | Vendor Comparisons | Governance Toolkits
        </div>
      </div>
    ),
    { ...size }
  );
}

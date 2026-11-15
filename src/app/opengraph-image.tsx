import { ImageResponse } from "next/og";

// The link preview: a line from a real card offer with one term marked, the
// same mark-up a student sees on their own words.
export const alt = "Decode by Cense: a confusing money message in plain words";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFFCEC",
          padding: "72px 80px",
          color: "#275B2D",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 14, fontSize: 40, fontWeight: 700 }}>
          <span style={{ color: "#A8531F" }}>Cense</span>
          <span>Decode</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              fontSize: 54,
              lineHeight: 1.2,
              background: "#F6F3E1",
              borderRadius: 28,
              padding: "28px 36px",
            }}
          >
            <span>After that, a</span>
            <span
              style={{
                background: "#F7E4D6",
                borderBottom: "6px solid #C1652E",
                padding: "0 8px",
                fontWeight: 700,
              }}
            >
              variable APR
            </span>
            <span>applies.</span>
          </div>
          <div style={{ fontSize: 38, color: "#3A6B3E" }}>
            Plain words, how much it matters, and one next step.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#4A6E4D" }}>
          Free from Cense. Not financial advice.
        </div>
      </div>
    ),
    size
  );
}

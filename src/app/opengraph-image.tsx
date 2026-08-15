import { ImageResponse } from "next/og";

export const alt = "Phone Watchdog";
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
          justifyContent: "center",
          padding: "80px",
          background: "#1a0000",
          color: "#fef2f2",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          🐕 Phone Watchdog
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            marginTop: 24,
            maxWidth: 900,
            color: "#fca5a5",
          }}
        >
          Catches you on your phone via webcam and yells about it.
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f7b6c",
        }}
      >
        <div
          style={{
            width: 80,
            height: 44,
            borderLeft: "16px solid white",
            borderBottom: "16px solid white",
            transform: "rotate(-45deg) translateY(-8px)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}

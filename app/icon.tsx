import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 14,
            height: 8,
            borderLeft: "3px solid white",
            borderBottom: "3px solid white",
            transform: "rotate(-45deg) translateY(-2px)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}

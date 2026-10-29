import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../lib/useTheme";
import type { Caption } from "../lib/types";

// The spoken line, in a card at the bottom. When word timings exist the current word turns mint.
export const CaptionBar: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const now = frame / fps;
  const cap = captions.find((c) => now >= c.start && now < c.end);
  if (!cap) return null;
  return (
    <div style={{ position: "absolute", left: t.pad, right: t.pad, bottom: t.px(40), display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: t.c.surface, color: t.c.ink, border: `${t.bw}px solid ${t.c.line}`,
          borderRadius: t.radius, boxShadow: t.shadowSm, padding: `${t.px(16)}px ${t.px(30)}px`,
          fontFamily: t.fonts.body, fontWeight: 800, fontSize: t.fs.caption, lineHeight: 1.35, textAlign: "center",
          maxWidth: "100%",
        }}
      >
        {cap.words && cap.words.length
          ? cap.words.map((w, i) => {
              const on = now >= w.start && now < w.end;
              return (
                <span key={i} style={{ background: on ? t.pastel.mint : "transparent", color: on ? t.c.onPastel : t.c.ink, borderRadius: t.px(8), padding: `0 ${t.px(5)}px` }}>
                  {w.text}{" "}
                </span>
              );
            })
          : cap.text}
      </div>
    </div>
  );
};

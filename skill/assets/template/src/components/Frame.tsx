import React from "react";
import { AbsoluteFill } from "remotion";
import { useTheme } from "../lib/useTheme";
import { useExit } from "../lib/anim";
import { Mascot } from "./Mascot";
import { BandContext, MetaContext } from "../lib/meta";
import type { Band } from "../lib/types";
import { Sfx } from "../lib/sfx";
import type { Pastel } from "../theme";

// Site top bar: white card, bold outline, hard shadow, pink rounded "AI" square and the site name.
const TopBar: React.FC = () => {
  const t = useTheme();
  return (
    <div style={{ position: "absolute", left: t.pad, top: t.px(28), display: "inline-flex", alignItems: "center", gap: t.px(14), background: t.c.surface, border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.radius, boxShadow: t.shadow, padding: `${t.px(10)}px ${t.px(22)}px ${t.px(10)}px ${t.px(14)}px` }}>
      <span style={{ display: "grid", placeItems: "center", width: t.px(44), height: t.px(44), borderRadius: t.px(10), background: t.pastel.pink, border: `${t.px(2)}px solid ${t.c.line}`, color: t.c.onPastel, fontFamily: t.fonts.display, fontSize: t.px(18), fontWeight: 700 }}>{t.brand.mark}</span>
      <span style={{ fontFamily: t.fonts.display, fontSize: t.px(24), fontWeight: 700, color: t.c.ink }}>{t.brand.name}</span>
    </div>
  );
};

// Every scene sits in a Frame: a full-width colour band (like the site's sections), soft pastel stickers, safe padding.
export const Frame: React.FC<{ accent?: Pastel; band?: Band; first?: boolean; durationInFrames: number; mascot?: boolean; children: React.ReactNode }> = ({
  accent = "mint", band = "bg", first, durationInFrames, mascot, children,
}) => {
  const t = useTheme();
  const o = useExit(durationInFrames);
  const s = t.px(150);
  const meta = React.useContext(MetaContext);
  const captionRoom = meta.captions === "off" ? 0 : t.px(170);
  const topbar = meta.topbar !== false;
  const topRoom = topbar ? t.px(60) : 0;
  const bg = band === "bg" ? t.c.bg : band === "surface" ? t.c.surface : t.pastel[band];
  return (
    <BandContext.Provider value={band}>
      <AbsoluteFill style={{ background: bg, fontFamily: t.fonts.body, opacity: o }}>
        <div style={{ position: "absolute", right: -s * 0.25, top: -s * 0.25, width: s, height: s, background: t.pastel[accent], opacity: 0.55, borderRadius: t.px(30), transform: "rotate(14deg)", border: `${t.bw}px solid ${t.c.line}` }} />
        <div style={{ position: "absolute", left: -s * 0.3, bottom: captionRoom - s * 0.35, width: s * 0.8, height: s * 0.8, background: t.pastel.lav, opacity: 0.6, borderRadius: 999, border: `${t.bw}px solid ${t.c.line}` }} />
        <Sfx cue={first ? "open" : "swipe"} />
        {topbar && <TopBar />}
        <AbsoluteFill style={{ padding: t.pad, paddingTop: t.pad * 0.5 + topRoom, paddingBottom: t.pad * 0.5 + captionRoom, justifyContent: "center" }}>{children}</AbsoluteFill>
        {mascot && (
          <div style={{ position: "absolute", right: t.pad * 0.6, bottom: captionRoom + t.px(10), opacity: 0.95 }}>
            <Mascot size={t.px(130)} />
          </div>
        )}
      </AbsoluteFill>
    </BandContext.Provider>
  );
};

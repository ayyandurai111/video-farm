import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { MetaContext } from "./meta";

// Sound effects come from the offline npm package "uisfx" (MIT, 12 packs x 78 cues).
// build_video.py copies the cues listed here from node_modules/uisfx/sounds/<pack>/ into public/sfx/.
export const SFX_CUES = ["swipe", "open", "drop", "select", "snap", "focus", "success", "progress-step"] as const;
export type Cue = (typeof SFX_CUES)[number];

// Plays one cue at `delay` frames after the start of the scene it is placed in. rate shifts the pitch a little.
export const Sfx: React.FC<{ cue: Cue; delay?: number; rate?: number; gain?: number }> = ({ cue, delay = 0, rate = 1, gain = 1 }) => {
  const meta = React.useContext(MetaContext);
  const { fps } = useVideoConfig();
  const cfg = meta.sfx;
  if (!cfg || cfg === "off" || !cfg.pack) return null;
  return (
    <Sequence from={Math.max(0, Math.round(delay))} durationInFrames={Math.ceil(fps * 2)} layout="none">
      <Audio src={staticFile(`sfx/${cue}.mp3`)} volume={Math.min(1, (cfg.volume ?? 0.9) * gain)} playbackRate={rate} />
    </Sequence>
  );
};

// A slightly different pitch for each item so a row of cards does not sound like one repeated sample.
export const pitch = (i: number) => [1, 1.07, 0.94, 1.12, 0.98][i % 5];

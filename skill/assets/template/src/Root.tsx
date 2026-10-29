import React from "react";
import { Audio, Composition, Sequence, staticFile } from "remotion";
import "./lib/fonts";
import { Frame } from "./components/Frame";
import { CaptionBar } from "./components/CaptionBar";
import { registryOf } from "./brands/scenes";
import { MetaContext } from "./lib/meta";
import type { Band, Caption, ScenesFile } from "./lib/types";
import scenesFile from "./data/scenes.json";
import captionsFile from "./data/captions.json";

const data = scenesFile as unknown as ScenesFile;
const captions = captionsFile as unknown as Caption[];
// Default band per layout, like the site: white bands for lists and cards, blue band for the call to action.
const BAND: Record<string, Band> = { bullets: "surface", features: "surface", steps: "surface", facts: "bg", outro: "blue" };
const SIZES = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] } as const;

const Video: React.FC = () => {
  const { meta, scenes } = data;
  const fps = meta.fps ?? 30;
  const registry = registryOf(meta.brandTheme); // only the layouts of this brand are loaded
  return (
    <MetaContext.Provider value={meta}>
      {scenes.map((s, idx) => {
        const from = Math.round(s.start * fps);
        const total = Math.max(1, Math.round((s.end - s.start) * fps));
        const Scene = registry[s.layout];
        if (!Scene) throw new Error(`Scene ${s.id}: layout '${s.layout}' is not available in brand '${meta.brandTheme ?? "handson"}'`);
        return (
          <Sequence key={s.id} from={from} durationInFrames={total} name={`${s.id} (${s.layout})`}>
            <Frame accent={s.accent} band={s.band ?? BAND[s.layout] ?? "bg"} first={idx === 0} durationInFrames={total} mascot={meta.mascot && (s.layout === "stat" || s.layout === "quote")}>
              <Scene {...s} total={total} />
            </Frame>
          </Sequence>
        );
      })}
      {meta.captions !== "off" && <CaptionBar captions={captions} />}
      {meta.audio && <Audio src={staticFile(meta.audio)} />}
    </MetaContext.Provider>
  );
};

export const Root: React.FC = () => {
  const { meta } = data;
  const [width, height] = SIZES[meta.aspect ?? "16:9"];
  const fps = meta.fps ?? 30;
  return <Composition id="Video" component={Video} durationInFrames={Math.max(1, Math.ceil(meta.duration * fps))} fps={fps} width={width} height={height} />;
};

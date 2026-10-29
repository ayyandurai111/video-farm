import { staticFile, continueRender, delayRender } from "remotion";
import { loadFont } from "@remotion/fonts";

const faces: [string, number, string, string?][] = [
  ["Nunito", 400, "nunito-latin-400-normal.woff2"],
  ["Nunito", 600, "nunito-latin-600-normal.woff2"],
  ["Nunito", 700, "nunito-latin-700-normal.woff2"],
  ["Nunito", 800, "nunito-latin-800-normal.woff2"],
  ["Noto Sans Tamil", 400, "noto-sans-tamil-tamil-400-normal.woff2"],
  ["Noto Sans Tamil", 700, "noto-sans-tamil-tamil-700-normal.woff2"],
  ["Noto Sans Tamil", 800, "noto-sans-tamil-tamil-800-normal.woff2"],
  ["JetBrains Mono", 400, "jetbrains-mono-latin-400-normal.woff2"],
];

const handle = delayRender("Loading fonts");
Promise.all(
  faces.map(([family, weight, file]) =>
    loadFont({ family, url: staticFile(`fonts/${file}`), weight: String(weight) }),
  ),
)
  .then(() => continueRender(handle))
  .catch((e) => {
    console.error("Font load failed", e);
    continueRender(handle);
  });

import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

// Pop-in like a sticker landing on the page. delay is in frames.
export function usePop(delay = 0, rotate = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 150 } });
  return {
    p,
    style: {
      opacity: Math.min(1, p * 1.6),
      transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + 0.08 * p}) rotate(${rotate * p}deg)`,
    } as const,
  };
}

// Fade the whole scene out in its last frames so cuts feel soft.
export function useExit(durationInFrames: number, frames = 6) {
  const frame = useCurrentFrame();
  return interpolate(frame, [durationInFrames - frames, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// Which scene layouts each brand can use. Each brand's own components live in src/brands/<brand>/ and are loaded only for that brand.
// "handson" has the shared layouts. "channel" has the shared layouts plus the physics ones.
import type React from "react";
import { registry as shared } from "../scenes";
import { channelRegistry } from "./channel/scenes";
import { isBrand, type BrandName } from "./themes";

export const REGISTRIES: Record<BrandName, Record<string, React.FC<any>>> = {
  handson: { ...shared },
  channel: { ...shared, ...channelRegistry },
};
export const registryOf = (name?: string) => REGISTRIES[isBrand(name) ? name : "handson"];

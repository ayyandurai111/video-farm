import { createContext } from "react";
import type { Meta, Band } from "./types";
export const MetaContext = createContext<Meta>({ title: "", duration: 1 });
// Which full-width band the current scene sits on. Cards on the "surface" band turn soft, like the site's problem and feature cards.
export const BandContext = createContext<Band>("bg");

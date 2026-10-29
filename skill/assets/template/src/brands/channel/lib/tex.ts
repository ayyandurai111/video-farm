// A small LaTeX-subset reader for physics formulas. No dependencies, so it runs the same in every renderer.
// Supported: letters, digits, + - = and friends, ^ and _ (with or without braces), \frac{a}{b}, \sqrt{x}, \vec{F}, \hat{n}, \bar{x},
// \hl{part} (highlighter, numbered in reading order), \text{words}, Greek (\theta \Delta ...), \cdot \times \pm \approx \propto \infty \partial \nabla \degree,
// \sin \cos \tan \ln \log \exp, \, (thin space) and \quad.
export type Node =
  | { k: "ch"; s: string }                       // one character, drawn italic or upright depending on what it is
  | { k: "fn"; s: string }                       // upright function name: sin, cos, ln ...
  | { k: "text"; s: string }                     // upright words
  | { k: "space"; w: number }                    // width in em
  | { k: "frac"; n: Node[]; d: Node[] }
  | { k: "sqrt"; c: Node[] }
  | { k: "acc"; kind: "vec" | "hat" | "bar"; c: Node[] }
  | { k: "hl"; c: Node[]; id: number }
  | { k: "scripts"; base: Node | null; sup?: Node[]; sub?: Node[] };

const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
  pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  cdot: "·", times: "×", pm: "±", mp: "∓", approx: "≈", propto: "∝", neq: "≠", leq: "≤", geq: "≥", ll: "≪", gg: "≫",
  rightarrow: "→", to: "→", leftarrow: "←", infty: "∞", partial: "∂", nabla: "∇", degree: "°", circ: "°", hbar: "ħ", ell: "ℓ", int: "∫", sum: "∑", dots: "…", div: "÷",
};
const FUNCS = new Set(["sin", "cos", "tan", "ln", "log", "exp", "max", "min", "lim"]);

export function parseTex(src: string): Node[] {
  let i = 0;
  let hlCount = 0;
  const peek = () => src[i];

  function group(): Node[] {                      // one {...} group, or a single token when there are no braces
    skipSpaces();
    if (peek() === "{") {
      i++;
      const out = seq("}");
      if (peek() === "}") i++;
      return out;
    }
    const one = atom();
    return one ? [one] : [];
  }
  function skipSpaces() { while (i < src.length && /\s/.test(src[i])) i++; }

  function command(): Node | null {
    i++; // the backslash
    if (i >= src.length) return null;
    if (!/[a-zA-Z]/.test(src[i])) {               // \, \; \  \{ \}
      const c = src[i++];
      if (c === ",") return { k: "space", w: 0.17 };
      if (c === ";" || c === " ") return { k: "space", w: 0.28 };
      return { k: "ch", s: c };
    }
    let name = "";
    while (i < src.length && /[a-zA-Z]/.test(src[i])) name += src[i++];
    if (name === "frac") { const n = group(); const d = group(); return { k: "frac", n, d }; }
    if (name === "sqrt") return { k: "sqrt", c: group() };
    if (name === "vec" || name === "hat" || name === "bar") return { k: "acc", kind: name, c: group() };
    if (name === "hl") { const id = hlCount++; return { k: "hl", c: group(), id }; }
    if (name === "text" || name === "mathrm" || name === "unit") {
      skipSpaces();
      let s = "";
      if (peek() === "{") { i++; let depth = 1; while (i < src.length && depth) { const c = src[i++]; if (c === "{") depth++; else if (c === "}") { depth--; if (!depth) break; } if (depth) s += c; } }
      return { k: "text", s };
    }
    if (name === "quad") return { k: "space", w: 1 };
    if (name === "qquad") return { k: "space", w: 2 };
    if (FUNCS.has(name)) return { k: "fn", s: name };
    if (name in SYMBOLS) return { k: "ch", s: SYMBOLS[name] };
    return { k: "text", s: name };                // unknown command: show its name rather than crash
  }

  function atom(): Node | null {
    skipSpaces();
    if (i >= src.length) return null;
    const c = peek();
    if (c === "\\") return command();
    if (c === "{") { const g = group(); return g.length === 1 ? g[0] : { k: "hl", c: g, id: -1 }; } // plain group, id -1 = not highlighted
    i++;
    return { k: "ch", s: c === "-" ? "−" : c === "*" ? "·" : c };
  }

  function seq(stop?: string): Node[] {
    const out: Node[] = [];
    for (;;) {
      skipSpaces();
      if (i >= src.length || (stop && peek() === stop)) break;
      const c = peek();
      if (c === "^" || c === "_") {
        i++;
        const g = group();
        const prev = out.length ? out[out.length - 1] : null;
        if (prev && prev.k === "scripts") {
          if (c === "^") prev.sup = g; else prev.sub = g;
        } else {
          const base = out.pop() ?? null;
          out.push(c === "^" ? { k: "scripts", base, sup: g } : { k: "scripts", base, sub: g });
        }
        continue;
      }
      const a = atom();
      if (a) out.push(a);
      if (a && a.k === "fn" && src[i] !== "^" && src[i] !== "_") out.push({ k: "space", w: 0.12 });
    }
    return out;
  }
  return seq();
}

// Plain-text rendering, used by tests and for the alt text of a formula.
export function texToText(nodes: Node[]): string {
  return nodes.map((n): string => {
    switch (n.k) {
      case "ch": return n.s;
      case "fn": return n.s;
      case "text": return n.s;
      case "space": return " ";
      case "frac": return `(${texToText(n.n)})/(${texToText(n.d)})`;
      case "sqrt": return `√(${texToText(n.c)})`;
      case "acc": return `${n.kind}(${texToText(n.c)})`;
      case "hl": return texToText(n.c);
      case "scripts": return `${n.base ? texToText([n.base]) : ""}${n.sup ? `^(${texToText(n.sup)})` : ""}${n.sub ? `_(${texToText(n.sub)})` : ""}`;
    }
  }).join("");
}

export const countHighlights = (nodes: Node[]): number => {
  let n = 0;
  const walk = (list: Node[]) => list.forEach((x) => {
    if (x.k === "hl") { if (x.id >= 0) n++; walk(x.c); }
    else if (x.k === "frac") { walk(x.n); walk(x.d); }
    else if (x.k === "sqrt" || x.k === "acc") walk(x.c);
    else if (x.k === "scripts") { if (x.base) walk([x.base]); if (x.sup) walk(x.sup); if (x.sub) walk(x.sub); }
  });
  walk(nodes);
  return n;
};

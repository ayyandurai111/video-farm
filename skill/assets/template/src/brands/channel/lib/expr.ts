// A tiny, safe formula evaluator for graph lines, so scenes.json can say "0.5*9.8*x^2" without eval().
// Supports + - * / ^, brackets, 2x and 2(x+1), the variable x (or t), pi, e and sin cos tan asin acos atan exp ln log sqrt abs.
type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };
const FN: Record<string, (a: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs,
};
const CONST: Record<string, number> = { pi: Math.PI, e: Math.E };

function lex(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push({ t: "num", v: parseFloat(s.slice(i, j)) }); i = j; continue; }
    if (/[a-zA-Z_]/.test(c)) { let j = i; while (j < s.length && /[a-zA-Z_0-9]/.test(s[j])) j++; out.push({ t: "id", v: s.slice(i, j) }); i = j; continue; }
    if ("+-*/^(),".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`bad character '${c}' in formula "${s}"`);
  }
  return out;
}

export type Fn = (x: number) => number;

export function compile(src: string): Fn {
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && (peek() as { v: string }).v === v;

  // Each parse function returns a closure over x.
  function expr(): Fn {
    let l = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[p++] as { v: string }).v; const a = l; const b = term();
      l = op === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x);
    }
    return l;
  }
  function term(): Fn {
    let l = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = (toks[p++] as { v: string }).v; const a = l; const b = unary();
        l = op === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
      } else if (peek() && (peek().t === "num" || peek().t === "id" || isOp("("))) { // implicit multiplication: 2x, 2(x+1)
        const a = l; const b = power();
        l = (x) => a(x) * b(x);
      } else break;
    }
    return l;
  }
  function unary(): Fn {
    if (isOp("-")) { p++; const a = unary(); return (x) => -a(x); }
    if (isOp("+")) { p++; return unary(); }
    return power();
  }
  function power(): Fn {
    const base = primary();
    if (isOp("^")) { p++; const e = unary(); return (x) => Math.pow(base(x), e(x)); } // right-associative, and -x^2 means -(x^2)
    return base;
  }
  function primary(): Fn {
    const t = toks[p++];
    if (!t) throw new Error(`formula "${src}" ended too early`);
    if (t.t === "num") { const v = t.v; return () => v; }
    if (t.t === "id") {
      if (t.v in FN && isOp("(")) { p++; const a = expr(); if (!isOp(")")) throw new Error("missing )"); p++; const f = FN[t.v]; return (x) => f(a(x)); }
      if (t.v in CONST) { const v = CONST[t.v]; return () => v; }
      if (t.v === "x" || t.v === "t") return (x) => x;
      throw new Error(`unknown name '${t.v}' in formula "${src}"`);
    }
    if (t.v === "(") { const a = expr(); if (!isOp(")")) throw new Error("missing )"); p++; return a; }
    throw new Error(`unexpected '${t.v}' in formula "${src}"`);
  }
  const f = expr();
  if (p < toks.length) throw new Error(`could not read the end of formula "${src}"`);
  return f;
}

export const sample = (src: string, min: number, max: number, n = 160): [number, number][] => {
  const f = compile(src);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const x = min + ((max - min) * i) / n; const y = f(x); if (Number.isFinite(y)) out.push([x, y]); }
  return out;
};

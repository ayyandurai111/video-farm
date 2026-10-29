// Video farm MCP server for Cloudflare Workers (free tier). Stateless streamable-HTTP MCP, no dependencies.
// Tools start and watch GitHub Actions renders (.github/workflows/render-api.yml) through the GitHub REST API.
// Secrets: GH_PAT (fine-grained token: Actions rw, Contents rw on the repo), MCP_SECRET (random string, part of the URL path).
// Var: REPO ("owner/name"). The connector URL is https://<worker>/mcp/<MCP_SECRET>.

import { INSTRUCTIONS, GUIDES } from "./guide.js";
import { SCHEMA } from "./schema.js";

const WORKFLOW = "render-api.yml";
const VERSION = "2.0.0";
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_PAYLOAD = 60000; // workflow_dispatch inputs are limited to about 65 KB

const TOOLS = [
  {
    name: "submit_render",
    description:
      "Start a video render on GitHub Actions (4 cores). Send the caption text and, ideally, the scenes. The render has sound effects but NO narration; mix the user's audio into the finished MP4 afterwards (ffmpeg, scripts/mux_audio.py). Returns a job_id; then poll render_status.",
    inputSchema: {
      type: "object",
      properties: {
        captions: { type: "string", description: "Caption file text (.srt or .vtt content), or a JSON array of {start,end,text} in seconds." },
        scenes: { type: "string", description: "Optional scenes.json content as a JSON string ({meta?, scenes:[...]} or just the scenes array). Without it a rough automatic layout is used." },
        options: {
          type: "object",
          description: "audience (everyone = plain words, the default; expert = symbols and formulas), brand_theme (handson|channel, which look and which layouts; ask the user if not said), aspect (16:9|9:16|1:1), theme (light|dark), brand, brand_mark, title, subtitle, tagline, cta, url, sfx (pack name or off), sfx_volume (0 to 1), no_topbar, no_captions, mascot",
          additionalProperties: true,
        },
      },
      required: ["captions"],
    },
  },
  {
    name: "validate_scenes",
    description: "Check scenes.json against the captions BEFORE rendering (layouts, required fields, limits, exact caption timing, gaps). Returns errors and warnings. Fix every error, then call submit_render.",
    inputSchema: { type: "object", properties: { captions: { type: "string", description: "Same captions as for submit_render." }, scenes: { type: "string", description: "scenes.json content as a JSON string ({meta?, scenes:[...]} or the scenes array)." }, brand_theme: { type: "string", description: "handson or channel. Defaults to meta.brandTheme, else handson." } }, required: ["captions", "scenes"] },
  },
  {
    name: "get_guide",
    description: "Read the video design guide. Call with no topic to list topics; call get_guide('scene-guide') before writing scenes for the first time in a chat.",
    inputSchema: { type: "object", properties: { topic: { type: "string" } } },
  },
  { name: "render_status", description: "Status of a render: queued, in_progress, success, failed or cancelled, plus the run link.", inputSchema: { type: "object", properties: { job_id: { type: "string" } }, required: ["job_id"] } },
  { name: "get_video", description: "Download link and size of a finished render plus 4 preview frame URLs (public GitHub release assets). Download with curl -L, look at the previews, then mix the user's audio into the video.", inputSchema: { type: "object", properties: { job_id: { type: "string" } }, required: ["job_id"] } },
  { name: "cancel_render", description: "Cancel a queued or running render.", inputSchema: { type: "object", properties: { job_id: { type: "string" } }, required: ["job_id"] } },
  { name: "list_jobs", description: "Recent renders with their status.", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 30 } } } },
];

const J = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*", ...extra } });

async function gh(env, path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GH_PAT}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "video-farm-mcp",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  return res;
}

const validId = (id) => typeof id === "string" && /^[a-z0-9-]{4,40}$/.test(id);
const newId = () => "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function mapRun(r) {
  let state = r.status; // queued | in_progress | completed
  if (r.status === "completed") state = r.conclusion === "success" ? "success" : r.conclusion === "cancelled" ? "cancelled" : "failed";
  return { state, run_id: r.id, run_url: r.html_url, created_at: r.created_at, updated_at: r.updated_at };
}

async function findRun(env, id) {
  const res = await gh(env, `/repos/${env.REPO}/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=40`);
  if (!res.ok) throw new Error(`GitHub runs lookup failed: ${res.status}`);
  const data = await res.json();
  return (data.workflow_runs || []).find((r) => r.display_title === `render ${id}` || r.name === `render ${id}`);
}

// ---- scene validation (port of scripts/check_scenes.py) ----
const BRANDS = SCHEMA.brands;
const texProblems = (tex) => {
  const out = []; let depth = 0;
  for (const ch of String(tex)) { depth += (ch === "{") - (ch === "}"); if (depth < 0) break; }
  if (depth !== 0) out.push("unbalanced { }");
  for (const m of String(tex).matchAll(/\\([a-zA-Z]+)/g)) if (!SCHEMA.tex_commands.includes(m[1])) out.push(`unknown command \\${m[1]}`);
  return out;
};
const EXPR_OK = /^[0-9a-zA-Z_+\-*/^().,\s]*$/;
function checkChannel(s, id, errors, warnings) {
  const L = s.layout;
  for (const k of ["tex", "equation"]) if (typeof s[k] === "string") texProblems(s[k]).forEach((p) => errors.push(`${id}: formula in '${k}': ${p}`));
  if (L === "derivation") (s.lines || []).forEach((ln, i) => { const t = typeof ln === "string" ? ln : ln?.tex; if (!t) errors.push(`${id}: derivation line ${i + 1} needs tex`); else texProblems(t).forEach((p) => errors.push(`${id}: derivation line ${i + 1}: ${p}`)); });
  if (L === "graph") (s.series || []).forEach((se, i) => {
    if (!(se.points?.length || se.expr)) errors.push(`${id}: graph series ${i + 1} needs 'points' or 'expr'`);
    if (se.expr && !EXPR_OK.test(se.expr)) errors.push(`${id}: graph series ${i + 1} expr has characters that are not allowed`);
    if (se.expr && !s.xRange) warnings.push(`${id}: graph with 'expr' should set xRange (default 0 to 10)`);
    if (se.color && !SCHEMA.color_keys.includes(se.color) && !String(se.color).startsWith("#")) warnings.push(`${id}: unknown colour ${JSON.stringify(se.color)}`);
  });
  if (L === "freebody") (s.forces || []).forEach((f, i) => { if (typeof f.angle !== "number" || typeof f.mag !== "number" || !f.label) errors.push(`${id}: force ${i + 1} needs label, angle (degrees, 0 = right, 90 = up) and mag (number)`); });
  if (L === "analogy") for (const side of ["left", "right"]) if (!s[side]?.title) errors.push(`${id}: ${side} needs a title`);
  if (L === "timeline") (s.events || []).forEach((e, i) => { if (!(e.year && e.text)) errors.push(`${id}: event ${i + 1} needs year and text`); });
  if (L === "units") (s.rows || []).forEach((r, i) => { for (const k of ["name", "symbol", "unit"]) if (!r[k]) errors.push(`${id}: units row ${i + 1} needs '${k}'`); for (const k of ["symbol", "unit"]) texProblems(r[k] || "").forEach((p) => errors.push(`${id}: units row ${i + 1} ${k}: ${p}`)); });
  if (L === "quantity") for (const k of ["value", "unit", "symbol"]) if (typeof s[k] === "string") texProblems(s[k]).forEach((p) => errors.push(`${id}: quantity ${k}: ${p}`));
  if (L === "sim") {
    const known = SCHEMA.sims[s.sim];
    if (!known) { errors.push(`${id}: unknown simulation ${JSON.stringify(s.sim)}. Valid: ${Object.keys(SCHEMA.sims).join(", ")}`); return; }
    const params = s.params || {};
    for (const [k, v] of Object.entries(params)) {
      if (!(k in known)) warnings.push(`${id}: simulation ${s.sim} has no parameter '${k}' (it has: ${Object.keys(known).join(", ")})`);
      else if (typeof known[k] === "number" && typeof v !== "number") errors.push(`${id}: parameter '${k}' must be a number`);
    }
    if (s.sim === "wave" && !SCHEMA.wave_modes.includes(params.mode ?? "travel")) errors.push(`${id}: wave mode must be one of ${SCHEMA.wave_modes.join(", ")}`);
    if (s.sim === "circuit" && !SCHEMA.circuit_modes.includes(params.mode ?? "series")) errors.push(`${id}: circuit mode must be one of ${SCHEMA.circuit_modes.join(", ")}`);
  }
}
const TOL = 0.05;

function tsec(t) { const p = t.trim().replace(",", ".").split(":").map(Number); while (p.length < 3) p.unshift(0); return Math.round((p[0] * 3600 + p[1] * 60 + p[2]) * 1000) / 1000; }
export function parseCaptions(input) {
  let list;
  if (Array.isArray(input)) list = input.map((c) => ({ start: +c.start, end: +c.end, text: String(c.text || "").trim() }));
  else {
    list = [];
    for (const block of String(input).replace(/\r/g, "").replace(/^\ufeff/, "").trim().split(/\n\s*\n/)) {
      const lines = block.split("\n").filter((l) => l.trim());
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) continue;
      const [a, b] = lines[i].split("-->");
      const text = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").trim();
      if (text) list.push({ start: tsec(a), end: tsec(b.trim().split(/\s+/)[0]), text });
    }
  }
  list.sort((x, y) => x.start - y.start);
  list.forEach((c, i) => { c.id = i + 1; if (c.end <= c.start) c.end = +(c.start + 1).toFixed(3); });
  return list;
}

export function validateScenes(captionsIn, scenesIn, brandIn) {
  const errors = [], warnings = [];
  const caps = parseCaptions(captionsIn);
  if (!caps.length) return { ok: false, errors: ["No captions could be read."], warnings };
  let sc = scenesIn;
  if (typeof sc === "string") { try { sc = JSON.parse(sc); } catch { return { ok: false, errors: ["scenes is not valid JSON."], warnings }; } }
  const scenes = Array.isArray(sc) ? sc : sc?.scenes;
  if (!Array.isArray(scenes) || !scenes.length) return { ok: false, errors: ["scenes must be an array (or {scenes:[...]})."], warnings };
  const brand = brandIn || (!Array.isArray(sc) && sc?.meta?.brandTheme) || "handson";
  if (!BRANDS.includes(brand)) { errors.push(`unknown brand theme ${JSON.stringify(brand)}. Valid: ${BRANDS.join(", ")}`); }
  const mine = Object.fromEntries(Object.entries(SCHEMA.layouts).filter(([, d]) => d.brands.includes(BRANDS.includes(brand) ? brand : "handson")));
  const starts = caps.map((c) => c.start), ends = caps.map((c) => c.end);
  let prevEnd = null;
  scenes.forEach((s, idx) => {
    const id = s.id || `scene ${idx + 1}`;
    const spec = mine[s.layout];
    if (!spec) {
      const other = SCHEMA.layouts[s.layout];
      errors.push(other
        ? `${id}: layout ${JSON.stringify(s.layout)} is not available in brand ${JSON.stringify(brand)} (it belongs to the ${other.brands.join(", ")} brand only). Valid: ${Object.keys(mine).join(", ")}`
        : `${id}: unknown layout ${JSON.stringify(s.layout)}. Valid for brand ${JSON.stringify(brand)}: ${Object.keys(mine).join(", ")}`);
      if (typeof s.end === "number") prevEnd = s.end;
      return;
    }
    for (const f of spec.req) if (!s[f] || (Array.isArray(s[f]) && !s[f].length)) errors.push(`${id}: layout ${s.layout} needs '${f}'`);
    if (spec.limit && (s[spec.limit[0]] || []).length > spec.limit[1]) errors.push(`${id}: too many ${spec.limit[0]} for ${s.layout} (max ${spec.limit[1]})`);
    if (!spec.brands.includes("handson")) checkChannel(s, id, errors, warnings);
    if (typeof s.start !== "number" || typeof s.end !== "number") { errors.push(`${id}: start and end must be numbers (seconds)`); return; }
    if (!starts.some((x) => Math.abs(s.start - x) <= TOL)) errors.push(`${id}: start ${s.start} is not the start of any caption`);
    if (!ends.some((x) => Math.abs(s.end - x) <= TOL)) errors.push(`${id}: end ${s.end} is not the end of any caption`);
    if (prevEnd !== null && Math.abs(s.start - prevEnd) > TOL) errors.push(`${id}: gap or overlap, previous scene ended at ${prevEnd}, this one starts at ${s.start}`);
    if (s.end - s.start < 1.5) warnings.push(`${id}: very short scene (${(s.end - s.start).toFixed(1)}s)`);
    for (const k of ["title", "text", "label", "subtitle", "question", "answer"]) if (typeof s[k] === "string" && s[k].length > 90) warnings.push(`${id}: '${k}' is ${s[k].length} characters, may not fit`);
    if (idx >= 2 && scenes[idx - 1].layout === s.layout && scenes[idx - 2].layout === s.layout) warnings.push(`${id}: same layout (${s.layout}) three times in a row`);
    prevEnd = s.end;
  });
  if (scenes[0].start > TOL) warnings.push(`first scene starts at ${scenes[0].start}s, the video opens with an empty page before it`);
  if (scenes[0].layout !== "title") warnings.push("the first scene is not a title");
  if (scenes[scenes.length - 1].layout !== "outro") warnings.push("the last scene is not an outro");
  const lastEnd = caps[caps.length - 1].end;
  if (Math.abs(scenes[scenes.length - 1].end - lastEnd) > 0.2) errors.push(`last scene ends at ${scenes[scenes.length - 1].end} but the captions end at ${lastEnd}`);
  const missing = caps.filter((c) => !scenes.some((s) => s.start - TOL <= c.start && c.end <= s.end + TOL)).map((c) => c.id);
  if (missing.length) errors.push(`captions not inside any scene: ${missing.join(", ")}`);
  return { ok: !errors.length, errors, warnings, captions: caps.length, scenes: scenes.length };
}

const tools = {
  async validate_scenes(env, a) { return validateScenes(a.captions, a.scenes, a.brand_theme); },
  async get_guide(env, a) {
    if (!a.topic) return { topics: Object.fromEntries(Object.entries(GUIDES).map(([k, v]) => [k, v.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 110) || ""])), note: "Call get_guide with a topic name." };
    const g = GUIDES[a.topic];
    if (!g) throw new Error(`Unknown topic. Topics: ${Object.keys(GUIDES).join(", ")}`);
    return g;
  },
  async submit_render(env, a) {
    if (!a.captions || (typeof a.captions !== "string" && !Array.isArray(a.captions))) throw new Error("captions is required (SRT/VTT text or an array of {start,end,text}).");
    let scenes = a.scenes;
    if (typeof scenes === "string") { try { scenes = JSON.parse(scenes); } catch { throw new Error("scenes must be valid JSON."); } }
    const opts = a.options || {};
    const brand = opts.brand_theme ?? opts["brand-theme"] ?? (scenes && !Array.isArray(scenes) ? scenes.meta?.brandTheme : undefined) ?? "handson";
    if (!BRANDS.includes(brand)) throw new Error(`brand_theme must be one of ${BRANDS.join(", ")} (got ${JSON.stringify(brand)}).`);
    const list = Array.isArray(scenes) ? scenes : scenes?.scenes;
    const wrong = (list || []).filter((x) => !SCHEMA.layouts[x.layout]?.brands.includes(brand)).map((x) => `${x.id || "?"}: ${x.layout}`);
    if (wrong.length) throw new Error(`These layouts are not available in brand "${brand}": ${wrong.join(", ")}. Call validate_scenes, or switch brand_theme.`);
    const payload = JSON.stringify({ captions: a.captions, scenes: scenes ?? null, options: opts });
    if (payload.length > MAX_PAYLOAD) throw new Error(`Payload is ${payload.length} characters, the limit is ${MAX_PAYLOAD}. Shorten the captions or scenes.`);
    const job_id = newId();
    const res = await gh(env, `/repos/${env.REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: env.BRANCH || "main", inputs: { job_id, payload } }),
    });
    if (res.status !== 204) throw new Error(`GitHub refused the dispatch (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return { job_id, state: "queued", next: "Poll render_status every 20 to 30 seconds. A 30 s video usually takes 1 to 2 minutes." };
  },
  async render_status(env, a) {
    if (!validId(a.job_id)) throw new Error("bad job_id");
    const run = await findRun(env, a.job_id);
    if (!run) return { job_id: a.job_id, state: "queued", note: "The run has not appeared yet. Try again in 10 seconds." };
    return { job_id: a.job_id, ...mapRun(run) };
  },
  async get_video(env, a) {
    if (!validId(a.job_id)) throw new Error("bad job_id");
    const res = await gh(env, `/repos/${env.REPO}/releases/tags/render-${a.job_id}`);
    if (res.status === 404) return { job_id: a.job_id, ready: false, note: "No video yet. Check render_status." };
    if (!res.ok) throw new Error(`GitHub release lookup failed: ${res.status}`);
    const rel = await res.json();
    const asset = (rel.assets || []).find((x) => x.name.endsWith(".mp4"));
    if (!asset) return { job_id: a.job_id, ready: false, note: "Release exists but the video is still uploading." };
    const previews = (rel.assets || []).filter((x) => x.name.endsWith(".png")).sort((x, y) => x.name.localeCompare(y.name)).map((x) => x.browser_download_url);
    return { job_id: a.job_id, ready: true, url: asset.browser_download_url, size_mb: +(asset.size / 1e6).toFixed(1), previews, note: "Public links. Download with curl -L, LOOK at the previews, then mix the user's audio into the video (see instructions step 6)." };
  },
  async cancel_render(env, a) {
    if (!validId(a.job_id)) throw new Error("bad job_id");
    const run = await findRun(env, a.job_id);
    if (!run) throw new Error("Run not found.");
    const res = await gh(env, `/repos/${env.REPO}/actions/runs/${run.id}/cancel`, { method: "POST" });
    return { job_id: a.job_id, cancelled: res.status === 202, status: res.status };
  },
  async list_jobs(env, a) {
    const n = Math.min(30, Math.max(1, a.limit || 10));
    const res = await gh(env, `/repos/${env.REPO}/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=${n}`);
    if (!res.ok) throw new Error(`GitHub runs lookup failed: ${res.status}`);
    const data = await res.json();
    return { jobs: (data.workflow_runs || []).map((r) => ({ job_id: (r.display_title || "").replace(/^render /, ""), ...mapRun(r) })) };
  },
};

async function rpc(env, msg) {
  const { id, method, params } = msg;
  const isNote = id === undefined || id === null;
  const ok = (result) => (isNote ? null : { jsonrpc: "2.0", id, result });
  const err = (code, message) => (isNote ? null : { jsonrpc: "2.0", id, error: { code, message } });
  switch (method) {
    case "initialize": {
      const want = params?.protocolVersion;
      return ok({ protocolVersion: SUPPORTED.includes(want) ? want : SUPPORTED[0], capabilities: { tools: { listChanged: false }, resources: { listChanged: false } }, serverInfo: { name: "video-farm", version: VERSION }, instructions: INSTRUCTIONS });
    }
    case "ping": return ok({});
    case "resources/list": return ok({ resources: Object.keys(GUIDES).map((k) => ({ uri: `guide://${k}`, name: k, mimeType: "text/markdown", description: "Video design guide: " + k })) });
    case "resources/read": {
      const k = String(params?.uri || "").replace("guide://", "");
      if (!GUIDES[k]) return err(-32002, "Resource not found");
      return ok({ contents: [{ uri: params.uri, mimeType: "text/markdown", text: GUIDES[k] }] });
    }
    case "tools/list": return ok({ tools: TOOLS });
    case "tools/call": {
      const fn = tools[params?.name];
      if (!fn) return err(-32602, `Unknown tool ${params?.name}`);
      try {
        const out = await fn(env, params.arguments || {});
        return ok({ content: [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out, null, 2) }] });
      } catch (e) {
        return ok({ isError: true, content: [{ type: "text", text: String(e.message || e) }] });
      }
    }
    default:
      return isNote ? null : err(-32601, `Method not found: ${method}`);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/mcp\/([^/]+)\/?$/);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization" } });
    if (!env.MCP_SECRET || !env.GH_PAT || !env.REPO) return J({ error: "server not configured" }, 500);
    // Constant-length compare is not needed for a long random path secret, but avoid leaking details.
    if (!m || m[1] !== env.MCP_SECRET) return J({ error: "not found" }, 404);
    if (request.method === "GET") return J({ error: "This server answers POST only (stateless streamable HTTP)." }, 405, { allow: "POST" });
    if (request.method !== "POST") return J({ error: "method not allowed" }, 405);
    let body;
    try { body = await request.json(); } catch { return J({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((b) => rpc(env, b)))).filter(Boolean);
      return out.length ? J(out) : new Response(null, { status: 202 });
    }
    const out = await rpc(env, body);
    return out ? J(out) : new Response(null, { status: 202, headers: { "access-control-allow-origin": "*" } });
  },
};

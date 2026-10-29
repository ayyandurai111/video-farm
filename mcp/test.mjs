// Run: node mcp/test.mjs   (mocks the GitHub API, no network)
import worker from "./worker.js";
import assert from "node:assert/strict";

const calls = []; let runs = []; let release = null;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); calls.push({ method: init.method || "GET", path: u.pathname + u.search, body: init.body });
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (u.pathname.endsWith("/dispatches")) { const b = JSON.parse(init.body); runs.unshift({ id: 11, display_title: `render ${b.inputs.job_id}`, status: "queued", conclusion: null, html_url: "https://github.com/o/r/actions/runs/11", created_at: "t", updated_at: "t" }); return new Response(null, { status: 204 }); }
  if (u.pathname.endsWith("/runs")) return j({ workflow_runs: runs });
  if (u.pathname.includes("/releases/tags/")) return release ? j(release) : j({ message: "Not Found" }, 404);
  if (u.pathname.endsWith("/cancel")) return new Response(null, { status: 202 });
  return j({}, 500);
};

const env = { GH_PAT: "tok", MCP_SECRET: "s3cret", REPO: "o/r" };
const post = (body, path = "/mcp/s3cret") => worker.fetch(new Request("https://w.dev" + path, { method: "POST", body: JSON.stringify(body) }), env);
const call = async (name, args) => { const r = await (await post({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })).json(); return r.result; };
const text = (r) => JSON.parse(r.content[0].text);

// protocol
let r = await (await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } })).json();
assert.equal(r.result.protocolVersion, "2025-03-26"); assert.match(r.result.instructions, /Never add background music/); assert.ok(r.result.capabilities.resources); assert.equal(r.result.serverInfo.name, "video-farm");
r = await (await post({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
assert.deepEqual(r.result.tools.map((t) => t.name), ["submit_render", "validate_scenes", "get_guide", "render_status", "get_video", "cancel_render", "list_jobs"]);
assert.equal((await post({ jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
// guide + resources
const gl = text(await call("get_guide", {})); assert.ok(gl.topics["scene-guide"] && gl.topics["sound-effects"] && gl.topics["workflow"]);
const sg = (await call("get_guide", { topic: "scene-guide" })).content[0].text; assert.match(sg, /logos/);
assert.equal((await call("get_guide", { topic: "nope" })).isError, true);
r = await (await post({ jsonrpc: "2.0", id: 5, method: "resources/list" })).json(); assert.ok(r.result.resources.length >= 8);
r = await (await post({ jsonrpc: "2.0", id: 6, method: "resources/read", params: { uri: "guide://sound-effects" } })).json(); assert.match(r.result.contents[0].text, /uisfx/);
// validate_scenes
import fs from "node:fs";
const srt = fs.readFileSync(new URL("./fixtures/captions.srt", import.meta.url), "utf8");
const good = fs.readFileSync(new URL("./fixtures/scenes.json", import.meta.url), "utf8");
let v = text(await call("validate_scenes", { captions: srt, scenes: good })); assert.equal(v.ok, true, JSON.stringify(v)); assert.equal(v.scenes, 6);
const bad = JSON.parse(good); bad.scenes[1].start = 4.5; bad.scenes[2].layout = "nope"; bad.scenes[3].items = [];
v = text(await call("validate_scenes", { captions: srt, scenes: JSON.stringify(bad) })); assert.equal(v.ok, false);
assert.ok(v.errors.some((e) => /unknown layout/.test(e)) && v.errors.some((e) => /not the start of any caption/.test(e)) && v.errors.some((e) => /needs 'items'/.test(e)), JSON.stringify(v.errors));
// brands: channel layouts only exist in the channel brand
const chSrt = fs.readFileSync(new URL("./fixtures/channel-captions.srt", import.meta.url), "utf8");
const chGood = fs.readFileSync(new URL("./fixtures/channel-scenes.json", import.meta.url), "utf8");
v = text(await call("validate_scenes", { captions: chSrt, scenes: chGood })); assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.scenes, 24);
v = text(await call("validate_scenes", { captions: chSrt, scenes: chGood, brand_theme: "handson" })); assert.equal(v.ok, false);
assert.ok(v.errors.some((e) => /layout "equation" is not available in brand "handson"/.test(e)), JSON.stringify(v.errors.slice(0, 2)));
const chBad = JSON.parse(chGood); chBad.scenes[2].tex = "\\frac{a}{b + \\foo"; chBad.scenes[4].sim = "rocket"; chBad.scenes[7].params = { angle: "steep", bogus: 1 }; chBad.scenes[5].series[0].expr = "x; alert(1)"; chBad.scenes[6].forces[0].angle = undefined;
v = text(await call("validate_scenes", { captions: chSrt, scenes: JSON.stringify(chBad) })); assert.equal(v.ok, false);
for (const re of [/unbalanced/, /unknown command \\foo/, /unknown simulation "rocket"/, /parameter 'angle' must be a number/, /not allowed/, /force 1 needs/]) assert.ok(v.errors.some((e) => re.test(e)), String(re) + " " + JSON.stringify(v.errors));
assert.ok(v.warnings.some((w) => /no parameter 'bogus'/.test(w)));
assert.ok(text(await call("get_guide", {})).topics["channel-physics"], "channel-physics guide topic");
assert.match((await call("get_guide", { topic: "channel-physics" })).content[0].text, /freebody/);
const sixth = JSON.parse(good); sixth.scenes.push(...[1,2].map(() => ({ ...sixth.scenes[1] }))); 
// auth
assert.equal((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, "/mcp/wrong")).status, 404);
assert.equal((await worker.fetch(new Request("https://w.dev/mcp/s3cret"), env)).status, 405);
// flow
const sub = text(await call("submit_render", { captions: "1\n00:00:00,000 --> 00:00:03,000\nHello", scenes: JSON.stringify({ scenes: [] }), options: { theme: "dark" } }));
assert.match(sub.job_id, /^v[a-z0-9]+$/);
const disp = calls.find((c) => c.path.endsWith("/dispatches")); const db = JSON.parse(disp.body);
assert.equal(db.ref, "main"); assert.equal(db.inputs.job_id, sub.job_id); assert.equal(JSON.parse(db.inputs.payload).options.theme, "dark");
assert.equal(text(await call("render_status", { job_id: sub.job_id })).state, "queued");
runs[0].status = "in_progress"; assert.equal(text(await call("render_status", { job_id: sub.job_id })).state, "in_progress");
assert.equal(text(await call("get_video", { job_id: sub.job_id })).ready, false);
runs[0].status = "completed"; runs[0].conclusion = "success";
release = { assets: [{ name: `${sub.job_id}-p2.png`, size: 1, browser_download_url: "https://x/p2.png" }, { name: `${sub.job_id}.mp4`, size: 4400000, browser_download_url: "https://github.com/o/r/releases/download/x/v.mp4" }, { name: `${sub.job_id}-p1.png`, size: 1, browser_download_url: "https://x/p1.png" }] };
assert.equal(text(await call("render_status", { job_id: sub.job_id })).state, "success");
const gv = text(await call("get_video", { job_id: sub.job_id })); assert.equal(gv.ready, true); assert.equal(gv.size_mb, 4.4); assert.deepEqual(gv.previews, ["https://x/p1.png", "https://x/p2.png"]);
assert.equal(text(await call("list_jobs", {})).jobs[0].job_id, sub.job_id);
assert.equal(text(await call("cancel_render", { job_id: sub.job_id })).cancelled, true);
// submit_render checks the brand against the layouts
assert.equal((await call("submit_render", { captions: chSrt, scenes: chGood, options: { brand_theme: "handson" } })).isError, true);
assert.equal((await call("submit_render", { captions: chSrt, scenes: chGood, options: { brand_theme: "neon" } })).isError, true);
assert.equal((await call("submit_render", { captions: chSrt, scenes: chGood })).isError, undefined, "meta.brandTheme=channel in the scenes is enough");
const chSub = text(await call("submit_render", { captions: "1\n00:00:00,000 --> 00:00:03,000\nHi", scenes: JSON.stringify([{ id: "s1", start: 0, end: 3, layout: "equation", tex: "F = ma" }]), options: { brand_theme: "channel" } }));
assert.match(chSub.job_id, /^v[a-z0-9]+$/);
assert.equal(JSON.parse(JSON.parse(calls.filter((c) => c.path.endsWith("/dispatches")).pop().body).inputs.payload).options.brand_theme, "channel");
// errors
assert.equal((await call("submit_render", {})).isError, true);
assert.equal((await call("render_status", { job_id: "BAD ID;rm" })).isError, true);
assert.equal((await call("submit_render", { captions: "x".repeat(70000) })).isError, true);
console.log("all MCP tests passed (" + calls.length + " mocked GitHub calls)");

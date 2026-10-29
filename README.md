# Video farm: MCP server on Cloudflare Workers + renders on GitHub Actions

```
Claude --MCP--> Cloudflare Worker (free, always on) --GitHub API--> Actions runner (4 vCPU) --> release asset (MP4)
```
Claude sends captions + scenes. The runner renders with sound effects and publishes `render-<id>` as a release. Claude downloads it and mixes your audio in locally (`skill/scripts/mux_audio.py`), so your audio never goes to GitHub.

**Public repo = the captions and scenes you send are visible in the Actions run, and the video is a public release for 24 hours.** Do not use it for private content.

## One-time setup
1. Create a **public** GitHub repo (for example `video-farm`), default branch `main`. Upload everything in this folder.
2. Settings > Actions > General > Workflow permissions: **Read and write permissions**.
3. Cloudflare (free account): open Workers & Pages once so your `workers.dev` subdomain exists. Create an API token with the template **Edit Cloudflare Workers**. Note your Account ID.
4. GitHub: create a fine-grained personal access token for this repo only, with **Actions: Read and write**, **Contents: Read and write**, Metadata: Read.
5. Repo Settings > Secrets and variables > Actions > New secret, four of them:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GH_PAT` (the token from step 4), `MCP_SECRET` (any long random string, 32+ characters).
6. Actions tab > **deploy-mcp** > Run workflow. When it finishes, your MCP URL is
   `https://video-farm-mcp.<your-subdomain>.workers.dev/mcp/<MCP_SECRET>`
7. claude.ai > Settings > Connectors > Add custom connector, paste that URL. Treat the URL like a password.

## Brands: one tool, two looks
The video tool has two **brand themes**. Each keeps its own colours, fonts and components in its own folder, and only the chosen brand is loaded.

| Brand | Look | Layouts |
|---|---|---|
| `handson` (default) | Hands-on AI website: cream, thick outlines, hard shadows | title, bullets, logos, features, facts, table, stat, quote, code, steps, compare, outro |
| `channel` | Physics channel: deep blue, thin outlines, physics colour code | all of the above, plus equation, derivation, graph, freebody, quantity, units, question, analogy, timeline, sim (11 simulations) |

```
skill/assets/template/src/
  brands/
    types.ts            what every brand must provide
    themes.ts           THEMES: name -> theme (pure data, used by useTheme)
    scenes.ts           REGISTRIES: name -> layouts that brand can use
    handson/theme.ts    website tokens
    channel/
      theme.ts          EDIT THIS for the channel: name, mark, colours, fonts, physics colours
      scenes.tsx        the physics layouts
      types.ts          scene types for those layouts
      components/       Tex (formulas), Graph, draw (arrows, stage, readouts)
      sims/             projectile, pendulum, spring, incline, collision, orbit, wave, optics, circuit, field, gas
      lib/              tex parser, formula evaluator, axis helpers, physics (tested)
skill/assets/channel-schema.json   one list of layouts, fields and simulation parameters, read by check_scenes.py and the MCP worker
```
Choose the brand with `"meta": {"brandTheme": "channel"}` in scenes.json, `--brand-theme channel` on the command line, or the `brand_theme` option of `submit_render`. When the user does not say, the AI asks one question: "Hands-on AI theme or your channel theme?" (see SKILL.md and mcp/instructions.md).

To finish the channel brand: put the real name, mark, colours and font in `src/brands/channel/theme.ts`. To add a third brand, see the end of `skill/references/channel-physics.md`.

Example: `skill/assets/example/scenes.channel-showcase.json` uses every channel layout and every simulation (with its captions file).

## Tools
`validate_scenes`, `get_guide`, `submit_render`, `render_status`, `get_video` (video + 4 preview frames), `cancel_render`, `list_jobs`.

The MCP carries the know-how itself: `instructions` are sent when the connector connects, the design guides are available through `get_guide` and as `guide://...` resources. They are bundled from `skill/SKILL.md`, `skill/references/` and `mcp/instructions.md` by `mcp/build_guide.py` (the deploy workflow runs it), so edit those files, not `mcp/guide.js`.

## Check it works
`node mcp/test.mjs` runs the server against a mocked GitHub (no network).
Fallback without MCP: `skill/scripts/remote_build.py` renders through git pushes (uploads audio, so only for non-private content).

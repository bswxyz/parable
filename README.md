<div align="center">

<h1>Parable</h1>

<p>
  <strong>A free, open marketplace of motion-rich React components and complete website templates.</strong><br>
  Distributed through the <a href="https://ui.shadcn.com">shadcn</a> registry — the code is copied into your
  project, so you own it. No black-box dependency, no lock-in.
</p>

<p>
  <a href="https://parable-three.vercel.app"><img alt="Live demo" src="https://img.shields.io/badge/live_demo-parable-8b5cf6?style=flat-square&labelColor=1a1a1a"></a>
  <img alt="88 components" src="https://img.shields.io/badge/components-88-ec4899?style=flat-square&labelColor=1a1a1a">
  <img alt="78 templates" src="https://img.shields.io/badge/templates-78-f5a623?style=flat-square&labelColor=1a1a1a">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square&labelColor=1a1a1a"></a>
  <img alt="MCP native" src="https://img.shields.io/badge/MCP-native-06b6d4?style=flat-square&labelColor=1a1a1a">
</p>

<p>
  <a href="https://parable-three.vercel.app"><b>Live demo</b></a>
  &nbsp;·&nbsp;
  <a href="https://parable-three.vercel.app/components">Components</a>
  &nbsp;·&nbsp;
  <a href="https://parable-three.vercel.app/templates">Templates</a>
  &nbsp;·&nbsp;
  <a href="https://parable-three.vercel.app/docs">Docs</a>
</p>

<a href="https://parable-three.vercel.app">
  <img src=".github/assets/hero.jpg" alt="Parable — components and templates you actually own" width="100%">
</a>

</div>

<br>

## Why Parable

|  |  |
|---|---|
| **🪶 You own the code** | `shadcn add` writes the source straight into your repo. Rename it, restyle it, retime it — no runtime dependency, no version churn you didn't ask for. |
| **🎬 Motion, done right** | Every component is animated with [Motion](https://motion.dev) and respects `prefers-reduced-motion` out of the box. The wow is in the catalog, not the marketing. |
| **🚀 Real, deployed templates** | 78 complete, individually-designed sites across five stacks — each one a live deployment you preview, clone, and ship. No two share a design. |
| **🤖 MCP-native** | The whole catalog is exposed over Model Context Protocol, so AI agents can browse the registry and install straight from it. |

<br>

## Install a component

Add the `@parable` namespace to your `components.json`:

```json
{ "registries": { "@parable": "https://parable-three.vercel.app/r/{name}.json" } }
```

Then add any component by name — or by full URL, no config needed:

```bash
npx shadcn@latest add @parable/shimmer-button
# or
npx shadcn@latest add https://parable-three.vercel.app/r/shimmer-button.json
```

The source lands in `components/parable/…` and dependencies resolve automatically.
See the [full guide](https://parable-three.vercel.app/docs) to get started.

<br>

## Browse the catalog

<table>
<tr>
<td width="50%">
  <a href="https://parable-three.vercel.app/components"><img src=".github/assets/components.jpg" alt="Parable components gallery"></a>
</td>
<td width="50%">
  <a href="https://parable-three.vercel.app/templates"><img src=".github/assets/templates.jpg" alt="Parable templates gallery"></a>
</td>
</tr>
<tr>
<td align="center"><b>88 components</b> · six categories<br><a href="https://parable-three.vercel.app/components">Browse components →</a></td>
<td align="center"><b>78 templates</b> · two families, five stacks<br><a href="https://parable-three.vercel.app/templates">Browse templates →</a></td>
</tr>
</table>

Components span **text animations, interactive, hero backgrounds, visual effects, loaders, and blocks & slices** — all copy-paste, all accessible. Templates ship in the **Parable** and **Formwork** families across **HTML/JS, Astro, Next.js, SvelteKit, and Vite**.

<br>

## Clone a template

Templates are complete sites, so they're cloned rather than added:

```bash
npx degit bswxyz/formwork-neon my-site
```

<br>

## Connect over MCP

The catalog is exposed over [Model Context Protocol](https://modelcontextprotocol.io)
at `/api/mcp` — a remote, stateless Streamable-HTTP server with no install and no API key.
Point any MCP-capable client at it to browse and pull components and templates
(`list_components`, `get_component`, `list_templates`, `get_template`).

```bash
curl -X POST https://parable-three.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Setup for every client is in the [MCP docs](https://parable-three.vercel.app/docs/mcp).

<br>

## Develop

```bash
npm install
npm run dev              # start the dev server → http://localhost:3000
npm run build            # production build
npm run registry:build   # regenerate public/r/*.json from registry.json
```

### Project layout

```
app/                # Next.js App Router — site, MDX docs, OG images, MCP + registry API
components/         # site UI and the component preview harnesses
registry/parable/   # the component source of truth (shadcn registry items)
public/r/           # built registry JSON — what `shadcn add` fetches
public/templates/   # template preview thumbnails
registry.json       # the registry manifest
```

<br>

## Built with

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js_16-000?style=flat-square&logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React_19-149ECA?style=flat-square&logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white">
  <img alt="Motion" src="https://img.shields.io/badge/Motion-000?style=flat-square&logo=framer&logoColor=white">
  <img alt="shadcn" src="https://img.shields.io/badge/shadcn-000?style=flat-square&logo=shadcnui&logoColor=white">
</p>

<br>

## Contributing

Issues and pull requests are welcome. New components live in `registry/parable/`
and are registered in `registry.json`; run `npm run registry:build` to publish
them to `public/r/`. Please keep every component accessible and reduced-motion-safe.

<br>

## License

Parable is released under the [MIT License](LICENSE) — free and open, every component
and template, no account, no paid tier. Installed components are copied into your project
and are yours to modify and ship.

<br>

<div align="center">
  <sub>Built for people who want to own their front-end. <a href="https://parable-three.vercel.app">parable-three.vercel.app</a></sub>
</div>

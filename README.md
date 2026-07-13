# Parable

A free, open marketplace of **motion-rich React components** and **complete
website templates** — distributed through the [shadcn](https://ui.shadcn.com)
registry, so the code is copied into your project and you own it. No black-box
dependency, no lock-in.

- **21 components** across six categories (text, interactive, hero backgrounds,
  visual effects, loaders, blocks & slices) — all respect
  `prefers-reduced-motion`. Components inspired by patterns we admire carry an
  `inspiredBy` credit in their registry metadata; every one is an independent,
  original implementation ([attribution policy](https://parable-three.vercel.app/docs/attribution)).
- **52 templates** across two families (Parable · Formwork) and five stacks
  (HTML/JS, Astro, Next.js, SvelteKit, Vite) — each a real, deployed site you
  preview live and clone.

## Install a component

Add the `@parable` namespace to your `components.json`:

```json
{ "registries": { "@parable": "https://parable-three.vercel.app/r/{name}.json" } }
```

Then add any component by name or full URL:

```bash
npx shadcn@latest add @parable/shimmer-button
# or
npx shadcn@latest add https://parable-three.vercel.app/r/shimmer-button.json
```

The source lands in `components/parable/…` and dependencies resolve
automatically. See [`/docs`](https://parable-three.vercel.app/docs) for the full guide.

## Clone a template

Templates are complete sites, so they're cloned, not added:

```bash
npx degit bswxyz/formwork-neon my-site
```

## MCP server

The catalog is also exposed over Model Context Protocol at
[`/api/mcp`](https://parable-three.vercel.app/api/mcp) so AI agents can browse and pull
components and templates (`tools/list`, `tools/call`).

## Develop

```bash
npm run dev              # start the dev server (http://localhost:3000)
npm run build            # production build
npm run registry:build   # regenerate public/r/*.json from registry.json
```

Built with Next.js 16, React 19, Tailwind CSS v4, and Motion.

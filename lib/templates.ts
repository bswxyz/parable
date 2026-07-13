export type TemplateFamily = "parable" | "formwork";
export type TemplateStack =
  | "static"
  | "astro"
  | "next"
  | "svelte"
  | "vite";

export interface Template {
  slug: string;
  name: string;
  pitch: string;
  family: TemplateFamily;
  stack: TemplateStack;
  tags: string[];
  /** Live GitHub Pages URL — iframe + Open target. */
  liveUrl: string;
  repo: string;
  /** degit target for cloning the source. */
  degit: string;
  /** Thumbnail path under /public. */
  thumb: string;
}

const gh = (slug: string) => `https://bswxyz.github.io/${slug}/`;
const repo = (slug: string) => `https://github.com/bswxyz/${slug}`;

function t(
  slug: string,
  name: string,
  pitch: string,
  family: TemplateFamily,
  stack: TemplateStack,
  tags: string[]
): Template {
  return {
    slug,
    name,
    pitch,
    family,
    stack,
    tags,
    liveUrl: gh(slug),
    repo: repo(slug),
    degit: `bswxyz/${slug}`,
    thumb: `/templates/${slug}.jpg`,
  };
}

// ── Family: Formwork — free website templates (build-step-free static) ──
const FORMWORK: Template[] = [
  t("formwork-neon", "Neon", "Synthwave page with an infinite neon three.js terrain.", "formwork", "static", ["three.js", "synthwave", "hero"]),
  t("formwork-aether", "Aether", "Dark SaaS / AI landing — aurora glass + bento grid.", "formwork", "static", ["saas", "glass", "bento"]),
  t("formwork-algorithm", "Algorithm", "Generative-art gallery with a seeded flow field.", "formwork", "static", ["generative", "canvas", "art"]),
  t("formwork-atelier", "Atelier", "Editorial magazine with a horizontal drag gallery.", "formwork", "static", ["editorial", "gallery"]),
  t("formwork-aurelis", "Aurelis", "Fragrance / beauty brand with a live WebGL aurora hero.", "formwork", "static", ["beauty", "webgl", "brand"]),
  t("formwork-aurum", "Aurum", "Luxury maison — gold particles + a rendered watch dial.", "formwork", "static", ["luxury", "particles"]),
  t("formwork-award", "Award", "Cinematic manifesto with pinned horizontal scroll.", "formwork", "static", ["cinematic", "scroll"]),
  t("formwork-chroma", "Chroma", "Creative-studio hero of raymarched liquid chrome.", "formwork", "static", ["webgl", "shader", "studio"]),
  t("formwork-clay", "Clay", "Playful claymorphism app landing (pure CSS).", "formwork", "static", ["css", "playful", "app"]),
  t("formwork-contour", "Contour", "Outdoor / trail atlas with animated topographic contours.", "formwork", "static", ["outdoor", "svg", "maps"]),
  t("formwork-driftwear", "Driftwear", "Fashion label with a cursor-follow lookbook.", "formwork", "static", ["fashion", "lookbook"]),
  t("formwork-farside", "Farside", "Outdoor gear — terrain-reactive weather engine + tent morph.", "formwork", "static", ["outdoor", "interactive"]),
  t("formwork-grid", "Grid", "Swiss-style studio with a toggleable modular grid (press G).", "formwork", "static", ["swiss", "grid", "studio"]),
  t("formwork-halo", "Halo", "Sci-fi mission-control HUD dashboard.", "formwork", "static", ["dashboard", "hud", "scifi"]),
  t("formwork-heliodon", "Heliodon", "3D product showcase — three.js metal with studio reflections.", "formwork", "static", ["three.js", "product", "3d"]),
  t("formwork-isometria", "Isometria", "Interactive isometric three.js island with day/night.", "formwork", "static", ["three.js", "isometric"]),
  t("formwork-meridian", "Meridian", "Espresso equipment — live pressure-gauge hero + odometers.", "formwork", "static", ["product", "interactive"]),
  t("formwork-monolith", "Monolith", "Design-studio site driven by kinetic typography.", "formwork", "static", ["type", "studio", "kinetic"]),
  t("formwork-nebula", "Nebula", "Space / astronomy — a 95k-particle three.js galaxy.", "formwork", "static", ["three.js", "particles", "space"]),
  t("formwork-phosphor", "Phosphor", "Retro CRT terminal with a real command line.", "formwork", "static", ["retro", "terminal", "crt"]),
  t("formwork-resonance", "Resonance", "Audio-reactive sound-studio page (Web Audio).", "formwork", "static", ["audio", "reactive", "canvas"]),
  t("formwork-revolver", "Revolver", "Record-shop page with an audio-reactive spinning vinyl.", "formwork", "static", ["audio", "music", "brand"]),
  t("formwork-roastery", "Roastery", "Coffee brand with rising steam particles.", "formwork", "static", ["coffee", "particles", "brand"]),
  t("formwork-soma", "Soma", "Wellness / meditation — gooey blobs + a breathing guide.", "formwork", "static", ["wellness", "svg", "calm"]),
  t("formwork-sumi", "Sumi", "Japanese ink-art — WebGL ink on washi paper.", "formwork", "static", ["webgl", "art", "ink"]),
  t("formwork-velocity", "Velocity", "Dev-tool landing with an animated live code review.", "formwork", "static", ["devtool", "saas"]),
  t("formwork-zodiac", "Zodiac", "Celestial star map with interactive constellations.", "formwork", "static", ["svg", "space", "interactive"]),
];

// ── Family: Parable — product-concept showcases (mixed stacks) ──
const PARABLE: Template[] = [
  t("aperture-lab", "Aperture Lab", "Computational-photography RAW editor — cinematic darkroom, WebGL film grain.", "parable", "static", ["three.js", "editor", "dark"]),
  t("northbound-ev", "Northbound", "EV road-trip planner — three.js topographic terrain + kinetic route.", "parable", "static", ["three.js", "maps", "ev"]),
  t("perigee-astro", "Perigee", "Citizen-astronomy network — a 72k-star shader field + live sky console.", "parable", "static", ["three.js", "space", "shader"]),
  t("kiln-collective", "Kiln Collective", "Ceramics studio & marketplace — paper grain + hand-drawn SVG draw-on.", "parable", "astro", ["astro", "craft", "warm"]),
  t("meridian-advisor", "Meridian", "Robo-advisor for freelancers — live projection fan + allocation donut.", "parable", "next", ["next", "fintech", "charts"]),
  t("undertow-festival", "Undertow", "Independent film festival — brutalist kinetic type + marquee tickers.", "parable", "static", ["gsap", "brutalist", "type"]),
  t("fernweh-cabins", "Fernweh", "Off-grid cabin booking — long lazy parallax ridgelines.", "parable", "astro", ["astro", "travel", "parallax"]),
  t("loop-and-larder", "Loop & Larder", "Coffee roastery subscription — hand-lettered accents + a builder.", "parable", "astro", ["astro", "commerce", "warm"]),
  t("halcyon-ring", "Halcyon Ring", "Sleep-science wearable — breathing ring + flowing dusk gradients.", "parable", "static", ["canvas", "health", "calm"]),
  t("vantage-point-studio", "Vantage Point", "Architecture portfolio — morphing three.js massing models.", "parable", "static", ["three.js", "portfolio", "light"]),
  t("static-and-noise", "Static & Noise", "Independent label — a synthesized loop + audio-reactive canvas.", "parable", "static", ["audio", "music", "maximal"]),
  t("driftline-ocean", "Driftline", "Ocean-conservation nonprofit — wave-fields + scroll-depth descent.", "parable", "static", ["gsap", "nonprofit", "data"]),
  t("fieldnote-research", "Fieldnote", "Research notes with citations — a working ⌘K palette + hover-cards.", "parable", "next", ["next", "devtool", "dark"]),
  t("threadbare-resale", "Threadbare", "Circular-fashion resale — FLIP filter grid + story-tag flips.", "parable", "next", ["next", "commerce", "bold"]),
  t("recess-learn", "Recess", "Kids' learning app — spring-physics mascot + a playable lesson.", "parable", "svelte", ["svelte", "kids", "playful"]),
  t("continuum-health", "Continuum Health", "Longevity biotech — an instanced three.js molecular model.", "parable", "static", ["three.js", "health", "clinical"]),
  t("backstage-pass", "Backstage Pass", "Music-festival platform — kinetic lineup + gradient washes + countdown.", "parable", "static", ["gsap", "festival", "gradient"]),
  t("longwave-climate", "Longwave", "Climate analytics — a procedural three.js data globe + warming stripes.", "parable", "static", ["three.js", "data", "globe"]),
  t("the-marginalia", "The Marginalia", "Literary magazine — scroll-synced margin notes + drop caps.", "parable", "astro", ["astro", "editorial", "reading"]),
  t("hangar-12", "Hangar 12", "eVTOL air mobility — a procedural three.js wireframe aircraft.", "parable", "static", ["three.js", "aero", "dark"]),
  t("bramble-home", "Bramble", "Plant-care DTC — morphing blobs + botanical draw-on + a quiz.", "parable", "astro", ["astro", "botanical", "dtc"]),
  t("ledger-and-vine", "Ledger & Vine", "Boutique winery club — layered vineyard parallax + pour animations.", "parable", "static", ["gsap", "luxury", "wine"]),
  t("overclock-games", "Overclock", "Indie roguelike studio — procedural canvas pixel art + CRT pipeline.", "parable", "static", ["canvas", "game", "pixel"]),
  t("farebox-transit", "Farebox", "Civic transit app — an octilinear SVG network map + arrivals board.", "parable", "vite", ["vite", "civic", "maps"]),
  t("ninth-wave-surf", "Ninth Wave", "Surf & outdoor apparel — sun-bleached poster hero + scroll-drift shelf.", "parable", "static", ["gsap", "apparel", "surf"]),
];

export const TEMPLATES: Template[] = [...FORMWORK, ...PARABLE];

export const TEMPLATE_STACKS: { key: TemplateStack | "all"; label: string }[] = [
  { key: "all", label: "All stacks" },
  { key: "static", label: "HTML/JS" },
  { key: "astro", label: "Astro" },
  { key: "next", label: "Next.js" },
  { key: "svelte", label: "Svelte" },
  { key: "vite", label: "Vite" },
];

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((x) => x.slug === slug);
}

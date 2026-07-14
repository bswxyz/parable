import { NextRequest, NextResponse } from "next/server";
import {
  COMPONENTS,
  getComponent,
  installCommand,
  REGISTRY_BASE,
} from "@/lib/catalog";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { getPropDocs } from "@/lib/docs";

export const dynamic = "force-dynamic";

/**
 * Parable MCP endpoint — a minimal, stateless Streamable-HTTP MCP server that
 * exposes the catalog to AI agents. Speaks JSON-RPC 2.0 over POST: `initialize`,
 * `tools/list`, `tools/call`. Four tools: list_components, get_component,
 * list_templates, get_template. GET returns a human-readable description.
 */

const SERVER = { name: "parable", version: "0.1.0" };
const PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "list_components",
    description:
      "List all Parable UI components (name, category, description). Optional filter by category. Everything is free.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["text", "interactive", "hero", "effect", "loader", "block"],
        },
      },
    },
  },
  {
    name: "get_component",
    description:
      "Get one component by slug: metadata, dependencies, and the shadcn install command.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "list_templates",
    description:
      "List all Parable & Formwork website templates (name, stack, family, live URL). Optional filter by family or stack.",
    inputSchema: {
      type: "object",
      properties: {
        family: { type: "string", enum: ["parable", "formwork"] },
        stack: {
          type: "string",
          enum: ["static", "astro", "next", "svelte", "vite"],
        },
      },
    },
  },
  {
    name: "get_template",
    description:
      "Get one template by slug: metadata, live URL, repo, and the degit clone command.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
];

function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_components": {
      let list = COMPONENTS;
      if (args.category) list = list.filter((c) => c.category === args.category);
      return list.map((c) => ({
        slug: c.slug,
        title: c.title,
        category: c.category,
        description: c.description,
      }));
    }
    case "get_component": {
      const c = getComponent(String(args.slug));
      if (!c) return { error: `No component "${args.slug}"` };
      return {
        ...c,
        install: installCommand(c.slug, "npm"),
        registryUrl: `${REGISTRY_BASE || "https://parable-three.vercel.app"}/r/${c.slug}.json`,
        props: getPropDocs(c.slug)?.props ?? [],
      };
    }
    case "list_templates": {
      let list = TEMPLATES;
      if (args.family) list = list.filter((t) => t.family === args.family);
      if (args.stack) list = list.filter((t) => t.stack === args.stack);
      return list.map((t) => ({
        slug: t.slug,
        name: t.name,
        family: t.family,
        stack: t.stack,
        pitch: t.pitch,
        liveUrl: t.liveUrl,
      }));
    }
    case "get_template": {
      const t = getTemplate(String(args.slug));
      if (!t) return { error: `No template "${args.slug}"` };
      return { ...t, clone: `npx degit ${t.degit} ${t.slug}` };
    }
    default:
      return { error: `Unknown tool "${name}"` };
  }
}

type RpcReq = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function handle(req: RpcReq) {
  const { id = null, method, params = {} } = req;
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const err = (code: number, message: string) => ({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });

  switch (method) {
    case "initialize":
      return ok({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case "notifications/initialized":
      return null; // notification, no response
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call": {
      const name = String((params as { name?: string }).name);
      const args =
        ((params as { arguments?: Record<string, unknown> }).arguments) ?? {};
      if (!TOOLS.some((t) => t.name === name))
        return err(-32602, `Unknown tool: ${name}`);
      const data = callTool(name, args);
      return ok({
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      });
    }
    default:
      return err(-32601, `Method not found: ${method}`);
  }
}

export async function POST(request: NextRequest) {
  let body: RpcReq | RpcReq[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }
  const responses = (Array.isArray(body) ? body : [body])
    .map(handle)
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const payload = Array.isArray(body) ? responses : responses[0] ?? null;
  return NextResponse.json(payload, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function GET() {
  return NextResponse.json({
    name: SERVER.name,
    version: SERVER.version,
    protocol: "mcp",
    transport: "streamable-http (JSON-RPC 2.0 over POST)",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    counts: { components: COMPONENTS.length, templates: TEMPLATES.length },
    usage: "POST JSON-RPC 2.0 to this URL. Try method 'tools/list'.",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

import "server-only";
import { promises as fs } from "fs";
import path from "path";

/** Read a component's raw TSX source from the registry (server-only). */
export async function readComponentSource(slug: string): Promise<string> {
  const file = path.join(
    process.cwd(),
    "registry",
    "parable",
    "ui",
    `${slug}.tsx`
  );
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return `// source for ${slug} not found`;
  }
}

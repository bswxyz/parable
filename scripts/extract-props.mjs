// Generates lib/generated/props.json and lib/generated/usage.json from source.
//
// props.json — for every registry item, the members of its exported `*Props`
// interface/type: name, type text, optional, JSDoc description, and the
// default value read off the component's destructured parameters. Handles
// plain `export function X({...})` and `React.forwardRef((props) => …)`.
//
// usage.json — each slug's live-demo JSX lifted verbatim from
// components/previews.tsx, so the docs "Usage" snippet is exactly the code
// that renders the gallery preview.
//
// Run: node scripts/extract-props.mjs   (rerun after adding components)

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry.json"), "utf8"));

/* ---------------------------------------------------------------- helpers */

function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function jsDocText(node) {
  const tags = ts.getJSDocCommentsAndTags(node);
  for (const t of tags) {
    if (ts.isJSDoc(t) && t.comment) {
      return typeof t.comment === "string" ? t.comment : t.comment.map((c) => c.text).join("");
    }
  }
  return "";
}

/** Collect `name → default-expression-text` from destructured function params. */
function collectDefaults(sf) {
  const defaults = new Map();
  function fromBinding(binding) {
    if (!binding || !ts.isObjectBindingPattern(binding)) return;
    for (const el of binding.elements) {
      if (el.initializer && ts.isIdentifier(el.name)) {
        defaults.set(el.name.text, el.initializer.getText(sf));
      } else if (el.initializer && el.propertyName && ts.isIdentifier(el.propertyName)) {
        defaults.set(el.propertyName.text, el.initializer.getText(sf));
      }
    }
  }
  function visit(node) {
    // export function X({ a = 1, ... }: XProps)
    if (ts.isFunctionDeclaration(node) && node.parameters[0]?.name) {
      fromBinding(node.parameters[0].name);
    }
    // const X = React.forwardRef((props|{...}, ref) => …) — destructure may
    // instead happen in a statement inside the body: const { a = 1 } = props;
    if (ts.isCallExpression(node) && node.expression.getText(sf).endsWith("forwardRef")) {
      const fn = node.arguments[0];
      if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
        if (fn.parameters[0]?.name) fromBinding(fn.parameters[0].name);
        fn.body?.forEachChild?.((stmt) => {
          if (ts.isVariableStatement(stmt)) {
            for (const d of stmt.declarationList.declarations) fromBinding(d.name);
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return defaults;
}

function extractProps(file) {
  const sf = parse(file);
  const defaults = collectDefaults(sf);
  const results = [];

  function fromMembers(members, sf) {
    const props = [];
    for (const m of members) {
      if (!ts.isPropertySignature(m) || !m.name) continue;
      const name = m.name.getText(sf).replace(/^["']|["']$/g, "");
      props.push({
        name,
        type: m.type ? m.type.getText(sf).replace(/\s+/g, " ") : "unknown",
        required: !m.questionToken,
        default: defaults.get(name) ?? null,
        description: jsDocText(m).replace(/\s+/g, " ").trim(),
      });
    }
    return props;
  }

  function visit(node) {
    const exported = ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((mo) => mo.kind === ts.SyntaxKind.ExportKeyword);
    if (exported && ts.isInterfaceDeclaration(node) && /Props$/.test(node.name.text)) {
      const ext = node.heritageClauses?.flatMap((h) => h.types.map((t) => t.getText(sf).replace(/\s+/g, " "))) ?? [];
      results.push({ interface: node.name.text, extends: ext, props: fromMembers(node.members, sf) });
    }
    if (exported && ts.isTypeAliasDeclaration(node) && /Props$/.test(node.name.text) && ts.isTypeLiteralNode(node.type)) {
      results.push({ interface: node.name.text, extends: [], props: fromMembers(node.type.members, sf) });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // Prefer the interface matching the component slug; else the one with most props.
  results.sort((a, b) => b.props.length - a.props.length);
  return results[0] ?? null;
}

/* ------------------------------------------- usage snippets from previews */

function extractUsage() {
  const file = path.join(ROOT, "components/previews.tsx");
  const sf = parse(file);
  const usage = {};
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === "PREVIEWS" && node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)) {
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const key = prop.name.getText(sf).replace(/^["']|["']$/g, "");
        let expr = prop.initializer;
        if (ts.isParenthesizedExpression(expr)) expr = expr.expression;
        const text = expr.getText(sf);
        // Re-indent: strip the common leading whitespace of continuation lines.
        const lines = text.split("\n");
        if (lines.length > 1) {
          const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length);
          const cut = Math.max(0, Math.min(...indents) - 2);
          usage[key] = [lines[0], ...lines.slice(1).map((l) => l.slice(cut))].join("\n");
        } else {
          usage[key] = text;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return usage;
}

/* ------------------------------------------------------------------ main */

const out = {};
let ok = 0, misses = [];
for (const item of registry.items) {
  const file = path.join(ROOT, item.files[0].path);
  if (!fs.existsSync(file)) { misses.push(item.name); continue; }
  const extracted = extractProps(file);
  if (extracted && extracted.props.length) { out[item.name] = extracted; ok++; }
  else misses.push(item.name);
}

const usage = extractUsage();

const genDir = path.join(ROOT, "lib/generated");
fs.mkdirSync(genDir, { recursive: true });
fs.writeFileSync(path.join(genDir, "props.json"), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(path.join(genDir, "usage.json"), JSON.stringify(usage, null, 2) + "\n");

console.log(`props: ${ok}/${registry.items.length} components extracted`);
if (misses.length) console.log("no props extracted for:", misses.join(", "));
console.log(`usage: ${Object.keys(usage).length} snippets`);

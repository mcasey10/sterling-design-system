// A read-only fingerprint of a Sterling Figma file: every library page layer by layer (path, type, name, text,
// position, size, text style, fills, strokes, layout, link, description, component properties, and each
// instance's main component and properties), every variable (collection, name, type, description, publishing,
// scopes, value in each mode), and every text style. Each is reduced to a hash, with its count. Node ids are left
// out: documentation pages are redrawn on every build. Changes nothing in the file.
//
// This is Figma Plugin API code: the body of an async function, ending in `return`. Run it through
// scripts/figma-fingerprint.mjs, which wraps it for the file you name.

const PAGES = ["Cover", "Read me", "Foundations", "Components", "Guidelines", "Patterns", "Template", "Component architecture"];
const cyrb = (str) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
const r = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
const varNames = new Map(), styleNames = new Map(), nodeNames = new Map();
const varName = async (id) => {
  if (!varNames.has(id)) { const v = await figma.variables.getVariableByIdAsync(id); varNames.set(id, v ? v.name : "?"); }
  return varNames.get(id);
};
const styleName = async (id) => {
  if (!id || typeof id !== "string") return String(id === figma.mixed ? "mixed" : "");
  if (!styleNames.has(id)) { const s = await figma.getStyleByIdAsync(id); styleNames.set(id, s ? s.name : "?"); }
  return styleNames.get(id);
};
const paints = async (list) => {
  if (!Array.isArray(list)) return "mixed";
  const out = [];
  for (const p of list) {
    const bound = p.boundVariables && p.boundVariables.color;
    if (bound) out.push("var:" + (await varName(bound.id)));
    else if (p.type === "SOLID") out.push([r(p.color.r), r(p.color.g), r(p.color.b), r(p.opacity)].join(","));
    else out.push(p.type);
    if (p.visible === false) out.push("hidden");
  }
  return out.join("+");
};
const describe = async (node, path) => {
  const f = [path, node.type, node.visible ? "" : "hidden", r(node.x), r(node.y), r(node.width), r(node.height)];
  if ("fills" in node) f.push("f:" + (await paints(node.fills)));
  if ("strokes" in node) f.push("s:" + (await paints(node.strokes)) + ":" + String(node.strokeWeight === figma.mixed ? "mixed" : r(node.strokeWeight)));
  if ("cornerRadius" in node) f.push("r:" + String(node.cornerRadius === figma.mixed ? "mixed" : node.cornerRadius));
  if ("layoutMode" in node) f.push(["l", node.layoutMode, r(node.itemSpacing), r(node.paddingLeft), r(node.paddingRight), r(node.paddingTop), r(node.paddingBottom), node.primaryAxisAlignItems, node.counterAxisAlignItems, node.layoutWrap].join(":"));
  if ("layoutSizingHorizontal" in node) f.push("z:" + node.layoutSizingHorizontal + ":" + node.layoutSizingVertical + ":" + node.layoutPositioning);
  if ("opacity" in node) f.push("o:" + r(node.opacity));
  if (node.type === "TEXT") {
    f.push("t:" + JSON.stringify(node.characters));
    f.push("ts:" + (await styleName(node.textStyleId)));
    f.push("td:" + String(node.textDecoration === figma.mixed ? "mixed" : node.textDecoration));
    f.push("ta:" + node.textAlignHorizontal + ":" + node.textAutoResize + ":" + node.textTruncation);
    const link = node.hyperlink;
    if (link && link !== figma.mixed) {
      if (link.type === "NODE") {
        if (!nodeNames.has(link.value)) { const target = await figma.getNodeByIdAsync(link.value); nodeNames.set(link.value, target ? target.name : "?"); }
        f.push("h:NODE:" + nodeNames.get(link.value));
      } else f.push("h:URL:" + link.value);
    } else if (link === figma.mixed) f.push("h:mixed");
  }
  if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    f.push("d:" + JSON.stringify(node.description));
    f.push("dl:" + node.documentationLinks.map((l) => l.uri).join(","));
    if (node.type === "COMPONENT_SET" || node.parent.type !== "COMPONENT_SET") {
      const defs = node.componentPropertyDefinitions;
      f.push("pd:" + Object.keys(defs).sort().map((k) => k.split("#")[0] + ":" + defs[k].type + ":" + (defs[k].type === "INSTANCE_SWAP" ? "swap" : String(defs[k].defaultValue)) + ":" + (defs[k].variantOptions || []).join("/")).join(";"));
    }
  }
  if (node.type === "INSTANCE") {
    const main = await node.getMainComponentAsync();
    f.push("m:" + (main ? (main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name + "/" : "") + main.name : "?"));
    const props = node.componentProperties;
    f.push("p:" + Object.keys(props).sort().map((k) => k.split("#")[0] + "=" + (props[k].type === "INSTANCE_SWAP" ? "swap" : String(props[k].value))).join(";"));
  }
  return f.join("|");
};
const walk = async (node, path, lines) => {
  lines.push(await describe(node, path));
  if ("children" in node) {
    const seen = {};
    for (const child of node.children) {
      seen[child.name] = (seen[child.name] || 0) + 1;
      await walk(child, path + " / " + child.name + (seen[child.name] > 1 ? "#" + seen[child.name] : ""), lines);
    }
  }
};
const out = { pages: {} };
for (const pageName of PAGES) {
  const page = figma.root.children.find((p) => p.name === pageName);
  if (!page) { out.pages[pageName] = "missing"; continue; }
  await page.loadAsync();
  const all = [];
  for (const top of page.children) {
    all.push(await describe(top, top.name));
    for (const section of "children" in top ? top.children : []) {
      const lines = [];
      await walk(section, top.name + " / " + section.name, lines);
      all.push(...lines);
    }
  }
  out.pages[pageName] = [all.length, cyrb(all.join("\n"))];
}
const vars = await figma.variables.getLocalVariablesAsync();
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const colById = new Map(cols.map((c) => [c.id, c]));
const varLines = [];
for (const v of vars) {
  const c = colById.get(v.variableCollectionId);
  const vals = [];
  for (const m of c.modes) {
    const val = v.valuesByMode[m.modeId];
    vals.push(m.name + "=" + (val && val.type === "VARIABLE_ALIAS" ? "alias:" + (await varName(val.id)) : typeof val === "object" ? [r(val.r), r(val.g), r(val.b), r(val.a)].join(",") : String(val)));
  }
  varLines.push([c.name, v.name, v.resolvedType, JSON.stringify(v.description), v.hiddenFromPublishing, (v.scopes || []).join("/"), vals.join(";")].join("|"));
}
varLines.sort();
out.variables = [vars.length, cyrb(varLines.join("\n"))];
const styles = await figma.getLocalTextStylesAsync();
out.textStyles = [styles.length, cyrb(styles.map((s) => [s.name, s.fontName.family, s.fontName.style, s.fontSize, JSON.stringify(s.lineHeight), JSON.stringify(s.letterSpacing), s.textDecoration, JSON.stringify(s.description)].join("|")).sort().join("\n"))];
return out;

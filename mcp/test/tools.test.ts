// Each tool, called directly: the right result for known names in every accepted form, and an error a
// client can act on for unknown ones.

import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPONENTS, ICONS, PATTERNS, SECTIONS } from "../src/data";
import { CATEGORIES, COLLECTIONS, TOOLS, getComponent, getGuideline, getPattern, getToken, getTokens, listComponents, listGuidelines, search, type Result } from "../src/tools";
import { TOOL_NAMES } from "../src/tool-names";

const data = (result: Result): any => {
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result.data;
};
const error = (result: Result) => {
  assert.ok(!result.ok, "expected an error");
  return result;
};

test("the tools are the eight listed, each with a description and an input schema", () => {
  assert.deepEqual(TOOLS.map((t) => t.name), [...TOOL_NAMES]);
  assert.equal(TOOLS.length, 8);
  for (const tool of TOOLS) {
    assert.ok(tool.description.length > 80, `${tool.name} needs a real description`);
    assert.ok(tool.title);
  }
});

test("list_components lists all 24 components and the icons", () => {
  const all = data(listComponents());
  assert.equal(all.count, 24);
  assert.equal(all.components.length, COMPONENTS.length);
  assert.equal(all.icons.names.length, 20);
  for (const c of all.components) assert.ok(c.name && c.react && c.description && c.category);
});

test("list_components filters by category, in any letter case, and rejects an unknown one", () => {
  let total = 0;
  for (const category of CATEGORIES.filter((c) => c !== "Icon")) {
    const result = data(listComponents(category.toUpperCase()));
    assert.ok(result.count > 0, category);
    assert.ok(result.components.every((c: any) => c.category === category));
    total += result.count;
  }
  assert.equal(total, 24);
  assert.equal(data(listComponents("Grid")).count, 8);
  assert.deepEqual(CATEGORIES, ["Controls", "Chip", "Grid", "Input", "Overlay", "Summary", "Tabs", "Icon"]);
  assert.equal(data(listComponents("icon")).icons.names.length, 20);
  assert.equal(data(listComponents("Icons")).icons.names.length, 20);
  const bad = error(listComponents("Widgets"));
  assert.match(bad.error, /No category named "Widgets"/);
  assert.match(bad.error, /Controls, Chip, Grid/);
});

test("get_component accepts every component's Figma name, React name, and id", () => {
  for (const c of COMPONENTS) {
    for (const form of [c.name, c.react.component, c.id, c.name.toUpperCase(), c.name.toLowerCase(), c.name.replace("/", " / ")]) {
      assert.equal(data(getComponent(form)).name, c.name, `"${form}" should find ${c.name}`);
    }
  }
});

test("get_component returns the full entry", () => {
  const grid = data(getComponent("DataGrid"));
  assert.equal(grid.name, "Grid/Data grid");
  assert.equal(grid.react.component, "DataGrid");
  assert.equal(grid.react.props.length, 15);
  assert.ok(grid.description && grid.useWhen && grid.dontUseWhen && grid.related.length && grid.storybook);
  assert.equal(data(getComponent("data grid")).name, "Grid/Data grid");
  const button = data(getComponent("button"));
  assert.deepEqual(button.figma.variantProperties.map((p: any) => p.name), ["Kind", "Size", "State"]);
});

test("get_component returns the shared Icon entry for every icon, in every form", () => {
  for (const full of ICONS.names) {
    const icon = full.slice("Icon/".length);
    const capital = icon[0].toUpperCase() + icon.slice(1);
    for (const form of [full, `Icon/${capital}`, `icon/${icon}`, `ICON/${icon.toUpperCase()}`]) {
      const result = data(getComponent(form));
      assert.equal(result.name, "Icon/*", form);
      assert.equal(result.requested.icon, icon, form);
      assert.equal(result.requested.react, `<Icon name="${icon}" />`);
      assert.equal(result.names.length, 20);
    }
  }
  assert.equal(data(getComponent("Icon/Search")).requested.figmaName, "Icon/search");
  // The entry itself, with no icon asked for.
  for (const form of ["Icon", "icons", "Icon/*"]) {
    const result = data(getComponent(form));
    assert.equal(result.name, "Icon/*");
    assert.equal(result.requested, undefined);
  }
});

test("a bare icon name finds the Icon entry unless a component answers to it", () => {
  assert.equal(data(getComponent("chevron-down")).requested.icon, "chevron-down");
  assert.equal(data(getComponent("search")).requested.icon, "search");
  // "filter" is both an icon and the Chip/Filter component: the component wins, and Icon/filter still works.
  assert.equal(data(getComponent("filter")).name, "Chip/Filter");
  assert.equal(data(getComponent("Icon/filter")).requested.icon, "filter");
});

test("get_component gives the closest matches for an unknown name", () => {
  const table = error(getComponent("DataTable"));
  assert.match(table.error, /No component named "DataTable"/);
  assert.equal(table.suggestions[0], "Grid/Data grid (DataGrid)", table.error);
  assert.match(table.error, /list_components/);
  assert.ok(error(getComponent("Buton")).suggestions[0].startsWith("Controls/Button"));
  // A different word for the same thing is found by what the component is about, not by spelling.
  assert.deepEqual(error(getComponent("Modal")).suggestions, ["Overlay/Dialog (Dialog)"]);
  assert.equal(error(getComponent("Dropdown")).suggestions[0], "Input/Select (Select)");
  assert.ok(error(getComponent("Status badge")).suggestions[0].startsWith("Chip/Status"));
  for (const name of ["Dropdown", "Toggle", "Summary", "Table", "Panel"]) assert.ok(error(getComponent(name)).suggestions.length <= 5);
  // Nothing like it: no matches, and the error still says what to do.
  assert.deepEqual(error(getComponent("Xyzzy")).suggestions, []);
  assert.equal(error(getComponent("Xyzzy")).error, 'No component named "Xyzzy". Call list_components to see every component.');
  const icon = error(getComponent("Icon/serch"));
  assert.match(icon.error, /No icon named "serch"/);
  assert.deepEqual(icon.suggestions[0], "Icon/search");
  assert.equal(error(getComponent("")).suggestions.length, 0);
});

test("get_tokens with no arguments is an overview of the collections", () => {
  const overview = data(getTokens());
  assert.deepEqual(overview.collections.map((c: any) => c.name), ["primitives", "color", "spacing", "size", "density", "typography"]);
  assert.deepEqual(overview.collections.map((c: any) => c.name), COLLECTIONS);
  const color = overview.collections.find((c: any) => c.name === "color");
  assert.deepEqual(color.modes, ["Light", "Dark"]);
  assert.equal(overview.collections.find((c: any) => c.name === "spacing").modes, undefined);
  assert.equal(overview.tokens, undefined, "the overview lists no tokens");
});

test("get_tokens lists a collection, with every mode or one", () => {
  const color = data(getTokens("color"));
  const background = color.tokens.find((t: any) => t.name === "surface/background");
  assert.deepEqual(background.value, { Light: "#F7F8FA", Dark: "#14181D" });
  assert.equal(background.css, "--stl-color-surface-background");
  const dark = data(getTokens("Color", "dark")).tokens.find((t: any) => t.name === "surface/background");
  assert.deepEqual({ aliasOf: dark.aliasOf, value: dark.value }, { aliasOf: "neutral/900", value: "#14181D" });
  // A mode alone says which collection is meant.
  const compact = data(getTokens(undefined, "Compact"));
  assert.equal(compact.collection, "density");
  assert.deepEqual(compact.tokens.find((t: any) => t.name === "row/height").value, "24px");
  assert.equal(data(getTokens("spacing")).tokens.find((t: any) => t.name === "space/8").value, "8px");
  assert.equal(data(getTokens("typography")).count, 11);
  for (const collection of COLLECTIONS) assert.ok(data(getTokens(collection)).count > 0, collection);
});

test("get_tokens rejects an unknown collection or mode, and a mode the collection doesn't have", () => {
  assert.match(error(getTokens("colours")).error, /No token collection named "colours".*color/);
  assert.match(error(getTokens("color", "Sepia")).error, /No mode named "Sepia".*Light \(color\)/);
  assert.match(error(getTokens("spacing", "Dark")).error, /spacing collection has no Dark mode/);
  assert.match(error(getTokens("density", "Dark")).error, /Its modes: Compact, Default, Comfortable/);
});

test("get_token accepts the Figma name, the CSS name, the DTCG path, and the collection with the name", () => {
  for (const form of ["surface/background", "--stl-color-surface-background", "color.surface.background", "color/surface/background", "Surface/Background"]) {
    const token = data(getToken(form));
    assert.equal(token.name, "surface/background", form);
    assert.equal(token.collection, "color");
    assert.equal(token.css, "--stl-color-surface-background");
    assert.deepEqual(token.modes.Light, { aliasOf: "neutral/50", value: "#F7F8FA" });
    assert.deepEqual(token.modes.Dark, { aliasOf: "neutral/900", value: "#14181D" });
    assert.ok(token.description);
  }
  assert.equal(data(getToken("space/8")).value, "8px");
  assert.equal(data(getToken("--stl-space-8")).name, "space/8");
  assert.equal(data(getToken("neutral/50")).published, false);
  const row = data(getToken("row/height"));
  assert.deepEqual(row.modes.Compact, { aliasOf: "size/24", value: "24px" });
  assert.equal(row.defaultMode, "Default");
  assert.match(data(getToken("surface/scrim")).modes.Light.value, /at 50%$/);
});

test("get_token returns a text style by name or class", () => {
  for (const form of ["Body", "body", ".stl-text-body", "typography.Body"]) {
    const style = data(getToken(form));
    assert.equal(style.name, "Body", form);
    assert.equal(style.css, ".stl-text-body");
    assert.equal(style.value.fontSize, "13px");
  }
  assert.equal(data(getToken("Body-link")).textDecoration, "underline");
  assert.equal(data(getToken("Numeric")).tabularFigures, true);
});

test("get_token gives the closest matches for an unknown name", () => {
  const bad = error(getToken("surface/backgroud"));
  assert.match(bad.error, /No token named "surface\/backgroud"/);
  assert.ok(bad.suggestions[0].startsWith("surface/background"), bad.error);
  assert.ok(error(getToken("--stl-color-brand")).error.includes("get_tokens"));
  assert.ok(error(getToken("hover")).suggestions.every((s) => s.includes("hover")));
});

test("list_guidelines lists the 7 sections and 9 patterns with summaries", () => {
  const all = data(listGuidelines());
  assert.equal(all.sections.length, 7);
  assert.equal(all.patterns.length, 9);
  for (const item of [...all.sections, ...all.patterns]) assert.ok(item.name && item.summary);
});

test("get_guideline returns every section, by name or id, and explains an unknown one", () => {
  for (const s of SECTIONS) {
    for (const form of [s.name, s.id, s.name.toUpperCase()]) assert.equal(data(getGuideline(form)).name, s.name, form);
  }
  assert.equal(data(getGuideline("data display")).rules.length, 11);
  assert.equal(data(getGuideline("Accessibility")).doDont.length, 2);
  assert.ok(data(getGuideline("Principles")).table.rows.length > 10);
  const bad = error(getGuideline("Acessibility"));
  assert.deepEqual(bad.suggestions, ["Accessibility"]);
  assert.match(error(getGuideline("Typography")).error, /Sections: Principles, Accessibility/);
  assert.match(error(getGuideline("Saved views")).error, /is a pattern.*get_pattern\("Saved views"\)/);
});

test("get_pattern returns every pattern, by name or id, and explains an unknown one", () => {
  for (const p of PATTERNS) {
    for (const form of [p.name, p.id, p.name.toLowerCase()]) assert.equal(data(getPattern(form)).name, p.name, form);
  }
  const form = data(getPattern("form layout"));
  assert.equal(form.steps.length, 6);
  assert.deepEqual(form.steps.map((s: any) => s.number), [1, 2, 3, 4, 5, 6]);
  assert.ok(error(getPattern("Confirm dialog")).suggestions.includes("Confirmation dialog"));
  assert.match(error(getPattern("Color")).error, /is a guideline section.*get_guideline\("Color"\)/);
  assert.match(error(getPattern("Wizard")).error, /Patterns: Filters, grid, and bulk actions/);
});

test("search finds components, guidelines, patterns, and tokens, and says which tool to call", () => {
  const sort = data(search("sort"));
  assert.ok(sort.results.length > 0 && sort.results.length <= 10);
  assert.ok(sort.results.some((r: any) => r.type === "component" && r.name === "Grid/HeaderCell"));
  for (const r of sort.results) {
    assert.ok(r.excerpt && r.tool && r.arguments);
    assert.ok((TOOL_NAMES as readonly string[]).includes(r.tool));
  }
  const top = (query: string) => data(search(query)).results[0];
  assert.deepEqual([top("empty state").type, top("empty state").name], ["component", "Grid/Empty state"]);
  assert.equal(top("DataGrid").name, "Grid/Data grid");
  assert.equal(top("saved views").name, "Saved views");
  assert.equal(top("saved views").tool, "get_pattern");
  assert.ok(data(search("contrast")).results.some((r: any) => r.type === "guideline" && r.name === "Accessibility"));
  assert.ok(data(search("scrim")).results.some((r: any) => r.type === "token" && r.name === "surface/scrim"));
  assert.ok(data(search("chevron")).results.some((r: any) => r.type === "icon"));
  const types = new Set(["sort", "focus", "filter", "row", "label"].flatMap((q) => data(search(q)).results.map((r: any) => r.type)));
  for (const type of ["component", "guideline", "pattern", "token"]) assert.ok(types.has(type), `search never returned a ${type}`);
});

test("every search result's tool call works", () => {
  const byName = new Map(TOOLS.map((t) => [t.name, t]));
  for (const query of ["sort", "disabled", "empty state", "color", "density", "icon"]) {
    for (const r of data(search(query)).results) {
      const result = byName.get(r.tool)!.run(r.arguments);
      assert.ok(result.ok, `${r.tool}(${JSON.stringify(r.arguments)}) from search("${query}")`);
    }
  }
});

test("search with nothing to find says so, and rejects an empty query", () => {
  const none = data(search("zzzqqq"));
  assert.equal(none.results.length, 0);
  assert.match(none.next, /list_components/);
  assert.match(error(search(" ")).error, /two or more letters/);
});

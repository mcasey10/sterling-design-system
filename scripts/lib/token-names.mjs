// How token names become CSS names. No imports, so both the Node scripts and browser code (the coded
// layer's Foundations pages) use the same rule.

/** "accent/default" → "accent-default" */
export const slug = (name) => name.replace(/[^a-zA-Z0-9]+/g, "-");
/**
 * Sterling's code prefix. Everything Sterling puts in the global CSS namespace carries it: custom
 * properties (--stl-space-8, --stl-color-text-primary) and classes (.stl-density-compact, .stl-text-body).
 */
export const PREFIX = "stl";
/** "space/8" → "--stl-space-8"; "color/text/primary" → "--stl-color-text-primary" */
export const cssVar = (name) => `--${PREFIX}-${slug(name)}`;
/** "density-compact" → "stl-density-compact" */
export const cssClass = (name) => `${PREFIX}-${slug(name).toLowerCase()}`;

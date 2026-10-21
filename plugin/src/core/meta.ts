// Sterling's name, tagline, and version. The version comes from the root package.json (bundled by
// esbuild), the single source of the version number; `npm run check:tokens` fails if tokens.json disagrees.

import { version } from "../../../package.json";

export const NAME = "Sterling";
export const TAGLINE = "A design system for data-dense applications";
export const VERSION: string = version;
/** Author credit shown on the cover. */
export const CREDIT = "Michael Casey · 2026";

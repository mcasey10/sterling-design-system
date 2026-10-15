import type { Meta, StoryObj } from "@storybook/react-vite";
import { COMPONENTS } from "../../../definitions/components";
import { AI_PAGE_URL, FIGMA_COMMUNITY_URL, INSTALL_PACKAGE_URL, TOKENS_URL, WEBSITE_URL } from "../../../definitions/site";
import { Link } from "../components/Link";
import { VERSION, textClass } from "../tokens";
import "./foundations.css";

// On the published site, the website sits one folder above Storybook (set by scripts/build-site.mjs), so its pages
// are linked relatively; anywhere else (npm run storybook), they are linked at their published addresses.
const TOKEN_SITE: string | undefined = import.meta.env.STORYBOOK_TOKEN_SITE_URL;
const onSite = (url: string) => (TOKEN_SITE && url.startsWith(WEBSITE_URL) ? TOKEN_SITE + url.slice(WEBSITE_URL.length) : url);

function IntroductionPage() {
  return (
    <div className="stl-docs">
      <section>
        <h1 className={textClass("Display")}>Sterling {VERSION}</h1>
        <p>
          A design system for data-dense applications. This is Sterling in code: React components built from the same
          tokens and component definitions as the Figma library, so the two can't drift apart.
        </p>
      </section>
      <section>
        <h2 className={textClass("Heading")}>Use it in your app</h2>
        <p>
          The components are the sterling-ui package, installed into a React project from the GitHub Release. Every step,
          with how to check each one:{" "}
          <Link label="Install sterling-ui" size="md" href={onSite(INSTALL_PACKAGE_URL)} target="_top" />
        </p>
      </section>
      <section>
        <h2 className={textClass("Heading")}>What is here</h2>
        <p>
          <strong>Foundations</strong> lists the color, spacing, size, density, and type tokens, drawn from the token file.{" "}
          <strong>Components</strong> has all {Object.keys(COMPONENTS).length} components and the icons. Each has a Docs page
          with guidance, its props, and an “All variants” story laid out like its Figma variant set.
        </p>
        <p>
          The toolbar switches <strong>Theme</strong> (Light or Dark) and <strong>Density</strong> (Compact, Default, or
          Comfortable) for every story. The Accessibility panel under each story shows the result of its automated check.
        </p>
      </section>
      <section>
        <h2 className={textClass("Heading")}>Elsewhere</h2>
        <ul>
          <li>
            Every way into Sterling, for each kind of reader: <Link label="Start here" size="md" href={onSite(WEBSITE_URL)} target="_top" />
          </li>
          <li>
            Every token with its value in both color modes, and every contrast pair:{" "}
            <Link label="Token reference" size="md" href={onSite(TOKENS_URL)} target="_top" />
          </li>
          <li>
            The same components as a Figma library, with the guidelines, patterns, and an example screen:{" "}
            <Link label="Sterling on Figma Community" size="md" href={FIGMA_COMMUNITY_URL} target="_top" />
          </li>
          <li>
            The MCP server and the files for AI tools: <Link label="Sterling and AI tools" size="md" href={onSite(AI_PAGE_URL)} target="_top" />
          </li>
        </ul>
      </section>
    </div>
  );
}

const meta = {
  title: "Introduction",
  component: IntroductionPage,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof IntroductionPage>;
export default meta;

export const Introduction: StoryObj<typeof meta> = {};

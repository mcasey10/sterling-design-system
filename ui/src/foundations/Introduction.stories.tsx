import type { Meta, StoryObj } from "@storybook/react-vite";
import { COMPONENTS } from "../../../definitions/components";
import { FIGMA_FILE_URL } from "../../../definitions/docRegistry";
import { Link } from "../components/Link";
import { VERSION, textClass } from "../tokens";
import "./foundations.css";

// On the published site, the token reference sits one folder above Storybook (set by scripts/build-site.mjs).
const TOKEN_SITE: string | undefined = import.meta.env.STORYBOOK_TOKEN_SITE_URL;

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
      {TOKEN_SITE && (
        <section>
          <h2 className={textClass("Heading")}>Token reference</h2>
          <p>
            Every token with its value in both color modes, and the contrast of every text and background pair:{" "}
            <Link label="Sterling token reference" size="md" href={TOKEN_SITE} target="_top" />
          </p>
        </section>
      )}
      <section>
        <h2 className={textClass("Heading")}>Figma library</h2>
        <p>
          The same components as a Figma library, with the guidelines, patterns, and an example screen:{" "}
          <Link label="View in Figma" size="md" href={FIGMA_FILE_URL} target="_top" />
        </p>
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

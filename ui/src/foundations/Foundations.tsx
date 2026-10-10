// The Foundations pages: every table is drawn from tokens/tokens.json, so the pages always match the
// tokens. Swatches and samples use the CSS custom properties, so they follow the Theme and Density toolbar.

import type { CSSProperties, ReactNode } from "react";
import {
  COLORS, COLOR_MODES, DEFAULT_DENSITY, DENSITY, DENSITY_MODES, DESCRIPTIONS, PRIMITIVES, SIZES, SPACING, TEXT_STYLES,
  aliasOf, colorVar, densityClass, textClass, tokenVar,
} from "../tokens";
import "./foundations.css";

const Code = ({ children }: { children: ReactNode }) => <code className={textClass("Code")}>{children}</code>;

function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="stl-docs">
      <section>
        <h1 className={textClass("Display")}>{title}</h1>
        <p>{intro}</p>
      </section>
      {children}
    </div>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className={textClass("Heading")}>{title}</h2>
      {intro && <p>{intro}</p>}
      {children}
    </section>
  );
}

function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    // Wide tables scroll inside this region, which a keyboard user can focus and scroll.
    <div className="stl-docs-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className={textClass("Label")}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const Swatch = ({ color, label }: { color: string; label: string }) => (
  <span className="stl-docs-swatch" style={{ background: color }} role="img" aria-label={label} />
);

export function ColorPage() {
  return (
    <Page
      title="Color"
      intro="Semantic color tokens alias the primitive ramps. Components use the semantic tokens, never a primitive or a raw hex value. The swatches follow the Theme toolbar."
    >
      <Section title="Semantic colors">
        <Table caption="Semantic color tokens" head={["Token", "Current theme", ...COLOR_MODES, "CSS custom property", "Use"]}>
          {COLORS.map(([name, modes]) => (
            <tr key={name}>
              <th scope="row">
                <Code>{name}</Code>
              </th>
              <td>
                <Swatch color={`var(${colorVar(name)})`} label={`${name} in the current theme`} />
              </td>
              {COLOR_MODES.map((mode) => (
                <td key={mode}>
                  <Code>{aliasOf(modes[mode]) ?? modes[mode]}</Code>
                </td>
              ))}
              <td>
                <Code>{colorVar(name)}</Code>
              </td>
              <td className="stl-docs-note">{DESCRIPTIONS.color[name]}</td>
            </tr>
          ))}
        </Table>
      </Section>
      <Section title="Primitives" intro="Raw color ramps. Only semantic tokens refer to them; they are hidden from the Figma library.">
        {PRIMITIVES.map(([ramp, steps]) => (
          <div key={ramp}>
            <h3 className={textClass("Body-strong")}>{ramp}</h3>
            <ul className="stl-docs-ramp">
              {steps.map(([step, hex]) => (
                <li key={step}>
                  <Swatch color={`var(${tokenVar(`${ramp}/${step}`)})`} label={`${ramp}/${step}: ${hex}`} />
                  <span className={textClass("Label")}>{step}</span>
                  <span className={`${textClass("Caption")} stl-docs-note`}>{hex}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
    </Page>
  );
}

function ScaleRows({ tokens, descriptions }: { tokens: [string, number][]; descriptions: Record<string, string> }) {
  return (
    <>
      {tokens.map(([name, value]) => {
        const size = `var(${tokenVar(name)})`;
        // A radius shows as a rounded box, a stroke as a line of that thickness, anything else as a bar of that length.
        const preview: { className: string; style: CSSProperties } = name.startsWith("radius/")
          ? { className: "stl-docs-box", style: { borderRadius: size } }
          : name.startsWith("stroke/")
            ? { className: "stl-docs-bar", style: { width: `var(${tokenVar("size/56")})`, height: size } }
            : { className: "stl-docs-bar", style: { width: size } };
        return (
          <tr key={name}>
            <th scope="row">
              <Code>{name}</Code>
            </th>
            <td className={`${textClass("Numeric")} stl-docs-number`}>{value}px</td>
            <td>
              <span {...preview} />
            </td>
            <td>
              <Code>{tokenVar(name)}</Code>
            </td>
            <td className="stl-docs-note">{descriptions[name]}</td>
          </tr>
        );
      })}
    </>
  );
}

export function SpacingAndSizePage() {
  const head = ["Token", "Value", "Preview", "CSS custom property", "Use"];
  return (
    <Page
      title="Spacing and size"
      intro="Gaps and padding use the spacing scale; fixed widths and heights use the size scale. Heights that should follow density use the Density tokens instead."
    >
      <Section title="Spacing and radius">
        <Table caption="Spacing and radius tokens" head={head}>
          <ScaleRows tokens={SPACING} descriptions={DESCRIPTIONS.spacing} />
        </Table>
      </Section>
      <Section title="Size and stroke">
        <Table caption="Size and stroke tokens" head={head}>
          <ScaleRows tokens={SIZES} descriptions={DESCRIPTIONS.size} />
        </Table>
      </Section>
    </Page>
  );
}

export function DensityPage() {
  return (
    <Page
      title="Density"
      intro={`Density tokens set the heights and padding of rows and controls. Every value is an alias to the size or spacing scale. ${DEFAULT_DENSITY} applies by default; each other mode applies inside a container with its class.`}
    >
      <Section title="Live sample" intro="Sized by the Density tokens. Change Density in the toolbar to see it respond.">
        <div className="stl-docs-sample">
          <div className="stl-docs-sample-row">
            <span>Grid row</span>
            <span className={textClass("Numeric")}>1,250,000.00</span>
          </div>
          <span className="stl-docs-sample-control">Control</span>
        </div>
      </Section>
      <Section title="Tokens">
        <Table caption="Density tokens" head={["Token", ...DENSITY_MODES, "CSS custom property", "Use"]}>
          {DENSITY.map(([name, modes]) => (
            <tr key={name}>
              <th scope="row">
                <Code>{name}</Code>
              </th>
              {DENSITY_MODES.map((mode) => (
                <td key={mode}>
                  <Code>{aliasOf(modes[mode]) ?? modes[mode]}</Code>
                </td>
              ))}
              <td>
                <Code>{tokenVar(name)}</Code>
              </td>
              <td className="stl-docs-note">{DESCRIPTIONS.density[name]}</td>
            </tr>
          ))}
        </Table>
      </Section>
      <Section title="Classes">
        <Table caption="Density classes" head={["Mode", "How to apply"]}>
          {DENSITY_MODES.map((mode) => (
            <tr key={mode}>
              <th scope="row">{mode}</th>
              <td>{mode === DEFAULT_DENSITY ? "Nothing to add: it is the default." : <Code>.{densityClass(mode)}</Code>}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </Page>
  );
}

export function TypographyPage() {
  return (
    <Page title="Typography" intro="Text styles are classes. Numeric uses tabular figures, so digits line up in columns.">
      <Section title="Text styles">
        <Table caption="Text styles" head={["Style", "Specimen", "Size / line height", "Weight", "Class"]}>
          {TEXT_STYLES.map(([name, style]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={textClass(name)}>{style.tabularFigures ? "1,234,567.89" : "Sterling design system"}</td>
              <td className={textClass("Numeric")}>
                {style.fontSize} / {style.lineHeight}
              </td>
              <td>
                {style.fontStyle}
                {style.tabularFigures ? ", tabular figures" : ""}
              </td>
              <td>
                <Code>.{textClass(name)}</Code>
              </td>
            </tr>
          ))}
        </Table>
      </Section>
    </Page>
  );
}

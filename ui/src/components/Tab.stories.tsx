import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";
import { componentDef } from "../../../definitions/components";
import { FORCED_STATES, argTypes, defaultArgs, docs, stateProps } from "../stories/definitions";
import { textClass } from "../tokens";
import { Tab, TabList, type TabProps } from "./Tab";

const NAME = "Tabs/Tab";

const meta = {
  title: "Components/Tabs/Tab",
  component: Tab,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: { ...argTypes(NAME), selected: { control: "boolean", description: "The selected state.", table: { type: { summary: "boolean" } } }, type: { control: false } },
  args: { ...(defaultArgs(NAME) as unknown as TabProps), selected: true },
  // A tab is only meaningful inside a list of tabs.
  render: (args) => (
    <TabList label="Views">
      <Tab {...args} />
    </TabList>
  ),
} satisfies Meta<typeof Tab>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Tabs in a TabList. Left and Right move between tabs, Home and End go to the first and last, and Enter or
 * Space selects. The disabled tab is skipped.
 */
export const InATabList: Story = {
  name: "In a tab list",
  parameters: { controls: { disable: true } },
  render: function Views() {
    const tabs = [
      { label: "All", count: "120" },
      { label: "Open", count: "84" },
      { label: "Closed", count: "36" },
      { label: "Archived", count: "0", disabled: true },
    ];
    const [selected, setSelected] = useState("All");
    return (
      <TabList label="Views">
        {tabs.map((tab) => (
          <Tab key={tab.label} {...tab} selected={tab.label === selected} onClick={() => setSelected(tab.label)} />
        ))}
      </TabList>
    );
  },
};

/**
 * Every State in the definition, in one tab list (a list needs at least one tab that can be used, so the
 * tabs can't each have their own). Hover and focus are forced here; in use they come from CSS.
 */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => {
    const states = componentDef(NAME).variants.State;
    return (
      <div className="stl-variant-strip" style={{ "--stl-variant-columns": states.length } as CSSProperties}>
        <div className="stl-variant-strip__row">
          {states.map((state) => (
            <span key={state} className={textClass("Caption")}>
              {state}
            </span>
          ))}
        </div>
        <TabList label="Every state" className="stl-variant-strip__row">
          {states.map((state) => (
            <Tab key={state} {...(stateProps(state, { selected: { selected: true } }) as TabProps)} label="Tab" />
          ))}
        </TabList>
      </div>
    );
  },
};

import {
  Button,
  Menu,
  MenuGroup,
  Option,
  OptionWithDescription,
  SelectField,
  type IconName,
} from "sterling-ui";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";

// Sterling's Select takes plain options only, so the View menu (grouped options with descriptions) and the
// Add filter menu use this small listbox behavior with Sterling's Menu, MenuGroup, and Option components.

function usePopupList(count: number, selectedIndex: number, onChoose: (index: number) => void) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
  });

  const show = (index: number) => {
    setActive(Math.max(0, Math.min(count - 1, index)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (index: number) => {
    close();
    onChoose(index);
  };
  const start = selectedIndex >= 0 ? selectedIndex : 0;

  return {
    open,
    listId,
    triggerRef,
    triggerProps: {
      "aria-haspopup": "listbox" as const,
      "aria-controls": open ? listId : undefined,
      onClick: (event: MouseEvent) => {
        setKeyboard(event.detail === 0);
        if (open) close();
        else show(start);
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setKeyboard(true);
          show(event.key === "ArrowUp" && selectedIndex < 0 ? count - 1 : start);
        }
      },
    },
    listProps: {
      ref: listRef,
      id: listId,
      tabIndex: -1,
      "aria-activedescendant": open ? optionId(active) : undefined,
      className: "popup-list",
      onKeyDown: (event: KeyboardEvent) => {
        const moves: Record<string, number> = {
          ArrowDown: Math.min(count - 1, active + 1),
          ArrowUp: Math.max(0, active - 1),
          Home: 0,
          End: count - 1,
        };
        if (event.key in moves) {
          event.preventDefault();
          setKeyboard(true);
          setActive(moves[event.key]);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose(active);
        } else if (event.key === "Escape" || event.key === "Tab") {
          event.preventDefault();
          close();
        }
      },
      onBlur: (event: FocusEvent<HTMLUListElement>) => {
        const to = event.relatedTarget as Node | null;
        if (to && (event.currentTarget.contains(to) || triggerRef.current?.contains(to))) return;
        setOpen(false);
      },
    },
    optionProps: (index: number) => ({
      id: optionId(index),
      "data-focused": open && index === active ? "" : undefined,
      "data-focus-visible": open && keyboard && index === active ? "" : undefined,
      onMouseEnter: () => {
        setKeyboard(false);
        setActive(index);
      },
      onMouseDown: (event: MouseEvent) => event.preventDefault(),
      onClick: () => choose(index),
    }),
  };
}

export interface ViewChoice {
  id: string;
  name: string;
  group: string;
  description: string;
}

/** The View dropdown: saved views grouped, each with its filter set in muted text. */
export function ViewMenu({
  views,
  activeId,
  edited,
  onChoose,
}: {
  views: ViewChoice[];
  activeId: string;
  edited: boolean;
  onChoose: (id: string) => void;
}) {
  const groups = [...new Set(views.map((v) => v.group))];
  const ordered = groups.flatMap((g) => views.filter((v) => v.group === g));
  const selectedIndex = ordered.findIndex((v) => v.id === activeId);
  const list = usePopupList(ordered.length, selectedIndex, (i) => onChoose(ordered[i].id));
  const labelId = useId();
  const valueId = useId();
  const current = ordered[selectedIndex];

  return (
    <div className="view-menu">
      <span id={labelId} className="view-menu__label stl-text-body">
        View
      </span>
      <div className="popup-anchor">
        <SelectField
          label="View"
          showLabel={false}
          showHelper={false}
          className="view-menu__field"
          valueText={current ? `${current.name}${edited ? " · edited" : ""}` : undefined}
          placeholder="Choose a view"
          open={list.open}
          triggerRef={list.triggerRef}
          triggerProps={{ ...list.triggerProps, "aria-labelledby": `${labelId} ${valueId}` }}
          valueProps={{ id: valueId }}
        />
        {list.open && (
          <Menu {...list.listProps} aria-labelledby={labelId}>
            {groups.map((group) => (
              <MenuGroup key={group} label={group}>
                {ordered.map((view, index) =>
                  view.group === group ? (
                    <OptionWithDescription
                      key={view.id}
                      label={view.name}
                      description={view.description}
                      selected={view.id === activeId}
                      {...list.optionProps(index)}
                    />
                  ) : null,
                )}
              </MenuGroup>
            ))}
          </Menu>
        )}
      </div>
    </div>
  );
}

/** A button that opens a short list of choices, such as the filters that can be added. */
export function MenuButton({
  label,
  icon,
  menuLabel,
  items,
  onChoose,
}: {
  label: string;
  icon?: IconName;
  menuLabel: string;
  items: { id: string; label: string }[];
  onChoose: (id: string) => void;
}) {
  const list = usePopupList(items.length, -1, (i) => onChoose(items[i].id));
  return (
    <div className="popup-anchor">
      <Button
        kind="ghost"
        label={label}
        showIcon={!!icon}
        icon={icon}
        ref={list.triggerRef}
        aria-expanded={list.open}
        {...list.triggerProps}
      />
      {list.open && (
        <Menu {...list.listProps} aria-label={menuLabel}>
          {items.map((item, index) => (
            <Option key={item.id} label={item.label} {...list.optionProps(index)} />
          ))}
        </Menu>
      )}
    </div>
  );
}

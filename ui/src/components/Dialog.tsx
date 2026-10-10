// Overlay/Dialog: a modal dialog for one focused task, built on the native <dialog> element. The browser
// provides the modal behavior: focus stays inside, the page behind is inert, Escape closes, and focus goes
// back to where it was. The Body slot is `children`.

import { type DialogHTMLAttributes, type ReactNode, useEffect, useId, useRef } from "react";
import { textClass } from "../tokens";
import { Button } from "./Button";
import { cx } from "./classes";
import { IconButton } from "./IconButton";
import "./Dialog.css";

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "title" | "open" | "onClose" | "children"> {
  open: boolean;
  /** Called when the dialog should close: Cancel, the close button, or Escape. Set `open` to false in response. */
  onClose: () => void;
  /** Ask the question or name the task, e.g. "Delete 2 items?". */
  title: string;
  showClose?: boolean;
  /** The dialog's content. Put `data-autofocus` on a field to focus it when the dialog opens. */
  children: ReactNode;
  cancelLabel?: string;
  /** Repeat the verb, e.g. "Delete 2 items". Never "OK". */
  primaryLabel?: string;
  /** Use "danger" for a destructive action. */
  primaryKind?: "primary" | "danger";
  primaryDisabled?: boolean;
  onPrimary: () => void;
}

export function Dialog({
  open, onClose, title, showClose = true, children, cancelLabel = "Cancel", primaryLabel = "Confirm", primaryKind = "primary",
  primaryDisabled = false, onPrimary, className, ...rest
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      // Start on a field the content marks, or on Cancel: the safe choice when the action is destructive.
      (element.querySelector<HTMLElement>("[data-autofocus]") ?? cancel.current)?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={cx("stl-dialog", className)}
      aria-labelledby={titleId}
      // Escape asks to close; the owner decides by changing `open`.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      {...rest}
    >
      {open && (
        <>
          <div className="stl-dialog__header">
            <h2 id={titleId} className={cx("stl-dialog__title", textClass("Heading"))}>
              {title}
            </h2>
            {showClose && <IconButton kind="ghost" size="sm" icon="x" label="Close" onClick={onClose} />}
          </div>
          <div className="stl-dialog__body">{children}</div>
          <div className="stl-dialog__footer">
            <Button ref={cancel} kind="secondary" size="md" label={cancelLabel} onClick={onClose} />
            <Button kind={primaryKind} size="md" label={primaryLabel} disabled={primaryDisabled} onClick={onPrimary} />
          </div>
        </>
      )}
    </dialog>
  );
}

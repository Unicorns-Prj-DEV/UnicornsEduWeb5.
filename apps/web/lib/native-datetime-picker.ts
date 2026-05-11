import type { PointerEventHandler } from "react";

/**
 * WebKit (Safari) and some builds only open the native calendar/clock from the
 * trailing control icon, not when clicking the displayed value. Calling
 * `HTMLInputElement.showPicker()` from a user gesture opens it for the whole
 * control (Chrome 99+, Safari 16+, Firefox 116+).
 */
export const openNativeDateTimePickerOnPointerDown: PointerEventHandler<
  HTMLInputElement
> = (event) => {
  const input = event.currentTarget;
  const kind = input.type;
  if (kind !== "date" && kind !== "time" && kind !== "datetime-local") {
    return;
  }
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  if (typeof input.showPicker !== "function") {
    return;
  }
  try {
    event.preventDefault();
    void input.showPicker();
  } catch {
    /* InvalidStateError / NotSupportedError — keep default hit target */
  }
};

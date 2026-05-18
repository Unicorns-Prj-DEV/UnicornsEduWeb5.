export function openNativeInputPicker(input: HTMLInputElement) {
  if (input.disabled || input.readOnly) return;

  try {
    input.showPicker?.();
  } catch {
    // Some browsers only allow showPicker during trusted activation.
  }
}

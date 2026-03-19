"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type UpgradedSelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type DropdownPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

type Props = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: UpgradedSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  labelId?: string;
  buttonClassName?: string;
  menuClassName?: string;
  emptyStateLabel?: string;
};

function getFirstEnabledIndex(options: UpgradedSelectOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

function getNextEnabledIndex(
  options: UpgradedSelectOption[],
  startIndex: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1;

  let currentIndex = startIndex;
  for (let step = 0; step < options.length; step += 1) {
    currentIndex = (currentIndex + direction + options.length) % options.length;
    if (!options[currentIndex]?.disabled) {
      return currentIndex;
    }
  }

  return -1;
}

export default function UpgradedSelect({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Chọn giá trị",
  disabled = false,
  ariaLabel,
  labelId,
  buttonClassName,
  menuClassName,
  emptyStateLabel = "Không có tuỳ chọn.",
}: Props) {
  const generatedId = useId();
  const triggerId = id ?? `upgraded-select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<DropdownPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedValue = isControlled ? (value ?? "") : internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportMargin = 16;
      const gap = 8;
      const maxWidth = window.innerWidth - viewportMargin * 2;
      const width = Math.min(rect.width, maxWidth);
      const left = Math.min(
        Math.max(rect.left, viewportMargin),
        window.innerWidth - width - viewportMargin,
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportMargin;
      const spaceAbove = rect.top - viewportMargin;
      const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow;

      setMenuPosition({
        left,
        width,
        maxHeight: Math.max(
          160,
          shouldOpenUp ? spaceAbove - gap : spaceBelow - gap,
        ),
        ...(shouldOpenUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = options.findIndex(
      (option) => !option.disabled && option.value === selectedValue,
    );
    const fallbackIndex = getFirstEnabledIndex(options);
    const focusIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;

    if (focusIndex < 0) return;

    const frame = window.requestAnimationFrame(() => {
      optionRefs.current[focusIndex]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, options, selectedValue]);

  const commitValue = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabledOptions = options.filter((option) => !option.disabled);
    if (enabledOptions.length === 0) return;

    const focusedIndex = optionRefs.current.findIndex(
      (button) => button === document.activeElement,
    );
    const currentIndex = focusedIndex >= 0 ? focusedIndex : getFirstEnabledIndex(options);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = getNextEnabledIndex(options, currentIndex, 1);
      if (nextIndex >= 0) optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = getNextEnabledIndex(options, currentIndex, -1);
      if (nextIndex >= 0) optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const nextIndex = getFirstEnabledIndex(options);
      if (nextIndex >= 0) optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const reversedIndex = [...options]
        .reverse()
        .findIndex((option) => !option.disabled);
      if (reversedIndex >= 0) {
        const nextIndex = options.length - reversedIndex - 1;
        optionRefs.current[nextIndex]?.focus();
      }
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const triggerBaseClassName =
    "flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60";
  const triggerSurfaceClassName =
    buttonClassName ??
    "min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";
  const triggerClasses = `${triggerBaseClassName} ${triggerSurfaceClassName}`;

  const menuClasses =
    menuClassName ??
    "overflow-auto rounded-2xl border border-border-default bg-bg-surface/95 p-1 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm";

  return (
    <>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        data-upgraded-select-trigger
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={`truncate ${
            selectedOption ? "text-text-primary" : "text-text-muted"
          }`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          className={`ml-2 size-4 shrink-0 text-text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m6 9 6 6 6-6"
          />
        </svg>
      </button>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className={`fixed z-[120] ${menuClasses}`}
            style={menuPosition}
            data-upgraded-select-menu
            onKeyDown={handleMenuKeyDown}
          >
            {options.length > 0 ? (
              options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      option.disabled
                        ? "cursor-not-allowed text-text-muted/60"
                        : isSelected
                          ? "bg-primary/10 font-medium text-text-primary"
                          : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                    }`}
                    onClick={() => {
                      if (option.disabled) return;
                      commitValue(option.value);
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <svg
                        className="ml-3 size-4 shrink-0 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="m5 12 5 5L20 7"
                        />
                      </svg>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2.5 text-sm text-text-muted">
                {emptyStateLabel}
              </div>
            )}
          </div>,
          document.body,
        )
        : null}
    </>
  );
}

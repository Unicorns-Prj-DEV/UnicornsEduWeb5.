"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DevtoolsDetector, checkers } from "devtools-detector";

interface UseDevToolsDetectorOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

export function useDevToolsDetector(options: UseDevToolsDetectorOptions = {}) {
  const { enabled = true, pollingInterval = 500 } = options;
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);

  const updateState = useCallback((nextState: boolean) => {
    if (isOpenRef.current !== nextState) {
      isOpenRef.current = nextState;
      setIsOpen(nextState);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // 1. Safe & Deterministic DevtoolsDetector instance (excluding debuggerChecker & time-based performanceChecker)
    const detector = new DevtoolsDetector({
      checkers: [
        checkers.elementIdChecker,
        checkers.regToStringChecker,
        checkers.functionToStringChecker,
        checkers.depRegToStringChecker,
        checkers.dateToStringChecker,
        checkers.erudaChecker,
        checkers.devtoolsFormatterChecker,
      ],
    });

    const isMobileDevice = () => {
      const userAgent = navigator.userAgent || "";
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        );
      const hasTouch =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      return (
        isMobileUA ||
        (hasTouch && window.matchMedia("(max-width: 1024px)").matches)
      );
    };

    // 2. Desktop Window Geometry Check (catches docked DevTools on right/bottom/left)
    const checkGeometry = () => {
      if (isMobileDevice()) return;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 160 || heightDiff > 160) {
        updateState(true);
      } else if (!detector.isOpen) {
        updateState(false);
      }
    };

    // 3. DevtoolsDetector listener (catches console/timing checks)
    const handleDetectorChange = (status: boolean) => {
      if (status) {
        updateState(true);
      } else {
        checkGeometry();
      }
    };

    // 4. Keyboard trap (catches devtools / inspect shortcuts instantly)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key.toLowerCase();

      if (
        e.key === "F12" ||
        e.keyCode === 123 ||
        (isCmdOrCtrl && isShift && ["i", "j", "c"].includes(key)) ||
        (isCmdOrCtrl && isAlt && ["i", "j", "c", "u"].includes(key)) ||
        (isCmdOrCtrl && ["u", "s"].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        updateState(true);
      }
    };

    detector.setDetectDelay(1000);
    detector.addListener(handleDetectorChange);
    detector.launch();

    window.addEventListener("resize", checkGeometry);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    const interval = setInterval(checkGeometry, pollingInterval);
    checkGeometry();

    return () => {
      detector.removeListener(handleDetectorChange);
      detector.stop();
      window.removeEventListener("resize", checkGeometry);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearInterval(interval);
    };
  }, [enabled, pollingInterval, updateState]);

  return isOpen;
}

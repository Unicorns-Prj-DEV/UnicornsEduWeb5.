"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DevtoolsDetector, checkers } from "devtools-detector";

interface UseDevToolsDetectorOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Accurately detects mobile and tablet devices (iOS, Android, iPadOS).
 * Mobile/tablet devices do not have native on-screen dockable developer tools.
 */
export function isMobileOrTabletDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";

  // iOS (iPhone, iPad, iPod, or iPadOS where navigator.platform is MacIntel with touch)
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);

  // Android phone or tablet
  const isAndroid = /Android/i.test(ua);

  // Other mobile user agents
  const isOtherMobile = /webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);

  return isIOS || isAndroid || isOtherMobile;
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
    // Completely disable DevTools detection on mobile & tablet devices to prevent false positives from touch/zoom
    if (!enabled || typeof window === "undefined" || isMobileOrTabletDevice()) {
      if (isOpenRef.current) {
        queueMicrotask(() => updateState(false));
      }
      return;
    }

    // 1. Safe & Deterministic DevtoolsDetector instance (console / getter checkers)
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

    // 2. Desktop Window Geometry Check (catches docked DevTools on right/bottom)
    const checkDesktopGeometry = () => {
      if (isMobileOrTabletDevice()) return;

      // Skip geometry comparison if the user is zoomed (pinch-to-zoom or page zoom)
      if (
        window.visualViewport &&
        Math.abs(window.visualViewport.scale - 1) > 0.05
      ) {
        if (!detector.isOpen) {
          updateState(false);
        }
        return;
      }

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      // Docked DevTools panels are typically >= 220px in width/height
      if (widthDiff > 200 || heightDiff > 200) {
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
        checkDesktopGeometry();
      }
    };

    // 4. Keyboard trap (catches devtools / inspect shortcuts instantly on desktop)
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

    window.addEventListener("resize", checkDesktopGeometry);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    const interval = setInterval(checkDesktopGeometry, pollingInterval);
    checkDesktopGeometry();

    return () => {
      detector.removeListener(handleDetectorChange);
      detector.stop();
      window.removeEventListener("resize", checkDesktopGeometry);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearInterval(interval);
    };
  }, [enabled, pollingInterval, updateState]);

  return isOpen;
}


export function enableYouTubeProtection() {
  if (typeof window === "undefined") return;

  const handleContextMenu = (e: MouseEvent) => {
    if ((e.target as HTMLElement)?.closest("iframe[src*='youtube']")) {
      e.preventDefault();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "F12") {
      e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "C") {
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === "U") {
      e.preventDefault();
    }
    if (e.metaKey && e.altKey && e.key === "I") {
      e.preventDefault();
    }
    if (e.metaKey && e.altKey && e.key === "U") {
      e.preventDefault();
    }
  };

  document.addEventListener("contextmenu", handleContextMenu);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("contextmenu", handleContextMenu);
    document.removeEventListener("keydown", handleKeyDown);
  };
}

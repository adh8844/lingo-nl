import { useEffect, useState } from "react";

const SCHOOLPLEIN_URL = "https://schoolplein.najra.app";

export const SchoolpleinHeader = () => {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    try {
      setEnabled(sessionStorage.getItem("fromSchoolplein") === "true");
    } catch {
      setEnabled(false);
    }
    const touch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator as any).maxTouchPoints > 0);
    setIsTouch(!!touch);
  }, []);

  useEffect(() => {
    if (!enabled || isTouch) return;
    let hideTimer: number | undefined;

    const onMove = (e: MouseEvent) => {
      if (e.clientY <= 20) {
        if (hideTimer) {
          window.clearTimeout(hideTimer);
          hideTimer = undefined;
        }
        setVisible(true);
      } else if (e.clientY > 50 && visible) {
        if (hideTimer) window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => setVisible(false), 1500);
      }
    };
    const onLeave = () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 1500);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [enabled, isTouch, visible]);

  if (!enabled) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[100] h-10 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white shadow-lg transition-transform duration-300 ease-out"
        style={{
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <a
          href={SCHOOLPLEIN_URL}
          className="text-sm font-medium px-4 py-1 rounded hover:bg-white/10 transition-colors"
        >
          ← Terug naar Schoolplein
        </a>
      </div>
      {isTouch && !visible && (
        <button
          aria-label="Toon Schoolplein-balk"
          onClick={() => setVisible(true)}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-black/70 text-white text-xs px-3 py-1 rounded-b-md backdrop-blur-sm"
        >
          ▾
        </button>
      )}
    </>
  );
};

export default SchoolpleinHeader;

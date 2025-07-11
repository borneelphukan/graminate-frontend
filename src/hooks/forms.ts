import { useEffect, RefObject } from "react";

export const useAnimatePanel = (setAnimate: (val: boolean) => void) => {
  useEffect(() => {
    setAnimate(true);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [setAnimate]);
};

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback, enabled]);
};

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Density = "compact" | "comfy" | "spacious";

type DensityCtx = {
  density: Density;
  setDensity: (d: Density) => void;
};

const Ctx = createContext<DensityCtx | null>(null);

const STORAGE_KEY = "spcrm:density";

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>("comfy");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Density | null;
    if (stored === "compact" || stored === "comfy" || stored === "spacious") {
      setDensityState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    window.localStorage.setItem(STORAGE_KEY, d);
  }, []);

  return <Ctx.Provider value={{ density, setDensity }}>{children}</Ctx.Provider>;
}

export function useDensity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDensity must be used within DensityProvider");
  return ctx;
}

export const ROW_HEIGHT_BY_DENSITY: Record<Density, string> = {
  compact: "h-8",
  comfy: "h-11",
  spacious: "h-14",
};

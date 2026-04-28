import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export type Tier = "Free" | "Pro" | "Firm";
const DEV_EMAIL = "bhramar123@gmail.com";
const STORAGE_KEY = "bhramar.devTier";

type Ctx = {
  effectiveTier: Tier;
  realTier: Tier;
  isDevAccount: boolean;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  setDevTier: (t: Tier) => void;
};

const TierCtx = createContext<Ctx>({
  effectiveTier: "Free",
  realTier: "Free",
  isDevAccount: false,
  pickerOpen: false,
  setPickerOpen: () => {},
  setDevTier: () => {},
});

export function TierProvider({ children, realTier }: { children: ReactNode; realTier: Tier }) {
  const { user } = useAuth();
  const isDevAccount = (user?.email || "").toLowerCase() === DEV_EMAIL;
  const [devTier, setDevTierState] = useState<Tier | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isDevAccount) { setDevTierState(null); return; }
    const saved = localStorage.getItem(STORAGE_KEY) as Tier | null;
    if (saved && ["Free", "Pro", "Firm"].includes(saved)) {
      setDevTierState(saved);
    } else {
      setPickerOpen(true);
    }
  }, [isDevAccount, user?.id]);

  const setDevTier = useCallback((t: Tier) => {
    localStorage.setItem(STORAGE_KEY, t);
    setDevTierState(t);
    setPickerOpen(false);
  }, []);

  const effectiveTier: Tier = isDevAccount && devTier ? devTier : realTier;

  return (
    <TierCtx.Provider value={{ effectiveTier, realTier, isDevAccount, pickerOpen, setPickerOpen, setDevTier }}>
      {children}
    </TierCtx.Provider>
  );
}

export const useEffectiveTier = () => useContext(TierCtx);
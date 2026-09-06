"use client";

import React, { createContext, useContext, useState } from "react";
import { LayoutGroup } from "framer-motion";

type Source = { id: string; project: string } | null;
const Context = createContext<{
  source: Source; setSource: (source: Source) => void;
  open: boolean; setOpen: (open: boolean) => void;
}>({ source: null, setSource: () => {}, open: false, setOpen: () => {} });

export const useCollectibleTransition = () => useContext(Context);

export function CollectibleTransition({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<Source>(null);
  const [open, setOpen] = useState(false);
  return <Context.Provider value={{ source, setSource, open, setOpen }}>
    <LayoutGroup id="collectible-cards">{children}</LayoutGroup>
  </Context.Provider>;
}

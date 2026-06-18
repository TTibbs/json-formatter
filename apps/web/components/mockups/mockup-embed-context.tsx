"use client";

import { createContext, useContext, type ReactNode } from "react";

const MockupEmbedContext = createContext(false);

export function MockupEmbedProvider({ children }: { children: ReactNode }) {
  return (
    <MockupEmbedContext.Provider value={true}>
      {children}
    </MockupEmbedContext.Provider>
  );
}

export function useMockupEmbedded() {
  return useContext(MockupEmbedContext);
}

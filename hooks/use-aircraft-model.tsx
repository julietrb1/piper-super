"use client";

import { createContext, useContext, useState } from "react";

export type AircraftModel = "warrior3" | "arrow3";

type AircraftModelContextType = {
  model: AircraftModel;
  setModel: (model: AircraftModel) => void;
};

const AircraftModelContext = createContext<AircraftModelContextType | undefined>(
  undefined
);

export function AircraftModelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [model, setModel] = useState<AircraftModel>("warrior3");

  return (
    <AircraftModelContext.Provider value={{ model, setModel }}>
      {children}
    </AircraftModelContext.Provider>
  );
}

export function useAircraftModel() {
  const context = useContext(AircraftModelContext);
  if (context === undefined) {
    throw new Error(
      "useAircraftModel must be used within an AircraftModelProvider"
    );
  }
  return context;
}

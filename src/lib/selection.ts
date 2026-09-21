import { create } from "zustand";

type SelectionState = {
  norad: number | null;
  select: (norad: number | null) => void;
};

export const useSelection = create<SelectionState>((set) => ({
  norad: null,
  select: (norad) => set({ norad }),
}));

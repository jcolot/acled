import create from "zustand";

const useStore = create((set) => ({
  visibleTimelineDomain: [new Date("1970-01-01"), new Date()],
  mapBounds: null,
  setVisibleTimelineDomain: (visibleTimelineDomain) => set({ visibleTimelineDomain }),
  setMapBounds: (mapBounds) => set({ mapBounds }),
}));

export default useStore;

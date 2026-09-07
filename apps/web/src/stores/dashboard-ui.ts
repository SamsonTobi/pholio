import { create } from "zustand";

export type StatusFilter = "all" | "active" | "archived";

interface DashboardUIState {
  searchQuery: string;
  statusFilter: StatusFilter;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
}

export const useDashboardUIStore = create<DashboardUIState>((set) => ({
  searchQuery: "",
  statusFilter: "all",
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),
}));

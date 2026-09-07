import { create } from "zustand";

interface OnboardingState {
  selectedRepos: string[];
  includePrivate: boolean;
  toggleRepo: (repoFullName: string) => void;
  setSelectedRepos: (repos: string[]) => void;
  setIncludePrivate: (val: boolean) => void;
  clearSelection: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selectedRepos: [],
  includePrivate: false,
  toggleRepo: (fullName) =>
    set((state) => ({
      selectedRepos: state.selectedRepos.includes(fullName)
        ? state.selectedRepos.filter((r) => r !== fullName)
        : [...state.selectedRepos, fullName],
    })),
  setSelectedRepos: (selectedRepos) => set({ selectedRepos }),
  setIncludePrivate: (includePrivate) => set({ includePrivate }),
  clearSelection: () => set({ selectedRepos: [] }),
}));

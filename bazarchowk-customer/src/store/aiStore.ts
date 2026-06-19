import { create } from 'zustand';

interface AIStore {
  isListening: boolean;
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isListening: false,
  toggleListening: () => set((state) => ({ isListening: !state.isListening })),
  startListening: () => set({ isListening: true }),
  stopListening: () => set({ isListening: false }),
}));

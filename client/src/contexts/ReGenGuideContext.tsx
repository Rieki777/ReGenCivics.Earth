import { createContext, useContext, useState, type ReactNode } from 'react';

interface ReGenGuideContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ReGenGuideContext = createContext<ReGenGuideContextType | null>(null);

export function ReGenGuideProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ReGenGuideContext.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen(p => !p),
    }}>
      {children}
    </ReGenGuideContext.Provider>
  );
}

export function useReGenGuide() {
  const ctx = useContext(ReGenGuideContext);
  if (!ctx) throw new Error('useReGenGuide must be used within ReGenGuideProvider');
  return ctx;
}

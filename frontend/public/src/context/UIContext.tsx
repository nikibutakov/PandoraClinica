import { createContext, useContext, useState, type ReactNode } from 'react';

interface UIContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <UIContext.Provider
      value={{
        isModalOpen,
        openModal: () => { setIsModalOpen(true); setIsMenuOpen(false); },
        closeModal: () => setIsModalOpen(false),
        isMenuOpen,
        openMenu: () => setIsMenuOpen(true),
        closeMenu: () => setIsMenuOpen(false),
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
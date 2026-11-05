import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'admin' | 'doctor' | 'registrar';

interface AuthContextType {
  isAuthenticated: boolean;
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('admin');

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        login: (selectedRole) => {
          setRole(selectedRole);
          setIsAuthenticated(true);
        },
        logout: () => setIsAuthenticated(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
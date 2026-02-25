import { create } from 'zustand';

type Role = 'organizer' | 'candidate' | null;

interface AuthState {
  user: { id: string; name: string; email: string; avatarUrl?: string } | null;
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  role: null,
  login: (role) => {
    if (role === 'organizer') {
      set({
        user: { id: 'org-1', name: 'Acme Events', email: 'hello@acme.com', avatarUrl: 'https://picsum.photos/seed/org/200' },
        role: 'organizer',
      });
    } else {
      set({
        user: { id: 'cand-1', name: 'Jane Doe', email: 'jane@example.com', avatarUrl: 'https://picsum.photos/seed/cand/200' },
        role: 'candidate',
      });
    }
  },
  logout: () => set({ user: null, role: null }),
}));

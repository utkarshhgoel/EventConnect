import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

type Role = 'organizer' | 'candidate' | null;

interface AuthState {
  user: Profile | null;
  role: Role;
  isLoading: boolean;
  checkUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Profile | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user, role: user?.role || null }),
  checkUser: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (data?.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
        
        if (profile) {
          const userMeta = data.session.user.user_metadata || {};
          let parsedSubtitle: any = {};
          try {
            if (profile.subtitle) {
              parsedSubtitle = JSON.parse(profile.subtitle);
            }
          } catch (e) {
            // Not JSON, ignore
          }
          
          const enrichedProfile = {
            ...profile,
            ...userMeta,
            gender: profile.gender || parsedSubtitle.gender,
            age: parsedSubtitle.age,
            height: parsedSubtitle.height,
            education: parsedSubtitle.education,
            roles: parsedSubtitle.roles || profile.subtitle
          };
          
          set({ user: enrichedProfile as Profile, role: profile.role, isLoading: false });
          return;
        }
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
    set({ user: null, role: null, isLoading: false });
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null });
  },
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (phone: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const userData = await authService.loginWithPhone(phone, name);
          const user: User = {
            ...userData,
            role: userData.role as 'admin' | 'salesman',
          };
          set({ user, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
          set({ user: null, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'fsm_user',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

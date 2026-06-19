import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  tenantId: string
  tenantName: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  // Actions
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      updateUser: (updatedUser) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updatedUser },
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
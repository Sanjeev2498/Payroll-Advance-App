import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  // UI State
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  
  // Dashboard State
  selectedSiteId: string | null
  dashboardDateRange: {
    from: string
    to: string
  }
  
  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedSite: (siteId: string | null) => void
  setDashboardDateRange: (range: { from: string; to: string }) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      theme: 'light',
      selectedSiteId: null,
      dashboardDateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        to: new Date().toISOString().split('T')[0], // Today
      },

      // Actions
      toggleSidebar: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        }))
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
      },

      setTheme: (theme) => {
        set({ theme })
      },

      setSelectedSite: (siteId) => {
        set({ selectedSiteId: siteId })
      },

      setDashboardDateRange: (range) => {
        set({ dashboardDateRange: range })
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
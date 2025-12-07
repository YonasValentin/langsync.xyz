import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================
// Types
// ============================================

interface UIState {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Project filters
  projectFilters: {
    search: string;
    sortBy: "newest" | "oldest" | "alphabetical";
  };
  setProjectFilter: <K extends keyof UIState["projectFilters"]>(
    key: K,
    value: UIState["projectFilters"][K]
  ) => void;
  resetProjectFilters: () => void;

  // Translation editor state
  editorState: {
    selectedKeyId: string | null;
    selectedLanguage: string | null;
    showAiPanel: boolean;
    showCommentsPanel: boolean;
    showVersionHistory: boolean;
  };
  setEditorState: <K extends keyof UIState["editorState"]>(
    key: K,
    value: UIState["editorState"][K]
  ) => void;
  resetEditorState: () => void;

  // Mobile navigation
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// ============================================
// Default Values
// ============================================

const defaultProjectFilters: UIState["projectFilters"] = {
  search: "",
  sortBy: "newest",
};

const defaultEditorState: UIState["editorState"] = {
  selectedKeyId: null,
  selectedLanguage: null,
  showAiPanel: false,
  showCommentsPanel: false,
  showVersionHistory: false,
};

// ============================================
// Store
// ============================================

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme
      isDarkMode: false,
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Project filters
      projectFilters: defaultProjectFilters,
      setProjectFilter: (key, value) =>
        set((state) => ({
          projectFilters: { ...state.projectFilters, [key]: value },
        })),
      resetProjectFilters: () =>
        set({ projectFilters: defaultProjectFilters }),

      // Editor state
      editorState: defaultEditorState,
      setEditorState: (key, value) =>
        set((state) => ({
          editorState: { ...state.editorState, [key]: value },
        })),
      resetEditorState: () => set({ editorState: defaultEditorState }),

      // Mobile menu
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

      // Sidebar
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: "langsync-ui-preferences",
      // Only persist certain values (not editor state)
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);

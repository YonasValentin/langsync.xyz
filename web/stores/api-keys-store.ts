import { create } from "zustand";

// ============================================
// Types
// ============================================

interface ApiKeysState {
  // Dialog states
  isCreateDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;

  isRevokeDialogOpen: boolean;
  revokeTargetId: string | null;
  revokeTargetName: string | null;
  openRevokeDialog: (id: string, name: string) => void;
  closeRevokeDialog: () => void;

  isDeleteDialogOpen: boolean;
  deleteTargetId: string | null;
  deleteTargetName: string | null;
  openDeleteDialog: (id: string, name: string) => void;
  closeDeleteDialog: () => void;

  // Newly created key (shown once, then hidden)
  newlyCreatedKey: string | null;
  setNewlyCreatedKey: (key: string | null) => void;
}

// ============================================
// Store
// ============================================

export const useApiKeysStore = create<ApiKeysState>()((set) => ({
  // Create dialog
  isCreateDialogOpen: false,
  setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),

  // Revoke dialog
  isRevokeDialogOpen: false,
  revokeTargetId: null,
  revokeTargetName: null,
  openRevokeDialog: (id, name) =>
    set({
      isRevokeDialogOpen: true,
      revokeTargetId: id,
      revokeTargetName: name,
    }),
  closeRevokeDialog: () =>
    set({
      isRevokeDialogOpen: false,
      revokeTargetId: null,
      revokeTargetName: null,
    }),

  // Delete dialog
  isDeleteDialogOpen: false,
  deleteTargetId: null,
  deleteTargetName: null,
  openDeleteDialog: (id, name) =>
    set({
      isDeleteDialogOpen: true,
      deleteTargetId: id,
      deleteTargetName: name,
    }),
  closeDeleteDialog: () =>
    set({
      isDeleteDialogOpen: false,
      deleteTargetId: null,
      deleteTargetName: null,
    }),

  // Newly created key
  newlyCreatedKey: null,
  setNewlyCreatedKey: (key) => set({ newlyCreatedKey: key }),
}));

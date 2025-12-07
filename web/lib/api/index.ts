/**
 * Centralized exports for all API functions.
 * Import from "@/lib/api" for cleaner imports.
 */

// Projects
export {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectKeyCount,
} from "./projects";

// Translations
export {
  getTranslationKeys,
  createTranslationKey,
  updateTranslationKey,
  updateTranslation,
  deleteTranslationKey,
} from "./translations";

// AI Translations
export {
  translateWithAI,
  translateBatchWithAI,
  acceptAiTranslation,
  getAiUsage,
  getRecentAiSuggestions,
} from "./ai-translations";

// Legacy: Keep the old apiClient export for backwards compatibility
// TODO: Gradually migrate components to use the new modular API functions
export { apiClient } from "./client";

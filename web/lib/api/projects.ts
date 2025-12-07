import { pb } from "@/lib/pocketbase";
import type {
  ProjectsRecord,
  ProjectExpanded,
  TranslationKeysRecord,
  TranslationsRecord,
} from "@/lib/pocketbase-types";

// ============================================
// Projects API
// ============================================

/**
 * Get all projects for the current user
 */
export async function getProjects(): Promise<ProjectsRecord[]> {
  const userId = pb.authStore.record?.id;
  if (!userId) return [];

  return await pb.collection("projects").getFullList<ProjectsRecord>({
    filter: `user = "${userId}"`,
    sort: "-created",
  });
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<ProjectExpanded | null> {
  try {
    return await pb.collection("projects").getOne<ProjectExpanded>(id, {
      expand: "user",
    });
  } catch {
    return null;
  }
}

/**
 * Create a new project
 */
export async function createProject(data: {
  name: string;
  description?: string;
  defaultLanguage: string;
  languages: string[];
}): Promise<ProjectsRecord> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  return await pb.collection("projects").create<ProjectsRecord>({
    user: userId,
    name: data.name,
    description: data.description || "",
    defaultLanguage: data.defaultLanguage,
    languages: data.languages,
    enableAiTranslation: false,
  });
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    defaultLanguage: string;
    languages: string[];
    toneOfVoice: string;
    projectBrief: string;
    styleGuide: string;
    industryType: string;
    targetAudience: string;
    enableAiTranslation: boolean;
  }>
): Promise<ProjectsRecord> {
  return await pb.collection("projects").update<ProjectsRecord>(id, data);
}

/**
 * Delete a project and all related data
 */
export async function deleteProject(id: string): Promise<boolean> {
  // Delete all translation keys (which will cascade to translations)
  const keys = await pb.collection("translation_keys").getFullList<TranslationKeysRecord>({
    filter: `project = "${id}"`,
  });

  for (const key of keys) {
    // Delete translations for this key
    const translations = await pb.collection("translations").getFullList<TranslationsRecord>({
      filter: `translationKey = "${key.id}"`,
    });
    for (const t of translations) {
      await pb.collection("translations").delete(t.id);
    }
    // Delete the key
    await pb.collection("translation_keys").delete(key.id);
  }

  // Delete the project
  await pb.collection("projects").delete(id);
  return true;
}

/**
 * Get project key count
 */
export async function getProjectKeyCount(projectId: string): Promise<number> {
  const result = await pb.collection("translation_keys").getList<TranslationKeysRecord>(1, 1, {
    filter: `project = "${projectId}"`,
  });
  return result.totalItems;
}

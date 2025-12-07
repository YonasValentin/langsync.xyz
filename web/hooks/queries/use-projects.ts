import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb, Collections } from "@/lib/pocketbase";
import type {
  ProjectsRecord,
  ProjectExpanded,
  TranslationKeysRecord,
  TranslationsRecord,
} from "@/lib/pocketbase-types";

// ============================================
// Query Keys Factory
// ============================================

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  stats: (id: string) => [...projectKeys.all, "stats", id] as const,
};

// ============================================
// Types
// ============================================

export interface ProjectWithStats extends ProjectsRecord {
  keyCount: number;
  translationProgress: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  defaultLanguage: string;
  languages: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  defaultLanguage?: string;
  languages?: string[];
  toneOfVoice?: string;
  projectBrief?: string;
  styleGuide?: string;
  industryType?: string;
  targetAudience?: string;
  enableAiTranslation?: boolean;
}

// ============================================
// API Functions
// ============================================

async function getProjects(): Promise<ProjectWithStats[]> {
  const userId = pb.authStore.record?.id;
  if (!userId) return [];

  // Get all projects for the user
  const projects = await pb.collection(Collections.PROJECTS).getFullList<ProjectsRecord>({
    filter: `user = "${userId}"`,
    sort: "-created",
  });

  // Get stats for each project
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      // Get key count
      const keys = await pb.collection(Collections.TRANSLATION_KEYS).getFullList<TranslationKeysRecord>({
        filter: `project = "${project.id}"`,
        fields: "id",
      });

      const keyCount = keys.length;

      // Calculate translation progress
      let translationProgress = 0;
      if (keyCount > 0 && project.languages.length > 0) {
        const totalNeeded = keyCount * project.languages.length;

        // Get translation count
        if (keys.length > 0) {
          const keyIds = keys.map(k => k.id);
          const translations = await pb.collection(Collections.TRANSLATIONS).getFullList<TranslationsRecord>({
            filter: keyIds.map(id => `translationKey = "${id}"`).join(" || "),
            fields: "id,value",
          });

          // Count non-empty translations
          const filledCount = translations.filter(t => t.value && t.value.trim() !== "").length;
          translationProgress = Math.round((filledCount / totalNeeded) * 100);
        }
      }

      return {
        ...project,
        keyCount,
        translationProgress,
      };
    })
  );

  return projectsWithStats;
}

async function getProject(id: string): Promise<ProjectExpanded | null> {
  if (!pb.authStore.isValid) return null;

  try {
    return await pb.collection(Collections.PROJECTS).getOne<ProjectExpanded>(id, {
      expand: "user",
    });
  } catch {
    return null;
  }
}

async function createProject(data: CreateProjectInput): Promise<ProjectsRecord> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Not authenticated");

  return await pb.collection(Collections.PROJECTS).create<ProjectsRecord>({
    user: userId,
    name: data.name,
    description: data.description || "",
    defaultLanguage: data.defaultLanguage,
    languages: data.languages,
    enableAiTranslation: true,
  });
}

async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<ProjectsRecord> {
  return await pb.collection(Collections.PROJECTS).update<ProjectsRecord>(id, data);
}

async function deleteProject(id: string): Promise<boolean> {
  await pb.collection(Collections.PROJECTS).delete(id);
  return true;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch all projects for current user with stats
 */
export function useProjects(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: getProjects,
    enabled: options?.enabled !== false && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: options?.enabled !== false && !!id && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Optionally set the new project in cache
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject);
    },
  });
}

/**
 * Update an existing project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      updateProject(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) });

      // Snapshot previous value
      const previousProject = queryClient.getQueryData<ProjectsRecord>(
        projectKeys.detail(id)
      );

      // Optimistically update
      if (previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), {
          ...previousProject,
          ...data,
        });
      }

      return { previousProject };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), context.previousProject);
      }
    },
    onSettled: (_, __, { id }) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<ProjectWithStats[]>(
        projectKeys.lists()
      );

      // Optimistically remove from list
      if (previousProjects) {
        queryClient.setQueryData(
          projectKeys.lists(),
          previousProjects.filter((p) => p.id !== id)
        );
      }

      return { previousProjects };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Prefetch a project for faster navigation
 */
export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(id),
      queryFn: () => getProject(id),
      staleTime: 2 * 60 * 1000,
    });
  };
}

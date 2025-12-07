import { pb } from "@/lib/pocketbase";
import type {
  TranslationKeysRecord,
  TranslationsRecord,
  TranslationKeyWithTranslations,
  TranslationVersionsRecord,
  ActivityLogsRecord,
} from "@/lib/pocketbase-types";

// ============================================
// Translation Keys API
// ============================================

/**
 * Get all translation keys with their translations for a project
 */
export async function getTranslationKeys(
  projectId: string
): Promise<TranslationKeyWithTranslations[]> {
  // Get all keys for the project
  const keys = await pb
    .collection("translation_keys")
    .getFullList<TranslationKeysRecord>({
      filter: `project = "${projectId}"`,
      sort: "key",
    });

  if (keys.length === 0) return [];

  // Get all translations for these keys
  const keyIds = keys.map((k) => k.id);
  const translations = await pb
    .collection("translations")
    .getFullList<TranslationsRecord>({
      filter: keyIds.map((id) => `translationKey = "${id}"`).join(" || "),
    });

  // Group translations by key
  const translationsByKey: Record<string, Record<string, string>> = {};
  for (const t of translations) {
    if (!translationsByKey[t.translationKey]) {
      translationsByKey[t.translationKey] = {};
    }
    translationsByKey[t.translationKey][t.language] = t.value;
  }

  // Combine keys with their translations
  return keys.map((key) => ({
    id: key.id,
    key: key.key,
    description: key.description,
    context: key.context,
    translations: translationsByKey[key.id] || {},
    created: key.created,
    updated: key.updated,
  }));
}

/**
 * Create a new translation key
 */
export async function createTranslationKey(
  projectId: string,
  data: {
    key: string;
    description?: string;
    context?: string;
    translations?: Record<string, string>;
  }
): Promise<TranslationKeysRecord> {
  const userId = pb.authStore.record?.id;

  // Create the key
  const newKey = await pb.collection("translation_keys").create<TranslationKeysRecord>({
    project: projectId,
    key: data.key,
    description: data.description || "",
    context: data.context || "",
  });

  // Create translations if provided
  if (data.translations) {
    for (const [language, value] of Object.entries(data.translations)) {
      if (value) {
        await pb.collection("translations").create<TranslationsRecord>({
          translationKey: newKey.id,
          language,
          value,
          updatedBy: userId,
        });
      }
    }
  }

  // Log activity
  if (userId) {
    await logActivity(projectId, userId, "key_created", newKey.id, undefined, `Created key "${data.key}"`);
  }

  return newKey;
}

/**
 * Update a translation key's metadata
 */
export async function updateTranslationKey(
  keyId: string,
  data: {
    key?: string;
    description?: string;
    context?: string;
  }
): Promise<TranslationKeysRecord> {
  return await pb.collection("translation_keys").update<TranslationKeysRecord>(keyId, data);
}

/**
 * Update a single translation value
 */
export async function updateTranslation(
  projectId: string,
  keyId: string,
  language: string,
  value: string
): Promise<void> {
  const userId = pb.authStore.record?.id;

  // Try to find existing translation
  let existingTranslation: TranslationsRecord | null = null;
  let previousValue: string | undefined;

  try {
    existingTranslation = await pb
      .collection("translations")
      .getFirstListItem<TranslationsRecord>(
        `translationKey = "${keyId}" && language = "${language}"`
      );
    previousValue = existingTranslation.value;
  } catch {
    // No existing translation
  }

  if (existingTranslation) {
    // Update existing
    await pb.collection("translations").update(existingTranslation.id, {
      value,
      updatedBy: userId,
    });

    // Create version history entry
    if (userId) {
      await createVersionHistory(keyId, language, value, previousValue, userId, "updated");
    }
  } else {
    // Create new translation
    await pb.collection("translations").create<TranslationsRecord>({
      translationKey: keyId,
      language,
      value,
      updatedBy: userId,
    });

    // Create version history entry
    if (userId) {
      await createVersionHistory(keyId, language, value, undefined, userId, "created");
    }
  }

  // Log activity
  if (userId) {
    await logActivity(
      projectId,
      userId,
      "translation_updated",
      keyId,
      language,
      `Updated ${language} translation`
    );
  }
}

/**
 * Delete a translation key and all its translations
 */
export async function deleteTranslationKey(
  projectId: string,
  keyId: string
): Promise<boolean> {
  const userId = pb.authStore.record?.id;

  // Get key name for logging
  const key = await pb.collection("translation_keys").getOne<TranslationKeysRecord>(keyId);

  // Delete all translations first
  const translations = await pb
    .collection("translations")
    .getFullList<TranslationsRecord>({
      filter: `translationKey = "${keyId}"`,
    });

  for (const t of translations) {
    await pb.collection("translations").delete(t.id);
  }

  // Delete the key
  await pb.collection("translation_keys").delete(keyId);

  // Log activity
  if (userId) {
    await logActivity(projectId, userId, "key_deleted", undefined, undefined, `Deleted key "${key.key}"`);
  }

  return true;
}

// ============================================
// Version History Helper
// ============================================

async function createVersionHistory(
  keyId: string,
  language: string,
  value: string,
  previousValue: string | undefined,
  userId: string,
  changeType: "created" | "updated" | "deleted"
): Promise<void> {
  await pb.collection("translation_versions").create<TranslationVersionsRecord>({
    translationKey: keyId,
    language,
    value,
    previousValue,
    user: userId,
    changeType,
  });
}

// ============================================
// Activity Log Helper
// ============================================

async function logActivity(
  projectId: string,
  userId: string,
  type: string,
  keyId?: string,
  language?: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await pb.collection("activity_logs").create<ActivityLogsRecord>({
    project: projectId,
    user: userId,
    type,
    translationKey: keyId,
    language,
    description: description || "",
    metadata,
  });
}

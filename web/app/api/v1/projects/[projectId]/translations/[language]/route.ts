/**
 * Public API v1 - Get Translations for a Specific Language
 * Used by @langsync/client, @langsync/nextjs, @langsync/expo
 *
 * Returns a flat dictionary: { "key.name": "value", ... }
 */

import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || '';

interface RouteParams {
  params: Promise<{ projectId: string; language: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, language } = await params;

    // Validate API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Create PocketBase client
    const pb = new PocketBase(POCKETBASE_URL);

    // Find user by API key
    const users = await pb.collection('users').getFullList({
      filter: `apiKey = "${apiKey}"`,
      limit: 1,
    });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Get the project
    const project = await pb.collection('projects').getOne(projectId);

    // Verify ownership
    if (project.user !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the language is supported by this project
    if (!project.languages.includes(language)) {
      return NextResponse.json(
        { success: false, error: `Language '${language}' is not configured for this project` },
        { status: 404 }
      );
    }

    // Get all translation keys for the project
    const keys = await pb.collection('translation_keys').getFullList({
      filter: `project = "${projectId}"`,
      sort: 'key',
    });

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        data: {},
      });
    }

    // Get translations for this language
    const keyIds = keys.map((k) => k.id);
    const translations = await pb.collection('translations').getFullList({
      filter: `(${keyIds.map((id) => `translationKey = "${id}"`).join(' || ')}) && language = "${language}"`,
    });

    // Build a map of keyId -> translation value
    const translationMap: Record<string, string> = {};
    for (const t of translations) {
      translationMap[t.translationKey] = t.value;
    }

    // Build the flat dictionary: { "key.name": "value" }
    const data: Record<string, string> = {};
    for (const key of keys) {
      if (translationMap[key.id]) {
        data[key.key] = translationMap[key.id];
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get translations';
    console.error('API v1 language translations error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

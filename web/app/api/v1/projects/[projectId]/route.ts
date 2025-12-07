/**
 * Public API v1 - Get Project Details
 * Used by @langsync/client, @langsync/nextjs, @langsync/expo
 */

import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || '';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;

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

    return NextResponse.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        defaultLanguage: project.defaultLanguage,
        languages: project.languages,
        created: project.created,
        updated: project.updated,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get project';
    console.error('API v1 project error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

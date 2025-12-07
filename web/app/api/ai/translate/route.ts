import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import PocketBase from 'pocketbase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || '';

export async function POST(request: Request) {
  try {
    const { projectId, keyId, targetLanguage } = await request.json();

    if (!projectId || !keyId || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, keyId, targetLanguage' },
        { status: 400 }
      );
    }

    // Create PocketBase client and authenticate with cookie from request
    const pb = new PocketBase(POCKETBASE_URL);
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      pb.authStore.loadFromCookie(cookieHeader);
    }

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the project for context
    const project = await pb.collection('projects').getOne(projectId);

    // Get the translation key and its source translation
    const translationKey = await pb.collection('translation_keys').getOne(keyId);

    // Get the source translation (default language)
    const sourceTranslations = await pb.collection('translations').getFullList({
      filter: `translationKey = "${keyId}" && language = "${project.defaultLanguage}"`,
      limit: 1,
    });

    if (sourceTranslations.length === 0) {
      return NextResponse.json(
        { error: 'No source translation found for the default language' },
        { status: 400 }
      );
    }

    const sourceText = sourceTranslations[0].value;

    // Build the system prompt with project context
    let systemPrompt = `You are a professional translator. Translate the following text from ${project.defaultLanguage} to ${targetLanguage}.
Only return the translated text, nothing else.`;

    if (project.toneOfVoice) {
      systemPrompt += `\n\nTone of voice: ${project.toneOfVoice}`;
    }

    if (project.projectBrief) {
      systemPrompt += `\n\nProject context: ${project.projectBrief}`;
    }

    if (project.styleGuide) {
      systemPrompt += `\n\nStyle guide: ${project.styleGuide}`;
    }

    if (project.industryType) {
      systemPrompt += `\n\nIndustry: ${project.industryType}`;
    }

    if (project.targetAudience) {
      systemPrompt += `\n\nTarget audience: ${project.targetAudience}`;
    }

    if (translationKey.context) {
      systemPrompt += `\n\nTranslation context: ${translationKey.context}`;
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sourceText },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const translatedText = completion.choices[0]?.message?.content?.trim() || '';

    // Calculate cost (approximate)
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || 0;
    // GPT-4 Turbo pricing: $0.01/1K input, $0.03/1K output
    const estimatedCost = (promptTokens * 0.01 + completionTokens * 0.03) / 1000;

    // Save the AI translation record
    const aiTranslation = await pb.collection('ai_translations').create({
      project: projectId,
      translationKey: keyId,
      sourceLanguage: project.defaultLanguage,
      targetLanguage,
      sourceText,
      translatedText,
      model: 'gpt-4-turbo',
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      wasAccepted: false,
    });

    // Add to translation memory
    await pb.collection('translation_memory').create({
      project: projectId,
      sourceLanguage: project.defaultLanguage,
      targetLanguage,
      sourceText,
      targetText: translatedText,
      context: translationKey.context,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    });

    return NextResponse.json(aiTranslation);
  } catch (error: any) {
    console.error('AI Translation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to translate' },
      { status: 500 }
    );
  }
}

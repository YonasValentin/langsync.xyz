'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Sparkles, CheckCircle2, AlertCircle, Languages } from 'lucide-react';
import Link from 'next/link';
import { useProject, useUpdateProject } from '@/hooks/queries';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const INDUSTRY_TYPES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Entertainment',
  'Travel',
  'Food & Beverage',
  'Real Estate',
  'Marketing',
  'Legal',
  'Other',
];

const TONE_OF_VOICE_OPTIONS = [
  'Professional',
  'Casual',
  'Friendly',
  'Formal',
  'Conversational',
  'Technical',
  'Playful',
  'Empathetic',
  'Authoritative',
  'Inspirational',
];

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { data: project, isLoading, isError } = useProject(projectId);
  const updateProject = useUpdateProject();

  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultLanguage: '',
    languages: [] as string[],
    enableAiTranslation: false,
    toneOfVoice: '',
    projectBrief: '',
    styleGuide: '',
    industryType: '',
    targetAudience: '',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        defaultLanguage: project.defaultLanguage,
        languages: project.languages,
        enableAiTranslation: project.enableAiTranslation || false,
        toneOfVoice: project.toneOfVoice || '',
        projectBrief: project.projectBrief || '',
        styleGuide: project.styleGuide || '',
        industryType: project.industryType || '',
        targetAudience: project.targetAudience || '',
      });
    }
  }, [project]);

  if (isError) {
    router.push('/dashboard/projects');
    return null;
  }

  const handleSave = async () => {
    try {
      setSaveStatus('idle');

      await updateProject.mutateAsync({
        id: projectId,
        data: formData,
      });

      setSaveStatus('success');
      toast.success('Settings saved successfully!');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to save settings. Please try again.');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container-default flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/projects" className="flex items-center gap-2 font-semibold text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Languages className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline">LangSync</span>
            </Link>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <Link href={`/dashboard/projects/${projectId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              {project.name}
            </Link>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="text-sm font-medium">Settings</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={handleSave} disabled={updateProject.isPending} size="sm">
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{updateProject.isPending ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-default py-6 max-w-2xl space-y-6">
        {/* Save Status Alert */}
        {saveStatus === 'success' && (
          <Alert className="border-success/50 bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription>Settings saved successfully!</AlertDescription>
          </Alert>
        )}

        {saveStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to save settings. Please try again.</AlertDescription>
          </Alert>
        )}

        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>General project details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Translation Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe your project..."
                rows={2}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <Input
                  id="defaultLanguage"
                  value={formData.defaultLanguage}
                  onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                  placeholder="en"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="languages">Languages</Label>
                <Input
                  id="languages"
                  value={formData.languages.join(', ')}
                  onChange={(e) => handleChange('languages', e.target.value.split(',').map(l => l.trim()))}
                  placeholder="en, es, fr"
                />
                <p className="text-xs text-muted-foreground">Comma-separated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Translation Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <CardTitle className="text-lg">AI Translation</CardTitle>
                <CardDescription>Configure AI-powered translation features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable AI Translation */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="enableAi" className="font-medium">Enable AI Translation</Label>
                <p className="text-xs text-muted-foreground">
                  Allow AI to suggest translations
                </p>
              </div>
              <Switch
                id="enableAi"
                checked={formData.enableAiTranslation}
                onCheckedChange={(checked) => handleChange('enableAiTranslation', checked)}
              />
            </div>

            {formData.enableAiTranslation && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="toneOfVoice">Tone of Voice</Label>
                    <Select
                      value={formData.toneOfVoice}
                      onValueChange={(value) => handleChange('toneOfVoice', value)}
                    >
                      <SelectTrigger id="toneOfVoice">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OF_VOICE_OPTIONS.map(tone => (
                          <SelectItem key={tone} value={tone.toLowerCase()}>
                            {tone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industryType">Industry</Label>
                    <Select
                      value={formData.industryType}
                      onValueChange={(value) => handleChange('industryType', value)}
                    >
                      <SelectTrigger id="industryType">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_TYPES.map(industry => (
                          <SelectItem key={industry} value={industry.toLowerCase()}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => handleChange('targetAudience', e.target.value)}
                    placeholder="e.g., Young professionals, Tech enthusiasts"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectBrief">Project Brief</Label>
                  <Textarea
                    id="projectBrief"
                    value={formData.projectBrief}
                    onChange={(e) => handleChange('projectBrief', e.target.value)}
                    placeholder="Describe your project to help AI understand context..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="styleGuide">Style Guide</Label>
                  <Textarea
                    id="styleGuide"
                    value={formData.styleGuide}
                    onChange={(e) => handleChange('styleGuide', e.target.value)}
                    placeholder="Specific guidelines for translations..."
                    rows={3}
                  />
                </div>

                <div className="bg-muted/50 border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    Providing context helps AI generate more accurate, brand-consistent translations.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button (Mobile) */}
        <div className="sm:hidden">
          <Button onClick={handleSave} disabled={updateProject.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {updateProject.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </div>
  );
}

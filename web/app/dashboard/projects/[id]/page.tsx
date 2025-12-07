'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  Download,
  Upload,
  Trash2,
  Copy,
  Save,
  Edit3,
  Search,
  Filter,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Database,
  Users,
  History,
  Sparkles,
  Settings,
  Languages,
} from 'lucide-react';
import Link from 'next/link';
import { SuggestionPopover } from '@/components/memory/suggestion-popover';
import { TranslationMemoryPanel } from '@/components/memory/translation-memory-panel';
import { CollaborationSidebar } from '@/components/collaboration/collaboration-sidebar';
import { ApprovalBadge } from '@/components/collaboration/approval-badge';
import { CommentIndicator } from '@/components/collaboration/comment-indicator';
import { VersionHistoryPanel } from '@/components/version/version-history-panel';
import { CommitDialog } from '@/components/git/commit-dialog';
import { GitHistory } from '@/components/git/git-history';
import { GitStatusIndicator } from '@/components/git/git-status-indicator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { apiClient } from '@/lib/api/client';
import { AISuggestionCard } from '@/components/ai/ai-suggestion-card';
import { AutoTranslateDialog } from '@/components/ai/auto-translate-dialog';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useProject,
  useTranslationKeys,
  useCreateTranslationKey,
  useUpdateTranslation,
  useDeleteTranslationKey,
  useDeleteMultipleKeys,
  useSearchTranslationMemory,
  useCreateMemoryEntry,
  type TranslationSuggestion,
} from '@/hooks/queries';
import type { TranslationKeyWithTranslations } from '@/lib/pocketbase-types';

export default function ProjectEditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  // TanStack Query hooks
  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useProject(projectId);
  const { data: translationKeys = [], isLoading: isKeysLoading, refetch: refetchKeys } = useTranslationKeys(projectId, { enabled: !!project });
  const createKeyMutation = useCreateTranslationKey(projectId);
  const updateTranslationMutation = useUpdateTranslation(projectId);
  const deleteKeyMutation = useDeleteTranslationKey(projectId);
  const deleteMultipleMutation = useDeleteMultipleKeys(projectId);
  const createMemoryEntryMutation = useCreateMemoryEntry();

  const [editingCell, setEditingCell] = useState<{ keyId: string; lang: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Dialog states
  const [isCreateKeyDialogOpen, setIsCreateKeyDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  // AI Translation states
  const [aiSuggestion, setAiSuggestion] = useState<{
    keyId: string;
    language: string;
    translation: string;
    aiTranslationId?: string;
    confidence?: number;
    cost?: number;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState<{ keyId: string; language: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAutoTranslateOpen, setIsAutoTranslateOpen] = useState(false);

  // Translation Memory
  const [memorySearchParams, setMemorySearchParams] = useState<{
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    projectId?: string;
    minimumSimilarity?: number;
  } | null>(null);
  const { data: suggestions = [] } = useSearchTranslationMemory(
    memorySearchParams || undefined,
    { enabled: !!memorySearchParams }
  );
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null);

  // Collaboration
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [selectedKeyForCollab, setSelectedKeyForCollab] = useState<string | null>(null);
  const [selectedLanguageForCollab, setSelectedLanguageForCollab] = useState<string | null>(null);

  // Version History
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionKeyId, setVersionKeyId] = useState<string | null>(null);
  const [versionLanguage, setVersionLanguage] = useState<string | null>(null);

  // Git
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [isGitHistoryOpen, setIsGitHistoryOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterCompletion, setFilterCompletion] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Batch operations
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Grouping
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'none' | 'namespace'>('namespace');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type?: 'deleteKey' | 'deleteSelected';
    keyId?: string;
    keyName?: string;
    count?: number;
  }>({ open: false });

  // New translation key form
  const [newKey, setNewKey] = useState({
    key: '',
    description: '',
  });

  // Get namespace from key (e.g., "hero.title" -> "hero")
  const getNamespace = (key: string): string => {
    const parts = key.split('.');
    return parts.length > 1 ? parts[0] : '_root';
  };

  // Redirect if project not found
  if (isProjectError) {
    router.push('/dashboard/projects');
    return null;
  }

  // Calculate translation progress
  const progress = useMemo(() => {
    if (!project || translationKeys.length === 0) {
      return { overall: 0, byLanguage: {} };
    }

    const byLanguage: Record<string, { completed: number; total: number; percentage: number }> = {};

    project.languages.forEach(lang => {
      const total = translationKeys.length;
      const completed = translationKeys.filter(tk => tk.translations[lang]?.trim()).length;
      byLanguage[lang] = {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    const totalCells = translationKeys.length * project.languages.length;
    const completedCells = translationKeys.reduce((sum, tk) => {
      return sum + project.languages.filter(lang => tk.translations[lang]?.trim()).length;
    }, 0);

    return {
      overall: totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0,
      byLanguage,
    };
  }, [project, translationKeys]);

  // Detect duplicates
  const duplicates = useMemo(() => {
    const valueMap = new Map<string, string[]>();

    translationKeys.forEach(tk => {
      Object.entries(tk.translations).forEach(([lang, value]) => {
        if (value?.trim()) {
          const key = `${lang}:${value.toLowerCase()}`;
          const existing = valueMap.get(key) || [];
          valueMap.set(key, [...existing, tk.key]);
        }
      });
    });

    return Array.from(valueMap.entries())
      .filter(([_, keys]) => keys.length > 1)
      .map(([key, keys]) => ({
        language: key.split(':')[0],
        value: key.split(':')[1],
        keys,
      }));
  }, [translationKeys]);

  // Filter keys
  const filteredKeys = useMemo(() => {
    return translationKeys.filter(tk => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesKey = tk.key.toLowerCase().includes(query);
        const matchesDescription = tk.description?.toLowerCase().includes(query);
        const matchesTranslation = Object.values(tk.translations).some(
          v => v?.toLowerCase().includes(query)
        );
        if (!matchesKey && !matchesDescription && !matchesTranslation) {
          return false;
        }
      }

      // Language filter
      if (filterLanguage !== 'all') {
        const hasTranslation = tk.translations[filterLanguage]?.trim();
        if (!hasTranslation) return false;
      }

      // Completion filter
      if (filterCompletion !== 'all' && project) {
        const completed = project.languages.every(lang => tk.translations[lang]?.trim());
        if (filterCompletion === 'complete' && !completed) return false;
        if (filterCompletion === 'incomplete' && completed) return false;
      }

      return true;
    });
  }, [translationKeys, searchQuery, filterLanguage, filterCompletion, project]);

  // Group keys by namespace
  const groupedKeys = useMemo(() => {
    if (groupBy === 'none') {
      return { _all: filteredKeys };
    }

    const groups: Record<string, TranslationKeyWithTranslations[]> = {};
    filteredKeys.forEach(tk => {
      const namespace = getNamespace(tk.key);
      if (!groups[namespace]) {
        groups[namespace] = [];
      }
      groups[namespace].push(tk);
    });

    return groups;
  }, [filteredKeys, groupBy]);

  const handleCreateKey = async () => {
    if (!newKey.key.trim() || !project) return;

    try {
      await createKeyMutation.mutateAsync({
        key: newKey.key,
        description: newKey.description,
      });

      setNewKey({ key: '', description: '' });
      setIsCreateKeyDialogOpen(false);
      toast.success('Translation key created successfully!');
    } catch (error) {
      toast.error('Failed to create translation key. Please try again.');
    }
  };

  const handleStartEdit = (keyId: string, lang: string, currentValue: string, event?: React.MouseEvent) => {
    setEditingCell({ keyId, lang });
    setEditValue(currentValue || '');

    // Get the translation key to find the source text
    const tk = translationKeys.find(k => k.id === keyId);
    if (!tk || !project) {
      setMemorySearchParams(null);
      return;
    }

    // Get source text from default language
    const sourceText = tk.translations[project.defaultLanguage] || tk.key;

    // Set search params to trigger TanStack Query search
    setMemorySearchParams({
      sourceLanguage: project.defaultLanguage,
      targetLanguage: lang,
      sourceText,
      projectId,
      minimumSimilarity: 0.7,
    });

    // Set position for popover
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setSuggestionPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCell || !project) return;

    const tk = translationKeys.find(k => k.id === editingCell.keyId);

    try {
      await updateTranslationMutation.mutateAsync({
        keyId: editingCell.keyId,
        language: editingCell.lang,
        value: editValue,
      });

      // Save to translation memory if there's a value
      if (editValue.trim() && tk) {
        const sourceText = tk.translations[project.defaultLanguage] || tk.key;
        await createMemoryEntryMutation.mutateAsync({
          projectId,
          sourceLanguage: project.defaultLanguage,
          targetLanguage: editingCell.lang,
          sourceText,
          targetText: editValue,
          context: tk.description,
        });
      }

      setEditingCell(null);
      setEditValue('');
      setMemorySearchParams(null);
      setSuggestionPosition(null);
    } catch (error) {
      toast.error('Failed to save translation. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setMemorySearchParams(null);
    setSuggestionPosition(null);
  };

  const handleSelectSuggestion = (suggestion: TranslationSuggestion) => {
    setEditValue(suggestion.entry.targetText);
    setMemorySearchParams(null);
    setSuggestionPosition(null);
  };

  const handleDeleteKey = (keyId: string, keyName: string) => {
    setConfirmDialog({ open: true, type: 'deleteKey', keyId, keyName });
  };

  const handleBatchDelete = () => {
    if (selectedKeys.size === 0) return;
    setConfirmDialog({ open: true, type: 'deleteSelected', count: selectedKeys.size });
  };

  const confirmDelete = async () => {
    try {
      if (confirmDialog.type === 'deleteKey' && confirmDialog.keyId) {
        await deleteKeyMutation.mutateAsync(confirmDialog.keyId);
        selectedKeys.delete(confirmDialog.keyId);
        setSelectedKeys(new Set(selectedKeys));
        toast.success('Translation key deleted successfully');
      } else if (confirmDialog.type === 'deleteSelected') {
        await deleteMultipleMutation.mutateAsync(Array.from(selectedKeys));
        setSelectedKeys(new Set());
        toast.success(`${confirmDialog.count} key(s) deleted successfully`);
      }
    } catch (error) {
      toast.error('Failed to delete translation key(s). Please try again.');
    }
  };

  const handleCopyToLanguage = async (fromLang: string, toLang: string, keyId?: string) => {
    const keysToCopy = keyId ? [keyId] : Array.from(selectedKeys);

    try {
      for (const kid of keysToCopy) {
        const key = translationKeys.find(k => k.id === kid);
        if (key && key.translations[fromLang]) {
          await updateTranslationMutation.mutateAsync({
            keyId: kid,
            language: toLang,
            value: key.translations[fromLang],
          });
        }
      }
      toast.success('Translations copied successfully!');
    } catch (error) {
      toast.error('Failed to copy translations. Please try again.');
    }
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map(k => k.id)));
    }
  };

  const toggleGroup = (namespace: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(namespace)) {
      newExpanded.delete(namespace);
    } else {
      newExpanded.add(namespace);
    }
    setExpandedGroups(newExpanded);
  };

  // AI Translation handlers
  const handleAiTranslate = async (keyId: string, language: string) => {
    if (!project?.enableAiTranslation) {
      toast.error('AI translation is not enabled for this project. Please enable it in project settings.');
      return;
    }

    try {
      setAiLoading({ keyId, language });
      setAiError(null);
      setAiSuggestion(null);

      const result: any = await apiClient.translateKey(projectId, keyId, language);

      setAiSuggestion({
        keyId,
        language,
        translation: result.translatedText,
        aiTranslationId: result.aiTranslationId,
        confidence: result.confidence,
        cost: result.estimatedCost,
      });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to generate translation');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAcceptAiSuggestion = async () => {
    if (!aiSuggestion) return;

    try {
      // Update the translation using optimistic mutation
      await updateTranslationMutation.mutateAsync({
        keyId: aiSuggestion.keyId,
        language: aiSuggestion.language,
        value: aiSuggestion.translation,
      });

      // Mark as accepted in backend if aiTranslationId exists
      if (aiSuggestion.aiTranslationId) {
        await apiClient.acceptTranslation(projectId, aiSuggestion.aiTranslationId);
      }

      setAiSuggestion(null);
      toast.success('AI translation accepted!');
    } catch (error) {
      toast.error('Failed to accept suggestion. Please try again.');
    }
  };

  const handleRejectAiSuggestion = () => {
    setAiSuggestion(null);
    setAiError(null);
  };

  const handleAutoTranslate = async (targetLanguages: string[]) => {
    try {
      await apiClient.autoTranslateMissing(projectId, targetLanguages);
      await refetchKeys();
    } catch (error) {
      throw error;
    }
  };

  // Calculate empty translations count per language
  const emptyTranslationsCount = useMemo(() => {
    const count: Record<string, number> = {};
    if (!project) return count;

    project.languages.forEach(lang => {
      count[lang] = translationKeys.filter(tk => !tk.translations[lang]?.trim()).length;
    });

    return count;
  }, [project, translationKeys]);

  const handleExportJSON = async () => {
    if (!project) return;

    try {
      // Build export data from translationKeys
      const exportData: Record<string, Record<string, string>> = {};

      project.languages.forEach(lang => {
        exportData[lang] = {};
        translationKeys.forEach(tk => {
          if (tk.translations[lang]) {
            exportData[lang][tk.key] = tk.translations[lang];
          }
        });
      });

      project.languages.forEach(lang => {
        const blob = new Blob([JSON.stringify(exportData[lang], null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${lang}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      toast.success('Translations exported successfully!');
    } catch (error) {
      toast.error('Failed to export translations. Please try again.');
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !project) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const langCode = file.name.replace('.json', '');

      // Check if language exists in project
      if (!project.languages.includes(langCode)) {
        toast.warning(`Language "${langCode}" not found in project. Skipping ${file.name}`);
        continue;
      }

      try {
        const content = await file.text();
        const data = JSON.parse(content);

        // Flatten nested JSON to dot notation
        const flattenObj = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
          return Object.keys(obj).reduce((acc: Record<string, string>, key) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              Object.assign(acc, flattenObj(value as Record<string, unknown>, fullKey));
            } else {
              acc[fullKey] = String(value);
            }
            return acc;
          }, {});
        };

        const flatData = flattenObj(data);

        // Import each key
        for (const [key, value] of Object.entries(flatData)) {
          // Check if key exists
          const existingKey = translationKeys.find(tk => tk.key === key);

          if (existingKey) {
            // Update existing key using mutation
            await updateTranslationMutation.mutateAsync({
              keyId: existingKey.id,
              language: langCode,
              value,
            });
          } else {
            // Create new key with the value for this language
            await createKeyMutation.mutateAsync({
              key,
              translations: { [langCode]: value },
            });
          }
        }

      } catch (error) {
        toast.error(`Error parsing ${file.name}. Please check the file format.`);
      }
    }

    setIsImportDialogOpen(false);
    toast.success('Translations imported successfully!');
  };

  // Loading state
  if (isProjectLoading || isKeysLoading) {
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
            <div className="min-w-0">
              <h1 className="font-medium text-sm truncate">{project.name}</h1>
              <p className="text-xs text-muted-foreground">
                {project.languages.length} languages • {translationKeys.length} keys • {progress.overall}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedKeys.size > 0 && (
              <>
                <Badge variant="secondary" className="text-xs">{selectedKeys.size}</Badge>
                <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {project.enableAiTranslation && (
              <Button
                onClick={() => setIsAutoTranslateOpen(true)}
                variant="outline"
                size="sm"
              >
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">AI Translate</span>
              </Button>
            )}
            <Button onClick={handleExportJSON} variant="outline" size="sm">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Link href={`/dashboard/projects/${projectId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              onClick={() => setShowCollaboration(!showCollaboration)}
              variant={showCollaboration ? "default" : "outline"}
              size="sm"
            >
              <Users className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Dialog open={isMemoryPanelOpen} onOpenChange={setIsMemoryPanelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Translation Memory</DialogTitle>
                  <DialogDescription>
                    Browse and manage your translation memory
                  </DialogDescription>
                </DialogHeader>
                <TranslationMemoryPanel
                  projectId={projectId}
                  currentLanguagePair={
                    project
                      ? {
                          source: project.defaultLanguage,
                          target: project.languages.find(l => l !== project.defaultLanguage) || project.defaultLanguage,
                        }
                      : undefined
                  }
                />
              </DialogContent>
            </Dialog>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import JSON Files</DialogTitle>
                  <DialogDescription>
                    Upload JSON files for your languages (e.g., en.json, es.json)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="json-files">Select JSON Files</Label>
                    <Input
                      id="json-files"
                      type="file"
                      accept=".json"
                      multiple
                      onChange={handleImportJSON}
                    />
                    <p className="text-xs text-muted-foreground">
                      File names should match language codes (en.json, es.json, etc.)
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg text-sm">
                    <p className="font-semibold mb-2">Supported Languages:</p>
                    <div className="flex flex-wrap gap-1">
                      {project.languages.map(lang => (
                        <Badge key={lang} variant="outline">{lang}.json</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={showCollaboration ? "flex h-[calc(100vh-56px)]" : ""}>
        <div className={showCollaboration ? "flex-1 overflow-y-auto" : ""}>
          <div className="container-default py-6 space-y-6">
          {/* Progress Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Translation Progress
                <Badge variant={progress.overall === 100 ? 'default' : 'secondary'}>
                  {progress.overall}% Complete
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">{progress.overall}%</span>
                  </div>
                  <Progress value={progress.overall} className="h-2" />
                </div>

                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t">
                  {project.languages.map(lang => {
                    const langProgress = progress.byLanguage[lang];
                    return (
                      <div key={lang} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{lang.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {langProgress?.completed}/{langProgress?.total}
                          </span>
                        </div>
                        <Progress value={langProgress?.percentage || 0} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicates Warning */}
          {duplicates.length > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">
                      {duplicates.length} Duplicate Translation(s)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Some translations have identical values. Consider consolidating them.
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">View Details</summary>
                      <div className="mt-2 space-y-1">
                        {duplicates.slice(0, 5).map((dup, i) => (
                          <div key={i} className="text-muted-foreground">
                            • {dup.keys.join(', ')} = &quot;{dup.value}&quot; ({dup.language})
                          </div>
                        ))}
                        {duplicates.length > 5 && (
                          <div className="text-muted-foreground">
                            ... and {duplicates.length - 5} more
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search & Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search keys, descriptions, or translations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {project.languages.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterCompletion} onValueChange={(v) => setFilterCompletion(v as typeof filterCompletion)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Keys</SelectItem>
                    <SelectItem value="complete">Complete Only</SelectItem>
                    <SelectItem value="incomplete">Incomplete Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <SelectTrigger className="w-[180px]">
                    <Layers className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="namespace">Group by Namespace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Translation Keys Table */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Translation Keys</CardTitle>
                  <CardDescription>
                    {filteredKeys.length} of {translationKeys.length} keys shown
                  </CardDescription>
                </div>
                <Dialog open={isCreateKeyDialogOpen} onOpenChange={setIsCreateKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Translation Key</DialogTitle>
                      <DialogDescription>
                        Create a new translation key for your project
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="key">Key *</Label>
                        <Input
                          id="key"
                          placeholder="e.g., hero.title or common.button.submit"
                          value={newKey.key}
                          onChange={(e) => setNewKey(prev => ({ ...prev, key: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use dot notation for nested keys
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          placeholder="What is this translation for?"
                          value={newKey.description}
                          onChange={(e) => setNewKey(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateKeyDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateKey}
                        disabled={!newKey.key.trim()}
                      >
                        Add Key
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {translationKeys.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">No translation keys yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by adding your first translation key or import existing JSON files
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setIsCreateKeyDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Key
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import JSON
                    </Button>
                  </div>
                </div>
              ) : filteredKeys.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No keys match your filters</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterLanguage('all');
                      setFilterCompletion('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupBy === 'namespace' ? (
                    Object.entries(groupedKeys).map(([namespace, keys]) => (
                      <div key={namespace} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleGroup(namespace)}
                          className="w-full flex items-center gap-2 p-3 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          {expandedGroups.has(namespace) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-mono font-semibold">
                            {namespace === '_root' ? 'Root Level' : namespace}
                          </span>
                          <Badge variant="secondary">{keys.length} keys</Badge>
                        </button>

                        {expandedGroups.has(namespace) && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">
                                  <Checkbox
                                    checked={keys.every(k => selectedKeys.has(k.id))}
                                    onCheckedChange={() => {
                                      const allSelected = keys.every(k => selectedKeys.has(k.id));
                                      const newSelected = new Set(selectedKeys);
                                      keys.forEach(k => {
                                        if (allSelected) {
                                          newSelected.delete(k.id);
                                        } else {
                                          newSelected.add(k.id);
                                        }
                                      });
                                      setSelectedKeys(newSelected);
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="w-[250px]">Key</TableHead>
                                {project.languages.map(lang => (
                                  <TableHead key={lang} className="min-w-[200px]">
                                    {lang.toUpperCase()}
                                  </TableHead>
                                ))}
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {keys.map(tk => {
                                const isComplete = project.languages.every(lang => tk.translations[lang]?.trim());

                                return (
                                  <TableRow key={tk.id} className={selectedKeys.has(tk.id) ? 'bg-muted/50' : ''}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedKeys.has(tk.id)}
                                        onCheckedChange={(checked) => {
                                          const newSelected = new Set(selectedKeys);
                                          if (checked) {
                                            newSelected.add(tk.id);
                                          } else {
                                            newSelected.delete(tk.id);
                                          }
                                          setSelectedKeys(newSelected);
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                          <div className="font-mono text-sm font-medium flex items-center gap-2">
                                            {tk.key.replace(namespace + '.', '')}
                                            {isComplete && (
                                              <Check className="h-3 w-3 text-success" />
                                            )}
                                          </div>
                                          {tk.description && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {tk.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    {project.languages.map(lang => (
                                      <TableCell key={lang}>
                                        {editingCell?.keyId === tk.id && editingCell?.lang === lang ? (
                                          <div className="flex gap-1">
                                            <Input
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') handleCancelEdit();
                                              }}
                                              autoFocus
                                              className="h-8"
                                            />
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8"
                                              onClick={handleSaveEdit}
                                            >
                                              <Save className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            {/* AI Suggestion Card */}
                                            {aiSuggestion?.keyId === tk.id && aiSuggestion?.language === lang && (
                                              <AISuggestionCard
                                                translationText={aiSuggestion.translation}
                                                confidence={aiSuggestion.confidence}
                                                cost={aiSuggestion.cost}
                                                onAccept={handleAcceptAiSuggestion}
                                                onReject={handleRejectAiSuggestion}
                                              />
                                            )}

                                            {/* Loading State */}
                                            {aiLoading?.keyId === tk.id && aiLoading?.language === lang && (
                                              <AISuggestionCard
                                                translationText=""
                                                loading={true}
                                                onAccept={() => {}}
                                                onReject={() => {}}
                                              />
                                            )}

                                            {/* Error State */}
                                            {aiError && aiLoading?.keyId === tk.id && aiLoading?.language === lang && (
                                              <AISuggestionCard
                                                translationText=""
                                                error={aiError}
                                                onAccept={() => {}}
                                                onReject={handleRejectAiSuggestion}
                                              />
                                            )}

                                            <div className="flex items-center gap-1">
                                              <div
                                                className="flex-1 flex items-center gap-2 group cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded"
                                                onClick={(e) => handleStartEdit(tk.id, lang, tk.translations[lang] || '', e)}
                                              >
                                                <span className="flex-1 text-sm">
                                                  {tk.translations[lang] || (
                                                    <span className="text-muted-foreground italic">Empty</span>
                                                  )}
                                                </span>
                                                <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>

                                              {/* AI Translate button for empty cells */}
                                              {!tk.translations[lang]?.trim() && project.enableAiTranslation && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={() => handleAiTranslate(tk.id, lang)}
                                                >
                                                  <Sparkles className="h-3 w-3 mr-1" />
                                                  AI
                                                </Button>
                                              )}

                                              {tk.translations[lang] && (
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(tk.translations[lang]);
                                                    toast.success('Copied to clipboard!');
                                                  }}
                                                  aria-label="Copy translation"
                                                >
                                                  <Copy className="h-3 w-3" />
                                                </Button>
                                              )}
                                            </div>
                                            {tk.translations[lang] && (
                                              <div className="flex items-center gap-2">
                                                <ApprovalBadge
                                                  projectId={projectId}
                                                  keyId={tk.id}
                                                  language={lang}
                                                  onStatusChange={() => refetchKeys()}
                                                />
                                                <CommentIndicator
                                                  projectId={projectId}
                                                  keyId={tk.id}
                                                  language={lang}
                                                  onClick={() => {
                                                    setSelectedKeyForCollab(tk.id);
                                                    setSelectedLanguageForCollab(lang);
                                                    setShowCollaboration(true);
                                                  }}
                                                />
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2"
                                                  onClick={() => {
                                                    setVersionKeyId(tk.id);
                                                    setVersionLanguage(lang);
                                                    setIsVersionHistoryOpen(true);
                                                  }}
                                                >
                                                  <History className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </TableCell>
                                    ))}
                                    <TableCell>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDeleteKey(tk.id, tk.key)}
                                        aria-label={`Delete translation key ${tk.key}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={selectedKeys.size > 0 && selectedKeys.size === filteredKeys.length}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead className="w-[250px]">Key</TableHead>
                            {project.languages.map(lang => (
                              <TableHead key={lang} className="min-w-[200px]">
                                {lang.toUpperCase()}
                              </TableHead>
                            ))}
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredKeys.map(tk => {
                            const isComplete = project.languages.every(lang => tk.translations[lang]?.trim());

                            return (
                              <TableRow key={tk.id} className={selectedKeys.has(tk.id) ? 'bg-muted/50' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedKeys.has(tk.id)}
                                    onCheckedChange={(checked) => {
                                      const newSelected = new Set(selectedKeys);
                                      if (checked) {
                                        newSelected.add(tk.id);
                                      } else {
                                        newSelected.delete(tk.id);
                                      }
                                      setSelectedKeys(newSelected);
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                      <div className="font-mono text-sm font-medium flex items-center gap-2">
                                        {tk.key}
                                        {isComplete && (
                                          <Check className="h-3 w-3 text-success" />
                                        )}
                                      </div>
                                      {tk.description && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {tk.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                {project.languages.map(lang => (
                                  <TableCell key={lang}>
                                    {editingCell?.keyId === tk.id && editingCell?.lang === lang ? (
                                      <div className="flex gap-1">
                                        <Input
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit();
                                            if (e.key === 'Escape') handleCancelEdit();
                                          }}
                                          autoFocus
                                          className="h-8"
                                        />
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={handleSaveEdit}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {/* AI Suggestion Card */}
                                        {aiSuggestion?.keyId === tk.id && aiSuggestion?.language === lang && (
                                          <AISuggestionCard
                                            translationText={aiSuggestion.translation}
                                            confidence={aiSuggestion.confidence}
                                            cost={aiSuggestion.cost}
                                            onAccept={handleAcceptAiSuggestion}
                                            onReject={handleRejectAiSuggestion}
                                          />
                                        )}

                                        {/* Loading State */}
                                        {aiLoading?.keyId === tk.id && aiLoading?.language === lang && (
                                          <AISuggestionCard
                                            translationText=""
                                            loading={true}
                                            onAccept={() => {}}
                                            onReject={() => {}}
                                          />
                                        )}

                                        {/* Error State */}
                                        {aiError && aiLoading?.keyId === tk.id && aiLoading?.language === lang && (
                                          <AISuggestionCard
                                            translationText=""
                                            error={aiError}
                                            onAccept={() => {}}
                                            onReject={handleRejectAiSuggestion}
                                          />
                                        )}

                                        <div className="flex items-center gap-1">
                                          <div
                                            className="flex-1 flex items-center gap-2 group cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded"
                                            onClick={() => handleStartEdit(tk.id, lang, tk.translations[lang] || '')}
                                          >
                                            <span className="flex-1 text-sm">
                                              {tk.translations[lang] || (
                                                <span className="text-muted-foreground italic">Empty</span>
                                              )}
                                            </span>
                                            <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>

                                          {/* AI Translate button for empty cells */}
                                          {!tk.translations[lang]?.trim() && project.enableAiTranslation && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => handleAiTranslate(tk.id, lang)}
                                            >
                                              <Sparkles className="h-3 w-3 mr-1" />
                                              AI
                                            </Button>
                                          )}

                                          {tk.translations[lang] && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 opacity-0 hover:opacity-100"
                                              onClick={() => {
                                                navigator.clipboard.writeText(tk.translations[lang]);
                                                toast.success('Copied to clipboard!');
                                              }}
                                              aria-label="Copy translation"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteKey(tk.id, tk.key)}
                                    aria-label={`Delete translation key ${tk.key}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Collaboration Sidebar */}
        {showCollaboration && (
          <div className="w-80 flex-shrink-0 border-l border-border/50">
            <CollaborationSidebar
              projectId={projectId}
              keyId={selectedKeyForCollab || undefined}
              language={selectedLanguageForCollab || undefined}
              onUpdate={() => refetchKeys()}
            />
          </div>
        )}
      </main>

      {/* Version History Dialog */}
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions
            </DialogDescription>
          </DialogHeader>
          {versionKeyId && versionLanguage && (
            <VersionHistoryPanel
              projectId={projectId}
              keyId={versionKeyId}
              language={versionLanguage}
              currentValue={
                translationKeys.find(k => k.id === versionKeyId)?.translations[versionLanguage] || ''
              }
              onRestore={async (value) => {
                await updateTranslationMutation.mutateAsync({
                  keyId: versionKeyId,
                  language: versionLanguage,
                  value,
                });
                setIsVersionHistoryOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Git Commit Dialog */}
      <CommitDialog
        open={isCommitDialogOpen}
        onOpenChange={setIsCommitDialogOpen}
        files={[
          {
            path: `locales/${project?.defaultLanguage || 'en'}.json`,
            status: 'modified',
            insertions: translationKeys.filter(k => k.translations[project?.defaultLanguage || '']).length,
            deletions: 0,
          },
          ...((project?.languages || [])
            .filter(lang => lang !== project?.defaultLanguage)
            .map(lang => ({
              path: `locales/${lang}.json`,
              status: 'modified' as const,
              insertions: translationKeys.filter(k => k.translations[lang]).length,
              deletions: 0,
            }))),
        ]}
        onCommitComplete={() => refetchKeys()}
      />

      {/* Git History Dialog */}
      <Dialog open={isGitHistoryOpen} onOpenChange={setIsGitHistoryOpen}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Git History</DialogTitle>
            <DialogDescription>
              View commit history for this project
            </DialogDescription>
          </DialogHeader>
          <GitHistory />
        </DialogContent>
      </Dialog>

      {/* Translation Memory Suggestion Popover */}
      {suggestions.length > 0 && suggestionPosition && (
        <SuggestionPopover
          suggestions={suggestions}
          onSelect={handleSelectSuggestion}
          onClose={() => {
            setMemorySearchParams(null);
            setSuggestionPosition(null);
          }}
          position={suggestionPosition}
        />
      )}

      {/* Auto-Translate Dialog */}
      <AutoTranslateDialog
        open={isAutoTranslateOpen}
        onOpenChange={setIsAutoTranslateOpen}
        projectLanguages={project.languages}
        defaultLanguage={project.defaultLanguage}
        emptyTranslationsCount={emptyTranslationsCount}
        onConfirm={handleAutoTranslate}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
        title={confirmDialog.type === 'deleteKey' ? 'Delete Translation Key' : 'Delete Selected Keys'}
        description={
          confirmDialog.type === 'deleteKey'
            ? `Are you sure you want to delete the key "${confirmDialog.keyName}"? This will remove all translations for this key. This action cannot be undone.`
            : `Are you sure you want to delete ${confirmDialog.count} selected key(s)? This will remove all translations for these keys. This action cannot be undone.`
        }
        confirmText={confirmDialog.type === 'deleteKey' ? 'Delete Key' : `Delete ${confirmDialog.count} Keys`}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Project, TranslationKey } from '@/lib/types/project';
import { AITranslationService } from '@/lib/services/ai-translation';
import { AISettingsStore } from '@/lib/store/ai-settings-store';
import { useUpdateTranslation } from '@/hooks/queries';
import { Sparkles, AlertCircle, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

interface BatchTranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  projectId: string;
  selectedKeyIds: string[];
  allKeys: TranslationKey[];
  onComplete: () => void;
}

type TranslationStatus = 'idle' | 'translating' | 'completed' | 'error';

export function BatchTranslateDialog({
  open,
  onOpenChange,
  project,
  projectId,
  selectedKeyIds,
  allKeys,
  onComplete,
}: BatchTranslateDialogProps) {
  const updateTranslationMutation = useUpdateTranslation(projectId);
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [autoAccept, setAutoAccept] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset state
      setStatus('idle');
      setProgress(0);
      setCompleted(0);
      setTotal(0);
      setError('');
      setSelectedLanguages(project.languages.filter(lang => lang !== project.defaultLanguage));

      // Calculate estimate
      const keysToTranslate = allKeys.filter(k => selectedKeyIds.includes(k.id));
      const texts = keysToTranslate.map(k => k.translations[project.defaultLanguage] || k.key);
      const targetLangs = project.languages.filter(lang => lang !== project.defaultLanguage);

      const estimate = AITranslationService.estimateCost(texts, targetLangs.length);
      setEstimatedCost(estimate.estimatedCost);
    }
  }, [open, project, selectedKeyIds, allKeys]);

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleTranslate = async () => {
    if (!AISettingsStore.hasApiKey()) {
      setError('Please configure your API key in AI Settings first');
      return;
    }

    if (selectedLanguages.length === 0) {
      setError('Please select at least one target language');
      return;
    }

    setStatus('translating');
    setError('');

    const keysToTranslate = allKeys.filter(k => selectedKeyIds.includes(k.id));
    const totalTranslations = keysToTranslate.length * selectedLanguages.length;
    setTotal(totalTranslations);

    const keyTexts = keysToTranslate.map(k => ({
      keyId: k.id,
      text: k.translations[project.defaultLanguage] || k.key,
      context: k.description,
    }));

    try {
      const suggestions = await AITranslationService.batchTranslate(
        keyTexts,
        project.defaultLanguage,
        selectedLanguages,
        (completedCount, totalCount) => {
          setCompleted(completedCount);
          setProgress((completedCount / totalCount) * 100);
        }
      );

      // Auto-accept if enabled
      if (autoAccept) {
        for (const suggestion of suggestions) {
          await updateTranslationMutation.mutateAsync({
            keyId: suggestion.keyId,
            language: suggestion.language,
            value: suggestion.value,
          });
        }
      }

      setStatus('completed');
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      setStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Batch AI Translation
          </DialogTitle>
          <DialogDescription>
            Automatically translate {selectedKeyIds.length} key(s) using AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Language */}
          <div className="space-y-2">
            <Label>Source Language</Label>
            <div className="flex items-center gap-2">
              <Badge variant="default">{project.defaultLanguage.toUpperCase()}</Badge>
              <span className="text-sm text-muted-foreground">
                Translations will be based on your default language
              </span>
            </div>
          </div>

          {/* Target Languages */}
          <div className="space-y-3">
            <Label>Target Languages</Label>
            <div className="grid grid-cols-3 gap-3">
              {project.languages
                .filter(lang => lang !== project.defaultLanguage)
                .map(lang => (
                  <div
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                      selectedLanguages.includes(lang)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-medium">{lang.toUpperCase()}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Auto-accept option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-accept"
              checked={autoAccept}
              onCheckedChange={(checked) => setAutoAccept(checked as boolean)}
            />
            <Label htmlFor="auto-accept" className="text-sm cursor-pointer">
              Automatically accept AI translations (skip review)
            </Label>
          </div>

          {/* Cost Estimate */}
          <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">Estimated Cost</h4>
                <p className="text-2xl font-bold text-primary mb-2">
                  ${estimatedCost.toFixed(4)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedKeyIds.length} keys × {selectedLanguages.length} languages = {selectedKeyIds.length * selectedLanguages.length} translations
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          {status === 'translating' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Translating...</span>
                <span className="text-muted-foreground">
                  {completed} / {total}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {status === 'completed' && (
            <Alert className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                Successfully translated {completed} translations!
                {!autoAccept && ' Review the suggestions in the editor.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === 'translating'}
          >
            {status === 'completed' ? 'Close' : 'Cancel'}
          </Button>
          {status !== 'completed' && (
            <Button
              onClick={handleTranslate}
              disabled={status === 'translating' || selectedLanguages.length === 0}
            >
              {status === 'translating' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Translation
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

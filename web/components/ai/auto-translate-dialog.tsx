'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, DollarSign, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AutoTranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectLanguages: string[];
  defaultLanguage: string;
  emptyTranslationsCount: Record<string, number>;
  onConfirm: (targetLanguages: string[]) => Promise<void>;
  estimatedCost?: number;
}

export function AutoTranslateDialog({
  open,
  onOpenChange,
  projectLanguages,
  defaultLanguage,
  emptyTranslationsCount,
  onConfirm,
  estimatedCost,
}: AutoTranslateDialogProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableLanguages = projectLanguages.filter(lang => lang !== defaultLanguage);

  const handleToggleLanguage = (language: string) => {
    const newSelected = new Set(selectedLanguages);
    if (newSelected.has(language)) {
      newSelected.delete(language);
    } else {
      newSelected.add(language);
    }
    setSelectedLanguages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLanguages.size === availableLanguages.length) {
      setSelectedLanguages(new Set());
    } else {
      setSelectedLanguages(new Set(availableLanguages));
    }
  };

  const totalEmptyCount = Array.from(selectedLanguages).reduce(
    (sum, lang) => sum + (emptyTranslationsCount[lang] || 0),
    0
  );

  const handleConfirm = async () => {
    if (selectedLanguages.size === 0) return;

    try {
      setTranslating(true);
      setError(null);
      setProgress(0);

      // Simulate progress (in real implementation, this would come from the API)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      await onConfirm(Array.from(selectedLanguages));

      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);

      setTimeout(() => {
        onOpenChange(false);
        setTranslating(false);
        setProgress(0);
        setSuccess(false);
        setSelectedLanguages(new Set());
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate. Please try again.');
      setTranslating(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!translating) {
      onOpenChange(false);
      setSelectedLanguages(new Set());
      setError(null);
      setSuccess(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Auto-Translate Missing Keys
          </DialogTitle>
          <DialogDescription>
            AI will automatically translate all empty translation keys for selected languages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-900 dark:text-red-100">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                Translations completed successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {translating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Translating...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Language Selection */}
          {!translating && !success && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Languages</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 text-xs"
                  >
                    {selectedLanguages.size === availableLanguages.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                  {availableLanguages.map(language => {
                    const emptyCount = emptyTranslationsCount[language] || 0;
                    return (
                      <div
                        key={language}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`lang-${language}`}
                            checked={selectedLanguages.has(language)}
                            onCheckedChange={() => handleToggleLanguage(language)}
                          />
                          <Label
                            htmlFor={`lang-${language}`}
                            className="cursor-pointer font-medium"
                          >
                            {language.toUpperCase()}
                          </Label>
                        </div>
                        <Badge variant="secondary">
                          {emptyCount} {emptyCount === 1 ? 'key' : 'keys'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              {selectedLanguages.size > 0 && (
                <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-900 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-violet-900 dark:text-violet-100 font-medium">
                      Total translations to generate:
                    </span>
                    <Badge className="bg-violet-600 dark:bg-violet-700">
                      {totalEmptyCount}
                    </Badge>
                  </div>

                  {estimatedCost !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-violet-900 dark:text-violet-100 font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Estimated cost:
                      </span>
                      <span className="font-mono text-violet-900 dark:text-violet-100">
                        ${estimatedCost.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-violet-800 dark:text-violet-200 pt-2 border-t border-violet-200 dark:border-violet-800">
                    AI will use your project settings (tone, style guide, etc.) to generate contextually
                    appropriate translations.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!translating && !success && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedLanguages.size === 0}
              className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Translation
            </Button>
          </div>
        )}

        {translating && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Please wait while we translate your content...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

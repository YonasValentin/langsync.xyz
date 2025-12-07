'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Check, X, TrendingUp, DollarSign, Loader2 } from 'lucide-react';

interface AISuggestionCardProps {
  translationText: string;
  confidence?: number;
  cost?: number;
  loading?: boolean;
  error?: string;
  onAccept: () => void;
  onReject: () => void;
}

export function AISuggestionCard({
  translationText,
  confidence,
  cost,
  loading,
  error,
  onAccept,
  onReject,
}: AISuggestionCardProps) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Generating AI translation...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5 animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Suggestion
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {confidence !== undefined && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {confidence}%
              </Badge>
            )}
            {cost !== undefined && cost > 0 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                ${cost.toFixed(4)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="bg-background rounded border p-2">
          <p className="text-sm">{translationText}</p>
        </div>

        <div className="flex gap-1.5">
          <Button
            onClick={handleAccept}
            disabled={accepting}
            size="sm"
            className="flex-1"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {accepting ? 'Accepting...' : 'Accept'}
          </Button>
          <Button
            onClick={onReject}
            disabled={accepting}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

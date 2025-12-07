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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AISettings, AIProvider, AIModel } from '@/lib/types/ai-translation';
import { AISettingsStore, AISuggestionsStore } from '@/lib/store/ai-settings-store';
import { Settings, Sparkles, DollarSign } from 'lucide-react';

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsDialog({ open, onOpenChange }: AISettingsDialogProps) {
  const [settings, setSettings] = useState<AISettings>(AISettingsStore.getSettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (open) {
      setSettings(AISettingsStore.getSettings());
      setTotalCost(AISuggestionsStore.getTotalCost());
    }
  }, [open]);

  const handleSave = () => {
    AISettingsStore.saveSettings(settings);
    onOpenChange(false);
  };

  const maskApiKey = (key: string) => {
    if (key.length === 0) return '';
    if (key.length < 8) return '•'.repeat(key.length);
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Translation Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI translation preferences and API keys
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) =>
                setSettings({ ...settings, provider: value as AIProvider })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <span>OpenAI (GPT-4, GPT-3.5)</span>
                    <Badge variant="outline" className="text-xs">Popular</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="anthropic">
                  <div className="flex items-center gap-2">
                    <span>Anthropic (Claude)</span>
                    <Badge variant="outline" className="text-xs">Best Quality</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) =>
                setSettings({ ...settings, model: value as AIModel })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.provider === 'openai' ? (
                  <>
                    <SelectItem value="gpt-4">
                      <div className="flex items-center justify-between gap-8">
                        <span>GPT-4</span>
                        <span className="text-xs text-muted-foreground">$0.03/1K tokens</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-3.5-turbo">
                      <div className="flex items-center justify-between gap-8">
                        <span>GPT-3.5 Turbo</span>
                        <span className="text-xs text-muted-foreground">$0.001/1K tokens</span>
                      </div>
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="claude-3-5-sonnet-20241022">
                      <div className="flex items-center justify-between gap-8">
                        <span>Claude 3.5 Sonnet</span>
                        <span className="text-xs text-muted-foreground">$0.003/1K tokens</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">
                      <div className="flex items-center justify-between gap-8">
                        <span>Claude 3 Haiku</span>
                        <span className="text-xs text-muted-foreground">$0.00025/1K tokens</span>
                      </div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">
              {settings.provider === 'openai' ? 'OpenAI API Key' : 'Anthropic API Key'}
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder={`Enter your ${settings.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings({ ...settings, apiKey: e.target.value })
                }
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a
                href={
                  settings.provider === 'openai'
                    ? 'https://platform.openai.com/api-keys'
                    : 'https://console.anthropic.com'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {settings.provider === 'openai' ? 'OpenAI Platform' : 'Anthropic Console'}
              </a>
            </p>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Advanced Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {settings.temperature}
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) =>
                    setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more consistent, Higher = more creative
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={settings.maxTokens}
                  onChange={(e) =>
                    setSettings({ ...settings, maxTokens: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          {/* Cost Tracking */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4" />
              Total AI Translation Costs
            </div>
            <p className="text-2xl font-bold text-primary">
              ${totalCost.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground">
              Total spent on accepted AI translations in this session
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Settings className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

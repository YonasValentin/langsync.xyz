"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Key,
  Languages,
  Copy,
  Check,
  Ban,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useDeleteApiKey,
  useProjects,
  type CreateApiKeyInput,
} from "@/hooks/queries";
import { useApiKeysStore } from "@/stores/api-keys-store";

export default function ApiKeysPage() {
  const { isLoading: authLoading } = useAuth();
  const {
    isCreateDialogOpen,
    setCreateDialogOpen,
    isRevokeDialogOpen,
    revokeTargetId,
    revokeTargetName,
    openRevokeDialog,
    closeRevokeDialog,
    isDeleteDialogOpen,
    deleteTargetId,
    deleteTargetName,
    openDeleteDialog,
    closeDeleteDialog,
    newlyCreatedKey,
    setNewlyCreatedKey,
  } = useApiKeysStore();

  const {
    data: apiKeys = [],
    isLoading,
    isError,
    refetch,
  } = useApiKeys();

  const { data: projects = [] } = useProjects();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [newKeyInput, setNewKeyInput] = useState<CreateApiKeyInput>({
    name: "",
  });
  const [copiedKey, setCopiedKey] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleCreateKey = async () => {
    if (!newKeyInput.name.trim()) {
      toast.error("Key name is required");
      return;
    }

    try {
      const result = await createApiKey.mutateAsync(newKeyInput);
      setNewlyCreatedKey(result.fullKey);
      setNewKeyInput({ name: "" });
      setCreateDialogOpen(false);
      toast.success("API key created");
    } catch {
      toast.error("Failed to create API key");
    }
  };

  const handleRevokeKey = async () => {
    if (!revokeTargetId) return;
    try {
      await revokeApiKey.mutateAsync(revokeTargetId);
      closeRevokeDialog();
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteApiKey.mutateAsync(deleteTargetId);
      closeDeleteDialog();
      toast.success("API key deleted");
    } catch {
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const activeKeys = apiKeys.filter((k) => !k.revoked);
  const revokedKeys = apiKeys.filter((k) => k.revoked);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container-default flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold text-lg"
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Languages className="h-4 w-4 text-primary-foreground" />
              </div>
              <span>LangSync</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">API Keys</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-default py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">API Keys</h1>
              <p className="text-muted-foreground">
                Manage keys for the LangSync SDKs
              </p>
            </div>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Create a new key for your SDKs. The full key will only be
                    shown once.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g. Production, Development, CI/CD"
                      value={newKeyInput.name}
                      onChange={(e) =>
                        setNewKeyInput((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyProject">
                      Project Scope{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Select
                      value={newKeyInput.projectId || "all"}
                      onValueChange={(value) =>
                        setNewKeyInput((prev) => ({
                          ...prev,
                          projectId: value === "all" ? undefined : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Restrict this key to a single project, or leave as "All
                      projects"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyExpiry">
                      Expiration{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="keyExpiry"
                      type="date"
                      value={
                        newKeyInput.expiresAt
                          ? newKeyInput.expiresAt.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setNewKeyInput((prev) => ({
                          ...prev,
                          expiresAt: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        }))
                      }
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={
                      !newKeyInput.name.trim() || createApiKey.isPending
                    }
                  >
                    {createApiKey.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Newly Created Key Banner */}
          {newlyCreatedKey && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">
                      Copy your API key now. It won&apos;t be shown again.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                        {newlyCreatedKey}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(newlyCreatedKey)}
                        className="shrink-0"
                      >
                        {copiedKey ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewlyCreatedKey(null)}
                      className="text-xs text-muted-foreground"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Hint */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Use your API key with the LangSync SDKs:
              </p>
              <code className="block mt-2 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {`new LangSyncClient({ apiKey: "lsk_...", projectId: "..." })`}
              </code>
            </CardContent>
          </Card>

          {/* Error State */}
          {isError && (
            <Card className="border-destructive/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-destructive text-sm mb-3">
                  Failed to load API keys
                </p>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !isError && apiKeys.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Key className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No API keys yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Create an API key to start using the LangSync SDKs in your
                  applications
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Key
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Active Keys */}
              {activeKeys.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Active Keys ({activeKeys.length})
                  </h2>
                  {activeKeys.map((key) => (
                    <Card key={key.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{key.name}</span>
                              {key.projectName && (
                                <Badge variant="secondary" className="text-xs">
                                  {key.projectName}
                                </Badge>
                              )}
                              {!key.projectId && (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  All projects
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <code className="bg-muted px-1.5 py-0.5 rounded">
                                {key.prefix}
                              </code>
                              <span>Created {formatDate(key.created)}</span>
                              {key.lastUsedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last used {formatDate(key.lastUsedAt)}
                                </span>
                              )}
                              {key.expiresAt && (
                                <span
                                  className={
                                    new Date(key.expiresAt) < new Date()
                                      ? "text-destructive"
                                      : ""
                                  }
                                >
                                  Expires {formatDate(key.expiresAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openRevokeDialog(key.id, key.name)
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Revoked Keys */}
              {revokedKeys.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Revoked Keys ({revokedKeys.length})
                  </h2>
                  {revokedKeys.map((key) => (
                    <Card key={key.id} className="opacity-60">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium line-through">
                                {key.name}
                              </span>
                              <Badge
                                variant="destructive"
                                className="text-xs"
                              >
                                Revoked
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <code className="bg-muted px-1.5 py-0.5 rounded">
                                {key.prefix}
                              </code>
                              {key.revokedAt && (
                                <span>
                                  Revoked {formatDate(key.revokedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openDeleteDialog(key.id, key.name)
                            }
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={isRevokeDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeRevokeDialog();
        }}
        title="Revoke API Key"
        description={`Are you sure you want to revoke "${revokeTargetName}"? Any applications using this key will immediately lose access.`}
        confirmText="Revoke"
        variant="destructive"
        onConfirm={handleRevokeKey}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
        title="Delete API Key"
        description={`Are you sure you want to permanently delete "${deleteTargetName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteKey}
      />
    </div>
  );
}

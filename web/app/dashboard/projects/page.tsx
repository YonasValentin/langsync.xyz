'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { UserMenu } from '@/components/user-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, FolderOpen, Trash2, Languages, Key, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  usePrefetchProject,
  type CreateProjectInput,
} from '@/hooks/queries';

const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'da', name: 'Danish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
];

export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const prefetchProject = usePrefetchProject();

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useProjects();

  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    projectId?: string;
    projectName?: string;
  }>({ open: false });

  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: '',
    description: '',
    defaultLanguage: 'en',
    languages: ['en'],
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      await createProject.mutateAsync(newProject);
      setNewProject({
        name: '',
        description: '',
        defaultLanguage: 'en',
        languages: ['en'],
      });
      setIsCreateDialogOpen(false);
      toast.success('Project created successfully!');
    } catch (error) {
      toast.error('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = (id: string, name: string) => {
    setConfirmDialog({ open: true, projectId: id, projectName: name });
  };

  const confirmDeleteProject = async () => {
    if (!confirmDialog.projectId) return;

    try {
      await deleteProject.mutateAsync(confirmDialog.projectId);
      toast.success('Project deleted successfully');
    } catch (error) {
      toast.error('Failed to delete project. Please try again.');
    }
  };

  const toggleLanguage = (code: string) => {
    if (newProject.languages.includes(code)) {
      if (code === newProject.defaultLanguage && newProject.languages.length === 1) return;

      setNewProject(prev => ({
        ...prev,
        languages: prev.languages.filter(l => l !== code),
        defaultLanguage: code === prev.defaultLanguage
          ? prev.languages.find(l => l !== code) || 'en'
          : prev.defaultLanguage
      }));
    } else {
      setNewProject(prev => ({
        ...prev,
        languages: [...prev.languages, code],
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container-default flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Languages className="h-4 w-4 text-primary-foreground" />
              </div>
              <span>LangSync</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">Projects</span>
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
              <h1 className="text-2xl font-semibold mb-1">Projects</h1>
              <p className="text-muted-foreground">
                Manage translations across your applications
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                  <DialogDescription>
                    Set up a new translation project
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="My App"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional description"
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Select
                      value={newProject.defaultLanguage}
                      onValueChange={(value) => {
                        setNewProject(prev => ({
                          ...prev,
                          defaultLanguage: value,
                          languages: prev.languages.includes(value)
                            ? prev.languages
                            : [...prev.languages, value]
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_LANGUAGES.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name} ({lang.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Languages</Label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-3 border rounded-lg bg-muted/30">
                      {COMMON_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => toggleLanguage(lang.code)}
                          className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                            newProject.languages.includes(lang.code)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background hover:bg-muted border border-border'
                          }`}
                        >
                          {lang.code.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {newProject.languages.length} selected
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={!newProject.name.trim() || createProject.isPending}
                  >
                    {createProject.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Error State */}
          {isError && (
            <Card className="border-destructive/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-destructive text-sm mb-3">Failed to load projects</p>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-2/3 mb-1" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !isError && projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Create your first project to start managing translations
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  onMouseEnter={() => prefetchProject(project.id)}
                >
                  <Card className="card-interactive h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{project.name}</CardTitle>
                          <CardDescription className="line-clamp-1 text-sm">
                            {project.description || 'No description'}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProject(project.id, project.name);
                          }}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          aria-label="Delete project"
                          disabled={deleteProject.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Languages className="h-3.5 w-3.5" />
                          {project.languages.length}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5" />
                          {project.keyCount}
                        </span>
                      </div>

                      {project.keyCount > 0 && (
                        <div className="space-y-1">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${project.translationProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {project.translationProgress}% translated
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {project.languages.slice(0, 4).map(lang => (
                          <Badge key={lang} variant="secondary" className="text-xs px-1.5 py-0">
                            {lang.toUpperCase()}
                          </Badge>
                        ))}
                        {project.languages.length > 4 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            +{project.languages.length - 4}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
        title="Delete Project"
        description={`Are you sure you want to delete "${confirmDialog.projectName}"? This will permanently delete all translations. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDeleteProject}
      />
    </div>
  );
}

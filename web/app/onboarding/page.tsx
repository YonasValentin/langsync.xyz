'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  FolderPlus,
  Code2,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  ChevronLeft,
  PartyPopper,
  Languages,
} from 'lucide-react';
import Link from 'next/link';
import { useCreateProject } from '@/hooks/queries';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: any;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Welcome',
    description: 'Get started with LangSync',
    icon: Rocket,
  },
  {
    id: 2,
    title: 'Create Project',
    description: 'Set up your first project',
    icon: FolderPlus,
  },
  {
    id: 3,
    title: 'Install SDK',
    description: 'Add LangSync to your app',
    icon: Code2,
  },
  {
    id: 4,
    title: 'All Set',
    description: 'You\'re ready to go!',
    icon: PartyPopper,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createProject = useCreateProject();
  const [currentStep, setCurrentStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<'nextjs' | 'expo' | 'react'>('nextjs');
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCreateProject = async () => {
    setError('');

    try {
      const newProject = await createProject.mutateAsync({
        name: projectName,
        description: 'My first LangSync project',
        defaultLanguage: 'en',
        languages: ['en'],
      });
      setProjectId(newProject?.id ?? '');
      setApiKey('your-api-key-here'); // API key would be generated separately
      setCurrentStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const copyCode = () => {
    const code = getInstallCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getInstallCode = () => {
    if (selectedFramework === 'nextjs') {
      return `// 1. Install the package
npm install @yonasvalentin/langsync-nextjs

// 2. Add to next.config.js
import langsyncPlugin from '@yonasvalentin/langsync-nextjs/plugin';

export default langsyncPlugin({
  apiKey: '${apiKey}',
  projectId: '${projectId}',
  defaultLanguage: 'en',
  languages: ['en', 'da', 'de'],
});

// 3. Use in your components
import { useTranslations } from '@yonasvalentin/langsync-nextjs';

export default function Home() {
  const t = useTranslations('en');
  return <h1>{t('welcome.title')}</h1>;
}`;
    } else if (selectedFramework === 'expo') {
      return `// 1. Install the package
npm install @yonasvalentin/langsync-expo

// 2. Wrap your app
import { TranslationProvider } from '@yonasvalentin/langsync-expo';

export default function App() {
  return (
    <TranslationProvider
      config={{
        apiKey: '${apiKey}',
        projectId: '${projectId}',
        defaultLanguage: 'en',
        languages: ['en', 'da'],
      }}
    >
      <YourApp />
    </TranslationProvider>
  );
}`;
    } else {
      return `// 1. Install the package
npm install @yonasvalentin/langsync-client

// 2. Initialize in your app
import { createPhraseflowClient } from '@yonasvalentin/langsync-client';

const langsync = createPhraseflowClient({
  apiKey: '${apiKey}',
  projectId: '${projectId}',
});

// 3. Fetch translations
const translations = await langsync.getTranslations('en');`;
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      if (!projectName.trim()) {
        setError('Please enter a project name');
        return;
      }
      handleCreateProject();
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const userName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-rose-50/30 to-amber-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-md group-hover:shadow-glow-primary transition-shadow duration-300">
                <Languages className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">LangSync</span>
            </Link>
            <Badge variant="secondary" className="ml-3 text-xs font-medium">Onboarding</Badge>
          </div>

          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
      </header>

      <div className="container px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-green-500 border-green-500'
                            : isCurrent
                            ? 'bg-primary border-primary'
                            : 'bg-muted border-border'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        ) : (
                          <Icon
                            className={`h-6 w-6 ${
                              isCurrent ? 'text-white' : 'text-muted-foreground'
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`text-xs mt-2 font-medium ${
                          isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-4 transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <Card className="shadow-xl">
            <CardContent className="p-8 min-h-[400px] flex flex-col">
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <Rocket className="h-10 w-10 text-white" />
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold">
                      Welcome to LangSync, {userName}!
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                      Let's get you set up in just <strong>3 minutes</strong>. We'll create your first project
                      and show you how to integrate LangSync into your app.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 w-full max-w-2xl pt-6">
                    <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900">
                      <div className="text-3xl font-bold gradient-text">1 min</div>
                      <p className="text-sm text-muted-foreground mt-1">Create project</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                      <div className="text-3xl font-bold gradient-text">2 min</div>
                      <p className="text-sm text-muted-foreground mt-1">Install SDK</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <div className="text-3xl font-bold gradient-text">Done!</div>
                      <p className="text-sm text-muted-foreground mt-1">Start shipping</p>
                    </div>
                  </div>

                  <Button onClick={handleNext} size="lg" className="mt-8">
                    Let's Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Step 2: Create Project */}
              {currentStep === 2 && (
                <div className="flex-1 flex flex-col space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Create Your First Project</h2>
                    <p className="text-muted-foreground">
                      Projects help you organize translations for different apps or services.
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-6 max-w-xl">
                    <div className="space-y-3">
                      <Label htmlFor="projectName" className="text-base">
                        Project Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="projectName"
                        type="text"
                        placeholder="My Awesome App"
                        value={projectName}
                        onChange={(e) => {
                          setProjectName(e.target.value);
                          setError('');
                        }}
                        disabled={createProject.isPending}
                        className="h-12 text-base"
                        autoFocus
                      />
                      <p className="text-sm text-muted-foreground">
                        Choose a name that helps you identify this project later.
                      </p>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="pt-4">
                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertDescription>
                          Your project will start with English as the default language. You can add more
                          languages anytime from your project settings.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Install SDK */}
              {currentStep === 3 && (
                <div className="flex-1 flex flex-col space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Install LangSync SDK</h2>
                    <p className="text-muted-foreground">
                      Choose your framework and copy the integration code.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={selectedFramework === 'nextjs' ? 'default' : 'outline'}
                      onClick={() => setSelectedFramework('nextjs')}
                    >
                      Next.js
                    </Button>
                    <Button
                      variant={selectedFramework === 'expo' ? 'default' : 'outline'}
                      onClick={() => setSelectedFramework('expo')}
                    >
                      Expo / React Native
                    </Button>
                    <Button
                      variant={selectedFramework === 'react' ? 'default' : 'outline'}
                      onClick={() => setSelectedFramework('react')}
                    >
                      React / Other
                    </Button>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-slate-950 text-slate-50 overflow-x-auto text-sm">
                      <code>{getInstallCode()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-4 right-4"
                      onClick={copyCode}
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <Alert>
                    <Code2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Next steps:</strong> After installation, you can add translation keys in your
                      project dashboard and they'll be available in your app without redeploying!
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" asChild>
                      <Link href="/docs" target="_blank">
                        View Full Documentation
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/projects/${projectId}`}>
                        Open Project Dashboard
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Complete */}
              {currentStep === 4 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <PartyPopper className="h-12 w-12 text-white" />
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold">You're All Set!</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                      Congratulations! Your first project is ready. Start adding translation keys and shipping
                      multilingual apps faster than ever.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl pt-6">
                    <Card className="p-6 text-left hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="font-semibold mb-2">Add Translation Keys</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create keys for your app's text content
                      </p>
                      <Button asChild className="w-full">
                        <Link href={`/dashboard/projects/${projectId}`}>Go to Project</Link>
                      </Button>
                    </Card>

                    <Card className="p-6 text-left hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="font-semibold mb-2">Read Documentation</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Learn about all features and best practices
                      </p>
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/docs" target="_blank">View Docs</Link>
                      </Button>
                    </Card>
                  </div>

                  <Button onClick={() => router.push('/dashboard')} size="lg" className="mt-8">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep !== 1 && currentStep !== 4 && (
                <div className="flex justify-between pt-8 border-t mt-8">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={createProject.isPending || currentStep === 1}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button onClick={handleNext} disabled={createProject.isPending || (!projectName && currentStep === 2)}>
                    {createProject.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating project...
                      </>
                    ) : (
                      <>
                        {currentStep === 3 ? 'Finish' : 'Continue'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Need help? Check out our{' '}
            <Link href="/docs" className="text-primary hover:underline">
              documentation
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="text-primary hover:underline">
              contact support
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

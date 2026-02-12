import { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Question,
  ClipboardText,
  Clipboard,
  Target,
  TrendUp,
  Warning,
  Lightbulb,
  Code,
  ListChecks,
  User,
} from '@phosphor-icons/react';
import { Progress } from '@/components/ui/progress';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { studentsApi } from '@/lib/api';
import type { ApiStudentProgress } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentProgress() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const studentId = isStudent ? (user?.id ?? user?.studentId) : undefined;
  const [progress, setProgress] = useState<ApiStudentProgress | null>(null);
  const [loading, setLoading] = useState(!!studentId);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    studentsApi
      .getProgress(studentId)
      .then(({ progress: p }) => setProgress(p))
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (isStudent && !studentId) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>My Progress</h1>
        <p className="text-muted-foreground mt-2">
          No progress record is linked to your account. Please contact support.
        </p>
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
          <GraduationCap className="h-6 w-6 text-primary" />
          Progress
        </h1>
        <p className="text-muted-foreground mt-2">
          Sign in as a student to view your progress, or open a student detail from the Students page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-12">
          <BallBouncingLoader />
        </div>
      </div>
    );
  }

  const questionsSolved = progress?.questionsSolved ?? 0;
  const totalAttempts = progress?.totalAttempts ?? 0;
  const questionsPct = totalAttempts > 0 ? (questionsSolved / totalAttempts) * 100 : 0;
  const tests = progress?.tests;
  const recentResults = progress?.recentResults ?? [];
  const categoryStats = progress?.categoryStats ?? [];
  const swot = progress?.swot;

  return (
    <div className="page-container space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
          <GraduationCap className="h-6 w-6 text-primary" />
          My Progress
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Your practice stats, test results, and SWOT analysis
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="neo-card p-6 flex items-center gap-4 hover:border-primary/30 transition-colors">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Question className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Coding solved</p>
            <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              {questionsSolved} <span className="text-sm text-muted-foreground font-sans font-normal">/ {totalAttempts || '—'}</span>
            </p>
          </div>
        </div>
        <div className="neo-card p-6 flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <ClipboardText className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tests completed</p>
            <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              {tests?.completed ?? 0} <span className="text-sm text-muted-foreground font-sans font-normal">/ {tests?.attempted ?? 0}</span>
            </p>
          </div>
        </div>
        <div className="neo-card p-6 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <Code className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Coding tests</p>
            <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              {tests?.codingTestsCompleted ?? 0} <span className="text-sm text-muted-foreground font-sans font-normal">/ {tests?.codingTestsAttempted ?? 0}</span>
            </p>
          </div>
        </div>
        <div className="neo-card p-6 flex items-center gap-4 hover:border-violet-500/30 transition-colors">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <ListChecks className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">MCQ tests</p>
            <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              {tests?.mcqTestsCompleted ?? 0} <span className="text-sm text-muted-foreground font-sans font-normal">/ {tests?.mcqTestsAttempted ?? 0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Coding progress bar */}
      <div className="neo-card p-0 overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <BookOpen className="h-5 w-5 text-primary" />
            Coding practice
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Solve rate from your coding submissions</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Solved</span>
              <span className="font-medium">{questionsPct.toFixed(0)}%</span>
            </div>
            <Progress value={questionsPct} className="h-2 bg-muted" indicatorClassName="bg-primary" />
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryStats.length > 0 && (
        <div className="neo-card p-0 overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <Target className="h-5 w-5 text-primary" />
              Performance by category
            </h3>
            <p className="text-sm text-muted-foreground mt-1">How you perform per question category</p>
          </div>
          <div className="p-6 space-y-6">
            {categoryStats.map((cat) => (
              <div key={cat.categoryId ?? cat.categoryName}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{cat.categoryName}</span>
                  <span className="text-muted-foreground">
                    {cat.solved} / {cat.total} ({cat.percentage}%)
                  </span>
                </div>
                <Progress value={cat.percentage} className="h-2 bg-muted" indicatorClassName="bg-primary" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent test results */}
      {recentResults.length > 0 && (
        <div className="neo-card p-0 overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <Clipboard className="h-5 w-5 text-primary" />
              Recent test results
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Your latest completed tests</p>
          </div>
          <div className="p-0">
            <ul className="divide-y divide-border/50">
              {recentResults.map((r, i) => (
                <li
                  key={r.testId + '-' + (r.attemptedAt ?? i)}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-base">{r.testName}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {r.testType} · {r.attemptedAt ? new Date(r.attemptedAt).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                      {r.totalMarks != null && r.maxMarks != null && r.maxMarks > 0
                        ? `${r.totalMarks} / ${r.maxMarks}`
                        : '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* SWOT analysis */}
      {swot && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="neo-card p-6 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
              <TrendUp className="h-5 w-5" />
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Strengths</h3>
            </div>
            <ul className="space-y-2">
              {swot.strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span>
                  {s}
                </li>
              ))}
              {swot.strengths.length === 0 && <li className="text-sm text-muted-foreground italic">Not enough data</li>}
            </ul>
          </div>
          <div className="neo-card p-6 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-4 text-amber-600 dark:text-amber-400">
              <Warning className="h-5 w-5" />
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Weaknesses</h3>
            </div>
            <ul className="space-y-2">
              {swot.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  {w}
                </li>
              ))}
              {swot.weaknesses.length === 0 && <li className="text-sm text-muted-foreground italic">Not enough data</li>}
            </ul>
          </div>
          <div className="neo-card p-6 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
              <Lightbulb className="h-5 w-5" />
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Opportunities</h3>
            </div>
            <ul className="space-y-2">
              {swot.opportunities.map((o, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {o}
                </li>
              ))}
              {swot.opportunities.length === 0 && <li className="text-sm text-muted-foreground italic">Not enough data</li>}
            </ul>
          </div>
          <div className="neo-card p-6 border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-400">
              <Warning className="h-5 w-5" />
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Threats</h3>
            </div>
            <ul className="space-y-2">
              {swot.threats.map((t, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-rose-500 mt-1">•</span>
                  {t}
                </li>
              ))}
              {swot.threats.length === 0 && <li className="text-sm text-muted-foreground italic">Not enough data</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="neo-card p-0 overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <User className="h-5 w-5 text-primary" />
            Your profile
          </h3>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</p>
              <p className="font-medium text-base">{user?.name}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="font-medium text-base">{user?.email}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</p>
              <p className="font-medium text-base capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

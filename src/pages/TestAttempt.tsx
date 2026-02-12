import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { testAttemptsApi, testsApi, programmingLanguagesApi } from '@/lib/api';
import type { McqQuestionForAttempt, CodingProblemForAttempt } from '@/lib/api';
import {
  Clock,
  Warning as AlertTriangle,
  Monitor,
  FileCode,
  CheckCircle as CheckCircle2,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  XCircle
} from '@phosphor-icons/react';

export default function TestAttempt() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const attemptIdFromState = (location.state as { attemptId?: number })?.attemptId;

  const [attemptId, setAttemptId] = useState<number | null>(attemptIdFromState ?? null);
  const [testType, setTestType] = useState<'MCQ' | 'CODING' | null>(null);
  const [questions, setQuestions] = useState<McqQuestionForAttempt[]>([]);
  const [problems, setProblems] = useState<CodingProblemForAttempt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number[]>>({});
  const [codingCode, setCodingCode] = useState<Record<number, string>>({});
  const [codingLanguageId, setCodingLanguageId] = useState<number | null>(null);
  const [languages, setLanguages] = useState<{ id: number; language: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [lastCodingResult, setLastCodingResult] = useState<boolean | null>(null);
  const [maxNavigations, setMaxNavigations] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [attemptStartTime, setAttemptStartTime] = useState<string | null>(null);
  const navCountRef = useRef(0);
  const [navWarningOpen, setNavWarningOpen] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const timeUpSubmittedRef = useRef(false);
  const [violationOverlay, setViolationOverlay] = useState<'tab' | 'devtools' | 'context_menu' | null>(null);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);

  // Record malpractice: tab/window switch (Page Visibility covers tab switch, Alt+Tab, dual screen)
  useEffect(() => {
    if (attemptId == null) return;
    const record = (type: string) => {
      testAttemptsApi.recordMalpractice(attemptId!, type).catch(() => { });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        record('tab_switch'); // Fires on tab switch, window switch (Alt+Tab), or focus to another screen
        navCountRef.current += 1;
        const count = navCountRef.current;
        // Warning on every tab movement
        toast({
          title: 'Tab switch recorded',
          description: `You have left the test tab (${count} time${count === 1 ? '' : 's'}). Allowed limit: ${maxNavigations}. Exceeding the limit will end your test and flag your attempt.`,
          variant: 'destructive',
        });
        if (count > maxNavigations) {
          record('tab_limit_exceeded');
          toast({
            title: 'Test ended',
            description: 'You exceeded the allowed tab switches. Your attempt has been flagged and you have been logged out.',
            variant: 'destructive',
          });
          (async () => {
            await logout();
            navigate('/login', { replace: true });
          })();
        } else {
          setNavWarningOpen(true);
        }
        setViolationOverlay('tab');
      }
    };
    const onContextMenu = (e: Event) => {
      e.preventDefault();
      record('context_menu');
      setViolationOverlay('context_menu');
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [attemptId, maxNavigations, toast, logout, navigate]);

  // DevTools detection: counts as 1/3 navigation + malpractice; Method 1 (console) + Method 2 (resize)
  useEffect(() => {
    if (attemptId == null) return;
    const record = (type: string) => {
      testAttemptsApi.recordMalpractice(attemptId!, type).catch(() => { });
    };
    let devtoolsRecordedAt = 0;
    const DEVTOOLS_THROTTLE_MS = 5000;
    const recordDevTools = () => {
      if (Date.now() - devtoolsRecordedAt < DEVTOOLS_THROTTLE_MS) return;
      devtoolsRecordedAt = Date.now();
      record('console');
      navCountRef.current += 1;
      const count = navCountRef.current;
      toast({
        title: 'DevTools detected',
        description: `Opening console/DevTools counts as a navigation (${count}/${maxNavigations}). Close DevTools and click Continue. Exceeding the limit will end your test.`,
        variant: 'destructive',
      });
      if (count > maxNavigations) {
        record('tab_limit_exceeded');
        toast({
          title: 'Test ended',
          description: 'You exceeded the allowed limit (tab/console switches). Your attempt has been flagged and you have been logged out.',
          variant: 'destructive',
        });
        (async () => {
          await logout();
          navigate('/login', { replace: true });
        })();
      } else {
        setNavWarningOpen(true);
        setViolationOverlay('devtools');
      }
    };
    // Method 1: console.log('%c', obj) - when DevTools console is open, obj.toString() is called
    const devtoolsObj = {
      toString() {
        recordDevTools();
        return ' ';
      },
    };
    const intervalId = setInterval(() => {
      console.log('%c', devtoolsObj);
    }, 2000);
    // Method 2: docked DevTools change window dimensions
    const onResize = () => {
      const h = (window.outerHeight - window.innerHeight) > 100;
      const w = (window.outerWidth - window.innerWidth) > 100;
      if (h || w) recordDevTools();
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', onResize);
    };
  }, [attemptId, toast, maxNavigations, logout, navigate]);

  // Fullscreen: ensure full screen before starting; when user exits, show overlay with re-enter button
  const hasContent = (testType === 'MCQ' && questions.length > 0) || (testType === 'CODING' && problems.length > 0);
  useEffect(() => {
    if (!attemptId || !hasContent) return;
    const el = document.documentElement;
    if (!document.fullscreenElement) setShowFullscreenOverlay(true);
    const requestFs = () => {
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => setShowFullscreenOverlay(true));
    };
    requestFs();
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        setShowFullscreenOverlay(false);
      } else {
        setShowFullscreenOverlay(true);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [attemptId, hasContent]);

  // Countdown timer from attemptStartTime + durationMinutes
  useEffect(() => {
    if (timeUp || attemptStartTime == null || durationMinutes <= 0) return;
    const durationSec = durationMinutes * 60;
    const update = () => {
      const start = new Date(attemptStartTime).getTime();
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, Math.floor(durationSec - elapsed));
      setTimeRemainingSeconds(remaining);
      if (remaining <= 0) setTimeUp(true);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [attemptStartTime, durationMinutes, timeUp]);

  // Auto-submit when time is up
  useEffect(() => {
    if (!timeUp || timeUpSubmittedRef.current || !attemptId) return;
    timeUpSubmittedRef.current = true;
    const submit = async () => {
      try {
        if (testType === 'MCQ') {
          await testAttemptsApi.submit(attemptId!, { answers: mcqAnswers });
        } else {
          const langId = codingLanguageId ?? languages[0]?.id ?? 0;
          const solutions = problems.map((p) => ({
            problemId: p.problemId,
            languageId: langId,
            code: codingCode[p.problemId] ?? '',
          }));
          await testAttemptsApi.submit(attemptId!, { solutions });
        }
        toast({ title: 'Time\'s up — test submitted automatically' });
        navigate('/tests', { state: { justSubmitted: true } });
      } catch (e) {
        toast({ title: e instanceof Error ? e.message : 'Submit failed', variant: 'destructive' });
      }
    };
    submit();
  }, [timeUp, attemptId, testType, mcqAnswers, codingCode, codingLanguageId, languages, problems, navigate, toast]);

  useEffect(() => {
    if (!testId) return;
    const load = async () => {
      try {
        let aid = attemptIdFromState ?? null;
        if (!aid) {
          const cur = await testsApi.getCurrentAttempt(testId);
          if (cur.attempt) aid = cur.attempt.id;
          else {
            const start = await testsApi.startAttempt(testId);
            aid = start.attemptId;
          }
        }
        if (!aid) throw new Error('Could not start attempt');
        setAttemptId(aid);
        const [qRes, langRes] = await Promise.all([
          testAttemptsApi.getQuestions(aid),
          programmingLanguagesApi.list(),
        ]);
        setLanguages(langRes.languages);
        setMaxNavigations(qRes.maxNavigations ?? 3);
        setDurationMinutes(qRes.durationMinutes ?? 60);
        setAttemptStartTime(qRes.attemptStartTime ?? null);
        if (qRes.testType === 'MCQ') {
          setTestType('MCQ');
          setQuestions(qRes.questions);
        } else {
          setTestType('CODING');
          setProblems(qRes.problems);
          if (qRes.problems.length && langRes.languages.length) {
            setCodingLanguageId(langRes.languages[0].id);
          }
        }
      } catch (e) {
        toast({ title: e instanceof Error ? e.message : 'Failed to load', variant: 'destructive' });
        navigate('/tests');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId, attemptIdFromState, navigate, toast]);

  const totalCount = testType === 'MCQ' ? questions.length : problems.length;
  const isLast = totalCount > 0 && currentIndex === totalCount - 1;

  const handleMcqToggle = (questionId: number, optionId: number, multiple: boolean) => {
    setMcqAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (multiple) {
        const next = current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmitFinal = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      if (testType === 'MCQ') {
        await testAttemptsApi.submit(attemptId, { answers: mcqAnswers });
      } else {
        const langId = codingLanguageId ?? languages[0]?.id ?? 0;
        const solutions = problems.map((p) => ({
          problemId: p.problemId,
          languageId: langId,
          code: codingCode[p.problemId] ?? '',
        }));
        await testAttemptsApi.submit(attemptId, { solutions });
      }
      setSubmitModalOpen(false);
      toast({ title: 'Test submitted' });
      navigate('/tests', { state: { justSubmitted: true } });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Submit failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextOrSubmitCoding = async () => {
    if (testType !== 'CODING' || !attemptId || problems.length === 0) return;
    const problem = problems[currentIndex];
    const code = codingCode[problem.problemId] ?? '';
    const langId = codingLanguageId ?? languages[0]?.id;
    if (langId == null) return;
    try {
      const r = await testAttemptsApi.submitCoding(attemptId, {
        problemId: problem.problemId,
        languageId: langId,
        code,
      });
      setLastCodingResult(r.success);
      if (isLast) {
        setSubmitModalOpen(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Submit failed', variant: 'destructive' });
    }
  };

  if (loading || !attemptId) return (
    <div className="flex items-center justify-center h-screen bg-background text-muted-foreground animate-pulse">
      Loading exam environment...
    </div>
  );
  if (totalCount === 0) return (
    <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
      No questions in this test.
    </div>
  );

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const timerBar = (
    <div className="shrink-0 border-b bg-background px-4 py-3 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-2">
        {testType === 'CODING' ? <FileCode className="h-5 w-5 text-primary" /> : <Monitor className="h-5 w-5 text-primary" />}
        <span className="font-semibold tracking-tight">CodePro Flow Exam</span>
      </div>
      {timeUp ? (
        <span className="font-semibold text-destructive flex items-center gap-2">
          <Clock className="h-4 w-4" /> Time's up
        </span>
      ) : timeRemainingSeconds !== null ? (
        <span className={`font-mono font-medium flex items-center gap-2 ${timeRemainingSeconds < 300 ? 'text-amber-600 animate-pulse' : 'text-foreground'}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeRemainingSeconds)}
        </span>
      ) : null}
      <Button variant="outline" size="sm" onClick={() => setSubmitModalOpen(true)} disabled={timeUp} className="border-border">
        Submit Test
      </Button>
    </div>
  );

  const navWarningDialog = (
    <Dialog open={navWarningOpen} onOpenChange={setNavWarningOpen}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Warning: Navigation Detected
          </DialogTitle>
          <DialogDescription>
            You have exceeded the allowed number of tab or window switches. This has been recorded. Please stay on this page to continue the test.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setNavWarningOpen(false)}>I Understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const violationOverlayContent = violationOverlay && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="neo-card max-w-md w-full border-destructive/50 shadow-2xl bg-card">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Action Required</h3>
          </div>
          {violationOverlay === 'tab' && (
            <p className="text-sm text-foreground">
              You left the test window (new tab, another window, or another screen). Return to this tab and click Continue below to proceed with the exam.
            </p>
          )}
          {violationOverlay === 'devtools' && (
            <p className="text-sm text-foreground">
              Developer tools were detected. Close DevTools (F12 or right‑click → Inspect) completely, then click Continue to proceed with the exam.
            </p>
          )}
          {violationOverlay === 'context_menu' && (
            <p className="text-sm text-foreground">
              Right‑click is not allowed during the test. Click Continue to proceed with the exam.
            </p>
          )}
          <Button className="w-full" onClick={() => setViolationOverlay(null)} variant="destructive">
            Continue Exam
          </Button>
        </div>
      </div>
    </div>
  );

  const fullscreenOverlayContent = showFullscreenOverlay && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="neo-card max-w-md w-full shadow-2xl bg-card">
        <div className="p-6 space-y-4 text-center">
          <Monitor className="h-10 w-10 text-primary mx-auto" />
          <h3 className="text-lg font-semibold">Full Screen Required</h3>
          <p className="text-sm text-muted-foreground">
            You must be in full screen to start and continue the exam. This ensures a focused testing environment.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              document.documentElement.requestFullscreen?.().then(() => setShowFullscreenOverlay(false)).catch(() => { });
            }}
          >
            Enter Full Screen
          </Button>
        </div>
      </div>
    </div>
  );

  // LeetCode-style layout: question left, editor right (coding only)
  if (testType === 'CODING' && problems[currentIndex]) {
    const problem = problems[currentIndex];
    return (
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        {violationOverlayContent}
        {fullscreenOverlayContent}
        {timerBar}

        <div className="flex flex-col lg:flex-row min-h-0 flex-1">
          {/* Left: Question */}
          <aside className="flex w-full lg:w-[40%] lg:min-w-[300px] flex-col border-b lg:border-b-0 lg:border-r bg-card/50">
            <div className="shrink-0 border-b px-4 py-3 flex justify-between items-center bg-background">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Problem {currentIndex + 1} of {totalCount}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-border">
              <h1 className="text-xl font-medium tracking-tight mb-4" style={{ fontFamily: 'var(--font-serif)' }}>{problem.title}</h1>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed font-normal">
                  {problem.description ?? 'No description provided.'}
                </p>
              </div>
            </div>
            <div className="shrink-0 border-t bg-background px-4 py-3 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0 || timeUp}
                onClick={() => setCurrentIndex((i) => i - 1)}
                className="gap-1 border-border"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isLast || timeUp}
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="gap-1 border-border"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </aside>

          {/* Right: Editor */}
          <main className="flex flex-1 min-w-0 flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Code Editor</span>
              </div>
              <Select
                value={codingLanguageId != null ? String(codingLanguageId) : ''}
                onValueChange={(v) => setCodingLanguageId(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[140px] h-8 bg-background">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.language}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 relative">
              <CodeEditor
                value={codingCode[problem.problemId] ?? ''}
                onChange={(v) =>
                  setCodingCode((prev) => ({ ...prev, [problem.problemId]: v }))
                }
              />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-background px-4 py-3 z-10">
              <div className="flex items-center gap-2">
                {lastCodingResult !== null && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${lastCodingResult ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                    {lastCodingResult ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {lastCodingResult ? 'Verified' : 'Failed Tests'}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={handleNextOrSubmitCoding} disabled={timeUp} className="min-w-[100px]">
                {isLast ? 'Submit Test' : 'Run & Next'}
              </Button>
            </div>
          </main>
        </div>

        {navWarningDialog}
        <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
          <DialogContent className="neo-card-flat">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>Submit Test?</DialogTitle>
              <DialogDescription>
                You are about to submit your test. This action cannot be undone.
                <br />
                <span className="mt-2 block text-xs text-muted-foreground">Make sure you have answered all questions to the best of your ability.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSubmitModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitFinal} disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm Submit'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // MCQ Layout
  return (
    <div className="flex flex-col min-h-screen bg-muted/10 relative">
      {violationOverlayContent}
      {fullscreenOverlayContent}
      {timerBar}

      <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Question {currentIndex + 1} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: totalCount }).map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full ${i === currentIndex ? 'bg-primary' : i < currentIndex ? 'bg-primary/30' : 'bg-border'}`} />
              ))}
            </div>
          </div>
        </div>

        {testType === 'MCQ' && questions[currentIndex] && (
          <div className="neo-card p-0 overflow-hidden bg-card shadow-sm mb-6">
            <div className="border-b bg-muted/10 px-8 py-6">
              <h2 className="text-xl font-medium leading-normal tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{questions[currentIndex].question}</h2>
            </div>
            <div className="p-8 space-y-4">
              {(questions[currentIndex].questionType === 'SINGLE_CHOICE' ? (
                questions[currentIndex].options.map((opt) => {
                  const isChecked = (mcqAnswers[questions[currentIndex].mcqQuestionId] ?? []).includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-4 cursor-pointer border rounded-lg p-4 transition-all hover:border-primary/50 hover:bg-muted/30 ${isChecked ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {isChecked && <div className="w-2 h-2 rounded-full bg-background" />}
                      </div>
                      <input
                        type="radio"
                        className="hidden"
                        name={`q-${questions[currentIndex].mcqQuestionId}`}
                        checked={isChecked}
                        onChange={() => handleMcqToggle(questions[currentIndex].mcqQuestionId, opt.id, false)}
                      />
                      <span className="text-base font-normal">{opt.optionText}</span>
                    </label>
                  );
                })
              ) : (
                questions[currentIndex].options.map((opt) => {
                  const isChecked = (mcqAnswers[questions[currentIndex].mcqQuestionId] ?? []).includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-4 cursor-pointer border rounded-lg p-4 transition-all hover:border-primary/50 hover:bg-muted/30 ${isChecked ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'}`}
                    >
                      <div className={`w-5 h-5 rounded sm border shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'border-primary bg-primary text-background' : 'border-muted-foreground'}`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={() => handleMcqToggle(questions[currentIndex].mcqQuestionId, opt.id, true)}
                      />
                      <span className="text-base font-normal">{opt.optionText}</span>
                    </label>
                  );
                })
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-auto pt-6">
          <Button
            variant="outline"
            disabled={currentIndex === 0 || timeUp}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="w-32"
          >
            Previous
          </Button>
          {testType === 'MCQ' && (
            !isLast ? (
              <Button onClick={() => setCurrentIndex((i) => i + 1)} disabled={timeUp} className="w-32">
                Next
              </Button>
            ) : (
              <Button onClick={() => setSubmitModalOpen(true)} disabled={timeUp} className="w-32">
                Finish
              </Button>
            )
          )}
        </div>

        {navWarningDialog}
        <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
          <DialogContent className="neo-card-flat">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>Submit Test?</DialogTitle>
              <DialogDescription>
                You are about to submit your test. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitFinal} disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm Submit'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CodeEditor({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [Editor, setEditor] = useState<React.ComponentType<{ height: string; value: string; onChange: (v: string) => void; language: string; className?: string }> | null>(null);
  useEffect(() => {
    import('@monaco-editor/react').then((mod) => setEditor(() => mod.default));
  }, []);
  const containerClass = className ?? '';
  if (!Editor) {
    return (
      <textarea
        className={`w-full h-full min-h-[400px] font-mono border-0 p-4 text-sm focus:outline-none resize-none bg-background text-foreground ${containerClass}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    );
  }
  return (
    <div className={`h-full w-full absolute inset-0 ${containerClass}`}>
      <Editor
        height="100%"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        language="javascript"
        className="h-full w-full"
      />
    </div>
  );
}

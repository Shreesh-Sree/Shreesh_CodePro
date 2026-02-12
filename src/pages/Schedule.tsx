import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { batchesApi, departmentsApi, placementsApi, tagsApi, categoriesApi, problemsApi, mcqQuestionsApi, scheduleApi, testsApi } from '@/lib/api';
import type { ApiCategory, ApiTestDetail } from '@/lib/api';
import {
  CaretDown as ChevronDown,
  X,
  Monitor,
  ListChecks,
  CalendarBlank as Calendar,
  Users,
  FileText as FileQuestion,
  Clock
} from '@phosphor-icons/react';

type TestType = 'CODING' | 'MCQ';
type TargetType = 'placement' | 'batch' | 'department';
interface Target {
  type: TargetType;
  id: number;
  label: string;
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

export default function Schedule() {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const editMode = Boolean(testId);
  const [editTest, setEditTest] = useState<ApiTestDetail | null>(null);
  const [editLoading, setEditLoading] = useState(editMode);
  const editQuestionsSeeded = useRef(false);
  const editTargetsSeeded = useRef(false);
  const [step, setStep] = useState(1);
  const [testType, setTestType] = useState<TestType | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [placements, setPlacements] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: number; batchYear: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [problems, setProblems] = useState<{ id: number; title: string; tagIds?: number[]; categoryId?: number | null }[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<{ id: number; question: string; tagIds?: number[]; categoryId?: number | null }[]>([]);
  const [questionsDropdownOpen, setQuestionsDropdownOpen] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number | 'uncategorized'>>(new Set());
  const [usedProblemIds, setUsedProblemIds] = useState<number[]>([]);
  const [usedMcqIds, setUsedMcqIds] = useState<number[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<{ id: number; title: string; tagIds?: number[] }[]>([]);
  const [selectedMcqQuestions, setSelectedMcqQuestions] = useState<{ id: number; question: string; tagIds?: number[] }[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [targetPopoverOpen, setTargetPopoverOpen] = useState(false);

  useEffect(() => {
    if (!testId) return;
    testsApi
      .getById(testId)
      .then(({ test }) => {
        setEditTest(test);
        setName(test.name);
        setStartTime(toDateTimeLocal(test.startTime));
        setEndTime(toDateTimeLocal(test.endTime));
        setDurationMinutes(typeof test.durationMinutes === 'number' ? test.durationMinutes : 60);
        setTestType((test.testType as TestType) || 'CODING');
      })
      .catch(() => toast({ title: 'Failed to load test', variant: 'destructive' }))
      .finally(() => setEditLoading(false));
  }, [testId, toast]);

  useEffect(() => {
    Promise.all([
      placementsApi.list(),
      batchesApi.list(),
      departmentsApi.list(),
      tagsApi.list(),
    ])
      .then(([pRes, bRes, dRes, tRes]) => {
        let pl = pRes.placements;
        let ba = bRes.batches;
        let de = dRes.departments;
        if (user?.role === 'DEPARTMENT' && user?.departmentId) {
          de = de.filter((d) => String(d.id) === String(user.departmentId));
          pl = [];
          ba = [];
        } else if ((user?.role === 'HOPE' || user?.role === 'PEP') && user?.placementId) {
          pl = pl.filter((p) => String(p.id) === String(user.placementId));
          de = [];
          ba = [];
        }
        setPlacements(pl);
        setBatches(ba);
        setDepartments(de);
        setTags(tRes.tags);
      })
      .catch(() => toast({ title: 'Failed to load options', variant: 'destructive' }));
  }, [toast, user?.role, user?.departmentId, user?.placementId]);

  useEffect(() => {
    if (!editTest || editTargetsSeeded.current) return;
    const next: Target[] = [];
    (editTest.batchIds ?? []).forEach((id) => {
      const b = batches.find((x) => x.id === id);
      next.push({ type: 'batch', id, label: b?.batchYear ?? String(id) });
    });
    (editTest.departmentIds ?? []).forEach((id) => {
      const d = departments.find((x) => String(x.id) === String(id));
      next.push({ type: 'department', id, label: d?.name ?? String(id) });
    });
    (editTest.placementIds ?? []).forEach((id) => {
      const p = placements.find((x) => String(x.id) === String(id));
      next.push({ type: 'placement', id, label: p?.name ?? String(id) });
    });
    if (next.length > 0) {
      setTargets(next);
      editTargetsSeeded.current = true;
    }
  }, [editTest, batches, departments, placements]);

  useEffect(() => {
    if (!editMode || !editTest || step < 3 || !testType) return;
    if (testType === 'CODING' && problems.length > 0 && (editTest.problemIds?.length ?? 0) > 0 && !editQuestionsSeeded.current) {
      editQuestionsSeeded.current = true;
      setSelectedProblems(problems.filter((p) => editTest.problemIds!.includes(p.id)));
    }
    if (testType === 'MCQ' && mcqQuestions.length > 0 && (editTest.mcqQuestionIds?.length ?? 0) > 0 && !editQuestionsSeeded.current) {
      editQuestionsSeeded.current = true;
      setSelectedMcqQuestions(mcqQuestions.filter((q) => editTest.mcqQuestionIds!.includes(q.id)));
    }
  }, [editMode, editTest, step, testType, problems, mcqQuestions]);

  const batchIds = targets.filter((t) => t.type === 'batch').map((t) => t.id);
  useEffect(() => {
    if (batchIds.length === 0) {
      setUsedProblemIds([]);
      setUsedMcqIds([]);
      return;
    }
    Promise.all([
      scheduleApi.usedProblemIds(batchIds),
      scheduleApi.usedMcqQuestionIds(batchIds),
    ])
      .then(([a, b]) => {
        setUsedProblemIds(a.problemIds);
        setUsedMcqIds(b.mcqQuestionIds);
      })
      .catch(() => {
        setUsedProblemIds([]);
        setUsedMcqIds([]);
      });
  }, [batchIds.join(',')]);

  useEffect(() => {
    if (step >= 3 && testType) {
      setQuestionsLoading(true);
      Promise.all([
        categoriesApi.list(),
        testType === 'CODING' ? problemsApi.list() : mcqQuestionsApi.list(),
      ])
        .then(([catRes, listRes]) => {
          setCategories(catRes.categories);
          if (testType === 'CODING') {
            setProblems('problems' in listRes ? listRes.problems : []);
            setMcqQuestions([]);
          } else {
            setMcqQuestions('questions' in listRes ? listRes.questions : []);
            setProblems([]);
          }
        })
        .catch(() => {
          setCategories([]);
          setProblems([]);
          setMcqQuestions([]);
        })
        .finally(() => setQuestionsLoading(false));
    }
  }, [step, testType]);

  const isTargetSelected = (type: TargetType, id: number) =>
    targets.some((t) => t.type === type && t.id === id);

  const toggleTarget = (type: TargetType, id: number, label: string) => {
    setTargets((prev) => {
      const exists = prev.some((t) => t.type === type && t.id === id);
      if (exists) return prev.filter((t) => !(t.type === type && t.id === id));
      return [...prev, { type, id, label }];
    });
  };

  const removeTarget = (type: TargetType, id: number) => {
    setTargets((prev) => prev.filter((t) => !(t.type === type && t.id === id)));
  };

  const addProblem = (p: { id: number; title: string; tagIds?: number[] }) => {
    if (usedProblemIds.includes(p.id)) return;
    setSelectedProblems((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
  };

  const removeProblem = (id: number) => {
    setSelectedProblems((prev) => prev.filter((x) => x.id !== id));
  };

  const addMcq = (q: { id: number; question: string; tagIds?: number[] }) => {
    if (usedMcqIds.includes(q.id)) return;
    setSelectedMcqQuestions((prev) => (prev.some((x) => x.id === q.id) ? prev : [...prev, q]));
  };

  const removeMcq = (id: number) => {
    setSelectedMcqQuestions((prev) => prev.filter((x) => x.id !== id));
  };

  const selectedProblemIds = selectedProblems.map((p) => p.id);
  const selectedMcqIds = selectedMcqQuestions.map((q) => q.id);
  const tagName = (id: number) => tags.find((t) => t.id === id)?.name ?? '';

  const toggleCategoryExpanded = (id: number | 'uncategorized') => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const isCategoryExpanded = (id: number | 'uncategorized') => expandedCategoryIds.has(id);

  const problemsByCategory = new Map<number | null, typeof problems>();
  problems.forEach((p) => {
    const cid = p.categoryId ?? null;
    if (!problemsByCategory.has(cid)) problemsByCategory.set(cid, []);
    problemsByCategory.get(cid)!.push(p);
  });
  const mcqByCategory = new Map<number | null, typeof mcqQuestions>();
  mcqQuestions.forEach((q) => {
    const cid = q.categoryId ?? null;
    if (!mcqByCategory.has(cid)) mcqByCategory.set(cid, []);
    mcqByCategory.get(cid)!.push(q);
  });

  const handleSubmit = async () => {
    if (!name.trim() || !startTime || !endTime) {
      toast({ title: 'Name and times are required', variant: 'destructive' });
      return;
    }
    const duration = Math.max(1, Math.min(600, durationMinutes));
    if (duration !== durationMinutes) setDurationMinutes(duration);
    if (!testType || targets.length === 0) {
      toast({ title: 'Select at least one target (placement, batch, or department)', variant: 'destructive' });
      return;
    }
    const batchIds = targets.filter((t) => t.type === 'batch').map((t) => t.id);
    const departmentIds = targets.filter((t) => t.type === 'department').map((t) => t.id);
    const placementIds = targets.filter((t) => t.type === 'placement').map((t) => t.id);
    setLoading(true);
    try {
      if (editMode && testId) {
        if (testType === 'CODING') {
          if (selectedProblemIds.length === 0) {
            toast({ title: 'Select at least one problem', variant: 'destructive' });
            setLoading(false);
            return;
          }
          await testsApi.update(testId, {
            name: name.trim(),
            startTime,
            endTime,
            durationMinutes: duration,
            batchIds,
            departmentIds,
            placementIds,
            problemIds: selectedProblemIds,
          });
        } else {
          if (selectedMcqIds.length === 0) {
            toast({ title: 'Select at least one MCQ question', variant: 'destructive' });
            setLoading(false);
            return;
          }
          await testsApi.update(testId, {
            name: name.trim(),
            startTime,
            endTime,
            durationMinutes: duration,
            batchIds,
            departmentIds,
            placementIds,
            mcqQuestionIds: selectedMcqIds,
          });
        }
        toast({ title: 'Test updated' });
        navigate('/results');
        return;
      }
      if (testType === 'CODING') {
        if (selectedProblemIds.length === 0) {
          toast({ title: 'Select at least one problem', variant: 'destructive' });
          setLoading(false);
          return;
        }
        await testsApi.create({
          name: name.trim(),
          testType: 'CODING',
          batchIds,
          departmentIds,
          placementIds,
          startTime,
          endTime,
          durationMinutes: duration,
          problemIds: selectedProblemIds,
        });
      } else {
        if (selectedMcqIds.length === 0) {
          toast({ title: 'Select at least one MCQ question', variant: 'destructive' });
          setLoading(false);
          return;
        }
        await testsApi.create({
          name: name.trim(),
          testType: 'MCQ',
          batchIds,
          departmentIds,
          placementIds,
          startTime,
          endTime,
          durationMinutes: duration,
          mcqQuestionIds: selectedMcqIds,
        });
      }
      toast({ title: 'Test scheduled' });
      navigate('/results');
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to schedule', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (editMode && editLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-12 text-muted-foreground animate-pulse">Loading test...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <Calendar className="h-6 w-6 text-primary" />
            {editMode ? 'Edit / Reschedule Test' : 'Schedule Test'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {editMode
              ? 'Update name, time, targets, or questions. Only allowed before the test starts.'
              : 'Create a coding or MCQ test and assign to placements, batches, or departments.'}
          </p>
        </div>
      </div>

      <div className="neo-card p-0 overflow-hidden mb-6">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 1: Test type</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose Coding or MCQ</p>
        </div>
        <div className="p-6">
          <div className="flex gap-4">
            <Button
              variant={testType === 'CODING' ? 'default' : 'outline'}
              onClick={() => !editMode && setTestType('CODING')}
              disabled={editMode}
              className={`h-auto py-4 px-6 flex-col gap-2 ${testType === 'CODING' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              <Monitor className="h-6 w-6" />
              <span className="font-medium">Coding</span>
            </Button>
            <Button
              variant={testType === 'MCQ' ? 'default' : 'outline'}
              onClick={() => !editMode && setTestType('MCQ')}
              disabled={editMode}
              className={`h-auto py-4 px-6 flex-col gap-2 ${testType === 'MCQ' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              <ListChecks className="h-6 w-6" />
              <span className="font-medium">MCQ</span>
            </Button>
            {testType && (
              <div className="flex items-center ml-auto">
                <Button onClick={() => setStep(2)}>Next Step</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {testType && (
        <div className={`neo-card p-0 overflow-hidden mb-6 transition-all duration-300 ${step < 2 ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 2: Assign To</h3>
            <p className="text-sm text-muted-foreground mt-1">Select one or more placements, batches, or departments.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label className="mb-2 block">Targets</Label>
              <Popover open={targetPopoverOpen} onOpenChange={setTargetPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-card">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Add placement, batch, or department...</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 neo-card-flat" align="start">
                  <div className="max-h-72 overflow-y-auto p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">Placements</p>
                    {placements.map((p) => (
                      <label
                        key={`p-${p.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isTargetSelected('placement', Number(p.id))}
                          onCheckedChange={() => toggleTarget('placement', Number(p.id), p.name)}
                        />
                        <span className="text-sm">{p.name}</span>
                      </label>
                    ))}
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2 uppercase tracking-wider">Batches</p>
                    {batches.map((b) => (
                      <label
                        key={`b-${b.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isTargetSelected('batch', b.id)}
                          onCheckedChange={() => toggleTarget('batch', b.id, b.batchYear)}
                        />
                        <span className="text-sm">{b.batchYear}</span>
                      </label>
                    ))}
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2 uppercase tracking-wider">Departments</p>
                    {departments.map((d) => (
                      <label
                        key={`d-${d.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isTargetSelected('department', Number(d.id))}
                          onCheckedChange={() => toggleTarget('department', Number(d.id), d.name)}
                        />
                        <span className="text-sm">{d.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {targets.map((t) => (
                <span
                  key={`${t.type}-${t.id}`}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-sm shadow-sm"
                >
                  <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground mr-1">{t.type}</span>
                  <span>{t.label}</span>
                  <button
                    type="button"
                    className="ml-1 rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => removeTarget(t.type, t.id)}
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {targets.length === 0 && <span className="text-sm text-muted-foreground italic">No targets selected</span>}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  if (targets.length > 0) setStep(3);
                  else toast({ title: 'Select at least one target', variant: 'destructive' });
                }}
                disabled={targets.length === 0}
              >
                Next Step
              </Button>
            </div>
          </div>
        </div>
      )}

      {testType && targets.length > 0 && (
        <div className={`neo-card p-0 overflow-hidden mb-6 transition-all duration-300 ${step < 3 ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 3: Select Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {testType === 'CODING'
                ? 'Pick a category, then add coding problems. Used in selected batches are excluded.'
                : 'Pick a category, then add MCQ questions. Used in selected batches are excluded.'}
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Selected Questions</Label>
              <div className="flex flex-wrap gap-2 min-h-[50px] rounded-lg border border-border/50 bg-muted/10 p-4">
                {testType === 'CODING'
                  ? selectedProblems.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background pl-2 pr-3 py-1 text-sm shadow-sm"
                    >
                      <button
                        type="button"
                        className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => removeProblem(p.id)}
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-medium truncate max-w-[200px]">{p.title}</span>
                    </span>
                  ))
                  : selectedMcqQuestions.map((q) => (
                    <span
                      key={q.id}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background pl-2 pr-3 py-1 text-sm shadow-sm max-w-full"
                    >
                      <button
                        type="button"
                        className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        onClick={() => removeMcq(q.id)}
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span className="truncate max-w-[200px]">{q.question}</span>
                    </span>
                  ))}
                {(testType === 'CODING' ? selectedProblems.length : selectedMcqQuestions.length) === 0 && (
                  <span className="text-sm text-muted-foreground flex items-center justify-center w-full h-full italic">None selected yet.</span>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Add Questions</Label>
              <Popover open={questionsDropdownOpen} onOpenChange={setQuestionsDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal bg-card"
                    disabled={questionsLoading}
                  >
                    <span className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4 text-muted-foreground" />
                      {questionsLoading
                        ? 'Loading...'
                        : testType === 'CODING'
                          ? `${selectedProblems.length} problem(s) selected`
                          : `${selectedMcqQuestions.length} question(s) selected`}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform opacity-50 ${questionsDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 neo-card-flat" align="start">
                  <div className="max-h-[320px] overflow-y-auto p-2">
                    {testType === 'CODING' &&
                      categories.map((cat) => {
                        const items = problemsByCategory.get(cat.id) ?? [];
                        if (items.length === 0) return null;
                        const expanded = isCategoryExpanded(cat.id);
                        return (
                          <div key={cat.id} className="mb-1">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              onClick={() => toggleCategoryExpanded(cat.id)}
                            >
                              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                              {cat.name}
                            </button>
                            {expanded && (
                              <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-muted pl-2">
                                {items.map((p) => {
                                  const checked = selectedProblemIds.includes(p.id);
                                  const used = usedProblemIds.includes(p.id);
                                  return (
                                    <li key={p.id}>
                                      <label
                                        className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors ${used ? 'cursor-not-allowed opacity-60' : ''
                                          }`}
                                      >
                                        <Checkbox
                                          checked={checked}
                                          disabled={used}
                                          onCheckedChange={() => (used ? undefined : checked ? removeProblem(p.id) : addProblem(p))}
                                        />
                                        <span className="flex-1 truncate">{p.title}</span>
                                        {used && <span className="text-xs text-muted-foreground">(used)</span>}
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    {/* ... (Repeat similar logic for MCQ and Uncategorized, omitting for brevity in thought but including in file) ... */}
                    {/* I will include the full logic in the actual file content below */}
                    {testType === 'MCQ' &&
                      categories.map((cat) => {
                        const items = mcqByCategory.get(cat.id) ?? [];
                        if (items.length === 0) return null;
                        const expanded = isCategoryExpanded(cat.id);
                        return (
                          <div key={cat.id} className="mb-1">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              onClick={() => toggleCategoryExpanded(cat.id)}
                            >
                              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                              {cat.name}
                            </button>
                            {expanded && (
                              <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-muted pl-2">
                                {items.map((q) => {
                                  const checked = selectedMcqIds.includes(q.id);
                                  const used = usedMcqIds.includes(q.id);
                                  return (
                                    <li key={q.id}>
                                      <label
                                        className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors ${used ? 'cursor-not-allowed opacity-60' : ''
                                          }`}
                                      >
                                        <Checkbox
                                          checked={checked}
                                          disabled={used}
                                          onCheckedChange={() => (used ? undefined : checked ? removeMcq(q.id) : addMcq(q))}
                                        />
                                        <span className="flex-1 truncate">{q.question}</span>
                                        {used && <span className="text-xs text-muted-foreground">(used)</span>}
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        );
                      })}

                    {/* Uncategorized Coding */}
                    {testType === 'CODING' && (problemsByCategory.get(null)?.length ?? 0) > 0 && (() => {
                      const expanded = isCategoryExpanded('uncategorized');
                      return (
                        <div className="mb-1">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => toggleCategoryExpanded('uncategorized')}
                          >
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            Uncategorized
                          </button>
                          {expanded && (
                            <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-muted pl-2">
                              {(problemsByCategory.get(null) ?? []).map((p) => {
                                const checked = selectedProblemIds.includes(p.id);
                                const used = usedProblemIds.includes(p.id);
                                return (
                                  <li key={p.id}>
                                    <label className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors ${used ? 'cursor-not-allowed opacity-60' : ''}`}>
                                      <Checkbox
                                        checked={checked}
                                        disabled={used}
                                        onCheckedChange={() => (used ? undefined : checked ? removeProblem(p.id) : addProblem(p))}
                                      />
                                      <span className="flex-1 truncate">{p.title}</span>
                                      {used && <span className="text-xs text-muted-foreground">(used)</span>}
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                    {/* Uncategorized MCQ */}
                    {testType === 'MCQ' && (mcqByCategory.get(null)?.length ?? 0) > 0 && (() => {
                      const expanded = isCategoryExpanded('uncategorized');
                      return (
                        <div className="mb-1">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => toggleCategoryExpanded('uncategorized')}
                          >
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            Uncategorized
                          </button>
                          {expanded && (
                            <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-muted pl-2">
                              {(mcqByCategory.get(null) ?? []).map((q) => {
                                const checked = selectedMcqIds.includes(q.id);
                                const used = usedMcqIds.includes(q.id);
                                return (
                                  <li key={q.id}>
                                    <label className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors ${used ? 'cursor-not-allowed opacity-60' : ''}`}>
                                      <Checkbox
                                        checked={checked}
                                        disabled={used}
                                        onCheckedChange={() => (used ? undefined : checked ? removeMcq(q.id) : addMcq(q))}
                                      />
                                      <span className="flex-1 truncate">{q.question}</span>
                                      {used && <span className="text-xs text-muted-foreground">(used)</span>}
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(4)}
                disabled={testType === 'CODING' ? selectedProblems.length === 0 : selectedMcqQuestions.length === 0}
              >
                Next Step
              </Button>
            </div>
          </div>
        </div>
      )}

      {testType && targets.length > 0 && (
        <div className={`neo-card p-0 overflow-hidden mb-6 transition-all duration-300 ${step < 4 ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 4: Finalize & Schedule</h3>
            <p className="text-sm text-muted-foreground mt-1">Set the test name, schedule, and duration.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Test Name</Label>
              <Input id="name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Week 1 Assessment" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
                <div className="relative mt-1">
                  <Input type="datetime-local" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pl-10" />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
                <div className="relative mt-1">
                  <Input type="datetime-local" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="pl-10" />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  id="duration"
                  min={1}
                  max={600}
                  className="pl-10"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Math.min(600, parseInt(e.target.value, 10) || 60)))}
                />
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Amount of time a student has to complete the test once started.
              </p>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmit} disabled={loading} size="lg">
                {loading ? (editMode ? 'Updating...' : 'Scheduling...') : editMode ? 'Update Test' : 'Schedule Test'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn, getTargetColor } from '../lib/utils';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { batchesApi, departmentsApi, placementsApi, tagsApi, categoriesApi, problemsApi, mcqQuestionsApi, scheduleApi, testsApi } from '@/lib/api';
import type { ApiCategory, ApiTestDetail } from '@/lib/api';
import {
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  CaretLeft as ChevronLeft,
  X,
  Monitor,
  ListChecks,
  CalendarBlank as Calendar,
  Users,
  FileText as FileQuestion,
  Clock,
  CheckCircle,
} from '@phosphor-icons/react';
import AdvancedPagination from '@/components/shared/AdvancedPagination';

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

// Sub-component for target selection with categorized list (Filtered)
const TargetSelector = ({
  placements,
  batches,
  departments,
  isTargetSelected,
  toggleTarget
}: {
  placements: { id: string; name: string }[],
  batches: { id: number; batchYear: string }[],
  departments: { id: string; name: string }[],
  isTargetSelected: (type: TargetType, id: number) => boolean,
  toggleTarget: (type: TargetType, id: number, label: string) => void
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | TargetType>('all');

  const renderGroup = (title: string, items: ({ id: string; name: string } | { id: number; batchYear: string })[], type: TargetType) => {
    if (items.length === 0) return null;
    if (activeFilter !== 'all' && activeFilter !== type) return null;

    return (
      <div className="mb-6 last:mb-0 animate-in fade-in duration-300">
        <h4 className="text-xs font-black text-primary/60 px-3 py-2 uppercase tracking-[0.2em] mb-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border/50">
          {title}
        </h4>
        <div className="grid grid-cols-1 gap-1 px-2">
          {items.map((item: any) => (
            <label
              key={`${type}-${item.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 cursor-pointer transition-all border border-transparent hover:border-primary/10 group"
            >
              <Checkbox
                checked={isTargetSelected(type, Number(item.id))}
                onCheckedChange={() => toggleTarget(type, Number(item.id), item.label || item.batchYear || item.name)}
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.label || item.batchYear || item.name}
                </span>
                <span className={cn("text-[10px] uppercase font-bold tracking-wider font-mono px-1.5 py-0.5 rounded-sm w-fit mt-1", getTargetColor(type))}>
                  {type}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyItems = placements.length > 0 || departments.length > 0 || batches.length > 0;

  return (
    <div className="flex flex-col h-[450px] overflow-hidden">
      {/* Filter Tabs */}
      <div className="p-3 border-b border-border/50 bg-muted/20 flex gap-2 overflow-x-auto no-scrollbar items-center">
        {[
          { id: 'all', label: 'All' },
          { id: 'placement', label: 'Placements' },
          { id: 'department', label: 'Departments' },
          { id: 'batch', label: 'Batches' }
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as any)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
              activeFilter === filter.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {hasAnyItems ? (
          <>
            {renderGroup('Placements', placements, 'placement')}
            {renderGroup('Departments', departments, 'department')}
            {renderGroup('Batches', batches, 'batch')}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic text-sm">
            No items available
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
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
        setStartTime(new Date(test.startTime));
        setEndTime(new Date(test.endTime));
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
    if (!editMode || !editTest || !testType) return;
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
            startTime: startTime!.toISOString(),
            endTime: endTime!.toISOString(),
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
            startTime: startTime!.toISOString(),
            endTime: endTime!.toISOString(),
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
          startTime: startTime!.toISOString(),
          endTime: endTime!.toISOString(),
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
          startTime: startTime!.toISOString(),
          endTime: endTime!.toISOString(),
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

  const steps = [
    { id: 1, title: 'Test Type', desc: 'Choose Coding or MCQ' },
    { id: 2, title: 'Assign To', desc: 'Select placements, batches, or departments' },
    { id: 3, title: 'Questions', desc: 'Add problems or questions' },
    { id: 4, title: 'Schedule', desc: 'Set dates and duration' },
  ];

  const handleTestTypeSelect = (type: TestType) => {
    if (editMode) return;
    setTestType(type);
    setStep(2); // Auto-advance
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  if (editMode && editLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-12 text-muted-foreground animate-pulse">
          <BallBouncingLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-3" style={{ fontFamily: 'var(--font-serif)' }}>
          <Calendar className="h-8 w-8 text-primary shrink-0" />
          {editMode ? 'Edit / Reschedule Test' : 'Schedule Test'}
        </h1>
        <p className="text-base text-muted-foreground mt-2 max-w-2xl">
          {editMode
            ? 'Update name, time, targets, or questions.'
            : 'Create a coding or MCQ test in 4 steps. Your assessments help track student progress.'}
        </p>
      </div>

      {/* Stepper Container */}
      <div className="mb-8 sm:mb-12 pt-4 sm:pt-6 pb-8 sm:pb-12 px-4 sm:px-10 rounded-2xl bg-muted/20 border border-border/50 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative w-full">
            {steps.map((s) => {
              const isActive = s.id === step;
              const isCompleted = s.id < step;

              return (
                <div
                  key={s.id}
                  className={cn("flex flex-col items-center relative group", (editMode || isCompleted) ? "cursor-pointer" : "cursor-default")}
                  onClick={() => {
                    if (editMode || isCompleted) setStep(s.id);
                  }}
                >
                  <div
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-500 border-2 bg-background z-20 relative",
                      isActive ? "border-primary text-primary scale-110 shadow-[0_0_25px_rgba(var(--primary),0.35)]" :
                        isCompleted ? "border-primary bg-primary text-primary-foreground" :
                          "border-muted-foreground/30 text-muted-foreground/40 group-hover:border-muted-foreground/60"
                    )}
                  >
                    {isCompleted ? (
                      <span className="animate-in zoom-in duration-300">
                        <CheckCircle weight="bold" className="w-6 h-6" />
                      </span>
                    ) : (
                      <span>{s.id}</span>
                    )}

                    {isActive && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-25 bg-primary" />
                    )}
                  </div>

                  <span className={cn(
                    "absolute top-14 sm:top-16 whitespace-nowrap text-[10px] sm:text-[12px] font-black tracking-[0.2em] uppercase transition-all duration-300",
                    !isActive && "hidden sm:block"
                  )}>
                    {s.title}
                  </span>
                </div>
              );
            })}

            {/* Progress Line Background */}
            <div className="absolute top-6 left-[calc(3rem/2)] right-[calc(3rem/2)] h-[3px] bg-muted/40 z-0 rounded-full">
              <div
                className="h-full bg-primary transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(var(--primary),0.6)]"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="neo-card p-0 overflow-hidden min-h-[450px] shadow-xl border-border/60 flex flex-col bg-card/50 backdrop-blur-md">
        {/* Step 1: Test Type */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
            <div className="border-b bg-muted/30 px-6 py-4">
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 1: Test type</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose the format of your assessment.</p>
            </div>
            <div className="px-8 py-12 flex items-center justify-center flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-xl">
                <button
                  type="button"
                  onClick={() => handleTestTypeSelect('CODING')}
                  disabled={editMode}
                  className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${testType === 'CODING'
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/10'
                    }`}
                >
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center transition-all duration-500 ${testType === 'CODING' ? 'bg-primary text-primary-foreground rotate-6' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary group-hover:rotate-6'}`}>
                    <Monitor className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <h3 className={`font-bold text-lg ${testType === 'CODING' ? 'text-primary' : 'text-foreground'}`}>Coding Test</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[150px]">Programming problems with test cases</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestTypeSelect('MCQ')}
                  disabled={editMode}
                  className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${testType === 'MCQ'
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/10'
                    }`}
                >
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center transition-all duration-500 ${testType === 'MCQ' ? 'bg-primary text-primary-foreground rotate-6' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary group-hover:rotate-6'}`}>
                    <ListChecks className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <h3 className={`font-bold text-lg ${testType === 'MCQ' ? 'text-primary' : 'text-foreground'}`}>MCQ Test</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[150px]">Multiple choice questions</p>
                  </div>
                </button>
              </div>
            </div>
            {editMode && (
              <div className="p-4 border-t bg-muted/30 flex justify-end">
                <Button onClick={nextStep}>
                  Next Step <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Targets */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
            <div className="border-b bg-muted/30 px-6 py-4">
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 2: Assign To</h3>
              <p className="text-sm text-muted-foreground mt-1">Who is taking this test?</p>
            </div>
            <div className="p-6 flex-1">
              <div className="max-w-xl mx-auto space-y-6">
                <div>
                  <Label className="mb-3 block text-base">Select Targets</Label>
                  <Popover open={targetPopoverOpen} onOpenChange={setTargetPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-card h-12">
                        <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                        <span>Add placement, batch, or department...</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 neo-card-flat overflow-hidden" align="start">
                      <TargetSelector
                        placements={placements}
                        batches={batches}
                        departments={departments}
                        isTargetSelected={isTargetSelected}
                        toggleTarget={toggleTarget}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="min-h-[100px] p-4 rounded-lg border border-dashed border-border bg-muted/20">
                  <div className="flex flex-wrap gap-2">
                    {targets.map((t) => (
                      <span key={`${t.type}-${t.id}`} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm shadow-sm animate-in scale-in duration-200">
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5 rounded-sm uppercase tracking-wide border-0", getTargetColor(t.type))}>{t.type}</Badge>
                        <span>{t.label}</span>
                        <button type="button" className="ml-1 rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => removeTarget(t.type, t.id)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    {targets.length === 0 && <span className="text-sm text-muted-foreground flex w-full h-full items-center justify-center italic py-8">No targets selected yet</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-muted/30 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={() => {
                if (targets.length > 0) nextStep();
                else toast({ title: 'Select at least one target', variant: 'destructive' });
              }}>Next Step <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Questions */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
            <div className="border-b bg-muted/30 px-6 py-4">
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 3: Select Questions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {testType === 'CODING' ? 'Add coding problems.' : 'Add MCQ questions.'}
              </p>
            </div>
            <div className="p-6 flex-1 space-y-6">
              {/* Used questions logic is same as before, just UI tweak */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Add Questions</Label>
                <Popover open={questionsDropdownOpen} onOpenChange={setQuestionsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12 font-normal bg-card" disabled={questionsLoading}>
                      <span className="flex items-center gap-2">
                        {questionsLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Loading questions...</span>
                          </>
                        ) : (
                          <>
                            <FileQuestion className="h-5 w-5 text-muted-foreground" />
                            <span>{testType === 'CODING' ? 'Browse Coding Problems...' : 'Browse MCQ Questions...'}</span>
                          </>
                        )}
                      </span>
                      {!questionsLoading && <ChevronDown className={`h-4 w-4 transition-transform opacity-50 ${questionsDropdownOpen ? 'rotate-180' : ''}`} />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0 neo-card-flat" align="start">
                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {/* Reuse existing category mapping logic but inside this new container */}
                      {testType === 'CODING' && categories.map((cat) => {
                        const items = problemsByCategory.get(cat.id) ?? [];
                        if (items.length === 0) return null;
                        const expanded = isCategoryExpanded(cat.id);
                        return (
                          <div key={cat.id} className="mb-1">
                            <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-muted transition-colors" onClick={() => toggleCategoryExpanded(cat.id)}>
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
                                      <label className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors ${used ? 'cursor-not-allowed opacity-60' : ''}`}>
                                        <Checkbox checked={checked} disabled={used} onCheckedChange={() => (used ? undefined : checked ? removeProblem(p.id) : addProblem(p))} />
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
                      {testType === 'MCQ' && categories.map((cat) => {
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
                      {(testType === 'CODING' ? problemsByCategory : mcqByCategory).get(null)?.length ? (
                        <div className="mb-1">
                          <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-muted transition-colors" onClick={() => toggleCategoryExpanded('uncategorized')}>
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isCategoryExpanded('uncategorized') ? 'rotate-180' : ''}`} />
                            Uncategorized
                          </button>
                          {isCategoryExpanded('uncategorized') && (
                            <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-muted pl-2">
                              {((testType === 'CODING' ? problemsByCategory : mcqByCategory).get(null) ?? []).map((item: any) => {
                                const checked = testType === 'CODING' ? selectedProblemIds.includes(item.id) : selectedMcqIds.includes(item.id);
                                const used = testType === 'CODING' ? usedProblemIds.includes(item.id) : usedMcqIds.includes(item.id);
                                return (
                                  <li key={item.id}>
                                    <label className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors ${used ? 'cursor-not-allowed opacity-60' : ''}`}>
                                      <Checkbox checked={checked} disabled={used} onCheckedChange={() => (used ? undefined : checked ? (testType === 'CODING' ? removeProblem(item.id) : removeMcq(item.id)) : (testType === 'CODING' ? addProblem(item) : addMcq(item)))} />
                                      <span className="flex-1 truncate">{testType === 'CODING' ? item.title : item.question}</span>
                                      {used && <span className="text-xs text-muted-foreground">(used)</span>}
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Selected {testType === 'CODING' ? 'Problems' : 'Questions'} ({testType === 'CODING' ? selectedProblems.length : selectedMcqQuestions.length})</Label>
                <div className="min-h-[150px] p-4 rounded-lg border border-border bg-muted/10 max-h-[300px] overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {testType === 'CODING'
                      ? selectedProblems.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 rounded-md border bg-background pl-3 pr-2 py-1.5 text-sm shadow-sm animate-in zoom-in-50 duration-200">
                          <span className="font-medium truncate max-w-[200px]">{p.title}</span>
                          <button type="button" className="ml-1 rounded-full hover:bg-muted p-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => removeProblem(p.id)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))
                      : selectedMcqQuestions.map((q) => (
                        <span key={q.id} className="inline-flex items-center gap-1.5 rounded-md border bg-background pl-3 pr-2 py-1.5 text-sm shadow-sm animate-in zoom-in-50 duration-200">
                          <span className="truncate max-w-[200px]">{q.question}</span>
                          <button type="button" className="ml-1 rounded-full hover:bg-muted p-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => removeMcq(q.id)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    {(testType === 'CODING' ? selectedProblems.length : selectedMcqQuestions.length) === 0 && (
                      <div className="w-full flex flex-col items-center justify-center py-8 text-muted-foreground opacity-50">
                        <FileQuestion className="h-8 w-8 mb-2" />
                        <span className="text-sm">No questions selected yet</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-muted/30 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={() => {
                if ((testType === 'CODING' ? selectedProblems.length : selectedMcqQuestions.length) > 0) nextStep();
                else toast({ title: 'Select at least one question', variant: 'destructive' });
              }}>Next Step <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 4: Finalize */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
            <div className="border-b bg-muted/30 px-6 py-4">
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Step 4: Finalize & Schedule</h3>
              <p className="text-sm text-muted-foreground mt-1">Set the test timing and duration.</p>
            </div>
            <div className="p-6 flex-1 max-w-2xl mx-auto w-full space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Test Name</Label>
                  <Input id="name" className="mt-1 h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Week 1 Assessment" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
                    <div className="relative mt-1">
                      <DateTimePicker date={startTime} setDate={setStartTime} label="Pick start time" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
                    <div className="relative mt-1">
                      <DateTimePicker date={endTime} setDate={setEndTime} label="Pick end time" />
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
                      className="pl-10 h-11"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    />
                    <Clock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-1">Standard duration: 60 minutes</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-muted/30 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={handleSubmit} disabled={loading} className="min-w-[140px]">
                {loading ? 'Scheduling...' : editMode ? 'Update Test' : 'Schedule Test'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}

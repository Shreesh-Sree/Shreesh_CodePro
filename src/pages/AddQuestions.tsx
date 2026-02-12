import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { categoriesApi, tagsApi, problemsApi, mcqQuestionsApi } from '@/lib/api';
import type { ApiCategory, ApiProblem, ApiMcqQuestion } from '@/lib/api';
import {
  FolderPlus,
  Plus,
  FileText as FileQuestion,
  ArrowLeft,
  Tag,
  Sparkle
} from '@phosphor-icons/react';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';

export default function AddQuestions() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [problems, setProblems] = useState<ApiProblem[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<ApiMcqQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewProblemId, setViewProblemId] = useState<number | null>(null);
  const [viewMcqId, setViewMcqId] = useState<number | null>(null);

  const loadCategories = () => {
    categoriesApi.list().then((r) => setCategories(r.categories)).catch(() => setCategories([]));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId == null) {
      setProblems([]);
      setMcqQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      problemsApi.list({ categoryId: String(selectedCategoryId) }),
      mcqQuestionsApi.list({ categoryId: String(selectedCategoryId) }),
    ])
      .then(([pRes, mRes]) => {
        setProblems(pRes.problems);
        setMcqQuestions(mRes.questions);
      })
      .catch(() => {
        setProblems([]);
        setMcqQuestions([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryTags = selectedCategory?.tags ?? [];
  const hasQuestions = problems.length > 0 || mcqQuestions.length > 0;

  const refreshCategoryQuestions = () => {
    if (selectedCategoryId != null) {
      problemsApi.list({ categoryId: String(selectedCategoryId) }).then((r) => setProblems(r.problems));
      mcqQuestionsApi.list({ categoryId: String(selectedCategoryId) }).then((r) => setMcqQuestions(r.questions));
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <FileQuestion className="h-6 w-6 text-primary" />
            Add Questions
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Create categories and add programming or MCQ questions to them.</p>
        </div>
      </div>

      {selectedCategoryId == null ? (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <button
            className="neo-card p-6 flex flex-col items-center justify-center gap-4 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-all group"
            onClick={() => setCreateCategoryOpen(true)}
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="font-medium">Create Category</h3>
              <p className="text-sm text-muted-foreground">Add a new topic</p>
            </div>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="neo-card p-6 flex flex-col items-start gap-4 hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{cat.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  <span>{cat.tags.length} tag(s)</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setSelectedCategoryId(null)} className="gap-2 pl-0 hover:bg-transparent hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to categories
            </Button>
            <Button onClick={() => setAddQuestionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FolderPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{selectedCategory?.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {categoryTags.map(t => (
                  <span key={t.id} className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {t.name}
                  </span>
                ))}
                {categoryTags.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground animate-pulse">Loading questions...</div>
          ) : !hasQuestions ? (
            <div className="neo-card flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="mb-4">No questions created in this category yet.</p>
              <Button onClick={() => setAddQuestionOpen(true)}>Add your first question</Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="neo-card p-0 overflow-hidden h-fit">
                <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
                  <h3 className="font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Programming Problems</h3>
                  <span className="text-xs font-mono bg-background border px-2 py-0.5 rounded-full">{problems.length}</span>
                </div>
                <div className="p-2">
                  {problems.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center italic">No programming problems.</p>
                  ) : (
                    <ul className="space-y-1">
                      {problems.map((p) => (
                        <li
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          className="flex items-center justify-between gap-3 rounded-md px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus:bg-muted"
                          onClick={() => setViewProblemId(p.id)}
                          onKeyDown={(e) => e.key === 'Enter' && setViewProblemId(p.id)}
                        >
                          <span className="font-medium text-sm truncate">{p.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${p.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            }`}>
                            {p.difficulty ?? 'EASY'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="neo-card p-0 overflow-hidden h-fit">
                <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
                  <h3 className="font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>MCQ Questions</h3>
                  <span className="text-xs font-mono bg-background border px-2 py-0.5 rounded-full">{mcqQuestions.length}</span>
                </div>
                <div className="p-2">
                  {mcqQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center italic">No MCQ questions.</p>
                  ) : (
                    <ul className="space-y-1">
                      {mcqQuestions.map((q) => (
                        <li
                          key={q.id}
                          role="button"
                          tabIndex={0}
                          className="flex items-center justify-between gap-3 rounded-md px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus:bg-muted"
                          onClick={() => setViewMcqId(q.id)}
                          onKeyDown={(e) => e.key === 'Enter' && setViewMcqId(q.id)}
                        >
                          <span className="text-sm line-clamp-1 flex-1">{q.question}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border whitespace-nowrap">
                            {q.questionType === 'SINGLE_CHOICE' ? 'Single' : 'Multi'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateCategoryModal
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onSuccess={() => {
          loadCategories();
          setCreateCategoryOpen(false);
          toast({ title: 'Category created' });
        }}
        onError={(m) => toast({ title: m, variant: 'destructive' })}
      />

      <AddQuestionModal
        open={addQuestionOpen}
        onOpenChange={setAddQuestionOpen}
        categoryId={selectedCategoryId ?? undefined}
        categoryName={selectedCategory?.name}
        tags={categoryTags}
        onSuccess={() => {
          setAddQuestionOpen(false);
          toast({ title: 'Question added' });
          refreshCategoryQuestions();
        }}
        onError={(m) => toast({ title: m, variant: 'destructive' })}
      />

      <ViewEditProblemModal
        open={viewProblemId != null}
        problemId={viewProblemId}
        onOpenChange={(open) => !open && setViewProblemId(null)}
        tags={categoryTags}
        onSuccess={() => {
          toast({ title: 'Problem updated' });
          refreshCategoryQuestions();
          setViewProblemId(null);
        }}
        onError={(m) => toast({ title: m, variant: 'destructive' })}
      />

      <ViewEditMcqModal
        open={viewMcqId != null}
        mcqId={viewMcqId}
        onOpenChange={(open) => !open && setViewMcqId(null)}
        tags={categoryTags}
        onSuccess={() => {
          toast({ title: 'MCQ updated' });
          refreshCategoryQuestions();
          setViewMcqId(null);
        }}
        onError={(m) => toast({ title: m, variant: 'destructive' })}
      />
    </div>
  );
}

function CreateCategoryModal({
  open,
  onOpenChange,
  onSuccess,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [tagNamesInput, setTagNamesInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { onError('Category name is required'); return; }
    const tagNames = tagNamesInput
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    setLoading(true);
    try {
      await categoriesApi.create({ name: name.trim(), tagNames });
      setName('');
      setTagNamesInput('');
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-card-flat sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>Create Category</DialogTitle>
          <DialogDescription>Add a category name and its tags (comma- or semicolon-separated).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label>Category name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cloud Computing" required />
          </div>
          <div>
            <Label>Category tags</Label>
            <Input
              value={tagNamesInput}
              onChange={(e) => setTagNamesInput(e.target.value)}
              placeholder="e.g. AWS, Azure, GCP"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddQuestionModal({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  tags,
  onSuccess,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: number;
  categoryName?: string;
  tags: { id: number; name: string }[];
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-card-flat max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>Add Question{categoryName ? ` to ${categoryName}` : ''}</DialogTitle>
          <DialogDescription>Create a programming problem or MCQ question.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="programming" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger value="programming" className="rounded-sm">Programming</TabsTrigger>
            <TabsTrigger value="mcq" className="rounded-sm">MCQ</TabsTrigger>
          </TabsList>
          <TabsContent value="programming" className="pt-4">
            <ProgrammingForm
              tags={tags}
              categoryId={categoryId}
              onSuccess={onSuccess}
              onError={onError}
            />
          </TabsContent>
          <TabsContent value="mcq" className="pt-4">
            <McqForm
              tags={tags}
              categoryId={categoryId}
              onSuccess={onSuccess}
              onError={onError}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ProgrammingForm({
  tags,
  categoryId,
  onSuccess,
  onError,
}: {
  tags: { id: number; name: string }[];
  categoryId?: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (id: number) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { onError('Title is required'); return; }
    setLoading(true);
    try {
      await problemsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty: difficulty || undefined,
        tagIds: tagIds.length ? tagIds : undefined,
        categoryId: categoryId ?? undefined,
      });
      setTitle('');
      setDescription('');
      setDifficulty('');
      setTagIds([]);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Problem title" required />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed problem description" rows={5} className="font-mono text-sm" />
      </div>
      <div>
        <Label>Difficulty</Label>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {tags.length > 0 && (
        <div>
          <Label className="mb-2 block">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 rounded-sm border bg-muted/30 px-2 py-1 cursor-pointer hover:bg-muted transition-colors">
                <Checkbox checked={tagIds.includes(t.id)} onCheckedChange={() => toggleTag(t.id)} />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Problem'}</Button>
      </div>
    </form>
  );
}

function McqForm({
  tags,
  categoryId,
  onSuccess,
  onError,
}: {
  tags: { id: number; name: string }[];
  categoryId?: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState<'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'>('SINGLE_CHOICE');
  const [maxMarks, setMaxMarks] = useState('1');
  const [options, setOptions] = useState<{ optionText: string; isCorrect: boolean }[]>([{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (id: number) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addOption = () => setOptions((prev) => [...prev, { optionText: '', isCorrect: false }]);
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    setOptions((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) { onError('Question text is required'); return; }
    const opts = options.filter((o) => o.optionText.trim());
    if (opts.length < 2) { onError('Add at least 2 options'); return; }
    if (questionType === 'SINGLE_CHOICE' && opts.filter((o) => o.isCorrect).length !== 1) {
      onError('Select exactly one correct option for single choice'); return;
    }
    if (questionType === 'MULTIPLE_CHOICE' && opts.filter((o) => o.isCorrect).length < 1) {
      onError('Select at least one correct option'); return;
    }
    setLoading(true);
    try {
      await mcqQuestionsApi.create({
        question: question.trim(),
        questionType,
        maxMarks: parseFloat(maxMarks) || 1,
        options: opts.map((o) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect })),
        tagIds: tagIds.length ? tagIds : undefined,
        categoryId: categoryId ?? undefined,
      });
      setQuestion('');
      setOptions([{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }]);
      setTagIds([]);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-row items-center justify-between gap-4 bg-muted/20 p-3 rounded-lg border border-border/50">
        <Label>Question Type</Label>
        <ToggleGroup
          type="single"
          value={questionType}
          onValueChange={(v) => v && setQuestionType(v as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE')}
          className="bg-muted p-0.5 rounded-md"
        >
          <ToggleGroupItem value="SINGLE_CHOICE" className="rounded-sm px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
            Single Correct
          </ToggleGroupItem>
          <ToggleGroupItem value="MULTIPLE_CHOICE" className="rounded-sm px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
            Multiple Correct
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div>
        <Label>Question</Label>
        <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question text" rows={3} required className="font-medium" />
      </div>
      <div>
        <Label>Max marks</Label>
        <Input type="number" min={0} step={0.5} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Options</Label>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/50 transition-colors">
              <input
                type={questionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                name="correct"
                checked={opt.isCorrect}
                onChange={() => {
                  if (questionType === 'SINGLE_CHOICE') {
                    setOptions((prev) => prev.map((o, j) => ({ ...o, isCorrect: j === i })));
                  } else {
                    updateOption(i, 'isCorrect', !opt.isCorrect);
                  }
                }}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
            <Input
              value={opt.optionText}
              onChange={(e) => updateOption(i, 'optionText', e.target.value)}
              placeholder={`Option ${i + 1}`}
              className={opt.isCorrect ? 'border-primary/50 ring-1 ring-primary/20' : ''}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={options.length <= 2} className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <span className="sr-only">Remove</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="mt-2 w-full border-dashed">
          <Plus className="h-3.5 w-3.5 mr-2" />
          Add Option
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="pt-2">
          <Label className="mb-2 block">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 rounded-sm border bg-muted/30 px-2 py-1 cursor-pointer hover:bg-muted transition-colors">
                <Checkbox checked={tagIds.includes(t.id)} onCheckedChange={() => toggleTag(t.id)} />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create MCQ'}</Button>
      </div>
    </form>
  );
}

function ViewEditProblemModal({
  open,
  problemId,
  onOpenChange,
  tags,
  onSuccess,
  onError,
}: {
  open: boolean;
  problemId: number | null;
  onOpenChange: (open: boolean) => void;
  tags: { id: number; name: string }[];
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [tagIds, setTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open || problemId == null) {
      setProblem(null);
      setEditing(false);
      return;
    }
    setLoading(true);
    problemsApi
      .getById(String(problemId))
      .then((r) => {
        setProblem(r.problem);
        setTitle(r.problem.title);
        setDescription(r.problem.description ?? '');
        setDifficulty(r.problem.difficulty ?? '');
        setTagIds(r.problem.tagIds ?? []);
      })
      .catch(() => onError('Failed to load problem'))
      .finally(() => setLoading(false));
  }, [open, problemId, onError]);

  const toggleTag = (id: number) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problemId == null || !title.trim()) return;
    setSaveLoading(true);
    try {
      await problemsApi.update(String(problemId), {
        title: title.trim(),
        description: description.trim() || null,
        difficulty: difficulty || null,
        tagIds: tagIds.length ? tagIds : undefined,
      });
      setEditing(false);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-card-flat max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>{editing ? 'Edit Problem' : 'Problem Details'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the problem and save.' : 'View and optionally edit this programming problem.'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8 text-muted-foreground animate-pulse">Loading...</div>
        ) : !problem ? (
          <p className="text-muted-foreground">Problem not found.</p>
        ) : editing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Problem title" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={5} className="font-mono text-sm" />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tags.length > 0 && (
              <div>
                <Label className="mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 rounded-sm border bg-muted/30 px-2 py-1 cursor-pointer hover:bg-muted transition-colors">
                      <Checkbox checked={tagIds.includes(t.id)} onCheckedChange={() => toggleTag(t.id)} />
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={saveLoading}>{saveLoading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</Label>
              <p className="font-medium text-lg">{problem.title}</p>
            </div>
            {problem.description && (
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
                <div className="rounded-md bg-muted/50 p-4 font-mono text-sm whitespace-pre-wrap border border-border/50 max-h-[300px] overflow-y-auto">
                  {problem.description}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {problem.difficulty && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Difficulty</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${problem.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      problem.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                      {problem.difficulty}
                    </span>
                  </div>
                </div>
              )}
              {problem.tagIds && problem.tagIds.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.filter((t) => problem.tagIds?.includes(t.id)).map((t) => (
                      <span key={t.id} className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t mt-4">
              <Button type="button" onClick={() => setEditing(true)}>Edit Problem</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViewEditMcqModal({
  open,
  mcqId,
  onOpenChange,
  tags,
  onSuccess,
  onError,
}: {
  open: boolean;
  mcqId: number | null;
  onOpenChange: (open: boolean) => void;
  tags: { id: number; name: string }[];
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [question, setQuestion] = useState<ApiMcqQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'>('SINGLE_CHOICE');
  const [maxMarks, setMaxMarks] = useState('1');
  const [options, setOptions] = useState<{ optionText: string; isCorrect: boolean }[]>([{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }]);
  const [tagIds, setTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open || mcqId == null) {
      setQuestion(null);
      setEditing(false);
      return;
    }
    setLoading(true);
    mcqQuestionsApi
      .getById(String(mcqId))
      .then((r) => {
        const q = r.question;
        setQuestion(q);
        setQuestionText(q.question);
        setQuestionType(q.questionType);
        setMaxMarks(String(q.maxMarks));
        setOptions(
          q.options?.length
            ? q.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect }))
            : [{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }]
        );
        setTagIds(q.tagIds ?? []);
      })
      .catch(() => onError('Failed to load question'))
      .finally(() => setLoading(false));
  }, [open, mcqId, onError]);

  const toggleTag = (id: number) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const addOption = () => setOptions((prev) => [...prev, { optionText: '', isCorrect: false }]);
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    setOptions((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mcqId == null || !questionText.trim()) return;
    const opts = options.filter((o) => o.optionText.trim());
    if (opts.length < 2) {
      onError('Add at least 2 options');
      return;
    }
    if (questionType === 'SINGLE_CHOICE' && opts.filter((o) => o.isCorrect).length !== 1) {
      onError('Select exactly one correct option for single choice');
      return;
    }
    if (questionType === 'MULTIPLE_CHOICE' && opts.filter((o) => o.isCorrect).length < 1) {
      onError('Select at least one correct option');
      return;
    }
    setSaveLoading(true);
    try {
      await mcqQuestionsApi.update(String(mcqId), {
        question: questionText.trim(),
        questionType,
        maxMarks: parseFloat(maxMarks) || 1,
        options: opts.map((o) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect })),
        tagIds: tagIds.length ? tagIds : undefined,
      });
      setEditing(false);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-card-flat max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>{editing ? 'Edit MCQ' : 'MCQ Question Details'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the question and save.' : 'View details of this MCQ question.'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8 text-muted-foreground animate-pulse">Loading...</div>
        ) : !question ? (
          <p className="text-muted-foreground">Question not found.</p>
        ) : editing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="flex flex-row items-center justify-between gap-4 bg-muted/20 p-3 rounded-lg border border-border/50">
              <Label>Question Type</Label>
              <ToggleGroup
                type="single"
                value={questionType}
                onValueChange={(v) => v && setQuestionType(v as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE')}
                className="bg-muted p-0.5 rounded-md"
              >
                <ToggleGroupItem value="SINGLE_CHOICE" className="rounded-sm px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  Single Correct
                </ToggleGroupItem>
                <ToggleGroupItem value="MULTIPLE_CHOICE" className="rounded-sm px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  Multiple Correct
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label>Question</Label>
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Question" rows={3} required className="font-medium" />
            </div>
            <div>
              <Label>Max marks</Label>
              <Input type="number" min={0} step={0.5} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/50 transition-colors">
                    <input
                      type={questionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                      name="correct-edit"
                      checked={opt.isCorrect}
                      onChange={() => {
                        if (questionType === 'SINGLE_CHOICE') {
                          setOptions((prev) => prev.map((o, j) => ({ ...o, isCorrect: j === i })));
                        } else {
                          updateOption(i, 'isCorrect', !opt.isCorrect);
                        }
                      }}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </div>
                  <Input
                    value={opt.optionText}
                    onChange={(e) => updateOption(i, 'optionText', e.target.value)}
                    placeholder="Option text"
                    className={opt.isCorrect ? 'border-primary/50 ring-1 ring-primary/20' : ''}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={options.length <= 2}>
                    <span className="sr-only">Remove</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOption} className="mt-2 w-full border-dashed">Add Option</Button>
            </div>
            {tags.length > 0 && (
              <div className="pt-2">
                <Label className="mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 rounded-sm border bg-muted/30 px-2 py-1 cursor-pointer hover:bg-muted transition-colors">
                      <Checkbox checked={tagIds.includes(t.id)} onCheckedChange={() => toggleTag(t.id)} />
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={saveLoading}>{saveLoading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Question</Label>
              <p className="font-medium text-lg whitespace-pre-wrap">{question.question}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Options</Label>
              <div className="space-y-2">
                {question.options?.map((opt) => (
                  <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-md border ${opt.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/10 border-border/50'}`}>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'}`}>
                      {opt.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={opt.isCorrect ? 'font-medium text-emerald-700 dark:text-emerald-400' : ''}>{opt.optionText}</span>
                    {opt.isCorrect && <span className="ml-auto text-xs font-semibold text-emerald-600 uppercase tracking-wider">Correct</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</Label>
                <p className="text-sm">{question.questionType === 'SINGLE_CHOICE' ? 'Single Choice' : 'Multiple Choice'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Marks</Label>
                <p className="text-sm">{question.maxMarks}</p>
              </div>
            </div>
            {question?.tagIds && question.tagIds.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.filter((t) => question.tagIds?.includes(t.id)).map((t) => (
                    <span key={t.id} className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t mt-4">
              <Button type="button" onClick={() => setEditing(true)}>Edit Question</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, PencilSimple as Pencil, Trash as Trash2, SquaresFour as LayoutGrid, Buildings as Building2 } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import AdvancedPagination from '@/components/shared/AdvancedPagination';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { Can, usePermission } from '@/contexts/PermissionContext';
import { departmentsApi, collegesApi, ApiDepartment, ApiCollege } from '@/lib/api';
import { setCachedDepartments, invalidateDepartmentsCache } from '@/lib/storage';
import { cn, getDepartmentColor } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type GroupKey = string;

function groupDepartmentsByCollege(
  departments: ApiDepartment[],
  colleges: ApiCollege[]
): { key: GroupKey; collegeName: string; collegeCode: string; departments: ApiDepartment[] }[] {
  const byCollege = new Map<GroupKey, ApiDepartment[]>();
  const collegeCodeToName = new Map<string, string>();
  colleges.forEach((c) => {
    const code = c.code ?? String(c.college_code ?? '');
    if (code) collegeCodeToName.set(code, c.name);
  });

  for (const d of departments) {
    const key = d.collegeId ?? d.collegeName ?? '';
    const k = key === '' ? '__none__' : key;
    if (!byCollege.has(k)) byCollege.set(k, []);
    byCollege.get(k)!.push(d);
  }

  return Array.from(byCollege.entries()).map(([key, depts]) => {
    const isNone = key === '__none__';
    const collegeCode = isNone ? '' : (depts[0]?.collegeId ?? '');
    const collegeName = isNone
      ? 'Unassigned'
      : (depts[0]?.collegeName ?? collegeCodeToName.get(collegeCode) ?? collegeCode);
    return {
      key,
      collegeName,
      collegeCode,
      departments: depts.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }).sort((a, b) => {
    if (a.collegeName === 'Unassigned') return 1;
    if (b.collegeName === 'Unassigned') return -1;
    return a.collegeName.localeCompare(b.collegeName);
  });
}

export default function Departments() {
  const { hasPermission } = usePermission();
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [colleges, setColleges] = useState<ApiCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ApiDepartment | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', collegeId: '' });

  const fetchColleges = useCallback(async () => {
    try {
      const { colleges: list } = await collegesApi.list();
      setColleges(list);
    } catch {
      setColleges([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { departments: list } = await departmentsApi.list();
      setDepartments(list);
      setCachedDepartments(list);
    } catch (e) {
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchColleges(), fetchDepartments()]).then(() => setLoading(false));
  }, [fetchColleges, fetchDepartments]);

  const grouped = useMemo(
    () => groupDepartmentsByCollege(departments, colleges),
    [departments, colleges]
  );

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(grouped.length / itemsPerPage);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return grouped.slice(start, start + itemsPerPage);
  }, [grouped, page]);

  const handleEdit = (dept: ApiDepartment) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      collegeId: dept.collegeId ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (dept: ApiDepartment) => {
    try {
      await departmentsApi.delete(dept.id);
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
      invalidateDepartmentsCache();
      toast.success(`${dept.name} has been deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete department');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    try {
      if (editingDepartment) {
        await departmentsApi.update(editingDepartment.id, {
          name: formData.name,
          code: formData.code,
          collegeId: formData.collegeId || undefined,
        });
        setDepartments((prev) =>
          prev.map((d) =>
            d.id === editingDepartment.id
              ? {
                ...d,
                name: formData.name,
                code: formData.code,
                collegeId: formData.collegeId || undefined,
                collegeName: colleges.find((c) => (c.code ?? String(c.college_code ?? '')) === formData.collegeId)?.name,
              }
              : d
          )
        );
        invalidateDepartmentsCache();
        toast.success('Department updated successfully');
      } else {
        const { department } = await departmentsApi.create({
          name: formData.name,
          code: formData.code,
          collegeId: formData.collegeId || undefined,
        });
        setDepartments((prev) => [...prev, department]);
        invalidateDepartmentsCache();
        toast.success('Department created successfully');
      }
      handleCloseDialog();
    } catch {
      toast.error(editingDepartment ? 'Failed to update department' : 'Failed to create department');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
    setFormData({ name: '', code: '', collegeId: '' });
  };

  const canUpdate = hasPermission('department:update');
  const canDelete = hasPermission('department:delete');

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <LayoutGrid className="h-6 w-6 text-primary" />
            Departments
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage departments by college
          </p>
        </div>
        <Can permission="department:create">
          <Button
            onClick={() => {
              setFormData({ name: '', code: '', collegeId: '' });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </Can>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <BallBouncingLoader />
        </div>
      ) : grouped.length === 0 ? (
        <div className="neo-card flex flex-col items-center justify-center py-12 text-muted-foreground">
          <LayoutGrid className="mb-4 h-12 w-12 opacity-50" />
          <p>No departments found. Add a college first, then add departments.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {paginatedGroups.map(({ collegeName, collegeCode, departments: depts }) => (
            <div key={collegeCode || '__none__'} className="neo-card p-0 overflow-hidden">
              <div className="border-b bg-muted/40 py-4 px-6 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{collegeName}</h2>
              </div>
              <div className="p-0">
                <ul className="divide-y divide-border/50">
                  {depts.map((dept) => (
                    <li
                      key={dept.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-sm">{dept.name}</span>
                        {dept.code && (
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider", getDepartmentColor(dept.code))}>
                            {dept.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(dept)}
                            className="gap-1.5 h-8 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dept)}
                            className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                        {!canUpdate && !canDelete && (
                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Read Only</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <AdvancedPagination
                totalPages={totalPages}
                initialPage={page}
                onPageChange={setPage}
                variant="rounded"
              />
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              {editingDepartment ? 'Edit Department' : 'Add New Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? 'Update the department information below'
                : 'Select a college and fill in the department details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>College</Label>
              <Select
                value={formData.collegeId}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, collegeId: v }))}
                required={!editingDepartment}
              >
                <SelectTrigger className="bg-secondary/50 border-input">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => {
                    const code = c.code ?? String(c.college_code ?? '');
                    return (
                      <SelectItem key={c.id} value={code}>
                        {c.name} {code ? `(${code})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Computer Science and Engineering"
                className="bg-secondary/50 border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. CSE"
                className="bg-secondary/50 border-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="border-border">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || (!editingDepartment && !formData.collegeId)}
            >
              {editingDepartment ? 'Save Changes' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

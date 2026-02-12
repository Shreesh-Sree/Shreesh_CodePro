import { useState, useEffect, useCallback } from 'react';
import { Plus, PencilSimple as Pencil, Trash as Trash2, Buildings as Building2 } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { DataTable, Column, Action } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Can, usePermission } from '@/contexts/PermissionContext';
import { collegesApi, ApiCollege } from '@/lib/api';
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
import { toast } from 'sonner';

export default function Colleges() {
  const { hasPermission } = usePermission();
  const [colleges, setColleges] = useState<ApiCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<ApiCollege | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const fetchColleges = useCallback(async () => {
    try {
      const { colleges: list } = await collegesApi.list();
      setColleges(list);
    } catch {
      toast.error('Failed to load colleges');
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  const columns: Column<ApiCollege & { status?: string }>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'code', header: 'Code', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge status="active" />,
    },
  ];

  const actions: Action<ApiCollege>[] = [];
  if (hasPermission('college:update')) {
    actions.push({
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: (college) => {
        setEditingCollege(college);
        setFormData({ name: college.name, code: college.code ?? '' });
        setIsDialogOpen(true);
      },
    });
  }
  if (hasPermission('college:delete')) {
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: async (college) => {
        try {
          await collegesApi.delete(college.id);
          setColleges(prev => prev.filter(c => c.id !== college.id));
          toast.success(`${college.name} has been deleted`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Failed to delete college');
        }
      },
    });
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    try {
      if (editingCollege) {
        await collegesApi.update(editingCollege.id, { name: formData.name, code: formData.code });
        setColleges(prev => prev.map(c => (c.id === editingCollege.id ? { ...c, ...formData } : c)));
        toast.success('College updated successfully');
      } else {
        const { college } = await collegesApi.create({ name: formData.name, code: formData.code });
        setColleges(prev => [...prev, college]);
        toast.success('College created successfully');
      }
      handleCloseDialog();
    } catch {
      toast.error(editingCollege ? 'Failed to update college' : 'Failed to create college');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCollege(null);
    setFormData({ name: '', code: '' });
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <Building2 className="h-6 w-6 text-primary" />
            Colleges
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage all colleges in the education system
          </p>
        </div>
        <Can permission="college:create">
          <Button onClick={() => { setFormData({ name: '', code: '' }); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add College
          </Button>
        </Can>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-muted-foreground animate-pulse">Loading...</div>
      ) : (
        <div className="neo-card p-0 overflow-hidden">
          <DataTable
            data={colleges}
            columns={columns}
            actions={actions.length > 0 ? actions : undefined}
            searchPlaceholder="Search colleges..."
            searchKeys={['name', 'code']}
            emptyMessage="No colleges found"
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              {editingCollege ? 'Edit College' : 'Add New College'}
            </DialogTitle>
            <DialogDescription>
              {editingCollege ? 'Update the college information below' : 'Fill in the details to create a new college'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">College Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter college name"
                className="bg-secondary/50 border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. 1001"
                className="bg-secondary/50 border-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="border-border">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingCollege ? 'Save Changes' : 'Create College'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

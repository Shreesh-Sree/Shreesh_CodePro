import { useState, useEffect, useCallback } from 'react';
import { Plus, PencilSimple as Pencil, Trash as Trash2, Briefcase } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { DataTable, Column, Action } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Can, usePermission } from '@/contexts/PermissionContext';
import { placementsApi, ApiPlacement } from '@/lib/api';
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

export default function Placements() {
  const { hasPermission } = usePermission();
  const [placements, setPlacements] = useState<ApiPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<ApiPlacement | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  const fetchPlacements = useCallback(async () => {
    try {
      const { placements: list } = await placementsApi.list();
      setPlacements(list);
    } catch {
      toast.error('Failed to load placements');
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  const columns: Column<ApiPlacement & { status?: string }>[] = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge status="active" />,
    },
  ];

  const actions: Action<ApiPlacement>[] = [];
  if (hasPermission('placement:update')) {
    actions.push({
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: (placement) => {
        setEditingPlacement(placement);
        setFormData({ name: placement.name });
        setIsDialogOpen(true);
      },
    });
  }
  if (hasPermission('placement:delete')) {
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: async (placement) => {
        try {
          await placementsApi.delete(placement.id);
          setPlacements(prev => prev.filter(p => p.id !== placement.id));
          toast.success(`${placement.name} has been deleted`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Failed to delete placement');
        }
      },
    });
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    try {
      if (editingPlacement) {
        await placementsApi.update(editingPlacement.id, { name: formData.name });
        setPlacements(prev => prev.map(p => (p.id === editingPlacement.id ? { ...p, name: formData.name } : p)));
        toast.success('Placement updated successfully');
      } else {
        const { placement } = await placementsApi.create({ name: formData.name });
        setPlacements(prev => [...prev, placement]);
        toast.success('Placement created successfully');
      }
      handleCloseDialog();
    } catch (e) {
      toast.error(editingPlacement ? (e instanceof Error ? e.message : 'Failed to update placement') : (e instanceof Error ? e.message : 'Failed to create placement'));
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlacement(null);
    setFormData({ name: '' });
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <Briefcase className="h-6 w-6 text-primary" />
            Placement
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage all placements in the system
          </p>
        </div>
        <Can permission="placement:create">
          <Button onClick={() => { setFormData({ name: '' }); setEditingPlacement(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Placement
          </Button>
        </Can>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <BallBouncingLoader />
        </div>
      ) : (
        <div className="neo-card p-0 overflow-hidden">
          <DataTable
            data={placements}
            columns={columns}
            actions={actions.length > 0 ? actions : undefined}
            searchPlaceholder="Search placements..."
            searchKeys={['name']}
            emptyMessage="No placements found"
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              {editingPlacement ? 'Edit Placement' : 'Add New Placement'}
            </DialogTitle>
            <DialogDescription>
              {editingPlacement ? 'Update the placement information below' : 'Fill in the details to create a new placement'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Placement Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter placement name"
                className="bg-secondary/50 border-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="border-border">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingPlacement ? 'Save Changes' : 'Create Placement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

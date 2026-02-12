import { useState, useEffect, useCallback } from 'react';
import { Plus, PencilSimple as Pencil, Trash as Trash2, Shield, CircleNotch as Loader2, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { DataTable, Column, Action } from '@/components/shared/DataTable';
import { rolesApi, permissionsApi, ApiRole, ApiPermission } from '@/lib/api';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

/** Convert permission string (e.g. college:create) to English label (e.g. Create College) */
function permissionToLabel(permission: string): string {
  const [resource, action] = permission.split(':');
  if (!resource || !action) return permission;
  const actionLabels: Record<string, string> = {
    create: 'Create',
    read: 'Read',
    update: 'Update',
    delete: 'Delete',
    read_own: 'Read Own',
    bulk_create: 'Bulk Create',
    schedule: 'Schedule',
    view_results: 'View Results',
    unassign_from_placement: 'Unassign from Placement',
  };
  const resourceLabels: Record<string, string> = {
    college: 'College',
    colleges: 'Colleges',
    department: 'Department',
    departments: 'Departments',
    user: 'User',
    users: 'Users',
    mentor: 'Mentor',
    mentors: 'Mentors',
    student: 'Student',
    students: 'Students',
    placement: 'Placement',
    placements: 'Placements',
    analytics: 'Analytics',
    progress: 'Progress',
    test: 'Test',
    tests: 'Tests',
    result: 'Result',
    results: 'Results',
    question: 'Question',
    questions: 'Questions',
  };
  const actionStr = actionLabels[action] ?? action.replace(/_/g, ' ');
  const resourceStr = resourceLabels[resource] ?? resource.charAt(0).toUpperCase() + resource.slice(1);
  if (action === 'bulk_create' && resource === 'student') return 'Bulk Create Students';
  if (action === 'read_own') return `${actionStr} ${resourceStr} `;
  if (resource === 'test' && action === 'schedule') return 'Schedule Test';
  if (resource === 'test' && action === 'view_results') return 'View Test Results (legacy)';
  return `${actionStr} ${resourceStr} `;
}

/** Category order and display names for grouping permissions */
const PERMISSION_CATEGORIES: { key: string; label: string }[] = [
  { key: 'college', label: 'College' },
  { key: 'department', label: 'Department' },
  { key: 'user', label: 'User' },
  { key: 'mentor', label: 'Mentor' },
  { key: 'student', label: 'Student' },
  { key: 'placement', label: 'Placement' },
  { key: 'test', label: 'Test' },
  { key: 'result', label: 'Result' },
  { key: 'question', label: 'Question' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'progress', label: 'Progress' },
];

/** Action order within a category (CRUD-style) */
const ACTION_ORDER = ['read', 'read_own', 'create', 'update', 'delete', 'bulk_create', 'schedule', 'view_results', 'unassign_from_placement'];

function groupPermissionsByCategory(permissions: ApiPermission[]): { category: string; label: string; permissions: ApiPermission[] }[] {
  const byCategory = new Map<string, ApiPermission[]>();
  for (const p of permissions) {
    const resource = p.permission.split(':')[0];
    if (!resource) continue;
    if (!byCategory.has(resource)) byCategory.set(resource, []);
    byCategory.get(resource)!.push(p);
  }
  for (const [, list] of byCategory) {
    list.sort((a, b) => {
      const actionA = a.permission.split(':')[1] ?? '';
      const actionB = b.permission.split(':')[1] ?? '';
      return ACTION_ORDER.indexOf(actionA) - ACTION_ORDER.indexOf(actionB) || a.permission.localeCompare(b.permission);
    });
  }
  return PERMISSION_CATEGORIES.filter(c => byCategory.has(c.key)).map(c => ({
    category: c.key,
    label: c.label,
    permissions: byCategory.get(c.key)!,
  }));
}

export default function Roles() {
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] as string[] });

  const fetchRoles = useCallback(async () => {
    try {
      const { roles: list } = await rolesApi.list();
      setRoles(list);
    } catch {
      toast.error('Failed to load roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const { permissions: list } = await permissionsApi.list();
      setPermissions(list);
    } catch {
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (isDialogOpen) fetchPermissions();
  }, [isDialogOpen, fetchPermissions]);

  const columns: Column<ApiRole>[] = [
    { key: 'role', header: 'Role', sortable: true },
    {
      key: 'isSystem',
      header: 'Type',
      render: (r) => (
        <span className={r.isSystem ? 'text-muted-foreground' : 'text-primary font-medium'}>
          {r.isSystem ? 'System' : 'Custom'}
        </span>
      ),
    },
    {
      key: 'permissionCount',
      header: 'Permissions',
      render: (r) => r.permissionCount ?? 0,
    },
    {
      key: 'userCount',
      header: 'Users',
      render: (r) => r.userCount ?? 0,
    },
  ];

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', permissions: [] });
    setIsDialogOpen(true);
  };

  const openEdit = async (role: ApiRole) => {
    try {
      const { role: full } = await rolesApi.getById(role.id);
      setEditingRole(full);
      setFormData({ name: full.role.replace(/_/g, ' '), permissions: full.permissions ?? [] });
      setIsDialogOpen(true);
    } catch {
      toast.error('Failed to load role details');
    }
  };

  const actions: Action<ApiRole>[] = [
    {
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: openEdit,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: async (role) => {
        if (role.isSystem) {
          toast.error('System roles cannot be deleted');
          return;
        }
        try {
          await rolesApi.delete(role.id);
          setRoles(prev => prev.filter(r => r.id !== role.id));
          toast.success(`Role ${role.role} deleted`);
        } catch (e) {
          toast.error((e as Error).message || 'Failed to delete role');
        }
      },
    },
  ];

  const handleSubmit = async () => {
    const name = formData.name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, { name: formData.name.trim(), permissions: formData.permissions });
        const { role: updated } = await rolesApi.getById(editingRole.id);
        setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, ...updated, permissionCount: updated.permissions?.length ?? 0 } : r));
        toast.success('Role updated successfully');
      } else {
        const { role: created } = await rolesApi.create({ name: formData.name.trim(), permissions: formData.permissions });
        setRoles(prev => [...prev, { ...created, permissionCount: created.permissions?.length ?? 0, userCount: 0 }]);
        toast.success('Role created successfully');
      }
      handleCloseDialog();
    } catch (e) {
      toast.error((e as Error).message || (editingRole ? 'Failed to update role' : 'Failed to create role'));
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setFormData({ name: '', permissions: [] });
  };

  /** When selecting Create/Update/Delete/Bulk Create, auto-select the matching Read so menus/APIs work. */
  const togglePermission = (perm: string, allPermissionStrings: string[]) => {
    const isAdding = !formData.permissions.includes(perm);
    const [resource, action] = perm.split(':');
    const needsRead = isAdding && resource && ['create', 'update', 'delete', 'bulk_create'].includes(action);
    const readPerm = resource ? `${resource}: read` : null;
    const hasReadInList = readPerm && allPermissionStrings.includes(readPerm);

    setFormData(prev => {
      let next = isAdding
        ? [...prev.permissions, perm]
        : prev.permissions.filter(p => p !== perm);
      if (needsRead && hasReadInList && readPerm && !next.includes(readPerm)) {
        next = [...next, readPerm];
      }
      return { ...prev, permissions: next };
    });
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <Shield className="h-6 w-6 text-primary" />
            Roles
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Create and manage custom roles with user-defined permissions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <BallBouncingLoader />
        </div>
      ) : (
        <div className="neo-card p-0 overflow-hidden">
          <DataTable
            data={roles}
            columns={columns}
            actions={actions}
            searchPlaceholder="Search roles..."
            searchKeys={['role']}
            emptyMessage="No roles found"
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-muted/30">
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>{editingRole ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
            <DialogDescription>
              {editingRole
                ? 'Update the role name and permissions below.'
                : 'Enter a role name and select the permissions this role should have.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="role-name" className="text-sm font-medium">Role name</Label>
              <Input
                id="role-name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Content Manager"
                className="h-11 text-base bg-secondary/50 border-input"
              />
              <p className="text-xs text-muted-foreground">Stored as uppercase with underscores (e.g. CONTENT_MANAGER)</p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="space-y-5">
                {groupPermissionsByCategory(permissions).map(({ category, label, permissions: perms }) => (
                  <section
                    key={category}
                    className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/20"
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b capitalize">
                      {label}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                      {perms.map(p => (
                        <label
                          key={p.id}
                          htmlFor={`perm - ${p.id} `}
                          className={`flex items - center gap - 3 py - 2.5 px - 3 rounded - lg cursor - pointer transition - colors duration - 200 hover: bg - muted / 60 ${formData.permissions.includes(p.permission) ? 'bg-primary/10' : ''} `}
                        >
                          <Checkbox
                            id={`perm - ${p.id} `}
                            checked={formData.permissions.includes(p.permission)}
                            onCheckedChange={() => togglePermission(p.permission, permissions.map(x => x.permission))}
                            className="shrink-0"
                          />
                          <span className="text-sm font-medium select-none">
                            {permissionToLabel(p.permission)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
            <Button variant="outline" onClick={handleCloseDialog} className="border-border">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

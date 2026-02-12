import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, PencilSimple as Pencil, Trash as Trash2, Users as UsersIcon, Shield, UploadSimple as Upload, CircleNotch as Loader2, FileCsv as FileSpreadsheet, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { DataTable, Column, Action } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Can, usePermission } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, departmentsApi, rolesApi, permissionsApi, placementsApi, uploadBulkUsers, ApiUser, ApiDepartment, ApiRoleOption, ApiPermission, ApiPlacement } from '@/lib/api';
import { getCachedDepartments, setCachedDepartments, getCachedRolesAssignable, setCachedRolesAssignable } from '@/lib/storage';
import { cn, getRoleColor } from '@/lib/utils';
import { Role } from '@/types/auth';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

function permissionToLabel(permission: string): string {
  const [resource, action] = permission.split(':');
  if (!resource || !action) return permission;
  const actionLabels: Record<string, string> = {
    create: 'Create', read: 'Read', update: 'Update', delete: 'Delete',
    read_own: 'Read Own', bulk_create: 'Bulk Create',
    schedule: 'Schedule', view_results: 'View Results', unassign_from_placement: 'Unassign from Placement',
  };
  const resourceLabels: Record<string, string> = {
    college: 'College', department: 'Department', user: 'User', mentor: 'Mentor',
    student: 'Student', placement: 'Placement', analytics: 'Analytics', progress: 'Progress',
    test: 'Test', result: 'Result', question: 'Question',
  };
  const actionStr = actionLabels[action] ?? action.replace(/_/g, ' ');
  const resourceStr = resourceLabels[resource] ?? resource.charAt(0).toUpperCase() + resource.slice(1);
  if (action === 'bulk_create' && resource === 'student') return 'Bulk Create Students';
  if (action === 'read_own') return `${actionStr} ${resourceStr}`;
  if (resource === 'test' && action === 'schedule') return 'Schedule Test';
  if (resource === 'test' && action === 'view_results') return 'View Test Results (legacy)';
  return `${actionStr} ${resourceStr}`;
}

const PERMISSION_CATEGORIES: { key: string; label: string }[] = [
  { key: 'college', label: 'College' }, { key: 'department', label: 'Department' },
  { key: 'user', label: 'User' }, { key: 'mentor', label: 'Mentor' },
  { key: 'student', label: 'Student' }, { key: 'placement', label: 'Placement' },
  { key: 'test', label: 'Test' }, { key: 'result', label: 'Result' }, { key: 'question', label: 'Question' },
  { key: 'analytics', label: 'Analytics' }, { key: 'progress', label: 'Progress' },
];
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
    category: c.key, label: c.label, permissions: byCategory.get(c.key)!,
  }));
}

/** Format role string for display (e.g. CONTENT_MANAGER -> Content Manager) */
function roleToLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Page description for User Management based on current user's role */
function getUsersPageDescription(role: string | undefined): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'Manage admins, department heads, mentors, and students';
    case 'ADMIN':
      return 'Manage department heads, mentors, and students';
    case 'DEPARTMENT':
      return 'Manage mentors in your department';
    default:
      return 'View and manage users you have access to';
  }
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermission();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [roleOptions, setRoleOptions] = useState<ApiRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '' as Role | '',
    departmentId: '',
    placementId: '',
    staffId: '',
  });
  const [placements, setPlacements] = useState<ApiPlacement[]>([]);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<ApiUser | null>(null);
  const [permissionsList, setPermissionsList] = useState<ApiPermission[]>([]);
  const [permissionsFormData, setPermissionsFormData] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRole, setBulkRole] = useState<string>('');
  const [bulkDepartmentId, setBulkDepartmentId] = useState('');
  const [bulkPlacementId, setBulkPlacementId] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failedRows: { row: number; reason: string }[] } | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { users: list } = await usersApi.list();
      setUsers(list);
    } catch {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    const cached = getCachedDepartments() as ApiDepartment[] | null;
    if (cached?.length) {
      setDepartments(cached);
      return;
    }
    try {
      const { departments: list } = await departmentsApi.list();
      setDepartments(list);
      setCachedDepartments(list);
    } catch {
      setDepartments([]);
    }
  }, []);

  const fetchRoleOptions = useCallback(async () => {
    const cached = getCachedRolesAssignable() as ApiRoleOption[] | null;
    if (cached?.length) {
      setRoleOptions(cached);
      return;
    }
    try {
      const { roles: list } = await rolesApi.listAssignable();
      setRoleOptions(list);
      setCachedRolesAssignable(list);
    } catch {
      setRoleOptions([]);
    }
  }, []);

  const fetchPlacements = useCallback(async () => {
    try {
      const { placements: list } = await placementsApi.list();
      setPlacements(list);
    } catch {
      setPlacements([]);
    }
  }, []);

  /** Placements whose name starts with PEP (exclude HOPE) for PEP role dropdown */
  const pepPlacements = placements.filter(p => p.name.toUpperCase().startsWith('PEP') && !p.name.toUpperCase().startsWith('HOPE'));

  /** HOPE placements: name starts with HOPE; display as ELITE, NONELITE (strip "HOPE-" prefix) */
  const hopePlacements = placements
    .filter(p => p.name.toUpperCase().startsWith('HOPE'))
    .map(p => ({ ...p, displayName: p.name.replace(/^HOPE-?/i, '').trim() || p.name }));

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchDepartments();
      fetchRoleOptions();
      fetchPlacements();
    }
  }, [isDialogOpen, fetchDepartments, fetchRoleOptions, fetchPlacements]);

  useEffect(() => {
    if (bulkModalOpen) {
      fetchDepartments();
      fetchRoleOptions();
      fetchPlacements();
    }
  }, [bulkModalOpen, fetchDepartments, fetchRoleOptions, fetchPlacements]);

  const getDepartmentName = (deptId: string) => {
    if (!deptId) return '—';
    const dept = departments.find(d => String(d.id) === String(deptId));
    if (!dept) return '—';
    return dept.collegeId != null && dept.collegeId !== '' ? `${dept.name} - ${dept.collegeId}` : dept.name;
  };

  const canCreate = hasPermission('user:create') || hasPermission('mentor:create');
  const canUpdate = hasPermission('user:update') || hasPermission('mentor:update');
  const canDelete = hasPermission('user:delete') || hasPermission('mentor:delete');
  const canEditPermissions = hasPermission('user:update') || currentUser?.role === 'SUPERADMIN';

  const roleOptionsForCurrentUser = currentUser?.role === 'DEPARTMENT'
    ? roleOptions.filter(r => r.role === 'MENTOR')
    : roleOptions;

  const columns: Column<ApiUser>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'staffId', header: 'Staff ID', render: (u) => u.staffId ?? '—' },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", getRoleColor(user.role))}>
          {user.role}
        </span>
      ),
    },
    {
      key: 'departmentId',
      header: 'Department',
      render: (user) => user.departmentName || getDepartmentName(user.departmentId) || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => <StatusBadge status={(user.status ?? 'active') as React.ComponentProps<typeof StatusBadge>['status']} />,
    },
    { key: 'createdAt', header: 'Created', sortable: true },
  ];

  const actions: Action<ApiUser>[] = [];
  if (canUpdate) {
    actions.push({
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: (user) => {
        setEditingUser(user);
        setFormData({
          name: user.name,
          email: user.email,
          password: '',
          role: user.role as Role,
          departmentId: user.departmentId ?? '',
          placementId: user.placementId ?? '',
          staffId: user.staffId ?? '',
        });
        setIsDialogOpen(true);
      },
    });
  }
  if (canEditPermissions) {
    actions.push({
      label: 'Edit permissions',
      icon: <Shield className="h-4 w-4" />,
      onClick: async (user) => {
        setPermissionsUser(user);
        setIsPermissionsDialogOpen(true);
        setPermissionsLoading(true);
        try {
          const [permRes, userPermRes] = await Promise.all([
            permissionsApi.list(),
            usersApi.getPermissions(user.id),
          ]);
          setPermissionsList(permRes.permissions);
          setPermissionsFormData(userPermRes.permissions ?? []);
        } catch {
          toast.error('Failed to load permissions');
          setIsPermissionsDialogOpen(false);
        } finally {
          setPermissionsLoading(false);
        }
      },
    });
  }
  if (canDelete) {
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: async (user) => {
        try {
          await usersApi.delete(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
          toast.success(`${user.name} has been deleted`);
        } catch {
          toast.error('Failed to delete user');
        }
      },
    });
  }

  const handleSubmit = async () => {
    const isDepartmentView = currentUser?.role === 'DEPARTMENT';
    const role = isDepartmentView ? 'MENTOR' : formData.role;
    const departmentId = isDepartmentView ? currentUser?.departmentId : (formData.departmentId || undefined);
    if (!formData.name?.trim() || !formData.email?.trim() || (!isDepartmentView && !role)) return;
    if (!formData.staffId?.trim()) {
      toast.error('Staff ID is required');
      return;
    }
    try {
      if (editingUser) {
        const placementId = (formData.role === 'PEP' || formData.role === 'HOPE') ? (formData.placementId || undefined) : undefined;
        await usersApi.update(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role,
          departmentId,
          placementId,
          staffId: formData.staffId,
        });
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData, role, departmentId: departmentId ?? '', placementId: placementId ?? '', staffId: formData.staffId } : u));
        toast.success(currentUser?.role === 'DEPARTMENT' ? 'Mentor updated successfully' : 'User updated successfully');
      } else {
        const placementId = (formData.role === 'PEP' || formData.role === 'HOPE') ? (formData.placementId || undefined) : undefined;
        const { user: created } = await usersApi.create({
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          role,
          departmentId,
          placementId,
          staffId: formData.staffId,
        });
        setUsers(prev => [...prev, created]);
        toast.success(isDepartmentView ? 'Mentor created successfully' : 'User created successfully');
      }
      handleCloseDialog();
    } catch (e) {
      toast.error(editingUser ? 'Failed to update user' : 'Failed to create user');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    const defaultDept = currentUser?.role === 'DEPARTMENT' ? (currentUser?.departmentId ?? '') : '';
    setFormData({ name: '', email: '', password: '', role: currentUser?.role === 'DEPARTMENT' ? 'MENTOR' : '', departmentId: defaultDept, placementId: '', staffId: '' });
  };

  const toggleUserPermission = (perm: string, allPermissionStrings: string[]) => {
    const isAdding = !permissionsFormData.includes(perm);
    const [resource, action] = perm.split(':');
    const needsRead = isAdding && resource && ['create', 'update', 'delete', 'bulk_create'].includes(action);
    const readPerm = resource ? `${resource}:read` : null;
    const hasReadInList = readPerm && allPermissionStrings.includes(readPerm);
    setPermissionsFormData(prev => {
      let next = isAdding ? [...prev, perm] : prev.filter(p => p !== perm);
      if (needsRead && hasReadInList && readPerm && !next.includes(readPerm)) next = [...next, readPerm];
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser) return;
    try {
      await usersApi.updatePermissions(permissionsUser.id, { permissions: permissionsFormData });
      toast.success(`Permissions updated for ${permissionsUser.name}`);
      setIsPermissionsDialogOpen(false);
      setPermissionsUser(null);
      setPermissionsFormData([]);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update permissions');
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <UsersIcon className="h-6 w-6 text-primary" />
            {currentUser?.role === 'DEPARTMENT' ? 'Mentors' : 'User Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {getUsersPageDescription(currentUser?.role)}
          </p>
        </div>
        {(canCreate) && (
          <div className="flex items-center gap-2">
            <Button onClick={() => {
              setFormData({
                name: '',
                email: '',
                password: '',
                role: currentUser?.role === 'DEPARTMENT' ? 'MENTOR' : '',
                departmentId: currentUser?.departmentId ?? '',
                placementId: '',
                staffId: '',
              });
              setIsDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              {currentUser?.role === 'DEPARTMENT' ? 'Add Mentor' : 'Add User'}
            </Button>
            <Button variant="outline" onClick={() => {
              setBulkModalOpen(true);
              setBulkFile(null);
              setBulkResult(null);
              setBulkRole(currentUser?.role === 'DEPARTMENT' ? 'MENTOR' : '');
              setBulkDepartmentId(currentUser?.departmentId ?? '');
              setBulkPlacementId('');
            }}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <BallBouncingLoader />
        </div>
      ) : (
        <div className="neo-card p-0 overflow-hidden">
          <DataTable
            data={users}
            columns={columns}
            actions={actions.length > 0 ? actions : undefined}
            searchPlaceholder="Search users..."
            searchKeys={['name', 'email', 'role']}
            emptyMessage="No users found"
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              {editingUser ? (currentUser?.role === 'DEPARTMENT' ? 'Edit Mentor' : 'Edit User') : (currentUser?.role === 'DEPARTMENT' ? 'Add New Mentor' : 'Add New User')}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update the information below' : currentUser?.role === 'DEPARTMENT' ? 'Fill in the details to add a mentor to your department' : 'Fill in the details to create a new user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                className="bg-secondary/50 border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                disabled={!!editingUser}
                className="bg-secondary/50 border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID</Label>
              <Input
                id="staffId"
                value={formData.staffId}
                onChange={e => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                placeholder="e.g. ST001"
                className="bg-secondary/50 border-input"
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave blank to set later"
                  className="bg-secondary/50 border-input"
                />
              </div>
            )}
            {currentUser?.role !== 'DEPARTMENT' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={value => setFormData(prev => ({
                      ...prev,
                      role: value,
                      departmentId: value === 'DEPARTMENT' ? prev.departmentId : '',
                      placementId: (value === 'PEP' || value === 'HOPE') ? prev.placementId : '',
                    }))}
                  >
                    <SelectTrigger id="role" className="bg-secondary/50 border-input">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptionsForCurrentUser.map(role => (
                        <SelectItem key={role.id} value={role.role}>
                          {roleToLabel(role.role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'DEPARTMENT' && (
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={formData.departmentId || undefined}
                      onValueChange={value => setFormData(prev => ({ ...prev, departmentId: value }))}
                    >
                      <SelectTrigger id="department" className="bg-secondary/50 border-input">
                        <SelectValue placeholder="Select department">
                          {formData.departmentId ? (() => {
                            const dept = departments.find(d => String(d.id) === String(formData.departmentId));
                            return dept
                              ? (dept.collegeId != null && dept.collegeId !== '' ? `${dept.name} - ${dept.collegeId}` : dept.name)
                              : null;
                          })() : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.collegeId != null && dept.collegeId !== ''
                              ? `${dept.name} - ${dept.collegeId}`
                              : dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.role === 'HOPE' && (
                  <div className="space-y-2">
                    <Label htmlFor="hope-placement">Placement</Label>
                    <Select
                      value={formData.placementId || undefined}
                      onValueChange={value => setFormData(prev => ({ ...prev, placementId: value }))}
                    >
                      <SelectTrigger id="hope-placement" className="bg-secondary/50 border-input">
                        <SelectValue placeholder="Select (ELITE / NONELITE)" />
                      </SelectTrigger>
                      <SelectContent>
                        {hopePlacements.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.role === 'PEP' && (
                  <div className="space-y-2">
                    <Label htmlFor="placement">Placement</Label>
                    <Select
                      value={formData.placementId || undefined}
                      onValueChange={value => setFormData(prev => ({ ...prev, placementId: value }))}
                    >
                      <SelectTrigger id="placement" className="bg-secondary/50 border-input">
                        <SelectValue placeholder="Select placement" />
                      </SelectTrigger>
                      <SelectContent>
                        {pepPlacements.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="border-border">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name?.trim() || !formData.email?.trim() || (currentUser?.role !== 'DEPARTMENT' && !formData.role)}
            >
              {editingUser ? 'Save Changes' : currentUser?.role === 'DEPARTMENT' ? 'Create Mentor' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Users Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Upload Users
            </DialogTitle>
            <DialogDescription>
              File must have <strong>name</strong>, <strong>email</strong>, and <strong>staff_id</strong>. Optional: <strong>password</strong>, <strong>phone</strong>. Select Role and Department below (and Placement for PEP/HOPE).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={bulkRole} onValueChange={v => { setBulkRole(v); setBulkPlacementId(''); }}>
                  <SelectTrigger className="bg-secondary/50 border-input"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roleOptionsForCurrentUser.map(r => (
                      <SelectItem key={r.id} value={r.role}>{roleToLabel(r.role)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {bulkRole && bulkRole !== 'PEP' && bulkRole !== 'HOPE' && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={bulkDepartmentId} onValueChange={setBulkDepartmentId}>
                    <SelectTrigger className="bg-secondary/50 border-input"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.collegeId != null && dept.collegeId !== '' ? `${dept.name} - ${dept.collegeId}` : dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {bulkRole === 'HOPE' && (
                <div className="space-y-2">
                  <Label>Placement</Label>
                  <Select value={bulkPlacementId} onValueChange={setBulkPlacementId}>
                    <SelectTrigger className="bg-secondary/50 border-input"><SelectValue placeholder="ELITE / NONELITE" /></SelectTrigger>
                    <SelectContent>
                      {hopePlacements.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {bulkRole === 'PEP' && (
                <div className="space-y-2">
                  <Label>Placement</Label>
                  <Select value={bulkPlacementId} onValueChange={setBulkPlacementId}>
                    <SelectTrigger className="bg-secondary/50 border-input"><SelectValue placeholder="Select placement" /></SelectTrigger>
                    <SelectContent>
                      {pepPlacements.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              File columns: <strong>name</strong>, <strong>email</strong>, <strong>staff_id</strong> (required); <strong>password</strong>, <strong>phone</strong> (optional)
            </p>
            <a
              href="data:text/csv;charset=utf-8,name%2Cemail%2Cpassword%2Cphone%2Cstaff_id%0AJohn%20Doe%2Cjohn%40example.com%2Cadmin%40123%2C%2B919876543210%2CST001"
              download="users_bulk_template.csv"
              className="text-sm text-primary hover:underline block"
            >
              Download sample template (CSV)
            </a>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setBulkFile(f); e.target.value = ''; }}
            />
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-muted/30'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-primary', 'bg-muted/30'); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary', 'bg-muted/30');
                const f = e.dataTransfer.files?.[0];
                if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.type.includes('spreadsheet') || f.type === 'text/csv'))
                  setBulkFile(f);
              }}
              onClick={() => bulkFileInputRef.current?.click()}
            >
              {bulkFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium">{bulkFile.name}</span>
                  <button type="button" className="ml-2 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setBulkFile(null); }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Drag and drop Excel or CSV here, or click to browse</p>
              )}
            </div>
            {bulkResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">
                  Uploaded: <span className="text-green-600">{bulkResult.successCount} succeeded</span>
                  {bulkResult.failedRows.length > 0 && <span className="text-destructive">, {bulkResult.failedRows.length} failed</span>}
                </p>
                {bulkResult.failedRows.length > 0 && bulkResult.failedRows.length <= 20 && (
                  <div className="text-xs overflow-auto max-h-32">
                    <table className="w-full">
                      <thead><tr className="border-b"><th className="text-left py-1">Row</th><th className="text-left py-1">Reason</th></tr></thead>
                      <tbody>
                        {bulkResult.failedRows.map((r, i) => (
                          <tr key={i} className="border-b"><td className="py-1">{r.row}</td><td className="py-1">{r.reason}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {bulkResult.failedRows.length > 20 && (
                  <p className="text-xs text-muted-foreground">First 20 failures shown; total {bulkResult.failedRows.length} failed rows.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkModalOpen(false)} className="border-border">Close</Button>
            <Button
              disabled={!bulkFile || bulkUploading || !bulkRole || (bulkRole !== 'PEP' && bulkRole !== 'HOPE' && !bulkDepartmentId)}
              onClick={async () => {
                if (!bulkFile) return;
                if (!bulkRole) return;
                if (bulkRole !== 'PEP' && bulkRole !== 'HOPE' && !bulkDepartmentId) return;
                setBulkUploading(true);
                setBulkResult(null);
                try {
                  const result = await uploadBulkUsers(
                    bulkFile,
                    bulkRole,
                    bulkRole !== 'PEP' && bulkRole !== 'HOPE' ? bulkDepartmentId : undefined,
                    (bulkRole === 'PEP' || bulkRole === 'HOPE') && bulkPlacementId ? bulkPlacementId : undefined
                  );
                  setBulkResult(result);
                  if (result.successCount > 0) {
                    fetchUsers();
                    toast.success(`${result.successCount} user(s) added`);
                  }
                } catch (e) {
                  toast.error('Bulk upload failed');
                  setBulkResult({ successCount: 0, failedRows: [{ row: 0, reason: (e as Error).message }] });
                } finally {
                  setBulkUploading(false);
                }
              }}
            >
              {bulkUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-muted/30">
            <DialogTitle className="text-xl flex items-center gap-2 font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              <Shield className="h-5 w-5 text-primary" />
              Edit user permissions
            </DialogTitle>
            <DialogDescription>
              {permissionsUser
                ? `Set permissions for ${permissionsUser.name} (${permissionsUser.email}). Same structure as role-wise permissions; these override the role for this user.`
                : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {permissionsLoading ? (
              <div className="flex justify-center py-8">
                <BallBouncingLoader />
              </div>
            ) : (
              <div className="space-y-5">
                {groupPermissionsByCategory(permissionsList).map(({ category, label, permissions: perms }) => (
                  <section
                    key={category}
                    className="rounded-xl border bg-card p-4 shadow-sm hover:border-primary/20"
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b capitalize">{label}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                      {perms.map(p => (
                        <label
                          key={p.id}
                          htmlFor={`user-perm-${p.id}`}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/60 ${permissionsFormData.includes(p.permission) ? 'bg-primary/10' : ''}`}
                        >
                          <Checkbox
                            id={`user-perm-${p.id}`}
                            checked={permissionsFormData.includes(p.permission)}
                            onCheckedChange={() => toggleUserPermission(p.permission, permissionsList.map(x => x.permission))}
                            className="shrink-0"
                          />
                          <span className="text-sm font-medium select-none">{permissionToLabel(p.permission)}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
            <Button variant="outline" onClick={() => { setIsPermissionsDialogOpen(false); setPermissionsUser(null); }} className="border-border">Cancel</Button>
            <Button onClick={handleSavePermissions} disabled={permissionsLoading}>Save permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

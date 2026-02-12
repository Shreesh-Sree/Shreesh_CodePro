import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PencilSimple as Pencil, Trash as Trash2, Student, UploadSimple as Upload, CircleNotch as Loader2, FileCsv as FileSpreadsheet, X, CaretDown, Funnel, UserMinus, BookOpen, UserPlus, Warning as AlertTriangle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { DataTable, Column, Action } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Can, usePermission } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { studentsApi, departmentsApi, usersApi, uploadBulkFile, uploadBulkPlacement, ApiStudent, ApiDepartment, ApiUser } from '@/lib/api';
import { getCachedDepartments, setCachedDepartments } from '@/lib/storage';
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
import { toast } from 'sonner';

function studentIdToRouteId(studentId: string): string {
  const match = studentId.match(/^stu_(\d+)$/);
  return match ? match[1] : studentId;
}

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [mentorUsers, setMentorUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ApiStudent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    registrationNo: '',
    rollNumber: '',
    departmentId: '',
    mentorId: '',
    batchId: '',
    batchYear: '',
  });
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkDepartmentId, setBulkDepartmentId] = useState('');
  const [bulkYear, setBulkYear] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failedRows: { row: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignMentorSelectionMode, setAssignMentorSelectionMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [assignMentorOpen, setAssignMentorOpen] = useState(false);
  const [assignMentorId, setAssignMentorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [bulkUnassignSelectionMode, setBulkUnassignSelectionMode] = useState(false);
  const [bulkUnassigning, setBulkUnassigning] = useState(false);
  const [unassignConfirmStudent, setUnassignConfirmStudent] = useState<ApiStudent | null>(null);

  const isHopeOrPep = user?.role === 'HOPE' || user?.role === 'PEP';
  const [placementRegistrationNo, setPlacementRegistrationNo] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      const { students: list } = await studentsApi.list();
      setStudents(list);
    } catch {
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasMentorPermission = hasPermission('mentor:read') || hasPermission('mentor:create') || hasPermission('mentor:update') || hasPermission('mentor:delete');

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const cached = getCachedDepartments() as ApiDepartment[] | null;
    if (cached?.length) {
      setDepartments(cached);
      return;
    }
    departmentsApi.list().then(({ departments: d }) => {
      setDepartments(d);
      setCachedDepartments(d);
    }).catch(() => setDepartments([]));
  }, []);

  const canAssignMentorPermission = hasPermission('student:update') || hasPermission('mentor:update');
  useEffect(() => {
    if (hasMentorPermission || canAssignMentorPermission) {
      usersApi.list().then(({ users: u }) => setMentorUsers(u.filter(x => x.role === 'MENTOR'))).catch(() => setMentorUsers([]));
    } else {
      setMentorUsers([]);
    }
  }, [hasMentorPermission, canAssignMentorPermission]);

  const getDepartmentName = (deptId: string) => (departments.find(d => d.id === deptId)?.name ?? deptId) || '—';
  const getMentorName = (mentorId: string) => mentorUsers.find(u => u.id === mentorId)?.name ?? '—';

  const handleUnassign = async (student: ApiStudent) => {
    try {
      await studentsApi.unassignFromPlacement(student.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      setUnassignConfirmStudent(null);
      toast.success('Student unassigned from your class');
    } catch {
      toast.error('Failed to unassign student');
    }
  };

  const columns: Column<ApiStudent>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'rollNumber', header: 'Registration No.', render: (s) => s.registrationNo ?? '—' },
    { key: 'phone', header: 'Phone', render: (s) => s.phone ?? '—' },
    { key: 'mentorId', header: 'Mentor', render: (s) => (s.mentorName != null && s.mentorName !== '' ? s.mentorName : s.mentorId ? getMentorName(s.mentorId) : '—') },
    { key: 'departmentId', header: 'Department', render: (s) => getDepartmentName(s.departmentId) },
    { key: 'placementId', header: 'Placement', render: (s) => (s.placementName != null && s.placementName !== '' ? s.placementName : '—') },
    { key: 'batchYear', header: 'Batch', sortable: true },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={((s.status ?? 'active') as React.ComponentProps<typeof StatusBadge>['status'])} /> },
    ...((user?.role === 'PEP' || user?.role === 'HOPE') && hasPermission('student:unassign_from_placement')
      ? [{
        key: 'unassign',
        header: '',
        render: (s) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={(e) => { e.stopPropagation(); setUnassignConfirmStudent(s); }}
          >
            <UserMinus className="h-4 w-4" />
            Unassign
          </Button>
        ),
      } as Column<ApiStudent>]
      : []),
  ];

  const canBulkUnassign = isHopeOrPep && hasPermission('student:unassign_from_placement');

  const actions: Action<ApiStudent>[] = [];
  const canUpdateStudent = hasPermission('student:update') || hasPermission('mentor:update');
  if (!canBulkUnassign) {
    if (canUpdateStudent) {
      actions.push({
        label: 'Edit',
        icon: <Pencil className="h-4 w-4" />,
        onClick: (student) => {
          setEditingStudent(student);
          setFormData({
            name: student.name,
            email: student.email,
            password: '',
            phone: student.phone ?? '',
            registrationNo: student.registrationNo ?? '',
            rollNumber: student.rollNumber ?? '',
            departmentId: student.departmentId ?? '',
            mentorId: student.mentorId ?? '',
            batchId: student.batchId ?? '',
            batchYear: student.batchYear ?? '',
          });
          setIsDialogOpen(true);
        },
      });
    }
    if (hasPermission('student:delete')) {
      actions.push({
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
        onClick: async (student) => {
          try {
            await studentsApi.delete(student.id);
            setStudents(prev => prev.filter(s => s.id !== student.id));
            toast.success(`${student.name} has been deleted`);
          } catch {
            toast.error('Failed to delete student');
          }
        },
      });
    }
  }

  const handleBulkUnassign = async () => {
    if (selectedStudentIds.size === 0) return;
    const ids = Array.from(selectedStudentIds);
    setBulkUnassigning(true);
    try {
      const { updated } = await studentsApi.bulkUnassignFromPlacement({ studentIds: ids });
      setSelectedStudentIds(new Set());
      setBulkUnassignSelectionMode(false);
      fetchStudents();
      toast.success(`${updated ?? ids.length} student(s) unassigned from your class`);
    } catch {
      toast.error('Failed to bulk unassign');
    } finally {
      setBulkUnassigning(false);
    }
  };

  const handleSubmit = async () => {
    if (isHopeOrPep) {
      const regNo = placementRegistrationNo.trim();
      if (!regNo) return;
      try {
        const { student } = await studentsApi.create({ registration_no: regNo });
        setStudents(prev => [...prev, student]);
        toast.success('Student assigned to your placement');
        handleCloseDialog();
      } catch (e) {
        toast.error((e as Error).message || 'Failed to assign student');
      }
      return;
    }
    if (!formData.name?.trim() || !formData.email?.trim()) return;
    try {
      if (editingStudent) {
        await studentsApi.update(editingStudent.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          registration_no: formData.registrationNo || undefined,
          roll_number: formData.rollNumber || undefined,
          departmentId: formData.departmentId || undefined,
          mentorId: formData.mentorId || undefined,
          batchId: formData.batchId || undefined,
          batchYear: formData.batchYear || undefined,
        });
        setStudents(prev => prev.map(s => (s.id === editingStudent.id ? { ...s, ...formData } : s)));
        toast.success('Student updated successfully');
      } else {
        const { student } = await studentsApi.create({
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          phone: formData.phone || undefined,
          registration_no: formData.registrationNo || undefined,
          roll_number: formData.rollNumber || undefined,
          departmentId: formData.departmentId || undefined,
          mentorId: formData.mentorId || undefined,
          batchId: formData.batchId || undefined,
          batchYear: formData.batchYear || undefined,
        });
        setStudents(prev => [...prev, student]);
        toast.success('Student created successfully');
      }
      handleCloseDialog();
    } catch {
      toast.error(editingStudent ? 'Failed to update student' : 'Failed to create student');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStudent(null);
    setPlacementRegistrationNo('');
    setFormData({ name: '', email: '', password: '', phone: '', registrationNo: '', rollNumber: '', departmentId: '', mentorId: '', batchId: '', batchYear: '' });
  };

  const canAssignMentor = hasPermission('student:update') || hasPermission('mentor:update');
  const handleBulkAssignMentor = async () => {
    if (selectedStudentIds.size === 0 || !assignMentorId) return;
    setAssigning(true);
    try {
      await studentsApi.bulkAssignMentor({
        studentIds: Array.from(selectedStudentIds),
        mentorId: assignMentorId,
      });
      setSelectedStudentIds(new Set());
      setAssignMentorSelectionMode(false);
      setAssignMentorOpen(false);
      setAssignMentorId('');
      fetchStudents();
      toast.success(`Mentor assigned to ${selectedStudentIds.size} student(s)`);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to assign mentor');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <BookOpen className="h-6 w-6 text-primary" />
            Students
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage student records</p>
        </div>
        <div className="flex items-center gap-2">
          <Can permission="student:create">
            <Button onClick={() => { setPlacementRegistrationNo(''); setFormData({ name: '', email: '', password: '', phone: '', registrationNo: '', rollNumber: '', departmentId: '', mentorId: '', batchId: '', batchYear: '' }); setEditingStudent(null); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {isHopeOrPep ? 'Add Student to Placement' : 'Add Student'}
            </Button>
          </Can>
          <Can permission="student:bulk_create">
            <Button variant="outline" onClick={() => { setBulkModalOpen(true); setBulkFile(null); setBulkResult(null); setBulkDepartmentId(''); setBulkYear(''); }}>
              <Upload className="mr-2 h-4 w-4" />
              {isHopeOrPep ? 'Bulk Add to Placement' : 'Bulk Upload'}
            </Button>
          </Can>
          {canAssignMentor && (
            assignMentorSelectionMode ? (
              <>
                <Button variant="outline" onClick={() => { setAssignMentorSelectionMode(false); setSelectedStudentIds(new Set()); }}>
                  Cancel
                </Button>
                {selectedStudentIds.size > 0 && (
                  <Button variant="secondary" onClick={() => setAssignMentorOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign mentor ({selectedStudentIds.size})
                  </Button>
                )}
              </>
            ) : (
              <Button variant="secondary" onClick={() => { setAssignMentorSelectionMode(true); setBulkUnassignSelectionMode(false); setSelectedStudentIds(new Set()); }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign mentor
              </Button>
            )
          )}
          {canBulkUnassign && (
            bulkUnassignSelectionMode ? (
              <>
                <Button variant="outline" onClick={() => { setBulkUnassignSelectionMode(false); setSelectedStudentIds(new Set()); }}>
                  Cancel
                </Button>
                {selectedStudentIds.size > 0 && (
                  <Button variant="secondary" onClick={handleBulkUnassign} disabled={bulkUnassigning}>
                    {bulkUnassigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserMinus className="mr-2 h-4 w-4" />}
                    Bulk Unassign ({selectedStudentIds.size})
                  </Button>
                )}
              </>
            ) : (
              <Button variant="secondary" onClick={() => { setBulkUnassignSelectionMode(true); setAssignMentorSelectionMode(false); setSelectedStudentIds(new Set()); }}>
                <UserMinus className="mr-2 h-4 w-4" />
                Bulk Unassign
              </Button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <BallBouncingLoader />
        </div>
      ) : (
        <div className="neo-card p-0 overflow-hidden">
          <DataTable
            data={students}
            columns={columns}
            actions={canBulkUnassign ? undefined : (actions.length > 0 ? actions : undefined)}
            searchPlaceholder="Search students..."
            searchKeys={['name', 'email']}
            emptyMessage="No students found"
            onRowClick={(student) => navigate(`/student/${studentIdToRouteId(student.id)}`)}
            selectedIds={(canAssignMentor && assignMentorSelectionMode) || (canBulkUnassign && bulkUnassignSelectionMode) ? selectedStudentIds : undefined}
            onSelectionChange={(canAssignMentor && assignMentorSelectionMode) || (canBulkUnassign && bulkUnassignSelectionMode) ? setSelectedStudentIds : undefined}
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              {isHopeOrPep ? 'Add Student to Placement' : editingStudent ? 'Edit Student' : 'Add New Student'}
            </DialogTitle>
            <DialogDescription>
              {isHopeOrPep
                ? 'Student must already exist. Enter their registration number to assign them to your placement.'
                : editingStudent ? 'Update the student information below' : 'Fill in the details to add a new student'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isHopeOrPep ? (
              <div className="space-y-2">
                <Label htmlFor="registration_no">Registration number</Label>
                <Input
                  id="registration_no"
                  value={placementRegistrationNo}
                  onChange={e => setPlacementRegistrationNo(e.target.value)}
                  placeholder="Enter registration number"
                  className="bg-secondary/50 border-input"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter full name" className="bg-secondary/50 border-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="student@example.com" disabled={!!editingStudent && user?.role !== 'SUPERADMIN'} className="bg-secondary/50 border-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone number" className="bg-secondary/50 border-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNo">Registration number</Label>
                  <Input
                    id="registrationNo"
                    value={formData.registrationNo}
                    onChange={e => setFormData(prev => ({ ...prev, registrationNo: e.target.value }))}
                    placeholder="e.g. 312324104001"
                    className="bg-secondary/50 border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll number</Label>
                  <Input
                    id="rollNumber"
                    value={formData.rollNumber}
                    onChange={e => setFormData(prev => ({ ...prev, rollNumber: e.target.value }))}
                    placeholder="e.g. 24CS001"
                    className="bg-secondary/50 border-input"
                  />
                </div>
                {!editingStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (optional)</Label>
                    <Input id="password" type="password" value={formData.password} onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="Leave blank to set later" className="bg-secondary/50 border-input" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.departmentId} onValueChange={v => setFormData(prev => ({ ...prev, departmentId: v }))}>
                    <SelectTrigger id="department" className="bg-secondary/50 border-input"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchYear">Year (batch)</Label>
                  <Select value={formData.batchYear} onValueChange={v => setFormData(prev => ({ ...prev, batchYear: v }))}>
                    <SelectTrigger id="batchYear" className="bg-secondary/50 border-input"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canUpdateStudent && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="mentor">Mentor</Label>
                    {mentorUsers.length > 0 ? (
                      <Select value={formData.mentorId} onValueChange={v => setFormData(prev => ({ ...prev, mentorId: v }))}>
                        <SelectTrigger id="mentor" className="bg-secondary/50 border-input"><SelectValue placeholder="Select mentor" /></SelectTrigger>
                        <SelectContent>
                          {mentorUsers.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No mentors available</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="border-border">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isHopeOrPep ? !placementRegistrationNo.trim() : (!formData.name?.trim() || !formData.email?.trim())}
            >
              {isHopeOrPep ? 'Add to Placement' : editingStudent ? 'Save Changes' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign confirmation modal */}
      <Dialog open={!!unassignConfirmStudent} onOpenChange={(open) => { if (!open) setUnassignConfirmStudent(null); }}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-md">
          <div className="flex flex-col items-center justify-center gap-4 pt-2 pb-2 text-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-500" aria-hidden />
            </div>
            <DialogHeader className="space-y-2 flex flex-col items-center text-center">
              <DialogTitle className="text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>Unassign student</DialogTitle>
              <DialogDescription className="text-base sm:text-lg text-center">
                Are you sure that you want to unassign?
              </DialogDescription>
              {unassignConfirmStudent && (
                <p className="text-base sm:text-lg font-medium text-foreground pt-1 text-center">
                  {unassignConfirmStudent.name} – {unassignConfirmStudent.registrationNo || '—'}
                </p>
              )}
            </DialogHeader>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row justify-center sm:!justify-center w-full self-stretch">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-border" onClick={() => setUnassignConfirmStudent(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => unassignConfirmStudent && handleUnassign(unassignConfirmStudent)}
              >
                Unassign
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              <FileSpreadsheet className="h-5 w-5" />
              {isHopeOrPep ? 'Bulk Add Students to Placement' : 'Bulk Upload Students'}
            </DialogTitle>
            <DialogDescription>
              {isHopeOrPep
                ? 'File must have a <strong>registration_no</strong> column. Students must already exist; their placement will be set to yours.'
                : 'File must have <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, and optional <strong>roll_number</strong> (e.g. 24CS155). Select Department and Year below; mentor can be assigned later.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isHopeOrPep && (
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="bulk-year">Year (batch)</Label>
                  <Select value={bulkYear} onValueChange={setBulkYear}>
                    <SelectTrigger id="bulk-year" className="bg-secondary/50 border-input"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {isHopeOrPep ? <>File column: <strong>registration_no</strong></> : <>File columns: <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, <strong>roll_number</strong> (optional, e.g. 24CS155)</>}
            </p>
            {isHopeOrPep ? (
              <a
                href="data:text/csv;charset=utf-8,registration_no%0A2024001%0A2024002"
                download="placement_registration_no_template.csv"
                className="text-sm text-primary hover:underline block"
              >
                Download sample template (CSV)
              </a>
            ) : (
              <a
                href="data:text/csv;charset=utf-8,name%2Cemail%2Cphone%2Croll_number%0AJohn%20Doe%2Cjohn%40codepro.com%2C%2B919876543210%2C24CS155"
                download="students_bulk_template.csv"
                className="text-sm text-primary hover:underline block"
              >
                Download sample template (CSV)
              </a>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setBulkFile(f);
                e.target.value = '';
              }}
            />
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-muted/30'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-muted/30'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary', 'bg-muted/30');
                const f = e.dataTransfer.files?.[0];
                if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.type.includes('spreadsheet') || f.type === 'text/csv'))
                  setBulkFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {bulkFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium">{bulkFile.name}</span>
                  <button
                    type="button"
                    className="ml-2 p-1 rounded hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); setBulkFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Drag and drop Excel or CSV here, or click to browse
                </p>
              )}
            </div>
            {bulkResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">
                  Uploaded: <span className="text-green-600">{bulkResult.successCount} succeeded</span>
                  {bulkResult.failedRows.length > 0 && (
                    <span className="text-destructive">, {bulkResult.failedRows.length} failed</span>
                  )}
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
              disabled={!bulkFile || bulkUploading || (!isHopeOrPep && (!bulkDepartmentId || !bulkYear.trim()))}
              onClick={async () => {
                if (!bulkFile) return;
                if (!isHopeOrPep && (!bulkDepartmentId || !bulkYear.trim())) return;
                setBulkUploading(true);
                setBulkResult(null);
                try {
                  const result = isHopeOrPep
                    ? await uploadBulkPlacement(bulkFile)
                    : await uploadBulkFile(bulkFile, bulkDepartmentId, bulkYear.trim());
                  setBulkResult(result);
                  if (result.successCount > 0) {
                    fetchStudents();
                    toast.success(isHopeOrPep ? `${result.successCount} student(s) added to placement` : `${result.successCount} students added`);
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

      {/* Assign mentor to selected students (Department / Admin) */}
      <Dialog open={assignMentorOpen} onOpenChange={setAssignMentorOpen}>
        <DialogContent className="neo-card-flat border border-border shadow-none animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              <UserPlus className="h-5 w-5" />
              Assign mentor to {selectedStudentIds.size} student(s)
            </DialogTitle>
            <DialogDescription>
              Select a mentor. Only mentors in your department are shown when logged in as Department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mentor</Label>
              {mentorUsers.length > 0 ? (
                <Select value={assignMentorId} onValueChange={setAssignMentorId}>
                  <SelectTrigger className="bg-secondary/50 border-input"><SelectValue placeholder="Select mentor" /></SelectTrigger>
                  <SelectContent>
                    {mentorUsers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No mentors available in your department.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignMentorOpen(false)} className="border-border">Cancel</Button>
            <Button onClick={handleBulkAssignMentor} disabled={!assignMentorId || assigning || mentorUsers.length === 0}>
              {assigning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning…</> : 'Assign mentor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

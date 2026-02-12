/**
 * API client for backend. Uses credentials: 'include' so cookies (JWT) are sent.
 * Vite proxy forwards /api to the backend in development.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export type LoginBody =
  | { email: string; password: string }
  | { userId?: string; role?: string };

export const authApi = {
  login: (body: LoginBody) =>
    api<{ user: { id: string; name: string; email: string; role: string; permissions: string[]; studentId?: string; departmentId?: string; collegeId?: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(body) }
    ),
  me: () =>
    api<{ user: { id: string; name: string; email: string; role: string; permissions: string[]; departmentId?: string; collegeId?: string; studentId?: string } }>(
      '/api/auth/me'
    ),
  logout: () => api<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
};

export interface ApiDepartment {
  id: string;
  name: string;
  code: string;
  department_code?: string;
  collegeId?: string;
  collegeName?: string;
}

export const departmentsApi = {
  list: () => api<{ departments: ApiDepartment[] }>('/api/departments'),
  create: (body: { name: string; code?: string; collegeId?: string }) => api<{ department: ApiDepartment }>('/api/departments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; code?: string; collegeId?: string }) => api<{ success: boolean }>(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/departments/${id}`, { method: 'DELETE' }),
};

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string;
  /** Department display name (from API); e.g. "Computer Science - CSE" */
  departmentName?: string;
  /** Set for PEP (and HOPE) users; placement option id */
  placementId?: string;
  /** Placement display name (from API) */
  placementName?: string;
  /** Staff ID (e.g. for mentors/staff users) */
  staffId?: string;
  createdAt?: string;
  status?: string;
}

export const usersApi = {
  list: () => api<{ users: ApiUser[] }>('/api/users'),
  create: (body: { name: string; email: string; password?: string; role?: string; departmentId?: string; placementId?: string; staffId?: string }) =>
    api<{ user: ApiUser }>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; email?: string; role?: string; departmentId?: string; placementId?: string; staffId?: string }) =>
    api<{ success: boolean }>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),
  getPermissions: (id: string) => api<{ permissions: string[] }>(`/api/users/${id}/permissions`),
  updatePermissions: (id: string, body: { permissions: string[] }) =>
    api<{ success: boolean }>(`/api/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify(body) }),
};

export interface ApiCollege {
  id: string;
  name: string;
  code?: string;
  college_code?: number;
}

export const collegesApi = {
  list: () => api<{ colleges: ApiCollege[] }>('/api/colleges'),
  create: (body: { name: string; code?: string }) => api<{ college: ApiCollege }>('/api/colleges', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; code?: string }) => api<{ success: boolean }>(`/api/colleges/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/colleges/${id}`, { method: 'DELETE' }),
};

export interface ApiPlacement {
  id: string;
  name: string;
}

export const placementsApi = {
  list: () => api<{ placements: ApiPlacement[] }>('/api/placements'),
  create: (body: { name: string }) => api<{ placement: ApiPlacement }>('/api/placements', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string }) => api<{ success: boolean }>(`/api/placements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/placements/${id}`, { method: 'DELETE' }),
};

export interface ApiStudent {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  registrationNo?: string;
  rollNumber?: string;
  departmentId: string;
  placementId?: string;
  placementName?: string;
  batchId?: string;
  batchYear?: string;
  mentorId: string;
  /** Allocated mentor name (included when user has student:read; avoids needing mentor:read to show mentor on student) */
  mentorName?: string;
  status?: string;
}

export interface ApiStudentProgress {
  studentId: string;
  userId?: string;
  questionsSolved: number;
  totalAttempts: number;
  courses: unknown[];
  coding?: { totalSubmissions: number; solvedCount: number };
  tests?: {
    attempted: number;
    completed: number;
    distinctTests: number;
    codingTestsAttempted: number;
    codingTestsCompleted: number;
    mcqTestsAttempted: number;
    mcqTestsCompleted: number;
  };
  recentResults?: {
    testId: number;
    testName: string;
    testType: string;
    totalMarks: number | null;
    maxMarks: number | null;
    attemptedAt: string | null;
  }[];
  categoryStats?: {
    categoryId: number | null;
    categoryName: string;
    solved: number;
    total: number;
    percentage: number;
  }[];
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

export const studentsApi = {
  list: () => api<{ students: ApiStudent[] }>('/api/students'),
  getById: (id: string) => api<{ student: ApiStudent }>(`/api/students/${id}`),
  create: (body: { name?: string; email?: string; password?: string; phone?: string; departmentId?: string; mentorId?: string; batchId?: string; batchYear?: string; placementId?: string; registration_no?: string; roll_number?: string }) =>
    api<{ student: ApiStudent }>('/api/students', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; email?: string; phone?: string; departmentId?: string; mentorId?: string; batchId?: string; batchYear?: string; placementId?: string; registration_no?: string; roll_number?: string }) =>
    api<{ success: boolean }>(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/students/${id}`, { method: 'DELETE' }),
  getProgress: (id: string) => api<{ progress: ApiStudentProgress }>(`/api/students/${id}/progress`),
  bulkAssignMentor: (body: { studentIds: string[]; mentorId: string }) =>
    api<{ success: boolean; updated?: number }>('/api/students/bulk-assign-mentor', { method: 'POST', body: JSON.stringify(body) }),
  unassignFromPlacement: (id: string) =>
    api<{ success: boolean }>(`/api/students/${id}/unassign-from-placement`, { method: 'POST' }),
  bulkUnassignFromPlacement: (body: { studentIds: string[] }) =>
    api<{ success: boolean; updated?: number }>('/api/students/bulk-unassign-from-placement', { method: 'POST', body: JSON.stringify(body) }),
};

export interface ApiActivityItem {
  timestamp: string | null;
  label: string;
  sub: string;
  time: string;
  type?: string;
}

export interface ApiLeaderboardItem {
  rank: number;
  name: string | null;
  score: number;
  badge: string;
  change: string;
}

export interface ApiChartData {
  label: string;
  v1: number;
  v2: number;
}

export interface ApiVitals {
  activeTests: number;
  placements: number;
  courses: number;
  avgScore: number;
}

export interface ApiGoals {
  passRate: number;
  attendance: number;
  completion: number;
  streak: number;
}

export interface ApiTrend {
  value: number;
  positive: boolean;
}

export interface ApiSparkline {
  colleges: number[];
  departments: number[];
  users: number[];
  students: number[];
}

export interface ApiTrends {
  colleges: ApiTrend;
  departments: ApiTrend;
  users: ApiTrend;
  students: ApiTrend;
}

export interface ApiStats {
  colleges: number;
  departments: number;
  users: number;
  students: number;
  sparklines: ApiSparkline;
  trends: ApiTrends;
  activity: ApiActivityItem[];
  leaderboard: ApiLeaderboardItem[];
  chartData: ApiChartData[];
  vitals: ApiVitals;
  goals: ApiGoals;
}

export const statsApi = {
  get: () => api<ApiStats>('/api/stats'),
};

export interface ApiAnalytics {
  departmentDistribution: { department: string; count: number }[];
}

export const analyticsApi = {
  get: () => api<ApiAnalytics>('/api/analytics'),
};

export interface ApiPermission {
  id: string;
  permission: string;
}

export interface ApiRole {
  id: string;
  role: string;
  isSystem?: boolean;
  permissionCount?: number;
  userCount?: number;
  permissions?: string[];
}

export const permissionsApi = {
  list: () => api<{ permissions: ApiPermission[] }>('/api/roles/permissions'),
};

export interface ApiRoleOption {
  id: string;
  role: string;
}

export const rolesApi = {
  list: () => api<{ roles: ApiRole[] }>('/api/roles'),
  /** Roles for user create/edit dropdown (excludes SUPERADMIN) */
  listAssignable: () => api<{ roles: ApiRoleOption[] }>('/api/roles/assignable'),
  getById: (id: string) => api<{ role: ApiRole }>(`/api/roles/${id}`),
  create: (body: { name: string; permissions: string[] }) =>
    api<{ role: ApiRole }>('/api/roles', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; permissions?: string[] }) =>
    api<{ role: ApiRole }>(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/roles/${id}`, { method: 'DELETE' }),
};

export interface UploadResult {
  successCount: number;
  failedRows: { row: number; reason: string }[];
}

export async function uploadBulkFile(file: File, departmentId: string, batchYear: string): Promise<UploadResult> {
  const API_BASE = import.meta.env.VITE_API_URL ?? '';
  const url = `${API_BASE}/api/bulk-upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('department_id', departmentId);
  formData.append('batch_year', batchYear);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Upload failed');
  }
  return res.json() as Promise<UploadResult>;
}

/** HOPE/PEP only: bulk assign existing students to placement by registration_no (file has only registration_no column). */
export async function uploadBulkPlacement(file: File): Promise<UploadResult> {
  const API_BASE = import.meta.env.VITE_API_URL ?? '';
  const url = `${API_BASE}/api/bulk-upload`;
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Upload failed');
  }
  return res.json() as Promise<UploadResult>;
}

// ========== Tags ==========
export interface ApiTag {
  id: number;
  name: string;
  categoryId?: number | null;
}
export const tagsApi = {
  list: (params?: { categoryId?: string }) => {
    const q = params?.categoryId != null ? `?categoryId=${encodeURIComponent(params.categoryId)}` : '';
    return api<{ tags: ApiTag[] }>(`/api/tags${q}`);
  },
  create: (body: { name: string; categoryId?: number | null }) =>
    api<{ tag: ApiTag }>('/api/tags', { method: 'POST', body: JSON.stringify(body) }),
};

// ========== Categories ==========
export interface ApiCategory {
  id: number;
  name: string;
  createdAt?: string;
  tags: { id: number; name: string }[];
}
export const categoriesApi = {
  list: () => api<{ categories: ApiCategory[] }>('/api/categories'),
  create: (body: { name: string; tagNames: string[] }) =>
    api<{ category: ApiCategory }>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
};

// ========== Programming languages ==========
export interface ApiProgrammingLanguage {
  id: number;
  language: string;
}
export const programmingLanguagesApi = {
  list: () => api<{ languages: ApiProgrammingLanguage[] }>('/api/programming-languages'),
};

// ========== Batches ==========
export interface ApiBatch {
  id: number;
  batchYear: string;
}
export const batchesApi = {
  list: () => api<{ batches: ApiBatch[] }>('/api/batches'),
};

// ========== Problems (coding) ==========
export interface ApiProblem {
  id: number;
  moduleId: number | null;
  title: string;
  description: string | null;
  difficulty: string | null;
  orderIndex: number | null;
  createdBy: number | null;
  isPublished: boolean;
  tagIds?: number[];
  categoryId?: number | null;
}
export const problemsApi = {
  list: (params?: { tagIds?: string; moduleId?: string; categoryId?: string }) => {
    const q = new URLSearchParams();
    if (params?.tagIds) q.set('tagIds', params.tagIds);
    if (params?.moduleId != null) q.set('moduleId', params.moduleId);
    if (params?.categoryId != null) q.set('categoryId', params.categoryId);
    const query = q.toString();
    return api<{ problems: ApiProblem[] }>(`/api/problems${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api<{ problem: ApiProblem }>(`/api/problems/${id}`),
  update: (
    id: string,
    body: {
      title?: string;
      description?: string | null;
      difficulty?: string | null;
      tagIds?: number[];
      categoryId?: number | null;
    }
  ) => api<{ problem: ApiProblem }>(`/api/problems/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  create: (body: {
    moduleId?: number | null;
    title: string;
    description?: string | null;
    difficulty?: string | null;
    orderIndex?: number | null;
    isPublished?: boolean;
    tagIds?: number[];
    categoryId?: number | null;
    testcases?: { input?: string; output?: string; isSample?: boolean }[];
  }) => api<{ problem: ApiProblem }>('/api/problems', { method: 'POST', body: JSON.stringify(body) }),
};

// ========== MCQ questions ==========
export interface ApiMcqOption {
  id: number;
  optionText: string;
  isCorrect: boolean;
}
export interface ApiMcqQuestion {
  id: number;
  question: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  maxMarks: number;
  createdBy: number | null;
  createdAt?: string;
  options: ApiMcqOption[];
  tagIds: number[];
  categoryId?: number | null;
}
export const mcqQuestionsApi = {
  list: (params?: { tagIds?: string; categoryId?: string }) => {
    const q = new URLSearchParams();
    if (params?.tagIds) q.set('tagIds', params.tagIds);
    if (params?.categoryId != null) q.set('categoryId', params.categoryId);
    const query = q.toString();
    return api<{ questions: ApiMcqQuestion[] }>(`/api/mcq-questions${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => api<{ question: ApiMcqQuestion }>(`/api/mcq-questions/${id}`),
  create: (body: {
    question: string;
    questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    maxMarks?: number;
    options: { optionText: string; isCorrect: boolean }[];
    tagIds?: number[];
    categoryId?: number | null;
  }) => api<{ question: ApiMcqQuestion }>('/api/mcq-questions', { method: 'POST', body: JSON.stringify(body) }),
  update: (
    id: string,
    body: {
      question?: string;
      questionType?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
      maxMarks?: number;
      options?: { optionText: string; isCorrect: boolean }[];
      tagIds?: number[];
    }
  ) => api<{ question: ApiMcqQuestion }>(`/api/mcq-questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: boolean }>(`/api/mcq-questions/${id}`, { method: 'DELETE' }),
};

// ========== Schedule (used IDs) ==========
export const scheduleApi = {
  usedProblemIds: (batchIdOrIds: string | number[]) =>
    Array.isArray(batchIdOrIds)
      ? api<{ problemIds: number[] }>(`/api/schedule/used-problem-ids?batchIds=${batchIdOrIds.join(',')}`)
      : api<{ problemIds: number[] }>(`/api/schedule/used-problem-ids?batchId=${encodeURIComponent(batchIdOrIds)}`),
  usedMcqQuestionIds: (batchIdOrIds: string | number[]) =>
    Array.isArray(batchIdOrIds)
      ? api<{ mcqQuestionIds: number[] }>(`/api/schedule/used-mcq-question-ids?batchIds=${batchIdOrIds.join(',')}`)
      : api<{ mcqQuestionIds: number[] }>(`/api/schedule/used-mcq-question-ids?batchId=${encodeURIComponent(batchIdOrIds)}`),
};

// ========== Tests ==========
export interface ApiTest {
  id: number;
  name: string;
  batchId: number | null;
  collegeId: number | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdBy: number | null;
  testType: 'CODING' | 'MCQ' | null;
  resultsPublished?: boolean;
  displayStatus?: string;
  /** Max allowed tab/window navigations during attempt (from for-student). */
  maxNavigations?: number;
}
export interface ApiTestDetail extends ApiTest {
  batchIds?: number[];
  departmentIds?: number[];
  placementIds?: number[];
  problemIds?: number[];
  mcqQuestionIds?: number[];
  maxNavigations?: number;
  durationMinutes?: number;
}
export const testsApi = {
  create: (body: {
    name: string;
    testType: 'CODING' | 'MCQ';
    batchIds?: number[];
    collegeId?: number | string | null;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    problemIds?: number[];
    mcqQuestionIds?: number[];
    departmentIds?: number[];
    placementIds?: number[];
  }) => api<{ test: ApiTest }>('/api/tests', { method: 'POST', body: JSON.stringify(body) }),
  list: () => api<{ tests: ApiTest[] }>('/api/tests'),
  listAll: () => api<{ tests: ApiTest[] }>('/api/tests/list-all'),
  getById: (id: string) => api<{ test: ApiTestDetail }>(`/api/tests/${id}`),
  update: (id: string, body: {
    name?: string;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    batchIds?: number[];
    departmentIds?: number[];
    placementIds?: number[];
    problemIds?: number[];
    mcqQuestionIds?: number[];
  }) => api<{ test: ApiTest }>(`/api/tests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  forStudent: () => api<{ tests: ApiTest[] }>('/api/tests/for-student'),
  myResults: () => api<{ tests: { id: number; name: string; startTime: string | null; endTime: string | null; testType: string | null }[] }>('/api/tests/my-results'),
  startAttempt: (testId: string) =>
    api<{ attemptId: number; alreadyStarted?: boolean }>(`/api/tests/${testId}/attempts`, { method: 'POST' }),
  getCurrentAttempt: (testId: string) =>
    api<{ attempt: { id: number; testId: number; userId: number; startTime: string; endTime: string | null; status: string } }>(
      `/api/tests/${testId}/attempts/current`
    ),
  getResults: (testId: string) =>
    api<{
      testId: number;
      results: {
        attemptId: number;
        userId: string;
        name: string;
        email: string;
        rollNumber: string;
        attemptedAt: string;
        totalMarks: number | null;
        maxMarks: number | null;
        navigationOverride?: number;
        malpractice?: { type: string; createdAt: string }[];
      }[];
    }>(`/api/tests/${testId}/results`),
  getResultByUser: (testId: string, userId: string) =>
    api<AttemptResultDetail>(`/api/tests/${testId}/results/${userId}`),
  publishResults: (testId: string) =>
    api<{ success: boolean }>(`/api/tests/${testId}/publish-results`, { method: 'PUT' }),
  getMyResult: (testId: string) => api<AttemptResultDetail>(`/api/tests/${testId}/my-result`),
};

// ========== Test attempts ==========
export interface McqQuestionForAttempt {
  mcqQuestionId: number;
  question: string;
  questionType: string;
  maxMarks: number;
  options: { id: number; optionText: string }[];
  orderIndex: number;
}
export interface CodingProblemForAttempt {
  problemId: number;
  title: string;
  description: string | null;
  difficulty: string | null;
}
export const testAttemptsApi = {
  getQuestions: (attemptId: number | string) =>
    api<
      | { testType: 'MCQ'; questions: McqQuestionForAttempt[]; maxNavigations: number; durationMinutes: number; attemptStartTime: string | null }
      | { testType: 'CODING'; problems: CodingProblemForAttempt[]; maxNavigations: number; durationMinutes: number; attemptStartTime: string | null }
    >(`/api/test-attempts/${attemptId}/questions`),
  submitCoding: (
    attemptId: number | string,
    body: { problemId: number; languageId: number; code: string }
  ) => api<{ success: boolean }>(`/api/test-attempts/${attemptId}/submit-coding`, { method: 'POST', body: JSON.stringify(body) }),
  recordMalpractice: (attemptId: number | string, type: string) =>
    api<{ success: boolean }>(`/api/test-attempts/${attemptId}/malpractice`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  increaseNavigationOverride: (attemptId: number | string, addNavigations?: number) =>
    api<{ success: boolean; navigationOverride: number }>(
      `/api/test-attempts/${attemptId}/navigation-override`,
      { method: 'PATCH', body: JSON.stringify({ addNavigations: addNavigations ?? 1 }) }
    ),
  submit: (
    attemptId: number | string,
    body: { answers?: Record<number, number[]>; solutions?: { problemId: number; languageId: number; code: string }[] }
  ) =>
    api<{ success: boolean; totalMarks?: number; maxMarks?: number; alreadySubmitted?: boolean }>(
      `/api/test-attempts/${attemptId}/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  getResult: (attemptId: number | string) => api<AttemptResultDetail>(`/api/test-attempts/${attemptId}/result`),
};

export interface AttemptResultDetail {
  attemptId: number;
  testId: number;
  userId: number;
  testType: 'MCQ' | 'CODING';
  totalMarks: number | null;
  maxMarks: number | null;
  questions?: {
    mcqQuestionId: number;
    question: string;
    questionType: string;
    maxMarks: number;
    selectedOptionIds: number[];
    correctOptionIds: number[];
    options: { id: number; optionText: string; isCorrect: boolean }[];
    marksAwarded: number | null;
    correct: boolean;
  }[];
  codingResults?: {
    problemId: number;
    title: string;
    description: string | null;
    status: string;
    success: boolean;
  }[];
}

/** Bulk create users: file has name, email, optional password, optional phone; role, department_id, placement_id from form. */
export async function uploadBulkUsers(
  file: File,
  role: string,
  departmentId?: string,
  placementId?: string
): Promise<UploadResult> {
  const API_BASE = import.meta.env.VITE_API_URL ?? '';
  const url = `${API_BASE}/api/bulk-upload/users`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('role', role);
  if (departmentId != null && departmentId !== '') formData.append('department_id', departmentId);
  if (placementId != null && placementId !== '') formData.append('placement_id', placementId);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Upload failed');
  }
  return res.json() as Promise<UploadResult>;
}

// ========== Notifications ==========
export interface ApiNotification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: string;
}

export const notificationsApi = {
  list: () => api<{ notifications: ApiNotification[] }>('/api/notifications'),
};


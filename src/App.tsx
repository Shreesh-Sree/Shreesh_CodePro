import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

// Pages
import Login from "@/pages/Login";
import Unauthorized from "@/pages/Unauthorized";
import Dashboard from "@/pages/Dashboard";
import Colleges from "@/pages/Colleges";
import Departments from "@/pages/Departments";
import Users from "@/pages/Users";
import Students from "@/pages/Students";
import StudentDetail from "@/pages/StudentDetail";
import Placements from "@/pages/Placements";
import Analytics from "@/pages/Analytics";
import Progress from "@/pages/Progress";
import Roles from "@/pages/Roles";
import Schedule from "@/pages/Schedule";
import Tests from "@/pages/Tests";
import TestAttempt from "@/pages/TestAttempt";
import TestsManagement from "@/pages/TestsManagement";
import AddQuestions from "@/pages/AddQuestions";
import Results from "@/pages/Results";
import TestResult from "@/pages/TestResult";
import MyTestResult from "@/pages/MyTestResult";
import MyResults from "@/pages/MyResults";

import Notifications from "@/pages/Notifications";
import FAQ from "@/pages/FAQ";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <AuthProvider>
            <PermissionProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Protected routes with layout */}
                <Route element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/colleges" element={
                    <ProtectedRoute permission="college:read">
                      <Colleges />
                    </ProtectedRoute>
                  } />
                  <Route path="/departments" element={
                    <ProtectedRoute permissions={['department:read', 'department:read_own']}>
                      <Departments />
                    </ProtectedRoute>
                  } />
                  <Route path="/users" element={
                    <ProtectedRoute permissions={['user:read', 'user:create', 'user:update', 'user:delete', 'mentor:read', 'mentor:create', 'mentor:update', 'mentor:delete']}>
                      <Users />
                    </ProtectedRoute>
                  } />
                  <Route path="/students" element={
                    <ProtectedRoute permissions={['student:read', 'student:create', 'student:update', 'student:delete', 'student:bulk_create']}>
                      <Students />
                    </ProtectedRoute>
                  } />
                  <Route path="/student/:id" element={
                    <ProtectedRoute permissions={['student:read', 'student:create', 'student:update', 'student:delete', 'student:bulk_create']}>
                      <StudentDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/placements" element={
                    <ProtectedRoute permissions={['placement:read', 'placement:create', 'placement:update', 'placement:delete']}>
                      <Placements />
                    </ProtectedRoute>
                  } />
                  <Route path="/roles" element={
                    <ProtectedRoute role="SUPERADMIN">
                      <Roles />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute permission="analytics:read">
                      <Analytics />
                    </ProtectedRoute>
                  } />
                  <Route path="/progress" element={
                    <ProtectedRoute permission="progress:read">
                      <Progress />
                    </ProtectedRoute>
                  } />
                  <Route path="/schedule" element={
                    <ProtectedRoute permissions={['test:create', 'test:schedule']}>
                      <Schedule />
                    </ProtectedRoute>
                  } />
                  <Route path="/schedule/edit/:testId" element={
                    <ProtectedRoute permissions={['test:create', 'test:schedule']}>
                      <Schedule />
                    </ProtectedRoute>
                  } />
                  <Route path="/tests-management" element={
                    <ProtectedRoute permissions={['result:read', 'test:view_results']}>
                      <TestsManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/tests" element={<Tests />} />
                  <Route path="/tests/:testId/attempt" element={<TestAttempt />} />
                  <Route path="/tests/:testId/my-result" element={<MyTestResult />} />
                  <Route path="/my-results" element={<MyResults />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/questions" element={
                    <ProtectedRoute permission="question:create">
                      <AddQuestions />
                    </ProtectedRoute>
                  } />
                  <Route path="/results" element={
                    <ProtectedRoute permissions={['result:read', 'test:view_results']}>
                      <Results />
                    </ProtectedRoute>
                  } />
                  <Route path="/results/:testId" element={
                    <ProtectedRoute permissions={['result:read', 'test:view_results']}>
                      <Results />
                    </ProtectedRoute>
                  } />
                  {/* Per-student result (staff) - must be after /results/:testId */}
                  <Route path="/results/:testId/student/:userId" element={
                    <ProtectedRoute permissions={['result:read', 'test:view_results']}>
                      <TestResult />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* Redirects */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PermissionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

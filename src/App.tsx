import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChurchList from "./pages/churches/ChurchList";
import ChurchForm from "./pages/churches/ChurchForm";
import ChurchDetail from "./pages/churches/ChurchDetail";
import MemberList from "./pages/members/MemberList";
import MemberForm from "./pages/members/MemberForm";
import MemberDetail from "./pages/members/MemberDetail";
import ClassList from "./pages/classes/ClassList";
import ClassForm from "./pages/classes/ClassForm";
import ClassDetail from "./pages/classes/ClassDetail";
import EnrollmentList from "./pages/enrollments/EnrollmentList";
import AnnouncementList from "./pages/announcements/AnnouncementList";
import AuditLogList from "./pages/audit-logs/AuditLogList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/churches" element={<ProtectedRoute allowedRoles={["super_admin"]}><ChurchList /></ProtectedRoute>} />
              <Route path="/churches/new" element={<ProtectedRoute allowedRoles={["super_admin"]}><ChurchForm /></ProtectedRoute>} />
              <Route path="/churches/:id" element={<ProtectedRoute allowedRoles={["super_admin", "church_admin"]}><ChurchDetail /></ProtectedRoute>} />

              <Route path="/members" element={<ProtectedRoute allowedRoles={["super_admin", "church_admin"]}><MemberList /></ProtectedRoute>} />
              <Route path="/members/new" element={<ProtectedRoute allowedRoles={["super_admin", "church_admin"]}><MemberForm /></ProtectedRoute>} />
              <Route path="/members/:id" element={<ProtectedRoute allowedRoles={["super_admin", "church_admin"]}><MemberDetail /></ProtectedRoute>} />

              <Route path="/classes" element={<ClassList />} />
              <Route path="/classes/new" element={<ProtectedRoute allowedRoles={["super_admin", "church_admin"]}><ClassForm /></ProtectedRoute>} />
              <Route path="/classes/:id" element={<ClassDetail />} />

              <Route path="/enrollments" element={<EnrollmentList />} />
              <Route path="/announcements" element={<AnnouncementList />} />
              <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={["super_admin", "church_admin"]}><AuditLogList /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

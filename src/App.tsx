import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AppLayout from "@/components/Layout/AppLayout";
import Index from "./pages/index.tsx";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./components/auth/AuthProvider.tsx";
import Login from "./pages/Login.tsx";
import { UnifiedProgramManagement } from "./components/features/ProgramManagement/UnifiedProgramManagement.tsx";
import ProgramOutComes from "./components/features/programOutcomes/ProgramOutComes.tsx";
import CourseDetails from "./components/features/CourseDetails/CourseDetails.tsx";
import Dashboard from "./pages/index.tsx";
import MetaTags from "./components/MetaTags.tsx";
import SyllabusReview from "./components/features/syllabus-extraction/SyllabusReview.tsx";
import AIQuestionGeneratorPage from "./pages/AIQuestionGenerator.tsx";
import Questions from "./components/features/generatedQuestions/page.tsx";
import ComingSoon from "./pages/ComingSoon.tsx";
import QuestionBatchDetails from "./components/features/generatedQuestions/QuestionBatchDetails.tsx";



import Profile from "./pages/Profile.tsx";

import DashboardPage from "./components/features/Dashboard/index.tsx";
import GraderPage from "./pages/Grader.tsx";
import AnswerSheetPage from "./pages/AnswerKeysPage.tsx";
import StudentAnswerKeysPage from "./pages/StudentAnswerKeysPage.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/** Guard ONLY for admin routes we choose (Grader) */
function AdminOnly() {
  const userDetails =
    typeof window !== "undefined" ? JSON.parse(localStorage.getItem("userDetails") || "{}") : {};
  const isAdmin = userDetails?.id === 4;
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

const App = () => {
  const isAuthenticated = !!localStorage.getItem("authToken");

  const userDetails =
    typeof window !== "undefined" ? JSON.parse(localStorage.getItem("userDetails") || "{}") : {};
  const isAdmin = userDetails.role === "admin";

  return (
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MetaTags
          title="LOCF VVT SOLUTIONS"
          description="LOCF"
          ogTitle="LOCF VVT SOLUTIONS"
          ogDescription="Computer Science Learning Outcome and Curriculum Framework"
        />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<h1>world</h1>} />

              {/* Protected Routes */}
              <Route
                path="*"
                element={
                  isAuthenticated ? (
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={isAdmin ? <DashboardPage /> : <Dashboard />} />
                        <Route path="*" element={<ComingSoon />} />
                        {/* <Route path="*" element={<NotFound />} /> */}

                        {/* General routes */}
                        <Route path="/q-bank" element={<Questions />} />
                        <Route path="/q-bank/:uuid" element={<QuestionBatchDetails />} />
                        <Route path="/question-generator" element={<AIQuestionGeneratorPage />} />
                   


                        {/* ✅ ONLY GRADER is guarded */}
                        <Route element={<AdminOnly />}>
                          {/* Grader by type (1=School, 2=College) with action segment */}
                          <Route path="admin/grader/:graderType/:type" element={<GraderPage />} />
                          <Route path="admin/grader/:graderType" element={<GraderPage />} />
                          <Route
                            path="admin/grader/answer-keys/:id"
                            element={<AnswerSheetPage />}
                          />
                          <Route
                            path="admin/grader/answer-keys/:studentId/:qpId"
                            element={<StudentAnswerKeysPage />}
                          />
                        </Route>

                
              
              
                        <Route
                          path="/program-management"
                          element={<UnifiedProgramManagement organizationId="1" />}
                        />
                  
                        <Route path="/program-outcomes/:programId" element={<ProgramOutComes />} />
                        <Route
                          path="program-outcomes/:programId/courses/:courseId"
                          element={<CourseDetails />}
                        />
                        <Route
                          path="/program-outcomes/extracted-syllabus/:fileId"
                          element={<SyllabusReview />}
                        />
                        <Route path="/profile" element={<Profile />} />
                      </Routes>
                    </AppLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
};

export default App;

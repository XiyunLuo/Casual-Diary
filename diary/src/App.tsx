import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "@/app/RequireAuth";
import AppLogo from "@/components/layout/AppLogo";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SquarePage = lazy(() => import("@/pages/SquarePage"));
const SquareDiaryDetailPage = lazy(() => import("@/pages/SquareDiaryDetailPage"));
const SquareAuthorPage = lazy(() => import("@/pages/SquareAuthorPage"));
const SquareActivityPage = lazy(() => import("@/pages/SquareActivityPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const AppHomePage = lazy(() => import("@/pages/AppHomePage"));
const DiaryNewPage = lazy(() => import("@/pages/DiaryNewPage"));
const DiaryEditPage = lazy(() => import("@/pages/DiaryEditPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/square" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/square" element={<SquarePage />} />
          <Route path="/square/diaries/:id" element={<SquareDiaryDetailPage />} />
          <Route path="/square/authors/:userId" element={<SquareAuthorPage />} />
          <Route path="/square/me/activity" element={<SquareActivityPage />} />
          <Route path="/app/messages" element={<MessagesPage />} />
          <Route path="/app" element={<AppHomePage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/diaries/new" element={<DiaryNewPage />} />
          <Route path="/app/diaries/:id/edit" element={<DiaryEditPage />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="min-h-screen bg-background p-6">
              <div className="mx-auto max-w-6xl space-y-6">
                <AppLogo />
                <div>404</div>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}

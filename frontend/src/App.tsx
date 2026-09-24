import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { GamesPage } from "@/pages/GamesPage";
import { PlayPage } from "@/pages/PlayPage";
import { StatsPage } from "@/pages/StatsPage";
import { ReviewSession } from "@/reviews/ReviewSession";
import { FiszkiPage } from "@/pages/FiszkiPage";
import { FiszkiSessionPage } from "@/pages/FiszkiSessionPage";
import { ProgressPage } from "@/pages/ProgressPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { CoursesPage } from "@/pages/CoursesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/auth/useAuth";
import { RadioPage } from "@/radio/RadioPage";
import { LanguageStartPage } from "@/pages/LanguageStartPage";
import { useCourse } from "@/courses/CourseProvider";
import { CoursePage } from "@/pages/CoursePage";
import { ModulePage } from "@/pages/ModulePage";
import { LessonPage } from "@/pages/LessonPage";

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function HomeRoute() {
  const { hasChosenCourse } = useCourse();
  return hasChosenCourse ? <Dashboard /> : <Navigate to="/start" replace />;
}

function StartRoute() {
  const { hasChosenCourse } = useCourse();
  return hasChosenCourse ? <Navigate to="/" replace /> : <LanguageStartPage />;
}

export default function App() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="login-screen" role="status" aria-live="polite">
        <span className="loading">Sprawdzam sesję…</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Logowanie ma własny, pełnoekranowy układ — bez sidebaru. */}
      <Route
        path="/login"
        element={status === "authenticated" ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/start" element={<StartRoute />} />
        {/* Lekcja ma własny układ skupienia — bez sidebaru i topbaru. */}
        <Route path="/lekcja/:lessonId" element={<LessonPage />} />
        <Route element={<ShellLayout />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/kurs" element={<CoursePage />} />
          <Route path="/kurs/:levelId/modul/:moduleOrder" element={<ModulePage />} />
          <Route path="/gry" element={<GamesPage />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/gry/kategoria/:categoryId" element={<GamesPage />} />
          <Route path="/gry/:gameId" element={<PlayPage />} />
          <Route path="/powtorki" element={<ReviewSession />} />
          <Route path="/fiszki" element={<FiszkiPage />} />
          <Route path="/fiszki/sesja" element={<FiszkiSessionPage />} />
          <Route path="/statystyki" element={<StatsPage />} />
          <Route path="/postep" element={<ProgressPage />} />
          <Route path="/jezyki" element={<CoursesPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/ustawienia" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "./lib/api";
import { ChurchProvider } from "./contexts/ChurchContext";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DemoEntryPage from "./pages/DemoEntryPage";
import DashboardPage from "./pages/DashboardPage";
import PrayerInboxPage from "./pages/PrayerInboxPage";
import VisitorsPage from "./pages/VisitorsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import SettingsPage from "./pages/SettingsPage";
import MembersPage from "./pages/MembersPage";
import ResourcesPage from "./pages/ResourcesPage";
import PrayerSettingsPage from "./pages/PrayerSettingsPage";
import SmallGroupsPage from "./pages/SmallGroupsPage";
import SermonFollowupPage from "./pages/SermonFollowupPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CareRequestsPage from "./pages/CareRequestsPage";
import Layout from "./components/Layout";

export interface Session {
  email: string;
  churchId: string;
  role: string;
  isDemo?: boolean;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token && window.location.pathname.includes("/auth/verify")) {
      api.auth.verify(token)
        .then((data: { email: string; churchId: string }) => {
          setSession({ email: data.email, churchId: data.churchId, role: "admin" });
          navigate("/dashboard", { replace: true });
        })
        .catch(() => navigate("/login?error=expired", { replace: true }));
      return;
    }

    api.auth.me()
      .then((data) => setSession(data.session))
      .catch(() => setSession(null));
  }, []);

  if (session === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#6b7280", fontSize: 14 }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route
        path="/demo"
        element={<DemoEntryPage session={session} onLogin={setSession} />}
      />
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setSession} />}
      />
      <Route path="/admin/auth/verify" element={<div style={{ padding: 40, textAlign: "center" }}>Signing you in...</div>} />
      {session ? (
        <Route element={
          <ChurchProvider>
            <Layout session={session} onLogout={() => { api.auth.logout(); setSession(null); }} />
          </ChurchProvider>
        }>
          <Route path="/dashboard" element={<DashboardPage session={session} />} />
          <Route path="/prayer-inbox" element={<PrayerInboxPage />} />
          <Route path="/visitors" element={<VisitorsPage />} />
          <Route path="/care-requests" element={<CareRequestsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/prayer-settings" element={<PrayerSettingsPage />} />
          <Route path="/small-groups" element={<SmallGroupsPage />} />
          <Route path="/sermon-followup" element={<SermonFollowupPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/" replace />} />
      )}
    </Routes>
  );
}

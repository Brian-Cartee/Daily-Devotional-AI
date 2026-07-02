import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "./lib/api";
import { ChurchProvider } from "./contexts/ChurchContext";
import LoginPage from "./pages/LoginPage";
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
import Layout from "./components/Layout";

interface Session {
  email: string;
  churchId: string;
  role: string;
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
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setSession} />} />
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

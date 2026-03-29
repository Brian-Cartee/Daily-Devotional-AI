import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionId } from "@/lib/session";
import { checkReferralProStatus } from "@/lib/proStatus";
import NotFound from "@/pages/not-found";
import LandingHome from "@/pages/LandingHome";
import Devotional from "@/pages/Devotional";
import UnderstandBible from "@/pages/UnderstandBible";
import ReadBible from "@/pages/ReadBible";
import Journal from "@/pages/Journal";
import QuickStudyPage from "@/pages/QuickStudyPage";
import ProSuccess from "@/pages/ProSuccess";
import RefundPage from "@/pages/RefundPage";
import PricingPage from "@/pages/PricingPage";
import PresentMode from "@/pages/PresentMode";
import DemoCreate from "@/pages/DemoCreate";
import AboutPage from "@/pages/AboutPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import GuidancePage from "@/pages/GuidancePage";
import AdminPage from "@/pages/AdminPage";
import StoriesPage from "@/pages/StoriesPage";
import { DemoProvider } from "@/components/DemoProvider";
import { DemoFloatingBar } from "@/components/DemoFloatingBar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return null;
}

function ReferralCapture() {
  useEffect(() => {
    const sessionId = getSessionId();
    checkReferralProStatus(sessionId).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const alreadyRecorded = localStorage.getItem("sp_referral_recorded");
    if (alreadyRecorded) return;
    fetch("/api/referral/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref, referredSessionId: sessionId }),
    }).then(() => {
      localStorage.setItem("sp_referral_recorded", "1");
      checkReferralProStatus(sessionId).catch(() => {});
    }).catch(() => {});
  }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingHome} />
      <Route path="/guidance" component={GuidancePage} />
      <Route path="/devotional" component={Devotional} />
      <Route path="/understand" component={UnderstandBible} />
      <Route path="/read" component={ReadBible} />
      <Route path="/study" component={QuickStudyPage} />
      <Route path="/journal" component={Journal} />
      <Route path="/pro-success" component={ProSuccess} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/pricing" component={PricingPage} />
      
      <Route path="/present" component={PresentMode} />
      <Route path="/demo" component={DemoCreate} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/shepherd-admin" component={AdminPage} />
      <Route path="/stories" component={StoriesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DemoProvider>
            <Toaster />
            <ScrollToTop />
            <ReferralCapture />
            <Router />
            <DemoFloatingBar />
            <InstallPrompt />
          </DemoProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

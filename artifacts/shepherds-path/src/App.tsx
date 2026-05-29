import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import ThresholdArrivalPage from "@/pages/ThresholdArrivalPage";
import SighRoomPage from "@/pages/SighRoomPage";
import NightShepherdPage from "@/pages/NightShepherdPage";
import LamentPathwayPage from "@/pages/LamentPathwayPage";
import SurrenderStonePage from "@/pages/SurrenderStonePage";
import { isSacredPresenceRoute } from "@/lib/presenceMode";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionId } from "@/lib/session";
import { checkReferralProStatus, markReferralPro, silentlyRevalidatePro } from "@/lib/proStatus";
import { ReferralWelcomeToast, setReferralWelcomePending } from "@/components/ReferralWelcomeToast";
import { refreshAiUsage } from "@/hooks/use-ai-usage";
import { ThemeContext, getStoredTheme, applyTheme, type AppTheme } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import LandingHome from "@/pages/LandingHome";
import Devotional from "@/pages/Devotional";
import SharedVersePage from "@/pages/SharedVersePage";
import UnderstandBible from "@/pages/UnderstandBible";
import ReadBible from "@/pages/ReadBible";
import Journal from "@/pages/Journal";
import QuickStudyPage from "@/pages/QuickStudyPage";
import ProSuccess from "@/pages/ProSuccess";
import RestorePage from "@/pages/RestorePage";
import RefundPage from "@/pages/RefundPage";
const PricingPage = lazy(() => import("@/pages/PricingPage"));
import PresentMode from "@/pages/PresentMode";
import DisplayMode from "@/pages/DisplayMode";
import DemoCreate from "@/pages/DemoCreate";
const AboutPage = lazy(() => import("@/pages/AboutPage"));
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import GuidancePage from "@/pages/GuidancePage";
import { FloatingAskAI } from "@/components/FloatingAskAI";
import { ConvictionPanel } from "@/components/ConvictionPanel";
import { NavBar } from "@/components/NavBar";
import PrayerPortraitPage from "@/pages/PrayerPortraitPage";
import PrayerClosetPage from "@/pages/PrayerClosetPage";
import AdminPage from "@/pages/AdminPage";
import AdminSermonsPage from "@/pages/AdminSermonsPage";
import StoriesPage from "@/pages/StoriesPage";
import StorePage from "@/pages/StorePage";
import SalvationPage from "@/pages/SalvationPage";
import ReadingPlansPage from "@/pages/ReadingPlansPage";
import PrayerWallPage from "@/pages/PrayerWallPage";
import GreatestGiftPage from "@/pages/GreatestGiftPage";
import SupportPage from "@/pages/SupportPage";
import HowToUsePage from "@/pages/HowToUsePage";
import SafetyPage from "@/pages/SafetyPage";
import FeedbackPage from "@/pages/FeedbackPage";
import InvitePage from "@/pages/InvitePage";
import TriviaPage from "@/pages/TriviaPage";
// import SmsPage from "@/pages/SmsPage"; // temporarily disabled — awaiting Twilio toll-free verification
import CallingPage from "@/pages/CallingPage";
import ScripturalAlignment from "@/pages/ScripturalAlignment";
import Moments from "@/pages/Moments";
const ScreenshotGenerator = lazy(() => import("@/pages/ScreenshotGenerator"));
const IronCirclePage = lazy(() => import("@/pages/IronCirclePage"));
import { DemoProvider } from "@/components/DemoProvider";
import { DemoFloatingBar } from "@/components/DemoFloatingBar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { isNativeWebViewShell, markNativeShellUiPainted } from "@/lib/platform";
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
    silentlyRevalidatePro().catch(() => {});
    refreshAiUsage().catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const alreadyRecorded = localStorage.getItem("sp_referral_recorded");
    if (alreadyRecorded) return;
    fetch("/api/referral/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref, referredSessionId: sessionId }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; referredProUntil?: string }) => {
        localStorage.setItem("sp_referral_recorded", "1");
        if (data.success && data.referredProUntil) {
          markReferralPro(data.referredProUntil);
          setReferralWelcomePending();
        }
        checkReferralProStatus(sessionId).catch(() => {});
      })
      .catch(() => {});
  }, []);
  return null;
}

function Router() {
  const [location] = useLocation();
  const hideFloater = isSacredPresenceRoute(location);
  const hideNav = isSacredPresenceRoute(location);

  return (
    <>
    <Switch>
      <Route path="/threshold" component={ThresholdArrivalPage} />
      <Route path="/sigh" component={SighRoomPage} />
      <Route path="/night" component={NightShepherdPage} />
      <Route path="/lament" component={LamentPathwayPage} />
      <Route path="/surrender" component={SurrenderStonePage} />
      <Route path="/" component={LandingHome} />
      <Route path="/guidance" component={GuidancePage} />
      <Route path="/devotional" component={Devotional} />
      <Route path="/v/:date" component={SharedVersePage} />
      <Route path="/understand" component={UnderstandBible} />
      <Route path="/read" component={ReadBible} />
      <Route path="/study" component={QuickStudyPage} />
      <Route path="/journal" component={Journal} />
      <Route path="/moments" component={Moments} />
      <Route path="/pro-success" component={ProSuccess} />
      <Route path="/restore" component={RestorePage} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/pricing">
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <PricingPage />
        </Suspense>
      </Route>
      
      <Route path="/present" component={PresentMode} />
      <Route path="/display" component={DisplayMode} />
      <Route path="/demo" component={DemoCreate} />
      <Route path="/about">
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <AboutPage />
        </Suspense>
      </Route>
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/shepherd-admin" component={AdminPage} />
      <Route path="/shepherd-admin/sermons" component={AdminSermonsPage} />
      <Route path="/stories" component={StoriesPage} />
      <Route path="/store" component={StorePage} />
      <Route path="/salvation" component={SalvationPage} />
      <Route path="/reading-plans" component={ReadingPlansPage} />
      <Route path="/prayer-wall" component={PrayerWallPage} />
      <Route path="/greatest-gift" component={GreatestGiftPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/how-to-use" component={HowToUsePage} />
      <Route path="/safety" component={SafetyPage} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/invite" component={InvitePage} />
      <Route path="/trivia" component={TriviaPage} />
      <Route path="/trivia/:id" component={TriviaPage} />
      {/* <Route path="/sms" component={SmsPage} /> */}
      <Route path="/calling" component={CallingPage} />
      <Route path="/alignment" component={ScripturalAlignment} />
      <Route path="/prayer-portrait" component={PrayerPortraitPage} />
      <Route path="/prayer-closet" component={PrayerClosetPage} />
      <Route path="/screenshot-gen">
        <Suspense fallback={<div className="min-h-screen bg-[#0d0a1a]" />}>
          <ScreenshotGenerator />
        </Suspense>
      </Route>
      <Route path="/iron-circle">
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <IronCirclePage />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
    {!hideNav && <NavBar showTop />}
    <ConvictionPanel />
    {!hideFloater && <FloatingAskAI />}
    </>
  );
}

function BrandedDomainRedirect() {
  useEffect(() => {
    const host = window.location.hostname;
    if (host === "daily-devotional-ai.replit.app") {
      window.location.replace(
        "https://shepherdspathai.com" + window.location.pathname + window.location.search
      );
    }
  }, []);
  return null;
}

function App() {
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isNativeWebViewShell()) return;

    const visibleSelectors =
      '[data-testid="card-devotional"], [data-testid="bottom-nav-home"], [data-testid="text-threshold-welcome"], [data-testid="threshold-arrival"], [data-testid="btn-threshold-enter"]';

    const tryMark = () => {
      if (!document.querySelector(visibleSelectors)) return false;
      markNativeShellUiPainted();
      return true;
    };

    if (tryMark()) return;

    const observer = new MutationObserver(() => {
      if (tryMark()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const fallback = window.setTimeout(() => {
      observer.disconnect();
      markNativeShellUiPainted();
    }, 5000);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <DemoProvider>
                <Toaster />
                <BrandedDomainRedirect />
                <ScrollToTop />
                <ReferralCapture />
                <ReferralWelcomeToast />
                <Router />
                <DemoFloatingBar />
                {!isNativeWebViewShell() && <InstallPrompt />}
                {!isNativeWebViewShell() && <UpdatePrompt />}
              </DemoProvider>
            </WouterRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
}

export default App;

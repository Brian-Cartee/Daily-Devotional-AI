import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return null;
}
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
import PrayPage from "@/pages/PrayPage";
import SmsPage from "@/pages/SmsPage";
import PresentMode from "@/pages/PresentMode";
import DemoCreate from "@/pages/DemoCreate";
import AboutPage from "@/pages/AboutPage";
import { DemoProvider } from "@/components/DemoProvider";
import { DemoFloatingBar } from "@/components/DemoFloatingBar";
import { InstallPrompt } from "@/components/InstallPrompt";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingHome} />
      <Route path="/devotional" component={Devotional} />
      <Route path="/understand" component={UnderstandBible} />
      <Route path="/read" component={ReadBible} />
      <Route path="/study" component={QuickStudyPage} />
      <Route path="/journal" component={Journal} />
      <Route path="/pro-success" component={ProSuccess} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/pray" component={PrayPage} />
      <Route path="/sms" component={SmsPage} />
      <Route path="/present" component={PresentMode} />
      <Route path="/demo" component={DemoCreate} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DemoProvider>
          <Toaster />
          <ScrollToTop />
          <Router />
          <DemoFloatingBar />
          <InstallPrompt />
        </DemoProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

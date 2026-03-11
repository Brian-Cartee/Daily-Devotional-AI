import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

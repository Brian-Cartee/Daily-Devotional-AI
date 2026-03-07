import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmailSubscribe } from "@/components/EmailSubscribe";
import NotFound from "@/pages/not-found";
import LandingHome from "@/pages/LandingHome";
import Devotional from "@/pages/Devotional";
import UnderstandBible from "@/pages/UnderstandBible";
import ReadBible from "@/pages/ReadBible";
import Journal from "@/pages/Journal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingHome} />
      <Route path="/devotional" component={Devotional} />
      <Route path="/understand" component={UnderstandBible} />
      <Route path="/read" component={ReadBible} />
      <Route path="/journal" component={Journal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <EmailSubscribe />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import InviteToken from "@/pages/invite-token";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import VehicleDetail from "@/pages/vehicle-detail";
import Posting from "@/pages/posting";
import PostingSchedule from "@/pages/posting-schedule";
import PostingGroups from "@/pages/posting-groups";
import Photos from "@/pages/photos";
import Leads from "@/pages/leads";
import LeadDetail from "@/pages/lead-detail";
import Team from "@/pages/team";
import Billing from "@/pages/billing";
import Settings from "@/pages/settings";
import AdminOverview from "@/pages/admin";
import AdminAccounts from "@/pages/admin-accounts";
import AdminAccountDetail from "@/pages/admin-account-detail";
import AdminReps from "@/pages/admin-reps";
import AdminRepDetail from "@/pages/admin-rep-detail";
import AdminPosting from "@/pages/admin-posting";
import AdminPostingSelectors from "@/pages/admin-posting-selectors";
import AdminPostingSchedule from "@/pages/admin-posting-schedule";
import AdminProxies from "@/pages/admin-proxies";
import AdminPhotos from "@/pages/admin-photos";
import AdminLeads from "@/pages/admin-leads";
import AdminHealth from "@/pages/admin-health";
import AdminAlerts from "@/pages/admin-alerts";
import AdminSettings from "@/pages/admin-settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/invite/:token" component={InviteToken} />

      <Route path="/dashboard" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/:id" component={VehicleDetail} />
      <Route path="/posting" component={Posting} />
      <Route path="/posting/schedule" component={PostingSchedule} />
      <Route path="/posting/groups" component={PostingGroups} />
      <Route path="/photos" component={Photos} />
      <Route path="/leads" component={Leads} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/team" component={Team} />
      <Route path="/billing" component={Billing} />
      <Route path="/settings" component={Settings} />

      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/accounts" component={AdminAccounts} />
      <Route path="/admin/accounts/:id" component={AdminAccountDetail} />
      <Route path="/admin/reps" component={AdminReps} />
      <Route path="/admin/reps/:id" component={AdminRepDetail} />
      <Route path="/admin/posting" component={AdminPosting} />
      <Route path="/admin/posting/selectors" component={AdminPostingSelectors} />
      <Route path="/admin/posting/schedule" component={AdminPostingSchedule} />
      <Route path="/admin/proxies" component={AdminProxies} />
      <Route path="/admin/photos" component={AdminPhotos} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/admin/health" component={AdminHealth} />
      <Route path="/admin/alerts" component={AdminAlerts} />
      <Route path="/admin/settings" component={AdminSettings} />

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

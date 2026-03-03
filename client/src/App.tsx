import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminLayout } from "@/components/layout/admin-layout";
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

function DashboardPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function AdminPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/invite/:token" component={InviteToken} />

      <Route path="/dashboard">{() => <DashboardPage component={Dashboard} />}</Route>
      <Route path="/inventory">{() => <DashboardPage component={Inventory} />}</Route>
      <Route path="/inventory/:id">{() => <DashboardPage component={VehicleDetail} />}</Route>
      <Route path="/posting">{() => <DashboardPage component={Posting} />}</Route>
      <Route path="/posting/schedule">{() => <DashboardPage component={PostingSchedule} />}</Route>
      <Route path="/posting/groups">{() => <DashboardPage component={PostingGroups} />}</Route>
      <Route path="/photos">{() => <DashboardPage component={Photos} />}</Route>
      <Route path="/leads">{() => <DashboardPage component={Leads} />}</Route>
      <Route path="/leads/:id">{() => <DashboardPage component={LeadDetail} />}</Route>
      <Route path="/team">{() => <DashboardPage component={Team} />}</Route>
      <Route path="/billing">{() => <DashboardPage component={Billing} />}</Route>
      <Route path="/settings">{() => <DashboardPage component={Settings} />}</Route>

      <Route path="/admin">{() => <AdminPage component={AdminOverview} />}</Route>
      <Route path="/admin/accounts">{() => <AdminPage component={AdminAccounts} />}</Route>
      <Route path="/admin/accounts/:id">{() => <AdminPage component={AdminAccountDetail} />}</Route>
      <Route path="/admin/reps">{() => <AdminPage component={AdminReps} />}</Route>
      <Route path="/admin/reps/:id">{() => <AdminPage component={AdminRepDetail} />}</Route>
      <Route path="/admin/posting">{() => <AdminPage component={AdminPosting} />}</Route>
      <Route path="/admin/posting/selectors">{() => <AdminPage component={AdminPostingSelectors} />}</Route>
      <Route path="/admin/posting/schedule">{() => <AdminPage component={AdminPostingSchedule} />}</Route>
      <Route path="/admin/proxies">{() => <AdminPage component={AdminProxies} />}</Route>
      <Route path="/admin/photos">{() => <AdminPage component={AdminPhotos} />}</Route>
      <Route path="/admin/leads">{() => <AdminPage component={AdminLeads} />}</Route>
      <Route path="/admin/health">{() => <AdminPage component={AdminHealth} />}</Route>
      <Route path="/admin/alerts">{() => <AdminPage component={AdminAlerts} />}</Route>
      <Route path="/admin/settings">{() => <AdminPage component={AdminSettings} />}</Route>

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

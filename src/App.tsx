import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import ArticlePage from "./pages/ArticlePage";
import SectionPage from "./pages/SectionPage";
import AuthorPage from "./pages/AuthorPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import SubscribePage from "./pages/SubscribePage";
import StaffPage from "./pages/StaffPage";
import NotFound from "./pages/NotFound";
import GamesPage from "./pages/GamesPage";
import AdvertisePage from "./pages/AdvertisePage";
import SeniorSuperlativesPage from "./pages/SeniorSuperlativesPage";
import PoemsPage from "./pages/PoemsPage";
import InteractiveNewsFeature from "./components/article/InteractiveNewsFeature";

// Admin
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { DataSyncProvider } from "./contexts/DataSyncContext";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStories from "./pages/admin/AdminStories";
import AdminStoryEditor from "./pages/admin/AdminStoryEditor";
import AdminAuthors from "./pages/admin/AdminAuthors";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminActivityLog from "./pages/admin/AdminActivityLog";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTrash from "./pages/admin/AdminTrash";
import AdminPdfImport from "./pages/admin/AdminPdfImport";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminComments from "./pages/admin/AdminComments";
import AdminAds from "./pages/admin/AdminAds";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AdminAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <DataSyncProvider>
          <Routes>
            {/* Public routes — no DataSyncProvider here (saves Supabase egress) */}
            <Route path="/" element={<Index />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/section/:slug" element={<SectionPage />} />
            <Route path="/author/:id" element={<AuthorPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/secretstuff" element={<GamesPage />} />
            <Route path="/advertise" element={<AdvertisePage />} />
            <Route path="/special/senior-superlatives" element={<SeniorSuperlativesPage />} />
            <Route path="/special/poems" element={<PoemsPage />} />
            <Route path="/editor-preview/sports-gambling-r9x4p7b2" element={<InteractiveNewsFeature />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="stories" element={<AdminStories />} />
              <Route path="stories/new" element={<AdminStoryEditor />} />
              <Route path="stories/edit/:id" element={<AdminStoryEditor />} />
              <Route path="authors" element={<AdminAuthors />} />
              <Route path="trash" element={<AdminTrash />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="activity" element={<AdminActivityLog />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="pdf-import" element={<AdminPdfImport />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="comments" element={<AdminComments />} />
              <Route path="ads" element={<AdminAds />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </DataSyncProvider>
        </BrowserRouter>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

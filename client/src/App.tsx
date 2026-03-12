import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navigation from "./components/Navigation";
import { MycelialBackground } from "./components/MycelialBackground";
import { StructuredData } from "./components/StructuredData";
import { TaoSpinner } from "./components/TaoSpinner";
import CookieConsent from "./components/CookieConsent";
import AnalyticsLoader from "./components/AnalyticsLoader";
import ReGenGuide from "./components/ReGenGuide";
import AMABanner from "./components/AMABanner";
import SiteFooter from "./components/SiteFooter";
import { ScrollToTop } from "./components/ScrollToTop";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import { ExitIntentCapture } from "./components/ExitIntentCapture";
import CommandPalette from "./components/CommandPalette";
import { useGlobalScrollReveal } from "./hooks/useGlobalScrollReveal";

// Routes that bypass site chrome (nav, footer, background effects)
const ADMIN_ROUTES = ["/admin", "/admin/"];
function isAdminRoute(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}
// Lazy load pages for better initial load performance
const Home = lazy(() => import("./pages/Home"));
const Quest = lazy(() => import("./pages/Quest"));
const Opportunity = lazy(() => import("./pages/Opportunity"));
const Form = lazy(() => import("./pages/Form"));
const InvestmentForm = lazy(() => import("./pages/InvestmentForm"));
const Socials = lazy(() => import("./pages/Socials"));
const Seasons = lazy(() => import("./pages/Seasons"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Team = lazy(() => import("./pages/Team"));
const Game = lazy(() => import("./pages/Game"));
const Calculator = lazy(() => import("./pages/Calculator"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Fund = lazy(() => import("./pages/Fund"));
const Land = lazy(() => import("./pages/Land"));
const Ally = lazy(() => import("./pages/Ally"));
const Play = lazy(() => import("./pages/Play"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Apply = lazy(() => import("./pages/Apply"));
const ApplySuccess = lazy(() => import("./pages/ApplySuccess"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const AdminApplications = lazy(() => import("./pages/AdminApplications"));
const AdminApplicationDetail = lazy(() => import("./pages/AdminApplicationDetail"));
const InvestorJourneyForm = lazy(() => import("./pages/InvestorForm"));
const Connect = lazy(() => import("./pages/Connect"));
const Admin = lazy(() => import("./pages/Admin"));
const Showcase = lazy(() => import("./pages/Showcase"));
const CrowdPooling = lazy(() => import("./pages/CrowdPooling"));
const CrowdPoolingProjects = lazy(() => import("./pages/CrowdPoolingProjects"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const CreateCampaign = lazy(() => import("./pages/CreateCampaign"));
const CrowdPoolingCampaigns = lazy(() => import("./pages/CrowdPoolingCampaigns"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const CampaignManage = lazy(() => import("./pages/CampaignManage"));
const CampaignAnalytics = lazy(() => import("./pages/CampaignAnalytics"));
const MapPage = lazy(() => import("./pages/Map"));
const ProjectComparison = lazy(() => import("./pages/ProjectComparison"));
const Governance = lazy(() => import("./pages/Governance"));
const LOI = lazy(() => import("./pages/LOI"));
const RiskDisclosure = lazy(() => import("./pages/RiskDisclosure"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Disclaimers = lazy(() => import("./pages/Disclaimers"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const OnePager = lazy(() => import("./pages/OnePager"));
const OnePagerLand = lazy(() => import("./pages/OnePagerLand"));
const OnePagerAlliance = lazy(() => import("./pages/OnePagerAlliance"));
const OnePagerPlayer = lazy(() => import("./pages/OnePagerPlayer"));
const Community = lazy(() => import("./pages/Community"));
const CommunityCategory = lazy(() => import("./pages/CommunityCategory"));
const CommunityPost = lazy(() => import("./pages/CommunityPost"));
const CommunityNewPost = lazy(() => import("./pages/CommunityNewPost"));
const CommunityTagFilter = lazy(() => import("./pages/CommunityTagFilter"));
const CommunityChains = lazy(() => import("./pages/CommunityChains"));
const CommunitySeekingTeam = lazy(() => import("./pages/CommunitySeekingTeam"));
const QuestSuggestions = lazy(() => import("./pages/QuestSuggestions"));
const UserForumProfile = lazy(() => import("./pages/UserForumProfile"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Tokenomics = lazy(() => import("./pages/Tokenomics"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const ReGenGames = lazy(() => import("./pages/ReGenGames"));
const CustomGames = lazy(() => import("./pages/CustomGames"));
const Marketplace = lazy(() => import("./pages/Marketplace"));

// Loading spinner component using Seed of Life
function PageLoader() {
  return <TaoSpinner size={72} fullPage={true} />;
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/form"} component={Form} />
        <Route path={"/quest"} component={Quest} />
        <Route path={"/fund"} component={Fund} />
        <Route path={"/land"} component={Land} />
        <Route path={"/ally"} component={Ally} />
        <Route path={"/play"} component={Play} />
        <Route path={"/opportunity"} component={Opportunity} />        <Route path={"/governance"} component={Governance} />
        <Route path={"/tokenomics"} component={Tokenomics} />
        <Route path={"/loi"} component={LOI} />
        <Route path={"/404"} component={NotFound} />       <Route path={"/investmentform"} component={InvestmentForm} />
        <Route path={"/socials"} component={Socials} />
        <Route path={"/seasons"} component={Seasons} />
        <Route path={"/schedule"} component={Schedule} />
        <Route path={"/team"} component={Team} />
        <Route path={"/game"} component={Game} />
        <Route path={"/calculator"} component={Calculator} />
        <Route path={"/blog"} component={Blog} />
        <Route path={"/blog/:slug"} component={BlogPost} />
        <Route path={"/apply"} component={Apply} />
        <Route path={"/apply/success"} component={ApplySuccess} />
        <Route path={"/my-applications"} component={MyApplications} />
        <Route path={"/admin/applications"} component={AdminApplications} />
        <Route path={"/admin/application/:id"} component={AdminApplicationDetail} />
        <Route path={"/investor"} component={InvestorJourneyForm} />
        <Route path={"/connect"} component={Connect} />
        <Route path={"/admin"} component={Admin} />
        <Route path={"/showcase"} component={Showcase} />
        <Route path={"/crowd-pooling"} component={CrowdPooling} />
        <Route path={"/crowd-pooling-projects"} component={CrowdPoolingProjects} />
        <Route path={"/compare-projects"} component={ProjectComparison} />
        <Route path={"/profile"} component={PlayerProfile} />
        <Route path={"/create-campaign"} component={CreateCampaign} />
        <Route path={"/campaigns"}>{() => { window.location.href = '/crowd-pooling-projects'; return null; }}</Route>
        <Route path={"/campaign/:id"} component={CampaignDetail} />
        <Route path={"/campaign/:id/manage"} component={CampaignManage} />
        <Route path={"/campaign/:id/analytics"} component={CampaignAnalytics} />
        <Route path={"/map"} component={MapPage} />
        <Route path={"/risk-disclosure"} component={RiskDisclosure} />
        <Route path={"/terms-of-use"} component={TermsOfUse} />
        <Route path={"/privacy-policy"} component={PrivacyPolicy} />
        <Route path={"/disclaimers"} component={Disclaimers} />
        <Route path={"/unsubscribe"} component={Unsubscribe} />
        <Route path="/one-pager/land" component={OnePagerLand} />
        <Route path="/one-pager/alliance" component={OnePagerAlliance} />
        <Route path="/one-pager/player" component={OnePagerPlayer} />
        <Route path={"/one-pager/:path"} component={OnePager} />
        <Route path={"/community"} component={Community} />
        <Route path={"/community/c/:slug"} component={CommunityCategory} />
        <Route path={"/community/post/:id"} component={CommunityPost} />
        <Route path={"/community/new"} component={CommunityNewPost} />
        <Route path={"/community/tag/:tag"} component={CommunityTagFilter} />
        <Route path={"/community/chains"} component={CommunityChains} />
        <Route path={"/community/seeking-team"} component={CommunitySeekingTeam} />
        <Route path={"/community/lessons"}>{() => <Redirect to="/community/tag/lesson" />}</Route>
        <Route path={"/community/seeking-support"}>{() => <Redirect to="/community/tag/seeking-support" />}</Route>
        <Route path={"/community/offering-support"}>{() => <Redirect to="/community/tag/offering-support" />}</Route>
        <Route path={"/community/quests"} component={QuestSuggestions} />
        <Route path={"/community/user/:id"} component={UserForumProfile} />
        <Route path={"/admin/moderation"} component={AdminModeration} />
<Route path={"/glossary"} component={Glossary} />
        <Route path={"/newsletter"} component={Newsletter} />
        <Route path={"/regen-games"} component={ReGenGames} />
        <Route path={"/custom-games"} component={CustomGames} />
        <Route path={"/marketplace"} component={Marketplace} />
        <Route path="/404" component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function AppInner() {
  useGlobalScrollReveal();
  return null;
}

function App() {
  const [location] = useLocation();
  const adminMode = isAdminRoute(location);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          {!adminMode && <StructuredData />}
          {!adminMode && (
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-[#7dd87d] focus:text-[#1a472a] focus:rounded-lg focus:font-bold focus:text-sm focus:shadow-lg"
            >
              Skip to main content
            </a>
          )}
          {!adminMode && <MycelialBackground />}
          {!adminMode && <AMABanner />}
          {!adminMode && <Navigation />}
          <main id="main-content">
            <Router />
          </main>
          {!adminMode && <SiteFooter />}
          {!adminMode && <CookieConsent />}
          <AnalyticsLoader />
          <ScrollToTop />
          {!adminMode && <ReGenGuide />}
          {!adminMode && <AppInner />}
          {!adminMode && <ExitIntentCapture />}
          {!adminMode && <CommandPalette />}
          <ServiceWorkerRegister />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { lazy, Suspense, ReactNode } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navigation from "./components/Navigation";
import { MycelialBackground } from "./components/MycelialBackground";
import { AnimationLayer } from "./components/AnimationLayer";
import { WizardRadialMenu } from "./components/mobile/WizardRadialMenu";
import { MobileMoreMenu } from "./components/mobile/MobileMoreMenu";
import { StructuredData } from "./components/StructuredData";
import { TaoSpinner } from "./components/TaoSpinner";
import { TaoErrorState } from "./components/TaoErrorState";
const CookieConsent = lazy(() => import("./components/CookieConsent"));
import AnalyticsLoader from "./components/AnalyticsLoader";
const ReGenGuide = lazy(() => import("./components/ReGenGuide"));
import AMABanner from "./components/AMABanner";
import SiteFooter from "./components/SiteFooter";
import { GameHookBanner } from "./components/GameHookBanner";
import { ScrollToTop } from "./components/ScrollToTop";
const ExitIntentCapture = lazy(() => import("./components/ExitIntentCapture").then(m => ({ default: m.ExitIntentCapture })));
const CommandPalette = lazy(() => import("./components/CommandPalette"));
const ShortcutPill = lazy(() => import("./components/ShortcutPill").then(m => ({ default: m.ShortcutPill })));
import { AudioProvider } from "./contexts/AudioContext";
import { ReGenGuideProvider } from "./contexts/ReGenGuideContext";

import { getCurrentSeason } from "@/lib/seasons";
import { useGlobalScrollReveal } from "./hooks/useGlobalScrollReveal";
import { usePageVisitTracker } from "./hooks/usePageVisitTracker";
import { captureReferral } from "./components/SharePrompt";
import { useFocusOnNavigation } from "./hooks/useFocusOnNavigation";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation as useWouterLocation } from "wouter";
import { trpc } from "@/lib/trpc";
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard").then(m => ({ default: m.OnboardingWizard })));
const RegenIntroGate = lazy(() => import("./components/RegenIntroGate").then(m => ({ default: m.RegenIntroGate })));

// Routes that bypass site chrome (nav, footer, background effects)
const ADMIN_ROUTES = ["/admin", "/admin/"];
function isAdminRoute(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}
// Lazy load pages for better initial load performance
const Home = lazy(() => import("./pages/Home"));
const Quest = lazy(() => import("./pages/Quest"));
const Opportunity = lazy(() => import("./pages/Opportunity"));
// Form and InvestmentForm removed, both routes redirect to /connect and /investor respectively
const Socials = lazy(() => import("./pages/Socials"));
const Seasons = lazy(() => import("./pages/Seasons"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Team = lazy(() => import("./pages/Team"));
const Game = lazy(() => import("./pages/Game"));
const Economy = lazy(() => import("./pages/Economy"));
const Bionomics = lazy(() => import("./pages/Bionomics"));
const HealTheLand = lazy(() => import("./pages/HealTheLand"));
const HymnBook = lazy(() => import("./pages/HymnBook"));
const HymnPlayer = lazy(() => import("./pages/HymnPlayer"));
const Proposals = lazy(() => import("./pages/Proposals"));
const GameMechanics = lazy(() => import("./pages/GameMechanics"));
const LocalFoodEconomy = lazy(() => import("./pages/LocalFoodEconomy"));
const ToolsLibrary = lazy(() => import("./pages/ToolsLibrary"));
const ToolDetail = lazy(() => import("./pages/ToolDetail"));
const ToolSubmit = lazy(() => import("./pages/ToolSubmit"));
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
const ApplyStatus = lazy(() => import("./pages/ApplyStatus"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const AdminApplications = lazy(() => import("./pages/AdminApplications"));
const AdminApplicationDetail = lazy(() => import("./pages/AdminApplicationDetail"));
const InvestorJourneyForm = lazy(() => import("./pages/InvestorForm"));
const ClaimSeeds = lazy(() => import("./pages/ClaimSeeds"));
const Connect = lazy(() => import("./pages/Connect"));
const Admin = lazy(() => import("./pages/Admin"));
const Showcase = lazy(() => import("./pages/Showcase"));
const CrowdPooling = lazy(() => import("./pages/CrowdPooling"));
const CrowdPoolingProjects = lazy(() => import("./pages/CrowdPoolingProjects"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const PlayerProfileByHandle = lazy(() => import("./pages/PlayerProfileByHandle"));
const BridgeHypha = lazy(() => import("./pages/BridgeHypha"));
const DecisionsDashboard = lazy(() => import("./pages/DecisionsDashboard"));
const GovCreate = lazy(() => import("./pages/GovCreate"));
const GovTenant = lazy(() => import("./pages/GovTenant"));
const StorytellerStories = lazy(() => import("./pages/StorytellerStories"));
const GovBackField = lazy(() => import("./pages/GovBackField"));
const CreateCampaign = lazy(() => import("./pages/CreateCampaign"));
const CrowdPoolingCampaigns = lazy(() => import("./pages/CrowdPoolingCampaigns"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const CampaignManage = lazy(() => import("./pages/CampaignManage"));
const CampaignAnalytics = lazy(() => import("./pages/CampaignAnalytics"));
const MapPage = lazy(() => import("./pages/Map"));
const ProjectComparison = lazy(() => import("./pages/ProjectComparison"));
const Governance = lazy(() => import("./pages/Governance"));
const ReGenCoCreatorsGuide = lazy(() => import("./pages/ReGenCoCreatorsGuide"));
const LOI = lazy(() => import("./pages/LOI"));
const RiskDisclosure = lazy(() => import("./pages/RiskDisclosure"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Disclaimers = lazy(() => import("./pages/Disclaimers"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
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
const FeatureSuggestions = lazy(() => import("./pages/FeatureSuggestions"));
const Tokenomics = lazy(() => import("./pages/Tokenomics"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const EventSeries = lazy(() => import("./pages/EventSeries"));

function NewsletterConfirm() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const confirmMutation = trpc.newsletter.confirm.useMutation({
    onSuccess: () => setStatus('success'),
    onError: () => setStatus('error'),
  });
  useEffect(() => { if (token) confirmMutation.mutate({ token }); else setStatus('error'); }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
      <div className="text-center p-8 max-w-md">
        {status === 'loading' && <p className="text-[#1a472a]">Confirming your subscription...</p>}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-[#1a472a] mb-3">You're confirmed!</h1>
            <p className="text-[#4a5568]">Welcome to the ReGen Civics newsletter. You'll receive updates about the Regenerative Renaissance.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-700 mb-3">Link expired or invalid</h1>
            <p className="text-[#4a5568]">This confirmation link may have expired (24h). Please subscribe again to receive a new link.</p>
          </>
        )}
      </div>
    </div>
  );
}
const ReGenGames = lazy(() => import("./pages/ReGenGames"));
const CustomGames = lazy(() => import("./pages/CustomGames"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Messages = lazy(() => import("./pages/Messages"));
const MemberDirectory = lazy(() => import("./pages/MemberDirectory"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const ShapeNextSession = lazy(() => import("./pages/ShapeNextSession"));
const Checkin = lazy(() => import("./pages/Checkin"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Accessibility = lazy(() => import("./pages/Accessibility"));

// Loading spinner component using Seed of Life
function PageLoader() {
  return <TaoSpinner size={72} fullPage={true} />;
}
function EB({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// ErrorBoundary wrapper that redirects to a fallback URL instead of showing
// an error screen. Used for auth-gated pages where a crash should gracefully
// send the visitor to the public intake form.
function EBRedirect({ children, to }: { children: ReactNode; to: string }) {
  return (
    <ErrorBoundary fallback={<Redirect to={to} />}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><EB><Home /></EB></Route>
      <Route path={"/form"}>{() => { window.location.replace('/connect'); return null; }}</Route>
      <Route path={"/quest/:slug"}><EB><Quest /></EB></Route>
      <Route path={"/quest"}><EB><Quest /></EB></Route>
      <Route path={"/fund"}><EB><Fund /></EB></Route>
      <Route path={"/land"}><EB><Land /></EB></Route>
      <Route path={"/ally"}><EB><Ally /></EB></Route>
      <Route path={"/play"}><EB><Play /></EB></Route>
      <Route path={"/opportunity"}><EBRedirect to="/investor"><Opportunity /></EBRedirect></Route>
      <Route path={"/governance"}><EB><Governance /></EB></Route>
      <Route path={"/co-creators-guide"}><EB><ReGenCoCreatorsGuide /></EB></Route>
      <Route path={"/tokenomics"}><EB><Tokenomics /></EB></Route>
      <Route path={"/loi"}><EB><LOI /></EB></Route>
      <Route path={"/404"}><EB><NotFound /></EB></Route>
      <Route path={"/investmentform"}>{() => { window.location.replace('/investor'); return null; }}</Route>
      <Route path={"/investor-form"}>{() => { window.location.replace('/investor'); return null; }}</Route>
      <Route path={"/socials"}><EB><Socials /></EB></Route>
      <Route path={"/seasons"}><EB><Seasons /></EB></Route>
      <Route path={"/schedule"}><EB><Schedule /></EB></Route>
      <Route path={"/checkin/:token"}><EB><Checkin /></EB></Route>
      <Route path={"/events/:id"}><EB><EventDetail /></EB></Route>
      <Route path={"/series/:season"}><EB><EventSeries /></EB></Route>
      <Route path={"/shape-next-session"}><EB><ShapeNextSession /></EB></Route>
      <Route path={"/team"}><EB><Team /></EB></Route>
      <Route path={"/game"}><EB><Game /></EB></Route>
      <Route path={"/calculator"}><EB><Calculator /></EB></Route>
      <Route path={"/blog"}><EB><Blog /></EB></Route>
      <Route path={"/blog/:slug"}><EB><BlogPost /></EB></Route>
      <Route path={"/apply"}><EB><Apply /></EB></Route>
      <Route path={"/apply/success"}><EB><ApplySuccess /></EB></Route>
      <Route path={"/apply/status"}><EB><ApplyStatus /></EB></Route>
      <Route path={"/my-applications"}><EB><MyApplications /></EB></Route>
      <Route path={"/admin/applications"}><EB><AdminApplications /></EB></Route>
      <Route path={"/admin/application/:id"}><EB><AdminApplicationDetail /></EB></Route>
      <Route path={"/investor"}><EB><InvestorJourneyForm /></EB></Route>
      <Route path={"/claim-seeds"}><EB><ClaimSeeds /></EB></Route>
      <Route path={"/connect"}><EB><Connect /></EB></Route>
      <Route path={"/admin"}><EB><Admin /></EB></Route>
      <Route path={"/showcase"}><EB><Showcase /></EB></Route>
      <Route path={"/crowd-pooling"}><EB><CrowdPooling /></EB></Route>
      <Route path={"/crowd-pooling-projects"}><EB><CrowdPoolingProjects /></EB></Route>
      <Route path={"/compare-projects"}><EB><ProjectComparison /></EB></Route>
      <Route path={"/profile"}><EB><PlayerProfile /></EB></Route>
      <Route path={"/profile/:handle"}><EB><PlayerProfileByHandle /></EB></Route>
      <Route path={"/bridge/hypha/:bridgeKey"}><EB><BridgeHypha /></EB></Route>
      <Route path={"/community/decisions"}><EB><DecisionsDashboard /></EB></Route>
      <Route path={"/community/decisions/stories"}><EB><StorytellerStories /></EB></Route>
      <Route path={"/gov/create"}><EB><GovCreate /></EB></Route>
      <Route path={"/gov/:slug/backfield"}><EB><GovBackField /></EB></Route>
      <Route path={"/gov/:slug"}><EB><GovTenant /></EB></Route>
      <Route path={"/create-campaign"}><EB><CreateCampaign /></EB></Route>
      <Route path={"/campaigns"}>{() => { window.location.href = '/crowd-pooling-projects'; return null; }}</Route>
      <Route path={"/campaign/:id"}><EB><CampaignDetail /></EB></Route>
      <Route path={"/campaign/:id/manage"}><EB><CampaignManage /></EB></Route>
      <Route path={"/campaign/:id/analytics"}><EB><CampaignAnalytics /></EB></Route>
      <Route path={"/map"}><EB><MapPage /></EB></Route>
      <Route path={"/risk-disclosure"}><EB><RiskDisclosure /></EB></Route>
      <Route path={"/terms-of-use"}><EB><TermsOfUse /></EB></Route>
      <Route path={"/privacy-policy"}><EB><PrivacyPolicy /></EB></Route>
      <Route path={"/disclaimers"}><EB><Disclaimers /></EB></Route>
      <Route path={"/unsubscribe"}><EB><Unsubscribe /></EB></Route>
      <Route path={"/community"}><EB><Community /></EB></Route>
      <Route path={"/community/c/:slug"}><EB><CommunityCategory /></EB></Route>
      <Route path={"/community/post/:id"}><EB><CommunityPost /></EB></Route>
      <Route path={"/community/new"}><EB><CommunityNewPost /></EB></Route>
      <Route path={"/community/tag/:tag"}><EB><CommunityTagFilter /></EB></Route>
      <Route path={"/community/chains"}><EB><CommunityChains /></EB></Route>
      <Route path={"/community/seeking-team"}><EB><CommunitySeekingTeam /></EB></Route>
      <Route path={"/community/members"}><EB><MemberDirectory /></EB></Route>
      <Route path={"/community/guidelines"}><EB><CommunityGuidelines /></EB></Route>
      <Route path={"/messages/:conversationId?"}><EB><Messages /></EB></Route>
      <Route path={"/messages"}><EB><Messages /></EB></Route>
      <Route path={"/community/lessons"}>{() => <Redirect to="/community/tag/lesson" />}</Route>
      <Route path={"/community/seeking-support"}>{() => <Redirect to="/community/tag/seeking-support" />}</Route>
      <Route path={"/community/offering-support"}>{() => <Redirect to="/community/tag/offering-support" />}</Route>
      <Route path={"/community/quests"}><EB><QuestSuggestions /></EB></Route>
      <Route path={"/community/user/:id"}><EB><UserForumProfile /></EB></Route>
      <Route path={"/admin/moderation"}><EB><AdminModeration /></EB></Route>
      <Route path={"/accessibility"}><EB><Accessibility /></EB></Route>
      <Route path={"/glossary"}><EB><Glossary /></EB></Route>
      <Route path={"/features"}><EB><FeatureSuggestions /></EB></Route>
      <Route path={"/newsletter"}><EB><Newsletter /></EB></Route>
      <Route path={"/newsletter/confirm"}><EB><NewsletterConfirm /></EB></Route>
      <Route path={"/bionomics"}><EB><Bionomics /></EB></Route>
      <Route path={"/economy"}><Redirect to="/bionomics" /></Route>
      <Route path={"/local-food-economy"}><Redirect to="/bionomics#local-food-economies" /></Route>
      <Route path={"/heal-the-land"}><EB><HealTheLand /></EB></Route>
      <Route path={"/hymn-book/:slug"}><EB><HymnPlayer /></EB></Route>
      <Route path={"/hymn-book"}><EB><HymnBook /></EB></Route>
      <Route path={"/proposals"}><EB><Proposals /></EB></Route>
      <Route path={"/game-mechanics"}><EB><GameMechanics /></EB></Route>
      <Route path={"/tools"}><EB><ToolsLibrary /></EB></Route>
      <Route path={"/tools/submit"}><EB><ToolSubmit /></EB></Route>
      <Route path={"/tools/:slug"}><EB><ToolDetail /></EB></Route>
      <Route path={"/regen-games"}><EB><ReGenGames /></EB></Route>
      <Route path={"/custom-games"}><EB><CustomGames /></EB></Route>
      <Route path={"/marketplace"}><EB><Marketplace /></EB></Route>
      <Route path="/404"><EB><NotFound /></EB></Route>
      {/* Final fallback route */}
      <Route><EB><NotFound /></EB></Route>
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

/** Renders OnboardingWizard for authenticated new users */
function OnboardingController() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading || !isAuthenticated || !user) return null;
  return <Suspense fallback={null}><OnboardingWizard user={user} /></Suspense>;
}

/** Handles returnTo redirect after login: if sessionStorage has a saved path, redirect there once authed */
function ReturnToHandler() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useWouterLocation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    const returnTo = sessionStorage.getItem("returnTo");
    if (!returnTo || returnTo === "/" || returnTo.startsWith("/login")) return;
    sessionStorage.removeItem("returnTo");
    setLocation(returnTo);
  }, [isAuthenticated, loading, setLocation]);

  return null;
}

function AppInner() {
  useGlobalScrollReveal();
  useFocusOnNavigation();
  return null;
}

function App() {
  const [location] = useLocation();
  const adminMode = isAdminRoute(location);
  // Track page visits for progress map milestones
  usePageVisitTracker();
  // Capture referral params on first load
  captureReferral();

  // Maintenance mode, toggle VITE_MAINTENANCE_MODE=true in Railway env vars before risky deploys
  if (import.meta.env.VITE_MAINTENANCE_MODE === "true") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d2818]">
        <TaoSpinner size={72} showQuote={false} fullPage={false} className="mb-6" />
        <p
          className="text-[#d4a574] text-lg font-light tracking-wide mt-2"
          style={{ fontFamily: "var(--font-body)" }}
        >
          We're tending the garden. Back shortly.
        </p>
        <p className="text-[#7a9e7a]/50 text-sm mt-3">regencivics.earth</p>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<TaoErrorState />}>
      <AudioProvider>
      <ReGenGuideProvider>
      <ThemeProvider defaultTheme="dark">
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
          {!adminMode && <div className={`seasonal-wash seasonal-wash--${getCurrentSeason()}`} />}
          {!adminMode && <MycelialBackground />}
          {!adminMode && <AnimationLayer />}
          {!adminMode && <AMABanner />}
          {!adminMode && <Navigation />}
          <main id="main-content" className="pb-20">
            <Router />
          </main>
          {!adminMode && !location.startsWith("/bionomics") && !location.startsWith("/economy") && !location.startsWith("/admin") && (
            location === "/" || location.startsWith("/play") || location.startsWith("/quest") || location.startsWith("/game") || location.startsWith("/local-food")
          ) && (
            <GameHookBanner
              variant={
                location.startsWith("/play") ? "play"
                : location.startsWith("/quest") ? "quest"
                : location.startsWith("/game") ? "game"
                : location.startsWith("/local-food") ? "food"
                : "home"
              }
            />
          )}
          {!adminMode && <SiteFooter />}
          {!adminMode && <Suspense fallback={null}><CookieConsent /></Suspense>}
          <AnalyticsLoader />
          {!adminMode && <ScrollToTop />}
          {!adminMode && <Suspense fallback={null}><ReGenGuide /></Suspense>}
          {!adminMode && <AppInner />}
          {!adminMode && <Suspense fallback={null}><ExitIntentCapture /></Suspense>}
          {!adminMode && <Suspense fallback={null}><CommandPalette /></Suspense>}
          {!adminMode && <Suspense fallback={null}><ShortcutPill onOpen={() => window.dispatchEvent(new CustomEvent("open-command-palette"))} /></Suspense>}
          {!adminMode && <WizardRadialMenu />}
          {!adminMode && <MobileMoreMenu />}
          {/* SiteTour removed -- Fix 82; ReGenGuide is now the single help entry point */}
          {!adminMode && <OnboardingController />}
          {!adminMode && <Suspense fallback={null}><RegenIntroGate /></Suspense>}
          <ReturnToHandler />
        </TooltipProvider>
      </ThemeProvider>
      </ReGenGuideProvider>
      </AudioProvider>
    </ErrorBoundary>
  );
}

export default App;
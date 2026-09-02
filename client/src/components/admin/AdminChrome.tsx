import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Menu, Search, Sparkles, Lock, Home as HomeIcon, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSpeedDial } from "@/components/admin/AdminSpeedDial";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { navItemById, writeAdminContinue, writeAdminContinueFromTab, adminTabHref, type NavItem } from "@/lib/adminNav";
import { recordAdminVisit } from "@/lib/adminUsage";
import { trpc } from "@/lib/trpc";
import { inquiryTypeForPath } from "@/lib/adminInquiry";

function openAssistant() {
  window.dispatchEvent(new CustomEvent("admin-ea-open"));
}

function AdminChromeSearch({
  onSelectTab,
}: {
  onSelectTab: (tab: string, extras?: { type?: string; open?: string }) => void;
}) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: applications } = trpc.applications.list.useQuery(undefined, { retry: false });
  const { data: investors } = trpc.investorInquiries.list.useQuery(undefined, { retry: false });
  const { data: inquiries } = trpc.generalInquiries.list.useQuery(undefined, { retry: false });
  const { data: trpcSearchResults } = trpc.globalSearch.query.useQuery(
    { q: debounced },
    { enabled: debounced.length >= 2 },
  );

  const needle = q.trim().toLowerCase();
  const searching = needle.length >= 2;
  const results = searching
    ? {
        investors: (investors || [])
          .filter((i: any) =>
            i.fullName?.toLowerCase().includes(needle) ||
            i.email?.toLowerCase().includes(needle) ||
            i.organization?.toLowerCase().includes(needle),
          )
          .slice(0, 4),
        applications: (applications || [])
          .filter((a: any) =>
            a.projectName?.toLowerCase().includes(needle) ||
            a.contactName?.toLowerCase().includes(needle) ||
            a.location?.toLowerCase().includes(needle),
          )
          .slice(0, 4),
        inquiries: (inquiries || [])
          .filter((i: any) =>
            i.fullName?.toLowerCase().includes(needle) || i.email?.toLowerCase().includes(needle),
          )
          .slice(0, 4),
        forumPosts: trpcSearchResults?.forumPosts ?? [],
        campaigns: trpcSearchResults?.campaigns ?? [],
      }
    : null;

  const pickInquiry = (inquiry: any) => {
    onSelectTab("inquiries", { type: inquiryTypeForPath(inquiry.pathType), open: String(inquiry.id) });
    setQ("");
    setOpen(false);
  };
  const pickInvestor = (investor: any) => {
    onSelectTab("investors", { open: String(investor.id) });
    setQ("");
    setOpen(false);
  };
  const pickApplication = (app: any) => {
    navigate(`/admin/application/${app.id}`);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/75 pointer-events-none" />
      <input
        type="text"
        data-global-search
        placeholder="Search contacts, projects, posts"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full min-h-11 pl-9 pr-8 py-2 text-sm border border-[#1a472a]/40 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/80 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
        aria-label="Search contacts, projects, posts"
      />
      {q && (
        <button type="button" onClick={() => { setQ(""); setOpen(false); }} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center text-[#1a472a]/75 hover:text-[#1a472a]">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && searching && results && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#1a472a]/20 rounded-xl shadow-xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
          {results.investors.length === 0 && results.applications.length === 0 && results.inquiries.length === 0 && results.forumPosts.length === 0 && results.campaigns.length === 0 ? (
            <p className="p-4 text-sm text-[#1a472a]/75 text-center">No results for "{q}"</p>
          ) : (
            <div className="divide-y divide-[#1a472a]/10">
              {results.inquiries.map((i: any) => (
                <button key={`inq-${i.id}`} type="button" className="w-full text-left px-3 py-2.5 min-h-11 hover:bg-[#f0f7f0]" onClick={() => pickInquiry(i)}>
                  <span className="block text-sm font-medium text-[#1a472a]">{i.fullName || i.email}</span>
                  <span className="block text-xs text-[#1a472a]/75">Inquiry · {i.pathType?.replace(/_/g, " ")}</span>
                </button>
              ))}
              {results.investors.map((i: any) => (
                <button key={`inv-${i.id}`} type="button" className="w-full text-left px-3 py-2.5 min-h-11 hover:bg-[#f0f7f0]" onClick={() => pickInvestor(i)}>
                  <span className="block text-sm font-medium text-[#1a472a]">{i.fullName}</span>
                  <span className="block text-xs text-[#1a472a]/75">Investor · {i.email}</span>
                </button>
              ))}
              {results.applications.map((a: any) => (
                <button key={`app-${a.id}`} type="button" className="w-full text-left px-3 py-2.5 min-h-11 hover:bg-[#f0f7f0]" onClick={() => pickApplication(a)}>
                  <span className="block text-sm font-medium text-[#1a472a]">{a.projectName || a.contactName}</span>
                  <span className="block text-xs text-[#1a472a]/75">Application · {a.location}</span>
                </button>
              ))}
              {results.campaigns.map((c: any) => (
                <a key={`c-${c.id}`} href={c.url} className="block px-3 py-2.5 min-h-11 hover:bg-[#f0f7f0] text-sm text-[#1a472a]" onClick={() => setQ("")}>{c.title}</a>
              ))}
              {results.forumPosts.map((p: any) => (
                <a key={`p-${p.id}`} href={p.url} className="block px-3 py-2.5 min-h-11 hover:bg-[#f0f7f0] text-sm text-[#1a472a]" onClick={() => setQ("")}>{p.title}</a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminChrome({
  activeTab,
  onTabChange,
  children,
  pendingCount,
  onNotif,
}: {
  activeTab: string;
  onTabChange?: (tab: string, extras?: { type?: string; open?: string }) => void;
  children: React.ReactNode;
  pendingCount?: number;
  onNotif?: () => void;
}) {
  const [, navigate] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    writeAdminContinueFromTab(activeTab);
  }, [activeTab]);

  const goItem = (item: NavItem) => {
    if (item.route) {
      recordAdminVisit(item.id);
      writeAdminContinue(item);
      navigate(item.route);
    } else if (onTabChange) {
      onTabChange(item.id);
    } else {
      recordAdminVisit(item.id);
      writeAdminContinue(item);
      navigate(adminTabHref(item.id));
    }
    setMobileNavOpen(false);
  };

  const handleTab = (tab: string, extras?: { type?: string; open?: string }) => {
    const item = navItemById(tab);
    if (item?.route) {
      recordAdminVisit(tab);
      writeAdminContinueFromTab(tab);
      navigate(item.route);
      setMobileNavOpen(false);
      return;
    }
    if (onTabChange) onTabChange(tab, extras);
    else {
      recordAdminVisit(tab);
      writeAdminContinueFromTab(tab);
      navigate(adminTabHref(tab, extras));
    }
    setMobileNavOpen(false);
  };

  return (
    <div className="admin-root flex h-[100dvh] overflow-hidden bg-[#f0ebe3]">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={(tab) => handleTab(tab)}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        footer={
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("admin_authenticated");
              window.location.reload();
            }}
            className="w-full flex items-center gap-3 px-3 min-h-11 text-sm text-white/85 hover:text-white hover:bg-white/5"
          >
            <Lock size={16} />
            Logout
          </button>
        }
      />
      <AdminCommandPalette onSelectTab={(tab) => handleTab(tab)} />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <header className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white">
          <div className="px-3 md:px-6 py-2.5 md:py-4 flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10"
              aria-label="Open admin menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img src="/images/logos/regencivics-logo-dark-transparent-rounded.webp" alt="" className="hidden md:block w-10 h-10 object-contain flex-shrink-0" width={40} height={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-2xl font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>
                  Admin
                </h1>
                {!!pendingCount && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-400 text-[#1a472a] text-xs font-bold min-w-[24px]">
                    {pendingCount}
                  </span>
                )}
              </div>
              <p className="hidden md:block text-white/85 text-sm">Work waiting on you, then everything else.</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10"
              aria-label="Search"
              aria-expanded={mobileSearchOpen}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={openAssistant}
              className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10"
              aria-label="Ask"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            {onNotif && (
              <button
                type="button"
                onClick={onNotif}
                className="hidden md:inline-flex relative p-2 min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10"
                aria-label="Notification Center"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
            <a href="/" className="hidden md:inline-flex">
              <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 min-h-11">
                <HomeIcon className="w-4 h-4 mr-2" />
                Site
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex border-white/30 text-white hover:bg-white/10 min-h-11"
              onClick={() => {
                localStorage.removeItem("admin_authenticated");
                window.location.reload();
              }}
            >
              <Lock className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
          <div className={`px-3 md:px-6 pb-3 ${mobileSearchOpen ? "block" : "hidden md:block"}`}>
            <AdminChromeSearch onSelectTab={handleTab} />
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="container py-6 md:py-8 pb-28">{children}</div>
        </div>
      </div>
      <AdminSpeedDial onAsk={openAssistant} onNavigate={goItem} />
    </div>
  );
}

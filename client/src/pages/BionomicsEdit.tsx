/**
 * Admin-only inline copy editor for /bionomics.
 * Gate: Rye's email (rieki.cordon@gmail.com). Everyone else gets a 404-style notice.
 *
 * Edits are persisted to localStorage so you can preview them live by
 * visiting /bionomics in the same browser. To ship edits to production,
 * copy the JSON diff and either paste it back into bionomicsContent.ts
 * as new defaults, or wire up a pageContent DB table and migrate.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, RotateCcw, Save, ExternalLink, Eye, FileJson } from "lucide-react";
import {
  BIONOMICS_SECTIONS,
  readBionomicsOverrides,
  writeBionomicsOverrides,
  clearBionomicsOverrides,
} from "@/content/bionomicsContent";

const SUPER_ADMIN_EMAIL = "rieki.cordon@gmail.com";

export default function BionomicsEdit() {
  const { user } = useAuth();
  const canEdit = user?.email === SUPER_ADMIN_EMAIL;

  // Build a keyed draft map: sectionId -> current text in the textarea.
  const initialDraft = useMemo(() => {
    const overrides = readBionomicsOverrides();
    const draft: Record<string, string> = {};
    for (const section of BIONOMICS_SECTIONS) {
      draft[section.id] = overrides[section.id] ?? section.defaultText;
    }
    return draft;
  }, []);

  const [draft, setDraft] = useState<Record<string, string>>(initialDraft);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Dirty flag: any field differs from its saved override (or default if no override).
  const dirtyIds = useMemo(() => {
    const overrides = readBionomicsOverrides();
    const ids: string[] = [];
    for (const section of BIONOMICS_SECTIONS) {
      const saved = overrides[section.id] ?? section.defaultText;
      if (draft[section.id] !== saved) ids.push(section.id);
    }
    return ids;
  }, [draft, savedAt]);

  // Keyboard shortcut: cmd/ctrl+s saves.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveAll();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function saveAll() {
    const overrides: Record<string, string> = {};
    for (const section of BIONOMICS_SECTIONS) {
      if (draft[section.id] !== section.defaultText) {
        overrides[section.id] = draft[section.id];
      }
    }
    writeBionomicsOverrides(overrides);
    setSavedAt(Date.now());
    toast.success("Saved locally", {
      description: "Refresh /bionomics to preview. Not yet live for other visitors.",
    });
  }

  function resetAll() {
    if (!confirm("Reset every section back to the committed default? Your local edits will be lost.")) return;
    clearBionomicsOverrides();
    const next: Record<string, string> = {};
    for (const section of BIONOMICS_SECTIONS) next[section.id] = section.defaultText;
    setDraft(next);
    setSavedAt(Date.now());
    toast.success("Reset complete");
  }

  function resetSection(id: string) {
    const section = BIONOMICS_SECTIONS.find((s) => s.id === id);
    if (!section) return;
    setDraft((d) => ({ ...d, [id]: section.defaultText }));
  }

  function copyJsonPatch() {
    const patch: Record<string, string> = {};
    for (const section of BIONOMICS_SECTIONS) {
      if (draft[section.id] !== section.defaultText) {
        patch[section.id] = draft[section.id];
      }
    }
    const json = JSON.stringify(patch, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("JSON patch copied", {
      description: "Paste this in chat or commit it to bionomicsContent.ts defaults.",
    });
  }

  if (!canEdit) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-[#0d2818] via-[#1a472a] to-[#0d2818]">
          <div className="container mx-auto px-4 pt-8">
            <BackButton />
          </div>
          <div className="container max-w-2xl mx-auto px-4 py-20 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Not available</h1>
            <p className="text-white/70 mb-6">
              This is an admin-only editor for the Bionomics page. If you were looking for the public page, head back here.
            </p>
            <Link href="/bionomics">
              <Button className="bg-[#7dd87d]/15 hover:bg-[#7dd87d]/25 text-[#7dd87d] border border-[#7dd87d]/40">
                Go to Bionomics
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SEO title="Edit Bionomics | Admin" description="Admin-only inline editor for the Bionomics page copy." />
      <div className="min-h-screen bg-gradient-to-br from-[#0d2818] via-[#1a472a] to-[#0d2818]">
        <div className="container mx-auto px-4 pt-8">
          <BackButton />
        </div>

        <section className="container max-w-3xl mx-auto px-4 pt-6 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40 text-xs">
              Admin
            </Badge>
            <Badge className="bg-[#7dd87d]/15 text-[#7dd87d] border border-[#7dd87d]/40 text-xs">
              Bionomics copy editor
            </Badge>
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Edit Bionomics page copy
          </h1>
          <p className="text-white/70 leading-relaxed mb-6 safe-prose">
            Rewrite any of the main Bionomics copy blocks below. Save to preview live at{" "}
            <Link href="/bionomics" className="text-[#7dd87d] underline hover:text-[#a8e6a8]">
              /bionomics
            </Link>
            . Edits live in your browser only until you export the JSON patch and commit it to{" "}
            <code className="text-[11px] bg-white/10 px-1.5 py-0.5 rounded">client/src/content/bionomicsContent.ts</code>.
          </p>

          {/* Sticky toolbar */}
          <div className="sticky top-4 z-10 rounded-xl border border-white/10 bg-[#0d2818]/85 backdrop-blur px-4 py-3 mb-6 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={saveAll}
              disabled={dirtyIds.length === 0}
              className="bg-[#7dd87d]/15 hover:bg-[#7dd87d]/25 text-[#7dd87d] border border-[#7dd87d]/40 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save all
              {dirtyIds.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#7dd87d]/20 rounded px-1.5 py-0.5">
                  {dirtyIds.length} pending
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyJsonPatch}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <FileJson className="w-3.5 h-3.5 mr-1.5" />
              Copy JSON patch
            </Button>
            <Link href="/bionomics" className="ml-auto">
              <Button size="sm" variant="ghost" className="text-white/70 hover:text-white">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetAll}
              className="text-red-400/80 hover:text-red-300 hover:bg-red-500/10"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset all
            </Button>
          </div>

          <div className="space-y-5">
            {BIONOMICS_SECTIONS.map((section) => {
              const current = draft[section.id] ?? "";
              const isDirty = dirtyIds.includes(section.id);
              const isChanged = current !== section.defaultText;
              return (
                <Card key={section.id} className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <span className="flex-1">{section.label}</span>
                      {isDirty && (
                        <Badge className="bg-amber-500/15 text-amber-300 border border-amber-400/40 text-[10px]">
                          Unsaved
                        </Badge>
                      )}
                      {!isDirty && isChanged && (
                        <Badge className="bg-[#7dd87d]/15 text-[#7dd87d] border border-[#7dd87d]/40 text-[10px]">
                          Edited
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-white/70 mt-1">{section.description}</p>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={current}
                      onChange={(e) => setDraft((d) => ({ ...d, [section.id]: e.target.value }))}
                      rows={Math.max(3, Math.ceil(current.length / 90))}
                      className="w-full bg-[#0a1a10] border border-white/15 rounded-lg px-3 py-2 text-white text-sm leading-relaxed focus:outline-none focus:border-[#7dd87d]/50 resize-y"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-white/45">
                        {current.length} character{current.length === 1 ? "" : "s"}
                      </p>
                      {isChanged && (
                        <button
                          type="button"
                          onClick={() => resetSection(section.id)}
                          className="text-[11px] text-white/70 hover:text-white/85 inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Revert to default
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 rounded-xl border border-[#d4a574]/30 bg-[#d4a574]/5 p-5">
            <h3 className="text-sm font-bold text-[#d4a574] uppercase tracking-widest mb-2 flex items-center gap-2">
              <Copy className="w-4 h-4" /> How to ship your edits
            </h3>
            <ol className="space-y-2 text-sm text-white/80 list-decimal list-inside leading-relaxed">
              <li>Edit any block above. Save locally to preview on /bionomics.</li>
              <li>Once you're happy, click Copy JSON patch and paste it in chat.</li>
              <li>
                The patch JSON gets folded into{" "}
                <code className="text-[11px] bg-white/10 px-1.5 py-0.5 rounded">bionomicsContent.ts</code>{" "}
                as new defaults so every visitor sees the new copy.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

/**
 * DesignCompanion: a calm, collapsible "Design coach" side panel the builder can
 * open at any step of the campaign creator. It holds a small chat.
 *
 * On first open it asks the server companion for an opening coaching pass
 * (message: ''). The builder can then type. Each reply renders as prose, and
 * each suggestion renders as a card with an "Add to campaign" button. Nothing
 * is ever added automatically; the builder taps Add and the parent decides
 * where it lands (a role for kind role/shift, otherwise an other-need).
 *
 * The server contract (trpc.campaigns.designCompanion) is being built in
 * parallel, so we call it defensively and treat every failure as expected.
 * If it errors or returns nothing, we fall back to the deterministic client
 * coach (recommendGaps over analyzeCoverage) so the panel is useful with the
 * AI off. The coach encourages well-roundedness; it never blocks a launch.
 *
 * Assumed return shape (see CompanionResponse): { reply, suggestions[], coverage,
 * gaps, coverageNote? }, where each suggestion is
 * { title, capitalType, kind, hoursPerWeek?, weeks?, estimatedValue, rationale }.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Plus, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  analyzeCoverage,
  recommendGaps,
  type CoachNeedInput,
} from '@shared/crowdpoolCoach';
import { CAPITAL_LABELS, type CapitalType } from '@shared/crowdpoolingTaxonomy';

/** One suggestion the coach offers. The parent maps it into the right list. */
export interface CompanionSuggestion {
  title: string;
  capitalType: CapitalType | string;
  kind: string;
  hoursPerWeek?: number;
  weeks?: number;
  estimatedValue: number;
  rationale: string;
}

/** A need the parent already holds, passed in so the coach sees the draft. */
export interface CompanionDraftNeed extends CoachNeedInput {
  title?: string;
}

export interface CompanionDraft {
  projectName?: string;
  location?: string;
  region?: string;
  vision?: string;
  needs: CompanionDraftNeed[];
}

interface DesignCompanionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CompanionDraft;
  onAddSuggestion: (need: CompanionSuggestion) => void;
  currencySymbol?: string;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** What we expect back from trpc.campaigns.designCompanion. */
interface CompanionResponse {
  reply?: string;
  suggestions?: CompanionSuggestion[];
  coverage?: unknown;
  gaps?: unknown;
  coverageNote?: string;
}

function formatMoney(amount: number, symbol: string): string {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export function DesignCompanion({
  open,
  onOpenChange,
  draft,
  onAddSuggestion,
  currencySymbol = '$',
}: DesignCompanionProps) {
  // The procedure is being built in parallel; cast so this compiles and runs
  // whether or not the server side has landed yet. Failures degrade to the
  // deterministic fallback below.
  const companion = (trpc as unknown as {
    campaigns: {
      designCompanion: {
        useMutation: () => {
          mutateAsync: (input: unknown) => Promise<CompanionResponse>;
        };
      };
    };
  }).campaigns.designCompanion.useMutation();

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [suggestions, setSuggestions] = useState<CompanionSuggestion[]>([]);
  const [coverageNote, setCoverageNote] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [errored, setErrored] = useState(false);
  const [pending, setPending] = useState(false);

  const openedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Keep the latest draft available without re-binding send on every keystroke.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const historyRef = useRef<ChatTurn[]>([]);
  historyRef.current = history;

  async function send(message: string) {
    const trimmed = message.trim();
    if (trimmed) setHistory((h) => [...h, { role: 'user', content: trimmed }]);
    setInput('');
    setPending(true);
    try {
      const current = draftRef.current;
      const res = await companion.mutateAsync({
        history: historyRef.current,
        draft: {
          projectName: current.projectName,
          location: current.location,
          region: current.region,
          vision: current.vision,
          needs: current.needs.map((n) => ({
            title: n.title ?? '',
            capitalType: n.capitalType ?? undefined,
            kind: n.kind ?? undefined,
            estimatedValue: n.estimatedValue ?? undefined,
          })),
        },
        message: trimmed,
      });
      const reply = res?.reply?.trim() ?? '';
      const nextSuggestions = Array.isArray(res?.suggestions) ? res!.suggestions! : [];
      if (!reply && nextSuggestions.length === 0) {
        // Nothing usable came back: show the deterministic fallback.
        setErrored(true);
      } else {
        setErrored(false);
        if (reply) setHistory((h) => [...h, { role: 'assistant', content: reply }]);
        setSuggestions(nextSuggestions);
        setCoverageNote(res?.coverageNote?.trim() || null);
      }
    } catch {
      setErrored(true);
    } finally {
      setPending(false);
    }
  }

  // Opening coaching pass, fired once the first time the panel opens.
  useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      void send('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the newest content in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, suggestions, pending, errored]);

  const localCoverage = analyzeCoverage(draft.needs);
  const fallbackGaps = errored ? recommendGaps(localCoverage, { max: 3 }) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md gap-0 p-0 bg-[#f0f7f0] flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 pr-12 border-b border-[#7dd87d]/30 bg-white">
          <SheetTitle
            className="flex items-center gap-2 text-[#1a472a]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Sparkles className="w-5 h-5 text-[#4a7c59]" />
            Design coach
          </SheetTitle>
          <SheetDescription className="text-xs text-[#1a472a]/70">
            A second set of eyes on your campaign. Suggestions only. You choose what to add, and
            nothing here blocks you from launching.
          </SheetDescription>
          <span className="text-xs font-semibold text-[#4a7c59]">
            {localCoverage.coveredCount} of 9 forms covered
          </span>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4">
            {/* Conversation */}
            <div className="space-y-3">
              {history.map((turn, i) => (
                <div
                  key={i}
                  className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={
                      turn.role === 'user'
                        ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#4a7c59] text-white px-3 py-2 text-sm leading-relaxed'
                        : 'max-w-[92%] rounded-2xl rounded-bl-sm bg-white border border-[#7dd87d]/30 text-[#1a472a] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap'
                    }
                  >
                    {turn.content}
                  </div>
                </div>
              ))}

              {pending && (
                <div className="flex items-center gap-2 text-xs text-[#1a472a]/70">
                  <span className="w-2 h-2 rounded-full bg-[#4a7c59] animate-pulse" />
                  Thinking it through...
                </div>
              )}
            </div>

            {/* Live coach suggestions */}
            {!errored && suggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-semibold text-[#1a472a]/60 uppercase tracking-wide">
                  Suggested additions
                </p>
                {suggestions.map((s, i) => (
                  <SuggestionCard
                    key={`${s.title}-${i}`}
                    suggestion={s}
                    currencySymbol={currencySymbol}
                    onAdd={onAddSuggestion}
                  />
                ))}
              </div>
            )}

            {coverageNote && !errored && (
              <p className="mt-3 text-xs text-[#1a472a]/70 leading-relaxed">{coverageNote}</p>
            )}

            {/* Deterministic fallback when the live coach is unavailable */}
            {errored && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-[#1a472a]/70 leading-relaxed">
                  The live coach is resting. Here is what the built-in guide notices about the balance
                  of capitals in your draft.
                </p>
                {fallbackGaps.length === 0 ? (
                  <p className="text-sm text-[#1a472a] leading-relaxed">
                    You are covering all nine forms of capital. That is a well-rounded campaign. Add
                    more where it genuinely fits, or move on to launch.
                  </p>
                ) : (
                  fallbackGaps.map((gap) => (
                    <div
                      key={gap.capital}
                      className="rounded-xl bg-white border border-[#7dd87d]/30 p-3"
                    >
                      <span className="text-[11px] bg-[#f0f7f0] px-2 py-0.5 rounded-full text-[#4a7c59] font-medium">
                        {gap.label} capital
                      </span>
                      <p className="text-xs text-[#1a472a]/80 my-2 leading-relaxed">{gap.reason}</p>
                      <div className="space-y-1.5">
                        {gap.suggestedRoles.map((role) => (
                          <SuggestionCard
                            key={role.title}
                            suggestion={{
                              title: role.title,
                              capitalType: gap.capital,
                              kind: 'role',
                              hoursPerWeek: role.defaultHoursPerWeek,
                              weeks: 52,
                              estimatedValue:
                                role.defaultHoursPerWeek * 52 * role.defaultHourlyRate,
                              rationale: role.description,
                            }}
                            currencySymbol={currencySymbol}
                            onAdd={onAddSuggestion}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Ask box */}
        <div className="border-t border-[#7dd87d]/30 bg-white p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && !pending) void send(input);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the coach about your campaign..."
              className="flex-1 bg-white border-[#7dd87d]/30"
              disabled={pending}
            />
            <Button
              type="submit"
              disabled={pending || !input.trim()}
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl px-3 flex-shrink-0"
              aria-label="Send message to the design coach"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** A single add-able suggestion. Adds only when tapped; never automatically. */
function SuggestionCard({
  suggestion,
  currencySymbol,
  onAdd,
}: {
  suggestion: CompanionSuggestion;
  currencySymbol: string;
  onAdd: (need: CompanionSuggestion) => void;
}) {
  const [added, setAdded] = useState(false);
  const capitalLabel =
    CAPITAL_LABELS[suggestion.capitalType as CapitalType]?.label ?? String(suggestion.capitalType);

  return (
    <div className="rounded-xl bg-white border border-[#7dd87d]/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1a472a]">{suggestion.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {capitalLabel && (
              <span className="text-[11px] bg-[#f0f7f0] px-2 py-0.5 rounded-full text-[#4a7c59] font-medium">
                {capitalLabel}
              </span>
            )}
            {suggestion.estimatedValue > 0 && (
              <span className="text-[11px] text-[#1a472a]/70">
                {formatMoney(suggestion.estimatedValue, currencySymbol)}
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            onAdd(suggestion);
            setAdded(true);
          }}
          disabled={added}
          className={
            added
              ? 'bg-[#7dd87d] text-[#1a472a] rounded-lg h-8 flex-shrink-0 whitespace-nowrap'
              : 'bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-lg h-8 flex-shrink-0 whitespace-nowrap'
          }
        >
          {added ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1" />
              Added
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add to campaign
            </>
          )}
        </Button>
      </div>
      {suggestion.rationale && (
        <p className="text-xs text-[#1a472a]/70 mt-2 leading-relaxed">{suggestion.rationale}</p>
      )}
    </div>
  );
}

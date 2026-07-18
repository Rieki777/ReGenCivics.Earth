/**
 * AdminAIAssistant
 * Floating Claude-powered AI chat panel for the /admin dashboard.
 * Lives in the bottom-right corner, expands to a chat panel.
 *
 * Features:
 * - Receives live admin context (active tab, counts, selected contact)
 * - Renders AI action buttons inline when the AI returns <action> blocks
 * - Persists conversation in memory for the session
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, X, Send, Sparkles, Loader2,
  Navigation, Mail, Search, User, Minimize2, Maximize2, StickyNote
} from "lucide-react";
import { HarvestNoteComposer } from "./HarvestNoteComposer";

export interface AdminAIContext {
  activeTab?: string;
  investorCount?: number;
  inquiryCount?: number;
  applicationCount?: number;
  selectedContactEmail?: string;
  selectedContactName?: string;
}

export interface AdminAIAction {
  type: "navigate" | "compose" | "search" | "focus" | "execute" | "execute-confirm" | "undo";
  label: string;
  tab?: string;
  to?: string;
  subject?: string;
  query?: string;
  contactEmail?: string;
  /** For execute/undo: the registry action id + its input. */
  actionId?: string;
  input?: Record<string, unknown>;
}

interface AdminAIAssistantProps {
  context?: AdminAIContext;
  onAction?: (action: AdminAIAction) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: AdminAIAction[];
}

// Parse <action>{...}</action> blocks from AI response
function parseActions(text: string): { clean: string; actions: AdminAIAction[] } {
  const actions: AdminAIAction[] = [];
  const clean = text.replace(/<action>([\s\S]*?)<\/action>/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim());
      actions.push(parsed as AdminAIAction);
    } catch {}
    return "";
  }).trim();
  return { clean, actions };
}

function ActionIcon({ type }: { type: string }) {
  if (type === "navigate") return <Navigation className="w-3 h-3" />;
  if (type === "compose") return <Mail className="w-3 h-3" />;
  if (type === "search") return <Search className="w-3 h-3" />;
  if (type === "focus") return <User className="w-3 h-3" />;
  return <Sparkles className="w-3 h-3" />;
}

/**
 * How long the FAB must be held to open the capture composer.
 *
 * We moved off double-click: on iOS Safari two fast taps are unreliable (the
 * second is often eaten by the double-tap-to-zoom handler even with
 * touch-action set), and a plain long-press is the standard, dependable mobile
 * gesture. 550ms is long enough not to fire on an ordinary tap, short enough
 * not to feel like a hang. Rye floated 2s; that reads as sluggish for a primary
 * affordance, so this is the tuned default — change this one constant if the
 * hold should be longer.
 *
 * Crucially this does NOT touch the single-tap path: a normal tap still opens
 * the assistant via onClick, which has always worked on iOS. Long-press is
 * layered on top for capture, so the reliable gesture stays reliable.
 */
const LONG_PRESS_MS = 550;

/** A press that wanders more than this (px) is a scroll, not a hold — cancel. */
const LONG_PRESS_MOVE_TOLERANCE = 10;

const STARTERS = [
  "Who needs follow-up today?",
  "Summarize the investor pipeline",
  "Draft a welcome email for new inquiries",
  "Which applications are overdue for review?",
];

export function AdminAIAssistant({ context, onAction }: AdminAIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.adminAI.chat.useMutation();
  const executeMutation = trpc.adminActions.execute.useMutation();
  const undoMutation = trpc.adminActions.undo.useMutation();

  // Harvest capture (Phase 1). The long-press-to-capture gesture is a client
  // display gate on admin roles; the save path stays owner-only on the server
  // (quickNotes.create is ownerProcedure), and the composer says so out loud
  // rather than pretending a non-owner's note was saved.
  const [mode, setMode] = useState<"assistant" | "note">("assistant");
  const { user } = useAuth();
  const canCapture = user?.role === "admin" || user?.role === "superadmin";

  const harvestStatus = trpc.quickNotes.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: canCapture,
  });

  const openAssistant = useCallback(() => {
    setMode("assistant");
    setMinimized(false);
    setOpen(true);
  }, []);

  const openComposer = useCallback(() => {
    setMode("note");
    setMinimized(false);
    setOpen(true);
  }, []);

  // Long-press to capture (admins only). Pointer events cover mouse and touch
  // with one code path. The single-tap → assistant path stays on onClick below
  // and is deliberately untouched.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Set true when a long-press fires, so the click that a mouse press-release
  // synthesizes afterward does not then also open the assistant.
  const suppressClick = useRef(false);
  const [pressing, setPressing] = useState(false);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
    setPressing(false);
  }, []);

  useEffect(() => cancelPress, [cancelPress]);

  const onFabPointerDown = useCallback((e: React.PointerEvent) => {
    if (!canCapture) return;
    // Ignore secondary mouse buttons; let the OS handle right-click.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pressStart.current = { x: e.clientX, y: e.clientY };
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      suppressClick.current = true;
      setPressing(false);
      openComposer();
    }, LONG_PRESS_MS);
  }, [canCapture, openComposer]);

  const onFabPointerMove = useCallback((e: React.PointerEvent) => {
    const start = pressStart.current;
    if (!start) return;
    // A finger that travels is scrolling the page, not holding the button.
    if (
      Math.abs(e.clientX - start.x) > LONG_PRESS_MOVE_TOLERANCE ||
      Math.abs(e.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelPress();
    }
  }, [cancelPress]);

  const handleFabClick = useCallback(() => {
    // Swallow the click that trails a completed long-press (mouse only).
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    openAssistant();
  }, [openAssistant]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages, scrollToBottom]);

  // Open and run a task when a briefing action chip (or anything) dispatches
  // an "admin-ea-prompt" event. This is the seam between the C-suite Overview's
  // recommended actions and the executive assistant that carries them out.
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      if (!detail?.prompt) return;
      setOpen(true);
      setMinimized(false);
      setPendingPrompt(detail.prompt);
    };
    window.addEventListener("admin-ea-prompt", handler);
    return () => window.removeEventListener("admin-ea-prompt", handler);
  }, []);
  useEffect(() => {
    if (pendingPrompt && open) {
      const p = pendingPrompt;
      setPendingPrompt(null);
      // sendMessage is a hoisted function declaration, safe to call here.
      sendMessage(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, open]);

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || isLoading) return;

    const userMsg: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        context,
      });
      const { clean, actions } = parseActions(response.content);
      setMessages(prev => [...prev, { role: "assistant", content: clean, actions }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I had trouble connecting. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function runExecute(actionId: string, input: Record<string, unknown>, confirmed: boolean) {
    setMessages(prev => [...prev, { role: "user", content: `[${confirmed ? "Confirmed" : "Run"}: ${actionId}]` }]);
    try {
      const res = await executeMutation.mutateAsync({ actionId, input, confirmed });
      if ("needsConfirm" in res && res.needsConfirm) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `This one needs your sign-off: ${res.label}. ${res.description ?? ""}`,
          actions: [{ type: "execute-confirm", actionId, input, label: `Confirm: ${res.label}` }],
        }]);
        return;
      }
      const undo = (res as { undo?: { actionId: string; input: Record<string, unknown> } | null }).undo;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Done. ${(res as { summary?: string }).summary ?? ""}`,
        actions: undo ? [{ type: "undo", actionId: undo.actionId, input: undo.input, label: "Undo that" }] : undefined,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `That action could not run. ${(e as Error)?.message ?? ""}` }]);
    }
  }

  async function handleAction(action: AdminAIAction) {
    // Registry-backed actions execute directly with the server safety floor.
    if (action.type === "execute") {
      await runExecute(action.actionId ?? "", action.input ?? {}, false);
      return;
    }
    if (action.type === "execute-confirm") {
      await runExecute(action.actionId ?? "", action.input ?? {}, true);
      return;
    }
    if (action.type === "undo") {
      setMessages(prev => [...prev, { role: "user", content: "[Undo]" }]);
      try {
        const res = await undoMutation.mutateAsync({ actionId: action.actionId ?? "", input: action.input ?? {} });
        setMessages(prev => [...prev, { role: "assistant", content: `Reverted. ${res.summary}` }]);
      } catch (e) {
        setMessages(prev => [...prev, { role: "assistant", content: `Could not undo. ${(e as Error)?.message ?? ""}` }]);
      }
      return;
    }
    // UI actions (navigate / compose / search / focus) are handled by the page.
    onAction?.(action);
    setMessages(prev => [...prev, { role: "user", content: `[${action.label}]` }]);
  }

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={handleFabClick}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        // Suppress the iOS long-press callout / context menu so holding opens
        // the composer instead of a system menu.
        onContextMenu={canCapture ? (e) => e.preventDefault() : undefined}
        data-testid="admin-fab"
        // touch-action: manipulation removes the 300ms tap delay and double-tap
        // zoom; the callout/select suppression keeps a long hold from selecting
        // or invoking the iOS share sheet mid-press.
        style={canCapture ? { touchAction: "manipulation", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } : undefined}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#1a472a] to-[#4a7c59] shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${pressing ? "scale-95" : "hover:scale-105"}`}
        title={canCapture ? "Open AI Assistant — hold to add a note" : "Open AI Assistant"}
      >
        <Bot className="w-6 h-6 text-[#7dd87d] group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#7dd87d] rounded-full animate-pulse" />
        {/* Press-progress ring: fills over the hold so the gesture is felt, not
            guessed. Purely visual; the timer above is the source of truth. */}
        {canCapture && pressing && (
          <span
            data-testid="admin-fab-press"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#7dd87d]"
            style={{ animation: `fab-press-fill ${LONG_PRESS_MS}ms linear forwards` }}
          />
        )}
        {canCapture && (
          <span
            data-testid="admin-fab-hint"
            className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[#1a472a] px-2 py-1 text-xs text-[#7dd87d]/90 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            Hold to add a note
          </span>
        )}
      </button>
    );
  }

  const panelHeight = minimized || mode === "note" ? "auto" : "min(520px, calc(100vh - 120px))";

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-full max-w-[380px] rounded-2xl shadow-2xl border border-[#4a7c59]/30 bg-white flex flex-col overflow-hidden"
      style={{ height: panelHeight, maxWidth: "min(380px, calc(100vw - 2rem))" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] flex-shrink-0">
        <div className="relative">
          <Bot className="w-5 h-5 text-[#7dd87d]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#7dd87d] rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none">
            {mode === "note" ? "Add note" : "ReGen AI Assistant"}
          </p>
          <p className="text-[#7dd87d]/70 text-xs mt-0.5 truncate">
            {mode === "note"
              ? "Voice or text, straight to your inbox"
              : context?.activeTab ? `Viewing: ${context.activeTab}` : "Ready to help"}
          </p>
        </div>
        {canCapture && (
          <button
            onClick={() => { setMode(m => (m === "note" ? "assistant" : "note")); setMinimized(false); }}
            aria-label={mode === "note" ? "Switch to assistant" : "Add a note"}
            title={mode === "note" ? "Switch to assistant" : "Add a note"}
            className={`p-1 rounded transition-colors ${mode === "note" ? "text-[#7dd87d]" : "text-white/60 hover:text-white"}`}
          >
            {mode === "note" ? <Bot className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={() => setMinimized(m => !m)}
          className="text-white/60 hover:text-white p-1 rounded transition-colors"
        >
          {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close AI assistant"
          className="text-white/60 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!minimized && mode === "note" && (
        <HarvestNoteComposer voiceEnabled={Boolean(harvestStatus.data?.voice)} />
      )}

      {!minimized && mode === "assistant" && (
        <>
          {/* Messages area */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a472a] to-[#4a7c59] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-[#7dd87d]" />
                    </div>
                    <div className="bg-[#f0ebe3] rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-[#1a472a] max-w-[280px]">
                      Hi! I'm your ReGen admin assistant. I can help you find things in the dashboard, draft emails, prioritize contacts, and more. What do you need?
                    </div>
                  </div>
                  <div className="pl-9 flex flex-wrap gap-1.5">
                    {STARTERS.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-xs px-2.5 py-1 rounded-full bg-[#1a472a]/8 border border-[#1a472a]/20 text-[#1a472a]/70 hover:bg-[#7dd87d]/20 hover:text-[#1a472a] hover:border-[#7dd87d]/50 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-[#1a472a] text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm max-w-[280px] whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a472a] to-[#4a7c59] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-[#7dd87d]" />
                      </div>
                      <div className="space-y-2 max-w-[280px]">
                        <div className="bg-[#f0ebe3] rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-[#1a472a] whitespace-pre-wrap">
                          {msg.content}
                        </div>
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-0">
                            {msg.actions.map((action, ai) => (
                              <button
                                key={ai}
                                onClick={() => handleAction(action)}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#1a472a] text-white hover:bg-[#2d5a3d] transition-colors shadow-sm"
                              >
                                <ActionIcon type={action.type} />
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a472a] to-[#4a7c59] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-[#7dd87d]" />
                  </div>
                  <div className="bg-[#f0ebe3] rounded-2xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-[#4a7c59] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-[#4a7c59] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-[#4a7c59] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Context badge strip */}
          {context && (context.activeTab || context.selectedContactName) && (
            <div className="px-3 py-1.5 border-t border-[#1a472a]/10 flex gap-1.5 flex-wrap bg-[#f8f5f0]">
              {context.activeTab && (
                <Badge variant="outline" className="text-xs border-[#4a7c59]/30 text-[#4a7c59] py-0 h-5">
                  Tab: {context.activeTab}
                </Badge>
              )}
              {context.selectedContactName && (
                <Badge variant="outline" className="text-xs border-[#4a7c59]/30 text-[#4a7c59] py-0 h-5">
                  {context.selectedContactName}
                </Badge>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="p-2 border-t border-[#1a472a]/10 flex gap-2 items-end bg-white flex-shrink-0">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your admin data..."
              className="min-h-[40px] max-h-[100px] resize-none text-sm border-[#4a7c59]/30 focus-visible:ring-[#7dd87d] rounded-xl py-2"
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 rounded-xl bg-[#1a472a] hover:bg-[#2d5a3d] flex-shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminAIAssistant;

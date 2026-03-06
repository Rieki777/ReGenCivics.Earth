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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, X, Send, Sparkles, Loader2,
  Navigation, Mail, Search, User, Minimize2, Maximize2
} from "lucide-react";

export interface AdminAIContext {
  activeTab?: string;
  investorCount?: number;
  inquiryCount?: number;
  applicationCount?: number;
  selectedContactEmail?: string;
  selectedContactName?: string;
}

export interface AdminAIAction {
  type: "navigate" | "compose" | "search" | "focus";
  label: string;
  tab?: string;
  to?: string;
  subject?: string;
  query?: string;
  contactEmail?: string;
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

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages, scrollToBottom]);

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

  function handleAction(action: AdminAIAction) {
    onAction?.(action);
    // Confirm action taken in chat
    setMessages(prev => [...prev, {
      role: "user",
      content: `[Executed: ${action.label}]`,
    }]);
  }

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#1a472a] to-[#4a7c59] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        title="Open AI Assistant"
      >
        <Bot className="w-6 h-6 text-[#7dd87d] group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#7dd87d] rounded-full animate-pulse" />
      </button>
    );
  }

  const panelHeight = minimized ? "auto" : "min(520px, calc(100vh - 120px))";

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl shadow-2xl border border-[#4a7c59]/30 bg-white flex flex-col overflow-hidden"
      style={{ height: panelHeight, maxWidth: "calc(100vw - 24px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] flex-shrink-0">
        <div className="relative">
          <Bot className="w-5 h-5 text-[#7dd87d]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#7dd87d] rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none">ReGen AI Assistant</p>
          <p className="text-[#7dd87d]/70 text-xs mt-0.5 truncate">
            {context?.activeTab ? `Viewing: ${context.activeTab}` : "Ready to help"}
          </p>
        </div>
        <button
          onClick={() => setMinimized(m => !m)}
          className="text-white/60 hover:text-white p-1 rounded transition-colors"
        >
          {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-white/60 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!minimized && (
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
                      Hi! I'm your ReGen admin assistant. I can help you navigate the dashboard, draft emails, prioritize contacts, and more. What do you need?
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

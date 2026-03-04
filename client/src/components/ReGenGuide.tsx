/**
 * ReGenGuide - Floating AI chat assistant widget.
 * A small floating button in the bottom-right that opens a chat panel.
 * Uses the AIChatBox component internally with tRPC for LLM calls.
 */
import { useState, useCallback } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";

export default function ReGenGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to ReGen Civics! I can help you understand the Fund, the Infinite Game, how to participate, or anything else about our regenerative ecosystem. What would you like to know?",
    },
  ]);

  const chatMutation = trpc.chat.ask.useMutation();

  const handleSendMessage = useCallback(
    (content: string) => {
      const userMessage: Message = { role: "user", content };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      chatMutation.mutate(
        {
          messages: updatedMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        },
        {
          onSuccess: (data) => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.content },
            ]);
          },
          onError: () => {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  "Sorry, I had trouble processing that. Please try again or visit our /schedule page to join a live session where the team can help directly.",
              },
            ]);
          },
        }
      );
    },
    [messages, chatMutation]
  );

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-2 left-2 sm:left-auto sm:right-4 z-[9999] sm:w-[380px] max-h-[60vh] sm:max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-[#7dd87d]/30 bg-[#0a2314]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] border-b border-[#7dd87d]/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7dd87d]" />
              <span
                className="text-white font-bold text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ReGen Guide
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={chatMutation.isPending}
            placeholder="Ask about the Fund, Game, or how to participate..."
            height={320}
            className="border-0 rounded-none"
          />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 btn-press ${
          isOpen
            ? "bg-white/10 border border-white/20 text-white/60 hover:text-white"
            : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] shadow-[0_0_20px_rgba(125,216,125,0.4)]"
        }`}
        aria-label={isOpen ? "Close ReGen Guide" : "Open ReGen Guide"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </>
  );
}

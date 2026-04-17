/**
 * Messages - Direct messaging page
 * Split-panel inbox + thread view with enchanted forest aesthetic
 */
import {
  MessageCircle,
  Send,
  Pencil,
  User,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO, pageSEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { resolveAssetUrl } from "@/lib/utils";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";

// ─── Time helpers ────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function dayKey(date: Date | string): string {
  return new Date(date).toDateString();
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  if (avatarUrl) {
    return (
      <img
        src={resolveAssetUrl(avatarUrl)}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-[#1a472a] text-[#7dd87d] font-semibold flex items-center justify-center flex-shrink-0`}
    >
      {initials(name) || <User className="w-4 h-4" />}
    </div>
  );
}

// ─── Compose modal ────────────────────────────────────────────────────────────

interface ComposeModalProps {
  onClose: () => void;
  onConversationCreated: (conversationId: number) => void;
}

function ComposeModal({ onClose, onConversationCreated }: ComposeModalProps) {
  const [nameInput, setNameInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: searchResults } = trpc.userProfiles.list.useQuery(
    { search: nameInput, limit: 5 },
    { enabled: nameInput.length >= 2 }
  );

  const getOrCreate = trpc.messages.conversations.getOrCreate.useMutation({
    onSuccess: (data) => {
      onConversationCreated(data.conversationId);
      onClose();
    },
    onError: (err) => {
      setError(err.message || "Could not find that user. Check the name and try again.");
    },
  });

  function handleSelectUser(userId: number, displayName: string) {
    setSelectedUserId(userId);
    setSelectedUserName(displayName);
    setNameInput(displayName);
    setError(null);
  }

  function handleSubmit() {
    if (!selectedUserId) {
      setError("Please select a user from the search results.");
      return;
    }
    setError(null);
    getOrCreate.mutate({ userId: selectedUserId });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  }

  const showDropdown =
    nameInput.length >= 2 &&
    !selectedUserId &&
    searchResults &&
    searchResults.members.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-[#f0ebe3] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#1a472a]/20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1a472a]">New conversation</h2>
          <button
            onClick={onClose}
            className="text-[#1a472a]/60 hover:text-[#1a472a] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#1a472a]/70 mb-4">
          Search by display name to find someone to message.
        </p>

        <div className="relative">
          <Input
            autoFocus
            placeholder="Search by display name…"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              setSelectedUserId(null);
              setSelectedUserName("");
            }}
            onKeyDown={handleKeyDown}
            className="border-[#1a472a]/30 focus:border-[#7dd87d] focus:ring-[#7dd87d]/30 bg-white text-[#1a472a] placeholder:text-[#1a472a]/55"
          />

          {showDropdown && (
            <ul className="absolute z-10 w-full bg-white border border-[#1a472a]/20 rounded-xl shadow-lg mt-1 overflow-hidden">
              {searchResults.members.map((member) => (
                <li key={member.userId}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-[#1a472a] hover:bg-[#1a472a]/5 transition-colors"
                    onClick={() =>
                      handleSelectUser(
                        member.userId,
                        member.displayName ?? `User #${member.userId}`
                      )
                    }
                  >
                    {member.displayName ?? `User #${member.userId}`}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedUserName && selectedUserId && (
          <p className="mt-2 text-sm text-[#1a472a]/70">
            Starting conversation with <strong>{selectedUserName}</strong>.
          </p>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 mt-5 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#1a472a]/70 hover:text-[#1a472a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={getOrCreate.isPending || !selectedUserId}
            className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white"
          >
            {getOrCreate.isPending ? "Opening…" : "Start conversation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

interface ConversationRowProps {
  id: number;
  otherUser: { id: number; name: string; avatarUrl?: string | null };
  lastMessage: { content: string; senderId: number; createdAt: string | Date } | null;
  unreadCount: number;
  updatedAt: string | Date;
  isSelected: boolean;
  currentUserId: number;
  onClick: () => void;
}

function ConversationRow({
  otherUser,
  lastMessage,
  unreadCount,
  updatedAt,
  isSelected,
  currentUserId,
  onClick,
}: ConversationRowProps) {
  const preview = lastMessage
    ? (lastMessage.senderId === currentUserId ? "You: " : "") + lastMessage.content
    : "No messages yet";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isSelected
          ? "bg-[#1a472a]/10 border-l-4 border-[#7dd87d]"
          : "hover:bg-[#1a472a]/5 border-l-4 border-transparent"
      }`}
    >
      <Avatar name={otherUser.name} avatarUrl={otherUser.avatarUrl} size="md" />

      <div className="flex-1 min-w-0 safe-prose">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-medium text-sm truncate ${unreadCount > 0 ? "text-[#1a472a]" : "text-[#1a472a]/80"}`}>
            {otherUser.name}
          </span>
          <span className="text-xs text-[#1a472a]/50 flex-shrink-0">{timeAgo(updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${unreadCount > 0 ? "text-[#1a472a]/80 font-medium" : "text-[#1a472a]/50"}`}>
            {preview}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 bg-[#7dd87d] text-[#1a472a] text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Inbox panel ─────────────────────────────────────────────────────────────

interface InboxPanelProps {
  selectedId: number | null;
  currentUserId: number;
  onSelect: (id: number) => void;
  onCompose: () => void;
}

function InboxPanel({ selectedId, currentUserId, onSelect, onCompose }: InboxPanelProps) {
  const { data: conversations, isLoading } = trpc.messages.conversations.list.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1a472a]/10 flex-shrink-0">
        <h1 className="text-xl font-semibold text-[#1a472a] flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#7dd87d]" />
          Messages
        </h1>
        <button
          onClick={onCompose}
          className="p-2 rounded-full hover:bg-[#1a472a]/10 text-[#1a472a] transition-colors"
          aria-label="New conversation"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[#1a472a]/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#1a472a]/10 rounded w-1/2" />
                  <div className="h-3 bg-[#1a472a]/10 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!conversations || conversations.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
            <MessageCircle className="w-12 h-12 text-[#7dd87d]/60 mb-4" />
            <p className="text-[#1a472a]/70 text-sm leading-relaxed">
              No messages yet. Connect with a fellow regenerator to get started.
            </p>
            <Button
              onClick={onCompose}
              className="mt-5 bg-[#1a472a] hover:bg-[#1a472a]/90 text-white text-sm"
            >
              Start a conversation
            </Button>
          </div>
        )}

        {conversations?.map((conv) => (
          <ConversationRow
            key={conv.id}
            id={conv.id}
            otherUser={conv.otherUser}
            lastMessage={
              conv.lastMessage
                ? {
                    content: conv.lastMessage.content,
                    senderId: conv.lastMessage.senderId,
                    createdAt: conv.lastMessage.createdAt,
                  }
                : null
            }
            unreadCount={conv.unreadCount}
            updatedAt={conv.updatedAt}
            isSelected={selectedId === conv.id}
            currentUserId={currentUserId}
            onClick={() => onSelect(conv.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Thread panel ─────────────────────────────────────────────────────────────

interface ThreadPanelProps {
  conversationId: number;
  currentUserId: number;
  otherUser: { id: number; name: string; avatarUrl?: string | null } | null;
  onBack: () => void;
  isMobile: boolean;
}

interface MessageItem {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string | Date;
}

function ThreadPanel({ conversationId, currentUserId, otherUser, onBack, isMobile }: ThreadPanelProps) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data, isLoading, fetchNextPage, hasNextPage } =
    trpc.messages.messages.list.useInfiniteQuery(
      { conversationId },
      {
        getNextPageParam: (lastPage: { messages: MessageItem[]; nextCursor?: number | null }) => lastPage.nextCursor ?? undefined,
        refetchInterval: 5_000,
      }
    );

  const sendMessage = trpc.messages.messages.send.useMutation({
    onSuccess: () => {
      utils.messages.messages.list.invalidate({ conversationId });
      utils.messages.conversations.list.invalidate();
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
  });

  const markRead = trpc.messages.conversations.markRead.useMutation();

  // Flatten pages into chronological order (oldest first)
  const messages: MessageItem[] = (data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page: { messages: MessageItem[]; nextCursor?: number | null }) => page.messages);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark read on open and when window regains focus
  const fireMarkRead = useCallback(() => {
    markRead.mutate({ conversationId });
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fireMarkRead();
    const handleFocus = () => fireMarkRead();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fireMarkRead]);

  // Auto-resize textarea
  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 5;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    setInputText(el.value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed || sendMessage.isPending) return;
    if (trimmed.length > 5000) return;
    sendMessage.mutate({ conversationId, content: trimmed });
  }

  const charCount = inputText.length;
  const showCharCount = charCount > 4000;
  const charOver = charCount > 5000;

  // Group messages by day
  const groupedMessages: Array<{ dayLabel: string; key: string; msgs: MessageItem[] }> = [];
  for (const msg of messages) {
    const key = dayKey(msg.createdAt);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.key === key) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ dayLabel: formatDayLabel(msg.createdAt), key, msgs: [msg] });
    }
  }

  const displayName = otherUser?.name ?? "Conversation";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a472a]/10 flex-shrink-0 bg-[#f0ebe3]">
        {isMobile && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-[#1a472a]/10 text-[#1a472a] transition-colors"
            aria-label="Back to inbox"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {otherUser && (
          <Avatar name={otherUser.name} avatarUrl={otherUser.avatarUrl} size="sm" />
        )}
        <span className="font-semibold text-[#1a472a] text-base">{displayName}</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center pb-2">
            <button
              onClick={() => fetchNextPage()}
              className="text-xs text-[#1a472a]/60 hover:text-[#1a472a] underline"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col gap-3 animate-pulse pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="h-8 bg-[#1a472a]/10 rounded-2xl w-40" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-sm text-[#1a472a]/50 text-center px-6">
              This is the beginning of your conversation with {displayName}.
            </p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.key}>
            {/* Day separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#1a472a]/10" />
              <span className="text-xs text-[#1a472a]/40 font-medium px-2">{group.dayLabel}</span>
              <div className="flex-1 h-px bg-[#1a472a]/10" />
            </div>

            {group.msgs.map((msg) => {
              const isSelf = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 mb-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isSelf && (
                    <Avatar
                      name={msg.senderName}
                      avatarUrl={otherUser?.id === msg.senderId ? otherUser?.avatarUrl : null}
                      size="sm"
                    />
                  )}

                  <div className={`flex flex-col max-w-[70%] min-w-0 ${isSelf ? "items-end" : "items-start"}`}>
                    {!isSelf && (
                      <span className="text-xs text-[#1a472a]/50 mb-1 ml-1">{msg.senderName}</span>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words safe-prose ${
                        isSelf
                          ? "bg-[#1a472a] text-white rounded-br-sm"
                          : "bg-white text-[#1a472a] border border-[#1a472a]/10 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-[#1a472a]/40 mt-1 mx-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[#1a472a]/10 bg-[#f0ebe3] px-4 py-3">
        {showCharCount && (
          <div className={`text-xs mb-1 text-right ${charOver ? "text-red-500 font-semibold" : "text-[#1a472a]/50"}`}>
            {charCount} / 5000
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message… (Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#1a472a]/20 bg-white px-3 py-2 text-sm text-[#1a472a] placeholder-[#1a472a]/40 focus:outline-none focus:border-[#7dd87d] focus:ring-2 focus:ring-[#7dd87d]/20 transition-colors"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || sendMessage.isPending || charOver}
            className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white rounded-xl p-2 h-10 w-10 flex-shrink-0"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty thread placeholder ─────────────────────────────────────────────────

function EmptyThread() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-full bg-[#1a472a]/8 flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-[#7dd87d]/70" />
      </div>
      <h2 className="text-base font-medium text-[#1a472a]/60">Select a conversation</h2>
      <p className="text-sm text-[#1a472a]/40 mt-1">
        Choose a conversation from the list or start a new one.
      </p>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Messages() {
  const { user, loading } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  // Detect mobile (simple breakpoint check; re-evaluates on resize)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Get conversation list to resolve otherUser details for the thread header
  const { data: conversations } = trpc.messages.conversations.list.useQuery(undefined, {
    refetchInterval: 10_000,
    enabled: Boolean(user),
  });

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId) ?? null;

  function handleSelectConversation(id: number) {
    setSelectedConversationId(id);
  }

  function handleCompose() {
    setShowCompose(true);
  }

  function handleConversationCreated(conversationId: number) {
    setSelectedConversationId(conversationId);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1a472a]/20 border-t-[#7dd87d] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex flex-col items-center justify-center px-6 text-center">
        <MessageCircle className="w-12 h-12 text-[#7dd87d]/60 mb-4" />
        <h1 className="text-2xl font-semibold text-[#1a472a] mb-2">Messages</h1>
        <p className="text-[#1a472a]/60">Sign in to send and receive messages.</p>
      </div>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    const showThread = selectedConversationId !== null;

    return (
      <div className="h-screen bg-[#f0ebe3] flex flex-col overflow-hidden">
        <SEO {...pageSEO.messages} />
        {showCompose && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            onConversationCreated={handleConversationCreated}
          />
        )}

        {!showThread ? (
          <InboxPanel
            selectedId={selectedConversationId}
            currentUserId={user.id}
            onSelect={handleSelectConversation}
            onCompose={handleCompose}
          />
        ) : (
          <ThreadPanel
            key={selectedConversationId}
            conversationId={selectedConversationId!}
            currentUserId={user.id}
            otherUser={selectedConversation?.otherUser ?? null}
            onBack={() => setSelectedConversationId(null)}
            isMobile
          />
        )}
      </div>
    );
  }

  // ── Desktop split layout ───────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#f0ebe3] flex overflow-hidden">
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onConversationCreated={handleConversationCreated}
        />
      )}

      {/* Left panel - inbox */}
      <div className="w-[300px] flex-shrink-0 border-r border-[#1a472a]/10 bg-[#f0ebe3] overflow-hidden">
        <InboxPanel
          selectedId={selectedConversationId}
          currentUserId={user.id}
          onSelect={handleSelectConversation}
          onCompose={handleCompose}
        />
      </div>

      {/* Right panel, thread */}
      <div className="flex-1 overflow-hidden">
        {selectedConversationId ? (
          <ThreadPanel
            key={selectedConversationId}
            conversationId={selectedConversationId}
            currentUserId={user.id}
            otherUser={selectedConversation?.otherUser ?? null}
            onBack={() => setSelectedConversationId(null)}
            isMobile={false}
          />
        ) : (
          <EmptyThread />
        )}
      </div>
    </div>
  );
}

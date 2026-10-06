/**
 * The follow-up card for the week board, placed by the page inside the stage area.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BoardFollowUpFrom } from "@shared/boardSignup";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FollowUpCapture, firstName } from "./FollowUpCapture";
import {
  boardContactPrompt,
  dismissBoardContact,
  onBoardContactStore,
  onBoardContribution,
  readBoardContact,
  readBoardName,
  readLinkedFlag,
  saveBoardContact,
  showBoardContactLink,
  writeLinkedFlag,
  type StoredBoardContact,
} from "./boardContactStore";
import { sessionVoterKey } from "./useSessionBoard";

export {
  BOARD_CONTACT_KEY,
  boardContactPrompt,
  dismissBoardContact,
  markBoardContribution,
  readBoardContact,
  readBoardName,
  saveBoardContact,
  showBoardContactLink,
  type StoredBoardContact,
} from "./boardContactStore";

type BoardContactContextValue = {
  showLink: boolean;
  ask: () => void;
  card: ReactNode;
};

const BoardContactContext = createContext<BoardContactContextValue | null>(null);

export function useAskBoardContact(): BoardContactContextValue | null {
  return useContext(BoardContactContext);
}

export function BoardContactCard() {
  const ctx = useContext(BoardContactContext);
  return ctx?.card ?? null;
}

export function BoardContactProvider({ week, children }: { week: number; children: ReactNode }) {
  const { user } = useAuth();
  const voterKey = useMemo(sessionVoterKey, []);
  const [stored, setStored] = useState<StoredBoardContact | null>(() => readBoardContact());
  const [contributed, setContributed] = useState(false);
  const [from, setFrom] = useState<BoardFollowUpFrom | undefined>();
  const [asked, setAsked] = useState(false);
  const [thanks, setThanks] = useState<{ name: string; email: string } | null>(null);
  const leave = trpc.sessionBoard.leaveContact.useMutation();
  const link = trpc.sessionBoard.linkBrowser.useMutation();
  const linkStarted = useRef(false);

  useEffect(() => onBoardContribution((next) => {
    setContributed(true);
    setFrom(next);
  }), []);

  useEffect(() => onBoardContactStore(() => setStored(readBoardContact())), []);

  useEffect(() => {
    if (!user?.id || linkStarted.current) return;
    if (readLinkedFlag()) return;
    linkStarted.current = true;
    link.mutate({ week, voterKey }, {
      onSuccess: () => writeLinkedFlag(),
      onError: () => { linkStarted.current = false; },
    });
  }, [user?.id, week, voterKey, link]);

  const signedInEmail = typeof user?.email === "string" && user.email.includes("@") ? user.email : null;
  const mode = thanks ? "thanks" : boardContactPrompt({ stored, signedInEmail, contributed, asked });

  const card = mode === "hide" ? null : (
    <FollowUpCapture
      initialName={readBoardName()}
      busy={leave.isPending}
      thanks={thanks}
      onDismiss={(name) => {
        dismissBoardContact(name);
        setAsked(false);
        setThanks(null);
      }}
      onSend={async (name, email) => {
        await leave.mutateAsync({ week, voterKey, fullName: name, email, from });
        saveBoardContact({ name, email });
        setThanks({ name: firstName(name), email: email.trim() });
        setAsked(false);
      }}
    />
  );

  const value = useMemo<BoardContactContextValue>(() => ({
    showLink: showBoardContactLink(stored, signedInEmail),
    ask: () => setAsked(true),
    card,
  }), [stored, signedInEmail, card]);

  return <BoardContactContext.Provider value={value}>{children}</BoardContactContext.Provider>;
}

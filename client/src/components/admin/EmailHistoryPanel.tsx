/**
 * Per-contact email history accordion. Used inside Admin contact panels
 * (applications, investors, inquiries) to show every email sent to a
 * given recipient with its delivery status.
 *
 * Extracted from client/src/pages/Admin.tsx as the first chunk of the
 * Admin.tsx refactor (FIXES_TO_MAKE_2026-04-25_world-class.md item 27).
 * Pure presentation: data comes through trpc.email.getLogsForEmail.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mail, ChevronRight } from "lucide-react";

export function EmailHistoryPanel({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = trpc.email.getLogsForEmail.useQuery(
    { email },
    { enabled: open && !!email },
  );

  return (
    <div className="border-t border-[#1a472a]/10 pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-[#1a472a]/80 hover:text-[#1a472a] transition-colors w-full"
      >
        <Mail className="w-3.5 h-3.5" />
        <span className="font-medium">Email History</span>
        {logs?.length ? <span className="text-[#7dd87d]">({logs.length})</span> : null}
        <ChevronRight
          className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {isLoading && <p className="text-xs text-[#1a472a]/65 py-2">Loading…</p>}
          {!isLoading && !logs?.length && (
            <p className="text-xs text-[#1a472a]/65 py-2">
              No emails sent to this contact yet.
            </p>
          )}
          {logs?.map((log: any) => (
            <div
              key={log.id}
              className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs"
            >
              <p className="font-medium text-[#1a472a] truncate">{log.subject}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#1a472a]/70">
                <span>{new Date(log.sentAt).toLocaleString()}</span>
                <span
                  className={
                    log.status === "delivered"
                      ? "text-green-600 font-medium"
                      : log.status === "bounced"
                        ? "text-red-600 font-medium"
                        : log.status === "failed"
                          ? "text-red-500"
                          : "text-gray-500"
                  }
                >
                  {log.status}
                </span>
                {log.openedAt && <span className="text-blue-500">· opened</span>}
                {log.clickedAt && <span className="text-purple-500">· clicked</span>}
                {log.template && (
                  <span className="text-[#4a7c59]/80">template: {log.template}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmailHistoryPanel;

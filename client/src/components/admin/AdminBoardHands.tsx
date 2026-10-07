/**
 * Season board hands: general_inquiries whose referralSource starts with
 * "season2-week-board". Filtered here so they stay off the Other inquiries card.
 */
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { interestFromRole, parseBoardSignupSource } from "@shared/boardSignup";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type HandRow = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  roleInterest?: string | null;
  referralSource?: string | null;
  additionalNotes?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
};

const STATUSES = ["new", "contacted", "in_progress", "completed", "archived"] as const;

function formatPt(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function statusClass(status: string | null | undefined): string {
  return status === "pending" || status === "new" || !status
    ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
    : "bg-green-100 text-green-800 border border-green-200";
}

function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 px-3 rounded-full border text-sm font-semibold ${
        on ? "bg-[#1a472a] text-white border-[#1a472a]" : "bg-white text-[#1a472a] border-[#1a472a]/30"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminBoardHands({ rows }: { rows: HandRow[] }) {
  const [interest, setInterest] = useState<"all" | "Coach" | "Builder">("all");
  const [week, setWeek] = useState<number | "all">("all");
  const utils = trpc.useUtils();
  const updateStatus = trpc.generalInquiries.updateStatus.useMutation({
    onSuccess: () => {
      void utils.generalInquiries.list.invalidate();
    },
    onError: (error) => toast.error(`Failed to update status: ${error.message}`),
  });

  const weeks = useMemo(() => {
    const found = new Set<number>();
    for (const row of rows) {
      const parsed = parseBoardSignupSource(row.referralSource);
      if (parsed) found.add(parsed.week);
    }
    return [...found].sort((a, b) => a - b);
  }, [rows]);

  const shown = rows.filter((row) => {
    const label = interestFromRole(row.roleInterest);
    if (interest !== "all" && label !== interest) return false;
    if (week !== "all" && parseBoardSignupSource(row.referralSource)?.week !== week) return false;
    return true;
  });

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip on={interest === "all"} onClick={() => setInterest("all")}>All</Chip>
        <Chip on={interest === "Coach"} onClick={() => setInterest("Coach")}>Coach</Chip>
        <Chip on={interest === "Builder"} onClick={() => setInterest("Builder")}>Builder</Chip>
        <Chip on={week === "all"} onClick={() => setWeek("all")}>Every week</Chip>
        {weeks.map((n) => (
          <Chip key={n} on={week === n} onClick={() => setWeek(n)}>Week {n}</Chip>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-[#1a472a] px-1 py-2">No season board hands for that filter.</p>
      ) : (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left text-[#1a472a]">
              <thead>
                <tr className="border-b border-[#1a472a]/15">
                  {["Name", "Email", "Interest", "Week", "Note", "Date (PT)", "Status"].map((heading) => (
                    <th key={heading} scope="col" className="px-2 py-2 font-semibold whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className="border-b border-[#1a472a]/10 align-top">
                    <td className="px-2 py-3 font-semibold">{row.fullName || "No name"}</td>
                    <td className="px-2 py-3">
                      {row.email ? (
                        <a className="underline text-[#1a472a] break-all" href={`mailto:${row.email}`}>{row.email}</a>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">{interestFromRole(row.roleInterest) || "Hand"}</td>
                    <td className="px-2 py-3">{parseBoardSignupSource(row.referralSource)?.week ?? ""}</td>
                    <td className="px-2 py-3 max-w-[16rem]">{row.additionalNotes || ""}</td>
                    <td className="px-2 py-3 whitespace-nowrap">{formatPt(row.createdAt)}</td>
                    <td className="px-2 py-3">
                      <StatusControl
                        status={row.status || "new"}
                        disabled={updateStatus.isPending}
                        onChange={(status) => updateStatus.mutate({ id: row.id, status })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="sm:hidden space-y-3">
            {shown.map((row) => (
              <li key={row.id} className="rounded-2xl border border-[#1a472a]/15 p-3 space-y-2 text-sm text-[#1a472a]">
                <p className="font-semibold">{row.fullName || "No name"}</p>
                {row.email ? (
                  <p><a className="underline break-all" href={`mailto:${row.email}`}>{row.email}</a></p>
                ) : null}
                <p>{interestFromRole(row.roleInterest) || "Hand"}{parseBoardSignupSource(row.referralSource) ? ` · Week ${parseBoardSignupSource(row.referralSource)?.week}` : ""}</p>
                {row.additionalNotes ? <p>{row.additionalNotes}</p> : null}
                <p>{formatPt(row.createdAt)}</p>
                <StatusControl
                  status={row.status || "new"}
                  disabled={updateStatus.isPending}
                  onChange={(status) => updateStatus.mutate({ id: row.id, status })}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatusControl({
  status,
  disabled,
  onChange,
}: {
  status: string;
  disabled: boolean;
  onChange: (status: (typeof STATUSES)[number]) => void;
}) {
  const value = (STATUSES as readonly string[]).includes(status) ? status : "new";
  return (
    <div className="flex flex-col gap-1.5 min-w-[9rem]">
      <span className={`inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}>{status}</span>
      <Select value={value} onValueChange={(next) => onChange(next as (typeof STATUSES)[number])} disabled={disabled}>
        <SelectTrigger className="min-h-11 text-xs w-full text-[#1a472a]" aria-label="Update status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="contacted">Contacted</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * AdminRoleHoldersTab: Phase 1 of the Movement Coordination Engine.
 *
 * Reads every row from `roleHolders` (seeded from
 * client/src/data/gameRoles.ts) and lets Rye assign a userId to each
 * role so a task mentioned in a recorded call can route to a real
 * profile. Also toggles per-holder notification preferences and edits
 * the alias list the LLM matches transcript text against.
 *
 * Search-by-email lookup uses the existing admin users-search procedure
 * via the global search router (no new server surface needed).
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, UserMinus, UserPlus, Mail, Bell, Save, X } from "lucide-react";

interface AssignedUser {
  id: number;
  name: string | null;
  email: string | null;
  handle: string | null;
}

function AssignBlock({
  holderId,
  currentUserId,
  onSaved,
}: {
  holderId: number;
  currentUserId: number | null;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const lookup = trpc.roleHolders.findUsers.useQuery(
    { q: search },
    { enabled: search.length >= 2, staleTime: 30_000 },
  );
  const setHolder = trpc.roleHolders.setHolder.useMutation({
    onSuccess: () => {
      setSearch("");
      onSaved();
    },
  });

  const candidates: AssignedUser[] = (lookup.data as AssignedUser[] | undefined) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or handle"
          className="text-[#1a472a]"
        />
        {currentUserId !== null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHolder.mutate({ id: holderId, userId: null })}
            disabled={setHolder.isPending}
            title="Mark role open"
          >
            <UserMinus className="w-3.5 h-3.5 mr-1" /> Unassign
          </Button>
        )}
      </div>
      {search.length >= 2 && (
        <div className="rounded-lg border border-[#1a472a]/15 max-h-40 overflow-y-auto bg-white">
          {lookup.isLoading ? (
            <div className="p-3 text-sm text-[#1a472a]/75 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> searching
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-3 text-sm text-[#1a472a]/75">No matches.</div>
          ) : (
            candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setHolder.mutate({ id: holderId, userId: u.id })}
                disabled={setHolder.isPending}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-[#7dd87d]/10 text-left text-sm border-b last:border-b-0 border-[#1a472a]/10"
              >
                <span className="text-[#1a472a]">
                  <span className="font-semibold">{u.name ?? u.handle ?? `User ${u.id}`}</span>
                  {u.email && <span className="text-[#1a472a]/75 ml-2">{u.email}</span>}
                </span>
                <UserPlus className="w-3.5 h-3.5 text-[#4a7c59]" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AliasEditor({
  holderId,
  initial,
  onSaved,
}: {
  holderId: number;
  initial: string[];
  onSaved: () => void;
}) {
  const [text, setText] = useState(initial.join(", "));
  const setAliases = trpc.roleHolders.setAliases.useMutation({ onSuccess: onSaved });
  const dirty = text.trim() !== initial.join(", ");
  const save = () => {
    const aliases = text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 20);
    setAliases.mutate({ id: holderId, aliases });
  };
  return (
    <div className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="alias 1, alias 2, alias 3"
        className="text-[#1a472a] text-xs"
      />
      <Button type="button" size="sm" disabled={!dirty || setAliases.isPending} onClick={save}>
        <Save className="w-3 h-3 mr-1" /> Save
      </Button>
    </div>
  );
}

function HoldersOverviewPanel({
  holders,
  onChanged,
}: {
  holders: Array<{ id: number; roleTitle: string }>;
  onChanged: () => void;
}) {
  const coverage = trpc.roleHolders.coverage.useQuery(undefined, { staleTime: 30_000 });
  const pending = trpc.roleHolders.listPending.useQuery(undefined, { staleTime: 30_000 });
  const audit = trpc.roleHolders.auditLog.useQuery({ limit: 20 }, { staleTime: 30_000 });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleHolderId, setRoleHolderId] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleCircle, setNewRoleCircle] = useState("");
  const [newRoleKind, setNewRoleKind] = useState<"game" | "fund">("game");

  const invite = trpc.roleHolders.invite.useMutation({
    onSuccess: () => { setName(""); setEmail(""); setRoleHolderId(""); void pending.refetch(); onChanged(); },
  });
  const createRole = trpc.roles.create.useMutation({
    onSuccess: () => { setNewRoleTitle(""); setNewRoleCircle(""); onChanged(); },
  });

  const cov = coverage.data;
  const pendingRows = (pending.data as Array<{ id: number; name: string; email: string; status: string }> | undefined) ?? [];
  const auditRows = (audit.data as Array<{ id: number; createdAt: string; action: string; roleSlug: string; targetLabel: string | null }> | undefined) ?? [];
  const selectCls = "rounded-md border border-[#1a472a]/20 text-[#1a472a] text-sm px-2 py-1.5 bg-white";

  return (
    <div className="space-y-4">
      {cov && (
        <div className="rounded-xl border border-[#1a472a]/15 bg-[#1a472a]/[0.03] p-4">
          <p className="text-sm font-semibold text-[#1a472a]">
            {cov.filled} of {cov.total} roles filled · {cov.open} open
          </p>
          {cov.uncoveredCircles.length > 0 && (
            <p className="text-xs text-[#1a472a]/75 mt-1">Uncovered circles: {cov.uncoveredCircles.join(", ")}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[#1a472a]/15 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-[#1a472a]">Invite a new member</p>
        <div className="flex flex-wrap gap-2 items-center">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="text-[#1a472a] w-40" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="text-[#1a472a] w-56" />
          <select value={roleHolderId} onChange={(e) => setRoleHolderId(e.target.value)} className={selectCls}>
            <option value="">Assign to role (optional)</option>
            {holders.map((h) => <option key={h.id} value={h.id}>{h.roleTitle}</option>)}
          </select>
          <Button
            size="sm"
            disabled={invite.isPending || !name || !email}
            onClick={() => invite.mutate({ name, email, roleHolderId: roleHolderId ? Number(roleHolderId) : undefined })}
            className="bg-[#1a472a] text-white hover:bg-[#2d5a3d]"
          >
            {invite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />} Invite
          </Button>
        </div>
        {invite.error && <p className="text-xs text-red-600">{invite.error.message}</p>}
        <p className="text-xs text-[#1a472a]/75">The member gets a magic-link email. When they sign in with that email, their account links to this invite automatically.</p>
      </div>

      {pendingRows.length > 0 && (
        <div className="rounded-xl border border-[#1a472a]/15 bg-white p-4">
          <p className="text-sm font-semibold text-[#1a472a] mb-2">Invited members</p>
          <ul className="space-y-1 text-sm text-[#1a472a]/80">
            {pendingRows.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>{p.name} <span className="text-[#1a472a]/75">({p.email})</span></span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "accepted" ? "bg-[#7dd87d]/30 text-[#1a472a]" : "bg-amber-100 text-amber-800"}`}>{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-[#1a472a]/15 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-[#1a472a]">Add a role</p>
        <div className="flex flex-wrap gap-2 items-center">
          <Input value={newRoleTitle} onChange={(e) => setNewRoleTitle(e.target.value)} placeholder="Role title" className="text-[#1a472a] w-48" />
          <Input value={newRoleCircle} onChange={(e) => setNewRoleCircle(e.target.value)} placeholder="Circle" className="text-[#1a472a] w-40" />
          <select value={newRoleKind} onChange={(e) => setNewRoleKind(e.target.value as "game" | "fund")} className={selectCls}>
            <option value="game">game</option>
            <option value="fund">fund</option>
          </select>
          <Button
            size="sm"
            disabled={createRole.isPending || !newRoleTitle}
            onClick={() => createRole.mutate({ title: newRoleTitle, circle: newRoleCircle || undefined, kind: newRoleKind })}
            className="bg-[#1a472a] text-white hover:bg-[#2d5a3d]"
          >
            Add role
          </Button>
        </div>
        {createRole.error && <p className="text-xs text-red-600">{createRole.error.message}</p>}
        <p className="text-xs text-[#1a472a]/75">A holder row appears on the next flywheel run (or reload).</p>
      </div>

      <div>
        <button type="button" onClick={() => setShowAudit((v) => !v)} className="text-xs text-[#1a472a]/75 hover:text-[#1a472a]">
          {showAudit ? "Hide" : "Show"} assignment history
        </button>
        {showAudit && (
          <ul className="mt-2 space-y-1 text-xs text-[#1a472a]/75">
            {auditRows.map((a) => (
              <li key={a.id}>
                {new Date(a.createdAt).toLocaleString()} · {a.action} · {a.roleSlug}{a.targetLabel ? ` → ${a.targetLabel}` : ""}
              </li>
            ))}
            {auditRows.length === 0 && <li className="text-[#1a472a]/75">No assignments yet.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AdminRoleHoldersTab() {
  const list = trpc.roleHolders.list.useQuery(undefined, { staleTime: 30_000 });
  const setPrefs = trpc.roleHolders.setNotificationPrefs.useMutation({ onSuccess: () => list.refetch() });
  const updateMeta = trpc.roleHolders.updateMeta.useMutation({ onSuccess: () => list.refetch() });

  const byKind = useMemo(() => {
    const data = list.data ?? [];
    return {
      game: data.filter((r) => r.kind === "game"),
      fund: data.filter((r) => r.kind === "fund"),
    };
  }, [list.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-4 h-4" /> Role Holders
        </CardTitle>
        <CardDescription>
          One row per sociocratic role from gameRoles.ts. Assign a member to each filled role so call-tasks can route to a profile. Open roles surface tasks on the Opportunity board.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <HoldersOverviewPanel holders={list.data ?? []} onChanged={() => list.refetch()} />
        {list.isLoading ? (
          <div className="text-sm text-[#1a472a]/75 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> loading
          </div>
        ) : (list.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#1a472a]/20 p-6 text-center text-sm text-[#1a472a]/75">
            No roleHolders rows yet. Run <code className="px-1 bg-[#1a472a]/5 rounded">npx tsx scripts/seed-role-holders.ts</code> on your machine to seed from gameRoles.ts.
          </div>
        ) : (
          (["game", "fund"] as const).map((kind) => (
            <section key={kind} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1a472a]/80">
                {kind === "game" ? "Game-side roles" : "Fund-side roles"}
                <span className="ml-2 text-[#1a472a]/75 font-medium normal-case">
                  ({byKind[kind].length})
                </span>
              </h3>
              <div className="space-y-3">
                {byKind[kind].map((row) => {
                  const aliases = Array.isArray(row.aliases) ? (row.aliases as string[]) : [];
                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-[#1a472a]/10 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-bold text-[#1a472a]">{row.roleTitle}</p>
                          <p className="text-xs text-[#1a472a]/75">
                            slug: <code className="px-1 bg-[#1a472a]/5 rounded">{row.roleSlug}</code>
                            {row.circle && <span className="ml-2">circle: {row.circle}</span>}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          {row.userId ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7dd87d]/15 text-[#1a472a] font-semibold">
                              <UserPlus className="w-3 h-3" />
                              {row.userName ?? row.userHandle ?? `User ${row.userId}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold">
                              <UserMinus className="w-3 h-3" /> open to the circle
                            </span>
                          )}
                        </div>
                      </div>

                      <AssignBlock
                        holderId={row.id}
                        currentUserId={row.userId}
                        onSaved={() => list.refetch()}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#1a472a]/75 mb-1">Notifications</p>
                          <div className="flex items-center gap-3 text-sm">
                            <label className="inline-flex items-center gap-1.5 text-[#1a472a]">
                              <input
                                type="checkbox"
                                checked={row.notifyEmail === 1}
                                onChange={(e) => setPrefs.mutate({ id: row.id, notifyEmail: e.target.checked })}
                              />
                              <Mail className="w-3 h-3" /> Email
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-[#1a472a]">
                              <input
                                type="checkbox"
                                checked={row.notifyInApp === 1}
                                onChange={(e) => setPrefs.mutate({ id: row.id, notifyInApp: e.target.checked })}
                              />
                              <Bell className="w-3 h-3" /> In-app
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-[#1a472a]/75">
                              <input
                                type="checkbox"
                                checked={row.isActive === 1}
                                onChange={(e) => updateMeta.mutate({ id: row.id, isActive: e.target.checked })}
                              />
                              Active
                            </label>
                            {!row.isActive && <X className="w-3 h-3 text-amber-700" />}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#1a472a]/75 mb-1">
                            Aliases the LLM may match
                          </p>
                          <AliasEditor
                            holderId={row.id}
                            initial={aliases}
                            onSaved={() => list.refetch()}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default AdminRoleHoldersTab;

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function truncateAddr(addr: string): string {
  if (!addr) return "";
  return addr.length <= 12 ? addr : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AdminPlayersTab() {
  const { data: players, isLoading, refetch } = trpc.playerProfiles.list.useQuery();
  const [playerFilter, setPlayerFilter] = useState<'all' | 'verified' | 'unverified' | 'banned'>('all');
  const verifyMut = trpc.playerProfiles.verify.useMutation({ onSuccess: () => { refetch(); toast.success('Player verified'); } });
  const unverifyMut = trpc.playerProfiles.unverify.useMutation({ onSuccess: () => { refetch(); toast.success('Player unverified'); } });
  const banMut = trpc.playerProfiles.banPlayer.useMutation({ onSuccess: () => { refetch(); toast.success('Player banned'); } });
  const deleteMut = trpc.playerProfiles.deleteProfile.useMutation({ onSuccess: () => { refetch(); toast.success('Profile deleted'); } });
  const syncMut = trpc.playerProfiles.adminSyncTokens.useMutation({ onSuccess: () => { refetch(); toast.success('Tokens synced'); } });

  const filtered = (players || []).filter((p: any) => {
    if (playerFilter === 'verified') return p.isVerified === 1;
    if (playerFilter === 'unverified') return p.isVerified !== 1;
    return true;
  });

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Users className="w-5 h-5" />
            Player accounts ({players?.length ?? 0})
          </CardTitle>
          <div className="flex gap-2">
            {(['all', 'verified', 'unverified'] as const).map(f => (
              <button
                key={f}
                onClick={() => setPlayerFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${playerFilter === f ? 'bg-[#1a472a] text-white border-[#1a472a]' : 'border-[#1a472a]/20 text-[#1a472a]/75 hover:bg-[#f0ebe3]'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-[#1a472a]/80">Loading players...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[#1a472a]/80">No players found</div>
        ) : (
          <div className="divide-y divide-[#1a472a]/10">
            {filtered.map((player: any) => (
              <div key={player.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1a472a] text-sm">{player.displayName}</p>
                    {player.isVerified === 1 ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Verified</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">Unverified</Badge>
                    )}
                    {player.walletAddress ? (
                      <span className="text-[10px] text-[#1a472a]/80 font-mono">{truncateAddr(player.walletAddress)}</span>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">No wallet</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#1a472a]/80 mt-0.5">
                    RV: {player.rvoiceBalance || 0} | RG: {player.rgenBalance || 0}
                    {player.lastTokenSync ? ` | Synced ${new Date(player.lastTokenSync).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {player.isVerified !== 1 ? (
                    <button
                      onClick={() => verifyMut.mutate({ id: player.id })}
                      className="text-[10px] px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                    >Verify</button>
                  ) : (
                    <button
                      onClick={() => unverifyMut.mutate({ profileId: player.id })}
                      className="text-[10px] px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                    >Unverify</button>
                  )}
                  {player.walletAddress && (
                    <button
                      onClick={() => syncMut.mutate({ profileId: player.id })}
                      className="text-[10px] px-2 py-1 rounded border border-[#7dd87d] text-[#4a7c59] hover:bg-green-50 transition-colors"
                    >Sync Tokens</button>
                  )}
                  <button
                    onClick={() => { if (window.confirm('Ban this player?')) banMut.mutate({ profileId: player.id }); }}
                    className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >Ban</button>
                  <button
                    onClick={() => { if (window.confirm('Delete this profile? This cannot be undone.')) deleteMut.mutate({ profileId: player.id }); }}
                    className="text-[10px] px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

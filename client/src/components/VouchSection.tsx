import { Handshake } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface Vouch {
  id: number;
  voucherName: string;
  voucherAvatar: string;
}

interface VouchSectionProps {
  playerId: number;
  vouches: Vouch[];
  isOwnProfile: boolean;
}

export default function VouchSection({ playerId, vouches, isOwnProfile }: VouchSectionProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300">
        <Handshake className="h-4 w-4" />
        Vouches ({vouches.length})
      </h3>

      {vouches.length > 0 && (
        <div className="flex -space-x-2">
          {vouches.map((v) => (
            <img
              key={v.id}
              src={v.voucherAvatar}
              alt={v.voucherName}
              title={v.voucherName}
              className="h-8 w-8 rounded-full border-2 border-gray-900"
            />
          ))}
        </div>
      )}

      {!isOwnProfile && user && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600"
        >
          <Handshake className="h-3.5 w-3.5" />
          Vouch for this player
        </button>
      )}
    </div>
  );
}

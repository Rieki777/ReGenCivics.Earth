/**
 * DiscoverTab, personalized member discovery section shown in the PlayerProfile Overview tab.
 * Shows people in the same bioregion and people dreaming of similar things.
 */

import React from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { TaoSpinner } from '@/components/TaoSpinner';
import { MapPin, Sparkles } from 'lucide-react';
import { resolveAssetUrl } from '@/lib/utils';

type PersonCard = {
  userId: number | null;
  displayName: string;
  avatarUrl: string | null;
  dreamingOf: string | null;
  bioregionId?: number | null;
};

function AvatarCircle({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const initial = displayName.charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={resolveAssetUrl(avatarUrl)}
        alt={displayName}
        width="40"
        height="40"
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#7dd87d]/30"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#1a472a] border border-[#7dd87d]/30 flex items-center justify-center flex-shrink-0">
      <span className="text-[#7dd87d] font-bold text-base">{initial}</span>
    </div>
  );
}

function PersonCard({ person }: { person: PersonCard }) {
  const snippet = person.dreamingOf
    ? person.dreamingOf.length > 80
      ? person.dreamingOf.slice(0, 80).trimEnd() + '...'
      : person.dreamingOf
    : null;

  const inner = (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <AvatarCircle displayName={person.displayName} avatarUrl={person.avatarUrl} />
      <div className="min-w-0">
        <p className="text-white font-semibold text-sm truncate">{person.displayName}</p>
        {snippet && (
          <p className="text-white/60 text-xs mt-0.5 leading-relaxed line-clamp-2">{snippet}</p>
        )}
      </div>
    </div>
  );

  if (person.userId) {
    return (
      <Link href={`/community/user/${person.userId}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#7dd87d]">{icon}</span>
      <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide">{label}</h3>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-white/60 text-sm italic px-1">{message}</p>
  );
}

export function DiscoverTab() {
  const { data, isLoading } = trpc.discovery.getRecommendations.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <TaoSpinner size={40} />
      </div>
    );
  }

  const nearbyPeople = data?.nearbyPeople ?? [];
  const dreamingAlikes = data?.dreamingAlikes ?? [];
  const bothEmpty = nearbyPeople.length === 0 && dreamingAlikes.length === 0;

  return (
    <div className="glass-panel p-6 rounded-xl space-y-6">
      <div>
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7dd87d]" /> Discover People
        </h2>
        <p className="text-white/70 text-sm">Members you might want to connect with, based on your profile.</p>
      </div>

      {bothEmpty && (
        <div className="rounded-lg bg-white/5 p-4 text-center space-y-2">
          <p className="text-white/70 text-sm font-medium">Fill in your profile to find kindred spirits.</p>
          <p className="text-white/60 text-xs">
            Set your bioregion and what you are dreaming of in Settings to see personalized recommendations here.
          </p>
        </div>
      )}

      {!bothEmpty && (
        <div className="space-y-6">
          {/* People near you */}
          <div>
            <SectionHeader
              icon={<MapPin className="w-4 h-4" />}
              label="People near you"
            />
            {nearbyPeople.length === 0 ? (
              <EmptyState message="Set your bioregion in Settings to find nearby members." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nearbyPeople.map((person, i) => (
                  <PersonCard key={person.userId ?? i} person={person} />
                ))}
              </div>
            )}
          </div>

          {/* Dreaming of similar things */}
          <div>
            <SectionHeader
              icon={<Sparkles className="w-4 h-4" />}
              label="Dreaming of similar things"
            />
            {dreamingAlikes.length === 0 ? (
              <EmptyState message="Fill in 'What are you dreaming of?' in Settings to find kindred spirits." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dreamingAlikes.map((person, i) => (
                  <PersonCard key={person.userId ?? i} person={person} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

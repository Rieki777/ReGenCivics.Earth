/**
 * The signed-in member's character, or an empty sheet.
 * Class choice is stored on player_profiles. Gifts stay in saved_contributions.
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  archetypeByKey,
  buildGiftRecord,
  parsePartyKeys,
  standingFromRecord,
  type GiftDraft,
  type PortraitPresentation,
  type StandingFigures,
} from "@shared/characterSheet";
import CharacterSheet from "./CharacterSheet";

function draftsFromSaved(rawImmediate: string | null, rawFuture: string | null): GiftDraft[] {
  const drafts: GiftDraft[] = [];
  try {
    const immediate = JSON.parse(rawImmediate || "[]");
    if (Array.isArray(immediate)) {
      for (const item of immediate) {
        drafts.push({
          capital: String(item?.capital ?? ""),
          description: String(item?.description ?? ""),
          value: Number(item?.value ?? 0),
          kind: "gift",
        });
      }
    }
  } catch {
    /* unread gifts stay off the sheet */
  }
  try {
    const future = JSON.parse(rawFuture || "[]");
    if (Array.isArray(future)) {
      for (const item of future) {
        const value = Number(item?.weeks ?? 0) * Number(item?.hoursPerWeek ?? 0) * Number(item?.hourlyRate ?? 0);
        drafts.push({
          capital: String(item?.capital ?? "experiential"),
          description: String(item?.roleName ?? ""),
          value,
          kind: "role",
        });
      }
    }
  } catch {
    /* unread roles stay off the sheet */
  }
  return drafts;
}

export default function ProfileCharacter({
  standing,
  showRecordLink = false,
}: {
  /** Live gift-map figures. When omitted, the latest saved map is used. */
  standing?: StandingFigures;
  showRecordLink?: boolean;
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const profileQuery = trpc.playerProfiles.me.useQuery(undefined, { enabled: isAuthenticated });
  const savedQuery = trpc.savedContributions.list.useQuery(undefined, {
    enabled: isAuthenticated && standing === undefined,
  });
  const [said, setSaid] = useState("");
  const setCharacter = trpc.playerProfiles.setCharacter.useMutation({
    onSuccess: async (choice) => {
      await utils.playerProfiles.me.invalidate();
      const name = archetypeByKey(choice.primaryArchetypeKey)?.name;
      setSaid(name ? `${name} now fronts your sheet.` : "Class cleared.");
    },
    onError: () => setSaid("Could not save your class. Try again."),
  });

  const profile = profileQuery.data;
  const latest = savedQuery.data?.[0];
  const savedStanding = latest
    ? standingFromRecord(buildGiftRecord(draftsFromSaved(latest.immediateContributions, latest.futureContributions)))
    : { brings: null, gifts: null, roles: null };
  const figures = standing ?? savedStanding;
  const primaryKey = profile?.primaryArchetypeKey ?? null;
  const partyKeys = parsePartyKeys(profile?.partyArchetypeKeys);
  const portrait = (profile?.portraitPresentation === "f" || profile?.portraitPresentation === "m")
    ? profile.portraitPresentation
    : null;
  const displayName = profile?.displayName || user?.name || "Your sheet";

  const write = (next: { primary: string | null; party: string[]; portrait: PortraitPresentation | null }) => {
    setCharacter.mutate({
      primaryArchetypeKey: next.primary,
      partyArchetypeKeys: next.party,
      portraitPresentation: next.portrait,
    });
  };

  const waiting = loading || (isAuthenticated && profileQuery.isLoading);

  return (
    <div>
      <CharacterSheet
        displayName={displayName}
        primaryKey={primaryKey}
        partyKeys={partyKeys.length > 0 ? partyKeys : (primaryKey ? [primaryKey] : [])}
        portraitPresentation={portrait}
        standing={figures}
        editable={Boolean(profile)}
        signedIn={isAuthenticated}
        emptyMessage={isAuthenticated && !profile ? "Create your profile, then choose a class." : undefined}
        statusLine={said || (waiting ? "Reading your sheet." : "")}
        signInHref={getLoginUrl()}
        onChoose={(key) => {
          const party = partyKeys.includes(key) ? partyKeys : [...partyKeys, key];
          write({ primary: key, party, portrait });
        }}
        onFront={(key) => write({ primary: key, party: partyKeys.includes(key) ? partyKeys : [...partyKeys, key], portrait })}
        onPortrait={(next) => write({ primary: primaryKey, party: partyKeys, portrait: next })}
      />
      {showRecordLink && latest ? (
        <p className="sheet-quiet">
          <a className="sheet-link" href={`/crowd-pooling?savedId=${latest.id}`}>Open the latest gift map</a>
        </p>
      ) : null}
    </div>
  );
}

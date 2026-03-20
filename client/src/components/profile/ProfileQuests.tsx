/**
 * ProfileQuests
 * Wrapper for the quests section in PlayerProfile.
 * The QuestsTab function is defined in PlayerProfile.tsx.
 */
import React from "react";

interface ProfileQuestsProps {
  profile: any;
  QuestsTabComp: React.ComponentType<{ profile: any }>;
}

export function ProfileQuests({ profile, QuestsTabComp }: ProfileQuestsProps) {
  return <QuestsTabComp profile={profile} />;
}

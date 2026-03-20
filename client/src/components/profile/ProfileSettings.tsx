/**
 * ProfileSettings
 * Settings panel for the player profile.
 * Wraps notification prefs, digest prefs, and profile edit form.
 */
import React from "react";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { DigestPreferences } from "@/components/DigestPreferences";
import { ProfileEditForm } from "@/components/ProfileEditForm";

interface ProfileSettingsProps {
  profile: any;
  onUpdate: () => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const currentFrequency = (profile as any)?.emailDigestFrequency || 'monthly';
  return (
    <div className="space-y-6">
      <ProfileEditForm />
      <NotificationPreferences />
      <DigestPreferences currentFrequency={currentFrequency} />
    </div>
  );
}

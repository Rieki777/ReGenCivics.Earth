/**
 * LocationPicker, coordinate-based location picker for player profiles.
 * Provides lat/lng input, privacy precision selector, and nomadic/Earth options.
 * The embedded map view is a future enhancement, for now we show a clean form.
 */

import React, { useState } from "react";
import { Globe, MapPin, Navigation } from "lucide-react";

export type LocationPrecision = "exact" | "city" | "region" | "hidden";

export interface LocationData {
  lat: number | null;
  lng: number | null;
  precision: LocationPrecision;
  label: string;
  nomadic: boolean;
  earth: boolean;
}

interface LocationPickerProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  variant?: "light" | "dark";
}

const PRECISION_OPTIONS: { value: LocationPrecision; label: string; desc: string }[] = [
  { value: "exact", label: "Exact", desc: "Shows your precise pin to others" },
  { value: "city", label: "City", desc: "Shows city-level location only" },
  { value: "region", label: "Region", desc: "Shows region / label only, no pin" },
  { value: "hidden", label: "Private", desc: "Hides your location entirely" },
];

export function LocationPicker({ value, onChange, variant = "dark" }: LocationPickerProps) {
  const [latStr, setLatStr] = useState(value.lat != null ? String(value.lat) : "");
  const [lngStr, setLngStr] = useState(value.lng != null ? String(value.lng) : "");

  const isDark = variant === "dark";
  const inputClass = isDark
    ? "w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#7dd87d]/40 placeholder-white/30"
    : "w-full bg-white border border-[#1a472a]/20 text-[#1a472a] text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#7dd87d]/60 placeholder-[#1a472a]/30";
  const labelClass = isDark ? "text-white/60 text-xs" : "text-[#1a472a]/70 text-xs";
  const chipBase = isDark
    ? "text-xs px-2.5 py-1 rounded-full border transition-all"
    : "text-xs px-2.5 py-1 rounded-full border transition-all";
  const chipActive = isDark ? "bg-[#7dd87d] text-[#1a472a] border-[#7dd87d]" : "bg-[#1a472a] text-white border-[#1a472a]";
  const chipInactive = isDark ? "bg-white/5 text-white/50 border-white/15 hover:bg-white/10" : "bg-white text-[#1a472a]/60 border-[#1a472a]/20 hover:bg-[#f0f7f0]";

  const handleLatBlur = () => {
    const parsed = parseFloat(latStr);
    onChange({ ...value, lat: isNaN(parsed) ? null : parsed });
  };

  const handleLngBlur = () => {
    const parsed = parseFloat(lngStr);
    onChange({ ...value, lng: isNaN(parsed) ? null : parsed });
  };

  const toggleNomadic = () => {
    onChange({ ...value, nomadic: !value.nomadic, earth: false });
  };

  const toggleEarth = () => {
    onChange({ ...value, earth: !value.earth, nomadic: false });
  };

  return (
    <div className="space-y-4">
      {/* Quick toggles for special states */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={toggleNomadic}
          className={`${chipBase} flex items-center gap-1.5 ${value.nomadic ? chipActive : chipInactive}`}
        >
          <Navigation className="w-3 h-3" />
          Nomadic
        </button>
        <button
          type="button"
          onClick={toggleEarth}
          className={`${chipBase} flex items-center gap-1.5 ${value.earth ? chipActive : chipInactive}`}
        >
          <Globe className="w-3 h-3" />
          Citizen of the Earth
        </button>
      </div>

      {/* Coordinates */}
      {!value.nomadic && !value.earth && (
        <div className="space-y-3">
          <div>
            <label className={`${labelClass} mb-1 block`}>Location label <span className="opacity-60">(city, region, or custom)</span></label>
            <input
              type="text"
              value={value.label}
              onChange={(e) => onChange({ ...value, label: e.target.value })}
              placeholder="e.g. Portland, OR or Pacific Northwest"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${labelClass} mb-1 block`}>Latitude <span className="opacity-60">(optional)</span></label>
              <input
                type="text"
                inputMode="decimal"
                value={latStr}
                onChange={(e) => setLatStr(e.target.value)}
                onBlur={handleLatBlur}
                placeholder="45.5231"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`${labelClass} mb-1 block`}>Longitude <span className="opacity-60">(optional)</span></label>
              <input
                type="text"
                inputMode="decimal"
                value={lngStr}
                onChange={(e) => setLngStr(e.target.value)}
                onBlur={handleLngBlur}
                placeholder="-122.6765"
                className={inputClass}
              />
            </div>
          </div>
          <p className={`${labelClass} opacity-70`}>
            <MapPin className="w-3 h-3 inline mr-1" />
            Tip: right-click any location in Google Maps → "What's here?" to copy coordinates.
          </p>
        </div>
      )}

      {/* Privacy precision */}
      {!value.nomadic && !value.earth && (
        <div>
          <label className={`${labelClass} mb-2 block`}>Who can see your location?</label>
          <div className="grid grid-cols-2 gap-2">
            {PRECISION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, precision: opt.value })}
                className={`${chipBase} text-left px-3 py-2 ${value.precision === opt.value ? chipActive : chipInactive}`}
              >
                <span className="font-medium block">{opt.label}</span>
                <span className="opacity-60 text-[10px] leading-tight block">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact display for profile card, shows nomadic/earth icons or location label */
export function LocationDisplay({ profile }: { profile: any }) {
  if (profile.locationNomadic) {
    return (
      <span className="flex items-center gap-1 text-sm">
        <Navigation className="w-3.5 h-3.5" />
        Nomadic
      </span>
    );
  }
  if (profile.locationEarth) {
    return (
      <span className="flex items-center gap-1 text-sm">
        <Globe className="w-3.5 h-3.5" />
        Citizen of the Earth
      </span>
    );
  }
  if (profile.locationLabel && profile.locationPrecision !== "hidden") {
    return (
      <span className="flex items-center gap-1 text-sm">
        <MapPin className="w-3.5 h-3.5" />
        {profile.locationLabel}
      </span>
    );
  }
  return null;
}

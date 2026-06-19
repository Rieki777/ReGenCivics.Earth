/**
 * BioregionSelect, searchable combobox for selecting a bioregion by ID.
 * Uses shadcn Popover + Command (cmdk) for the combobox pattern.
 *
 * Props:
 *   value     , currently selected bioregion ID (or null)
 *   onChange  , called with the new ID (or null to clear)
 *   placeholder, text shown when nothing is selected
 *   variant   , "light" (cream bg, for CreateProfileForm) | "dark" (glass bg, for Settings panel)
 */

import React, { useState } from "react";
import { ChevronsUpDown, X, Check, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface BioregionSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  /** "light" for cream/white backgrounds (CreateProfileForm), "dark" for glass panels (Settings) */
  variant?: "light" | "dark";
}

export function BioregionSelect({
  value,
  onChange,
  placeholder = "Search bioregions…",
  variant = "light",
}: BioregionSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: bioregions = [], isLoading } = trpc.bioregions.list.useQuery();

  const selected = bioregions.find((b) => b.id === value) ?? null;

  const handleSelect = (id: number) => {
    onChange(id === value ? null : id);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Style tokens per variant
  const triggerBase =
    variant === "dark"
      ? "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none bg-white/5 border-white/15 text-white hover:bg-white/10 focus:border-[#7dd87d]/40"
      : "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none bg-white border-[#1a472a]/20 text-[#1a472a] hover:bg-[#f0f7f0] focus:border-[#7dd87d]/60";

  const placeholderClass =
    variant === "dark" ? "text-white/70" : "text-[#1a472a]/80";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerBase} aria-expanded={open}>
          <span className="flex items-center gap-1.5 min-w-0">
            <MapPin className="shrink-0 w-3.5 h-3.5 opacity-60" />
            {selected ? (
              <span className="truncate">{selected.name}</span>
            ) : (
              <span className={placeholderClass}>{isLoading ? "Loading…" : placeholder}</span>
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {selected && (
              <span
                role="button"
                aria-label="Clear bioregion"
                onClick={handleClear}
                className={cn(
                  "rounded-full p-0.5 transition-colors",
                  variant === "dark"
                    ? "hover:bg-white/20 text-white/70 hover:text-white"
                    : "hover:bg-[#1a472a]/10 text-[#1a472a]/80 hover:text-[#1a472a]"
                )}
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[320px]"
        align="start"
        style={{ zIndex: 9999 }}
      >
        <Command>
          <CommandInput placeholder="Search bioregions…" />
          <CommandList>
            <CommandEmpty>No bioregion found.</CommandEmpty>
            <CommandGroup>
              {bioregions.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.name}
                  onSelect={() => handleSelect(b.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === b.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{b.name}</span>
                  {(b.realm || b.subrealm) && (
                    <span className="ml-2 text-xs text-muted-foreground truncate max-w-[120px]">
                      {[b.subrealm, b.realm].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

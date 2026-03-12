/**
 * BioregionMultiSelect — searchable multi-select combobox for bioregion selection.
 * Selected bioregions appear as removable chips above the search input.
 *
 * Props:
 *   values    — array of currently selected bioregion IDs
 *   onChange  — called with the new array of IDs
 *   variant   — "light" (cream bg) | "dark" (glass bg)
 */

import React, { useState } from "react";
import { X, MapPin, ChevronsUpDown, Check, Plus } from "lucide-react";
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

interface BioregionMultiSelectProps {
  values: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  variant?: "light" | "dark";
  maxVisible?: number;
}

export function BioregionMultiSelect({
  values,
  onChange,
  placeholder = "Add a bioregion…",
  variant = "dark",
  maxVisible = 5,
}: BioregionMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestPending, setSuggestPending] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);
  const { data: bioregions = [], isLoading } = trpc.bioregions.list.useQuery();
  const suggestMut = trpc.bioregions.suggest.useMutation({
    onSuccess: () => { setSuggestDone(true); setSuggestPending(false); },
    onError: () => setSuggestPending(false),
  });

  const selectedBioregions = bioregions.filter((b) => values.includes(b.id));
  const visibleChips = selectedBioregions.slice(0, maxVisible);
  const overflowCount = selectedBioregions.length - maxVisible;

  const handleToggle = (id: number) => {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
    }
  };

  const handleRemove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onChange(values.filter((v) => v !== id));
  };

  const chipClass =
    variant === "dark"
      ? "inline-flex items-center gap-1 bg-[#1a472a] border border-[#7dd87d]/30 text-white text-xs px-2 py-0.5 rounded-full"
      : "inline-flex items-center gap-1 bg-[#1a472a]/10 border border-[#1a472a]/20 text-[#1a472a] text-xs px-2 py-0.5 rounded-full";

  const triggerBase =
    variant === "dark"
      ? "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none bg-white/5 border-white/15 text-white hover:bg-white/10 focus:border-[#7dd87d]/40 min-h-[42px]"
      : "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none bg-white border-[#1a472a]/20 text-[#1a472a] hover:bg-[#f0f7f0] focus:border-[#7dd87d]/60 min-h-[42px]";

  return (
    <div className="space-y-2">
      {/* Chips for selected bioregions */}
      {selectedBioregions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleChips.map((b) => (
            <span key={b.id} className={chipClass}>
              {b.name}
              <button
                type="button"
                aria-label={`Remove ${b.name}`}
                onClick={(e) => handleRemove(e, b.id)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {overflowCount > 0 && (
            <span className={cn(chipClass, "opacity-60")}>+{overflowCount} more</span>
          )}
        </div>
      )}

      {/* Search input / trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={triggerBase} aria-expanded={open}>
            <span className="flex items-center gap-1.5">
              <MapPin className="shrink-0 w-3.5 h-3.5 opacity-60" />
              <span className={variant === "dark" ? "text-white/40" : "text-[#1a472a]/40"}>
                {isLoading ? "Loading…" : placeholder}
              </span>
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-[320px]" align="start" style={{ zIndex: 9999 }}>
          <Command>
            <CommandInput
              placeholder="Search bioregions…"
              value={searchValue}
              onValueChange={(v) => { setSearchValue(v); setSuggestDone(false); }}
            />
            <CommandList>
              <CommandEmpty>
                <div className="px-3 py-3 space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">No bioregion found.</p>
                  {searchValue.length >= 2 && (
                    suggestDone ? (
                      <p className="text-xs text-[#7dd87d]">✓ Suggestion submitted! Admins will review it.</p>
                    ) : (
                      <button
                        type="button"
                        disabled={suggestPending}
                        onClick={() => {
                          setSuggestPending(true);
                          suggestMut.mutate({ name: searchValue });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#1a472a]/10 border border-[#1a472a]/20 text-[#1a472a] hover:bg-[#1a472a]/20 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        Suggest "{searchValue}"
                      </button>
                    )
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {bioregions.map((b) => {
                  const isSelected = values.includes(b.id);
                  return (
                    <CommandItem
                      key={b.id}
                      value={b.name}
                      onSelect={() => handleToggle(b.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100 text-[#7dd87d]" : "opacity-0"
                        )}
                      />
                      <span className="flex-1 truncate">{b.name}</span>
                      {(b.realm || b.subrealm) && (
                        <span className="ml-2 text-xs text-muted-foreground truncate max-w-[120px]">
                          {[b.subrealm, b.realm].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

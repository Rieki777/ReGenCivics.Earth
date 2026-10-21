/**
 * BioregionSelect, searchable combobox for selecting a bioregion by ID.
 * A shadcn Popover holding BioregionListbox, a light list that opens without
 * mounting a component per bioregion (STEERING.md section 13).
 *
 * Props:
 *   value     , currently selected bioregion ID (or null)
 *   onChange  , called with the new ID (or null to clear)
 *   placeholder, text shown when nothing is selected
 *   variant   , "light" (cream bg, for CreateProfileForm) | "dark" (glass bg, for Settings panel)
 */

import React, { useRef, useState } from "react";
import { ChevronsUpDown, X, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BioregionListbox } from "@/components/BioregionListbox";
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data: bioregions = [], isLoading } = trpc.bioregions.list.useQuery();

  const selected = bioregions.find((b) => b.id === value) ?? null;

  const handleSelect = (id: number) => {
    onChange(id === value ? null : id);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    // Clear goes away with the value; keep focus on the picker, not the page.
    triggerRef.current?.focus();
  };

  // Style tokens per variant
  const triggerBase =
    variant === "dark"
      ? "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none bg-white/5 border-white/15 text-white hover:bg-white/10 focus:border-[#7dd87d]/40"
      : "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none bg-white border-[#1a472a]/20 text-[#1a472a] hover:bg-[#f0f7f0] focus:border-[#7dd87d]/60";

  const placeholderClass =
    variant === "dark" ? "text-white/80" : "text-[#1a472a]/80";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Clear sits beside the trigger, not inside it: a control inside a
          button gets no Tab stop and a 16px target (pnpm ui:audit). The
          name stops short of it. */}
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <button ref={triggerRef} type="button" className={triggerBase} aria-expanded={open}>
            <span className={cn("flex items-center gap-1.5 min-w-0", selected && "mr-8 max-md:mr-12 pointer-coarse:mr-12")}>
              <MapPin className="shrink-0 w-3.5 h-3.5 opacity-60" />
              {selected ? (
                <span className="truncate">{selected.name}</span>
              ) : (
                <span className={placeholderClass}>{isLoading ? "Loading…" : placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>
        {selected && (
          <button
            type="button"
            aria-label="Clear bioregion"
            onClick={handleClear}
            className={cn(
              "no-touch-extend absolute right-7 top-1/2 -translate-y-1/2 inline-flex size-6 items-center justify-center rounded-full transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11",
              variant === "dark"
                ? "hover:bg-white/20 text-white/70 hover:text-white"
                : "hover:bg-[#1a472a]/10 text-[#1a472a]/80 hover:text-[#1a472a]"
            )}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <PopoverContent
        className="p-0 w-[320px]"
        align="start"
        style={{ zIndex: 9999 }}
      >
        <BioregionListbox
          bioregions={bioregions}
          isChosen={(id) => id === value}
          onPick={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

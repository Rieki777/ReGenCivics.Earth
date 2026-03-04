/**
 * HelpTooltip - (?) icon that shows a brief explanation on hover/tap
 * Used next to complex financial concepts and inputs
 */
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  text: string;
  className?: string;
  iconSize?: number;
  side?: "top" | "bottom" | "left" | "right";
}

export function HelpTooltip({ text, className = "", iconSize = 14, side = "top" }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center text-white/30 hover:text-[#7dd87d] transition-colors ${className}`}
            aria-label="Help"
          >
            <HelpCircle style={{ width: iconSize, height: iconSize }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[280px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default HelpTooltip;

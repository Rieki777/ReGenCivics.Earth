/**
 * ProgressMapMini - Compact progress widget for the CommandPanel.
 * Shows all 4 paths with dot indicators and completion percentages.
 */
import { PATHS } from "./mapData";
import { useProgressMap } from "./useProgressMap";

interface Props {
  onExpand?: () => void;
}

export function ProgressMapMini({ onExpand }: Props) {
  const { paths, overallPercent } = useProgressMap();

  return (
    <div className="pt-1 border-t border-white/10">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
        {PATHS.map(path => {
          const pp = paths.find(p => p.pathId === path.id);
          if (!pp) return null;
          return (
            <div key={path.id} className="flex items-center gap-2 min-w-0">
              <span className="text-xs flex-shrink-0">{path.emoji}</span>
              <span className="text-[10px] text-white/60 font-medium truncate">{path.name}</span>
              <div className="flex gap-0.5 flex-shrink-0">
                {path.nodes.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: i < pp.completed ? path.color : "rgba(255,255,255,0.12)",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between text-[10px] text-white/60 hover:text-[#7dd87d] transition-colors py-1"
      >
        <span>{overallPercent}% explored</span>
        <span className="text-[#7dd87d]/60">View Map</span>
      </button>
    </div>
  );
}

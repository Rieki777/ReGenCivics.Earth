/**
 * ProgressMap - Full-screen interactive map overlay.
 * Desktop: illustrated SVG map + sidebar with path details.
 * Mobile: scrollable map + bottom sheet with path switcher.
 */
import { useState } from "react";
import { X, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { PATHS, type MapNode, type PathId } from "./mapData";
import { MAP_ASSETS, getMapSrc } from "./mapAssets";
import { ProgressMapSVG } from "./ProgressMapSVG";
import { useProgressMap } from "./useProgressMap";
import { MapTransition } from "./MapTransition";

interface Props {
  onClose: () => void;
}

export default function ProgressMap({ onClose }: Props) {
  const progress = useProgressMap();
  const [selectedPath, setSelectedPath] = useState<PathId | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);

  const activePath = selectedPath
    ? PATHS.find(p => p.id === selectedPath)
    : null;
  const activeProgress = selectedPath
    ? progress.paths.find(p => p.pathId === selectedPath)
    : null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a1a10] flex flex-col" data-map-overlay>
      {/* Preload hero map illustration (responsive) */}
      <link rel="preload" href={MAP_ASSETS.hero.md} as="image" type="image/webp" media="(min-width: 768px)" />
      <link rel="preload" href={MAP_ASSETS.hero.sm} as="image" type="image/webp" media="(max-width: 767px)" />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h1
          className="text-white font-bold text-lg"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The Regenerative Map
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{progress.overallPercent}% explored</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar (desktop only) */}
        <div className="hidden md:flex flex-col w-64 border-r border-white/10 p-4 overflow-y-auto flex-shrink-0">
          <p className="text-white/40 text-xs mb-4 uppercase tracking-wider font-semibold">Paths</p>

          {PATHS.map(path => {
            const pp = progress.paths.find(p => p.pathId === path.id);
            if (!pp) return null;
            const isActive = selectedPath === path.id;

            return (
              <button
                key={path.id}
                onClick={() => setSelectedPath(isActive ? null : path.id)}
                className={`w-full text-left p-3 rounded-xl mb-2 transition-all border ${
                  isActive
                    ? "border-white/20 bg-white/5"
                    : "border-transparent hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{path.emoji}</span>
                  <span className="text-white font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                    {path.name}
                  </span>
                  <span className="text-white/30 text-xs ml-auto">{pp.completed}/{pp.total}</span>
                </div>

                {/* Dot progress */}
                <div className="flex gap-1 mb-1.5">
                  {path.nodes.map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor: i < pp.completed ? path.color : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>

                {/* Next milestone */}
                {pp.nextNode && (
                  <p className="text-white/40 text-[10px] truncate">
                    Next: {pp.nextNode.label}
                  </p>
                )}
              </button>
            );
          })}

          {/* Overall */}
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50 text-xs">Overall</span>
              <span className="text-[#7dd87d] text-xs font-bold">{progress.overallPercent}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7dd87d] rounded-full transition-all duration-500"
                style={{ width: `${progress.overallPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 relative min-h-0">
          <ProgressMapSVG
            progress={progress}
            selectedPath={selectedPath}
            onNodeClick={(node) => setSelectedNode(node)}
          />

          {/* Node detail card */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[#0d2818]/95 backdrop-blur-sm border border-white/20 rounded-2xl p-4 z-10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                    {selectedNode.landmark}
                  </p>
                  <p className="text-white/50 text-xs">{selectedNode.label}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/40"
                  aria-label="Close detail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {progress.completedSet.has(selectedNode.id) ? (
                <p className="text-[#7dd87d] text-xs font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#7dd87d]/20 flex items-center justify-center text-[10px]">✓</span>
                  Completed
                </p>
              ) : (
                <MapTransition
                  targetPath={selectedNode.href}
                  onTransitionStart={onClose}
                  className="inline-flex items-center gap-2 mt-1 px-4 py-2 rounded-xl bg-[#7dd87d] text-[#1a472a] font-semibold text-xs hover:bg-[#6bc86b] transition-colors"
                >
                  Go there <ChevronRight className="w-3 h-3" />
                </MapTransition>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet (path switcher) */}
      <div className="md:hidden border-t border-white/10 bg-[#0d1a10] flex-shrink-0">
        <div className="flex gap-1 p-2 overflow-x-auto">
          {PATHS.map(path => {
            const pp = progress.paths.find(p => p.pathId === path.id);
            const isActive = selectedPath === path.id;
            return (
              <button
                key={path.id}
                onClick={() => setSelectedPath(isActive ? null : path.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                <span>{path.emoji}</span>
                {path.name}
                <span className="text-white/30">{pp?.completed}/{pp?.total}</span>
              </button>
            );
          })}
        </div>
        {activeProgress?.nextNode && (
          <div className="px-3 pb-2">
            <Link
              href={activeProgress.nextNode.href}
              className="flex items-center justify-between w-full p-2.5 rounded-xl bg-white/5 border border-white/10"
            >
              <div>
                <p className="text-white text-xs font-medium">Next: {activeProgress.nextNode.label}</p>
                <p className="text-white/40 text-[10px]">{activeProgress.nextNode.landmark}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-white/30" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Harness entry. Picks a story from ?story=<key> and renders it against the
 * app's real stylesheet, so what you see is what the app renders.
 */
import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./harness.css";
import { STORIES } from "./stories";

/** One broken story must not take the whole harness down with it. */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre className="whitespace-pre-wrap rounded-lg border border-red-300 bg-red-50 p-4 text-xs text-red-900">
          {this.state.error.stack ?? String(this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}

const keys = Object.keys(STORIES);
const requested = new URLSearchParams(location.search).get("story");
const active = requested && STORIES[requested] ? requested : keys[0];
const story = STORIES[active];
story?.setup?.();

function Shell() {
  return (
    <div className="min-h-screen bg-[#f0ebe3] p-6">
      <nav className="mb-5 flex flex-wrap gap-2">
        {keys.map((k) => (
          <a
            key={k}
            href={`?story=${k}`}
            className={`rounded-lg px-3 py-1 text-xs ${
              k === active ? "bg-[#1a472a] text-white" : "bg-white text-[#1a472a] border border-[#1a472a]/20"
            }`}
          >
            {k}
          </a>
        ))}
      </nav>
      <h1 className="mb-4 text-sm font-semibold text-[#1a472a]">{story?.title ?? "No stories"}</h1>
      <div data-harness-story={active}>
        <Boundary>{story?.render() ?? null}</Boundary>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Shell />);

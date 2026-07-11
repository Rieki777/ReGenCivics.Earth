/**
 * Lazy entry point for the Conversational Companion. Hosts import
 * <FormCompanion> from here so the whole companion bundle (voice layer, icons,
 * conversation engine) code-splits into its own chunk and stays out of the
 * page's initial load until it renders.
 */
import { Suspense, lazy } from "react";
import type { FormCompanionProps } from "./FormCompanion";

const Inner = lazy(() => import("./FormCompanion"));

export function FormCompanion(props: FormCompanionProps) {
  return (
    <Suspense fallback={<div className="mb-5 h-24 rounded-2xl border bg-card animate-pulse motion-reduce:animate-none" aria-hidden="true" />}>
      <Inner {...props} />
    </Suspense>
  );
}

export type { FormCompanionProps } from "./FormCompanion";

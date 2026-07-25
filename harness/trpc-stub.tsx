/**
 * tRPC stand-in for the UI harness.
 *
 * The real client needs a server, a session, and a CSRF token. The harness has
 * none of those on purpose: it exists so a component can be looked at without
 * the dev CSP, the prod OAuth redirect, or a live database in the way.
 *
 * A deep Proxy answers any `trpc.<router>.<procedure>.useQuery()` call. Stories
 * fill `mockData` with canned responses keyed by the dotted procedure path
 * ("harvest.publicationReview"); anything a story does not stub returns
 * undefined, which is the same thing a component sees before its first fetch
 * resolves. Mutations are no-ops that fire onSuccess so optimistic UI still
 * settles.
 */

type AnyRec = Record<string, unknown>;

/** Canned query responses, keyed by dotted procedure path. Stories write here. */
export const mockData: AnyRec = {};

/** Mutation calls recorded during a render, so a story can assert on them. */
export const mutationLog: Array<{ path: string; input: unknown }> = [];

function makeProxy(path: string[]): any {
  // The target is callable so `trpc.foo.bar()` never throws, even unstubbed.
  const target = () => undefined;
  return new Proxy(target, {
    get(_t, prop) {
      if (typeof prop === "symbol") return undefined;
      const key = path.join(".");

      if (prop === "useQuery") {
        return () => ({
          data: mockData[key],
          isLoading: false,
          isPending: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve(),
        });
      }
      if (prop === "useMutation") {
        return () => ({
          mutate: (input?: unknown, opts?: { onSuccess?: (d: unknown) => void }) => {
            mutationLog.push({ path: key, input });
            opts?.onSuccess?.(mockData[`${key}.result`] ?? { ok: true });
          },
          mutateAsync: async (input?: unknown) => {
            mutationLog.push({ path: key, input });
            return mockData[`${key}.result`] ?? { ok: true };
          },
          isPending: false,
          isError: false,
          error: null,
          reset: () => undefined,
        });
      }
      if (prop === "useUtils" || prop === "useContext") return () => makeProxy([]);
      // Terminal cache verbs: `utils.harvest.listFeed.invalidate()`.
      if (prop === "invalidate" || prop === "refetch" || prop === "reset" || prop === "cancel") {
        return () => Promise.resolve();
      }
      return makeProxy([...path, String(prop)]);
    },
    apply() {
      return undefined;
    },
  });
}

export const trpc = makeProxy([]);
export default trpc;

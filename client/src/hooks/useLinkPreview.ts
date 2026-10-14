/**
 * useLinkPreview - extracts the first URL from post content
 * and fetches its Open Graph preview data via the server.
 */
import { trpc } from "@/lib/trpc";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/;

export function useLinkPreview(content: string) {
  const match = content.match(URL_REGEX);
  const typedUrl = match ? match[0] : "";
  // In a composer the URL grows one letter at a time. Look it up only once it
  // has held still for 500ms; until then, or once it is deleted, there is no
  // preview. Saved posts and replies are settled from the first render.
  const settledUrl = useDebouncedValue(typedUrl, 500);
  const url = settledUrl === typedUrl ? typedUrl : "";

  const { data, isLoading } = trpc.forum.fetchLinkPreview.useQuery(
    { url },
    {
      enabled: !!url,
      staleTime: 24 * 60 * 60 * 1000,
    }
  );

  return {
    preview: data ?? null,
    isLoading: !!url && isLoading,
    url,
  };
}

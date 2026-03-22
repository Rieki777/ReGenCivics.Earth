/**
 * useLinkPreview - extracts the first URL from post content
 * and fetches its Open Graph preview data via the server.
 */
import { trpc } from "@/lib/trpc";

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/;

export function useLinkPreview(content: string) {
  const match = content.match(URL_REGEX);
  const url = match ? match[0] : "";

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

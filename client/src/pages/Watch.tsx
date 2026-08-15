/**
 * /watch/:videoId — a shareable page for any YouTube video with the Video
 * Tutor at its heart. Link to it from quests, blog posts, recordings, and
 * emails: /watch/dQw4w9WgXcQ (any 11-char YouTube id).
 */
import { useParams } from "wouter";
import VideoWithTutor from "@/components/VideoWithTutor";

export default function Watch() {
  const params = useParams<{ videoId: string }>();
  const videoId = params?.videoId ?? "";
  const valid = /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {valid ? (
        <VideoWithTutor url={`https://www.youtube.com/watch?v=${videoId}`} title="Watch" />
      ) : (
        <div className="text-center py-16">
          <h1 className="text-xl font-semibold">That video link doesn't look right</h1>
          <p className="mt-2 text-sm opacity-70">
            A watch link looks like /watch/VIDEOID with an 11-character YouTube id.
          </p>
        </div>
      )}
    </div>
  );
}

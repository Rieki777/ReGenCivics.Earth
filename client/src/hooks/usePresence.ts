import { useState, useEffect, useRef } from "react";

// Sends a heartbeat and polls active user count
export function usePresence() {
  const [count, setCount] = useState<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Send heartbeat every 60 seconds
    const sendHeartbeat = () => {
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 60_000);

    // Fetch count every 30 seconds
    const fetchCount = () => {
      fetch("/api/presence")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.count === "number") {
            setCount(data.count);
          }
        })
        .catch(() => {});
    };

    fetchCount();
    pollRef.current = setInterval(fetchCount, 30_000);

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  return { count };
}

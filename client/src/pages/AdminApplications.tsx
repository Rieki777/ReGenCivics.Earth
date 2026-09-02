import { Redirect } from "wouter";

/** Old bookmark. The review workspace now lives at /admin?tab=applications. */
export default function AdminApplicationsRedirect() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  params.set("tab", "applications");
  return <Redirect to={`/admin?${params.toString()}`} />;
}

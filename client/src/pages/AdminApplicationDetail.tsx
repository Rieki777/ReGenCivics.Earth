import { Redirect, useRoute } from "wouter";
import { applicationHref } from "@/lib/adminNav";

/**
 * Old bookmark. Scoring now lives on the applications tab sheet
 * at /admin?tab=applications&open=:id&view=reviews.
 */
export default function AdminApplicationDetail() {
  const [, params] = useRoute("/admin/application/:id");
  const id = params?.id;
  if (!id) return <Redirect to="/admin?tab=applications" />;
  return <Redirect to={applicationHref(id)} />;
}

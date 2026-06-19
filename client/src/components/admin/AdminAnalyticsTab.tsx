import React from "react";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminEventAnalytics } from "@/components/AdminEventAnalytics";

export function AdminAnalyticsTab() {
  return (
    <div className="space-y-8">
      <AdminEventAnalytics />
      <AdminAnalytics />
    </div>
  );
}

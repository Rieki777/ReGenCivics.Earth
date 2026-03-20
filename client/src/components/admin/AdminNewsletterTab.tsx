import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Download } from "lucide-react";
import { toast } from "sonner";

function NewsletterSubscribersList() {
  // Rendered via the parent Admin.tsx NewsletterSubscribersList component
  // This wrapper keeps state in Admin.tsx per CTO instructions
  return null;
}

interface Props {
  NewsletterSubscribersListComp: React.ComponentType;
}

export function AdminNewsletterTab({ NewsletterSubscribersListComp }: Props) {
  function handleExport() {
    const subscribers = (window as any).__newsletterSubscribers || [];
    if (subscribers.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const headers = ["Email", "Source", "Subscribed Date"];
    const rows = subscribers.map((s: any) => [
      s.email,
      s.source || "website",
      new Date(s.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle
              className="text-[#1a472a] flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Mail className="w-5 h-5" />
              Newsletter Subscribers
            </CardTitle>
            <CardDescription>People who signed up to receive updates</CardDescription>
          </div>
          <Button
            variant="outline"
            className="border-[#1a472a]/30 text-[#1a472a]"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <NewsletterSubscribersListComp />
      </CardContent>
    </Card>
  );
}

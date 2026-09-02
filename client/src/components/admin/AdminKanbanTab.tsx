import { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

const AdminKanban = lazy(() => import("@/components/AdminKanban").then(m => ({ default: m.AdminKanban })));

interface Props {
  investors: any[];
  inquiries: any[];
  applications: any[];
}

export function AdminKanbanTab({ investors, inquiries, applications }: Props) {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Filter className="w-5 h-5" />
          Kanban Board
        </CardTitle>
        <CardDescription>Tap a card&apos;s status to move it.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-[#1a472a]/75">Loading board…</div>}>
          <AdminKanban
            investors={investors}
            inquiries={inquiries}
            applications={applications}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}

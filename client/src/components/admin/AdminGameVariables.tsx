/**
 * Admin Game Variables Panel
 * Full CRUD for game_variables with categories, search, inline editing, history log.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Save, RefreshCw, History } from "lucide-react";
import { toast } from "sonner";

export function AdminGameVariables() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: variables = [], refetch, isLoading } = trpc.game.listVariables.useQuery(
    selectedCategory ? { category: selectedCategory } : undefined
  );

  const updateMutation = trpc.game.updateVariable.useMutation({
    onSuccess: () => {
      toast.success("Variable updated");
      setEditingKey(null);
      refetch();
    },
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });

  const filtered = variables.filter((v: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.key?.toLowerCase().includes(q) || v.displayName?.toLowerCase().includes(q);
  });

  // Extract unique categories
  const categories = [...new Set(variables.map((v: any) => v.category))].sort();

  return (
    <Card className="bg-[#0d2818] border-[#7dd87d]/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">Game Variables</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/60">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variables..."
              className="pl-9 bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <select
            value={selectedCategory ?? ""}
            onChange={(e) => setSelectedCategory(e.target.value || undefined)}
            className="bg-white/5 border border-white/10 rounded-md px-3 text-white text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c: any) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-white/60 text-sm text-center py-8">Loading variables...</p>
        ) : filtered.length === 0 ? (
          <p className="text-white/60 text-sm text-center py-8">No variables found</p>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filtered.map((v: any) => (
              <div
                key={v.key}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{v.displayName}</span>
                    <Badge variant="outline" className="text-[10px] text-white/60 border-white/10">
                      {v.category}
                    </Badge>
                  </div>
                  <p className="text-white/55 text-xs font-mono truncate">{v.key}</p>
                </div>
                {editingKey === v.key ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 h-7 text-sm bg-white/10 border-white/20 text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateMutation.mutate({ id: v.id, value: parseFloat(editValue), reason: "Admin panel edit" });
                        }
                        if (e.key === "Escape") setEditingKey(null);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[#7dd87d]"
                      onClick={() => updateMutation.mutate({ id: v.id, value: parseFloat(editValue), reason: "Admin panel edit" })}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingKey(v.key); setEditValue(String(v.value)); }}
                    className="text-[#7dd87d] font-mono text-sm font-bold hover:underline"
                  >
                    {v.value}
                  </button>
                )}
                <span className="text-white/50 text-[10px] w-16 text-right">{v.valueType}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-white/55 text-xs mt-4 text-center">
          {filtered.length} variable{filtered.length !== 1 ? "s" : ""} shown
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * AdminBannerEditor Component
 * Admin interface for editing site banners with markdown support
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const Streamdown = lazy(() => import('streamdown').then(m => ({ default: m.Streamdown })));

interface BannerEditorProps {
  bannerKey: string;
  title: string;
}

export function AdminBannerEditor({ bannerKey, title }: BannerEditorProps) {
  const [content, setContent] = useState('');
  const [displayStartDate, setDisplayStartDate] = useState('');
  const [displayEndDate, setDisplayEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: banner, isLoading } = trpc.banners.getByKey.useQuery(
    { key: bannerKey },
    { enabled: true }
  );

  const upsertMutation = trpc.banners.upsert.useMutation({
    onSuccess: () => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  useEffect(() => {
    if (banner) {
      setContent(banner.content);
      setIsActive(banner.isActive);
      if (banner.displayStartDate) {
        setDisplayStartDate(new Date(banner.displayStartDate).toISOString().split('T')[0]);
      }
      if (banner.displayEndDate) {
        setDisplayEndDate(new Date(banner.displayEndDate).toISOString().split('T')[0]);
      }
    }
  }, [banner]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        key: bannerKey,
        title,
        content,
        isActive,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[#7dd87d]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {banner && (
          <div className="mt-2 text-sm text-gray-600">
            <p className="font-medium">Current Banner:</p>
            <div className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
              {banner.content || "(empty)"}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Banner Content (Markdown)</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter banner content with markdown support..."
                className="min-h-[150px] font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports markdown: **bold**, *italic*, [links](url), etc.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input
                  type="date"
                  value={displayStartDate}
                  onChange={(e) => setDisplayStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Input
                  type="date"
                  value={displayEndDate}
                  onChange={(e) => setDisplayEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`active-${bannerKey}`}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor={`active-${bannerKey}`} className="text-sm font-medium">
                Active
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Banner'
                )}
              </Button>

              {saveStatus === 'success' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Saved</span>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Error saving</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="bg-gradient-to-r from-[#7dd87d] via-[#4a9f4a] to-[#7dd87d] text-[#1a472a] py-6 px-4 rounded-lg">
              <div className="text-sm sm:text-base font-semibold">
                <Suspense fallback={<span>...</span>}>
                  <Streamdown>{content}</Streamdown>
                </Suspense>
              </div>
              {displayEndDate && (
                <p className="text-xs text-[#1a472a]/70 mt-3">
                  Active until {new Date(displayEndDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdminBannerEditor;

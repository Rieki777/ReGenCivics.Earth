/**
 * A campaign's visits, devices, traffic sources and conversion, for its
 * stewards. campaigns.getAnalytics checks the steward on the server; anyone
 * else sees a plain access note here.
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Calendar,
  Lock,
} from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";

// Device icon helper
function getDeviceIcon(device: string) {
  switch (device) {
    case 'mobile': return <Smartphone className="w-4 h-4" />;
    case 'tablet': return <Tablet className="w-4 h-4" />;
    default: return <Monitor className="w-4 h-4" />;
  }
}

export function CampaignAnalyticsPanel({ campaignId }: { campaignId: number }) {
  const { data: analytics, isLoading, error } = trpc.campaigns.getAnalytics.useQuery(
    { campaignId },
    { enabled: campaignId > 0, retry: false }
  );

  if (isLoading) return <TaoSpinner size={48} />;

  if (error?.data?.code === 'FORBIDDEN' || error?.data?.code === 'UNAUTHORIZED') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-[#1a472a] flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Stewards only
          </CardTitle>
          <CardDescription>Only this project's stewards can see its numbers.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (error) {
    return <p className="text-center text-red-700">{error.message || "Couldn't load the numbers. Try again."}</p>;
  }

  // Calculate max views for chart scaling
  const maxViews = analytics?.viewsByDate?.length
    ? Math.max(...analytics.viewsByDate.map(d => d.views), 1)
    : 1;

  return (
    <>
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f7f0] flex items-center justify-center">
                  <Eye className="w-5 h-5 text-[#4a7c59]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a472a]">
                    {analytics?.totalViews || 0}
                  </p>
                  <p className="text-sm text-[#4a7c59]">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e3f2fd] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#1976d2]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a472a]">
                    {analytics?.uniqueVisitors || 0}
                  </p>
                  <p className="text-sm text-[#4a7c59]">Unique Visitors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#fff3e0] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#f57c00]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a472a]">
                    {analytics?.conversion?.contributions || 0}
                  </p>
                  <p className="text-sm text-[#4a7c59]">Contributions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f3e5f5] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#7b1fa2]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a472a]">
                    {analytics?.conversion?.conversionRate || 0}%
                  </p>
                  <p className="text-sm text-[#4a7c59]">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Views Over Time Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-[#1a472a] flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Views Over Time (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.viewsByDate && analytics.viewsByDate.length > 0 ? (
                <div className="h-48 flex items-end gap-1">
                  {analytics.viewsByDate.map((day, index) => (
                    <div 
                      key={day.date} 
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${day.date}: ${day.views} views`}
                    >
                      <div 
                        className="w-full bg-[#7dd87d] rounded-t transition-all hover:bg-[#4a7c59]"
                        style={{ 
                          height: `${(day.views / maxViews) * 100}%`,
                          minHeight: day.views > 0 ? '4px' : '0'
                        }}
                      />
                      {index % 7 === 0 && (
                        <span className="text-[10px] text-[#4a7c59] transform -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-[#4a7c59]/60">
                  No view data yet. Views will appear here as visitors view your campaign.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1a472a] flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Device Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.viewsByDevice && analytics.viewsByDevice.length > 0 ? (
                <div className="space-y-3">
                  {analytics.viewsByDevice.map(({ device, views }) => {
                    const percentage = analytics.totalViews > 0 
                      ? Math.round((views / analytics.totalViews) * 100) 
                      : 0;
                    return (
                      <div key={device} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f0f7f0] flex items-center justify-center text-[#4a7c59]">
                          {getDeviceIcon(device)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-[#1a472a]">{device}</span>
                            <span className="text-[#4a7c59]">{views} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-[#f0f7f0] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#7dd87d] rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[#1a472a]/75">
                  No device data yet
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1a472a] flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Traffic Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.viewsBySource && analytics.viewsBySource.length > 0 ? (
                <div className="space-y-3">
                  {analytics.viewsBySource.slice(0, 5).map(({ source, views }) => {
                    const percentage = analytics.totalViews > 0 
                      ? Math.round((views / analytics.totalViews) * 100) 
                      : 0;
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#1a472a] truncate max-w-[150px]" title={source}>
                              {source}
                            </span>
                            <span className="text-[#4a7c59]">{views} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-[#f0f7f0] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#4a7c59] rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[#1a472a]/75">
                  No traffic source data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Conversion Funnel */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-[#1a472a] flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>
              Track how visitors convert to contributors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#f0f7f0] flex items-center justify-center mx-auto mb-2">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-[#1a472a]">
                      {analytics?.totalViews || 0}
                    </p>
                    <p className="text-xs text-[#4a7c59]">Views</p>
                  </div>
                </div>
              </div>
              
              <div className="text-[#4a7c59] text-2xl">→</div>
              
              <div className="text-center">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#fff3e0] flex items-center justify-center mx-auto mb-2">
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-[#1a472a]">
                      {analytics?.uniqueVisitors || 0}
                    </p>
                    <p className="text-xs text-[#f57c00]">Unique</p>
                  </div>
                </div>
              </div>
              
              <div className="text-[#4a7c59] text-2xl">→</div>
              
              <div className="text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#7dd87d] flex items-center justify-center mx-auto mb-2">
                  <div>
                    <p className="text-lg md:text-xl font-bold text-white">
                      {analytics?.conversion?.contributions || 0}
                    </p>
                    <p className="text-xs text-white/80">Contrib.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-4 p-4 bg-[#f0f7f0] rounded-lg">
              <p className="text-sm text-[#4a7c59]">
                <strong>{analytics?.conversion?.conversionRate || 0}%</strong> of visitors become contributors
              </p>
            </div>
          </CardContent>
        </Card>
    </>
  );
}

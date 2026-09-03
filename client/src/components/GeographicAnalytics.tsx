/**
 * Geographic Analytics Component
 * Displays geographic distribution of applications and inquiries with map visualization
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Globe, MapPin, TrendingUp } from "lucide-react";

interface GeographicData {
  country: string;
  count: number;
  percentage: number;
}

interface CityData {
  city: string;
  country: string;
  count: number;
}

interface GeographicAnalyticsProps {
  applications: any[];
  investors: any[];
  inquiries: any[];
}

const COLORS = [
  "#7dd87d", // Primary green
  "#4a7c59", // Darker green
  "#a8e6a8", // Light green
  "#2d7a2d", // Deep green
  "#c4f0c4", // Pale green
  "#1a5a1a", // Forest green
  "#d4f4d4", // Very light green
  "#0d3d0d", // Very dark green
];

export function GeographicAnalytics({ applications, investors, inquiries }: GeographicAnalyticsProps) {
  // Extract location data from all sources
  const extractLocation = (item: any): { country?: string; city?: string } => {
    // Try to extract from various location fields
    const location = item.location || item.country || item.projectLocation || "";
    
    // Simple parsing - in production, you'd use a geocoding service
    if (!location) return {};
    
    const parts = location.split(",").map((p: string) => p.trim());
    if (parts.length === 1) {
      return { country: parts[0] };
    } else if (parts.length >= 2) {
      return { city: parts[0], country: parts[parts.length - 1] };
    }
    
    return {};
  };
  
  // Aggregate country data
  const countryMap = new Map<string, number>();
  const cityMap = new Map<string, { city: string; country: string; count: number }>();
  
  [...applications, ...investors, ...inquiries].forEach((item) => {
    const { country, city } = extractLocation(item);
    
    if (country) {
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    }
    
    if (city && country) {
      const key = `${city}, ${country}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        cityMap.set(key, { city, country, count: 1 });
      }
    }
  });
  
  // Convert to array and calculate percentages
  const total = [...applications, ...investors, ...inquiries].length;
  const countryData: GeographicData[] = Array.from(countryMap.entries())
    .map(([country, count]) => ({
      country,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 countries
  
  const cityData: CityData[] = Array.from(cityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 cities
  
  // If no location data, show placeholder
  if (countryData.length === 0) {
    return (
      <Card className="border-[#4a7c59]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a472a]">
            <Globe className="w-5 h-5 text-[#4a7c59]" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Location data from applications and inquiries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="w-12 h-12 text-[#4a7c59]/30 mb-4" />
            <p className="text-[#1a472a]/80 text-sm">
              No location data available yet. Location information will appear here as applications and inquiries are submitted.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Country Distribution Pie Chart */}
      <Card className="border-[#4a7c59]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a472a]">
            <Globe className="w-5 h-5 text-[#4a7c59]" />
            Country Distribution
          </CardTitle>
          <CardDescription>
            Top {countryData.length} countries by submission count
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props) => {
                    const slice = props.payload as { country?: string; percentage?: number };
                    return `${slice.country ?? props.name} (${slice.percentage ?? 0}%)`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#f8f5f0", 
                    border: "1px solid #4a7c59", 
                    borderRadius: "8px" 
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Top Cities Bar Chart */}
      {cityData.length > 0 && (
        <Card className="border-[#4a7c59]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a472a]">
              <MapPin className="w-5 h-5 text-[#4a7c59]" />
              Top Cities
            </CardTitle>
            <CardDescription>
              Cities with the most submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a7c59" opacity={0.2} />
                  <XAxis type="number" stroke="#1a472a" />
                  <YAxis 
                    type="category" 
                    dataKey="city" 
                    width={120} 
                    stroke="#1a472a"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#f8f5f0", 
                      border: "1px solid #4a7c59", 
                      borderRadius: "8px" 
                    }}
                    formatter={(value, _name, item) => {
                      const row = item.payload as { city?: string; country?: string };
                      return [
                        `${value} submissions`,
                        `${row.city ?? ""}, ${row.country ?? ""}`,
                      ];
                    }}
                  />
                  <Bar dataKey="count" fill="#7dd87d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#4a7c59]/30 bg-gradient-to-br from-[#f0f7f0] to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#1a472a]/75">Total Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="w-8 h-8 text-[#4a7c59]" />
              <div className="text-3xl font-bold text-[#1a472a]">{countryMap.size}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#4a7c59]/30 bg-gradient-to-br from-[#f0f7f0] to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#1a472a]/75">Total Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-[#4a7c59]" />
              <div className="text-3xl font-bold text-[#1a472a]">{cityMap.size}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#4a7c59]/30 bg-gradient-to-br from-[#f0f7f0] to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#1a472a]/75">Top Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-[#4a7c59]" />
              <div>
                <div className="text-2xl font-bold text-[#1a472a]">{countryData[0]?.country || "N/A"}</div>
                <div className="text-sm text-[#1a472a]/80">{countryData[0]?.count || 0} submissions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

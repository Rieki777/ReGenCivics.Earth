import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Mail, MousePointerClick, Globe, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { GeographicAnalytics } from "@/components/GeographicAnalytics";

const COLORS = ['#7dd87d', '#4a7c59', '#d4a574', '#1a472a', '#a8d5a8'];

export function AdminAnalytics() {
  // Fetch all data for analytics
  const applications = trpc.applications.list.useQuery();
  const investors = trpc.investorInquiries.list.useQuery();
  const inquiries = trpc.generalInquiries.list.useQuery();
  const emailLogs = trpc.email.getLogs.useQuery();

  // Calculate submission trends (last 30 days)
  const getSubmissionTrends = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const trends = last30Days.map(date => {
      const appCount = applications.data?.filter((a: any) => a.createdAt?.toISOString().startsWith(date)).length || 0;
      const invCount = investors.data?.filter((i: any) => i.createdAt?.toISOString().startsWith(date)).length || 0;
      const inqCount = inquiries.data?.filter((i: any) => i.createdAt?.toISOString().startsWith(date)).length || 0;
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        applications: appCount,
        investors: invCount,
        inquiries: inqCount,
        total: appCount + invCount + inqCount,
      };
    });

    return trends;
  };

  // Calculate conversion funnel
  const getConversionFunnel = () => {
    const totalApps = applications.data?.length || 0;
    const submitted = applications.data?.filter((a: any) => a.status === 'submitted').length || 0;
    const inReview = applications.data?.filter((a: any) => a.status === 'under_review').length || 0;
    const approved = applications.data?.filter((a: any) => a.status === 'approved').length || 0;

    return [
      { stage: 'Submitted', count: totalApps, percentage: 100 },
      { stage: 'In Review', count: inReview, percentage: totalApps ? Math.round((inReview / totalApps) * 100) : 0 },
      { stage: 'Approved', count: approved, percentage: totalApps ? Math.round((approved / totalApps) * 100) : 0 },
    ];
  };

  // Calculate investor interest breakdown
  const getInvestorBreakdown = () => {
    const breakdown: Record<string, number> = {};
    
    investors.data?.forEach((inv: any) => {
      const range = inv.investmentRange || 'Not specified';
      breakdown[range] = (breakdown[range] || 0) + 1;
    });

    return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
  };

  // Calculate inquiry type distribution
  const getInquiryDistribution = () => {
    const distribution: Record<string, number> = {
      'Land Projects': applications.data?.length || 0,
      'Investors': investors.data?.length || 0,
      'Alliance': inquiries.data?.filter((i: any) => i.inquiryType === 'alliance').length || 0,
      'Live': inquiries.data?.filter((i: any) => i.inquiryType === 'live').length || 0,
      'Roles': inquiries.data?.filter((i: any) => i.inquiryType === 'role').length || 0,
      'Other': inquiries.data?.filter((i: any) => !['alliance', 'live', 'role'].includes(i.inquiryType || '')).length || 0,
    };

    return Object.entries(distribution)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  // Calculate email engagement metrics
  const getEmailMetrics = () => {
    const total = emailLogs.data?.length || 0;
    const opened = emailLogs.data?.filter((e: any) => e.openedAt).length || 0;
    const clicked = emailLogs.data?.filter((e: any) => e.clickedAt).length || 0;
    const bounced = emailLogs.data?.filter((e: any) => e.status === 'bounced').length || 0;

    return {
      total,
      opened,
      clicked,
      bounced,
      openRate: total ? Math.round((opened / total) * 100) : 0,
      clickRate: total ? Math.round((clicked / total) * 100) : 0,
      bounceRate: total ? Math.round((bounced / total) * 100) : 0,
    };
  };

  // Calculate avg response time (time from createdAt to first "contacted" note inferred from emailLogs)
  const getAvgResponseTime = () => {
    const allItems = [
      ...(inquiries.data || []),
      ...(investors.data || []),
    ];
    const responded = allItems.filter((i: any) => i.status === 'contacted' || i.status === 'in_discussion' || i.status === 'completed');
    if (!responded.length) return null;
    // Approximate: use createdAt vs now, weighted by status
    const times = responded.map((i: any) => {
      const created = new Date(i.createdAt).getTime();
      const now = Date.now();
      return (now - created) / 3_600_000; // hours
    });
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return avg < 24 ? `${Math.round(avg)}h` : `${Math.round(avg / 24)}d`;
  };

  // Email delivery breakdown for webhook monitor
  const getEmailDeliveryStats = () => {
    const logs = emailLogs.data || [];
    const byStatus: Record<string, number> = {};
    logs.forEach((l: any) => {
      const s = l.status || 'sent';
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    return Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  };

  const submissionTrends = getSubmissionTrends();
  const conversionFunnel = getConversionFunnel();
  const investorBreakdown = getInvestorBreakdown();
  const inquiryDistribution = getInquiryDistribution();
  const emailMetrics = getEmailMetrics();
  const avgResponseTime = getAvgResponseTime();
  const emailDeliveryStats = getEmailDeliveryStats();

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(applications.data?.length || 0) + (investors.data?.length || 0) + (inquiries.data?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionFunnel[2]?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Submitted to approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Open Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailMetrics.openRate}%</div>
            <p className="text-xs text-muted-foreground">{emailMetrics.opened} of {emailMetrics.total} emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailMetrics.clickRate}%</div>
            <p className="text-xs text-muted-foreground">{emailMetrics.clicked} of {emailMetrics.total} emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime || '-'}</div>
            <p className="text-xs text-muted-foreground">From submission to contact</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Trends</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={submissionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#7dd87d" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="applications" stroke="#4a7c59" name="Applications" />
                <Line type="monotone" dataKey="investors" stroke="#d4a574" name="Investors" />
                <Line type="monotone" dataKey="inquiries" stroke="#1a472a" name="Inquiries" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Application Conversion Funnel</CardTitle>
            <CardDescription>From submission to approval</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#7dd87d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Investor Interest Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Investor Interest Breakdown</CardTitle>
            <CardDescription>By investment range</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={investorBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {investorBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inquiry Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Inquiry Type Distribution</CardTitle>
            <CardDescription>All inquiry categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inquiryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {inquiryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Email Delivery Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Delivery Monitor
          </CardTitle>
          <CardDescription>
            Delivery status for all {emailMetrics.total} emails sent
            {emailMetrics.bounceRate > 5 && (
              <span className="ml-2 text-red-500 font-medium">⚠ High bounce rate ({emailMetrics.bounceRate}%)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            {[
              { icon: CheckCircle, label: 'Delivered', count: emailMetrics.total - emailMetrics.bounced, color: 'text-green-600' },
              { icon: MousePointerClick, label: 'Clicked', count: emailMetrics.clicked, color: 'text-purple-600' },
              { icon: Mail, label: 'Opened', count: emailMetrics.opened, color: 'text-blue-600' },
              { icon: XCircle, label: 'Bounced', count: emailMetrics.bounced, color: 'text-red-600' },
            ].map(({ icon: Icon, label, count, color }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border">
                <Icon className={`w-4 h-4 ${color}`} />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                </div>
              </div>
            ))}
          </div>
          {emailDeliveryStats.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={emailDeliveryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#7dd87d" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      <div className="mt-6">
        <GeographicAnalytics
          applications={applications.data || []}
          investors={investors.data || []}
          inquiries={inquiries.data || []}
        />
      </div>
    </div>
  );
}

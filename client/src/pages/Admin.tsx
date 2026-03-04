import { useState, useEffect } from "react";
import { CrowdPoolingProjectsManager } from "@/components/CrowdPoolingProjectsManager";
import { AdminCampaignApproval } from "@/components/AdminCampaignApproval";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Lock, 
  FileText, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Eye,
  Calendar,
  Mail,
  MapPin,
  Building,
  Briefcase,
  Heart,
  Sprout,
  Home as HomeIcon,
  UserCheck,
  HelpCircle,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Edit,
  Settings,
  Palette,
  Globe,
  Handshake,
  Sparkles,
  X
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { toast } from "sonner";
import { EmailTemplateSelector } from "@/components/EmailTemplateSelector";
import { RoleSubmissionsView } from "@/components/RoleSubmissionsView";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { EmailSettings } from "@/components/EmailSettings";
import { LOIManager } from "@/components/LOIManager";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { AdminBannerEditor } from "@/components/AdminBannerEditor";

const ADMIN_PASSWORD = "333";

// Path type labels and icons
const pathTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  alliance: { label: "Alliance Partners", icon: Handshake, color: "bg-purple-500" },
  create: { label: "Create with ReGens", icon: Palette, color: "bg-blue-500" },
  live: { label: "Live in a Land Project", icon: HomeIcon, color: "bg-green-500" },
  role: { label: "Role in ReGen Civics", icon: UserCheck, color: "bg-amber-500" },
  finance: { label: "Finance Regeneration", icon: TrendingUp, color: "bg-emerald-500" },
  learn: { label: "Learn & Explore", icon: Globe, color: "bg-cyan-500" },
  other: { label: "Other Inquiries", icon: HelpCircle, color: "bg-gray-500" },
};

// Password Gate Component
function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_authenticated", "true");
      onAuthenticated();
    } else {
      setError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={isShaking ? "animate-shake" : ""}
      >
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-2 border-[#7dd87d]/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a472a] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#7dd87d]" />
            </div>
            <CardTitle className="text-2xl text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              Admin Access
            </CardTitle>
            <CardDescription>
              Enter the password to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`text-center text-lg ${error ? 'border-red-500 focus:ring-red-500' : 'border-[#1a472a]/30 focus:ring-[#7dd87d]'}`}
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Stats Card Component - Now clickable with navigation
function StatsCard({ title, value, icon: Icon, color, description, onClick, linkTo }: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  description?: string;
  onClick?: () => void;
  linkTo?: string;
}) {
  const content = (
    <Card className={`bg-white border-2 border-[#1a472a]/10 hover:border-[#7dd87d]/50 transition-all ${onClick || linkTo ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm text-[#1a472a]/60 mb-1 break-words">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-[#1a472a]/50 mt-1 break-words">{description}</p>
            )}
          </div>
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${color} flex items-center justify-center flex-shrink-0 ml-2`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
        {(onClick || linkTo) && (
          <div className="mt-3 pt-3 border-t border-[#1a472a]/10 flex items-center justify-between text-xs text-[#4a7c59]">
            <span>Click to view</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return content;
}

// Reviewer Email Management Component
function ReviewerEmailManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [notifyApplications, setNotifyApplications] = useState(true);
  const [notifyInvestors, setNotifyInvestors] = useState(true);
  const [notifyInquiries, setNotifyInquiries] = useState(true);
  const [selectedInquiryTypes, setSelectedInquiryTypes] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);

  const { data: reviewers, isLoading, refetch } = trpc.reviewerEmails.list.useQuery();
  const createMutation = trpc.reviewerEmails.create.useMutation({
    onSuccess: () => {
      toast.success("Reviewer added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const deleteMutation = trpc.reviewerEmails.delete.useMutation({
    onSuccess: () => {
      toast.success("Reviewer removed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const updateMutation = trpc.reviewerEmails.update.useMutation({
    onSuccess: () => {
      toast.success("Reviewer updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setNewEmail("");
    setNewName("");
    setNotifyApplications(true);
    setNotifyInvestors(true);
    setNotifyInquiries(true);
    setSelectedInquiryTypes([]);
    setSelectedProjects([]);
    setSelectedOrganizations([]);
  };

  const handleAddReviewer = () => {
    if (!newEmail) {
      toast.error("Email is required");
      return;
    }
    createMutation.mutate({
      email: newEmail,
      name: newName || undefined,
      notifyApplications,
      notifyInvestors,
      notifyInquiries,
      inquiryTypes: selectedInquiryTypes.length > 0 ? selectedInquiryTypes : undefined,
    });
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateMutation.mutate({
      id,
      data: { isActive: !currentActive },
    });
  };

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Mail className="w-5 h-5" />
              Reviewer Emails
            </CardTitle>
            <CardDescription>
              Manage who receives notifications when applications are submitted
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]">
                <Plus className="w-4 h-4 mr-2" />
                Add Reviewer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md !grid-rows-[auto_1fr_auto] !max-h-[85vh]">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Add Reviewer Email</DialogTitle>
                <DialogDescription>
                  Add an email address to receive notifications when applications are submitted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 overflow-y-auto min-h-0 pr-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="reviewer@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Notification Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify-applications"
                        checked={notifyApplications}
                        onCheckedChange={(checked) => setNotifyApplications(checked as boolean)}
                      />
                      <Label htmlFor="notify-applications" className="text-sm font-normal">
                        Land Project Applications
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify-investors"
                        checked={notifyInvestors}
                        onCheckedChange={(checked) => setNotifyInvestors(checked as boolean)}
                      />
                      <Label htmlFor="notify-investors" className="text-sm font-normal">
                        Investor Inquiries
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify-inquiries"
                        checked={notifyInquiries}
                        onCheckedChange={(checked) => setNotifyInquiries(checked as boolean)}
                      />
                      <Label htmlFor="notify-inquiries" className="text-sm font-normal">
                        General Inquiries
                      </Label>
                    </div>
                  </div>
                </div>
                {notifyInquiries && (
                  <div className="space-y-3">
                    <Label>Specific Inquiry Types (leave empty for all)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(pathTypeConfig).map(([key, config]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`inquiry-${key}`}
                            checked={selectedInquiryTypes.includes(key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedInquiryTypes([...selectedInquiryTypes, key]);
                              } else {
                                setSelectedInquiryTypes(selectedInquiryTypes.filter(t => t !== key));
                              }
                            }}
                          />
                          <Label htmlFor={`inquiry-${key}`} className="text-xs font-normal">
                            {config.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Project Assignment */}
                <div className="space-y-3">
                  <Label>Assigned Land Projects (leave empty for all)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {landProjectsList.map((project) => (
                        <div key={project.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`project-${project.id}`}
                            checked={selectedProjects.includes(project.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProjects([...selectedProjects, project.id]);
                              } else {
                                setSelectedProjects(selectedProjects.filter(p => p !== project.id));
                              }
                            }}
                          />
                          <Label htmlFor={`project-${project.id}`} className="text-xs font-normal">
                            {project.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Organization Assignment */}
                <div className="space-y-3">
                  <Label>Assigned Alliance Organizations (leave empty for all)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {allianceOrgsList.map((org) => (
                        <div key={org.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`org-${org.id}`}
                            checked={selectedOrganizations.includes(org.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrganizations([...selectedOrganizations, org.id]);
                              } else {
                                setSelectedOrganizations(selectedOrganizations.filter(o => o !== org.id));
                              }
                            }}
                          />
                          <Label htmlFor={`org-${org.id}`} className="text-xs font-normal">
                            {org.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddReviewer}
                  disabled={createMutation.isPending}
                  className="bg-[#1a472a] hover:bg-[#2d5a3d]"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Add Reviewer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
          </div>
        ) : reviewers && reviewers.length > 0 ? (
          <div className="space-y-3">
            {reviewers.map((reviewer: any) => (
              <div 
                key={reviewer.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  reviewer.isActive ? 'bg-white border-[#1a472a]/10' : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${reviewer.isActive ? 'bg-[#7dd87d]/20' : 'bg-gray-200'} flex items-center justify-center`}>
                    <Mail className={`w-5 h-5 ${reviewer.isActive ? 'text-[#1a472a]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a472a]">
                      {reviewer.name || reviewer.email}
                    </p>
                    {reviewer.name && (
                      <p className="text-sm text-[#1a472a]/60">{reviewer.email}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reviewer.notifyApplications === 1 && (
                        <Badge variant="outline" className="text-xs">Applications</Badge>
                      )}
                      {reviewer.notifyInvestors === 1 && (
                        <Badge variant="outline" className="text-xs">Investors</Badge>
                      )}
                      {reviewer.notifyInquiries === 1 && (
                        <Badge variant="outline" className="text-xs">Inquiries</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(reviewer.id, reviewer.isActive === 1)}
                    className="text-[#1a472a]/60 hover:text-[#1a472a]"
                  >
                    {reviewer.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this reviewer?')) {
                        deleteMutation.mutate({ id: reviewer.id });
                      }
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#1a472a]/50">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No reviewer emails configured</p>
            <p className="text-sm mt-1">Add reviewers to receive notifications when applications are submitted</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Newsletter Subscribers List Component
function NewsletterSubscribersList() {
  const { data: subscribers, isLoading } = trpc.newsletter.list.useQuery();
  
  // Store subscribers in window for CSV export
  useEffect(() => {
    if (subscribers) {
      (window as any).__newsletterSubscribers = subscribers;
    }
  }, [subscribers]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
      </div>
    );
  }
  
  if (!subscribers || subscribers.length === 0) {
    return (
      <div className="text-center py-8 text-[#1a472a]/50">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No newsletter subscribers yet</p>
        <p className="text-sm mt-1">Subscribers will appear here when people sign up</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1a472a]/10">
        <p className="text-sm text-[#1a472a]/60">
          {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
        </p>
      </div>
      {subscribers.map((subscriber: any) => (
        <div 
          key={subscriber.id} 
          className="flex items-center justify-between p-3 rounded-lg bg-[#f0ebe3]/50 border border-[#1a472a]/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#1a472a]" />
            </div>
            <div>
              <p className="font-medium text-[#1a472a]">{subscriber.email}</p>
              <p className="text-xs text-[#1a472a]/50">
                Subscribed {new Date(subscriber.createdAt).toLocaleDateString()}
                {subscriber.source && ` via ${subscriber.source}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {subscriber.source || 'website'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// Land projects and alliance organizations for export filtering
const landProjectsList = [
  { id: "la_tierra", name: "La Tierra", location: "Costa Rica" },
  { id: "starseed", name: "StarSeed Village", location: "Guatemala" },
  { id: "nyx", name: "The Nyx", location: "Bali, Indonesia" },
  { id: "neighbourgood", name: "Our NeighbourGood", location: "New Zealand" },
  { id: "highland_lake", name: "Highland Lake CampUS", location: "NC, USA" },
  { id: "liminal", name: "Liminal Village", location: "Italy" },
  { id: "heartland", name: "Heartland Retreat", location: "California, USA" },
  { id: "tdf", name: "Traditional Dream Factory", location: "Portugal" },
  { id: "ubuntu", name: "Ubuntu", location: "Various" },
  { id: "finca_sagrada", name: "Finca Sagrada", location: "Latin America" },
  { id: "tabi", name: "Tabi", location: "Various" },
  { id: "tioga", name: "Tioga", location: "Various" },
  { id: "lala_gardens", name: "LaLa Gardens Cooperative", location: "Various" },
];

const allianceOrgsList = [
  { id: "hypha", name: "Hypha DAO" },
  { id: "seeds", name: "SEEDS" },
  { id: "nestr", name: "Nestr.io" },
  { id: "kinship_earth", name: "Kinship Earth" },
  { id: "open_future", name: "Open Future Coalition" },
  { id: "united_planet", name: "UP.Game (United Planet)" },
  { id: "gaia_biolab", name: "Gaia Union BioLab" },
  { id: "closer", name: "Closer.earth" },
  { id: "oasa", name: "OASA.earth" },
  { id: "planetary_party", name: "Planetary Party" },
  { id: "dao_universe", name: "DAO Universe Club" },
  { id: "desa", name: "DESA" },
  { id: "permatours", name: "Permatours" },
  { id: "maptio", name: "Maptio" },
  { id: "local_scale", name: "LocalScale" },
];

// Helper function to export inquiries to CSV
function exportToCSV(data: any[], filename: string, projectName?: string) {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  // Build CSV headers and rows
  const headers = ["Full Name", "Email", "Organization", "Message", "Status", "Date", "Selected Projects/Orgs", "Additional Details"];
  const rows = data.map((item: any) => {
    let formData: any = {};
    try {
      formData = item.formData ? JSON.parse(item.formData) : {};
    } catch (e) {
      formData = {};
    }
    
    const selectedItems = formData.selectedProjects || formData.selectedOrganizations || [];
    const additionalDetails = Object.entries(formData)
      .filter(([key]) => !['selectedProjects', 'selectedOrganizations'].includes(key))
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('; ') : value}`)
      .join(' | ');
    
    return [
      item.fullName || '',
      item.email || '',
      item.organization || '',
      (item.message || '').replace(/[\n\r]/g, ' '),
      item.status || '',
      new Date(item.createdAt).toLocaleDateString(),
      Array.isArray(selectedItems) ? selectedItems.join('; ') : selectedItems,
      additionalDetails.replace(/[\n\r]/g, ' ')
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}${projectName ? '_' + projectName : ''}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success(`Exported ${data.length} records to CSV`);
}

// Filter inquiries by specific project or organization
function filterByProject(inquiries: any[], projectId: string): any[] {
  return inquiries.filter((inquiry: any) => {
    try {
      const formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
      const selectedProjects = formData.selectedProjects || [];
      const selectedOrganizations = formData.selectedOrganizations || [];
      return selectedProjects.includes(projectId) || 
             selectedOrganizations.includes(projectId) ||
             selectedProjects.includes('all') ||
             selectedOrganizations.includes('all');
    } catch (e) {
      return false;
    }
  });
}

// Inquiry Section Component for each path type with export functionality
function InquirySection({ pathType, inquiries }: { pathType: string; inquiries: any[] }) {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [showReviewModal, setShowReviewModal] = useState<number | null>(null);
  const [currentReviewNote, setCurrentReviewNote] = useState('');
  
  const config = pathTypeConfig[pathType] || pathTypeConfig.other;
  const Icon = config.icon;
  const baseFilteredInquiries = inquiries.filter((i: any) => i.pathType === pathType);
  
  // Apply active filter
  const filteredInquiries = activeFilter 
    ? filterByProject(baseFilteredInquiries, activeFilter)
    : baseFilteredInquiries;
  
  // Determine which project list to use based on path type
  const projectList = pathType === 'live' ? landProjectsList : 
                      pathType === 'create' ? allianceOrgsList : 
                      pathType === 'alliance' ? allianceOrgsList :
                      null;
  
  // Get the name of the active filter
  const activeFilterName = activeFilter && projectList
    ? projectList.find(p => p.id === activeFilter)?.name || activeFilter
    : null;

  const handleExportAll = () => {
    exportToCSV(filteredInquiries, `${pathType}_inquiries`);
    setShowExportDropdown(false);
  };

  const handleExportByProject = (projectId: string, projectName: string) => {
    const filtered = filterByProject(filteredInquiries, projectId);
    if (filtered.length === 0) {
      toast.error(`No inquiries found for ${projectName}`);
      return;
    }
    exportToCSV(filtered, `${pathType}_inquiries`, projectName.replace(/\s+/g, '_'));
    setShowExportDropdown(false);
  };

  if (filteredInquiries.length === 0) {
    return (
      <div className="text-center py-8 text-[#1a472a]/50">
        <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No {config.label.toLowerCase()} inquiries yet</p>
      </div>
    );
  }

  // Toggle item selection
  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };
  
  // Select all items
  const selectAll = () => {
    if (selectedItems.size === filteredInquiries.length) {
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedItems(new Set(filteredInquiries.map((i: any) => i.id)));
      setShowBulkActions(true);
    }
  };
  
  // Clear filter
  const clearFilter = () => {
    setActiveFilter(null);
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  return (
    <div>
      {/* Filter & Export Controls */}
      <div className="p-4 border-b border-[#1a472a]/10 bg-[#f0ebe3]/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#1a472a]/70">
              {filteredInquiries.length} {filteredInquiries.length === 1 ? 'inquiry' : 'inquiries'}
              {activeFilterName && (
                <span className="ml-1 text-[#7dd87d]">for {activeFilterName}</span>
              )}
            </p>
            
            {/* Filter Button */}
            {projectList && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-[#1a472a]/30 text-[#1a472a] ${activeFilter ? 'bg-[#7dd87d]/20 border-[#7dd87d]' : ''}`}
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {activeFilter ? 'Filtered' : 'Filter'}
                </Button>
                
                {showFilterDropdown && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#1a472a]/10 z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <button
                        onClick={() => { clearFilter(); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${!activeFilter ? 'bg-[#7dd87d]/20 text-[#1a472a]' : 'text-[#1a472a] hover:bg-[#7dd87d]/10'}`}
                      >
                        Show All ({baseFilteredInquiries.length})
                      </button>
                      
                      <div className="border-t border-[#1a472a]/10 my-2" />
                      <p className="px-3 py-1 text-xs text-[#1a472a]/50 font-medium">
                        Filter by {pathType === 'live' ? 'Land Project' : 'Organization'}:
                      </p>
                      {projectList.map((project) => {
                        const count = filterByProject(baseFilteredInquiries, project.id).length;
                        return (
                          <button
                            key={project.id}
                            onClick={() => { setActiveFilter(project.id); setShowFilterDropdown(false); setSelectedItems(new Set()); setShowBulkActions(false); }}
                            className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${activeFilter === project.id ? 'bg-[#7dd87d]/20 text-[#1a472a]' : 'text-[#1a472a] hover:bg-[#7dd87d]/10'}`}
                            disabled={count === 0}
                          >
                            <span className={count === 0 ? 'opacity-50' : ''}>{project.name}</span>
                            <Badge variant="outline" className={`text-xs ${count === 0 ? 'opacity-50' : ''}`}>
                              {count}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="w-full text-center py-2 text-xs text-[#1a472a]/50 hover:bg-[#f0ebe3] border-t border-[#1a472a]/10"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Clear Filter Button */}
            {activeFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[#1a472a]/60 hover:text-[#1a472a]"
                onClick={clearFilter}
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filter
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 mr-2">
              <Checkbox
                checked={selectedItems.size === filteredInquiries.length && filteredInquiries.length > 0}
                onCheckedChange={selectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-xs text-[#1a472a]/60 cursor-pointer">
                Select All
              </Label>
            </div>
            
            {/* Export Button */}
            <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="border-[#7dd87d] text-[#1a472a]"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            
            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#1a472a]/10 z-50 max-h-96 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={handleExportAll}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#7dd87d]/20 text-sm font-medium text-[#1a472a]"
                  >
                    Export All ({filteredInquiries.length})
                  </button>
                  
                  {projectList && (
                    <>
                      <div className="border-t border-[#1a472a]/10 my-2" />
                      <p className="px-3 py-1 text-xs text-[#1a472a]/50 font-medium">
                        Export by {pathType === 'live' ? 'Land Project' : 'Alliance Organization'}:
                      </p>
                      {projectList.map((project) => {
                        const count = filterByProject(filteredInquiries, project.id).length;
                        return (
                          <button
                            key={project.id}
                            onClick={() => handleExportByProject(project.id, project.name)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-[#7dd87d]/20 text-sm text-[#1a472a] flex justify-between items-center"
                            disabled={count === 0}
                          >
                            <span className={count === 0 ? 'opacity-50' : ''}>{project.name}</span>
                            <Badge variant="outline" className={`text-xs ${count === 0 ? 'opacity-50' : ''}`}>
                              {count}
                            </Badge>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowExportDropdown(false)}
                  className="w-full text-center py-2 text-xs text-[#1a472a]/50 hover:bg-[#f0ebe3] border-t border-[#1a472a]/10"
                >
                  Close
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {showBulkActions && selectedItems.size > 0 && (
        <div className="p-3 bg-[#7dd87d]/20 border-b border-[#7dd87d]/30 flex items-center justify-between">
          <p className="text-sm font-medium text-[#1a472a]">
            {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/30 text-[#1a472a]"
              onClick={() => {
                toast.success(`Marked ${selectedItems.size} items as reviewed`);
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
            >
              Mark as Reviewed
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/30 text-[#1a472a]"
              onClick={() => {
                toast.success(`Archived ${selectedItems.size} items`);
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
            >
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#1a472a]/60"
              onClick={() => {
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {/* Inquiry List */}
      <div className="divide-y divide-[#1a472a]/10">
      {filteredInquiries.map((inquiry: any, currentIndex: number) => {
        // Parse form data
        let formData: any = {};
        try {
          formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
        } catch (e) {
          formData = {};
        }
        
        // Get selected projects/orgs
        const selectedProjects = formData.selectedProjects || [];
        const selectedOrgs = formData.selectedOrganizations || [];
        const roleArchetypes = formData.roleArchetypes || [];
        const contributionTypes = formData.contributionTypes || [];
        
        return (
          <Dialog key={inquiry.id}>
            <DialogTrigger asChild>
              <div className="p-4 hover:bg-[#f0ebe3]/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.has(inquiry.id)}
                      onCheckedChange={() => toggleItemSelection(inquiry.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-[#1a472a]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1a472a]">{inquiry.fullName || 'Anonymous'}</p>
                        {inquiry.location && (
                          <span className="text-xs text-[#1a472a]/50 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {inquiry.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#1a472a]/60">{inquiry.email}</p>
                      
                      {/* Show key info based on path type */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedProjects.length > 0 && selectedProjects.slice(0, 3).map((proj: string) => (
                          <Badge key={proj} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            {landProjectsList.find(p => p.id === proj)?.name || proj}
                          </Badge>
                        ))}
                        {selectedProjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{selectedProjects.length - 3} more</Badge>
                        )}
                        {selectedOrgs.length > 0 && selectedOrgs.slice(0, 3).map((org: string) => (
                          <Badge key={org} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                            {allianceOrgsList.find(o => o.id === org)?.name || org}
                          </Badge>
                        ))}
                        {selectedOrgs.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{selectedOrgs.length - 3} more</Badge>
                        )}
                        {roleArchetypes.length > 0 && roleArchetypes.map((role: string) => (
                          <Badge key={role} variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                            {role}
                          </Badge>
                        ))}
                        {contributionTypes.length > 0 && contributionTypes.map((type: string) => (
                          <Badge key={type} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            {type}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Preview of message */}
                      {(inquiry.message || formData.additionalNotes) && (
                        <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                          {inquiry.message || formData.additionalNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                      {inquiry.status}
                    </Badge>
                    <span className="text-xs text-[#1a472a]/50">
                      {new Date(inquiry.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#1a472a]/30" />
                  </div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div>
                    <span className="text-[#1a472a]">{inquiry.fullName || 'Anonymous'}</span>
                    <p className="text-sm font-normal text-[#1a472a]/60">{config.label}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Email</p>
                    <p className="text-[#1a472a]">{inquiry.email}</p>
                  </div>
                  {inquiry.location && (
                    <div>
                      <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Location</p>
                      <p className="text-[#1a472a]">{inquiry.location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Status</p>
                    <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                      {inquiry.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Submitted</p>
                    <p className="text-[#1a472a]">{new Date(inquiry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* Selected Projects/Orgs */}
                {selectedProjects.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Selected Land Projects</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProjects.map((proj: string) => (
                        <Badge key={proj} className="bg-green-100 text-green-800 border-green-200">
                          {landProjectsList.find(p => p.id === proj)?.name || proj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedOrgs.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Selected Alliance Organizations</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrgs.map((org: string) => (
                        <Badge key={org} className="bg-purple-100 text-purple-800 border-purple-200">
                          {allianceOrgsList.find(o => o.id === org)?.name || org}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {roleArchetypes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Role Archetypes</p>
                    <div className="flex flex-wrap gap-2">
                      {roleArchetypes.map((role: string) => (
                        <Badge key={role} className="bg-amber-100 text-amber-800 border-amber-200">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {contributionTypes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Contribution Types</p>
                    <div className="flex flex-wrap gap-2">
                      {contributionTypes.map((type: string) => (
                        <Badge key={type} className="bg-blue-100 text-blue-800 border-blue-200">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Alliance-specific: Organization info */}
                {(inquiry.organizationUrl || inquiry.partnershipDescription) && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-800 uppercase tracking-wide mb-2">Alliance Partnership Details</p>
                    {inquiry.organizationUrl && (
                      <div className="mb-3">
                        <p className="text-xs text-purple-600 font-medium">Organization URL</p>
                        <a 
                          href={inquiry.organizationUrl.startsWith('http') ? inquiry.organizationUrl : `https://${inquiry.organizationUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 hover:underline break-all"
                        >
                          {inquiry.organizationUrl}
                        </a>
                      </div>
                    )}
                    {inquiry.partnershipDescription && (
                      <div>
                        <p className="text-xs text-purple-600 font-medium mb-1">Partnership Vision</p>
                        <p className="text-sm text-purple-900 whitespace-pre-wrap">{inquiry.partnershipDescription}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Land Partner-specific: Project info */}
                {(inquiry.projectUrl || inquiry.projectInspiration) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-800 uppercase tracking-wide mb-2">Land Project Details</p>
                    {inquiry.projectUrl && (
                      <div className="mb-3">
                        <p className="text-xs text-green-600 font-medium">Project URL</p>
                        <a 
                          href={inquiry.projectUrl.startsWith('http') ? inquiry.projectUrl : `https://${inquiry.projectUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 hover:underline break-all"
                        >
                          {inquiry.projectUrl}
                        </a>
                      </div>
                    )}
                    {inquiry.projectInspiration && (
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Project Inspiration</p>
                        <p className="text-sm text-green-900 whitespace-pre-wrap">{inquiry.projectInspiration}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Role-specific: Pre-filled role info */}
                {formData.prefilledRole && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-2">Applied for Role</p>
                    <p className="font-semibold text-amber-900">{formData.prefilledRole.title}</p>
                    {formData.prefilledRole.circle && (
                      <p className="text-sm text-amber-700">Circle: {formData.prefilledRole.circle}</p>
                    )}
                    {formData.prefilledRole.purpose && (
                      <p className="text-sm text-amber-700 mt-1">{formData.prefilledRole.purpose}</p>
                    )}
                  </div>
                )}
                
                {/* Role Interest */}
                {inquiry.roleInterest && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Role Interest</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.roleInterest}</p>
                    </div>
                  </div>
                )}
                
                {/* Unique Contribution (Something Else path) */}
                {inquiry.uniqueContribution && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Unique Contribution</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.uniqueContribution}</p>
                    </div>
                  </div>
                )}
                
                {/* Capital Types (9 Forms of Capital) */}
                {inquiry.capitalTypes && (() => {
                  try {
                    const capitals = JSON.parse(inquiry.capitalTypes);
                    if (capitals.length > 0) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Forms of Capital to Contribute</p>
                          <div className="flex flex-wrap gap-2">
                            {capitals.map((cap: string) => (
                              <Badge key={cap} className="bg-teal-100 text-teal-800 border-teal-200 capitalize">
                                {cap.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Organizational Capital */}
                {inquiry.organizationalCapital && (() => {
                  try {
                    const orgCaps = JSON.parse(inquiry.organizationalCapital);
                    if (orgCaps.length > 0) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Organizational Capital</p>
                          <div className="flex flex-wrap gap-2">
                            {orgCaps.map((cap: string) => (
                              <Badge key={cap} className="bg-indigo-100 text-indigo-800 border-indigo-200 capitalize">
                                {cap.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Alliance Support Categories */}
                {inquiry.allianceSupportCategories && (() => {
                  try {
                    const categories = JSON.parse(inquiry.allianceSupportCategories);
                    if (categories.length > 0) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Alliance Support Categories</p>
                          <div className="flex flex-wrap gap-2">
                            {categories.map((cat: string) => (
                              <Badge key={cat} className="bg-violet-100 text-violet-800 border-violet-200 capitalize">
                                {cat.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Alliance Support Description */}
                {inquiry.allianceSupportDescription && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">How Alliance Supports Land Projects</p>
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                      <p className="text-violet-900 whitespace-pre-wrap">{inquiry.allianceSupportDescription}</p>
                    </div>
                  </div>
                )}
                
                {/* Other Alliance Support */}
                {inquiry.otherAllianceSupport && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Other Support Category</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.otherAllianceSupport}</p>
                    </div>
                  </div>
                )}
                
                {/* Value Contribution */}
                {inquiry.valueContribution && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Value Contribution</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-emerald-900 whitespace-pre-wrap">{inquiry.valueContribution}</p>
                    </div>
                  </div>
                )}
                
                {/* Why Ideal Fit */}
                {inquiry.whyIdealFit && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Why They Would Be an Ideal Fit</p>
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                      <p className="text-sky-900 whitespace-pre-wrap">{inquiry.whyIdealFit}</p>
                    </div>
                  </div>
                )}
                
                {/* Message/Notes */}
                {(inquiry.message || formData.additionalNotes) && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Message</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message || formData.additionalNotes}</p>
                    </div>
                  </div>
                )}
                
                {/* All Form Data */}
                {Object.keys(formData).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">All Form Data</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-[#1a472a]/70">
                        {JSON.stringify(formData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Review Notes Section */}
                <div className="border-t border-[#1a472a]/10 pt-4">
                  <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Review Notes</p>
                  <Textarea
                    placeholder="Add notes about this inquiry (e.g., follow-up actions, observations, decisions)..."
                    value={reviewNotes[inquiry.id] || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewNotes(prev => ({ ...prev, [inquiry.id]: e.target.value }))}
                    className="min-h-[80px] bg-white border-[#1a472a]/20"
                  />
                </div>
              </div>
              
              <DialogFooter className="flex-col gap-3">
                {/* Navigation indicator */}
                <div className="w-full flex items-center justify-between text-xs text-[#1a472a]/50">
                  <span>Inquiry {currentIndex + 1} of {filteredInquiries.length}</span>
                  <div className="flex gap-2">
                    {currentIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.preventDefault();
                          // Navigate to previous inquiry by closing this dialog and opening the previous one
                          const prevInquiry = filteredInquiries[currentIndex - 1];
                          if (prevInquiry) {
                            // Store the target and trigger navigation
                            (window as any).__navigateToInquiry = prevInquiry.id;
                            toast.info(`Navigate to previous inquiry`);
                          }
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    {currentIndex < filteredInquiries.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.preventDefault();
                          const nextInquiry = filteredInquiries[currentIndex + 1];
                          if (nextInquiry) {
                            (window as any).__navigateToInquiry = nextInquiry.id;
                            toast.info(`Navigate to next inquiry`);
                          }
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <EmailTemplateSelector
                      recipientEmail={inquiry.email}
                      recipientName={inquiry.fullName || ''}
                      contextSubject={config.label}
                      className="w-full"
                    />
                  </div>
                  <Button 
                    className="bg-[#1a472a] hover:bg-[#2d5a3d] flex-1"
                    onClick={() => {
                      const note = reviewNotes[inquiry.id] || '';
                      toast.success(`Marked as reviewed${note ? ' with notes' : ''}`);
                      // If there's a next inquiry, navigate to it
                      if (currentIndex < filteredInquiries.length - 1) {
                        const nextInquiry = filteredInquiries[currentIndex + 1];
                        toast.info(`Moving to next inquiry: ${nextInquiry.fullName || 'Anonymous'}`, { duration: 2000 });
                      }
                    }}
                  >
                    Mark as Reviewed
                    {currentIndex < filteredInquiries.length - 1 && (
                      <ChevronRight className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })}
      </div>
    </div>
  );
}

// Main Admin Dashboard
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all data
  const { data: applications, isLoading: loadingApps } = trpc.applications.list.useQuery();
  const { data: investors, isLoading: loadingInvestors } = trpc.investorInquiries.list.useQuery();
  const { data: inquiries, isLoading: loadingInquiries } = trpc.generalInquiries.list.useQuery();

  const isLoading = loadingApps || loadingInvestors || loadingInquiries;

  // Calculate stats
  const stats = {
    totalApplications: applications?.length || 0,
    totalInvestors: investors?.length || 0,
    totalInquiries: inquiries?.length || 0,
    pendingReview: (applications?.filter((a: any) => a.status === 'pending').length || 0) +
                   (investors?.filter((i: any) => i.status === 'pending').length || 0) +
                   (inquiries?.filter((i: any) => i.status === 'pending' || i.status === 'new').length || 0),
  };

  // Group inquiries by path type
  const inquiriesByPath = inquiries?.reduce((acc: Record<string, number>, inquiry: any) => {
    const path = inquiry.pathType || 'other';
    acc[path] = (acc[path] || 0) + 1;
    return acc;
  }, {}) || {};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#7dd87d] animate-spin mx-auto mb-4" />
          <p className="text-[#1a472a]/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3]">
      {/* Header */}
      <div className="bg-[#1a472a] text-white py-4 md:py-8">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <img src="https://assets.regencivics.earth/MlOLFSvIBeiOvIFd.png" alt="ReGen Civics" className="w-10 h-10 md:w-12 md:h-12 object-contain flex-shrink-0" loading="lazy"
              />
              <div>
                <h1 className="text-xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  Admin Dashboard
                </h1>
                <p className="text-white/70 text-sm md:text-base">Manage applications, investors, and inquiries</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <Link href="/admin/applications">
                <Button variant="outline" size="sm" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/20 text-xs md:text-sm">
                  <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Application </span>Reviews
                </Button>
              </Link>
              <Link href="/admin/moderation">
                <Button variant="outline" size="sm" className="border-[#d4a574] text-[#d4a574] hover:bg-[#d4a574]/20 text-xs md:text-sm">
                  <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Forum </span>Moderation
                </Button>
              </Link>
              <Button 
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 text-xs md:text-sm"
                onClick={() => {
                  localStorage.removeItem("admin_authenticated");
                  window.location.reload();
                }}
              >
                <Lock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Logout
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 text-xs md:text-sm">
                  <HomeIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Back to Site</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <StatsCard 
            title="Project Applications" 
            value={stats.totalApplications} 
            icon={Sprout} 
            color="bg-[#4a7c59]"
            description="Land project submissions"
            onClick={() => {
              setActiveTab("applications");
              // Scroll to tabs on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
          <StatsCard 
            title="Investor Inquiries" 
            value={stats.totalInvestors} 
            icon={TrendingUp} 
            color="bg-amber-500"
            description="Investment interest forms"
            onClick={() => {
              setActiveTab("investors");
              // Scroll to tabs on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
          <StatsCard 
            title="General Inquiries" 
            value={stats.totalInquiries} 
            icon={MessageSquare} 
            color="bg-[#7dd87d]"
            description="Connect form submissions"
            onClick={() => {
              setActiveTab("live");
              // Scroll to tabs on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
          <StatsCard 
            title="Pending Review" 
            value={stats.pendingReview} 
            icon={Eye} 
            color="bg-[#1a472a]"
            description="Awaiting response"
            linkTo="/admin/applications"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border-2 border-[#1a472a]/10 p-1 flex flex-wrap h-auto gap-1 overflow-x-auto max-w-full">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="applications" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Sprout className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Projects</span> ({stats.totalApplications})
            </TabsTrigger>
            <TabsTrigger 
              value="investors" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Investors</span> ({stats.totalInvestors})
            </TabsTrigger>
            <TabsTrigger 
              value="loi" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">LOIs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="alliance" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Handshake className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Alliance</span> ({inquiriesByPath.alliance || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Palette className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Create</span> ({inquiriesByPath.create || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="live" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <HomeIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Live</span> ({inquiriesByPath.live || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="role" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <UserCheck className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Roles</span> ({inquiriesByPath.role || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="other" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <HelpCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Other</span> ({(inquiriesByPath.other || 0) + (inquiriesByPath.learn || 0) + (inquiriesByPath.finance || 0)})
            </TabsTrigger>
            <TabsTrigger 
              value="crowdpooling" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Crowd Pooling</span>
            </TabsTrigger>
            <TabsTrigger 
              value="newsletter" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Mail className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Newsletter</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="banners" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Banners</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Analytics Charts Row */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Submissions Over Time */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      Submissions This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const now = new Date();
                        const thisMonth = now.getMonth();
                        const thisYear = now.getFullYear();
                        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
                        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
                        
                        const thisMonthApps = applications?.filter((a: any) => {
                          const d = new Date(a.submittedAt || a.createdAt);
                          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                        }).length || 0;
                        
                        const lastMonthApps = applications?.filter((a: any) => {
                          const d = new Date(a.submittedAt || a.createdAt);
                          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
                        }).length || 0;
                        
                        const thisMonthInvestors = investors?.filter((i: any) => {
                          const d = new Date(i.createdAt);
                          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                        }).length || 0;
                        
                        const thisMonthInquiries = inquiries?.filter((i: any) => {
                          const d = new Date(i.createdAt);
                          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                        }).length || 0;
                        
                        const appChange = lastMonthApps > 0 ? Math.round(((thisMonthApps - lastMonthApps) / lastMonthApps) * 100) : 0;
                        
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70">Applications</span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-[#1a472a]">{thisMonthApps}</span>
                                {appChange !== 0 && (
                                  <span className={`text-xs ${appChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {appChange > 0 ? '+' : ''}{appChange}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70">Investors</span>
                              <span className="text-lg font-bold text-[#1a472a]">{thisMonthInvestors}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70">Inquiries</span>
                              <span className="text-lg font-bold text-[#1a472a]">{thisMonthInquiries}</span>
                            </div>
                            <div className="pt-2 border-t border-[#1a472a]/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[#1a472a]">Total</span>
                                <span className="text-xl font-bold text-[#7dd87d]">{thisMonthApps + thisMonthInvestors + thisMonthInquiries}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Conversion Funnel */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const pending = (applications?.filter((a: any) => a.status === 'pending').length || 0) +
                                        (investors?.filter((i: any) => i.status === 'pending').length || 0) +
                                        (inquiries?.filter((i: any) => i.status === 'pending' || i.status === 'new').length || 0);
                        const reviewed = (applications?.filter((a: any) => a.status === 'reviewed' || a.status === 'in_review').length || 0) +
                                        (investors?.filter((i: any) => i.status === 'reviewed' || i.status === 'contacted').length || 0) +
                                        (inquiries?.filter((i: any) => i.status === 'reviewed' || i.status === 'contacted').length || 0);
                        const total = stats.totalApplications + stats.totalInvestors + stats.totalInquiries;
                        const reviewRate = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                        
                        return (
                          <>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#1a472a]/70">Pending Review</span>
                                <span className="font-medium text-yellow-600">{pending}</span>
                              </div>
                              <div className="w-full bg-[#f0ebe3] rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%` }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#1a472a]/70">Reviewed/Contacted</span>
                                <span className="font-medium text-green-600">{reviewed}</span>
                              </div>
                              <div className="w-full bg-[#f0ebe3] rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${reviewRate}%` }} />
                              </div>
                            </div>
                            <div className="pt-2 border-t border-[#1a472a]/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[#1a472a]/70">Review Rate</span>
                                <span className="text-lg font-bold text-[#1a472a]">{reviewRate}%</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Top Interests */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      Top Interests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        // Count project interests
                        const projectCounts: Record<string, number> = {};
                        inquiries?.forEach((inquiry: any) => {
                          try {
                            const formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
                            const projects = formData.selectedProjects || [];
                            projects.forEach((p: string) => {
                              projectCounts[p] = (projectCounts[p] || 0) + 1;
                            });
                          } catch (e) {}
                        });
                        
                        const sorted = Object.entries(projectCounts)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5);
                        
                        if (sorted.length === 0) {
                          return <p className="text-sm text-[#1a472a]/50">No project interests yet</p>;
                        }
                        
                        return sorted.map(([projectId, count]) => {
                          const project = landProjectsList.find(p => p.id === projectId);
                          return (
                            <div key={projectId} className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70 truncate max-w-[150px]">
                                {project?.name || projectId}
                              </span>
                              <Badge variant="outline" className="text-xs">{count}</Badge>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Impact Stats - Acres and Families */}
              <Card className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                    Impact Stats (All Projects Applied)
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Aggregate data from all land project applications - ready for homepage display
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      // Calculate total acres and families from all applications
                      let totalAcres = 0;
                      let totalFamilies = 0;
                      let totalHumans = 0;
                      let projectCount = applications?.length || 0;
                      
                      applications?.forEach((app: any) => {
                        // Parse acreage - handle various formats
                        const acreage = app.acreage || app.landSize || '';
                        const acreMatch = String(acreage).match(/([\d,]+\.?\d*)/)
                        if (acreMatch) {
                          totalAcres += parseFloat(acreMatch[1].replace(/,/g, ''));
                        }
                        
                        // Parse families/humans
                        const families = app.familyCount || app.householdCount || app.families || 0;
                        const humans = app.memberCount || app.humanCount || app.people || 0;
                        
                        if (typeof families === 'number') totalFamilies += families;
                        else if (typeof families === 'string') {
                          const famMatch = families.match(/([\d,]+)/);
                          if (famMatch) totalFamilies += parseInt(famMatch[1].replace(/,/g, ''));
                        }
                        
                        if (typeof humans === 'number') totalHumans += humans;
                        else if (typeof humans === 'string') {
                          const humMatch = humans.match(/([\d,]+)/);
                          if (humMatch) totalHumans += parseInt(humMatch[1].replace(/,/g, ''));
                        }
                      });
                      
                      return (
                        <>
                          <div className="bg-white/10 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#7dd87d]">{projectCount}</p>
                            <p className="text-white/70 text-sm">Projects Applied</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#7dd87d]">{totalAcres.toLocaleString()}</p>
                            <p className="text-white/70 text-sm">Total Acres</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#7dd87d]">{totalFamilies.toLocaleString()}</p>
                            <p className="text-white/70 text-sm">Families</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#7dd87d]">{totalHumans.toLocaleString()}</p>
                            <p className="text-white/70 text-sm">Humans</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-white/50 text-xs mt-4 text-center">
                    Note: These stats can be displayed on the homepage. Data is extracted from application forms.
                  </p>
                </CardContent>
              </Card>
              
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Applications */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader>
                    <CardTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                      Recent Project Applications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {applications && applications.length > 0 ? (
                      <div className="divide-y divide-[#1a472a]/10">
                        {applications.slice(0, 5).map((app: any) => (
                          <div key={app.id} className="p-4 hover:bg-[#f0ebe3]/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#1a472a]">{app.projectName}</p>
                                <p className="text-sm text-[#1a472a]/60">{app.location}</p>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                                {app.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[#1a472a]/50">
                        <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No applications yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inquiry Summary by Type */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader>
                    <CardTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                      Inquiries by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(pathTypeConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        const count = inquiriesByPath[key] || 0;
                        return (
                          <div 
                            key={key} 
                            className="p-4 rounded-lg bg-[#f0ebe3] hover:bg-[#e8e3db] transition-colors cursor-pointer"
                            onClick={() => setActiveTab(key === 'finance' || key === 'learn' ? 'other' : key)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-[#1a472a]">{count}</p>
                                <p className="text-xs text-[#1a472a]/60">{config.label}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Project Applications Tab */}
          <TabsContent value="applications">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                  Project Applications
                </CardTitle>
                <CardDescription>
                  Land project applications for Season 2
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {applications && applications.length > 0 ? (
                  <div className="divide-y divide-[#1a472a]/10">
                    {applications.map((app: any) => (
                      <Dialog key={app.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                                  <Sprout className="w-5 h-5 text-[#1a472a]" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1a472a]">{app.projectName}</p>
                                  <p className="text-sm text-[#1a472a]/60">{app.location}</p>
                                  
                                  {/* Project Metrics - Key Stats */}
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {app.projectSizeHectares && (
                                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                                        {app.projectSizeHectares} ha ({(app.projectSizeHectares * 2.471).toFixed(0)} acres)
                                      </Badge>
                                    )}
                                    {(app.currentPeopleCount || app.intendedPeopleCount) && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                        {app.currentPeopleCount || 0} → {app.intendedPeopleCount || '?'} people
                                      </Badge>
                                    )}
                                    {(app.currentHouseholdCount || app.intendedHouseholdCount) && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                                        {app.currentHouseholdCount || 0} → {app.intendedHouseholdCount || '?'} households
                                      </Badge>
                                    )}
                                    {app.mixedUse && (() => {
                                      try {
                                        const uses = JSON.parse(app.mixedUse);
                                        return uses.length > 0 && (
                                          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 capitalize">
                                            {uses.slice(0, 2).join(', ')}{uses.length > 2 ? ` +${uses.length - 2}` : ''}
                                          </Badge>
                                        );
                                      } catch { return null; }
                                    })()}
                                  </div>
                                  
                                  {app.vision && (
                                    <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                      {app.vision}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${app.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : app.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} border`}>
                                  {app.status}
                                </Badge>
                                <span className="text-xs text-[#1a472a]/50">
                                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Draft'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                              {app.projectName}
                            </DialogTitle>
                            <DialogDescription>{app.location}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {app.projectSizeHectares && (
                                <div className="bg-green-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-green-700">{app.projectSizeHectares}</p>
                                  <p className="text-xs text-green-600">Hectares ({(app.projectSizeHectares * 2.471).toFixed(0)} acres)</p>
                                </div>
                              )}
                              {app.currentPeopleCount !== null && (
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-blue-700">{app.currentPeopleCount}</p>
                                  <p className="text-xs text-blue-600">Current People</p>
                                </div>
                              )}
                              {app.intendedPeopleCount !== null && (
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-blue-700">{app.intendedPeopleCount}</p>
                                  <p className="text-xs text-blue-600">Target People</p>
                                </div>
                              )}
                              {app.teamSize && (
                                <div className="bg-purple-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-purple-700">{app.teamSize}</p>
                                  <p className="text-xs text-purple-600">Core Team</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Mixed Use */}
                            {app.mixedUse && (() => {
                              try {
                                const uses = JSON.parse(app.mixedUse);
                                return uses.length > 0 && (
                                  <div>
                                    <Label className="text-sm font-semibold text-[#1a472a]">Land Use Types</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {uses.map((use: string) => (
                                        <Badge key={use} className="bg-amber-100 text-amber-800 capitalize">{use}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                );
                              } catch { return null; }
                            })()}
                            
                            {/* Vision */}
                            {app.vision && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Vision</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.vision}</p>
                              </div>
                            )}
                            
                            {/* Land Status */}
                            {app.landStatus && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Land Status</Label>
                                <Badge variant="outline" className="ml-2 capitalize">{app.landStatus}</Badge>
                              </div>
                            )}
                            
                            {/* Team Description */}
                            {app.teamDescription && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Team Description</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.teamDescription}</p>
                              </div>
                            )}
                            
                            {/* Regenerative Practices */}
                            {app.regenerativePractices && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Regenerative Practices</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.regenerativePractices}</p>
                              </div>
                            )}
                            
                            {/* Governance */}
                            {app.governanceApproach && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Governance Approach</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.governanceApproach}</p>
                              </div>
                            )}
                            
                            {/* Funding */}
                            {(app.currentFunding || app.fundingNeeds) && (
                              <div className="grid grid-cols-2 gap-4">
                                {app.currentFunding && (
                                  <div>
                                    <Label className="text-sm font-semibold text-[#1a472a]">Current Funding</Label>
                                    <p className="text-sm text-[#1a472a]/80 mt-1">{app.currentFunding}</p>
                                  </div>
                                )}
                                {app.fundingNeeds && (
                                  <div>
                                    <Label className="text-sm font-semibold text-[#1a472a]">Funding Needs</Label>
                                    <p className="text-sm text-[#1a472a]/80 mt-1">{app.fundingNeeds}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Links */}
                            {(app.websiteUrl || app.videoUrl) && (
                              <div className="flex gap-4">
                                {app.websiteUrl && (
                                  <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1">
                                    <Globe className="w-4 h-4" /> Website
                                  </a>
                                )}
                                {app.videoUrl && (
                                  <a href={app.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-4 h-4" /> Video
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {/* Default Acceptance Message Template */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <p className="text-xs font-medium text-green-800 uppercase tracking-wide mb-2">Default Acceptance Message Template</p>
                              <p className="text-sm text-green-900 leading-relaxed">
                                Congratulations! Your project has passed our first quality check. Participation in the season is dependent on the community governance process. However, since you meet our criteria, we highly encourage you to follow along the journey regardless of whether you're selected. If you complete all the steps, you may still be eligible for joining the alliance!
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 border-green-300 text-green-700 hover:bg-green-100"
                                onClick={() => {
                                  navigator.clipboard.writeText("Congratulations! Your project has passed our first quality check. Participation in the season is dependent on the community governance process. However, since you meet our criteria, we highly encourage you to follow along the journey regardless of whether you're selected. If you complete all the steps, you may still be eligible for joining the alliance!");
                                  toast.success('Acceptance message copied to clipboard');
                                }}
                              >
                                Copy Message
                              </Button>
                            </div>
                          </div>
                          <DialogFooter className="flex-col sm:flex-row gap-2">
                            <EmailTemplateSelector
                              recipientEmail={app.contactEmail || ''}
                              recipientName={app.contactName || ''}
                              contextSubject={app.projectName}
                              className="w-full sm:w-auto"
                            />
                            <Link href={`/admin/applications?project=${app.id}`}>
                              <Button className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:w-auto">
                                <FileText className="w-4 h-4 mr-2" />
                                Review Project
                              </Button>
                            </Link>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#1a472a]/50">
                    <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No project applications yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investor Inquiries Tab */}
          <TabsContent value="investors">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                  Investor Inquiries
                </CardTitle>
                <CardDescription>
                  Investment interest submissions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {investors && investors.length > 0 ? (
                  <div className="divide-y divide-[#1a472a]/10">
                    {investors.map((investor: any) => (
                      <Dialog key={investor.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                  <TrendingUp className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1a472a]">{investor.fullName}</p>
                                  <p className="text-sm text-[#1a472a]/60">{investor.email}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {investor.investmentRange && (
                                      <Badge variant="outline" className="text-xs">
                                        {investor.investmentRange}
                                      </Badge>
                                    )}
                                    {investor.investorType && (
                                      <Badge variant="outline" className="text-xs">
                                        {investor.investorType}
                                      </Badge>
                                    )}
                                  </div>
                                  {investor.motivation && (
                                    <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                      {investor.motivation}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${investor.status === 'pending' || investor.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                                  {investor.status}
                                </Badge>
                                <span className="text-xs text-[#1a472a]/50">
                                  {new Date(investor.createdAt).toLocaleDateString()}
                                </span>
                                <ChevronRight className="w-4 h-4 text-[#1a472a]/30" />
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <span className="text-[#1a472a]">{investor.fullName}</span>
                                <p className="text-sm font-normal text-[#1a472a]/60">Investor Inquiry</p>
                              </div>
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Email</p>
                                <p className="text-[#1a472a]">{investor.email}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Status</p>
                                <Badge className={`${investor.status === 'pending' || investor.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                                  {investor.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Submitted</p>
                                <p className="text-[#1a472a]">{new Date(investor.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            
                            {/* Investment Details */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-3">Investment Details</p>
                              <div className="grid grid-cols-2 gap-4">
                                {investor.investmentRange && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Investment Range</p>
                                    <p className="text-amber-900 font-semibold">{investor.investmentRange}</p>
                                  </div>
                                )}
                                {investor.investorType && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Investor Type</p>
                                    <p className="text-amber-900 font-semibold capitalize">{investor.investorType?.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                                {investor.timeline && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Timeline</p>
                                    <p className="text-amber-900 font-semibold capitalize">{investor.timeline?.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                                {investor.accreditedStatus && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Accredited Status</p>
                                    <p className="text-amber-900 font-semibold capitalize">{investor.accreditedStatus?.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Primary Interest */}
                            {investor.primaryInterest && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Primary Interest</p>
                                <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">
                                  {investor.primaryInterest?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Motivation */}
                            {investor.motivation && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Motivation</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{investor.motivation}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Experience */}
                            {investor.experience && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Investment Experience</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{investor.experience}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Questions */}
                            {investor.questions && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Questions</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{investor.questions}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* How They Heard */}
                            {investor.howHeard && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">How They Heard About Us</p>
                                <p className="text-[#1a472a]">{investor.howHeard}</p>
                              </div>
                            )}
                          </div>
                          
                          <DialogFooter className="flex-col sm:flex-row gap-2">
                            <EmailTemplateSelector
                              recipientEmail={investor.email}
                              recipientName={investor.fullName}
                              contextSubject="Investment Inquiry"
                              className="w-full sm:w-auto"
                            />
                            <Button className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:w-auto">
                              Mark as Reviewed
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#1a472a]/50">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No investor inquiries yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alliance Partners Tab */}
          <TabsContent value="alliance">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Handshake className="w-5 h-5" />
                  Alliance Partner Inquiries
                </CardTitle>
                <CardDescription>
                  Organizations interested in joining the ReGen Civics Alliance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InquirySection pathType="alliance" inquiries={inquiries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create with ReGens Tab */}
          <TabsContent value="create">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Palette className="w-5 h-5" />
                  Create with ReGens Inquiries
                </CardTitle>
                <CardDescription>
                  People interested in collaborating on regenerative projects
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InquirySection pathType="create" inquiries={inquiries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live in Land Project Tab */}
          <TabsContent value="live">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <HomeIcon className="w-5 h-5" />
                  Live in a Land Project Inquiries
                </CardTitle>
                <CardDescription>
                  People interested in living in regenerative communities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InquirySection pathType="live" inquiries={inquiries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role in ReGen Civics Tab */}
          <TabsContent value="role">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <UserCheck className="w-5 h-5" />
                  Role Applications
                </CardTitle>
                <CardDescription>
                  Enhanced view for exploring and managing role submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleSubmissionsView />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Inquiries Tab */}
          <TabsContent value="other">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <HelpCircle className="w-5 h-5" />
                  Other Inquiries
                </CardTitle>
                <CardDescription>
                  Finance, Learn, and other general inquiries
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#1a472a]/10">
                  {inquiries?.filter((i: any) => ['other', 'learn', 'finance'].includes(i.pathType)).map((inquiry: any) => {
                    const config = pathTypeConfig[inquiry.pathType] || pathTypeConfig.other;
                    const Icon = config.icon;
                    return (
                      <Dialog key={inquiry.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                                  <Icon className="w-5 h-5 text-[#1a472a]" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1a472a]">{inquiry.fullName}</p>
                                  <p className="text-sm text-[#1a472a]/60">{inquiry.email}</p>
                                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                                    {inquiry.pathType?.replace(/_/g, ' ') || 'General'}
                                  </Badge>
                                  {inquiry.message && (
                                    <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                      {inquiry.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                                  {inquiry.status}
                                </Badge>
                                <span className="text-xs text-[#1a472a]/50">
                                  {new Date(inquiry.createdAt).toLocaleDateString()}
                                </span>
                                <ChevronRight className="w-4 h-4 text-[#1a472a]/30" />
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-[#1a472a]" />
                              </div>
                              <div>
                                <span className="text-[#1a472a]">{inquiry.fullName}</span>
                                <p className="text-sm font-normal text-[#1a472a]/60 capitalize">{inquiry.pathType?.replace(/_/g, ' ') || 'General'} Inquiry</p>
                              </div>
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Email</p>
                                <p className="text-[#1a472a]">{inquiry.email}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Status</p>
                                <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                                  {inquiry.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Submitted</p>
                                <p className="text-[#1a472a]">{new Date(inquiry.createdAt).toLocaleString()}</p>
                              </div>
                              {inquiry.location && (
                                <div>
                                  <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Location</p>
                                  <p className="text-[#1a472a]">{inquiry.location}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Message */}
                            {inquiry.message && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Message</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <DialogFooter className="flex-col sm:flex-row gap-2">
                            <EmailTemplateSelector
                              recipientEmail={inquiry.email}
                              recipientName={inquiry.fullName || ''}
                              contextSubject="General Inquiry"
                              className="w-full sm:w-auto"
                            />
                            <Button className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:w-auto">
                              Mark as Reviewed
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                  {(!inquiries || inquiries.filter((i: any) => ['other', 'learn', 'finance'].includes(i.pathType)).length === 0) && (
                    <div className="p-8 text-center text-[#1a472a]/50">
                      <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No other inquiries yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crowd Pooling Projects Tab */}
          <TabsContent value="crowdpooling">
            <div className="space-y-6">
              <AdminCampaignApproval />
              <CrowdPoolingProjectsManager />
            </div>
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                      <Mail className="w-5 h-5" />
                      Newsletter Subscribers
                    </CardTitle>
                    <CardDescription>
                      People who signed up to receive updates
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    className="border-[#1a472a]/30 text-[#1a472a]"
                    onClick={() => {
                      // Export newsletter subscribers as CSV
                      const subscribers = (window as any).__newsletterSubscribers || [];
                      if (subscribers.length === 0) {
                        toast.error('No subscribers to export');
                        return;
                      }
                      const headers = ['Email', 'Source', 'Subscribed Date'];
                      const rows = subscribers.map((s: any) => [
                        s.email,
                        s.source || 'website',
                        new Date(s.createdAt).toLocaleDateString()
                      ]);
                      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('CSV downloaded');
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <NewsletterSubscribersList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              <AdminAnalytics />
            </div>
          </TabsContent>

          {/* LOI Tab */}
          <TabsContent value="loi">
            <LOIManager />
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners">
            <div className="space-y-6">
              <AdminBannerEditor bannerKey="main-banner" title="Main Banner" />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <NotificationPreferences />
              <ReviewerEmailManager />
              <EmailSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Main Export with Password Protection
export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard />;
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, MapPin, TrendingUp, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export function CrowdPoolingProjectsManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    projectName: '',
    location: '',
    projectDescription: '',
    targetAmount: '',
    targetCurrency: 'USD',
    currentAmount: '0',
    contributorCount: '0',
    status: 'active' as 'upcoming' | 'active' | 'completed' | 'paused',
  });

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.crowdPoolingProjects.list.useQuery();
  const createMutation = trpc.crowdPoolingProjects.create.useMutation({
    onSuccess: () => {
      utils.crowdPoolingProjects.list.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const updateMutation = trpc.crowdPoolingProjects.update.useMutation({
    onSuccess: () => {
      utils.crowdPoolingProjects.list.invalidate();
      setEditingProject(null);
      resetForm();
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });

  const deleteMutation = trpc.crowdPoolingProjects.delete.useMutation({
    onSuccess: () => {
      utils.crowdPoolingProjects.list.invalidate();
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      projectName: '',
      location: '',
      projectDescription: '',
      targetAmount: '',
      targetCurrency: 'USD',
      currentAmount: '0',
      contributorCount: '0',
      status: 'active',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData = {
      projectName: formData.projectName,
      location: formData.location,
      projectDescription: formData.projectDescription,
      targetAmount: parseFloat(formData.targetAmount),
      targetCurrency: formData.targetCurrency,
      currentAmount: parseFloat(formData.currentAmount),
      contributorCount: parseInt(formData.contributorCount),
      status: formData.status,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, ...projectData });
    } else {
      createMutation.mutate(projectData);
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      projectName: project.projectName,
      location: project.location || '',
      projectDescription: project.projectDescription || '',
      targetAmount: project.targetAmount.toString(),
      targetCurrency: project.targetCurrency,
      currentAmount: project.currentAmount.toString(),
      contributorCount: project.contributorCount.toString(),
      status: project.status,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate({ id });
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Users className="w-5 h-5" />
              Crowd Pooling Projects
            </CardTitle>
            <CardDescription>
              Manage projects currently raising capital through crowd pooling
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen || !!editingProject} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setEditingProject(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project details' : 'Create a new crowd pooling project'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      required
                      placeholder="e.g., Harmony Valley Ecovillage"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                      placeholder="e.g., Oregon, USA"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="projectDescription">Description</Label>
                    <Textarea
                      id="projectDescription"
                      value={formData.projectDescription}
                      onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                      placeholder="Brief description of the project..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetCurrency">Currency *</Label>
                    <Select
                      value={formData.targetCurrency}
                      onValueChange={(value) => setFormData({ ...formData, targetCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="targetAmount">Target Amount *</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      required
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentAmount">Current Amount</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contributorCount">Contributors</Label>
                    <Input
                      id="contributorCount"
                      type="number"
                      value={formData.contributorCount}
                      onChange={(e) => setFormData({ ...formData, contributorCount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingProject(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingProject ? 'Update' : 'Create'} Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1a472a]" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-12 text-[#1a472a]/80">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No projects yet. Add your first crowd pooling project.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const progress = (project.currentAmount / project.targetAmount) * 100;
              return (
                <Card key={project.id} className="border-[#1a472a]/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base text-[#1a472a] mb-1">
                          {project.projectName}
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-[#1a472a]/80">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(project.status)} text-white text-xs`}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.projectDescription && (
                      <p className="text-sm text-[#1a472a]/75 line-clamp-2">
                        {project.projectDescription}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#1a472a]/80">Progress</span>
                        <span className="font-semibold text-[#1a472a]">
                          {getCurrencySymbol(project.targetCurrency)}{project.currentAmount.toLocaleString()} / {getCurrencySymbol(project.targetCurrency)}{project.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-[#1a472a]/10 rounded-full h-2">
                        <div
                          className="bg-[#7dd87d] h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#1a472a]/80">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {progress.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {project.contributorCount} contributors
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-[#1a472a]/30 text-[#1a472a]"
                        onClick={() => handleEdit(project)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

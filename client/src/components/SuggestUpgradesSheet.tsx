/**
 * Suggest Upgrades Sheet Component for Crowd Pooling Tool
 * Allows users to suggest improvements, vote on ideas, and collaborate on tool development
 * Based on the CalculatorWeightsSheet pattern
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Lightbulb,
  ExternalLink,
  History,
  Send,
  Plus,
  X,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  Wrench,
  Users,
  DollarSign,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Local storage keys
const IDEAS_STORAGE_KEY = 'regen-civics-crowdpooling-ideas';
const VOTES_STORAGE_KEY = 'regen-civics-crowdpooling-votes';
const COMMENTS_STORAGE_KEY = 'regen-civics-crowdpooling-comments';

// Type for community idea
interface CommunityIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  votes: number;
  createdAt: string;
  isSample?: boolean;
  comments?: Comment[];
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

// Default starter ideas
const defaultIdeas: CommunityIdea[] = [
  {
    id: 'idea-1',
    title: 'Add Skill-Based Role Suggestions',
    description: 'Suggest specific roles based on the skills a contributor has, with market-rate hourly values',
    category: 'Roles',
    votes: 18,
    createdAt: '2026-01-15',
    isSample: true
  },
  {
    id: 'idea-2',
    title: 'Equipment Value Calculator',
    description: 'Add a tool to estimate fair market value of equipment based on age, condition, and type',
    category: 'Immediate',
    votes: 12,
    createdAt: '2026-01-20',
    isSample: true
  },
  {
    id: 'idea-3',
    title: 'Multi-Currency Support with Live Rates',
    description: 'Automatically convert between currencies using live exchange rates',
    category: 'General',
    votes: 15,
    createdAt: '2026-01-10',
    isSample: true
  },
  {
    id: 'idea-4',
    title: 'Land Valuation Helper',
    description: 'Add guidance for valuing land contributions based on location, size, and features',
    category: 'Immediate',
    votes: 22,
    createdAt: '2026-01-05',
    isSample: true
  },
  {
    id: 'idea-5',
    title: 'Role Templates Library',
    description: 'Pre-built role templates for common regenerative project needs (permaculture designer, natural builder, etc.)',
    category: 'Roles',
    votes: 25,
    createdAt: '2026-01-01',
    isSample: true
  }
];

// Suggested roles with market rates
export const suggestedRoles = [
  {
    name: 'Permaculture Designer',
    description: 'Design food forests, water systems, and regenerative landscapes',
    suggestedRate: 35,
    typicalHours: 20,
    typicalWeeks: 26
  },
  {
    name: 'Natural Builder',
    description: 'Construct using cob, straw bale, earthbag, and other natural materials',
    suggestedRate: 30,
    typicalHours: 40,
    typicalWeeks: 12
  },
  {
    name: 'Community Coordinator',
    description: 'Organize events, manage volunteers, and facilitate community engagement',
    suggestedRate: 25,
    typicalHours: 15,
    typicalWeeks: 52
  },
  {
    name: 'Regenerative Farmer',
    description: 'Implement regenerative agriculture practices and manage food production',
    suggestedRate: 28,
    typicalHours: 30,
    typicalWeeks: 40
  },
  {
    name: 'Educator/Facilitator',
    description: 'Lead workshops, courses, and educational programs',
    suggestedRate: 40,
    typicalHours: 10,
    typicalWeeks: 20
  },
  {
    name: 'Project Manager',
    description: 'Coordinate project timelines, budgets, and team activities',
    suggestedRate: 45,
    typicalHours: 25,
    typicalWeeks: 52
  },
  {
    name: 'Marketing/Communications',
    description: 'Handle social media, content creation, and community outreach',
    suggestedRate: 30,
    typicalHours: 15,
    typicalWeeks: 26
  },
  {
    name: 'Bookkeeper/Admin',
    description: 'Manage finances, documentation, and administrative tasks',
    suggestedRate: 25,
    typicalHours: 10,
    typicalWeeks: 52
  },
  {
    name: 'Cook/Food Prep',
    description: 'Prepare meals for community members and events',
    suggestedRate: 20,
    typicalHours: 20,
    typicalWeeks: 26
  },
  {
    name: 'Maintenance/Handyperson',
    description: 'General repairs, maintenance, and infrastructure upkeep',
    suggestedRate: 25,
    typicalHours: 15,
    typicalWeeks: 52
  },
  {
    name: 'Childcare Provider',
    description: 'Care for children during community activities and events',
    suggestedRate: 18,
    typicalHours: 20,
    typicalWeeks: 40
  },
  {
    name: 'Tech Support/Developer',
    description: 'Manage technology systems, websites, and digital tools',
    suggestedRate: 50,
    typicalHours: 10,
    typicalWeeks: 26
  }
];

// Changelog entries
const changelogEntries = [
  {
    date: 'February 2026',
    version: '2.0',
    status: 'current',
    changes: [
      { type: 'new', description: 'Added role suggestions with market-rate values' },
      { type: 'new', description: 'Community ideas and voting system' },
      { type: 'improved', description: 'Mobile-optimized form inputs' },
    ]
  },
  {
    date: 'January 2026',
    version: '1.0',
    status: 'previous',
    changes: [
      { type: 'new', description: 'Initial Crowd Pooling Tool launched' },
      { type: 'new', description: 'Immediate and future contribution tracking' },
      { type: 'new', description: 'PDF export functionality' },
    ]
  },
  {
    date: 'Coming Soon',
    version: '2.1',
    status: 'planned',
    changes: [
      { type: 'proposed', description: 'Equipment value calculator' },
      { type: 'proposed', description: 'Land valuation helper' },
      { type: 'proposed', description: 'Multi-currency live conversion' },
    ]
  }
];

// Category icons
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Roles': Briefcase,
  'Immediate': DollarSign,
  'Future': Clock,
  'General': Wrench,
};

interface SuggestUpgradesSheetProps {
  onSelectRole?: (role: typeof suggestedRoles[0]) => void;
}

export default function SuggestUpgradesSheet({ onSelectRole }: SuggestUpgradesSheetProps) {
  const [activeTab, setActiveTab] = useState('roles');
  
  // Ideas state
  const [ideas, setIdeas] = useState<CommunityIdea[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState('');
  const [newIdeaCategory, setNewIdeaCategory] = useState('General');
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  // Load ideas and votes from local storage on mount
  useEffect(() => {
    const savedIdeas = localStorage.getItem(IDEAS_STORAGE_KEY);
    if (savedIdeas) {
      try {
        const parsed = JSON.parse(savedIdeas);
        setIdeas(parsed);
      } catch (e) {
        setIdeas(defaultIdeas);
      }
    } else {
      setIdeas(defaultIdeas);
    }
    
    const savedVotes = localStorage.getItem(VOTES_STORAGE_KEY);
    if (savedVotes) {
      try {
        const parsed = JSON.parse(savedVotes);
        setVotedIds(new Set(parsed));
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  // Save ideas to local storage whenever they change
  useEffect(() => {
    if (ideas.length > 0) {
      localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
    }
  }, [ideas]);

  // Save voted IDs to local storage
  useEffect(() => {
    if (votedIds.size > 0) {
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(Array.from(votedIds)));
    }
  }, [votedIds]);

  // Upvote an idea
  const upvoteIdea = (ideaId: string) => {
    if (votedIds.has(ideaId)) {
      toast.info('You already voted for this idea!');
      return;
    }
    
    setIdeas(prev => 
      prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, votes: idea.votes + 1 }
          : idea
      ).sort((a, b) => b.votes - a.votes)
    );
    
    setVotedIds(prev => new Set([...Array.from(prev), ideaId]));
    toast.success('Vote recorded!');
  };

  // Add a new idea
  const addIdea = () => {
    if (!newIdeaTitle.trim()) {
      toast.error('Please enter an idea title');
      return;
    }
    
    const newIdea: CommunityIdea = {
      id: `idea-${Date.now()}`,
      title: newIdeaTitle.trim(),
      description: newIdeaDescription.trim() || 'No description provided',
      category: newIdeaCategory,
      votes: 1,
      createdAt: new Date().toISOString().split('T')[0],
      isSample: false,
      comments: []
    };
    
    setIdeas(prev => [newIdea, ...prev].sort((a, b) => b.votes - a.votes));
    setVotedIds(prev => new Set([...Array.from(prev), newIdea.id]));
    setNewIdeaTitle('');
    setNewIdeaDescription('');
    setNewIdeaCategory('General');
    setShowAddIdea(false);
    toast.success('Idea added! Others can now vote on it.');
  };

  // Add comment to idea
  const addComment = (ideaId: string) => {
    const commentText = newComment[ideaId]?.trim();
    if (!commentText) {
      toast.error('Please enter a comment');
      return;
    }
    
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      text: commentText,
      author: 'Anonymous',
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setIdeas(prev => 
      prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, comments: [...(idea.comments || []), comment] }
          : idea
      )
    );
    
    setNewComment(prev => ({ ...prev, [ideaId]: '' }));
    toast.success('Comment added!');
  };

  // Sort ideas by votes (highest first)
  const sortedIdeas = useMemo(() => {
    return [...ideas].sort((a, b) => b.votes - a.votes);
  }, [ideas]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-sm text-[#7dd87d] hover:text-[#7dd87d] transition-colors underline underline-offset-2 decoration-[#7dd87d]/40 hover:decoration-[#7dd87d]">
          <Wrench className="w-4 h-4" />
          Suggest Upgrades to the Tool
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white border-l border-[#7dd87d]/20">
        <SheetHeader className="pb-4 border-b border-[#1a472a]/10">
          <SheetTitle className="flex items-center gap-2 text-[#1a472a]">
            <Wrench className="w-5 h-5 text-[#7dd87d]" />
            Help Improve This Tool
          </SheetTitle>
          <SheetDescription className="text-[#1a472a]/70">
            Suggest improvements, vote on ideas, and help shape the future of Crowd Pooling!
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-[#f0f7f0]">
              <TabsTrigger value="roles" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <Briefcase className="w-3 h-3 mr-1" />
                Role Suggestions
              </TabsTrigger>
              <TabsTrigger value="ideas" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <Lightbulb className="w-3 h-3 mr-1" />
                Ideas
              </TabsTrigger>
              <TabsTrigger value="changelog" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <History className="w-3 h-3 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Role Suggestions Tab */}
            <TabsContent value="roles" className="mt-4 space-y-4">
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Briefcase className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Suggested Roles & Rates</p>
                    <p>Click any role to add it to your contribution form with suggested values.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {suggestedRoles.map((role, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (onSelectRole) {
                        onSelectRole(role);
                        toast.success(`Added "${role.name}" to your form`);
                      }
                    }}
                    className="w-full text-left p-4 bg-white rounded-lg border border-[#1a472a]/10 hover:border-[#7dd87d] hover:bg-[#7dd87d]/5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-[#1a472a]">{role.name}</h4>
                        <p className="text-xs text-[#1a472a]/60 mt-1">{role.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-[#4a7c59]">${role.suggestedRate}/hr</p>
                        <p className="text-xs text-[#1a472a]/50">
                          ~{role.typicalHours}hrs/wk × {role.typicalWeeks}wks
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#1a472a]/10 flex items-center justify-between text-xs">
                      <span className="text-[#1a472a]/50">Typical total value:</span>
                      <span className="font-medium text-[#1a472a]">
                        ${(role.suggestedRate * role.typicalHours * role.typicalWeeks).toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> These are suggested market rates. Adjust based on your experience level, 
                  local cost of living, and project needs.
                </p>
              </div>
            </TabsContent>

            {/* Ideas Tab */}
            <TabsContent value="ideas" className="mt-4 space-y-4">
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Community Ideas</p>
                    <p>Vote on ideas you support or add your own. The highest-voted ideas rise to the top!</p>
                  </div>
                </div>
              </div>

              {/* Add new idea section */}
              {showAddIdea ? (
                <div className="bg-[#f0f7f0] rounded-lg p-4 border border-[#7dd87d]/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-[#1a472a] flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#7dd87d]" />
                      Add Your Idea
                    </h4>
                    <button
                      onClick={() => setShowAddIdea(false)}
                      className="p-1 text-[#1a472a]/40 hover:text-[#1a472a] rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Idea title (e.g., 'Add equipment value calculator')"
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value)}
                      className="w-full"
                    />
                    <textarea
                      placeholder="Brief description (optional)"
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value)}
                      className="w-full h-20 px-3 py-2 text-sm border border-[#1a472a]/20 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
                    />
                    <select
                      value={newIdeaCategory}
                      onChange={(e) => setNewIdeaCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#1a472a]/20 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
                    >
                      <option value="General">General</option>
                      <option value="Roles">Roles & Future Value</option>
                      <option value="Immediate">Immediate Contributions</option>
                      <option value="Future">Future Contributions</option>
                    </select>
                    <Button
                      onClick={addIdea}
                      className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Idea
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddIdea(true)}
                  variant="outline"
                  className="w-full border-dashed border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 hover:text-[#7dd87d]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your Idea
                </Button>
              )}

              {/* Ideas list */}
              <div className="space-y-3">
                {sortedIdeas.map((idea, index) => {
                  const hasVoted = votedIds.has(idea.id);
                  const CategoryIcon = categoryIcons[idea.category] || Wrench;
                  const showComments = expandedComments.has(idea.id);
                  
                  return (
                    <div 
                      key={idea.id}
                      className={`rounded-lg border p-4 transition-all ${
                        index === 0 
                          ? 'border-[#7dd87d]/50 bg-[#7dd87d]/5' 
                          : 'border-[#1a472a]/10 bg-white hover:border-[#7dd87d]/30'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Vote button */}
                        <button
                          onClick={() => upvoteIdea(idea.id)}
                          disabled={hasVoted}
                          className={`flex flex-col items-center justify-center min-w-[50px] py-2 rounded-lg transition-all ${
                            hasVoted 
                              ? 'bg-[#7dd87d]/20 text-[#7dd87d] cursor-default' 
                              : 'bg-[#f0f7f0] text-[#1a472a]/60 hover:bg-[#7dd87d]/10 hover:text-[#7dd87d] cursor-pointer'
                          }`}
                        >
                          <ChevronUp className={`w-5 h-5 ${hasVoted ? 'text-[#7dd87d]' : ''}`} />
                          <span className={`text-lg font-bold ${hasVoted ? 'text-[#7dd87d]' : ''}`}>
                            {idea.votes}
                          </span>
                        </button>
                        
                        {/* Idea content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-[#1a472a]">{idea.title}</h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {idea.isSample && (
                                <span className="text-xs bg-[#1a472a]/10 text-[#1a472a]/60 px-2 py-0.5 rounded-full">
                                  Sample
                                </span>
                              )}
                              <span className="text-xs bg-[#7dd87d]/20 text-[#4a7c59] px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CategoryIcon className="w-3 h-3" />
                                {idea.category}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-[#1a472a]/70 mt-1">{idea.description}</p>
                          
                          {/* Comments section */}
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                setExpandedComments(prev => {
                                  const next = new Set(prev);
                                  if (next.has(idea.id)) {
                                    next.delete(idea.id);
                                  } else {
                                    next.add(idea.id);
                                  }
                                  return next;
                                });
                              }}
                              className="text-xs text-[#1a472a]/50 hover:text-[#7dd87d] flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {idea.comments?.length || 0} comments
                            </button>
                            
                            {showComments && (
                              <div className="mt-2 space-y-2">
                                {idea.comments?.map(comment => (
                                  <div key={comment.id} className="bg-[#f0f7f0] rounded p-2 text-xs">
                                    <p className="text-[#1a472a]/80">{comment.text}</p>
                                    <p className="text-[#1a472a]/40 mt-1">{comment.author} - {comment.createdAt}</p>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <Input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={newComment[idea.id] || ''}
                                    onChange={(e) => setNewComment(prev => ({ ...prev, [idea.id]: e.target.value }))}
                                    className="flex-1 h-8 text-xs"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => addComment(idea.id)}
                                    className="h-8 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                                  >
                                    <Send className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit to DAO */}
              <div className="bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-lg p-4 text-white">
                <h4 className="font-semibold mb-2">Want to Make It Official?</h4>
                <p className="text-sm text-white/80 mb-3">
                  Submit your improvement proposal to the ReGen Games DAO for community review and implementation.
                </p>
                <a
                  href="https://app.hypha.earth/en/dho/regen-games/agreements/select-create-action"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Submit Proposal to DAO
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </TabsContent>

            {/* Changelog Tab */}
            <TabsContent value="changelog" className="mt-4 space-y-4">
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <History className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Version History</p>
                    <p>Track changes and improvements to the Crowd Pooling Tool over time.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {changelogEntries.map((entry, index) => (
                  <div 
                    key={index}
                    className={`rounded-lg border p-4 ${
                      entry.status === 'current' 
                        ? 'border-[#7dd87d]/50 bg-[#7dd87d]/5' 
                        : entry.status === 'planned'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-[#1a472a]/10 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-[#1a472a]">{entry.date}</h4>
                        <span className="text-xs text-[#1a472a]/60">Version {entry.version}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        entry.status === 'current' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : entry.status === 'planned'
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-[#1a472a]/10 text-[#1a472a]/60'
                      }`}>
                        {entry.status === 'current' ? 'Current' : entry.status === 'planned' ? 'Planned' : 'Previous'}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {entry.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2 text-sm">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            change.type === 'new' 
                              ? 'bg-green-100 text-green-700' 
                              : change.type === 'improved'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {change.type}
                          </span>
                          <span className="text-[#1a472a]/80">{change.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

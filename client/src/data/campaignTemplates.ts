/**
 * Campaign Templates
 * Pre-filled templates for common regenerative project types
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  land: {
    hectares: number;
    regions: string[];
    features: string[];
    description: string;
  };
  equipment: Array<{
    category: string;
    name: string;
    quantity: number;
    description: string;
    estimatedValue: number;
  }>;
  roles: Array<{
    title: string;
    category: string;
    description: string;
    hoursPerWeek: number;
    weeksNeeded: number;
    hourlyRate: number;
  }>;
  otherNeeds: Array<{
    category: string;
    title: string;
    description: string;
    estimatedValue: number;
  }>;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'ecovillage',
    name: 'Ecovillage',
    description: 'Intentional community focused on sustainable living, shared resources, and ecological regeneration',
    icon: 'home',
    land: {
      hectares: 20,
      regions: ['Temperate', 'Subtropical'],
      features: ['Water Access', 'Buildable Land', 'Forest', 'Meadow'],
      description: '20 hectares with mixed terrain suitable for housing, community spaces, food production, and natural areas'
    },
    equipment: [
      { category: 'construction', name: 'Excavator', quantity: 1, description: 'For site preparation and infrastructure', estimatedValue: 85000 },
      { category: 'agriculture', name: 'Tractor (40-60 HP)', quantity: 1, description: 'Multi-purpose farm tractor', estimatedValue: 35000 },
      { category: 'energy', name: 'Solar Panel System (50kW)', quantity: 1, description: 'Community solar power system', estimatedValue: 75000 },
      { category: 'water', name: 'Water Filtration System', quantity: 1, description: 'Community water treatment', estimatedValue: 25000 },
      { category: 'tools', name: 'Hand Tool Set (Complete)', quantity: 10, description: 'Full hand-tool kits for residents', estimatedValue: 5000 },
    ],
    roles: [
      { title: 'Permaculture Designer', category: 'Design & Planning', description: 'Site design and implementation oversight', hoursPerWeek: 20, weeksNeeded: 52, hourlyRate: 65 },
      { title: 'Construction Manager', category: 'Construction & Infrastructure', description: 'Oversee building projects', hoursPerWeek: 40, weeksNeeded: 52, hourlyRate: 55 },
      { title: 'Community Coordinator', category: 'Operations & Management', description: 'Facilitate community processes', hoursPerWeek: 30, weeksNeeded: 52, hourlyRate: 45 },
      { title: 'Ecological Educator', category: 'Education & Outreach', description: 'Teach sustainable living skills', hoursPerWeek: 20, weeksNeeded: 40, hourlyRate: 40 },
    ],
    otherNeeds: [
      { category: 'engineering', title: 'Civil Engineering Plans', description: 'Site infrastructure and utilities design', estimatedValue: 35000 },
      { category: 'architectural', title: 'Community Building Designs', description: 'Architectural plans for shared spaces', estimatedValue: 45000 },
      { category: 'permaculture', title: 'Permaculture Master Plan', description: 'Holistic site design', estimatedValue: 25000 },
      { category: 'permits', title: 'Building & Development Permits', description: 'Legal approvals for construction', estimatedValue: 15000 },
      { category: 'insurance', title: 'Community Liability Insurance', description: 'Coverage for community activities', estimatedValue: 8000 },
    ]
  },
  {
    id: 'food-forest',
    name: 'Food Forest',
    description: 'Multi-layered edible ecosystem mimicking natural forest structure with diverse perennial crops',
    icon: 'tree',
    land: {
      hectares: 10,
      regions: ['Temperate', 'Subtropical', 'Tropical'],
      features: ['Water Access', 'Gentle Slopes', 'Good Soil'],
      description: '10 hectares suitable for establishing a diverse food forest with multiple canopy layers'
    },
    equipment: [
      { category: 'agriculture', name: 'Compact Tractor (25-35 HP)', quantity: 1, description: 'For site prep and maintenance', estimatedValue: 22000 },
      { category: 'water', name: 'Drip Irrigation System', quantity: 1, description: 'Water-efficient irrigation for establishment', estimatedValue: 12000 },
      { category: 'tools', name: 'Pruning & Grafting Tools', quantity: 1, description: 'Professional orchard tools', estimatedValue: 3000 },
      { category: 'tools', name: 'Chipper/Shredder', quantity: 1, description: 'For mulch production', estimatedValue: 4500 },
      { category: 'storage', name: 'Tool Shed & Storage', quantity: 1, description: 'Protected equipment storage', estimatedValue: 8000 },
    ],
    roles: [
      { title: 'Food Forest Designer', category: 'Design & Planning', description: 'Design multi-layered food forest', hoursPerWeek: 20, weeksNeeded: 26, hourlyRate: 70 },
      { title: 'Agroforestry Specialist', category: 'Agriculture & Food Production', description: 'Implement and manage food forest', hoursPerWeek: 30, weeksNeeded: 52, hourlyRate: 50 },
      { title: 'Nursery Manager', category: 'Agriculture & Food Production', description: 'Propagate and manage plants', hoursPerWeek: 25, weeksNeeded: 52, hourlyRate: 38 },
      { title: 'Soil Specialist', category: 'Agriculture & Food Production', description: 'Soil building and fertility management', hoursPerWeek: 15, weeksNeeded: 40, hourlyRate: 45 },
    ],
    otherNeeds: [
      { category: 'permaculture', title: 'Food Forest Design & Plan', description: 'Detailed planting plan with species selection', estimatedValue: 18000 },
      { category: 'financial', title: 'Market Analysis & Business Plan', description: 'Financial projections for food forest products', estimatedValue: 8000 },
      { category: 'training', title: 'Food Forest Management Course', description: 'Training for team and volunteers', estimatedValue: 5000 },
      { category: 'supplies', title: 'Initial Plant Stock', description: 'Trees, shrubs, and perennial plants', estimatedValue: 25000 },
    ]
  },
  {
    id: 'regenerative-farm',
    name: 'Regenerative Farm',
    description: 'Holistic farm operation focused on soil health, biodiversity, and regenerative agriculture practices',
    icon: 'wheat',
    land: {
      hectares: 40,
      regions: ['Temperate', 'Subtropical'],
      features: ['Water Access', 'Fertile Soil', 'Pasture', 'Cropland'],
      description: '40 hectares with diverse terrain for rotational grazing, market gardens, and regenerative crop production'
    },
    equipment: [
      { category: 'agriculture', name: 'Farm Tractor (60-80 HP)', quantity: 1, description: 'Primary farm tractor', estimatedValue: 55000 },
      { category: 'agriculture', name: 'No-Till Seed Drill', quantity: 1, description: 'For regenerative planting', estimatedValue: 28000 },
      { category: 'agriculture', name: 'Rotational Grazing Fencing', quantity: 1, description: 'Mobile electric fencing system', estimatedValue: 8000 },
      { category: 'agriculture', name: 'Greenhouse (30x100ft)', quantity: 1, description: 'Season extension and propagation', estimatedValue: 35000 },
      { category: 'storage', name: 'Cold Storage Unit', quantity: 1, description: 'Post-harvest storage', estimatedValue: 18000 },
      { category: 'tools', name: 'Market Garden Tools', quantity: 1, description: 'Complete market garden tool set', estimatedValue: 6000 },
    ],
    roles: [
      { title: 'Farm Manager', category: 'Operations & Management', description: 'Overall farm operations and planning', hoursPerWeek: 40, weeksNeeded: 52, hourlyRate: 50 },
      { title: 'Livestock Manager', category: 'Agriculture & Food Production', description: 'Manage rotational grazing and animal health', hoursPerWeek: 35, weeksNeeded: 52, hourlyRate: 42 },
      { title: 'Market Gardener', category: 'Agriculture & Food Production', description: 'Intensive vegetable production', hoursPerWeek: 40, weeksNeeded: 40, hourlyRate: 38 },
      { title: 'Soil Health Specialist', category: 'Agriculture & Food Production', description: 'Monitor and improve soil biology', hoursPerWeek: 20, weeksNeeded: 52, hourlyRate: 48 },
      { title: 'Marketing & Sales Coordinator', category: 'Operations & Management', description: 'CSA, farmers markets, wholesale', hoursPerWeek: 20, weeksNeeded: 52, hourlyRate: 40 },
    ],
    otherNeeds: [
      { category: 'permaculture', title: 'Holistic Farm Plan', description: 'Regenerative agriculture design', estimatedValue: 22000 },
      { category: 'engineering', title: 'Water Management System Design', description: 'Irrigation and water harvesting', estimatedValue: 15000 },
      { category: 'financial', title: 'Farm Business Plan & Projections', description: '5-year financial model', estimatedValue: 12000 },
      { category: 'permits', title: 'Agricultural Permits & Certifications', description: 'Organic certification, food safety', estimatedValue: 8000 },
      { category: 'training', title: 'Regenerative Agriculture Training', description: 'Team training in holistic management', estimatedValue: 6000 },
      { category: 'supplies', title: 'Cover Crop Seeds & Amendments', description: 'Initial soil building materials', estimatedValue: 10000 },
    ]
  }
];

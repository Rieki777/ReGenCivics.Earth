/**
 * Regional Cost Data
 * Comprehensive pricing information for equipment, labor, and land by region
 * Based on global market research and labor cost indices
 */

export interface RegionalCostData {
  landPricePerHectare: number; // USD per hectare
  laborCostMultiplier: number; // Relative to base rate (1.0 = baseline)
  equipmentCostMultiplier: number; // Relative to base price
  currency: string;
  typicalHourlyRates: {
    unskilled: number;
    skilled: number;
    professional: number;
    management: number;
  };
}

// Regional cost data based on Trading Economics labor costs and market research
export const REGIONAL_COST_DATA: Record<string, RegionalCostData> = {
  'North America': {
    landPricePerHectare: 15000,
    laborCostMultiplier: 1.3,
    equipmentCostMultiplier: 1.0,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 15,
      skilled: 30,
      professional: 65,
      management: 85
    }
  },
  'Central America': {
    landPricePerHectare: 5000,
    laborCostMultiplier: 0.4,
    equipmentCostMultiplier: 1.1,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 5,
      skilled: 12,
      professional: 25,
      management: 35
    }
  },
  'South America': {
    landPricePerHectare: 3000,
    laborCostMultiplier: 0.5,
    equipmentCostMultiplier: 1.15,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 6,
      skilled: 15,
      professional: 30,
      management: 45
    }
  },
  'Europe': {
    landPricePerHectare: 25000,
    laborCostMultiplier: 1.5,
    equipmentCostMultiplier: 1.05,
    currency: 'EUR',
    typicalHourlyRates: {
      unskilled: 18,
      skilled: 35,
      professional: 75,
      management: 95
    }
  },
  'Africa': {
    landPricePerHectare: 2000,
    laborCostMultiplier: 0.3,
    equipmentCostMultiplier: 1.2,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 4,
      skilled: 10,
      professional: 20,
      management: 30
    }
  },
  'Asia': {
    landPricePerHectare: 8000,
    laborCostMultiplier: 0.6,
    equipmentCostMultiplier: 0.95,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 7,
      skilled: 18,
      professional: 40,
      management: 55
    }
  },
  'Oceania': {
    landPricePerHectare: 12000,
    laborCostMultiplier: 1.4,
    equipmentCostMultiplier: 1.1,
    currency: 'AUD',
    typicalHourlyRates: {
      unskilled: 20,
      skilled: 40,
      professional: 80,
      management: 100
    }
  },
  'Temperate': {
    landPricePerHectare: 10000,
    laborCostMultiplier: 1.0,
    equipmentCostMultiplier: 1.0,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 12,
      skilled: 25,
      professional: 50,
      management: 70
    }
  },
  'Tropical': {
    landPricePerHectare: 4000,
    laborCostMultiplier: 0.5,
    equipmentCostMultiplier: 1.15,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 6,
      skilled: 15,
      professional: 30,
      management: 40
    }
  },
  'Arid': {
    landPricePerHectare: 2500,
    laborCostMultiplier: 0.7,
    equipmentCostMultiplier: 1.1,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 8,
      skilled: 20,
      professional: 40,
      management: 55
    }
  },
  'Mediterranean': {
    landPricePerHectare: 18000,
    laborCostMultiplier: 1.2,
    equipmentCostMultiplier: 1.05,
    currency: 'EUR',
    typicalHourlyRates: {
      unskilled: 15,
      skilled: 30,
      professional: 60,
      management: 80
    }
  },
  'Polar': {
    landPricePerHectare: 1000,
    laborCostMultiplier: 1.8,
    equipmentCostMultiplier: 1.3,
    currency: 'USD',
    typicalHourlyRates: {
      unskilled: 25,
      skilled: 50,
      professional: 90,
      management: 120
    }
  }
};

// Equipment base prices (USD) - will be adjusted by regional multipliers
export const EQUIPMENT_BASE_PRICES: Record<string, number> = {
  // Agriculture
  'Tractor': 35000,
  'Harvester': 85000,
  'Irrigation System': 15000,
  'Greenhouse': 25000,
  'Seed Drill': 12000,
  'Plow': 5000,
  'Cultivator': 8000,
  'Sprayer': 10000,
  
  // Construction
  'Excavator': 85000,
  'Bulldozer': 120000,
  'Backhoe': 65000,
  'Concrete Mixer': 8000,
  'Scaffolding': 5000,
  'Crane': 150000,
  
  // Processing
  'Grain Mill': 20000,
  'Food Processor': 15000,
  'Storage Silo': 30000,
  'Refrigeration Unit': 12000,
  'Packaging Equipment': 18000,
  
  // Energy
  'Solar Panels': 15000,
  'Wind Turbine': 45000,
  'Battery Storage': 25000,
  'Generator': 8000,
  'Biogas Digester': 20000,
  
  // Water
  'Water Pump': 3000,
  'Water Tank': 5000,
  'Filtration System': 8000,
  'Drip Irrigation': 4000,
  'Rainwater Harvesting': 6000,
  
  // Tools
  'Hand Tools Set': 500,
  'Power Tools': 2000,
  'Workshop Equipment': 10000,
  'Testing Equipment': 5000
};

// Role skill level mapping
export const ROLE_SKILL_LEVELS: Record<string, keyof RegionalCostData['typicalHourlyRates']> = {
  'Farm Manager': 'management',
  'Project Manager': 'management',
  'Operations Manager': 'management',
  'Financial Manager': 'management',
  
  'Permaculture Designer': 'professional',
  'Architect': 'professional',
  'Engineer': 'professional',
  'Agronomist': 'professional',
  'Ecologist': 'professional',
  'Accountant': 'professional',
  
  'Carpenter': 'skilled',
  'Electrician': 'skilled',
  'Plumber': 'skilled',
  'Mason': 'skilled',
  'Welder': 'skilled',
  'Mechanic': 'skilled',
  'Gardener': 'skilled',
  
  'Farm Worker': 'unskilled',
  'Construction Laborer': 'unskilled',
  'General Helper': 'unskilled'
};

/**
 * Get estimated land price based on hectares and regions
 */
export function estimateLandPrice(hectares: number, regions: string[]): number {
  if (regions.length === 0) return hectares * 10000; // Default fallback
  
  const prices = regions.map(region => {
    const data = REGIONAL_COST_DATA[region];
    return data ? data.landPricePerHectare : 10000;
  });
  
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  return hectares * avgPrice;
}

/**
 * Get estimated equipment price based on name and regions
 */
export function estimateEquipmentPrice(equipmentName: string, regions: string[]): number {
  const basePrice = EQUIPMENT_BASE_PRICES[equipmentName] || 10000;
  
  if (regions.length === 0) return basePrice;
  
  const multipliers = regions.map(region => {
    const data = REGIONAL_COST_DATA[region];
    return data ? data.equipmentCostMultiplier : 1.0;
  });
  
  const avgMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
  return Math.round(basePrice * avgMultiplier);
}

/**
 * Get suggested hourly rate for a role based on regions
 */
export function suggestHourlyRate(roleTitle: string, regions: string[]): number {
  const skillLevel = ROLE_SKILL_LEVELS[roleTitle] || 'skilled';
  
  if (regions.length === 0) {
    // Default rates by skill level
    const defaults = { unskilled: 12, skilled: 25, professional: 50, management: 70 };
    return defaults[skillLevel];
  }
  
  const rates = regions.map(region => {
    const data = REGIONAL_COST_DATA[region];
    return data ? data.typicalHourlyRates[skillLevel] : 25;
  });
  
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

/**
 * Get regional currency symbol
 */
export function getRegionalCurrency(regions: string[]): string {
  if (regions.length === 0) return 'USD';
  
  const currencies = regions.map(region => {
    const data = REGIONAL_COST_DATA[region];
    return data ? data.currency : 'USD';
  });
  
  // Return most common currency
  const currencyCount: Record<string, number> = {};
  currencies.forEach(c => {
    currencyCount[c] = (currencyCount[c] || 0) + 1;
  });
  
  return Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0][0];
}

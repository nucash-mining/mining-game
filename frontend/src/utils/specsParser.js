/**
 * Parse component specs from the contract's specs number
 *
 * Specs format (18 digits):
 * Position 1:     Generation (0-9)
 * Position 2-3:   Component type (01=Badge, 02=PC, 03=CPU, 04=GPU)
 * Position 4-7:   Hashrate (0000-9999)
 * Position 8-11:  Wattage (0000-9999) - raw electrical watts
 * Position 12-14: Stake Weight (000-999)
 * Position 15-16: Luck Boost (00-99)
 * Position 17-18: Efficiency Multiplier (00-99)
 *
 * WATT Token Consumption:
 * - Raw wattage is electrical power consumption in watts
 * - WATT token cost per hour = wattage / WATT_SCALING_FACTOR
 * - This makes a full rig cost ~10-50 WATT tokens per hour, not 12,000
 */

// Scaling factor: 100 watts of electrical power = 1 WATT token per hour
export const WATT_SCALING_FACTOR = 100;

export function parseSpecs(specsStr) {
  // Pad to 18 characters if needed
  const specs = specsStr.toString().padStart(18, '0');

  const rawWattage = parseInt(specs.substring(7, 11), 10);

  return {
    generation: parseInt(specs.substring(0, 1), 10),
    componentType: parseInt(specs.substring(1, 3), 10),
    hashrate: parseInt(specs.substring(3, 7), 10),
    wattage: rawWattage, // Raw electrical watts
    wattTokenCost: rawWattage / WATT_SCALING_FACTOR, // WATT tokens per hour
    stakeWeight: parseInt(specs.substring(11, 14), 10),
    luckBoost: parseInt(specs.substring(14, 16), 10),
    efficiencyMultiplier: parseInt(specs.substring(16, 18), 10),
  };
}

export function getComponentTypeName(typeId) {
  const types = {
    1: 'Badge',
    2: 'PC',
    3: 'CPU',
    4: 'GPU',
  };
  return types[typeId] || 'Unknown';
}

/**
 * Calculate combined rig stats from components
 *
 * Mining Weight Formula:
 *   miningWeight = (hashrate × efficiencyMultiplier) / wattTokenCost
 *   This rewards high hashrate with good efficiency and low power consumption
 *
 * Stake Weight:
 *   Direct sum of component stake weights (used for staking pool rewards)
 *
 * WATT Consumption:
 *   Sum of component wattTokenCost (WATT tokens per hour to run the rig)
 */
export function calculateRigStats(components, hasGenesisBadge = false) {
  let totalHashrate = 0;
  let totalWattTokenCost = 0;
  let totalStakeWeight = 0;
  let totalLuckBoost = 0;
  let baseEfficiency = 100; // Base efficiency percentage
  let efficiencyBonuses = 0;

  // Base stats from PC
  const pc = components.find(c => c && c.type === 'PC');
  if (!pc) {
    return {
      hashrate: 0,
      wattConsumption: 0,
      stakeWeight: 0,
      luckBoost: 0,
      efficiency: 0,
      miningWeight: 0,
      isValid: false,
      message: 'A Gaming PC is required to build a rig',
    };
  }

  // Process each component
  components.forEach(component => {
    if (!component) return;

    const specs = parseSpecs(component.specs);

    // Hashrate: All non-badge components contribute
    // PC provides base hashrate, CPU and GPU add to it
    if (specs.componentType !== 1) {
      totalHashrate += specs.hashrate;
    }

    // WATT Token Cost: All components consume power (except badges)
    if (specs.componentType !== 1) {
      totalWattTokenCost += specs.wattTokenCost;
    }

    // Stake weight: Sum of all components
    totalStakeWeight += specs.stakeWeight;

    // Luck boost: Sum of all
    totalLuckBoost += specs.luckBoost;

    // Efficiency: Additive bonuses from components
    if (specs.efficiencyMultiplier > 0) {
      efficiencyBonuses += specs.efficiencyMultiplier;
    }
  });

  // Apply Genesis Badge bonuses (10% to luck and efficiency)
  if (hasGenesisBadge) {
    totalLuckBoost += 10;
    efficiencyBonuses += 10;
  }

  // Calculate final efficiency (base + bonuses, capped at 200%)
  const finalEfficiency = Math.min(baseEfficiency + efficiencyBonuses, 200);

  // Calculate mining weight
  // Formula: (hashrate × efficiency%) / wattCost
  // Higher is better - rewards efficient, high-hashrate rigs
  let miningWeight = 0;
  if (totalWattTokenCost > 0) {
    miningWeight = Math.round((totalHashrate * (finalEfficiency / 100)) / totalWattTokenCost);
  }

  // Apply Genesis Badge 10% bonus to mining weight and stake weight
  if (hasGenesisBadge) {
    miningWeight = Math.round(miningWeight * 1.1);
    totalStakeWeight = Math.round(totalStakeWeight * 1.1);
  }

  return {
    hashrate: totalHashrate,
    wattConsumption: Math.round(totalWattTokenCost * 10) / 10, // Round to 1 decimal
    stakeWeight: totalStakeWeight,
    luckBoost: totalLuckBoost,
    efficiency: finalEfficiency,
    miningWeight,
    isValid: true,
    hasGenesisBadge,
  };
}

/**
 * Format large numbers for display
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Calculate estimated earnings based on rig stats
 */
export function estimateEarnings(miningWeight, algorithm = 0) {
  // Base earnings per mining weight per day (example values)
  const baseEarningsPerDay = {
    0: 0.00001, // BTC
    1: 0.001,   // LTC
    2: 0.01,    // ETC
    3: 0.001,   // XMR
    4: 0.1,     // ALT
    5: 0.01,    // DASH
    6: 1.0,     // KAS
  };

  const dailyEarnings = miningWeight * (baseEarningsPerDay[algorithm] || 0.001);

  return {
    daily: dailyEarnings,
    weekly: dailyEarnings * 7,
    monthly: dailyEarnings * 30,
  };
}

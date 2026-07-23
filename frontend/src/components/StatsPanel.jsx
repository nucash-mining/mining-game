import React from 'react';
import { formatNumber } from '../utils/specsParser';

export default function StatsPanel({ stats }) {
  const statItems = [
    {
      label: 'Hashrate',
      value: stats.hashrate,
      suffix: ' H/s',
      icon: '⚡',
      color: 'text-mining-accent',
      bgColor: 'bg-mining-accent/10',
      maxValue: 1000,
      description: 'Total computing power of your rig',
    },
    {
      label: 'WATT Consumption',
      value: stats.wattConsumption,
      suffix: '/hr',
      icon: '🔌',
      color: 'text-mining-warning',
      bgColor: 'bg-mining-warning/10',
      maxValue: 5,
      description: 'WATT tokens consumed per hour to run',
    },
    {
      label: 'Mining Weight',
      value: stats.miningWeight,
      icon: '⛏️',
      color: 'text-mining-primary',
      bgColor: 'bg-mining-primary/10',
      maxValue: 500,
      description: 'Mining effectiveness (hashrate × efficiency / cost)',
    },
    {
      label: 'Efficiency',
      value: stats.efficiency,
      suffix: '%',
      icon: '📊',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      maxValue: 200,
      description: 'Power efficiency (100% base + bonuses)',
    },
  ];

  return (
    <div className="card-dark p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Rig Statistics</h3>
      </div>

      {!stats.isValid ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🖥️</div>
          <p className="text-gray-400">{stats.message || 'Add components to see stats'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {statItems.map((stat, index) => (
            <div key={index} className={`p-4 rounded-lg ${stat.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-sm text-gray-300">{stat.label}</span>
                </div>
                <span className={`text-lg font-bold ${stat.color}`}>
                  {stat.isNegative && stat.value > 0 ? '-' : ''}
                  {formatNumber(stat.value)}{stat.suffix || ''}
                </span>
              </div>

              {/* Progress bar */}
              <div className="stat-bar">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min((stat.value / stat.maxValue) * 100, 100)}%`,
                    background: stat.isNegative
                      ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                      : `linear-gradient(90deg, ${
                          stat.color.includes('primary') ? '#00d4ff' :
                          stat.color.includes('accent') ? '#10b981' :
                          stat.color.includes('secondary') ? '#7c3aed' :
                          stat.color.includes('gold') ? '#fbbf24' :
                          stat.color.includes('warning') ? '#f59e0b' :
                          stat.color.includes('green') ? '#22c55e' : '#00d4ff'
                        }, ${
                          stat.color.includes('primary') ? '#0099cc' :
                          stat.color.includes('accent') ? '#059669' :
                          stat.color.includes('secondary') ? '#5b21b6' :
                          stat.color.includes('gold') ? '#d97706' :
                          stat.color.includes('warning') ? '#d97706' :
                          stat.color.includes('green') ? '#16a34a' : '#0099cc'
                        })`,
                  }}
                />
              </div>

              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </div>
          ))}

          {/* Summary */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-mining-primary/10 to-mining-secondary/10 border border-mining-primary/30">
            <h4 className="text-sm font-semibold text-white mb-2">Performance Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Cost per Hash:</span>
                <span className="ml-2 text-white font-medium">
                  {stats.hashrate > 0
                    ? (stats.wattConsumption / stats.hashrate).toFixed(3)
                    : '0'} WATT/hr
                </span>
              </div>
              <div>
                <span className="text-gray-400">Runtime per 100 WATT:</span>
                <span className="ml-2 text-white font-medium">
                  {stats.wattConsumption > 0
                    ? (100 / stats.wattConsumption).toFixed(1)
                    : '∞'} hours
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <span className="text-gray-400">Daily Cost:</span>
                <span className="ml-2 text-white font-medium">
                  {formatNumber(Math.round(stats.wattConsumption * 24))} WATT
                </span>
              </div>
              <div>
                <span className="text-gray-400">Weekly Cost:</span>
                <span className="ml-2 text-white font-medium">
                  {formatNumber(Math.round(stats.wattConsumption * 24 * 7))} WATT
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

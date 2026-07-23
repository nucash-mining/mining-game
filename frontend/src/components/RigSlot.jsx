import React from 'react';
import { RARITY_COLORS } from '../utils/constants';
import { parseSpecs } from '../utils/specsParser';

export default function RigSlot({ slotType, slotIndex, item, onRemove, isRequired }) {
  const slotLabels = {
    PC: 'Gaming PC',
    CPU: 'Processor',
    GPU: `GPU ${slotIndex + 1}`,
    Badge: 'Badge',
  };

  // Mini versions of the NFT icons
  const slotIcons = {
    PC: (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
        <rect x="15" y="15" width="70" height="45" rx="4" fill="#1e293b" stroke="currentColor" strokeWidth="2"/>
        <rect x="20" y="20" width="60" height="35" rx="2" fill="#0f172a"/>
        <rect x="40" y="60" width="20" height="6" fill="#334155"/>
        <rect x="30" y="66" width="40" height="4" rx="2" fill="#475569"/>
      </svg>
    ),
    CPU: (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
        <rect x="25" y="25" width="50" height="50" rx="4" fill="#1e293b" stroke="currentColor" strokeWidth="2"/>
        <rect x="32" y="32" width="36" height="36" rx="2" fill="#0f172a"/>
        {[35, 50, 65].map((x, i) => (
          <React.Fragment key={i}>
            <rect x={x-2} y="15" width="4" height="10" fill="#64748b"/>
            <rect x={x-2} y="75" width="4" height="10" fill="#64748b"/>
            <rect x="15" y={x-2} width="10" height="4" fill="#64748b"/>
            <rect x="75" y={x-2} width="10" height="4" fill="#64748b"/>
          </React.Fragment>
        ))}
      </svg>
    ),
    GPU: (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
        <rect x="10" y="25" width="80" height="40" rx="4" fill="#1e293b" stroke="currentColor" strokeWidth="2"/>
        <circle cx="35" cy="45" r="12" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
        <circle cx="65" cy="45" r="12" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
        <rect x="20" y="65" width="60" height="6" fill="#0f172a"/>
      </svg>
    ),
    Badge: (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
        <path d="M50 15 L60 35 L82 40 L67 55 L70 78 L50 68 L30 78 L33 55 L18 40 L40 35 Z"
              fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="50" cy="50" r="12" fill="#0f172a" stroke="currentColor" strokeWidth="1"/>
        <text x="50" y="54" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="bold">G</text>
      </svg>
    ),
  };

  if (item) {
    const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
    const specs = parseSpecs(item.specs);

    return (
      <div
        className="relative group rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${rarityColor}15, ${rarityColor}05)`,
          border: `1px solid ${rarityColor}50`,
        }}
      >
        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white
            flex items-center justify-center hover:bg-red-500 transition-all z-10
            opacity-0 group-hover:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-3 flex items-center gap-3">
          {/* Mini NFT preview */}
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
          >
            {slotIcons[slotType]}
          </div>

          {/* Item info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm truncate">{item.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-1.5 py-0.5 rounded capitalize"
                style={{ backgroundColor: `${rarityColor}30`, color: rarityColor }}
              >
                {item.rarity}
              </span>
              {specs.hashrate > 0 && (
                <span className="text-xs text-mining-primary">{specs.hashrate} H/s</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div
          className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, ${rarityColor}, transparent)` }}
        />
      </div>
    );
  }

  // Empty slot
  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center
        min-h-[80px] transition-all duration-300 hover:border-gray-600 hover:bg-gray-900/30
        ${isRequired ? 'border-red-500/50 bg-red-500/5' : 'border-gray-700 bg-[#0d0d1a]'}`}
    >
      <div className={`mb-2 ${isRequired ? 'text-red-400/70' : 'text-gray-600'}`}>
        {slotIcons[slotType]}
      </div>
      <span className={`text-sm ${isRequired ? 'text-red-400/70' : 'text-gray-600'}`}>
        {slotLabels[slotType]}
      </span>
      {isRequired && (
        <span className="text-xs text-red-400 mt-1 font-medium">Required</span>
      )}
    </div>
  );
}

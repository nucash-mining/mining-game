import React from 'react';
import { parseSpecs } from '../utils/specsParser';
import { RARITY_COLORS } from '../utils/constants';
import NFTModelViewer from './NFTModelViewer';

export default function ComponentCard({ item, onClick, isSelected, availableCount, showDetails = true }) {
  const specs = parseSpecs(item.specs);
  const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

  // Generate gradient backgrounds based on rarity and type
  const getBackgroundGradient = () => {
    const gradients = {
      PC: 'from-slate-800 via-slate-700 to-slate-900',
      CPU: 'from-blue-900 via-indigo-800 to-purple-900',
      GPU: 'from-emerald-900 via-teal-800 to-cyan-900',
      Badge: 'from-amber-900 via-yellow-700 to-orange-900',
    };
    return gradients[item.type] || gradients.PC;
  };

  // SVG icons for each type (larger, more detailed)
  const typeImages = {
    PC: (
      <svg className="w-24 h-24 drop-shadow-lg" viewBox="0 0 100 100" fill="none">
        {/* Monitor */}
        <rect x="15" y="10" width="70" height="50" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2"/>
        <rect x="20" y="15" width="60" height="40" rx="2" fill="#0f172a"/>
        {/* Screen glow */}
        <rect x="22" y="17" width="56" height="36" rx="1" fill="url(#screenGlow)"/>
        {/* Stand */}
        <rect x="40" y="60" width="20" height="8" fill="#334155"/>
        <rect x="30" y="68" width="40" height="5" rx="2" fill="#475569"/>
        {/* Power LED */}
        <circle cx="50" cy="55" r="2" fill="#22c55e"/>
        <defs>
          <linearGradient id="screenGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    CPU: (
      <svg className="w-24 h-24 drop-shadow-lg" viewBox="0 0 100 100" fill="none">
        {/* CPU body */}
        <rect x="25" y="25" width="50" height="50" rx="4" fill="#1e293b" stroke="#a78bfa" strokeWidth="2"/>
        {/* Inner die */}
        <rect x="32" y="32" width="36" height="36" rx="2" fill="#0f172a"/>
        <rect x="35" y="35" width="30" height="30" rx="1" fill="url(#cpuGlow)"/>
        {/* Pins - top */}
        {[30, 40, 50, 60, 70].map((x, i) => (
          <rect key={`t${i}`} x={x-2} y="15" width="4" height="10" fill="#64748b"/>
        ))}
        {/* Pins - bottom */}
        {[30, 40, 50, 60, 70].map((x, i) => (
          <rect key={`b${i}`} x={x-2} y="75" width="4" height="10" fill="#64748b"/>
        ))}
        {/* Pins - left */}
        {[30, 40, 50, 60, 70].map((y, i) => (
          <rect key={`l${i}`} x="15" y={y-2} width="10" height="4" fill="#64748b"/>
        ))}
        {/* Pins - right */}
        {[30, 40, 50, 60, 70].map((y, i) => (
          <rect key={`r${i}`} x="75" y={y-2} width="10" height="4" fill="#64748b"/>
        ))}
        <defs>
          <linearGradient id="cpuGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    GPU: (
      <svg className="w-24 h-24 drop-shadow-lg" viewBox="0 0 100 100" fill="none">
        {/* GPU body */}
        <rect x="10" y="25" width="80" height="45" rx="4" fill="#1e293b" stroke="#10b981" strokeWidth="2"/>
        {/* Fans */}
        <circle cx="35" cy="47" r="15" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
        <circle cx="65" cy="47" r="15" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
        {/* Fan blades */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <line key={`f1${i}`} x1="35" y1="47" x2={35 + 12*Math.cos(angle*Math.PI/180)} y2={47 + 12*Math.sin(angle*Math.PI/180)} stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
        ))}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <line key={`f2${i}`} x1="65" y1="47" x2={65 + 12*Math.cos(angle*Math.PI/180)} y2={47 + 12*Math.sin(angle*Math.PI/180)} stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
        ))}
        {/* PCIe connector */}
        <rect x="20" y="70" width="60" height="8" fill="#0f172a"/>
        <rect x="25" y="72" width="50" height="4" fill="url(#gpuGlow)"/>
        {/* RGB strip */}
        <rect x="10" y="25" width="80" height="3" rx="1" fill="url(#rgbStrip)"/>
        <defs>
          <linearGradient id="gpuGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981"/>
            <stop offset="100%" stopColor="#06b6d4"/>
          </linearGradient>
          <linearGradient id="rgbStrip" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="33%" stopColor="#22c55e"/>
            <stop offset="66%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    Badge: (
      <svg className="w-24 h-24 drop-shadow-lg" viewBox="0 0 100 100" fill="none">
        {/* Outer glow */}
        <circle cx="50" cy="50" r="40" fill="url(#badgeGlow)" opacity="0.5"/>
        {/* Badge shape */}
        <path d="M50 10 L62 35 L90 40 L70 60 L75 88 L50 75 L25 88 L30 60 L10 40 L38 35 Z"
              fill="url(#badgeFill)" stroke="#fbbf24" strokeWidth="2"/>
        {/* Inner circle */}
        <circle cx="50" cy="50" r="18" fill="#0f172a" stroke="#fbbf24" strokeWidth="1"/>
        {/* Genesis text/symbol */}
        <text x="50" y="55" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">G</text>
        <defs>
          <radialGradient id="badgeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="badgeFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d"/>
            <stop offset="50%" stopColor="#f59e0b"/>
            <stop offset="100%" stopColor="#d97706"/>
          </linearGradient>
        </defs>
      </svg>
    ),
  };

  return (
    <div
      onClick={onClick}
      className={`group relative bg-[#1a1a2e] rounded-xl overflow-hidden cursor-pointer
        transition-all duration-300 hover:scale-[1.02]
        ${isSelected ? 'ring-2 ring-mining-primary scale-[1.02]' : ''}
        ${item.type === 'Badge' ? 'ring-1 ring-mining-gold/30' : 'ring-1 ring-gray-800'}`}
      style={{
        '--hover-shadow': `0 20px 25px -5px ${rarityColor}20, 0 8px 10px -6px ${rarityColor}20`,
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = e.currentTarget.style.getPropertyValue('--hover-shadow')}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Image/Visual Area */}
      <div className={`relative aspect-square bg-gradient-to-br ${getBackgroundGradient()}
        flex items-center justify-center overflow-hidden`}>

        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, ${rarityColor}40 0%, transparent 50%)`,
          }}/>
        </div>

        {/* NFT 3D Model, Video, Image, or Fallback Icon */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {item.modelUrl ? (
            // 3D Model viewer for .glb files
            <NFTModelViewer
              modelUrl={item.modelUrl}
              posterUrl={item.image}
              alt={item.name}
              className="w-full h-full"
            />
          ) : item.videoUrl ? (
            // Video for animated NFTs (like Genesis Badge)
            <video
              src={item.videoUrl}
              poster={item.image}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : item.image && !item.image.startsWith('/images/') ? (
            // Remote image (IPFS, etc.)
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          {/* Fallback SVG icon */}
          <div
            className={`transform group-hover:scale-110 transition-transform duration-300 ${
              (item.modelUrl || item.videoUrl || (item.image && !item.image.startsWith('/images/'))) ? 'hidden' : ''
            }`}
          >
            {typeImages[item.type] || typeImages.PC}
          </div>
        </div>

        {/* Quantity badge */}
        {availableCount !== undefined && availableCount > 1 && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
            <span className="text-white text-sm font-medium">x{availableCount}</span>
          </div>
        )}

        {/* Rarity badge */}
        <div
          className="absolute top-3 right-3 px-2 py-1 rounded-lg backdrop-blur-sm capitalize text-xs font-semibold"
          style={{
            backgroundColor: `${rarityColor}30`,
            color: rarityColor,
            border: `1px solid ${rarityColor}50`
          }}
        >
          {item.rarity}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
      </div>

      {/* Info Area */}
      <div className="p-4">
        {/* Collection & Name */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Mining.Game</p>
          <h4 className="font-semibold text-white text-lg truncate group-hover:text-mining-primary transition-colors">
            {item.name}
          </h4>
        </div>

        {/* Stats Grid */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-800 pt-3">
            {specs.hashrate > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Hashrate</span>
                <span className="text-mining-primary font-semibold">{specs.hashrate} H/s</span>
              </div>
            )}
            {specs.wattTokenCost > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Power</span>
                <span className="text-mining-warning font-semibold">{specs.wattTokenCost} W/hr</span>
              </div>
            )}
            {specs.stakeWeight > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Stake</span>
                <span className="text-mining-accent font-semibold">{specs.stakeWeight}</span>
              </div>
            )}
            {specs.luckBoost > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Luck</span>
                <span className="text-mining-gold font-semibold">+{specs.luckBoost}%</span>
              </div>
            )}
            {specs.efficiencyMultiplier > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Efficiency</span>
                <span className="text-green-400 font-semibold">+{specs.efficiencyMultiplier}%</span>
              </div>
            )}
            {item.type === 'Badge' && specs.hashrate === 0 && (
              <div className="col-span-2 text-center py-2">
                <span className="text-mining-gold text-sm">✨ Booster Item ✨</span>
              </div>
            )}
          </div>
        )}

        {/* Type indicator */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 capitalize">
            {item.type}
          </span>
          {item.freeMint && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400">
              Free Mint
            </span>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${rarityColor}, transparent)` }}
      />
    </div>
  );
}

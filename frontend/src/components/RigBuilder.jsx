import React, { useState, useMemo } from 'react';
import ComponentCard from './ComponentCard';
import RigSlot from './RigSlot';
import StatsPanel from './StatsPanel';
import { calculateRigStats } from '../utils/specsParser';
import { SLOT_TYPES } from '../utils/constants';

export default function RigBuilder({ inventory, hasGenesisBadge, onFreeMint }) {
  // Rig configuration state
  const [rigConfig, setRigConfig] = useState({
    pc: null,
    cpu: null,
    gpus: [null, null, null, null],
    badge: null,
  });

  // Selected inventory filter
  const [selectedType, setSelectedType] = useState('all');

  // Get all components in the rig
  const rigComponents = useMemo(() => {
    return [
      rigConfig.pc,
      rigConfig.cpu,
      ...rigConfig.gpus,
      rigConfig.badge,
    ].filter(Boolean);
  }, [rigConfig]);

  // Calculate rig stats
  const rigStats = useMemo(() => {
    return calculateRigStats(rigComponents, false);
  }, [rigComponents]);

  // Get available items (subtracting items already in rig)
  const availableItems = useMemo(() => {
    return inventory.map(item => {
      let usedCount = 0;
      if (item.type === 'PC' && rigConfig.pc?.id === item.id) usedCount++;
      if (item.type === 'CPU' && rigConfig.cpu?.id === item.id) usedCount++;
      if (item.type === 'Badge' && rigConfig.badge?.id === item.id) usedCount++;
      if (item.type === 'GPU') {
        usedCount = rigConfig.gpus.filter(g => g?.id === item.id).length;
      }
      return {
        ...item,
        availableBalance: item.balance - usedCount,
      };
    }).filter(item => item.availableBalance > 0);
  }, [inventory, rigConfig]);

  // Filter items by type (exclude Badge from inventory - it's shown separately)
  const filteredItems = useMemo(() => {
    const itemsWithoutBadge = availableItems.filter(item => item.type !== 'Badge');
    if (selectedType === 'all') return itemsWithoutBadge;
    return itemsWithoutBadge.filter(item => item.type === selectedType);
  }, [availableItems, selectedType]);

  // Handle adding component to rig
  const handleAddComponent = (item) => {
    if (item.type === 'PC') {
      setRigConfig(prev => ({ ...prev, pc: item }));
    } else if (item.type === 'CPU') {
      setRigConfig(prev => ({ ...prev, cpu: item }));
    } else if (item.type === 'Badge') {
      setRigConfig(prev => ({ ...prev, badge: item }));
    } else if (item.type === 'GPU') {
      setRigConfig(prev => {
        const emptySlot = prev.gpus.findIndex(g => g === null);
        if (emptySlot === -1) return prev; // No empty slots
        const newGpus = [...prev.gpus];
        newGpus[emptySlot] = item;
        return { ...prev, gpus: newGpus };
      });
    }
  };

  // Handle removing component from rig
  const handleRemoveComponent = (slotType, slotIndex = 0) => {
    if (slotType === 'PC') {
      setRigConfig(prev => ({ ...prev, pc: null }));
    } else if (slotType === 'CPU') {
      setRigConfig(prev => ({ ...prev, cpu: null }));
    } else if (slotType === 'Badge') {
      setRigConfig(prev => ({ ...prev, badge: null }));
    } else if (slotType === 'GPU') {
      setRigConfig(prev => {
        const newGpus = [...prev.gpus];
        newGpus[slotIndex] = null;
        return { ...prev, gpus: newGpus };
      });
    }
  };

  // Clear rig
  const handleClearRig = () => {
    setRigConfig({
      pc: null,
      cpu: null,
      gpus: [null, null, null, null],
      badge: null,
    });
  };

  // Check if user has a Gaming PC
  const hasGamingPC = inventory.some(item => item.id === 1 && item.balance > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Inventory */}
      <div className="lg:col-span-1">
        <div className="card-dark p-6 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Your NFTs</h3>
            <span className="text-sm text-gray-400">{inventory.length} items</span>
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'PC', 'CPU', 'GPU'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedType === type
                    ? 'bg-mining-primary text-mining-darker shadow-lg shadow-mining-primary/25'
                    : 'bg-[#1a1a2e] text-gray-300 hover:bg-[#252542] border border-gray-800'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>

          {/* Free mint button */}
          {!hasGamingPC && (
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-mining-accent/20 to-mining-primary/20 border border-mining-accent/30">
              <p className="text-sm text-gray-300 mb-3">
                You don't have a Gaming PC yet! Mint one for free to get started.
              </p>
              <button
                onClick={onFreeMint}
                className="w-full btn-primary bg-gradient-to-r from-mining-accent to-mining-primary hover:opacity-90 py-3"
              >
                Free Mint Gaming PC
              </button>
            </div>
          )}

          {/* NFT Grid */}
          <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <ComponentCard
                  key={`${item.id}-${index}`}
                  item={item}
                  availableCount={item.availableBalance}
                  onClick={() => handleAddComponent(item)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📦</div>
                <p>No {selectedType !== 'all' ? selectedType : ''} components available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Rig Builder */}
      <div className="lg:col-span-1">
        <div className="card-dark p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Rig Configuration</h3>
            <button
              onClick={handleClearRig}
              className="text-sm text-gray-400 hover:text-mining-danger transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Rig slots */}
          <div className="space-y-4">
            {/* PC Slot */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Base System
              </label>
              <RigSlot
                slotType="PC"
                slotIndex={0}
                item={rigConfig.pc}
                onRemove={() => handleRemoveComponent('PC')}
                isRequired={true}
              />
            </div>

            {/* CPU Slot */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Processor
              </label>
              <RigSlot
                slotType="CPU"
                slotIndex={0}
                item={rigConfig.cpu}
                onRemove={() => handleRemoveComponent('CPU')}
              />
            </div>

            {/* GPU Slots */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Graphics Cards (up to 4)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {rigConfig.gpus.map((gpu, index) => (
                  <RigSlot
                    key={index}
                    slotType="GPU"
                    slotIndex={index}
                    item={gpu}
                    onRemove={() => handleRemoveComponent('GPU', index)}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right: Stats */}
      <div className="lg:col-span-1">
        <StatsPanel stats={rigStats} />

        {/* Deploy button */}
        {rigStats.isValid && (
          <div className="mt-6">
            <button
              className="w-full btn-primary py-4 text-lg"
              onClick={() => {
                // TODO: Implement rig deployment
                alert('Rig deployment coming soon!');
              }}
            >
              Deploy Rig to Mining Pool
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              Requires WATT tokens to power your rig
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

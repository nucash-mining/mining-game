import React, { Suspense, useState, useRef, useEffect, Component } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  Grid
} from '@react-three/drei';
import * as THREE from 'three';
import { RARITY_COLORS } from '../utils/constants';

// Flag to enable/disable GLB model loading (set to false if models cause issues)
const ENABLE_GLB_LOADING = false;

/**
 * RIG SLOT LAYOUT DOCUMENTATION
 * =============================
 *
 * The 3D rig builder uses a grid-based layout:
 *
 *        Z-axis (front/back)
 *           ^
 *           |
 *   Badge   |
 *   [0,0.5,-1.5]
 *           |
 *   CPU ----+---- PC -------- GPU0  GPU2
 *   [-1.5,0,0]   [0,0,0]      [1.5,0,-0.5] [2.5,0,-0.5]
 *           |                  GPU1  GPU3
 *           |                 [1.5,0,0.5] [2.5,0,0.5]
 *           |
 *           +--------------------> X-axis (left/right)
 *
 * Slot Positions (X, Y, Z):
 *   - PC:    [0, 0, 0]       - Center position, main component
 *   - CPU:   [-1.5, 0, 0]    - Left of PC
 *   - GPU0:  [1.5, 0, -0.5]  - Right of PC, back row
 *   - GPU1:  [1.5, 0, 0.5]   - Right of PC, front row
 *   - GPU2:  [2.5, 0, -0.5]  - Far right, back row
 *   - GPU3:  [2.5, 0, 0.5]   - Far right, front row
 *   - Badge: [0, 0.5, -1.5]  - Above and behind PC
 */

// Error Boundary for 3D Canvas
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('3D Canvas Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-mining-dark">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">3D Viewer Error</h3>
            <p className="text-gray-400 mb-4">Failed to render 3D scene</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-mining-primary text-white rounded-lg hover:bg-mining-primary/80"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Placeholder box for when model fails to load
function PlaceholderModel({ item, slotPosition, scale, isSelected, onSelect }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  const rarityColor = RARITY_COLORS[item?.rarity] || '#ffffff';

  // Get color based on item type
  const typeColors = {
    PC: '#3b82f6',
    CPU: '#8b5cf6',
    GPU: '#10b981',
    Badge: '#fbbf24',
  };

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = slotPosition[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      if (hovered || isSelected) {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  return (
    <group ref={meshRef} position={slotPosition}>
      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.6 * scale, 0.8 * scale, 32]} />
          <meshBasicMaterial color={isSelected ? rarityColor : '#ffffff'} transparent opacity={0.5} />
        </mesh>
      )}

      {/* Placeholder box */}
      <mesh
        scale={scale}
        onClick={(e) => { e.stopPropagation(); onSelect(item); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); gl.domElement.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); gl.domElement.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial
          color={typeColors[item?.type] || '#666666'}
          metalness={0.5}
          roughness={0.5}
          emissive={hovered ? typeColors[item?.type] : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>

      {/* Label */}
      {hovered && (
        <Html position={[0, 1, 0]} center>
          <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border text-white text-sm whitespace-nowrap"
               style={{ borderColor: rarityColor }}>
            <span className="font-medium">{item?.name}</span>
            <span className="ml-2 text-xs capitalize" style={{ color: rarityColor }}>
              {item?.rarity}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

// Safe Model Loader - tries to load GLB, falls back to placeholder
function SafeModel({ url, item, slotPosition, scale, isSelected, onSelect }) {
  // Always use placeholder when GLB loading is disabled
  if (!ENABLE_GLB_LOADING || !url) {
    return (
      <PlaceholderModel
        item={item}
        slotPosition={slotPosition}
        scale={scale}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    );
  }

  // GLB loading is enabled but we'll still use placeholder for now
  // TODO: Re-enable when model hosting is resolved
  return (
    <PlaceholderModel
      item={item}
      slotPosition={slotPosition}
      scale={scale}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
}

// Wrapper that catches model loading errors
function ErrorBoundaryModel({ url, item, slotPosition, scale, isSelected, onSelect, onError }) {
  try {
    return (
      <DraggableModel
        url={url}
        item={item}
        slotPosition={slotPosition}
        scale={scale}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    );
  } catch (error) {
    console.error('Model load error:', error);
    onError();
    return (
      <PlaceholderModel
        item={item}
        slotPosition={slotPosition}
        scale={scale}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    );
  }
}

// Draggable 3D Model Component
function DraggableModel({
  url,
  item,
  isSelected,
  onSelect,
  slotPosition,
  scale = 1
}) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  // Load the GLB model with error handling
  const { scene } = useGLTF(url, true, true, (loader) => {
    loader.crossOrigin = 'anonymous';
  });

  // Clone the scene to avoid sharing issues
  const clonedScene = React.useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();
    // Ensure materials are properly cloned
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }, [scene]);

  // Animation for floating effect
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = slotPosition[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      if (hovered || isSelected) {
        groupRef.current.rotation.y += 0.01;
      }
    }
  });

  const rarityColor = RARITY_COLORS[item?.rarity] || '#ffffff';

  if (!clonedScene) {
    return (
      <PlaceholderModel
        item={item}
        slotPosition={slotPosition}
        scale={scale}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    );
  }

  return (
    <group
      ref={groupRef}
      position={slotPosition}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        gl.domElement.style.cursor = 'auto';
      }}
    >
      {/* Selection/hover ring */}
      {(isSelected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial
            color={isSelected ? rarityColor : '#ffffff'}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* The actual 3D model */}
      <primitive object={clonedScene} />

      {/* Label on hover */}
      {hovered && (
        <Html position={[0, 1.5, 0]} center>
          <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border text-white text-sm whitespace-nowrap"
               style={{ borderColor: rarityColor }}>
            <span className="font-medium">{item?.name}</span>
            <span className="ml-2 text-xs capitalize" style={{ color: rarityColor }}>
              {item?.rarity}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

// Fallback loading component
function ModelLoader() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-white">
        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        Loading model...
      </div>
    </Html>
  );
}

// Empty slot placeholder
function EmptySlot({ position, type, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const { gl } = useThree();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  const slotColors = {
    PC: '#3b82f6',
    CPU: '#8b5cf6',
    GPU: '#10b981',
    Badge: '#fbbf24',
  };

  return (
    <group ref={meshRef} position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => { setHovered(true); gl.domElement.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); gl.domElement.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial
          color={slotColors[type] || '#666666'}
          transparent
          opacity={hovered ? 0.5 : 0.3}
        />
      </mesh>
      <Html position={[0, 0.3, 0]} center>
        <div className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-60'
        }`} style={{
          backgroundColor: `${slotColors[type]}40`,
          color: slotColors[type],
          border: `1px solid ${slotColors[type]}`
        }}>
          + Add {type}
        </div>
      </Html>
    </group>
  );
}

// Platform/base for the rig
function RigPlatform() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <circleGeometry args={[4, 64]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
    </mesh>
  );
}

// Main 3D Scene
function Scene({
  rigConfig,
  selectedItem,
  onSelectItem,
  onSlotClick
}) {
  // Define slot positions for rig components (documented at top of file)
  const slotPositions = {
    pc: [0, 0, 0],
    cpu: [-1.5, 0, 0],
    gpu0: [1.5, 0, -0.5],
    gpu1: [1.5, 0, 0.5],
    gpu2: [2.5, 0, -0.5],
    gpu3: [2.5, 0, 0.5],
    badge: [0, 0.5, -1.5],
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.3} color="#00d4ff" />
      <pointLight position={[10, 10, -10]} intensity={0.3} color="#7c3aed" />

      {/* Platform */}
      <RigPlatform />

      {/* Simple grid lines */}
      <gridHelper args={[10, 20, '#334155', '#1e293b']} position={[0, 0.01, 0]} />

      {/* PC Slot - Center */}
      {rigConfig.pc ? (
        <Suspense fallback={<ModelLoader />}>
          <SafeModel
            url={rigConfig.pc.modelUrl}
            item={rigConfig.pc}
            isSelected={selectedItem?.id === rigConfig.pc.id}
            onSelect={onSelectItem}
            slotPosition={slotPositions.pc}
            scale={0.5}
          />
        </Suspense>
      ) : (
        <EmptySlot
          position={slotPositions.pc}
          type="PC"
          onClick={() => onSlotClick('PC')}
        />
      )}

      {/* CPU Slot - Left of PC */}
      {rigConfig.cpu ? (
        <Suspense fallback={<ModelLoader />}>
          <SafeModel
            url={rigConfig.cpu.modelUrl}
            item={rigConfig.cpu}
            isSelected={selectedItem?.id === rigConfig.cpu.id}
            onSelect={onSelectItem}
            slotPosition={slotPositions.cpu}
            scale={0.4}
          />
        </Suspense>
      ) : (
        <EmptySlot
          position={slotPositions.cpu}
          type="CPU"
          onClick={() => onSlotClick('CPU')}
        />
      )}

      {/* GPU Slots - Right of PC in 2x2 grid */}
      {rigConfig.gpus.map((gpu, index) => (
        gpu ? (
          <Suspense key={`gpu-${index}`} fallback={<ModelLoader />}>
            <SafeModel
              url={gpu.modelUrl}
              item={gpu}
              isSelected={selectedItem?.id === gpu.id}
              onSelect={onSelectItem}
              slotPosition={slotPositions[`gpu${index}`]}
              scale={0.4}
            />
          </Suspense>
        ) : (
          <EmptySlot
            key={`gpu-slot-${index}`}
            position={slotPositions[`gpu${index}`]}
            type="GPU"
            onClick={() => onSlotClick('GPU')}
          />
        )
      ))}

      {/* Badge Slot - Above and behind PC */}
      {rigConfig.badge ? (
        rigConfig.badge.modelUrl ? (
          <Suspense fallback={<ModelLoader />}>
            <SafeModel
              url={rigConfig.badge.modelUrl}
              item={rigConfig.badge}
              isSelected={selectedItem?.id === rigConfig.badge.id}
              onSelect={onSelectItem}
              slotPosition={slotPositions.badge}
              scale={0.3}
            />
          </Suspense>
        ) : (
          // Badge with video/no 3D model - show placeholder
          <PlaceholderModel
            item={rigConfig.badge}
            slotPosition={slotPositions.badge}
            scale={0.3}
            isSelected={selectedItem?.id === rigConfig.badge.id}
            onSelect={onSelectItem}
          />
        )
      ) : (
        <EmptySlot
          position={slotPositions.badge}
          type="Badge"
          onClick={() => onSlotClick('Badge')}
        />
      )}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={10}
        enablePan={false}
      />
    </>
  );
}

// Main export component
export default function RigBuilder3D({
  inventory = [],
  rigConfig = { pc: null, cpu: null, gpus: [null, null, null, null], badge: null },
  onAddComponent,
  onRemoveComponent,
  hasGenesisBadge
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleSlotClick = (type) => {
    setFilterType(type);
    setShowInventory(true);
  };

  const handleSelectFromInventory = (item) => {
    if (onAddComponent) {
      onAddComponent(item);
    }
    setShowInventory(false);
    setFilterType(null);
  };

  const handleRemoveItem = () => {
    if (selectedItem && onRemoveComponent) {
      // Find the correct slot index for GPUs
      if (selectedItem.type === 'GPU') {
        const gpuIndex = rigConfig.gpus.findIndex(g => g?.id === selectedItem.id);
        if (gpuIndex !== -1) {
          onRemoveComponent('GPU', gpuIndex);
        }
      } else {
        onRemoveComponent(selectedItem.type, 0);
      }
    }
    setSelectedItem(null);
  };

  const filteredInventory = filterType
    ? inventory.filter(item => item.type === filterType)
    : inventory;

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0f1a] to-[#1a1a2e] border border-gray-800">
      {/* 3D Canvas with Error Boundary */}
      <CanvasErrorBoundary>
        <Canvas
          key={canvasKey}
          shadows
          camera={{ position: [5, 4, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0a0f1a', 0);
          }}
        >
          <Scene
            rigConfig={rigConfig}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onSlotClick={handleSlotClick}
          />
        </Canvas>
      </CanvasErrorBoundary>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* Title & Slot Legend */}
        <div className="pointer-events-auto">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🖥️</span>
            3D Rig Builder
          </h3>
          <p className="text-sm text-gray-400 mb-2">Click slots to add components</p>

          {/* Slot Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">PC: Center</span>
            <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">CPU: Left</span>
            <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">GPU: Right (x4)</span>
            <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Badge: Back</span>
          </div>
        </div>

        {/* Controls */}
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => setShowInventory(!showInventory)}
            className="px-4 py-2 rounded-lg bg-mining-primary/20 border border-mining-primary/50 text-mining-primary hover:bg-mining-primary/30 transition-all"
          >
            📦 Inventory
          </button>
          <button
            onClick={() => setCanvasKey(k => k + 1)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
            title="Reset 3D View"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Selected Item Info */}
      {selectedItem && (
        <div className="absolute bottom-4 left-4 p-4 rounded-xl bg-black/80 backdrop-blur-sm border border-gray-700 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white">{selectedItem.name}</h4>
            <button
              onClick={handleRemoveItem}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
          <p className="text-xs capitalize" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>
            {selectedItem.rarity} {selectedItem.type}
          </p>
          {selectedItem.modelUrl && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              3D Model: Loaded
            </p>
          )}
        </div>
      )}

      {/* Inventory Panel */}
      {showInventory && (
        <div className="absolute top-16 right-4 w-80 max-h-[500px] overflow-y-auto rounded-xl bg-black/90 backdrop-blur-sm border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-white">
              {filterType ? `Select ${filterType}` : 'Inventory'}
            </h4>
            <button
              onClick={() => {
                setShowInventory(false);
                setFilterType(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Type filter */}
          {!filterType && (
            <div className="flex flex-wrap gap-2 mb-4">
              {['PC', 'CPU', 'GPU', 'Badge'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Item list */}
          <div className="space-y-2">
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => handleSelectFromInventory(item)}
                  className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer transition-all border border-transparent hover:border-mining-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${RARITY_COLORS[item.rarity]}20` }}
                    >
                      {item.type === 'PC' && '🖥️'}
                      {item.type === 'CPU' && '💻'}
                      {item.type === 'GPU' && '🎮'}
                      {item.type === 'Badge' && '🏆'}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-white text-sm">{item.name}</h5>
                      <p className="text-xs capitalize" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {item.rarity} • x{item.balance || 1}
                      </p>
                    </div>
                    {item.modelUrl ? (
                      <span className="text-xs text-green-400">3D</span>
                    ) : (
                      <span className="text-xs text-gray-500">2D</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No {filterType || 'items'} available
              </p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        <p>🖱️ Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  );
}

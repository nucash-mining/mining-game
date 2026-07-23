import React, { useEffect, useRef } from 'react';

// Import model-viewer as a web component
import '@google/model-viewer';

export default function NFTModelViewer({
  modelUrl,
  posterUrl,
  alt = 'NFT 3D Model',
  autoRotate = true,
  cameraControls = true,
  className = ''
}) {
  const modelRef = useRef(null);

  // Handle loading states
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    const handleLoad = () => {
      console.log('Model loaded:', modelUrl);
    };

    const handleError = (e) => {
      console.error('Model load error:', e);
    };

    model.addEventListener('load', handleLoad);
    model.addEventListener('error', handleError);

    return () => {
      model.removeEventListener('load', handleLoad);
      model.removeEventListener('error', handleError);
    };
  }, [modelUrl]);

  if (!modelUrl) {
    return null;
  }

  return (
    <model-viewer
      ref={modelRef}
      src={modelUrl}
      poster={posterUrl}
      alt={alt}
      auto-rotate={autoRotate ? '' : undefined}
      camera-controls={cameraControls ? '' : undefined}
      shadow-intensity="1"
      environment-image="neutral"
      exposure="0.8"
      shadow-softness="1"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        '--poster-color': 'transparent',
      }}
      className={className}
    >
      {/* Loading indicator */}
      <div slot="progress-bar" className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mining-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </model-viewer>
  );
}

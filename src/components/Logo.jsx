import React from 'react';

const Logo = ({ size = 'large' }) => {
  // Define sizes based on the requested variant
  const dimensions = size === 'large' 
    ? { width: 400, height: 100, fontSize: 48, towerScale: 1 }
    : { width: 200, height: 50, fontSize: 24, towerScale: 0.5 };

  return (
    <div className="logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Castle Tower SVG */}
      <svg 
        width={dimensions.height} 
        height={dimensions.height} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginRight: '10px' }}
      >
        {/* Tower Base */}
        <rect x="25" y="60" width="50" height="40" fill="#6D4C41" />
        
        {/* Tower Body */}
        <rect x="30" y="30" width="40" height="30" fill="#8D6E63" />
        
        {/* Tower Top */}
        <rect x="20" y="25" width="60" height="5" fill="#5D4037" />
        
        {/* Battlements (crenelations) */}
        <rect x="20" y="20" width="10" height="5" fill="#5D4037" />
        <rect x="35" y="20" width="10" height="5" fill="#5D4037" />
        <rect x="50" y="20" width="10" height="5" fill="#5D4037" />
        <rect x="65" y="20" width="10" height="5" fill="#5D4037" />
        
        {/* Door */}
        <rect x="45" y="75" width="10" height="25" fill="#3E2723" />
        
        {/* Windows */}
        <rect x="35" y="40" width="8" height="12" fill="#3E2723" rx="4" />
        <rect x="57" y="40" width="8" height="12" fill="#3E2723" rx="4" />
        
        {/* Flag */}
        <rect x="50" y="5" width="2" height="15" fill="#5D4037" />
        <path d="M52 5 L65 8 L52 12 Z" fill="#F44336" />
      </svg>
      
      {/* Text "TowerFront" */}
      <div style={{ 
        fontSize: `${dimensions.fontSize}px`, 
        fontWeight: 'bold',
        fontFamily: "'Cinzel Decorative', serif",
        color: '#3E2723',
        textShadow: '2px 2px 0px #8D6E63, 3px 3px 0px rgba(0,0,0,0.2)',
        letterSpacing: '1px'
      }}>
        TOWERFRONT
      </div>
    </div>
  );
};

export default Logo;
import React from 'react';

export default function Header({ account, chainId, isConnecting, onConnect, getNetworkName }) {
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="bg-mining-darker border-b border-mining-primary/20 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-mining-primary to-mining-secondary flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">MINING RIG BUILDER</h1>
            <p className="text-mining-primary/70 text-sm">WATTx Mining Game</p>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-4">
          {account ? (
            <>
              {/* Network Badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mining-dark border border-mining-primary/30">
                <div className={`w-2 h-2 rounded-full ${
                  chainId === 137 ? 'bg-purple-500' :
                  chainId === 2330 ? 'bg-mining-primary' :
                  'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-300">{getNetworkName()}</span>
              </div>

              {/* Address */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mining-dark border border-mining-accent/30">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-mining-accent to-mining-primary" />
                <span className="text-sm text-white font-medium">{formatAddress(account)}</span>
              </div>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

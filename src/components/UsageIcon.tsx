/**
 * UsageIcon — shows a pollen/usage icon that displays usage details.
 */

import { useState } from 'react';
import type { AccountBalance } from '../types';
import { formatPollen } from '../lib/pollenMath';

interface UsageIconProps {
  visible: boolean;
  balance: AccountBalance | null;
  lastUsage?: {
    tokensUsed: number;
    pollenSpent: number;
    model: string;
  } | null;
  onRefresh: () => void;
}

export default function UsageIcon({
  visible,
  balance,
  lastUsage,
  onRefresh,
}: UsageIconProps) {
  const [showPopover, setShowPopover] = useState(false);

  if (!visible) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1 px-2 py-1 bg-secondary border border-border rounded-md hover:bg-accent transition-colors text-sm"
        title="Usage & Balance"
      >
        <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {balance && (
          <span className="text-xs text-foreground font-mono">
            {formatPollen(balance.balance)}
          </span>
        )}
      </button>

      {showPopover && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-xl p-4 z-50">
          <h3 className="text-sm font-semibold text-popover-foreground mb-3">Usage & Balance</h3>

          {balance && (
            <div className="mb-3">
              <span className="text-xs text-muted-foreground">Pollen Balance</span>
              <div className="text-lg font-mono text-popover-foreground">
                {formatPollen(balance.balance)}
              </div>
            </div>
          )}

          {lastUsage && (
            <div className="border-t border-border pt-3 mb-3">
              <span className="text-xs text-muted-foreground">Last Generation</span>
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono text-popover-foreground">{lastUsage.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens:</span>
                  <span className="font-mono text-popover-foreground">{lastUsage.tokensUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pollen:</span>
                  <span className="font-mono text-popover-foreground">
                    {formatPollen(lastUsage.pollenSpent)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onRefresh();
              setShowPopover(false);
            }}
            className="w-full text-center text-xs text-foreground hover:underline"
          >
            Refresh balance
          </button>
        </div>
      )}
    </div>
  );
}

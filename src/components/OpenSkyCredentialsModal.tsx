import React, { useState } from 'react';
import { KeyRound, AlertCircle, X, ExternalLink, Zap, CheckCircle2, Loader2, Gauge } from 'lucide-react';

interface OpenSkyCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLiveFeed: boolean;
  onToggleLiveFeed: (enabled: boolean) => void;
  creditsRemaining: number;
  dailyAllowance: number;
  onCredentialsSaved: () => void;
}

export const OpenSkyCredentialsModal: React.FC<OpenSkyCredentialsModalProps> = ({
  isOpen,
  onClose,
  isLiveFeed,
  onToggleLiveFeed,
  creditsRemaining,
  dailyAllowance,
  onCredentialsSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };

      const res = await fetch('/api/opensky/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to validate credentials');

      setStatusMessage({
        type: 'success',
        text: 'Credentials registered. Live OpenSky mode is now primed!',
      });
      onToggleLiveFeed(true);
      onCredentialsSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save OpenSky credentials',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0B0F17] border border-cyan-500/40 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">OpenSky connection</h3>
              <p className="text-[11px] text-slate-400">Credentials and API usage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Credit Usage Notice */}
        <div className="p-4 bg-cyan-950/30 border-b border-cyan-500/20 flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Daily API allowance</span>
            </span>
            <span className="text-cyan-300 font-bold tabular-nums">
              {creditsRemaining.toLocaleString()} / {dailyAllowance.toLocaleString()} credits remaining
            </span>
          </div>

          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(5, (creditsRemaining / dailyAllowance) * 100))}%` }}
            ></div>
          </div>

          <div className="text-[11px] text-slate-300 leading-relaxed">
            OpenSky charges <strong className="text-white">1–4 credits</strong> per state query based on the visible map area. Smaller areas cost fewer credits; global views cost 4.
            Selecting an aircraft may also use the separate track credit bucket.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div className="space-y-3">
              <div className="text-[11px] text-slate-300 bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                OpenSky requires OAuth2 client credentials. Legacy username/password authentication is no longer accepted.
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">OpenSky Client ID</label>
                <input
                  type="text"
                  placeholder="e.g. my-applet-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-mono">OpenSky Client Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>
                  Generate an API Client in your{' '}
                  <a
                    href="https://opensky-network.org/my-opensky/account"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline hover:text-cyan-300"
                  >
                    OpenSky User Account Settings
                  </a>
                </span>
              </div>
          </div>

          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border border-red-500/40 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onToggleLiveFeed(!isLiveFeed);
                onClose();
              }}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to {isLiveFeed ? 'Simulated Engine' : 'Live Feeds'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save & Activate</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

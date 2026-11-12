import React, { useState } from 'react';
import { X, Lock, Key, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { AUTHORIZED_MEMBERS, StaffMember } from '../core/auth/staffDirectory.ts';
import { login } from '../core/auth/authClient.ts';
import { ApproverIdentity } from '../core/types/safety.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: ApproverIdentity) => void;
  initialUserId?: string;
  requiredRole?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialUserId = 'usr-lead-sys-01',
  requiredRole
}) => {
  const members = Object.values(AUTHORIZED_MEMBERS);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
  const [passphrase, setPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedMember: StaffMember | undefined = AUTHORIZED_MEMBERS[selectedUserId] || members[0];
  const isDirector = selectedMember?.role === 'ENGINEERING_DIRECTOR';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUserId) {
      setErrorMessage('Please select a staff member identity.');
      return;
    }

    if (!passphrase.trim()) {
      setErrorMessage('Passphrase is required. Anonymous identity assertion is prohibited.');
      return;
    }

    if (requiredRole && selectedMember?.role !== requiredRole) {
      setErrorMessage(`This operation requires the '${requiredRole}' role. Selected user holds '${selectedMember?.role}'.`);
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(selectedUserId, passphrase, selectedMember?.role);
      setPassphrase('');
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-md ${isDirector ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-teal-500/10 text-teal-400 border border-teal-500/30'}`}>
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-1.5">
                Staff Authentication
                {isDirector && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">DIRECTOR</span>}
              </h2>
              <p className="text-[11px] text-slate-400">USV-01 Digital Lab • Zero-Fabrication Access Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="Close (Continue Read-Only)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleLogin} className="p-5 space-y-4">
          {requiredRole && (
            <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Privileged action: requires <strong>{requiredRole}</strong> credentials.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Denied</p>
                <p className="text-[11px] text-rose-200 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Identity Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Staff Member Identity <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userName} ({m.userId}) — [{m.role}]
                </option>
              ))}
            </select>
          </div>

          {/* Role & Privilege Details */}
          {selectedMember && (
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">Canonical Role:</span>
                <span className="text-teal-400 font-mono font-medium">{selectedMember.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-mono">Privilege Tier:</span>
                <span className={isDirector ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                  {isDirector ? 'Level 4: Safety-Critical Gate Sign-off' : 'Level 2: Digital Lab Engineering Operations'}
                </span>
              </div>
            </div>
          )}

          {/* Passphrase Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Staff Passphrase <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassphrase ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Enter provisioned passphrase..."
                className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono"
                autoFocus
              />
            </div>
          </div>

          {/* Offline Scrypt Provisioning Notice */}
          <div className="p-2.5 rounded bg-slate-950/50 border border-slate-800/60 text-[10px] text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
            <p className="leading-relaxed">
              Passphrases are verified against the external scrypt credential store. To provision or rotate a staff credential, use terminal CLI:{' '}
              <code className="text-slate-300 font-mono">npx tsx scripts/admin/provision-staff-credential.ts &lt;userId&gt;</code>
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Continue Read-Only
            </button>
            <button
              type="submit"
              disabled={isLoading || !passphrase.trim()}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium text-white transition-all shadow-sm ${
                isDirector
                  ? 'bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600'
                  : 'bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

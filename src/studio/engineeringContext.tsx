import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * UI selection context only. No field here asserts an approved engineering baseline.
 * Authoritative revisions must come from the governed configuration system.
 */
export type EvidenceLevel = 'UNVERIFIED' | 'DRAFT' | 'ANALYZED' | 'INDEPENDENTLY_VERIFIED' | 'RELEASED';
export interface EngineeringSelection {
  projectId: string;
  candidateId: string | null;
  configurationRevision: string | null;
  componentId: string | null;
  geometryFingerprint: string | null;
  evidenceLevel: EvidenceLevel;
}
interface ContextValue {
  selection: EngineeringSelection;
  updateSelection: (patch: Partial<EngineeringSelection>) => void;
  resetGeometry: () => void;
}
export const DEFAULT_ENGINEERING_SELECTION: EngineeringSelection = {
  projectId: 'PRJ-USV-01', candidateId: null, configurationRevision: null,
  componentId: null, geometryFingerprint: null, evidenceLevel: 'UNVERIFIED'
};
const EngineeringContext = createContext<ContextValue | null>(null);

export function EngineeringContextProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<EngineeringSelection>(DEFAULT_ENGINEERING_SELECTION);
  const updateSelection = (patch: Partial<EngineeringSelection>) => setSelection(prev => ({ ...prev, ...patch }));
  const resetGeometry = () => setSelection(prev => ({
    ...prev, componentId: null, geometryFingerprint: null, evidenceLevel: 'UNVERIFIED'
  }));
  const value = useMemo(() => ({ selection, updateSelection, resetGeometry }), [selection]);
  return <EngineeringContext.Provider value={value}>{children}</EngineeringContext.Provider>;
}

export function useEngineeringContext(): ContextValue {
  const context = useContext(EngineeringContext);
  if (!context) throw new Error('EngineeringContextProvider is required');
  return context;
}

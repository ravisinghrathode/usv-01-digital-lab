/**
 * USV-01 Digital Engineering Lab — Utilities
 */

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCsv = (str: string | number) => {
    const val = String(str ?? '');
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDateTime(isoOrDateStr: string): string {
  if (!isoOrDateStr) return 'TBD';
  return isoOrDateStr;
}

export function getRiskSeverityClass(score: number): { bg: string; text: string; label: string } {
  if (score >= 15) {
    return { bg: 'bg-red-950/80 border-red-800 text-red-300', text: 'text-red-400', label: 'CRITICAL RISK' };
  }
  if (score >= 9) {
    return { bg: 'bg-amber-950/80 border-amber-800 text-amber-300', text: 'text-amber-400', label: 'HIGH RISK' };
  }
  if (score >= 4) {
    return { bg: 'bg-yellow-950/60 border-yellow-800/80 text-yellow-300', text: 'text-yellow-400', label: 'MODERATE RISK' };
  }
  return { bg: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300', text: 'text-emerald-400', label: 'LOW RISK' };
}

export function getStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'passed':
    case 'completed':
    case 'nominal':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'in review':
    case 'under review':
    case 'ready':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case 'draft':
    case 'specifying':
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
    case 'failed':
    case 'rejected':
    case 'blocked':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    case 'pending inputs':
    case 'queued':
    case 'running':
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
    case 'superseded':
    case 'archived':
    case 'mitigated':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

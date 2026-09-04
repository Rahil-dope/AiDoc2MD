export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatNumber(num: number): string {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getScoreColor(score: number): {
  text: string;
  bg: string;
  border: string;
  ring: string;
  glow: string;
} {
  if (score >= 90) {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      ring: 'stroke-emerald-500',
      glow: 'shadow-glow-emerald',
    };
  } else if (score >= 75) {
    return {
      text: 'text-brand-400',
      bg: 'bg-brand-500/10',
      border: 'border-brand-500/30',
      ring: 'stroke-brand-500',
      glow: 'shadow-glow-sm',
    };
  } else if (score >= 60) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      ring: 'stroke-amber-500',
      glow: '',
    };
  } else {
    return {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      ring: 'stroke-rose-500',
      glow: '',
    };
  }
}

export function getFileTypeInfo(ext: string): { label: string; color: string; bg: string } {
  const normalized = (ext || '').toLowerCase().replace('.', '');
  switch (normalized) {
    case 'pdf':
      return { label: 'PDF', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    case 'docx':
    case 'doc':
      return { label: 'DOCX', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'xlsx':
    case 'xls':
      return { label: 'XLSX', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'pptx':
    case 'ppt':
      return { label: 'PPTX', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    case 'csv':
      return { label: 'CSV', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return { label: 'IMAGE', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
    case 'html':
    case 'htm':
      return { label: 'HTML', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    case 'txt':
    case 'md':
      return { label: 'MARKDOWN', color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20' };
    default:
      return { label: normalized.toUpperCase() || 'FILE', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
  }
}

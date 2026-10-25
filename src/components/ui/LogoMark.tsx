export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label="TruthCap" className={className}>
      <rect width="40" height="40" rx="11" className="fill-brand-600" />
      <rect x="17.5" y="8" width="14" height="18" rx="3.5" className="fill-brand-400" />
      <rect x="8.5" y="13" width="16" height="20" rx="4" className="fill-brand-50" />
      <path d="M12.9 23.3l3.1 3.1 5.3-6" className="stroke-brand-700" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="30.5" cy="29.5" r="2.4" className="fill-accent-400" />
    </svg>
  );
}

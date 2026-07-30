import type { ExplosiveId } from "@/lib/calculators/raid/data";

/**
 * Small original icons (not Facepunch's game assets) so each explosive is recognizable at a
 * glance in the calculator — simplified silhouettes, not attempts at pixel-accurate recreations.
 */
function RocketIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <g transform="rotate(45 16 16)">
        <path d="M16 4c3 3 4 7 4 11v8h-8v-8c0-4 1-8 4-11z" fill="#8a5a3b" />
        <rect x="12" y="21" width="8" height="4" rx="1" fill="#5c3d28" />
        <path d="M12 25l-3 4h4l2-3z" fill="#3f2a1b" />
        <path d="M20 25l3 4h-4l-2-3z" fill="#3f2a1b" />
        <circle cx="16" cy="12" r="1.6" fill="#d9b48f" />
      </g>
    </svg>
  );
}

function SatchelIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <rect x="6" y="11" width="20" height="14" rx="2" fill="#2b2b2b" />
      <rect x="6" y="11" width="20" height="14" rx="2" fill="none" stroke="#555" strokeWidth="1" />
      <path d="M10 11v-2c0-2 2-3 6-3s6 1 6 3v2" fill="none" stroke="#777" strokeWidth="2" />
      <line x1="10" y1="14" x2="10" y2="22" stroke="#777" strokeWidth="1.5" />
      <line x1="22" y1="14" x2="22" y2="22" stroke="#777" strokeWidth="1.5" />
      <line x1="6" y1="18" x2="26" y2="18" stroke="#777" strokeWidth="1.5" />
    </svg>
  );
}

function C4Icon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <rect x="5" y="9" width="22" height="14" rx="1.5" fill="#c9a468" />
      <rect x="5" y="9" width="22" height="14" rx="1.5" fill="none" stroke="#8a6f45" strokeWidth="1" />
      <rect x="8" y="13" width="16" height="2" fill="#3a3a3a" />
      <rect x="8" y="17" width="16" height="2" fill="#3a3a3a" />
      <circle cx="24" cy="9" r="2" fill="#d94f3d" />
    </svg>
  );
}

function BeancanIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <path d="M14 9q-1-5 2-7" stroke="#5c4a30" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="9" y="10" width="14" height="16" rx="1" fill="#9a9a9a" />
      <ellipse cx="16" cy="10" rx="7" ry="2" fill="#b7b7b7" />
      <ellipse cx="16" cy="26" rx="7" ry="2" fill="#767676" />
      <rect x="9" y="15" width="14" height="4" fill="#e8dfc0" />
    </svg>
  );
}

function ExplosiveAmmoIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <g transform="rotate(45 16 16)">
        <rect x="12" y="6" width="8" height="16" rx="2" fill="#1c1c1c" />
        <rect x="12" y="10" width="8" height="2" fill="#c9a227" />
        <rect x="12" y="14" width="8" height="2" fill="#c9a227" />
        <path d="M12 6q4-4 8 0z" fill="#c9a227" />
        <rect x="12" y="22" width="8" height="4" fill="#caa24a" />
      </g>
    </svg>
  );
}

const ICONS: Record<ExplosiveId, () => React.JSX.Element> = {
  rocket: RocketIcon,
  satchel: SatchelIcon,
  c4: C4Icon,
  beancan: BeancanIcon,
  explosiveAmmo: ExplosiveAmmoIcon,
};

export function ExplosiveIcon({ id }: { id: ExplosiveId }) {
  const Icon = ICONS[id];
  return <Icon />;
}

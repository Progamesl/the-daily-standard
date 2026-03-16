/**
 * AdSlot — renders the first live ad for a placement.
 * Completely adblock-proof: no external ad scripts, no trackers,
 * just a native image served from the site's own CDN.
 */

import { useAds, type Ad } from '@/hooks/useAds';
import { Link } from 'react-router-dom';

interface AdSlotProps {
  placement: Ad['placement'];
  className?: string;
}

function AdCard({ ad }: { ad: Ad }) {
  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 text-center">
        Advertisement
      </p>
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`Advertisement: ${ad.advertiser}`}
        className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-95 transition-opacity shadow-sm"
      >
        <img
          src={ad.image_url}
          alt={`${ad.advertiser} advertisement`}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </a>
      <p className="text-[10px] text-slate-400 text-center mt-1">
        Sponsored by {ad.advertiser} ·{' '}
        <Link to="/advertise" className="hover:underline">Advertise with us</Link>
      </p>
    </div>
  );
}

export function AdSlot({ placement, className = '' }: AdSlotProps) {
  const { ads, loading } = useAds(placement);

  if (loading || ads.length === 0) return null;

  return (
    <div className={className}>
      <AdCard ad={ads[0]} />
    </div>
  );
}

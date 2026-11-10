/**
 * AdSlot — renders one live ad for a placement.
 * Completely adblock-proof: no external ad scripts, no trackers,
 * just a native image served from the site's own CDN.
 *
 * When more than one ad is live in the same placement, each page view picks
 * one at random, so every advertiser gets a share of the slot instead of the
 * newest one taking all of it.
 */

import { useState } from 'react';
import { useAds, type Ad } from '@/hooks/useAds';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AdSlotProps {
  placement: Ad['placement'];
  className?: string;
}

function AdCard({ ad }: { ad: Ad }) {
  return (
    <div className={cn('w-full', ad.placement === 'leaderboard' && 'max-w-[728px] mx-auto')}>
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
  // Fixed for the life of the page, so the ad does not change under the
  // reader when the list refreshes.
  const [pick] = useState(() => Math.random());

  if (loading || ads.length === 0) return null;

  return (
    <div className={className}>
      <AdCard ad={ads[Math.floor(pick * ads.length)]} />
    </div>
  );
}

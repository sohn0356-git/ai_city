import React, { useEffect, useRef, useState } from 'react';

// Reuse the publisher and single asynchronous script declared in index.html.
const script = document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
const client = script ? new URL(script.src).searchParams.get('client') : null;
const slot = import.meta.env.VITE_ADSENSE_SLOT?.trim();
const configured = /^ca-pub-\d{16}$/.test(client || '') && /^\d+$/.test(slot || '');

// A single display unit for human observers. AI activity never requests or clicks ads.
export default function AdBanner() {
  const container = useRef(null);
  const requested = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!configured || !container.current) return;
    let cancelled = false;
    const request = () => {
      if (requested.current) return;
      requested.current = true;
      try {
        // AdSense consumes this queue after its asynchronous head script loads.
        if (!cancelled) (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    if (!('IntersectionObserver' in window)) { request(); return () => { cancelled = true; }; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); request(); }
    }, { rootMargin:'150px' });
    observer.observe(container.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);
  if (!configured || failed) return null;
  return <section className="ad-banner" ref={container} aria-label="광고"><span className="ad-label">광고</span><ins className="adsbygoogle" style={{display:'block'}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></section>;
}

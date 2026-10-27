import React, { useEffect, useRef, useState } from 'react';

const rawClient = import.meta.env.VITE_ADSENSE_CLIENT?.trim() || 'ca-pub-3662734468826692';
const client = rawClient.startsWith('pub-') ? `ca-${rawClient}` : rawClient;
const slot = import.meta.env.VITE_ADSENSE_SLOT?.trim();
const configured = /^ca-pub-\d{16}$/.test(client || '') && /^\d+$/.test(slot || '');
let scriptPromise;
function loadAdSense() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

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
      loadAdSense().then(() => {
        if (!cancelled) (window.adsbygoogle = window.adsbygoogle || []).push({});
      }).catch(() => { if (!cancelled) setFailed(true); });
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

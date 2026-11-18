export function registerUpdates() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const register = async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const registration = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
      const announce = () => {
        if (registration.waiting)
          window.dispatchEvent(new CustomEvent('city-update', { detail: registration.waiting }));
      };
      announce();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
      const timer = setInterval(() => {
        if (!document.hidden) registration.update().catch(() => {});
      }, 5 * 60000);
      window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
    } catch (error) {
      console.error('PWA registration failed', error);
    }
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

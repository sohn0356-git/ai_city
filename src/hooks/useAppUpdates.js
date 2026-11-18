import { useEffect, useState } from 'react';
export default function useAppUpdates() {
  const [worker, setWorker] = useState(null);
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const update = (event) => setWorker(event.detail);
    const install = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const installed = () => setPrompt(null);
    window.addEventListener('city-update', update);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', installed);
    // A worker may already be waiting before the React subscription is installed.
    let alive = true;
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .getRegistration(import.meta.env.BASE_URL)
        .then((reg) => {
          if (alive && reg?.waiting) setWorker(reg.waiting);
        })
        .catch(() => {});
    return () => {
      alive = false;
      window.removeEventListener('city-update', update);
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  async function install() {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    }
  }
  function update() {
    if (!worker) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {
      once: true,
    });
    worker.postMessage({ type: 'SKIP_WAITING' });
  }
  return { worker, canInstall: Boolean(prompt), install, update };
}

import { useCallback, useEffect, useRef, useState } from 'react';
export default function useLife(enabled) {
  const [life, setLife] = useState(null),
    [history, setHistory] = useState([]),
    [error, setError] = useState('');
  const refreshRef = useRef(() => {});
  useEffect(() => {
    if (!enabled) return;
    let alive = true,
      controller = null;
    const refresh = async () => {
      if (controller) return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}life.json`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 404) {
          if (alive) {
            setLife(null);
            setError('');
          }
          return;
        }
        if (!response.ok) throw Error('Life unavailable');
        const value = await response.json();
        if (
          value.schemaVersion !== 1 ||
          !value.actors?.length ||
          !Array.isArray(value.logs) ||
          !value.replayActors ||
          !Number.isFinite(Date.parse(value.updatedAt))
        )
          throw Error('Invalid life snapshot');
        if (alive) {
          setLife((current) =>
            current?.revision === value.revision && current?.updatedAt === value.updatedAt
              ? current
              : value,
          );
          setError('');
        }
        const index = await fetch(`${import.meta.env.BASE_URL}life/index.json`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (index.ok) {
          const value = await index.json();
          if (alive) setHistory(value.days || []);
        }
      } catch {
        if (alive) setError('자율 세계의 최신 저장 기록을 가져오지 못했어요.');
      } finally {
        clearTimeout(timeout);
        controller = null;
      }
    };
    const visible = () => {
      if (!document.hidden) refresh();
    };
    refreshRef.current = refresh;
    refresh();
    const interval = setInterval(visible, 30000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      alive = false;
      controller?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [enabled]);
  return { life, history, error, reload: useCallback(() => refreshRef.current(), []) };
}

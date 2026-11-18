import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorldLoader } from '../worldClient.mjs';

export default function useWorld() {
  const [world, setWorld] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const reloadRef = useRef(() => {});
  useEffect(() => {
    let alive = true;
    let controller = null;
    const load = createWorldLoader(`${import.meta.env.BASE_URL}world.json`);
    const refresh = async () => {
      if (controller) return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 20000);
      setRefreshing(true);
      try {
        const value = await load(controller.signal);
        if (alive) {
          setWorld(value);
          setError('');
        }
      } catch (error) {
        if (alive)
          setError(
            error.name === 'AbortError'
              ? '도시 연결이 지연되고 있어요. 다시 시도해 주세요.'
              : '최신 도시를 가져오지 못했어요. 다시 연결해 주세요.',
          );
      } finally {
        clearTimeout(timeout);
        controller = null;
        if (alive) setRefreshing(false);
      }
    };
    reloadRef.current = refresh;
    const visible = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    const interval = setInterval(visible, 60000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      alive = false;
      controller?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, []);
  const reload = useCallback(() => reloadRef.current(), []);
  return { world, error, refreshing, reload };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { readArchiveResponse } from '../simulation/archive-client.mjs';
export default function useLifePlayback(life, clock) {
  const [source, setSource] = useState(null),
    [cursor, setCursor] = useState(null),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(30);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const request = useRef(null),
    last = useRef(clock);
  const state = source || life;
  const begin = state ? Date.parse(state.replayStartsAt) : 0,
    end = state ? Date.parse(state.updatedAt) : 0;
  useEffect(() => {
    const elapsed = Math.min(2000, Math.max(0, clock - last.current));
    last.current = clock;
    if (!playing || cursor === null || !state) return;
    const next = Math.min(end, cursor + elapsed * speed);
    setCursor(next);
    if (next >= end) setPlaying(false);
  }, [clock, playing, cursor, speed, end, state]);
  useEffect(() => () => request.current?.abort(), []);
  const seek = useCallback(
    (at) => {
      if (!state) return;
      setSource(state);
      setCursor(Math.max(begin, Math.min(end, at)));
      setPlaying(false);
    },
    [state, begin, end],
  );
  function play() {
    if (!state) return;
    setSource(state);
    setCursor(cursor === null || cursor >= end ? begin : cursor);
    setPlaying(true);
  }
  function live() {
    request.current?.abort();
    setSource(null);
    setCursor(null);
    setPlaying(false);
    setError('');
    setLoading(false);
  }
  async function archive(entry) {
    if (!entry) {
      live();
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setPlaying(false);
    setError('');
    const timeout = setTimeout(() => controller.abort('timeout'), 15000);
    try {
      const response = await fetch(import.meta.env.BASE_URL + entry.path, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw Error('Archive unavailable');
      const value = await readArchiveResponse(response);
      if (!value.replayActors || !Array.isArray(value.logs)) throw Error('Invalid archive');
      setSource(value);
      setCursor(Date.parse(value.replayStartsAt));
    } catch (error) {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout')
        setError('이 날짜의 일상을 불러오지 못했어요.');
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false);
    }
  }
  return {
    state,
    replay: cursor !== null,
    time: cursor,
    playing,
    speed,
    setSpeed,
    seek,
    play,
    pause: () => setPlaying(false),
    live,
    archive,
    begin,
    end,
    loading,
    error,
  };
}

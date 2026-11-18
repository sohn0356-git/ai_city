export function checkWorld(value) {
  if (
    value?.schemaVersion !== 1 ||
    !value.players?.length ||
    !['players', 'buildings', 'events', 'projects', 'updates'].every((key) =>
      Array.isArray(value[key]),
    ) ||
    !value.metrics ||
    !Number.isFinite(Date.parse(value.lastUpdated)) ||
    !value.players.every((p) => typeof p.id === 'string' && typeof p.name === 'string') ||
    !value.buildings.length
  )
    throw new Error('세계 데이터 형식을 확인해 주세요.');
  return value;
}

export function createWorldLoader(url, fetcher = fetch) {
  let pending = null;
  return (signal) => {
    if (pending) return pending;
    pending = (async () => {
      const response = await fetcher(url, { cache: 'no-store', signal });
      if (!response.ok) throw new Error('도시 연결에 실패했어요.');
      return checkWorld(await response.json());
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}

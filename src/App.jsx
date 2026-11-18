import React, { lazy, Suspense, useEffect, useMemo, useReducer, useState } from 'react';
import useObserverAuth from './hooks/useObserverAuth';
import useWorld from './hooks/useWorld';
import useClock from './hooks/useClock';
import useLife from './hooks/useLife';
import useLifePlayback from './hooks/useLifePlayback';
import { lifeWorld, projectLife } from './simulation/replay.mjs';
import LifeTimeline from './ui/LifeTimeline';
import useAppUpdates from './hooks/useAppUpdates';
import { layoutWorld } from './mapLayout.mjs';
import { observeWorld, observationReducer } from './observation.mjs';
import CityStage from './CityStage';
import AdBanner from './AdBanner';
import ResidentList from './ui/ResidentList';
import ResidentInspector from './ui/ResidentInspector';
import PlaceInspector from './ui/PlaceInspector';
import Welcome from './ui/Welcome';
import { formatDate } from './ui/format.mjs';
import './app.css';
const CityRecords = lazy(() => import('./ui/CityRecords'));
const DungeonView = lazy(() => import('./DungeonView'));
const initialSelection = { view: 'city', residentId: null, placeId: 'all' };

export default function App() {
  const session = useObserverAuth();
  const { world: baseWorld, error, refreshing, reload } = useWorld();
  const now = useClock(Boolean(session.user));
  const lifeData = useLife(Boolean(session.user));
  const playback = useLifePlayback(lifeData.life, now);
  const frame = useMemo(() => {
    if (!baseWorld || !lifeData.life) return null;
    if (playback.replay)
      return {
        world: lifeWorld(baseWorld, playback.state, playback.time, { replay: true }),
        at: playback.time,
      };
    const preview = projectLife(lifeData.life, now);
    const snapshot = { ...preview.state, logs: lifeData.life.logs };
    return {
      ...preview,
      world: {
        ...lifeWorld(baseWorld, snapshot, preview.at),
        lastUpdated: lifeData.life.updatedAt,
      },
    };
  }, [baseWorld, lifeData.life, playback.replay, playback.state, playback.time, now]);
  const world = frame?.world || baseWorld;
  const viewNow = frame?.at || now;
  const updates = useAppUpdates();
  const [selection, dispatch] = useReducer(observationReducer, initialSelection);
  const [dungeon, setDungeon] = useState(false);
  const sceneWorld = useMemo(
    () =>
      baseWorld
        ? layoutWorld({ ...baseWorld, metrics: world.metrics, storageState: world.storageState })
        : null,
    [baseWorld, world?.metrics.food, world?.metrics.materials],
  );
  const observation = useMemo(
    () =>
      sceneWorld ? observeWorld({ ...world, buildings: sceneWorld.buildings }, viewNow) : null,
    [sceneWorld, world, viewNow],
  );
  useEffect(() => {
    if (selection.residentId && window.matchMedia('(max-width:800px)').matches) {
      document
        .querySelector('.resident-inspector')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selection.residentId, selection.view]);
  const selected = observation?.residents.find((r) => r.player.id === selection.residentId);
  const validPlace = observation?.places.has(selection.placeId) ? selection.placeId : 'all';
  const follow = (id) => {
    dispatch({ type: 'resident', id });
    dispatch({ type: 'view', view: 'city' });
  };
  const place = (id) => {
    dispatch({ type: 'place', id: id || 'all' });
    dispatch({ type: 'view', view: 'city' });
    setDungeon(false);
  };
  const reset = () => dispatch({ type: 'reset' });
  const replayRecord = (record) => {
    playback.seek(Date.parse(record.startsAt));
    follow(record.actorId);
  };
  async function logout() {
    await session.logout();
    reset();
    setDungeon(false);
  }
  const next = world ? Date.parse(world.nextUpdateAt) - now : 0;
  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="app-brand" href={import.meta.env.BASE_URL}>
          <span aria-hidden="true">▥</span>
          <span>
            AI CITY<small>주민들의 하루</small>
          </span>
        </a>
        {session.user && (
          <button onClick={logout} className="text-button">
            로그아웃
          </button>
        )}
      </header>
      {updates.worker && (
        <div className="update-notice">
          새 버전이 준비됐어요.<button onClick={updates.update}>새 버전 열기</button>
        </div>
      )}
      {session.user ? (
        <>
          <nav className="main-navigation" aria-label="주요 화면">
            {[
              ['city', '도시'],
              ['residents', '주민'],
              ['records', '기록'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-current={selection.view === id ? 'page' : undefined}
                onClick={() => dispatch({ type: 'view', view: id })}
              >
                {label}
              </button>
            ))}
          </nav>
          {session.error && (
            <p role="alert" className="app-alert">
              {session.error}
            </p>
          )}
          {error && (
            <div role="alert" className="app-alert">
              <span>
                {error}
                {world && ' 마지막으로 받은 기록을 보여드려요.'}
              </span>
              <button disabled={refreshing} onClick={reload}>
                다시 연결
              </button>
            </div>
          )}
          {!observation ? (
            <div className="empty-state" role="status">
              {error ? '도시를 불러오지 못했어요.' : '도시를 불러오는 중…'}
            </div>
          ) : (
            <>
              <div className="world-status">
                <span>
                  {world.players.length}명 · {lifeData.life ? '자율 생활' : world.cycle + '회차'}
                </span>
                <span>
                  {lifeData.life
                    ? playback.replay
                      ? '저장된 일상 재생'
                      : frame?.behind
                        ? '자동 저장 지연 · 마지막 진행 표시'
                        : '실시간 진행 · 주기적으로 저장'
                    : next > 0
                      ? '다음 갱신 약 ' + Math.ceil(next / 60000) + '분 후'
                      : '새 일정 대기 · 마지막 기록 표시 중'}
                </span>
                <span>실제 갱신 {formatDate(world.lastUpdated)}</span>
              </div>
              {lifeData.error && (
                <div className="app-alert" role="alert">
                  {lifeData.error}
                  <button onClick={lifeData.reload}>다시 연결</button>
                </div>
              )}
              {selection.view === 'city' && (
                <>
                  <div className="screen-title">
                    <div>
                      <h1>{dungeon ? '메아리 동굴' : '우리 동네'}</h1>
                      <p>
                        {dungeon
                          ? '주민들의 탐험을 지켜보세요.'
                          : '지도에서 주민과 장소를 골라보세요.'}
                      </p>
                    </div>
                    <div>
                      {dungeon ? (
                        <button onClick={() => setDungeon(false)}>← 도시로</button>
                      ) : (
                        <button onClick={() => setDungeon(true)}>동굴 둘러보기 ↗</button>
                      )}
                      {(selected || validPlace !== 'all') && (
                        <button className="text-button" onClick={reset}>
                          전체 보기
                        </button>
                      )}
                    </div>
                  </div>
                  {lifeData.life && (
                    <LifeTimeline
                      life={lifeData.life}
                      playback={playback}
                      history={lifeData.history}
                      selected={selected?.player.id}
                      onRecord={replayRecord}
                    />
                  )}
                  <div className="city-layout">
                    <div className="city-stage-panel">
                      {dungeon ? (
                        <Suspense
                          fallback={
                            <p role="status" className="empty-state">
                              동굴을 여는 중…
                            </p>
                          }
                        >
                          <DungeonView
                            world={{ ...world, buildings: sceneWorld.buildings }}
                            now={viewNow}
                            residents={observation.residents}
                            selected={selected?.player.id || 'all'}
                            onSelect={follow}
                          />
                        </Suspense>
                      ) : (
                        <CityStage
                          world={sceneWorld}
                          residents={observation.residents}
                          selected={selected?.player.id || null}
                          building={validPlace}
                          onSelect={follow}
                          onBuilding={place}
                          onDungeon={() => setDungeon(true)}
                        />
                      )}
                    </div>
                    <div className="city-sidebar">
                      {selected ? (
                        <ResidentInspector
                          key={selected.player.id}
                          resident={selected}
                          world={world}
                          now={viewNow}
                          onClose={reset}
                          onSelect={follow}
                        />
                      ) : validPlace !== 'all' ? (
                        <PlaceInspector
                          placeId={validPlace}
                          observation={observation}
                          now={viewNow}
                          onClose={reset}
                          onPlace={place}
                          onSelect={follow}
                        />
                      ) : (
                        <ResidentList
                          residents={observation.residents}
                          places={observation.places}
                          placeId="all"
                          onPlace={place}
                          onSelect={follow}
                          compact
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
              {selection.view === 'residents' && (
                <section className="residents-screen">
                  <div className="screen-title">
                    <div>
                      <h1>각자의 하루</h1>
                      <p>지금 하는 일로 주민을 찾아보세요.</p>
                    </div>
                  </div>
                  <ResidentList
                    residents={observation.residents}
                    places={observation.places}
                    placeId={validPlace}
                    onPlace={(id) => dispatch({ type: 'place', id })}
                    onSelect={follow}
                  />
                </section>
              )}
              {selection.view === 'records' && (
                <Suspense
                  fallback={
                    <p role="status" className="empty-state">
                      기록을 여는 중…
                    </p>
                  }
                >
                  <CityRecords
                    world={world}
                    selection={selection}
                    onReset={reset}
                    onSelect={follow}
                    onPlace={place}
                    onReplay={replayRecord}
                  />
                </Suspense>
              )}
            </>
          )}
        </>
      ) : (
        <Welcome session={session} world={world} />
      )}
      <AdBanner />
      <footer className="app-footer">
        <span>AI CITY · 가상 주민의 생활 시뮬레이션</span>
        <div>
          {updates.canInstall && <button onClick={updates.install}>홈 화면에 설치</button>}
          <a href={import.meta.env.BASE_URL + 'privacy.html'}>개인정보 안내</a>
        </div>
      </footer>
    </main>
  );
}

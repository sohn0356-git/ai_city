import React, { lazy, Suspense, useMemo, useState } from 'react';
import { recentEvents } from '../observation.mjs';
import { formatDate } from './format.mjs';
const EpisodePanel = lazy(() => import('../EpisodePanel'));
const ComparisonStage = lazy(() => import('../ComparisonStage'));

export default function CityRecords({ world, selection, onReset, onSelect, onPlace, onReplay }) {
  const [tab, setTab] = useState('news');
  const [episodeOpen, setEpisodeOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const events = useMemo(
    () =>
      recentEvents(world, selection).filter(
        (e) =>
          !query.trim() ||
          [e.text, e.outcome, world.players.find((p) => p.id === e.actorId)?.name]
            .join(' ')
            .includes(query.trim()),
      ),
    [world, selection.residentId, selection.placeId, query],
  );
  const pages = Math.max(1, Math.ceil(events.length / 8));
  const index = Math.min(page, pages - 1);
  const placeName = (id) =>
    world.buildings.find((p) => p.id === id)?.name || (id === 'dungeon' ? '메아리 동굴' : '도시');
  const selectedName = world.players.find((p) => p.id === selection.residentId)?.name;
  return (
    <section className="records-screen">
      <div className="screen-title">
        <div>
          <h1>도시 기록</h1>
          <p>완료된 일과 함께 만드는 변화.</p>
        </div>
      </div>
      <div className="sub-navigation" aria-label="기록 종류">
        {[
          ['news', '최근 소식'],
          ['projects', '프로젝트'],
          ['changes', '도시 변화'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'news' && (
        <>
          <div className="records-tools">
            <label className="search-field">
              <span className="sr-only">소식 검색</span>
              <input
                type="search"
                placeholder="주민 이름 · 소식 검색"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            {(selectedName || selection.placeId !== 'all') && (
              <button
                className="filter-chip"
                onClick={() => {
                  onReset();
                  setPage(0);
                }}
              >
                {selectedName || placeName(selection.placeId)} ×
              </button>
            )}
          </div>
          <div className="news-list">
            {events.slice(index * 8, index * 8 + 8).map((e) => (
              <details className="record-item" key={e.id}>
                <summary>
                  <span className="record-meta">
                    <b>
                      {e.actorName || world.players.find((p) => p.id === e.actorId)?.name || '도시'}
                    </b>
                    <time dateTime={e.at}>{formatDate(e.at)}</time>
                  </span>
                  <span className="record-summary">{e.text}</span>
                  <span className="record-place">{placeName(e.location)} · 자세히 보기</span>
                </summary>
                <div>
                  <p>{e.text}</p>
                  <p>{e.outcome}</p>
                  {e.reason && <p className="muted">선택한 이유 · {e.reason}</p>}
                  <button
                    disabled={!world.players.some((p) => p.id === e.actorId)}
                    onClick={() => onSelect(e.actorId)}
                  >
                    이 주민 따라보기 ↗
                  </button>
                  {e.lifeRecord && onReplay && (
                    <button onClick={() => onReplay(e.lifeRecord)}>이 행동 재생 ▶</button>
                  )}
                </div>
              </details>
            ))}
          </div>
          {!events.length && <p className="empty-state">조건에 맞는 소식이 없어요.</p>}
          <div className="pagination">
            <button disabled={!index} onClick={() => setPage(index - 1)}>
              이전
            </button>
            <span>
              {index + 1} / {pages}
            </span>
            <button disabled={index + 1 >= pages} onClick={() => setPage(index + 1)}>
              다음
            </button>
          </div>
        </>
      )}
      {tab === 'projects' && (
        <div className="project-grid">
          {world.projects.map((p) => (
            <article className="project-card" key={p.id}>
              <span className="status-chip">{p.progress === 100 ? '완료' : '진행 중'}</span>
              <h2>{p.name}</h2>
              <div className="project-progress">
                <progress max="100" value={p.progress} aria-label={p.name + ' 진행률'} />
                <b>{p.progress}%</b>
              </div>
              <p>
                {p.ownerIds.map((id) => world.players.find((p) => p.id === id)?.name).join(' · ')}
              </p>
              <details>
                <summary>내용과 다음 할 일</summary>
                <p>{p.description}</p>
                <p>{p.nextStep}</p>
                <button onClick={() => onPlace(p.location)}>지도에서 보기 ↗</button>
              </details>
            </article>
          ))}
        </div>
      )}
      {tab === 'changes' && (
        <div className="change-records">
          <Suspense fallback={<p role="status">도시 기록을 여는 중…</p>}>
            <details onToggle={(e) => setEpisodeOpen(e.currentTarget.open)}>
              <summary>이번 도시의 선택</summary>
              {episodeOpen && <EpisodePanel world={world} onSelect={onSelect} />}
            </details>
            <details onToggle={(e) => setComparisonOpen(e.currentTarget.open)}>
              <summary>지난 회차와 비교</summary>
              {comparisonOpen && (
                <ComparisonStage
                  world={world.legacyWorld || world}
                  selected="all"
                  building="all"
                  onSelect={onSelect}
                  onBuilding={onPlace}
                />
              )}
            </details>
          </Suspense>
          {world.updates
            .slice(-6)
            .reverse()
            .map((u) => (
              <article key={u.cycle + '-' + u.title}>
                <small>
                  {u.cycle}회차 · {formatDate(u.at)}
                </small>
                <h2>{u.title}</h2>
                <p>{u.text}</p>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}

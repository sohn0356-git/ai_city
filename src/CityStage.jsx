import React, { useEffect, useMemo, useRef, useState } from 'react';
import TileGround, { BuildingTile } from './TileGround';
import ResidentAvatar from './ResidentAvatar';
import { layoutWorld, WIDTH, HEIGHT } from './mapLayout.mjs';
import { DUNGEON } from './activity.mjs';
import { observeWorld } from './observation.mjs';
import { useMapPinch } from './useMapPinch.mjs';

export default function CityStage({
  world: source,
  residents: providedResidents,
  selected: selection,
  building = 'all',
  onSelect,
  onBuilding,
  onDungeon,
  sceneBefore = false,
}) {
  // Comparison scenes use only their saved resident positions, never today's schedule.
  const snapshot = useMemo(
    () =>
      providedResidents
        ? null
        : observeWorld(
            layoutWorld({ ...source, activityPlans: [], queuedActivityPlans: [] }),
            Date.parse(source.lastUpdated),
          ),
    [source, providedResidents, sceneBefore],
  );
  const world = providedResidents ? source : snapshot.world;
  const residents = providedResidents || snapshot.residents;
  const selected = selection === 'all' ? null : selection;
  const viewport = useRef(null);
  const [width, setWidth] = useState(760);
  const [zoom, setZoom] = useState('fit');
  const [fitHeight, setFitHeight] = useState(() => window.innerHeight * 0.65);
  const suppressClick = useMapPinch(viewport, setZoom);
  useEffect(() => {
    const node = viewport.current;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    const resize = () => setFitHeight(window.innerHeight * 0.65);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);
  const scale = zoom === 'fit' ? Math.min(width / WIDTH, fitHeight / HEIGHT) : Number(zoom);
  const followed = residents.find((r) => r.player.id === selected);
  useEffect(() => {
    const node = viewport.current;
    if (!node || !followed || zoom === 'fit') return;
    const left = (followed.x / 100) * WIDTH * scale - node.clientWidth / 2;
    const top = (followed.y / 100) * HEIGHT * scale - node.clientHeight / 2;
    node.scrollTo({ left, top, behavior: 'smooth' });
  }, [selected, followed?.x, followed?.y, scale, zoom]);
  const present = (id) => residents.filter((r) => r.placeId === id).length;
  const opacity = (r) =>
    (selected && r.player.id !== selected) || (building !== 'all' && r.placeId !== building)
      ? 0.3
      : 1;
  return (
    <section className="observation-map" aria-label="도시 지도">
      <div className="map-toolbar">
        <span>{followed ? followed.player.name + ' 따라보기' : '주민과 장소를 눌러보세요'}</span>
        <div role="group" aria-label="지도 확대">
          {[
            ['fit', '전체'],
            ['1', '산책'],
            ['1.5', '가까이'],
          ].map(([value, label]) => (
            <button key={value} aria-pressed={zoom === value} onClick={() => setZoom(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="observation-viewport"
        ref={viewport}
        tabIndex="0"
        aria-label="도시 지도. 확대 후 스크롤로 이동"
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div style={{ width: WIDTH * scale, height: HEIGHT * scale }}>
          <div
            className="city-map visual-map tile-map observation-canvas"
            style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})` }}
          >
            <TileGround world={world} />
            {world.buildings.map((place) => (
              <button
                key={place.id}
                className={`building ${building === place.id ? 'selected' : ''}`}
                style={{ left: `${place.x}%`, top: `${place.y}%` }}
                onClick={() => onBuilding(place.id)}
                aria-label={`${place.name}, 현재 ${present(place.id)}명`}
              >
                <BuildingTile id={place.id} />
                <strong>
                  {place.name}
                  <small>{present(place.id)}명</small>
                </strong>
              </button>
            ))}
            <button
              className="dungeon-gate"
              style={{ left: `${DUNGEON.x}%`, top: `${DUNGEON.y}%` }}
              onClick={onDungeon || (() => onBuilding('dungeon'))}
            >
              <span className="dungeon-pixel" />
              <strong>메아리 동굴</strong>
              <small>현재 {present('dungeon')}명</small>
            </button>
            {residents.map((r) => (
              <button
                key={r.player.id}
                className={`map-resident ${selected === r.player.id ? 'followed' : 'compact'} ${r.waiting ? '' : r.activity?.kind || ''}`}
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  opacity: opacity(r),
                  '--walk-duration': '1s',
                }}
                onClick={() => onSelect(r.player.id)}
                aria-label={`${r.player.name}, ${r.phase}, ${r.label}`}
              >
                {selected === r.player.id && <span className="resident-bubble">{r.summary}</span>}
                <ResidentAvatar id={r.player.id} />
                <strong>{r.player.name}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="map-hint">두 손가락으로 확대 · 한 손가락으로 이동</p>
    </section>
  );
}

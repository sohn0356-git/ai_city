import React, { useEffect, useMemo, useRef, useState } from 'react';
import { bossProgress, floorUnlocked, spawnState, floorMonster, SLOTS } from './dungeonRules.mjs';
import DungeonGround from './DungeonGround';
import { caveResidentPoint, roamPoint, floorGeometry } from './dungeonMap.mjs';
import { MONSTERS } from './monsters.mjs';
import { MonsterSprite } from './MonsterBook';
import ResidentAvatar from './ResidentAvatar';
import { useMapPinch } from './useMapPinch.mjs';
import { FLOORS, floorFor } from './dungeon.mjs';
import { observeWorld } from './observation.mjs';

export default function DungeonView({
  world,
  now,
  residents: providedResidents,
  selected,
  onSelect,
}) {
  const snapshots = useMemo(
    () => providedResidents || observeWorld(world, now).residents,
    [providedResidents, world, now],
  );
  const present = snapshots.filter((r) => !r.waiting && r.activity?.kind === 'fighting');
  const followed = present.find((r) => r.player.id === selected);
  const [floor, setFloor] = useState(() =>
    floorFor(followed?.activity.plan || present[0]?.activity.plan),
  );
  const [zoom, setZoom] = useState('fit');
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(400);
  const [monster, setMonster] = useState(null);
  const viewport = useRef(null);
  const geometry = floorGeometry(floor);
  const suppress = useMapPinch(viewport, setZoom, geometry.width);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
      setHeight(entry.contentRect.height);
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (followed) setFloor(floorFor(followed.activity.plan));
  }, [selected, followed?.activity.plan.id]);
  const scale =
    zoom === 'fit' ? Math.min(width / geometry.width, height / geometry.height) : Number(zoom);
  useEffect(() => {
    if (!followed || zoom === 'fit' || floorFor(followed.activity.plan) !== floor) return;
    const p = caveResidentPoint(followed.player.id);
    viewport.current.scrollTo({
      left: p.x * 32 * scale - viewport.current.clientWidth / 2,
      top: p.y * 32 * scale - viewport.current.clientHeight / 2,
      behavior: 'smooth',
    });
  }, [selected, floor, scale, zoom, followed?.activity.plan.id]);
  const visible = present.filter((r) => floorFor(r.activity.plan) === floor);
  const boss = bossProgress(world, floor);
  const bossMonster = MONSTERS.find((m) => m.id === boss.id);
  const info = FLOORS.find((f) => f.id === floor);
  const roaming = floorUnlocked(world, floor)
    ? Array.from({ length: SLOTS }, (_, i) => ({
        id: i,
        point: roamPoint(floor, i, now),
        spawn: spawnState(world, floor, i, now),
      })).filter((r) => r.spawn.alive)
    : [];
  return (
    <section className={'dungeon-view ' + info.theme}>
      <nav aria-label="던전 층 선택">
        {FLOORS.map((f) => (
          <button
            key={f.id}
            aria-pressed={floor === f.id}
            onClick={() => {
              setFloor(f.id);
              setMonster(null);
            }}
          >
            {f.id}층{!floorUnlocked(world, f.id) ? ' · 미리보기' : ''}
          </button>
        ))}
      </nav>
      <div className="dungeon-summary">
        <h2>{info.name}</h2>
        <span className="status-chip">현재 {visible.length}명</span>
      </div>
      <div className="dungeon-map-controls" role="group" aria-label="동굴 지도 확대">
        {[
          ['fit', '전체'],
          ['0.5', '둘러보기'],
          ['1', '가까이'],
        ].map(([value, label]) => (
          <button key={value} aria-pressed={zoom === value} onClick={() => setZoom(value)}>
            {label}
          </button>
        ))}
      </div>
      <div
        className="dungeon-viewport"
        ref={viewport}
        tabIndex="0"
        aria-label="동굴 지도. 확대 후 스크롤로 이동"
        onClickCapture={(e) => {
          if (suppress.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div
          style={{
            width: geometry.width * scale,
            height: geometry.height * scale,
            position: 'relative',
          }}
        >
          <div
            className="dungeon-grid dungeon-observation"
            style={{ transform: `scale(${scale})`, width: geometry.width, height: geometry.height }}
          >
            <DungeonGround floor={floor} world={world} />
            {roaming.map((r) => (
              <button
                key={r.id}
                className="roaming-monster"
                style={{ left: r.point.x * 32, top: r.point.y * 32 }}
                onClick={() => setMonster(floorMonster(floor))}
                aria-label={floorMonster(floor).name + ' 살펴보기'}
              >
                <MonsterSprite
                  monster={floorMonster(floor)}
                  direction={roamPoint(floor, r.id, now + 1000).y < r.point.y ? 'back' : 'front'}
                />
              </button>
            ))}
            {boss.ready && !boss.defeated && floorUnlocked(world, floor) && (
              <button
                className="cave-boss"
                style={{ left: geometry.boss.x * 32, top: geometry.boss.y * 32 }}
                onClick={() => setMonster(bossMonster)}
                aria-label={boss.name + ' 살펴보기'}
              >
                <MonsterSprite monster={bossMonster} />
                <b>{boss.name}</b>
              </button>
            )}
            {visible.map((r) => {
              const pos = caveResidentPoint(r.player.id);
              return (
                <button
                  key={r.player.id}
                  className={'cave-resident ' + (r.player.id === selected ? 'focused' : '')}
                  style={{ left: pos.x * 32, top: pos.y * 32 }}
                  onClick={() => onSelect(r.player.id)}
                >
                  <ResidentAvatar id={r.player.id} />
                  <strong>{r.player.name}</strong>
                  <small>
                    {r.activity.turn?.turn || 1}턴 · HP {r.activity.turn?.hp}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {!visible.length && <p>지금 이 층에서 대련하는 주민은 없어요.</p>}
      {monster && (
        <section className="habitat-info">
          <button onClick={() => setMonster(null)}>닫기</button>
          <MonsterSprite monster={monster} />
          <h3>{monster.name}</h3>
          <p>
            HP {monster.hp} · 공격 {monster.attack} · 방어 {monster.defense}
          </p>
          <small>서식 모습을 관찰합니다. 터치로 전투나 보상이 발생하지 않아요.</small>
        </section>
      )}
      <details>
        <summary>
          {boss.name} · {boss.defeated ? '처치 완료' : boss.ready ? '출현 조건 충족' : '출현 대기'}
        </summary>
        <p>{boss.concept}</p>
        <p>
          승리 {boss.actualKills}/{boss.kills} · 참여 {boss.actualResidents}/{boss.residents}명 ·
          도전 Lv.{boss.minLevel}
        </p>
        <p>보스의 실제 승리 정산 후 다음 층이 열립니다.</p>
      </details>
      <p className="muted">
        저장된 일정에 따라 진행됩니다. 전투 결과와 보상은 세계 갱신 시 확정됩니다.
      </p>
    </section>
  );
}

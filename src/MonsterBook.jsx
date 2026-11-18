import { monsterSkills, describeSkill } from './essenceSkills.mjs';
import { bossProgress, floorUnlocked } from './dungeonRules.mjs';
import React from 'react';
import { MONSTERS, defeated } from './monsters.mjs';
export function MonsterSprite({ monster, phase = 'idle', direction = 'front' }) {
  const column =
    {
      'cave-slime': 0,
      'cave-bat': 1,
      'stone-golem': 2,
      'echo-shadow': 3,
      'lantern-warden': 4,
      'moss-salamander': 5,
      'crystal-stag': 6,
    }[monster.id] ?? 0;
  return (
    <span
      className={`monster-sprite monster-${phase}`}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}tiles/monster-directions-v16.png)`,
        backgroundSize: '700% 200%',
        backgroundPosition: `${(column / 6) * 100}% ${direction === 'back' ? 100 : 0}%`,
      }}
    />
  );
}
export default function MonsterBook({ world, selected }) {
  const player = world.players.find((p) => p.id === selected);
  const known = player ? MONSTERS.filter((m) => defeated(world, player.id, m.id)).length : 0;
  const status = (monster) => {
    if (monster.boss) {
      const boss = bossProgress(world, monster.floor);
      return boss.defeated
        ? '보스 처치 완료'
        : floorUnlocked(world, monster.floor) && boss.ready
          ? '출현 중'
          : '출현 조건 대기';
    }
    return (monster.id === 'cave-bat' && floorUnlocked(world, 3)) || monster.available
      ? '출현 중'
      : '준비 중';
  };
  return (
    <section className="monster-book">
      <h3>
        몬스터 도감{' '}
        {player && (
          <small>
            {known}/{MONSTERS.length}종 처치
          </small>
        )}
      </h3>
      <p>주민마다 종류별 최초 승리에만 XP를 얻어요.</p>
      <div className="monster-grid">
        {MONSTERS.map((monster) => (
          <details key={monster.id}>
            <summary>
              <MonsterSprite monster={monster} />
              <span>
                {monster.name}
                <small>
                  {status(monster)}
                  {player && defeated(world, player.id, monster.id) ? ' · 처치함' : ''}
                </small>
              </span>
            </summary>
            <p>
              HP {monster.hp} · 공격 {monster.attack} · 방어 {monster.defense}
            </p>
            <p>최초 처치 {monster.level}XP · 재처치 0XP</p>
            <p>
              {monster.skill} · {Math.round(monster.multiplier * 100)}% 공격
            </p>
            <p>
              패턴:{' '}
              {monster.pattern
                .map(
                  (x) =>
                    ({
                      attack: '일반 공격',
                      warn: '공격 예고',
                      skill: monster.skill,
                      rest: '휴식',
                    })[x],
                )
                .join(' → ')}
            </p>
            <h4>정수 스킬</h4>
            {monsterSkills(monster.id).map((skill) => (
              <p key={skill.id}>
                {skill.name} · {describeSkill(skill)}
              </p>
            ))}
          </details>
        ))}
      </div>
    </section>
  );
}

import React from 'react';
import { progression } from './progression.mjs';
import { describeSkill } from './essenceSkills.mjs';

export default function EssencePanel({ world, selected }) {
  const player = world.players.find((p) => p.id === selected);
  const drops = (world.essenceDrops || []).filter((d) => !player || d.ownerId === player.id);
  const absorbed = world.essenceAbsorptions || [];
  const level = player ? progression(player, []).level : null;
  const used = player && absorbed.some((a) => a.playerId === player.id && a.level === level);
  return (
    <section className="essence-panel">
      <h3>정수와 스킬</h3>
      {player && (
        <>
          <p>
            Lv.{level} 흡수권 · {used ? '사용함' : '미사용'}
          </p>
          {(player.skills || []).map((s) => (
            <p key={s.id}>
              <b>{s.name}</b>
              <br />
              <small>{describeSkill(s)}</small>
            </p>
          ))}
          {!player.skills?.length && <p>아직 습득한 스킬이 없어요.</p>}
        </>
      )}
      <details>
        <summary>정수 기록 · {drops.length}개</summary>
        {drops
          .slice(-20)
          .reverse()
          .map((d) => (
            <article key={d.id}>
              <h4>
                {d.monsterName} · {d.skill.name}
              </h4>
              <p>{describeSkill(d.skill)}</p>
              <small>{absorbed.some((a) => a.itemId === d.id) ? '흡수 완료' : '보관 중'}</small>
            </article>
          ))}
        {!drops.length && <p>아직 발견한 정수가 없어요.</p>}
      </details>
      <details>
        <summary>주민이 선택한 이유</summary>
        {(world.essenceDecisions || [])
          .filter((d) => !player || d.playerId === player.id)
          .slice(-8)
          .reverse()
          .map((d) => (
            <p key={d.id}>
              <b>{d.choice === 'absorb' ? '흡수' : '보관'}</b> · {d.reason}
            </p>
          ))}
      </details>
      <details>
        <summary>정수 규칙</summary>
        <p>
          새 정수 규칙이 적용된 전투 승리 시 5% 확률로 한 개를 발견합니다. 재처치 승리도 대상이며
          최초 처치 XP와는 별개입니다.
        </p>
        <p>
          현재 레벨마다 한 개만 흡수합니다. 지난 레벨의 빈 흡수권은 소급하지 않고, 배운 스킬은 중복
          흡수하지 않아요.
        </p>
        <p>
          흡수한 스킬은 다음 새 전투 계획부터 적용됩니다. 진행 중 전투나 저장된 결과는 바꾸지
          않습니다.
        </p>
      </details>
    </section>
  );
}

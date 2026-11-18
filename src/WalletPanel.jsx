import React from 'react';
import { balance, economy, SERVICES } from './economy.mjs';
import { formatDate } from './ui/format.mjs';

export default function WalletPanel({ world, selected }) {
  const player = world.players.find((p) => p.id === selected);
  const data = economy(world);
  const orders = data.orders.filter((o) => !player || o.playerId === player.id);
  const ledger = data.ledger.filter((t) => !player || t.from === player.id || t.to === player.id);
  const nextPlan = world.queuedActivityPlans?.find((p) => p.playerId === player?.id);
  return (
    <section className="wallet-panel">
      <h3>{player ? player.name + '의 지갑' : '마을 거래'}</h3>
      <p>
        <b>{player ? balance(world, player.id) + ' G' : '주민을 선택해 주세요'}</b> · 마을 금고{' '}
        {balance(world, 'town-treasury')} G
      </p>
      {!!orders.length && (
        <>
          <h4>주민이 맡긴 의뢰</h4>
          {orders
            .slice(-5)
            .reverse()
            .map((o) => (
              <details key={o.id}>
                <summary>
                  {SERVICES.find((s) => s.id === o.serviceId)?.name} ·{' '}
                  {o.status === 'completed' ? '완료' : '접수'}
                </summary>
                <p>
                  {o.status === 'completed'
                    ? (world.players.find((p) => p.id === o.providerId)?.name || '담당자') +
                      ' · 활동 증거 ' +
                      (o.evidenceIds?.length || 0) +
                      '건'
                    : '아직 실제 활동 결과를 확인하지 않았어요.'}
                </p>
              </details>
            ))}
        </>
      )}
      <details>
        <summary>최근 거래 · {ledger.length}건</summary>
        {ledger
          .slice(-8)
          .reverse()
          .map((t) => (
            <p key={t.id}>
              {t.kind === 'victory' ? '대련 승리' : '마을 의뢰'} · {t.amount}G<br />
              <small>{formatDate(t.at)}</small>
            </p>
          ))}
        {!ledger.length && <p>아직 거래 기록이 없어요.</p>}
      </details>
      <details>
        <summary>이용 가능한 마을 서비스</summary>
        {SERVICES.map((s) => (
          <p key={s.id}>
            {s.name} · {s.price}G
          </p>
        ))}
        <p>이용 여부는 주민이 다음 활동에서 선택해요. 접수와 실제 완료는 별도로 기록됩니다.</p>
      </details>
      {nextPlan && <p className="muted">이 주민의 다음 일정 · {formatDate(nextPlan.startsAt)}</p>}
    </section>
  );
}

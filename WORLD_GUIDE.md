# AI City 지속 운영

## 세계와 역할

사용자는 도시를 관찰한다. Firebase Google 로그인 계정은 관찰자이며 AI 주민으로 등록하지 않는다. 로그인 전에는 소개 화면만 보여주며, 주민 선택 드롭다운은 로그인한 관찰자가 특정 주민을 따라가기 위한 필터다. AI 주민은 가상의 시뮬레이션 캐릭터임을 명시한다. 사람을 흉내낸 실제 계정은 생성하지 않는다.

## 현재 저장 방식

공유 세계의 정본은 **public/world.json**, 주민 후보는 **public/roster.json**이다. Git 커밋과 Pages 배포로 모두에게 같은 세계를 제공한다. Firebase는 Google 인증에 사용하며, 세계를 Firestore에 저장했다고 표현하지 않는다. 공개 JSON은 비밀 데이터가 아니며 UI 로그인 게이트는 공개 데이터 자체의 접근 제어가 아니다. 실사용자 이름/이메일/UID/토큰은 JSON/커밋/로그에 기록하지 않는다. private 데이터나 쓰기 권한이 생기면 검증된 서버와 Firebase 보안 규칙을 먼저 설계해야 한다.

## 매 회차 진행

1. 최신 main의 world/roster/코드를 읽는다. cycle은 정확히 한 번 증가시킨다. 실제 완료시각 lastUpdated와 다음 예정시각 nextUpdateAt을 ISO UTC로 기록한다. UI는 Asia/Seoul로 표시한다. 지연을 감추지 않는다.
2. roster에서 아직 입주하지 않은 주민을 최대 5명 추가한다. 총 100명이 되면 멈춘다. 기존 id/이름/기억/관계를 보존한다. 후보의 persona를 현재 세계에 맞게 구체화해 초기 기억과 갈등, 현재 목표를 부여한다. 한 회차에 새 입주민을 포함한 모든 활성 주민을 플레이한다.
3. 각 주민의 목표, 성격, 말투, tension, memory/longTermMemory, 관계, 프로젝트와 도시 자원을 읽고 **각자 다른 선택을 추론**한다. 반복 템플릿이나 단순 난수 시뮬레이션으로 대체하지 않는다.
4. 개인별 action 이벤트를 최소 하나 기록한다. reason은 그 선택을 한 이유, outcome은 실제 세계에 생긴 결과다. 현재 행동, lastActiveCycle, 에너지(0~100), 기여 횟수, 기억과 관련 관계를 갱신한다. memory는 최근 30개를 유지하고 중요한 사실은 longTermMemory에 요약한다.
5. 대화는 주민의 말투와 과거 경험을 반영한다. event.targetId로 상대를 가리킨다. 협력뿐 아니라 온건한 의견 충돌과 이를 조정하는 과정을 넣고 다음 회차에서 그 결과를 이어간다. 대화가 있었다면 양쪽 기억이 모순되지 않아야 한다. 개발자/설계자/화가는 실제로 도시의 작업을 진전시킨다.
6. projects의 진행률은 활동의 결과만큼만 바꾸고 완료한 프로젝트는 명확히 마무리한 뒤 새 프로젝트를 제안한다. food/materials 등 자원의 생산·소비를 reason/outcome에 근거해 합리적으로 갱신한다. 숫자만 올리지 않는다.
7. UI/게임 기능/상호작용 중 하나 이상을 작고 구체적으로 개선한다. 현재 경험의 부족한 점을 판단하며 전체를 매번 재작성하지 않는다. world.updates와 CHANGELOG.md에 실제 변화만 남긴다.
8. events는 최근 600개를 유지하되 현재 회차의 각 주민 action이 모두 남아야 한다. UI는 한 번에 60개를 표시하고 주민/장소 필터로 탐색한다.
9. npm test → npm run build. 기존 .env 값을 읽거나 출력하지 않는다. CI는 ai_city Environment의 6개 Firebase 변수를 사용한다. 비밀키 추가/보안규칙 완화/인증 우회 금지.
10. 최신 Git head를 부모로 변경을 커밋한다. 기존 파일을 보존하고 force push하지 않는다. Actions 결과를 확인하고 실패한 경우 수정하거나 원인을 솔직히 보고한다.

## JSON 스키마

world: schemaVersion(1), name, cycle, lastUpdated, nextUpdateAt, targetPopulation(100), growthPerCycle(5), players[], buildings[], events[], projects[], metrics{}, updates[].

player: id, name, role, kind("ai"), persona{traits,voice,motivation,tension}, goal, quote, location(building id), mood, energy, contributions, joinedCycle, lastActiveCycle, currentAction, memory[string], longTermMemory[string], relationships[{playerId,affinity(-100~100),reason}].

event: id(고유), cycle, at(실제 완료시각 이하), type("action"/"dialogue"), actorId, targetId(선택), location, text, reason, outcome.

project: id, name, description, progress(0~100), ownerIds[], location, nextStep.

metrics: happiness(0~100), collaboration(누적 협업), food(현재 식재료), materials(현재 공동 재료).

update: cycle, at, title, text.

## 일정과 한계

ChatGPT 예약 작업이 2시간 간격으로 세계를 플레이하고 소스 개선을 수행한다. GitHub Pages 자체는 정적 호스팅이며 스스로 AI를 실행하지 않는다. 브라우저의 타이머는 새 JSON을 읽기만 하며 사용자마다 별도의 세계를 만들지 않는다. 자동화/Actions가 지연되거나 실패할 수 있으므로 예정 시각을 완료 시각처럼 표시하지 않는다. 10명부터 시작해 회차당 최대 5명씩 100명까지 늘어난다. 100명 이후에도 개별 플레이를 이어간다.

Firebase 콘솔에서 Google 제공자를 활성화하고 sohn0356-git.github.io를 승인 도메인으로 등록해야 실제 Google 로그인이 가능하다. 저장소 코드가 이 콘솔 설정을 자동으로 변경하지는 않는다.

## 광고와 AI 활동

광고는 로그인한 실제 관찰자의 화면 하단에만 표시한다. 광고 단위 ID가 없으면 하단 슬롯을 숨긴다. 사용자가 요청한 AdSense 공통 스크립트는 head에서 한 번 로드하며 별도 동적 스크립트를 추가하지 않는다. AI 주민/예약 작업/테스트는 광고 노출·클릭·자동 새로고침을 생성하지 않는다. 사용자를 클릭하도록 유도하거나 광고를 주민 행동/게임 버튼처럼 꾸미지 않는다. 매 회차 광고 슬롯을 추가하지 않는다.

## 관찰의 재미와 사건 (우선순위)

100명이라는 숫자보다 기존 주민들의 선택이 이어지는 사건의 재미를 우선한다. 첫 사건이 해결되지 않았거나 새 주민이 서사에 기여하지 못한다면 그 회차 입주를 0명으로 해도 된다. 목표 100명은 유지하며 회차당 5명은 상한이다.

world.episode는 현재 사건이다: id, number, title, summary, phase(deliberation/resolved), requiredFood, options[{id,icon,title,description,consequence}], positions[{playerId,optionId,reason}], steps[{title,description,status(done/current/pending)}], nextQuestion, result(null 또는 {optionId,summary}). 첫 사건은 축제/식량 비축/축소 축제 사이의 선택이다. 입장 변경은 개인 사건과 기억을 근거로 한다. 말만 돌리지 말고 2~3회차 안에 선택과 결과를 보여준 뒤 그 결과를 다음 사건으로 이어간다.

작업 진행 시 requiredFood/옵션의 consequence와 현재 자원 수치가 모순되지 않게 바꾼다. 이미 완료한 결과를 내세운 채 위기 문구를 계속 유지하지 않는다. 새 주민도 사건에 관련이 있으면 positions에 추가한다. 결과가 나면 phase=resolved, result와 steps를 갱신하고 실제 food/materials/관계 변화가 따라야 한다.

지도는 현재 스냅샷을 보여준다. player.previousLocation과 location(건물 id)은 실제 기록한 회차의 이전/이후 위치로 관리하고, action 이벤트에 fromLocation을 넣을 수 있다. 이동 보기 버튼은 그 회차를 재생한다. 화면에서 실시간 행동이 새로 발생하거나 모든 주민이 무작위로 떠도는 것처럼 표현하지 않는다. 선택한 주민은 지도와 개인 카드에서 같은 인물이다.

## 주민 레벨과 경험치

src/progression.mjs가 주민별 action 이벤트의 고유 회차당10XP를 계산한다. 대화/같은 회차 반복 행동은 추가 경험치가 없다. Lv1→2는30XP, 다음 레벨마다 필요량10XP증가(40,50,…). 인증한 인간 방문자는 경험치 대상이 아니다. 레벨은 관찰용 활동 성장 지표이며 식량/생산/관계/프로젝트 자동 보너스가 없다. 개인 contributions 누적값을 보존해 events600개 정리 후에도 경험치가 줄지 않게 한다. contributions는 주민별 활동 완료 회차당1만 증가시키며 같은 회차 대화/반복 행동으로 추가하지 않는다. 계산은 누적값과 현재 기록의 고유 활동 회차 수 중 큰 값을 사용한다.

## 2시간 공유 일정과 동굴 대련

세계 진행 전에 `node scripts/settle-adventures.mjs`로 이전 일정의 끝난 탐험을 정산하고, 새 회차를 기록한 뒤 src/activity.mjs의 makePlans(world, 실제갱신시각)로 activityPlans를 새로 만든다. 기존 adventureRewards와 combatXp를 삭제하지 않는다. 고유 encounterId당 한 번만 정산하며 종류별 최초 승리에만 해당 몬스터 XP 지급, 재승리/후퇴0XP, 실제 정산 XP가 주민 레벨에 합산된다. 전투 결과는 plan.combatSnapshot 능력치로 고정한다. 브라우저는 보상이나 자원을 쓰지 않는다. 구매/수확/배식 등 자원 변경은 기존 회차 기록에서만 수행하고 화면의 움직임이 추가 생산을 만들지 않는다.

일정은 이동20분/직업작업25분/동굴이동20분/대련25분/귀환20분/회복10분이다. 모든 관찰자는 같은 시각에서 같은 진행을 본다. 120분 뒤 새 지시가 늦으면 대기순찰을 하며 반복 보상을 주지 않는다. 픽셀 캐릭터 모션은 걷기/작업/대련/회복을 CSS로 표현하고 실시간 외부 AI호출은 없다. 동굴은 가상의 그림자 대련, 사망/영구손실/식량소비/재료보상은 없다. 탐험은 미래 계획이며 다음 정산 전 승리/XP를 완료로 기록하지 않는다. 과거 비교는 일정 애니메이션을 끈다.

## 몬스터 도감과 비정기 추가

몬스터는 src/monsters.mjs의 HP/레벨/공격/방어/XP/스킬/고정 pattern으로 동작한다. 주민마다 몬스터 종류별 최초 승리만 XP 지급, 같은 종류 재승리/후퇴는0XP. encounterId 중복 정산도 금지. 첫 처치 증거는 adventureRewards의 playerId+monsterId+outcome=victory이며 삭제하지 않는다. 기존 지급 XP는 회수하지 않는다. makePlans는 출현 중인 미처치 종류를 먼저 골라 계획한다. 계획 생성시 monsterSnapshot에 해당 능력치를 복사해 진행중 밸런스 변경으로 결과가 뒤집히지 않게 한다.

새 몬스터는 매 회차 의무로 늘리지 않는다. 회차마다 기존 주민의 도감 진행/레벨/전투 결과와 미해결 도시 사건을 읽고, 충분한 준비나 탐험 사건이 있을 때 비정기적으로 한 종류를 추가하거나 준비된 종류를 공개한다. 고정 N회차마다 해금하거나 단순 재색칠로 종류를 늘리지 않는다. 새 종류마다 고유 ID·능력치·스킬·공격 예고/공격/휴식 패턴·외형·모션과 의미 있는 전투/보상 검증이 필요하다. 현재 그림자·슬라임 출현, 박쥐·골렘은 도감 준비 상태이며 자동 출현하지 않는다. CSS 모션은 대기/예고/공격/휴식/쓰러짐을 표현하며 별도 방향별 이미지 프레임은 아직 없다.

## 던전 골드와 마을 의뢰
새 makePlans 일정 economyVersion1부터 승리3G,이전일정소급지급없음. scripts/settle-adventures.mjs에서끝난전투만고유거래ID로지급. XP최초처치규칙과골드는별개. src/economy.mjs의balance/ledger가정본이며임의지갑초기잔액금지. 매회차주민의골드와필요를보고카페휴식예약3G/도구점검의뢰5G중필요한것을선택,잔액부족이면미구매. orderService(world,{id,playerId,serviceId,at})로마을금고로이체하고pending주문생성.실제해당주민과서비스담당자가활동을수행한뒤에만완료기록.음식/장비판매는아직없고재고생성금지.주문ID/전투ID중복방지·거래합계대사유지.

## 경험치 초기화와 성장 v2
사용자요청으로 현재모든주민Lv1/0XP초기화. contributions·combatXp·처치원장·과거스냅샷은역사기록으로보존하되player.xpReset(cycle/contributions/combatXp)기준이전값을현재XP에서제외.다음회차활동부터10XP,새종류최초처치XP.누적기여/처치증거삭제금지,0으로되돌린XP가events로되살아나면안됨.새주민은progressionVersion2로시작. Lv1→2필요100XP,이후50씩증가,상한50. HP30+6*(Lv-1),공격8+2*(Lv-1),방어2+floor((Lv-1)/2). 현재진행중계획의전투능력치스냅샷은보존,새계획부터v2.
전투상세는world.battleLogs주민별최신100회.정산에서recordBattle로추가·오래된상세만정리. adventureRewards는최초처치/정산/생애XP대사를위한작은영구원장으로별도보존.재생은저장된턴만사용하고battle함수재계산/새보상금지.기존턴미저장전투를소급생성하지마.

## 던전 보스/계단/리젠 v1
새makePlans부터dungeonRulesVersion1로보스조건집계·층입장제한.기존일정은보존.1층그림자6승리/서로다른3명→등불지기(도전Lv2),2층슬라임8승리/3명→이끼도롱뇽(Lv3),3층박쥐10승리/3명→수정사슴(Lv5).조우확률은아직미구현.조건달성+앞층보스실제처치시출현·계획배정.보스실제승리만다음층영구개방,조건도달만으로해금금지.보스는동일회차한명만배정·첫처치뒤재출현없음.일반몬스터spawnId별실제승리정산뒤10분리젠,계획할당중복금지.던전맵잠김층선택은미리보기이며실제새일정입장아님.기존층2계획은변경안함. 방향도트v16앞/뒤14개셀사용.

## 예약 실행이 현재 일정 종료보다 빠른 경우
현재activityPlans를끝나기전에교체하지마. queuedActivityPlans는주민별현재endsAt이후시작하는다음120분계획.브라우저는queued시작시전환하고정산은양쪽에서끝난고유ID만처리.다음회차시점에기존activityPlans가끝났으면정산후queued를현재로승격하고새queued는그끝에예약해.승격전스냅샷/ID보존,중첩예약/미종료보상금지.입주민증가시각별계획누락없게검토.

## 최신 사용자 XP 규칙 v3 (이전 활동 XP 규칙보다 우선)
도시활동/대화/기여로XP지급금지.주민별새종류최초승리만몬스터level정수만큼지급(Lv1=1XP,Lv3=3XP).반복승리/후퇴0XP.각몬스터xp필드도level과동일하게유지하고정산은저장된몬스터스냅샷level로계산.기존처치증거/기억/골드보존.사용자요청으로22회차까지의모든주민표시XP다시0으로초기화,player.progressionVersion3과xpReset.combatXp기준점사용.새주민도version3.기여횟수는세계활동기록일뿐성장재료가아님.초기화이전전투정산원장을삭제하거나다시보상하지마.기존Lv성장필요량/능력치식은유지.

## 23회차 성장 막힘 수정 (v3 최신 우선)
v3의 레벨별 필요XP는1,2,3,…(Lv1→2=1, Lv2→3=2), 상한50. 최초 종류별 몬스터level만 지급하는 규칙에서100XP 요구가 첫보스 도전조건을 막던 문제를 수정했다. 기존v1/v2전투 스냅샷 계산은 변경하지 않는다. 현재XP나 원장을 추가 지급/초기화하지 않는다.
서비스 완료는 completeService의 고객/담당자 action 증거2건과 장소·현재회차·시각 확인이 필요하다. 카페 회차2건, 도구점검1건 상한. 접수 때만 골드이체, 완료 때 이중지출없음. 음식·장비 실재고 판매는 아직 미구현.


## 주민별120분 단계계획 v2 (26회차부터)
새 일정은 plan.scheduleVersion=2,steps[]를 가진다. 각 step은 kind(walking/working/resting/fighting),startsAt,endsAt,placeId,label,partnerIds,정지point 또는 walking의from/to/path 좌표를 저장한다. src/planSteps.mjs의validateSteps가120분 연속구간·장소·상대·경로·단일전투스냅샷을 검증한다. 직업/상황에 따라 도시전용과 탐험 일정을 개별 작성하며 전원을 강제로전투시키지 않는다. makePlans는 기존 스냅샷 시드 생성용이며 새 계획은 직접steps를 구성하고validateSteps후저장하라. 도시전용은encounterId/monsterSnapshot/보상필드 제거,settle은완료표시만하고XP/골드/전투로그를생성하지않는다. 진행중legacy일정계산과스냅샷은그대로유지한다. queued가이미시작했다면현재로승격하고그뒤에새queued를입력한다. currentAction은계획검토행동이며미래수확/구매/전투완료를뜻하지않는다. 지도·건물입장·던전은activityState의같은step을읽는다. PlanTimeline에주민별단계/상대/시각/목적표시. 현재전투중보스와같은보스를새예약에서중복배정하지마라. 좌표는layoutWorld의건물좌표기준이다.

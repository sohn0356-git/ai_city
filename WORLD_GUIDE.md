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

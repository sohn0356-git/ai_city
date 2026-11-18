# AGENTS.md — AI City 개발 지침

이 파일은 저장소 전체에서 작업하는 코딩 에이전트를 위한 안내다. 명시적인 사용자 요청을 우선하며, 하위 경로에 별도 AGENTS.md가 생기면 해당 범위의 지침도 읽는다.

## 제품의 중심

- AI City는 가상의 AI 주민들이 일하고, 이웃을 만나고, 탐험하는 **관찰형 웹게임**이다. Google 로그인 방문자는 관찰자이며 주민이 아니다.
- 사용자가 보고 싶은 것은 긴 설명보다 **누가, 어디서, 무엇을 하는지**다. 지도 → 현재 행동 → 짧은 최근 소식 순으로 보여준다.
- 주민 선택은 지도와 개인 상태에 같은 인물을 연결한다. 기억·관계·일정·탐험·프로젝트의 상세 설명은 필요할 때 펼쳐본다.
- 세계 갱신이 늦으면 대기 상태와 실제 갱신 시각을 보여준다. 연출이나 예정 결과를 실제 완료처럼 표현하지 않는다.

## 먼저 확인할 문서

- 실행·설정: [README.md](README.md), [package.json](package.json), [.github/workflows/deploy.yml](.github/workflows/deploy.yml).
- 화면 원칙: [DESIGN.md](DESIGN.md). 최신 사용자 요청은 지도와 주민 생활 중심의 간결한 화면이다.
- 세계 진행·정산 작업: [WORLD_GUIDE.md](WORLD_GUIDE.md)의 관련 절과 해당 구현·테스트를 함께 읽는다.
- WORLD_GUIDE.md는 변경 이력이 누적된 문서다. XP v1/v2 등 과거 규칙을 현재 규칙으로 복원하지 않는다. 충돌 시 최신 사용자 요청과 문서의 최신 개정 절을 확인하고, 구현과 불일치는 명시한다.
- UI·광고·문서 수정만 요청받았다면 세계 회차 진행, 입주, 자원 변경, 탐험 정산을 함께 실행하지 않는다.

## 실행과 검증

Node.js 22.12 이상과 npm을 사용한다. 잠금 파일은 package-lock.json이다.

| 목적 | 명령 |
| --- | --- |
| 의존성 설치 | `npm ci` |
| 로컬 개발 | `npm run dev` → `/ai_city/` |
| 전체 단위 테스트 | `npm test` |
| 특정 테스트 | `node --test scripts/plan-end.test.mjs` 등 실제 해당 파일 |
| 세계 데이터 검증 | `node scripts/validate-world.mjs` |
| 타일 검증 | `node scripts/check-tiles.mjs` |
| 빌드 | `npm run build` |
| 빌드 미리보기 | `npm run preview` → `/ai_city/` |

- 코드·게임 데이터 변경은 관련 테스트를 먼저 확인하고, 완료 전 `npm test`와 `npm run build`를 실행한다.
- 빌드는 타일·CI 환경변수·세계 무결성 검사, Vite 빌드, 서비스 워커 생성을 포함한다. lint/typecheck 전용 스크립트는 현재 없으므로 실행했다고 보고하지 않는다.
- 문서만 수정하면 명령·파일 경로·기존 지침과의 일관성을 검토한다. 문서 확인을 위해 세계를 갱신하거나 정산할 필요는 없다.
- 환경 제약으로 로컬 실행이 안 되면 사용 가능한 CI로 검증하고, 로컬에서 확인하지 못한 내용을 구분해 보고한다.
- 게임 규칙 변경에는 의미 있는 회귀 테스트를 추가한다. 단순 문구·스타일 수정에 구현을 그대로 따라 하는 테스트를 만들지 않는다.

## 코드 지도

| 경로 | 역할 |
| --- | --- |
| `src/main.jsx`, `src/App.jsx`, `src/app.css`, `src/style.css` | 앱 시작, 도시·주민·기록 화면 조합과 스타일 |
| `src/hooks/`, `src/worldClient.mjs` | 인증·세계 연결·공유 시계·PWA와 요청 병합 |
| `src/observation.mjs`, `src/ui/` | 공통 현재 상태·선택 전이·검색과 기능별 화면 |
| `src/CityStage.jsx`, `src/TileGround.jsx`, `src/mapLayout.mjs` | 도시 무대, 타일, 좌표 배치 |
| `src/ComparisonStage.jsx` | 저장된 회차 상태 비교 |
| `src/activity.mjs`, `src/planSteps.mjs` | 공유 시각에 따른 활동·경로·단계 계산 |
| `src/DungeonView.jsx`, `src/dungeonRules.mjs`, `src/monsters.mjs` | 던전 표시와 전투·출현 규칙 |
| `src/progression.mjs`, `src/economy.mjs`, `src/essences.mjs` | 성장, 거래, 정수 원장과 검증 |
| `src/combatHistory.mjs`, `src/BattleReplay.jsx` | 확정 전투 기록과 재생 |
| `src/firebase.js`, `src/AdBanner.jsx` | Firebase 초기화와 광고 영역 |
| `public/world.json`, `public/roster.json` | 공유 세계 정본과 주민 후보 |
| `public/tiles/`, `public/maps/` | 배포되는 스프라이트·타일·맵 자료 |
| `scripts/*.test.mjs`, `scripts/validate-world.mjs` | 규칙 회귀 테스트와 세계 무결성 검사 |
| `scripts/build-sw.mjs` | 빌드 결과로 서비스 워커 생성 |

## 구현 원칙

- React 함수 컴포넌트와 JavaScript ES modules를 따른다. 규칙·계산은 가능한 한 순수한 `.mjs` 모듈에 두고 JSX는 표시와 상호작용을 담당한다.
- 기존 모듈을 재사용한다. 같은 XP·전투·활동·잔액 계산을 UI에 다시 구현하지 않는다.
- 변경은 요청 범위에 맞게 작게 유지한다. 거대한 JSX·압축된 한 줄 코드를 더 늘리지 말고, 새로 복잡해지는 화면은 책임별 컴포넌트로 분리한다.
- 주민·건물·사건은 안정적인 ID를 사용한다. 배열 순서나 이름을 영구 식별자로 쓰지 않는다.
- 이미지·JSON·링크 경로는 `import.meta.env.BASE_URL` 또는 기존 경로 도우미를 사용한다. 루트 `/` 배포라고 가정하지 않는다.
- 타이머·이벤트 구독·Observer는 정리 함수를 둔다. 선택 변경이나 재렌더마다 중복 fetch·광고 요청·타이머를 만들지 않는다.
- 새 의존성은 기존 도구로 해결하기 어려운 경우에만 추가하고 package-lock.json도 갱신한다.
- 새 외부 에셋은 재배포 가능한 라이선스와 출처를 확인한다. 생성 파일 `dist/`나 빌드된 `sw.js`를 수동 수정하지 않는다.

## 세계와 시간의 불변 조건

- 공유 세계는 Git의 공개 JSON이고 Firebase는 현재 인증에 사용한다. Pages나 브라우저 타이머가 자율적으로 AI를 실행하거나 세계를 저장한다고 설명하지 않는다.
- 저장 시각은 ISO UTC, 화면 시각은 기존 Asia/Seoul 표시를 따른다. 예정 시각, 일정 진행, 결과 확인 대기, 실제 정산 완료를 구분한다.
- 지도·건물·던전·주민 상태는 `activityState`와 같은 일정 데이터를 읽는다. 화면마다 서로 다른 현재 위치·행동을 만들어내지 않는다.
- `activityPlans`와 `queuedActivityPlans`의 승격은 주민별 시작·종료 시각으로 판단한다. 첫 주민의 시각으로 전원을 바꾸지 않는다.
- 진행 중인 계획의 ID·능력치·몬스터·스킬 스냅샷과 이미 저장된 예약은 보존한다. 새 규칙은 새 계획부터 적용한다.
- 새 단계 계획은 `validateSteps`로 120분 연속 구간·경로·장소·상대를 검증한다. 전투 없는 도시 일정에 전투 보상을 만들지 않는다.
- `node scripts/settle-adventures.mjs`는 **world.json을 수정하는 작업**이다. 읽기 전용 검사 명령처럼 실행하지 않는다.
- 고유 조우·거래·드롭 ID의 중복 처리를 막고, 재접속·재생·반복 정산이 보상을 늘리지 않게 한다.
- `adventureRewards`, 거래 원장, `essenceDrops/essenceAbsorptions/essenceDecisions`, XP 초기화 기준점은 역사 기록이다. UI 수정이나 오류 회피를 위해 삭제·초기화하지 않는다.
- 현재 성장 v3는 도시 활동 XP 없이 주민별 몬스터 종류 최초 승리의 level만 XP로 지급한다. 필요 XP는 1, 2, 3, …이며 상한 Lv.50이다. 상세 계산은 progression.mjs와 테스트를 사용한다.
- 전투 재생은 저장된 턴을 표시한다. 과거 전투를 새 능력치로 다시 계산하거나 미완료 승리·수확·협업을 완료 사실로 기록하지 않는다.

## 화면과 플레이 확인

- 모바일에서도 지도, 주민 선택, 현재 행동이 먼저 보이게 한다. 보조 글자는 최소 12px, 주요 본문은 14px을 기준으로 하고 터치 대상은 44px 이상을 확보한다.
- 긴 기록은 요약·더 보기·상세 펼침으로 정리한다. 핵심 정보가 hover에만 의존하지 않게 하고 버튼 이름·선택 상태·키보드 포커스를 제공한다.
- UI 변경 시 가능하면 모바일/데스크톱에서 로그인 전후, JSON 로딩·실패, 주민 선택/전체 복귀, 지도 확대·이동, 상세 열기·닫기를 직접 확인한다.
- 시간·정산 변경 시 일정 경계, 주민별 다른 시작 시각, 예약 전환, 반복 정산, 재생 불변성을 확인한다.
- 자동 화면 테스트에서는 광고 요청을 차단/모킹한다. 실제 광고 클릭이나 반복 노출로 테스트하지 않는다.
- 브라우저에서 직접 실행하지 못했다면 빌드 통과만으로 화면·로그인·실제 광고가 검증됐다고 말하지 않는다.

## 인증·광고·배포

- 공개 JSON과 클라이언트 로그인 게이트는 비밀 데이터 접근 통제가 아니다. 실사용자 이메일·UID·토큰·서비스 계정 키를 JSON·소스·로그에 넣지 않는다.
- Firebase 승인 도메인·Google 제공자 설정과 보안 규칙을 구분한다. 로그인 문제를 인증 우회나 규칙 완화로 해결하지 않는다.
- 기존 .env 값을 출력하지 않는다. CI는 `ai_city` Environment의 6개 Firebase 변수를 사용하며 누락 검사를 끄거나 가짜 값으로 통과시키지 않는다.
- 현재 광고는 사용자 요청에 따라 **로그인 전 첫 화면과 로그인 후 하단의 공통 영역 1개**다. index.html의 공통 스크립트를 중복 삽입하지 않는다.
- 광고 게시자 설정은 index.html, 광고 단위 설정은 AdBanner.jsx와 VITE_ADSENSE_SLOT를 확인한다. 광고 승인·송출은 코드 배포와 별개이며 빈칸만으로 원인을 단정하지 않는다.
- 광고는 AI 주민 행동·세계 갱신과 연결하지 않는다. 클릭 유도, 자동 클릭, 주기적 광고 새로고침을 구현하지 않는다.
- main 푸시는 Deploy AI City 워크플로로 테스트·빌드 후 GitHub Pages에 배포된다. 배포 주소는 `https://sohn0356-git.github.io/ai_city/`다.
- 기존 사용자 변경을 보존하고 최신 head 기준으로 커밋한다. force push로 이력을 덮어쓰지 않는다.
- 게임 규칙·운영·디자인을 바꾸면 관련 문서도 최신 상태로 맞춘다. 완료 보고는 변경 내용, 검증 결과, 커밋/배포 링크와 확인하지 못한 사항을 짧게 적는다.

## 작성 참고

아래 자료의 구조와 검증 관점을 참고해 AI City에 맞게 작성했다. 외부 프로젝트의 엔진·스킬·명령은 이 저장소의 요구사항이 아니다.

- [AGENTS.md 공식 안내](https://agents.md/): 저장소별 실행·검증·규칙을 담는 안내 형식.
- [Game Forge AGENTS.md](https://github.com/npmiaman/game-forge/blob/main/AGENTS.md): 브라우저게임의 코드 지도와 실행·플레이 확인 방식.
- [Agentic Gamedev Games AGENTS.md](https://github.com/abagames/agentic-gamedev-games/blob/main/AGENTS.md): 핵심 경험을 먼저 검증하고 실제 확인 범위를 정직하게 보고하는 관점.

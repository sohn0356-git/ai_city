# AI City

각자의 페르소나와 기억을 가진 AI 주민들이 사는 관찰형 도시 게임입니다. Google 로그인한 방문자는 관찰자로 도시 지도/활동/관계/프로젝트를 보며, AI 주민을 드롭다운으로 선택합니다. 공유 세계는 Git 기반 공개 JSON, 인증은 Firebase Authentication입니다. 운영은 WORLD_GUIDE.md를 참고하세요.

## GitHub 배포

1. Settings → Environments → **ai_city**에 아래 6개 항목을 Variables 또는 Secrets로 등록합니다. 같은 이름이 양쪽에 있으면 Secrets가 우선합니다.
2. Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 지정합니다.
3. main 푸시 또는 Actions → Deploy AI City → Run workflow로 배포합니다.

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

변수 누락 시 빌드를 중단하며, 누락한 변수 이름만 로그에 표시합니다. 값은 로그에 출력하지 않습니다. Firebase 웹 설정은 빌드된 JavaScript에서 공개됩니다. 서비스 계정/private_key는 이 변수에 넣지 마세요. 데이터 접근은 Firebase 인증과 보안 규칙으로 제한해야 합니다.

빌드 job이 ai_city Environment를 사용합니다. 배포 job은 GitHub Pages의 github-pages Environment를 별도로 사용합니다. ai_city에 브랜치 제한/승인 규칙이 있다면 main을 허용해야 합니다.

배포 주소: https://sohn0356-git.github.io/ai_city/

## 로컬 개발

Node.js 22.12 이상을 사용합니다.

```sh
npm ci
cp .env.example .env.local
# .env.local에 Firebase 콘솔의 웹 앱 설정값 입력
npm run dev
```

```sh
npm run build
npm run preview
```

로컬 주소도 /ai_city/ 경로를 사용합니다. 실제 환경변수 값은 커밋하지 마세요. package-lock.json을 포함하며 배포와 로컬 모두 npm ci로 동일한 의존성을 설치합니다.

## Firebase 사용

src/firebase.js에서 app, auth, db(Firestore), storage를 내보냅니다. 초기화 성공은 Firebase 서버 데이터 접근 성공을 의미하지 않습니다. Google 로그인을 사용하려면 Firebase Authentication → Settings → Authorized domains에 sohn0356-git.github.io를 등록하고, 사용할 로그인 제공자와 Firestore/Storage 규칙을 설정하세요. Google 로그인 구현은 포함되어 있지만 콘솔의 Google 제공자 활성화/승인 도메인 설정은 별도로 필요합니다. 이 프로젝트는 Firebase 보안 규칙이나 기존 데이터를 변경하지 않습니다.

## PWA

Android Chrome에서는 앱 설치, iPhone Safari에서는 공유 → 홈 화면에 추가를 사용합니다. 서비스 워커는 프로덕션 빌드에서만 등록되며 /ai_city/의 정적 앱 파일만 캐시합니다. Firebase 요청/사용자 데이터는 캐시하지 않습니다. 새 버전은 기존 앱 탭을 모두 닫은 후 다시 열면 적용됩니다. 앱 화면은 오프라인에서도 열 수 있지만 온라인 게임 데이터에는 연결이 필요합니다.

## 의존성 유지

Firestore의 Node.js 전용 전이 의존성 @grpc/grpc-js는 보안 패치를 위해 1.14 이상으로 override합니다. 브라우저에서는 해당 gRPC 코드를 사용하지 않습니다.

## 광고 연결 (선택)

관찰 화면 하단의 반응형 디스플레이 광고 1개를 준비했습니다. ai_city Environment의 Variables 또는 Secrets에 아래 값을 넣고 재배포하면 활성화됩니다.

- VITE_ADSENSE_CLIENT: AdSense 게시자 ID (`ca-pub-` 뒤 숫자 16자리)
- VITE_ADSENSE_SLOT: 생성한 반응형 디스플레이 광고 단위의 숫자 ID

두 값이 없거나 형식이 잘못되면 광고 영역/외부 광고 스크립트를 로드하지 않습니다. 광고는 로그인한 실제 관찰자가 영역 근처로 스크롤했을 때 한 번 요청합니다. 2시간 회차나 세계 데이터 갱신은 광고를 새로 요청하지 않습니다. AI 주민/예약 작업은 광고 노출이나 클릭을 생성하지 않아야 합니다.

실제 광고 송출에는 AdSense 사이트 승인과 계정에서 요구하는 게시 설정이 필요합니다. 코드 추가가 승인/수익을 보장하지 않습니다. ads.txt가 요구되는 경우 `https://sohn0356-git.github.io/ads.txt`라는 도메인 루트에 본인 게시자 ID로 게시해야 합니다. 이 저장소의 `/ai_city/ads.txt`는 루트 파일을 대신하지 않습니다. 루트는 별도 `sohn0356-git.github.io` 저장소 또는 사용자 지정 도메인에서 관리할 수 있습니다. 대상 지역에 필요한 동의/개인정보 안내는 광고 활성화 전에 AdSense 안내에 따라 준비하세요.

## 게시자 ID

사용자가 제공한 게시자 ID는 `pub-3662734468826692`이며 광고 태그에는 `ca-pub-3662734468826692`를 사용하도록 기본값을 설정했습니다. Environment에 VITE_ADSENSE_CLIENT가 있으면 그 값을 우선하며 `pub-` 형식도 자동 변환합니다. 광고 단위 ID VITE_ADSENSE_SLOT는 아직 별도로 필요합니다. 이 설정은 해당 계정의 소유권이나 사이트 승인이 확인됐다는 의미가 아닙니다.

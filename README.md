# AI City

React + Vite 웹게임의 기본 프로젝트입니다. Firebase SDK 초기화, GitHub Pages 배포, 모바일 PWA 설치 및 앱 화면 오프라인 캐시를 제공합니다. 게임 기능과 로그인/데이터 저장 로직은 아직 포함하지 않습니다.

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

src/firebase.js에서 app, auth, db(Firestore), storage를 내보냅니다. 초기화 성공은 Firebase 서버 데이터 접근 성공을 의미하지 않습니다. 로그인 기능을 추가할 때 Firebase Authentication → Settings → Authorized domains에 sohn0356-git.github.io를 등록하고, 사용할 로그인 제공자와 Firestore/Storage 규칙을 설정하세요. 이 프로젝트는 Firebase 보안 규칙이나 기존 데이터를 변경하지 않습니다.

## PWA

Android Chrome에서는 앱 설치, iPhone Safari에서는 공유 → 홈 화면에 추가를 사용합니다. 서비스 워커는 프로덕션 빌드에서만 등록되며 /ai_city/의 정적 앱 파일만 캐시합니다. Firebase 요청/사용자 데이터는 캐시하지 않습니다. 새 버전은 기존 앱 탭을 모두 닫은 후 다시 열면 적용됩니다. 앱 화면은 오프라인에서도 열 수 있지만 온라인 게임 데이터에는 연결이 필요합니다.

## 의존성 유지

Firestore의 Node.js 전용 전이 의존성 @grpc/grpc-js는 보안 패치를 위해 1.14 이상으로 override합니다. 브라우저에서는 해당 gRPC 코드를 사용하지 않습니다.

# AI City 32px tile set · v1

AI City 전용으로 새로 생성한 도트 타일셋 첫 시안입니다. 외부 게임의 타일/캐릭터/상표는 포함하지 않습니다.

- `ai-city-v1.png`: 256×256 PNG, 32×32 타일 64개, 8열×8행, margin/spacing 0.
- `../maps/ai-city-v1.tsj`: Tiled 외부 타일셋. 타일 이름과 0부터 시작하는 ID 포함.
- `../maps/tile-demo.tmj`: 24×18칸, orthogonal, 지형/시설 두 레이어의 조합 샘플. Tiled에서 열 수 있습니다.
- `../tile-preview.html`: 브라우저 샘플 지도·배율 전환·타일 선택 도감. Pages 프로젝트 경로를 기준으로 상대 URL을 사용합니다.

각 타일은 배경 포함형입니다. 시설은 풀 배경 위에 그려져 있어 도로/물 위 배치에는 투명화/별도 접합 타일 작업이 필요합니다. 물가 자동 접합의 모든 방향과 건물별 다중 타일/충돌 영역/주민 스프라이트는 아직 없습니다. 원본 아트의 픽셀 결을 유지해 nearest-neighbor 방식으로 256×256에 패킹했습니다. 실제 관찰 화면에는 타일 지형·건물과 세계 상태 연동 시설이 연결됐습니다. 이 아트 변경은 세계 회차를 진행시키지 않습니다. 샘플 지도는 실제 주민/시설/재고 상태가 아닙니다.

## 그림체와 생성 기록

내장 이미지 생성 도구로 제작. 32px 논리 격자의 8×8 atlas, top-down RPG, sage green/ochre/terracotta/deep teal, 위 왼쪽 광원, 글자/격자선/여백 없음으로 요청했습니다. 원본을 게임 규격으로 정규화했으며 별도 외부 라이선스 타일셋은 사용하지 않았습니다.

요청한 구성(각 행 왼쪽부터):

1. grass, grass-flowers, grass-dark, dirt, soil, soil-dry, stone, sand
2. water-deep, water-shallow, shore-n, shore-e, shore-s, shore-w, shore-nw, shore-se
3. path-v, path-h, path-cross, path-nw, path-ne, path-se, path-sw, stepping-stones
4. plot-bare, plot-seedling, plot-green, plot-wilted, plot-ripe, water-barrel, bucket-full, bucket-empty
5. shelf-empty, shelf-full, shelf-frame, crate-one, crate-two, timber, fence-h, fence-v
6. cottage, workshop, cafe, library, market, shed, hall, studio
7. tree-wide, tree-tall, shrub, flowerbed, bench, noticeboard, lamp, water-bike
8. relay, ramp, fountain, well, bridge-h, bridge-v, cones, bowls

## 사용

Canvas `imageSmoothingEnabled=false`, CSS `image-rendering:pixelated`로 확대합니다. Tiled의 GID는 타일 ID+1이며 0은 빈칸입니다. `tsj` 이미지 경로는 타일셋 파일 기준, `tmj` 타일셋 경로는 지도 파일 기준입니다.

## Furniture v3 — 가구 4종

32px,2×2,64×64 PNG. 내장 이미지 생성으로 위왼쪽 광원·황토 목재·세이지/틸 팔레트·투명배경·공동 식탁/기록 책상/휴식 벤치/빈 벌통을 요청하고 nearest 패킹. ID0/1/2는 기존 가구 표현, ID3 벌통은 자산만 준비. 새 가구 생산·벌 입주·꿀 수확을 뜻하지 않음. 도감에4종 표시.

## Records v4
32px·2×2·64px PNG. 내장 이미지 생성 요청: 위왼쪽 광원, 세이지/황토/틸, 투명 배경, 시간 장부·선별판·천 건조대·씨앗 도구. nearest 패킹. ID0은 측정 기록 표지,2는 기존 건조 자리의 표현으로 게임 연결.1/3은 자산만 준비. 새 타이머 제작이나 씨앗 재고 증가를 뜻하지 않음.

## Handoff v5
32px·2×2·64px. 내장 이미지 생성: 위왼쪽 광원, 세이지/황토/틸, 투명 배경, 자리 표시 발판·받침대·금지 표지·빈 손수레. nearest 패킹. ID0/2는 기존 중계 표시와 금지 상태 표현으로 연결.1/3은 자산만 준비. 새 운반수단 제작이나 경사 개방을 뜻하지 않음.

## Construction v6
32px·2×2·64px PNG. 내장 이미지 생성: 위왼쪽 광원, 황토목재/세이지/틸, 투명배경, 미완성 골조·목재와 톱·공사 차단·완성 선반을 요청. nearest 패킹. ID0/2만 게임 연결. 완성 선반 그림은 자산 준비이며 실제 완공/용량 증가가 아니다.

## Inspection v7
32px·2×2·64px PNG. 내장 이미지 생성 요청: 투명 배경, 위왼쪽 광원, 황토/세이지/틸, 시험대기 선반·시험추·꽃 구획·마른 줄기. nearest 패킹. ID0/2를 실제 설치90%와 기존 관찰된 꽃 표현에 연결. ID1/3자산만 준비. 새 꽃 생산이나 하중 시험 완료를 뜻하지 않음.

## Resident v8 — 은아
32px·2×2·64px. 내장 이미지 생성: 동일한 허구 극작가, 짧은 갈색머리/틸재킷/황토바지, 투명 배경·위왼쪽 광원·단단한 픽셀, 정면수첩/뒤수첩/측면말하기/앉아읽기4포즈 요청. nearest 패킹. ID0만 p020정면으로 연결, 나머지 자산 준비. 실제 낭독 완료나 임의 실시간 행동을 뜻하지 않음.

## Reading v9
32px·2×2·64px. 내장 이미지 생성: 위왼쪽광원·황토/세이지/틸·투명배경·원고와깃펜/악보대/접은커튼/악기와의자 요청. nearest 패킹. ID0은실제검토본표지로연결,나머지는자산준비. 새소품제작·무대설치·공연완료를뜻하지않음.

## Musician v10 — 이준
32px·2×2·64px. 내장 이미지 생성 요청: 같은허구음악가,짧은검은머리·황토조끼·세이지셔츠,투명배경·위왼쪽광원,정면악기/뒤악기/측면연주/앉아휴식. nearest패킹. ID0만p009정면연결,나머지는자산준비. 실시간연주애니메이션아님.

## Monsters v11
32px·2×2·64px. 내장 이미지 생성: 투명배경·위왼쪽광원·세이지/틸/황토·단단한픽셀, 슬라임/박쥐/골렘/그림자 서로다른4종 요청. nearest패킹. 도감4종 표시, 그림자/슬라임만 출현. 모션은 CSS, 별도방향별프레임 아님.

### residents-v12.png
imagegen generated 5×5 atlas,160×160 RGBA,32px cells. Row-major p001–p021(index0–20),21–23 blank,24 dungeon entrance. 직업별복장/머리/도구를 구분한정면외형,별도보행프레임없음. 생성프롬프트:21직업별주민과이끼낀석조동굴입구,투명5×5격자,따뜻한제한색상·좌상단광원. 기존 시트 유지.

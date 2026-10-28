# AI City 32px tile set · v1

AI City 전용으로 새로 생성한 도트 타일셋 첫 시안입니다. 외부 게임의 타일/캐릭터/상표는 포함하지 않습니다.

- `ai-city-v1.png`: 256×256 PNG, 32×32 타일 64개, 8열×8행, margin/spacing 0.
- `../maps/ai-city-v1.tsj`: Tiled 외부 타일셋. 타일 이름과 0부터 시작하는 ID 포함.
- `../maps/tile-demo.tmj`: 24×18칸, orthogonal, 지형/시설 두 레이어의 조합 샘플. Tiled에서 열 수 있습니다.
- `../tile-preview.html`: 브라우저 샘플 지도·배율 전환·타일 선택 도감. Pages 프로젝트 경로를 기준으로 상대 URL을 사용합니다.

각 타일은 배경 포함형입니다. 시설은 풀 배경 위에 그려져 있어 도로/물 위 배치에는 투명화/별도 접합 타일 작업이 필요합니다. 물가 자동 접합의 모든 방향과 건물별 다중 타일/충돌 영역/주민 스프라이트는 아직 없습니다. 원본 아트의 픽셀 결을 유지해 nearest-neighbor 방식으로 256×256에 패킹했습니다. 현재 게임 지도 교체나 세계 회차 갱신은 포함하지 않습니다. 샘플 지도는 실제 주민/시설/재고 상태가 아닙니다.

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

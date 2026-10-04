# 🎰 Slot Palace 30

**30종의 서로 다른 HTML5 카지노 슬롯머신.** 빌드 과정·외부 라이브러리 없이 순수 HTML/CSS/JavaScript(Canvas + Web Audio)로 만들었습니다.
[johakr/html5-slot-machine](https://github.com/johakr/html5-slot-machine)에서 영감을 받아, 최신 온라인 슬롯 형식으로 새로 작성했습니다.

> 가상 코인 전용 데모입니다. 실제 돈은 사용되지 않습니다.

## 실행 방법

`index.html`을 브라우저로 열기만 하면 됩니다 (빌드 불필요). 로컬 서버로 띄우려면:

```bash
python3 -m http.server 8080   # → http://localhost:8080
```

GitHub Pages 등 정적 호스팅에 그대로 올려도 동작합니다.

## 특징

- **30가지 게임 형식** — 3릴 클래식, 1라인 클래식, 5×3 / 5×4 / 4×4 페이라인, 243 / 1,024 / 3,125 / 4,096 웨이즈, 메가웨이즈(최대 117,649 웨이즈), 클러스터 페이(6×6 / 7×7 / 8×8), 어디서나 페이(6×5 텀블).
- **보너스 기능** — 프리스핀(재트리거), 홀드 앤 윈(MINI/MINOR/MAJOR/GRAND 잭팟), 보너스 휠, 확장 와일드, 스티키 와일드, 배수 와일드, 와일드 릴, 캐스케이드 배수 사다리, 무한 상승 배수, 배수 폭탄(누적 배수).
- **사운드 전부 실시간 합성 (Web Audio)**
  - 머신마다 다른 **배경 음악 30종**(신스웨이브, 로커빌리, 이집트, 중국풍, 칩튠, 재즈 라운지, 스윙, 보사노바, 켈틱 지그, 뱃노래, 테크노, 로파이, 오케스트라 등). 시드 기반으로 멜로디를 만들고 프리스핀에서는 템포와 조성이 올라갑니다.
  - **카지노 분위기음** — 웅성거림, 멀리서 들리는 다른 슬롯 징글, 코인 떨어지는 소리, 당첨 벨.
  - **효과음** — 레버/스핀, 릴 회전 틱, 릴 정지, 스캐터 착지, 기대감 연출(드럼롤), 당첨 아르페지오, 코인, 캐스케이드 팝, 빅윈 팡파르, 휠 틱, 잭팟 벨. 음색은 머신 테마 악기를 따릅니다.
- **비주얼** — WebGL 셰이더 배경 12종(성운·오로라·신스웨이브·수중 커스틱·용암·실크·갓레이·보케·연기·플라즈마·매트릭스·워프), 절차적으로 그린 심볼(메탈 로열, 컷 보석, 광택 구슬, 클래식 BAR/7, 와일드·스캐터 배지, 잭팟 코인), 메탈 베젤과 체이스 라이트, 글래스 컨트롤 독, 머신별 포스터 아트 로비.
- **레버 스핀** — 15종은 캐비닛 오른쪽 레버를 잡아당겨 스핀합니다(탭해도 자동으로 당겨짐). 나머지는 SPIN 버튼. AUTO·TURBO는 공통.
- **연출** — 릴 중앙 정지 섬광, 릴 창 정중앙 당첨 배너와 중앙 폭발, 모션블러·바운스 릴, 특수 심볼 착지 팝, 에너지 테두리 기대감, 그려지는 에너지 빔 페이라인, 당첨 심볼 오라·샤인 스윕, 보석 파편 텀블, 번개 와일드 릴과 대형 확장 와일드, BIG / MEGA / EPIC / LEGENDARY 4단계 빅윈, 3D 회전 코인·스트릭·충격파.
- **편의 기능** — 터보, 자동 스핀(10~∞), 스핀 중 탭하여 즉시 정지, 스페이스바 스핀, 배당표·페이라인 도감, 사운드 개별 on/off, 잔액 자동 저장, 코인 부족 시 무료 충전, 모바일 대응.
- **수학 모델** — `tools/simulate.js`로 머신마다 수십만 라운드를 시뮬레이션해 보정한 결과, 이론 RTP는 약 96%입니다 (`js/calibration.js`).

## 기획서

비주얼·모션·사운드 시스템과 30종 머신별 컨셉·시그니처는 [`DESIGN.md`](DESIGN.md)에 정리되어 있습니다.

## 머신 목록

| # | 머신 | 그리드 | 방식 | 기능 | 배경 | 음악 |
|---|---|---|---|---|---|---|
| 1 | 네온 나이트 <br><sub>Neon Nights</sub> | 5×3 | 20 라인 | 프리스핀, 확장 와일드 | synthsun | synthwave |
| 2 | 클래식 777 <br><sub>Classic 777</sub> | 3×3 | 5 라인 | 배수 와일드 | rays | rockabilly |
| 3 | 파라오의 보물 <br><sub>Pharaoh's Treasure</sub> | 5×3 | 10 라인 | 프리스핀 | rays | egypt |
| 4 | 드래곤 포춘 <br><sub>Dragon Fortune</sub> | 5×3 | 243 웨이즈 | 홀드 앤 윈 | smoke | chinese |
| 5 | 스위트 캔디 <br><sub>Sweet Candy Burst</sub> | 6×5 | 스캐터 페이(어디서나) | 프리스핀, 캐스케이드/텀블, 배수 폭탄 | silk | kawaii |
| 6 | 오션 딥 <br><sub>Ocean Deep</sub> | 5×4 | 1,024 웨이즈 | 프리스핀 | caustics | ambient |
| 7 | 갤럭시 메가웨이즈 <br><sub>Galaxy Megaways</sub> | 6×2~7 | 메가웨이즈 | 프리스핀 | nebula | space |
| 8 | 바이킹 레이드 <br><sub>Viking Raid</sub> | 5×4 | 40 라인 | 프리스핀, 스티키 와일드 | aurora | epic |
| 9 | 사쿠라 드림 <br><sub>Sakura Dream</sub> | 5×3 | 25 라인 | 프리스핀, 와일드 릴 | silk | japanese |
| 10 | 와일드 웨스트 <br><sub>Wild West Wheel</sub> | 5×3 | 15 라인 | 보너스 휠 | rays | western |
| 11 | 정글 젬즈 <br><sub>Jungle Gems</sub> | 7×7 | 클러스터 페이 | 프리스핀, 캐스케이드/텀블 | bokeh | tribal |
| 12 | 핫 칠리 링크 <br><sub>Hot Chilli Link</sub> | 3×3 | 8 라인 | 홀드 앤 윈 | lava | mariachi |
| 13 | 아이스 퀸 <br><sub>Ice Queen</sub> | 5×3 | 20 라인 | 프리스핀, 캐스케이드/텀블 | aurora | musicbox |
| 14 | 해적의 보물 <br><sub>Pirate's Plunder</sub> | 5×3 | 243 웨이즈 | 보너스 휠 | smoke | shanty |
| 15 | 요정의 숲 <br><sub>Fairy Forest</sub> | 5×3 | 30 라인 | 프리스핀, 확장 와일드 | bokeh | fairy |
| 16 | 몬스터 파티 <br><sub>Monster Party</sub> | 5×4 | 30 라인 | 프리스핀, 배수 와일드 | smoke | spooky |
| 17 | 골드 러시 <br><sub>Gold Rush 4096</sub> | 6×4 | 4,096 웨이즈 | 홀드 앤 윈 | bokeh | bluegrass |
| 18 | 럭키 클로버 <br><sub>Lucky Clover</sub> | 5×3 | 20 라인 | 보너스 휠, 배수 와일드 | rays | celtic |
| 19 | 사이버 매트릭스 <br><sub>Cyber Matrix</sub> | 8×8 | 클러스터 페이 | 프리스핀, 무한 배수 캐스케이드 | matrix | techno |
| 20 | 다이아몬드 디럭스 <br><sub>Diamond Deluxe</sub> | 3×1 | 1 라인 | 배수 와일드 | silk | lounge |
| 21 | 올림푸스의 신 <br><sub>Gates of Olympus</sub> | 6×5 | 스캐터 페이(어디서나) | 프리스핀, 캐스케이드/텀블, 배수 폭탄 | rays | orchestral |
| 22 | 아즈텍 골드 <br><sub>Aztec Gold Megaways</sub> | 6×2~7 | 메가웨이즈 | 프리스핀, 캐스케이드/텀블 | tunnel | aztec |
| 23 | 디스코 피버 <br><sub>Disco Fever</sub> | 5×3 | 243 웨이즈 | 프리스핀, 와일드 릴 | plasma | disco |
| 24 | 버블 팝 <br><sub>Bubble Pop</sub> | 6×6 | 클러스터 페이 | 프리스핀, 캐스케이드/텀블 | caustics | lofi |
| 25 | 로얄 카지노 <br><sub>Royal Casino</sub> | 5×4 | 50 라인 | 프리스핀, 배수 와일드 | silk | swing |
| 26 | 판다 뱀부 <br><sub>Panda Bamboo</sub> | 5×3 | 25 라인 | 홀드 앤 윈 | bokeh | zen |
| 27 | 쥬라기 잭팟 <br><sub>Jurassic Jackpot</sub> | 5×5 | 3,125 웨이즈 | 프리스핀, 와일드 릴 | smoke | adventure |
| 28 | 레트로 아케이드 <br><sub>Retro Arcade</sub> | 4×4 | 20 라인 | 프리스핀, 캐스케이드/텀블 | tunnel | chiptune |
| 29 | 산타의 선물 <br><sub>Santa's Gifts</sub> | 5×3 | 20 라인 | 프리스핀, 스티키 와일드 | bokeh | christmas |
| 30 | 볼케이노 러시 <br><sub>Volcano Rush</sub> | 6×2~7 | 메가웨이즈 | 프리스핀, 무한 배수 캐스케이드 | lava | darkdrums |

## 구조

```
index.html          로비 + 게임 화면
css/style.css       UI 스타일 (테마 색상은 CSS 변수)
js/util.js          공용 유틸
js/engine.js        슬롯 수학 엔진: 그리드 생성, 라인/웨이즈/클러스터/스캐터 판정, 캐스케이드, 홀드 앤 윈, 휠
js/machines.js      30종 머신 정의 (심볼, 형식, 기능, 테마, 음악)
js/calibration.js   RTP 보정값 (tools/simulate.js 로 생성)
js/audio.js         신시사이저, 드럼, 생성형 음악 시퀀서, 카지노 분위기음, 효과음
js/art.js           심볼 아트 엔진 (로열·보석·구슬·배지·코인·포스터)
js/bg.js            WebGL 셰이더 배경 12종
js/fx.js            환경 파티클 + 축하 파티클
js/render.js        캔버스 릴 렌더러 (회전, 하이라이트, 페이라인, 텀블, 홀드 앤 윈)
js/game.js          게임 진행 (스핀 흐름, 보너스, 오버레이, 배당표)
js/app.js           로비, 라우팅(#/play/<id>), 지갑, 사운드 설정
tools/simulate.js   RTP 시뮬레이터: node tools/simulate.js 150000 --write
```

## 새 머신 추가

`js/machines.js`에 항목을 하나 추가하고(심볼은 낮은 등급 → 높은 등급 순서) `node tools/simulate.js 150000 --write`를 실행해 배당 보정값을 다시 만들면 됩니다.

## 크레딧

심볼은 시스템 이모지 폰트로 그리고, 글꼴은 Google Fonts를 사용합니다. 원본 아이디어: [johakr/html5-slot-machine](https://github.com/johakr/html5-slot-machine) (MIT).

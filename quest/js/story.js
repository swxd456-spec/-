/* 행운의 궁전 — story, episodes, cutscene scripts, quests and achievements.

   Premise: every slot machine in the Palace of Fortune is a door to a "luck world". Their luck flows into the
   palace's Star Clock (별시계). The shadow magician 녹턴 tore out its 12 star pieces, so each world has sunk into
   shadow, and when the clock hits midnight all luck disappears. Lumi, a clumsy apprentice guardian fox, travels
   through the 12 worlds (one per clock hour), befriends a hero in each and wins the piece back from a shadow boss.
   Twist (ep 9–10): 녹턴 was hiding the pieces from the real thief, the Mirror of Greed that eats luck.
   After ep 12 a new season starts ("새벽 시즌") with the same worlds remixed and harder. */
(function (root) {
  // cutscene shot: { cast: [[id, pos 'l'|'c'|'r', expr, enter?]], who, text, fx?, bg? }
  const EPISODES = [
    {
      id: 'neon', title: '네온 시티의 밤', en: 'NEON CITY', hour: 1, n: 15, machines: ['neon-nights', 'retro-arcade', 'disco-fever', 'cyber-matrix'],
      friend: null, boss: 'boss_neon', bossGame: 'match3', unlock: ['match3', 'shisen', 'stack', 'diff'],
      intro: [
        { cast: [['lumi', 'c', 'surprised', 'bottom']], who: 'lumi', text: '여기가… 슬롯머신 속 세계? 네온사인이 하나도 안 켜져 있어!' },
        { cast: [['lumi', 'l', 'sad'], ['minion', 'r', 'smile', 'right']], who: 'minion', text: '그림자 그림자~ 이 도시의 행운은 전부 우리 거다!', fx: 'dark' },
        { cast: [['lumi', 'l', 'angry'], ['minion', 'r', 'surprised']], who: 'lumi', text: '견습 수호자 루미가 왔다! 별조각, 돌려받겠어!', fx: 'flash' },
      ],
      outro: [
        { cast: [['boss_neon', 'c', 'sad']], who: 'boss_neon', text: '크윽… 스페이드 잭이 겨우 여우한테 지다니…', fx: 'shake' },
        { cast: [['lumi', 'c', 'joy', 'bottom']], who: 'lumi', text: '첫 번째 별조각이다! 별시계가 한 칸 돌아갔어!', fx: 'stars' },
        { cast: [['lumi', 'l', 'smile'], ['nocturne', 'r', 'smug', 'right']], who: 'nocturne', text: '후후, 제법이군 꼬마 여우. 하지만 아직 열한 조각이나 남았지.', fx: 'dark' },
      ],
    },
    {
      id: 'candy', title: '녹아내린 캔디 왕국', en: 'CANDY KINGDOM', hour: 2, n: 18, machines: ['sweet-candy', 'bubble-pop', 'lucky-clover'],
      friend: 'toto', boss: 'boss_candy', bossGame: 'bubble', unlock: ['bubble'],
      intro: [
        { cast: [['toto', 'c', 'sad', 'bottom']], who: 'toto', text: '흑흑… 그림자 마녀가 사탕을 전부 쓴맛으로 바꿔 버렸어요…' },
        { cast: [['lumi', 'l', 'smile', 'left'], ['toto', 'r', 'surprised']], who: 'lumi', text: '울지 마! 내가 도와줄게. 근데… 너 누구야?' },
        { cast: [['lumi', 'l', 'joy'], ['toto', 'r', 'joy']], who: 'toto', text: '왕실 제과사 토토예요! 같이 가요, 루미 언니!', fx: 'stars' },
      ],
      outro: [
        { cast: [['boss_candy', 'c', 'sad']], who: 'boss_candy', text: '내 쓴맛 버블이… 다 터져 버렸어…', fx: 'shake' },
        { cast: [['toto', 'l', 'joy'], ['lumi', 'r', 'joy']], who: 'toto', text: '사탕이 다시 달콤해졌어요! 이건 고마움의 컵케이크예요!', fx: 'stars' },
      ],
    },
    {
      id: 'sea', title: '가라앉은 산호 바다', en: 'CORAL SEA', hour: 3, n: 20, machines: ['ocean-deep', 'pirate-gold', 'viking-raid'],
      friend: 'pingu', boss: 'boss_sea', bossGame: 'brick', unlock: ['brick'],
      intro: [
        { cast: [['pingu', 'c', 'angry', 'bottom']], who: 'pingu', text: '거기 수상한 여우! 내 배를 가라앉힌 게 너냐?' },
        { cast: [['lumi', 'l', 'surprised'], ['pingu', 'r', 'angry']], who: 'lumi', text: '아니야 아니야! 난 별조각을 찾으러 왔어!' },
        { cast: [['lumi', 'l', 'smile'], ['pingu', 'r', 'joy']], who: 'pingu', text: '오호, 그렇다면 핑구 선장이 바닷길을 안내하지! 출항이다~!', fx: 'flash' },
      ],
      outro: [
        { cast: [['boss_sea', 'c', 'sad']], who: 'boss_sea', text: '심해의 산호벽이… 산산조각…', fx: 'shake' },
        { cast: [['pingu', 'l', 'joy'], ['toto', 'c', 'joy'], ['lumi', 'r', 'joy']], who: 'pingu', text: '바다가 다시 반짝인다! 세 번째 별조각 획득!', fx: 'stars' },
      ],
    },
    {
      id: 'sakura', title: '멈춰 버린 벚꽃 숲', en: 'SAKURA FOREST', hour: 4, n: 20, machines: ['sakura-dream', 'panda-bamboo', 'dragon-fortune'],
      friend: 'hana', boss: 'boss_sakura', bossGame: 'block', unlock: ['block'],
      intro: [
        { cast: [['lumi', 'c', 'surprised', 'bottom']], who: 'lumi', text: '꽃잎이… 공중에 멈춰 있어. 시간이 얼어붙은 것 같아.' },
        { cast: [['lumi', 'l', 'surprised'], ['hana', 'r', 'smug', 'top']], who: 'hana', text: '쉿. 그림자 닌자가 숲의 시간을 블록처럼 쌓아 막아 버렸지.', fx: 'flash' },
        { cast: [['lumi', 'l', 'joy'], ['hana', 'r', 'wink']], who: 'hana', text: '난 하나. 블록 퍼즐이라면 자신 있지? 같이 뚫자!' },
      ],
      outro: [
        { cast: [['boss_sakura', 'c', 'sad']], who: 'boss_sakura', text: '내 꽃잎 결계가… 풀려 버렸다…', fx: 'shake' },
        { cast: [['hana', 'l', 'joy'], ['lumi', 'r', 'joy']], who: 'hana', text: '봄바람이 다시 분다! 네 번째 별조각이야.', fx: 'stars' },
        { cast: [['nocturne', 'c', 'angry', 'top']], who: 'nocturne', text: '……서둘러야겠군. 녀석이 눈치채기 전에.', fx: 'dark' },
      ],
    },
    {
      id: 'desert', title: '황금 사막의 수수께끼', en: 'GOLDEN DESERT', hour: 5, n: 22, machines: ['pharaoh', 'wild-west', 'gold-rush', 'hot-chilli'],
      friend: 'nyank', boss: 'boss_desert', bossGame: 'sling', unlock: ['sling'],
      intro: [
        { cast: [['nyank', 'c', 'smug', 'bottom']], who: 'nyank', text: '짐은 위대한 냥크 파라오다냥. 피라미드가 그림자 탑에 점령당했다냥!' },
        { cast: [['lumi', 'l', 'surprised'], ['nyank', 'r', 'smile']], who: 'nyank', text: '여기 비밀 무기가 있다냥. 이름하여… 슈팅 스타 새총!', fx: 'flash' },
        { cast: [['lumi', 'l', 'joy'], ['nyank', 'r', 'joy']], who: 'lumi', text: '탑을 와르르 무너뜨리는 거지? 재밌겠다!' },
      ],
      outro: [
        { cast: [['boss_desert', 'c', 'sad']], who: 'boss_desert', text: '모래성처럼… 무너지는구나…', fx: 'shake' },
        { cast: [['nyank', 'l', 'joy'], ['lumi', 'r', 'joy']], who: 'nyank', text: '피라미드가 빛난다냥! 다섯 번째 별조각이다냥!', fx: 'stars' },
      ],
    },
    {
      id: 'ice', title: '얼어붙은 눈의 성', en: 'FROZEN CASTLE', hour: 6, n: 24, machines: ['ice-queen', 'santa-gifts'],
      friend: 'hoya', boss: 'boss_ice', bossGame: 'shisen', unlock: [],
      intro: [
        { cast: [['lumi', 'c', 'sad', 'bottom']], who: 'lumi', text: '으으 추워… 성 전체가 얼음 타일로 봉인돼 있어.', fx: 'shake' },
        { cast: [['hoya', 'c', 'smile', 'top']], who: 'hoya', text: '흠흠, 그건 고대 사천성 봉인이라네. 짝을 이어야만 풀리지.' },
        { cast: [['lumi', 'l', 'joy'], ['hoya', 'r', 'wink']], who: 'hoya', text: '나는 호야 박사. 별시계를 연구하는 학자라네. 함께 가지!' },
      ],
      outro: [
        { cast: [['boss_ice', 'c', 'sad']], who: 'boss_ice', text: '나의 눈보라가… 녹는다…', fx: 'shake' },
        { cast: [['hoya', 'l', 'surprised'], ['lumi', 'r', 'surprised']], who: 'hoya', text: '이상하군… 별조각마다 거울에 긁힌 자국이 있어. 녹턴의 짓이 아닐지도…', fx: 'dark' },
      ],
    },
    {
      id: 'jungle', title: '잃어버린 정글 신전', en: 'LOST JUNGLE', hour: 7, n: 24, machines: ['jungle-gems', 'aztec-gold', 'jurassic-jackpot'],
      friend: 'bana', boss: 'boss_jungle', bossGame: 'sling', unlock: [],
      intro: [
        { cast: [['bana', 'c', 'joy', 'top']], who: 'bana', text: '우끼끼! 신전 보물 찾으러 왔어? 나 바나가 지름길 알아!' },
        { cast: [['lumi', 'l', 'smile'], ['bana', 'r', 'smile']], who: 'lumi', text: '보물 말고 별조각! 근데 같이 가면 좋겠다!' },
        { cast: [['lumi', 'l', 'surprised'], ['bana', 'r', 'surprised'], ['boss_jungle', 'c', 'angry', 'top']], who: 'boss_jungle', text: '정글은 콩가 님의 것이다! 덤벼라!', fx: 'shake' },
      ],
      outro: [
        { cast: [['boss_jungle', 'c', 'sad']], who: 'boss_jungle', text: '바나나… 하나만… 줘…', fx: 'shake' },
        { cast: [['bana', 'l', 'joy'], ['lumi', 'r', 'joy']], who: 'bana', text: '신전 불이 켜졌다! 일곱 번째 조각, 우끼!', fx: 'stars' },
      ],
    },
    {
      id: 'space', title: '별빛 우주 정거장', en: 'STAR STATION', hour: 8, n: 25, machines: ['galaxy-ways', 'cyber-matrix'],
      friend: 'robo', boss: 'boss_space', bossGame: 'brick', unlock: [],
      intro: [
        { cast: [['robo', 'c', 'sleepy', 'bottom']], who: 'robo', text: '삐… 삐빅… 전력 부족… 행운 에너지… 0퍼센트…' },
        { cast: [['lumi', 'l', 'surprised'], ['robo', 'r', 'smile']], who: 'robo', text: '재부팅 완료! 감사합니다, 수호자님. 저는 정거장 관리 로봇 로보.', fx: 'flash' },
        { cast: [['lumi', 'l', 'smile'], ['robo', 'r', 'joy']], who: 'robo', text: '경고: 블랙홀 X-9가 별조각을 흡수 중. 함께 막아 주십시오!' },
      ],
      outro: [
        { cast: [['boss_space', 'c', 'sad']], who: 'boss_space', text: '시스템… 다운…', fx: 'shake' },
        { cast: [['robo', 'l', 'joy'], ['lumi', 'r', 'joy']], who: 'robo', text: '분석 결과: 별조각에서 거울 반사 신호 감지. 진짜 범인은… 따로 있습니다.', fx: 'dark' },
      ],
    },
    {
      id: 'ghost', title: '자정의 유령 저택', en: 'MIDNIGHT MANOR', hour: 9, n: 27, machines: ['monster-party', 'fairy-forest'],
      friend: 'boya', boss: 'boss_ghost', bossGame: 'diff', unlock: [],
      intro: [
        { cast: [['boya', 'c', 'smile', 'top']], who: 'boya', text: '안녕… 나 무섭지 않은 유령 뽀야야. 저택 거울이 이상해졌어…' },
        { cast: [['lumi', 'l', 'surprised'], ['boya', 'r', 'sad']], who: 'boya', text: '거울 속 세상이 진짜 세상을 조금씩 바꾸고 있어. 틀린 곳을 찾아 줘!', fx: 'dark' },
        { cast: [['nocturne', 'c', 'smile', 'top']], who: 'nocturne', text: '루미. 이번엔 싸우러 온 게 아니다. 거울을 조심해라.', fx: 'flash' },
      ],
      outro: [
        { cast: [['boss_ghost', 'c', 'sad']], who: 'boss_ghost', text: '거울님… 용서하세요…', fx: 'shake' },
        { cast: [['nocturne', 'l', 'sad'], ['lumi', 'r', 'surprised']], who: 'nocturne', text: '사실 나는 별조각을 숨기고 있었다. 탐욕의 거울이 행운을 전부 먹어 치우기 전에.', fx: 'dark' },
        { cast: [['lumi', 'l', 'joy'], ['nocturne', 'r', 'smile']], who: 'lumi', text: '그럼 너도… 우리 편이었어?!', fx: 'stars' },
      ],
    },
    {
      id: 'sky', title: '번개 치는 구름 신전', en: 'SKY TEMPLE', hour: 10, n: 28, machines: ['olympus', 'diamond-deluxe'],
      friend: 'nocturne', boss: 'boss_sky', bossGame: 'stack', unlock: [],
      intro: [
        { cast: [['nocturne', 'l', 'smile'], ['lumi', 'r', 'joy']], who: 'nocturne', text: '구름 신전은 하늘 끝까지 쌓아야 닿을 수 있다. 내 마술로 길을 열지.' },
        { cast: [['boss_sky', 'c', 'angry', 'top']], who: 'boss_sky', text: '배신자 녹턴! 거울님께서 너희 모두를 삼키실 것이다!', fx: 'lightning' },
        { cast: [['lumi', 'c', 'angry']], who: 'lumi', text: '우린 이제 친구야. 하늘까지 쌓아 올리자!', fx: 'flash' },
      ],
      outro: [
        { cast: [['boss_sky', 'c', 'sad']], who: 'boss_sky', text: '번개가… 그쳤어…', fx: 'shake' },
        { cast: [['nocturne', 'l', 'joy'], ['lumi', 'r', 'joy']], who: 'nocturne', text: '열 번째 조각. 이제 거울의 둥지, 불꽃 화산뿐이다.', fx: 'stars' },
      ],
    },
    {
      id: 'volcano', title: '타오르는 불꽃 화산', en: 'FIRE VOLCANO', hour: 11, n: 30, machines: ['volcano-rush', 'dragon-fortune', 'hot-chilli'],
      friend: 'draco', boss: 'boss_volcano', bossGame: 'bubble', unlock: [],
      intro: [
        { cast: [['draco', 'c', 'sad', 'bottom']], who: 'draco', text: '삐약… 엄마 용이 거울 불꽃에 잠들어 버렸어요…' },
        { cast: [['lumi', 'l', 'smile'], ['draco', 'r', 'surprised']], who: 'lumi', text: '걱정 마, 드라코. 우리가 불꽃을 꺼 줄게!' },
        { cast: [['draco', 'c', 'joy']], who: 'draco', text: '저도 불 뿜을 수 있어요! 작지만… 뜨거워요! 퓨!', fx: 'flash' },
      ],
      outro: [
        { cast: [['boss_volcano', 'c', 'sad']], who: 'boss_volcano', text: '마그마가… 식는다…', fx: 'shake' },
        { cast: [['mirror', 'c', 'smug', 'top']], who: 'mirror', text: '훌륭하구나, 꼬마 여우. 열한 조각을 모아 줘서 고맙다. 이제… 내가 가져가마.', fx: 'lightning' },
      ],
    },
    {
      id: 'mirror', title: '탐욕의 거울 궁전', en: 'MIRROR PALACE', hour: 12, n: 30, machines: ['royal-casino', 'diamond-deluxe', 'classic-777'],
      friend: null, boss: 'mirror', bossGame: 'match3', unlock: [],
      intro: [
        { cast: [['mirror', 'c', 'smug', 'top']], who: 'mirror', text: '어서 오너라. 이 궁전의 모든 행운은 원래 내 것이었다.', fx: 'dark' },
        { cast: [['lumi', 'c', 'angry'], ['toto', 'l', 'angry'], ['pingu', 'r', 'angry']], who: 'lumi', text: '행운은 혼자 갖는 게 아니야. 모두 나눠 갖는 거야!', fx: 'flash' },
        { cast: [['nocturne', 'l', 'smile'], ['hoya', 'r', 'smile'], ['lumi', 'c', 'joy']], who: 'hoya', text: '마지막 조각만 되찾으면 별시계가 열두 시를 칠 거라네. 가세!', fx: 'stars' },
      ],
      outro: [
        { cast: [['mirror', 'c', 'sad']], who: 'mirror', text: '내… 행운이… 흩어진다……', fx: 'lightning' },
        { cast: [['lumi', 'c', 'joy', 'bottom']], who: 'lumi', text: '별시계가 열두 시를 쳤어! 행운이 모두에게 돌아갔어!', fx: 'stars' },
        { cast: [['toto', 'l', 'joy'], ['nocturne', 'c', 'joy'], ['draco', 'r', 'joy']], who: 'nocturne', text: '……하지만 거울 조각 하나가 새벽 너머로 날아갔다. 모험은 끝나지 않았다.', fx: 'dark' },
      ],
    },
  ];

  const PROLOGUE = [
    { cast: [], who: null, text: '모든 슬롯머신이 하나의 세계로 이어지는 곳, 행운의 궁전.', fx: 'stars', narr: true },
    { cast: [['lumi', 'c', 'joy', 'bottom']], who: 'lumi', text: '오늘은 내가 별시계를 닦는 날! 견습 수호자 루미, 출근했습니다~!' },
    { cast: [['lumi', 'l', 'surprised'], ['nocturne', 'r', 'smug', 'right']], who: 'nocturne', text: '안녕, 꼬마 수호자. 별시계의 별조각 열두 개는 내가 가져가겠다.', fx: 'lightning' },
    { cast: [['lumi', 'c', 'sad']], who: 'lumi', text: '안 돼! 자정이 되면 세상의 행운이 전부 사라진단 말이야!', fx: 'shake' },
    { cast: [['lumi', 'c', 'angry']], who: 'lumi', text: '좋아… 열두 개의 세계를 돌아서 전부 되찾아 올 거야!', fx: 'flash' },
  ];
  const SEASON = [
    { cast: [['lumi', 'c', 'surprised']], who: 'lumi', text: '새벽이 밝았는데… 세계들이 거울빛으로 다시 일그러졌어!', fx: 'dark' },
    { cast: [['nocturne', 'l', 'smile'], ['lumi', 'r', 'joy']], who: 'nocturne', text: '더 강해진 그림자들이다. 이번엔 처음부터 같이 가지.', fx: 'stars' },
  ];

  const LINES = {
    match3: ['같은 친구 셋을 이어서 팡팡 터뜨려요!', '빨리 연속으로 맞추면 콤보가 쌓여요!', '피버 게이지를 채우면 점수가 두 배!'],
    shisen: ['같은 그림을 두 번 이하로 꺾이는 길로 이어 주세요!', '빠를수록 콤보가 쌓여요!', '황금 타일은 코인, 시계 타일은 시간!'],
    diff: ['거울 세계에서 틀린 곳을 찾아요!', '아무 데나 누르면 시간이 줄어요. 차분하게!', '두 그림 중 아무 쪽이나 눌러도 돼요.'],
    stack: ['타이밍 맞춰 탭! 딱 맞으면 PERFECT!', '하늘 궁전을 높이높이 쌓아요!'],
    bubble: ['같은 색 버블 셋 이상을 맞춰요!', '벽에 튕겨서 쏠 수도 있어요!'],
    brick: ['공을 놓치지 마세요! 아이템을 받아요!', '보석 벽돌을 전부 깨면 클리어!'],
    block: ['줄을 가득 채우면 사라져요!', '여러 줄을 한 번에 지우면 콤보!'],
    sling: ['당겼다 놓아서 그림자 졸개를 맞혀요!', '탑의 약한 곳을 노려요!'],
    slot: ['축제다! 정해진 스핀을 돌리면 다음 스테이지로!', '행운의 축제 시간이에요!'],
    clear: ['대단해요!', '역시 최고예요!', '완벽해요!', '이 속도라면 거울도 놀라겠어요!'],
    fail: ['아앗, 아쉬워요!', '조금만 더 하면 됐는데!', '포기하긴 아까워요!'],
    boss: ['보스 등장! 힘을 모아요!', '여기만 넘으면 별조각이에요!'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- daily quests ---------- */
  const DAILY = [
    { id: 'stage_clear', ev: 'stage_clear', t: (n) => `스테이지 ${n}개 클리어`, n: [3, 5, 8] },
    { id: 'stars', ev: 'stars', t: (n) => `별 ${n}개 모으기`, n: [6, 10, 15] },
    { id: 'three_star', ev: 'three_star', t: (n) => `별 3개로 ${n}번 클리어`, n: [2, 3, 5] },
    { id: 'match3_clear', ev: 'match3_clear', t: (n) => `팡팡 ${n}판 클리어`, n: [1, 2] },
    { id: 'shisen_clear', ev: 'shisen_clear', t: (n) => `사천성 ${n}판 클리어`, n: [1, 2] },
    { id: 'diff_found', ev: 'diff_found', t: (n) => `틀린 곳 ${n}개 찾기`, n: [5, 10] },
    { id: 'bubble_clear', ev: 'bubble_clear', t: (n) => `버블 팡팡 ${n}판 클리어`, n: [1, 2] },
    { id: 'brick_clear', ev: 'brick_clear', t: (n) => `벽돌깨기 ${n}판 클리어`, n: [1, 2] },
    { id: 'block_clear', ev: 'block_clear', t: (n) => `보석 블록 ${n}판 클리어`, n: [1, 2] },
    { id: 'sling_clear', ev: 'sling_clear', t: (n) => `새총 ${n}판 클리어`, n: [1, 2] },
    { id: 'stack_clear', ev: 'stack_clear', t: (n) => `탑 쌓기 ${n}판 클리어`, n: [1, 2] },
    { id: 'slot_spin', ev: 'slot_spin', t: (n) => `슬롯 ${n}회 돌리기`, n: [10, 20, 30] },
    { id: 'slot_bigwin', ev: 'slot_bigwin', t: () => '슬롯 빅윈 1회', n: [1] },
    { id: 'league', ev: 'league_pts', t: (n) => `리그 포인트 ${n.toLocaleString()} 모으기`, n: [1500, 3000, 5000] },
  ];
  const ACH = [
    { id: 'a_stage', ev: 'stage_clear', name: '모험가', unit: '스테이지' },
    { id: 'a_stars', ev: 'stars', name: '별 수집가', unit: '개' },
    { id: 'a_boss', ev: 'boss_clear', name: '보스 사냥꾼', unit: '보스' },
    { id: 'a_match', ev: 'match3_clear', name: '팡팡 마스터', unit: '판' },
    { id: 'a_shisen', ev: 'shisen_clear', name: '봉인 해제사', unit: '판' },
    { id: 'a_diff', ev: 'diff_clear', name: '매의 눈', unit: '판' },
    { id: 'a_bubble', ev: 'bubble_clear', name: '버블 저격수', unit: '판' },
    { id: 'a_brick', ev: 'brick_clear', name: '벽돌 파괴자', unit: '판' },
    { id: 'a_block', ev: 'block_clear', name: '블록 장인', unit: '판' },
    { id: 'a_sling', ev: 'sling_clear', name: '명사수', unit: '판' },
    { id: 'a_stack', ev: 'stack_clear', name: '하늘 건축가', unit: '판' },
    { id: 'a_spin', ev: 'slot_spin', name: '행운의 손', unit: '스핀' },
  ];
  function achTarget(tier) { const base = [5, 10, 25]; return base[tier % 3] * Math.pow(10, Math.floor(tier / 3)); }

  function dailyFor(dateKey, unlocked) {
    const rnd = root.U.mulberry32(root.U.hashStr('daily' + dateKey));
    const ok = (q) => { const g = q.ev.replace(/_clear$/, ''); return !root.QuestGames || !root.QuestGames[g] || !unlocked || unlocked.includes(g); };
    const pool = DAILY.filter(ok).sort(() => rnd() - 0.5).slice(0, 3);
    return pool.map((q) => { const n = q.n[Math.floor(rnd() * q.n.length)]; return { id: q.id, ev: q.ev, max: !!q.max, title: q.t(n), target: n, progress: 0, done: false }; });
  }

  /* ---------- stage layout of an episode (deterministic) ---------- */
  function unlockedAt(ei) { const s = []; for (let i = 0; i <= ei && i < EPISODES.length; i++) s.push(...EPISODES[i].unlock); return s; }
  const cache = {};
  function layout(ei) {
    if (cache[ei]) return cache[ei];
    const ep = EPISODES[ei], pool = unlockedAt(ei), fresh = ep.unlock.slice();
    const rnd = root.U.mulberry32(root.U.hashStr('layout-' + ep.id));
    const out = [];
    for (let i = 1; i <= ep.n; i++) {
      let g;
      if (i === ep.n) g = ep.bossGame;
      else if (i % 5 === 0) g = 'slot';
      else if (fresh.length && (i === 1 || i === 3 || i === 7)) g = fresh.shift();
      else if (ei === 0 && i <= 4) g = ['match3', 'stack', 'shisen', 'diff'][i - 1];
      else {
        const recent = out.slice(-2).map((s) => s.g).concat(i === ep.n - 1 ? [ep.bossGame] : []);
        const cand = pool.filter((x) => !recent.includes(x));
        // newer games show up a bit more often in their own episode
        const w = cand.map((x) => (ep.unlock.includes(x) ? 2.2 : 1));
        let r = rnd() * w.reduce((a, b) => a + b, 0);
        g = cand[cand.length - 1];
        for (let k = 0; k < cand.length; k++) { r -= w[k]; if (r <= 0) { g = cand[k]; break; } }
      }
      out.push({ g, boss: i === ep.n, machine: ep.machines[(i - 1) % ep.machines.length] });
    }
    cache[ei] = out;
    return out;
  }
  // difficulty index of a game at (episode, stage): how many times it appeared so far in the campaign
  function gameStage(season, ei, si) {
    const g = layout(ei)[si].g;
    let n = 0;
    for (let e = 0; e <= ei; e++) { const L = layout(e); for (let s = 0; s < (e === ei ? si + 1 : L.length); s++) if (L[s].g === g) n++; }
    let total = 0; for (let e = 0; e < EPISODES.length; e++) total += layout(e).filter((s) => s.g === g).length;
    return n + (season - 1) * Math.ceil(total * 0.6) + (layout(ei)[si].boss ? 4 : 0);
  }

  root.QuestStory = { EPISODES, PROLOGUE, SEASON, LINES, pick, DAILY, ACH, achTarget, dailyFor, layout, gameStage, unlockedAt };
})(window);

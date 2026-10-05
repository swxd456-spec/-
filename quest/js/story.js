/* Story lines (guide: Lumi the fox), hall intros, daily quests and endless achievements. */
(function (root) {
  const HALL_INTRO = {
    'neon-nights': '네온 사인이 꺼진 밤의 홀이에요. 번개 같은 불빛을 되찾아요!',
    'classic-777': '궁전에서 가장 오래된 홀이에요. 777의 종소리가 다시 울리게 해줘요.',
    pharaoh: '모래 바람 너머 파라오의 홀이에요. 피라미드의 봉인이 아주 단단해요.',
    'dragon-fortune': '붉은 용이 잠든 홀이에요. 용의 금화가 봉인 안에 갇혀 있어요.',
    'sweet-candy': '달콤한 사탕 왕국의 홀! 마술사가 사탕을 전부 굳혀 버렸어요.',
    'ocean-deep': '바닷속 산호 홀이에요. 물결 아래 봉인이 반짝이고 있어요.',
    'galaxy-ways': '별들 사이에 떠 있는 홀이에요. 은하의 길이 끊겨 있어요.',
    'viking-raid': '오로라가 내려앉은 바이킹의 홀. 천둥의 망치를 깨워야 해요.',
    'sakura-dream': '벚꽃이 흩날리는 홀이에요. 꽃바람이 멈춰 버렸어요.',
    'wild-west': '석양의 보안관 홀! 현상금 휠이 녹슬어 멈춰 있어요.',
    'jungle-gems': '잃어버린 신전의 보석 홀이에요. 보석이 전부 돌로 변했어요.',
    'hot-chilli': '축제의 칠리 홀! 마리아치 음악이 끊겨 버렸어요.',
    'ice-queen': '얼음 궁전 홀이에요. 여왕의 눈사태를 다시 깨워요.',
    'pirate-gold': '해적선 보물 홀이에요. 보물지도가 거울 속에 숨었어요.',
    'fairy-forest': '반딧불이 숲의 홀이에요. 요정들이 거울 세계에 갇혔대요.',
    'monster-party': '할로윈 저택 홀! 몬스터들의 파티를 다시 열어 줘요.',
    'gold-rush': '금광 홀이에요. 금덩이가 전부 흙으로 변했어요.',
    'lucky-clover': '무지개 언덕의 홀이에요. 네잎클로버를 찾아야 해요.',
    'cyber-matrix': '데이터 코어 홀이에요. 시스템이 해킹당했어요!',
    'diamond-deluxe': '다이아몬드 라운지 홀이에요. 단 하나의 라인을 밝혀요.',
    olympus: '구름 위 신들의 홀! 제우스의 번개 구슬이 봉인됐어요.',
    'aztec-gold': '정글 속 황금 피라미드 홀이에요. 태양의 문이 닫혀 있어요.',
    'disco-fever': '디스코 클럽 홀! 미러볼이 멈춰 버렸어요.',
    'bubble-pop': '몽글몽글 버블 홀이에요. 거품이 전부 굳어 있어요.',
    'royal-casino': '왕실 VIP 라운지 홀이에요. 왕관을 되찾아요.',
    'panda-bamboo': '대나무 숲 판다 사원 홀이에요. 황금 대나무가 사라졌어요.',
    'jurassic-jackpot': '공룡의 땅 홀이에요. 화산이 잠들어 버렸어요.',
    'retro-arcade': '80년대 오락실 홀! 픽셀들이 흩어져 버렸어요.',
    'santa-gifts': '크리스마스 홀이에요. 산타의 선물 자루가 봉인됐어요.',
    'volcano-rush': '마지막 화산 홀이에요. 그림자 마술사의 본거지가 가까워요!',
  };
  const LINES = {
    shisen: ['봉인 타일이에요. 같은 그림을 두 번 이하로 꺾이는 길로 이어 주세요!', '타일 사이에 길이 보이면 바로 이어요. 빠를수록 콤보가 쌓여요!', '황금 타일은 코인, 시계 타일은 시간을 줘요!', '막히면 셔플! 힌트는 반짝이는 짝을 알려 줘요.'],
    diff: ['봉인이 풀리자 거울 세계가 나타났어요! 틀린 곳을 찾아요.', '마술사가 거울 속 세상을 살짝 바꿔 놨어요. 눈을 크게 떠요!', '아무 데나 누르면 시간이 줄어요. 차분하게!', '두 그림 중 아무 쪽이나 눌러도 돼요.'],
    slot: ['홀이 열렸어요! 축제 스핀으로 홀의 슬롯머신을 깨워요!', '불이 켜졌어요! 행운을 시험해 봐요!', '축제 시간이에요! 정해진 스핀을 돌리면 다음 홀로 가요.'],
    clear: ['대단해요!', '역시 최고예요!', '완벽해요!', '이 속도라면 마술사도 놀라겠어요!'],
    fail: ['아앗, 시간이 다 됐어요!', '조금만 더 하면 됐는데!', '포기하긴 아까워요!'],
    chapter: ['홀 하나가 다시 빛나기 시작했어요!', '봉인 하나가 완전히 풀렸어요!', '궁전에 불빛이 하나 더 켜졌어요!'],
    season: ['30개의 홀을 모두 열었어요! 그런데… 그림자 마술사가 더 강해져서 돌아왔어요. 다시 출발해요!'],
    welcome: ['안녕하세요! 저는 행운의 궁전을 지키는 여우 루미예요. 그림자 마술사가 궁전의 홀 30개를 봉인했어요. 함께 되찾아 줄래요?'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- daily quests ---------- */
  const DAILY = [
    { id: 'shisen_clear', ev: 'shisen_clear', t: (n) => `사천성 ${n}판 클리어`, n: [2, 3, 4] },
    { id: 'shisen_combo', ev: 'shisen_combo', t: (n) => `사천성에서 ${n}콤보 달성`, n: [5, 8, 10], max: true },
    { id: 'shisen_match', ev: 'shisen_match', t: (n) => `타일 ${n}쌍 지우기`, n: [40, 60, 100] },
    { id: 'diff_clear', ev: 'diff_clear', t: (n) => `틀린그림찾기 ${n}판 클리어`, n: [1, 2, 3] },
    { id: 'diff_perfect', ev: 'diff_perfect', t: () => '오답 없이 틀린그림찾기 클리어', n: [1] },
    { id: 'diff_found', ev: 'diff_found', t: (n) => `틀린 곳 ${n}개 찾기`, n: [10, 20, 30] },
    { id: 'slot_spin', ev: 'slot_spin', t: (n) => `슬롯 ${n}회 돌리기`, n: [20, 40, 60] },
    { id: 'slot_win', ev: 'slot_win', t: (n) => `슬롯에서 코인 ${n.toLocaleString()}개 획득`, n: [1000, 3000, 6000] },
    { id: 'slot_bigwin', ev: 'slot_bigwin', t: () => '슬롯 빅윈 1회', n: [1] },
    { id: 'hall_open', ev: 'hall_open', t: (n) => `홀 ${n}개 열기`, n: [1, 2] },
  ];
  const ACH = [
    { id: 'a_shisen', ev: 'shisen_clear', name: '봉인 해제사', unit: '판' },
    { id: 'a_diff', ev: 'diff_clear', name: '매의 눈', unit: '판' },
    { id: 'a_spin', ev: 'slot_spin', name: '행운의 손', unit: '스핀' },
    { id: 'a_hall', ev: 'hall_open', name: '궁전 복원가', unit: '홀' },
    { id: 'a_match', ev: 'shisen_match', name: '타일 장인', unit: '쌍' },
    { id: 'a_found', ev: 'diff_found', name: '숨은그림 탐정', unit: '곳' },
  ];
  // endless tier targets: 5, 10, 25, 50, 100, 250, 500, 1000, 2500 ...
  function achTarget(tier) { const base = [5, 10, 25]; return base[tier % 3] * Math.pow(10, Math.floor(tier / 3)); }

  function dailyFor(dateKey) {
    const rnd = root.U.mulberry32(root.U.hashStr('daily' + dateKey));
    const pool = DAILY.slice().sort(() => rnd() - 0.5).slice(0, 3);
    return pool.map((q) => { const n = q.n[Math.floor(rnd() * q.n.length)]; return { id: q.id, ev: q.ev, max: !!q.max, title: q.t(n), target: n, progress: 0, done: false }; });
  }

  root.QuestStory = { HALL_INTRO, LINES, pick, DAILY, ACH, achTarget, dailyFor };
})(window);

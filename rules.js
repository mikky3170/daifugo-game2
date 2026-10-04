/* ====================================================================
 * ROYAL DAIFUGO - rules.js
 * [Version: v3.9.9 - 完全正規化＆絶対強度テーブル（K/A判定バグ完全根絶版）]
 * ==================================================================== */

/* ----------------------------------------------------
 * 0. アクティブルール取得ヘルパー（動的ルール連携）
 * ---------------------------------------------------- */
function getActiveGameRules(customRules = null) {
  if (customRules && typeof customRules === 'object') {
    return customRules;
  }
  if (typeof gameRules !== 'undefined' && gameRules) {
    return gameRules;
  }
  if (typeof DEFAULT_GAME_RULES !== 'undefined' && DEFAULT_GAME_RULES) {
    return DEFAULT_GAME_RULES;
  }
  return {
    eightCut: true,
    elevenBack: true,
    revolution: true,
    spade3: true,
    suitBinding: false,
    capitalFall: true,
    forbiddenFinish: true,
    sequence: false
  };
}

/* ----------------------------------------------------
 * 1. カードランク絶対正規化アーキテクチャ（Sanitization Engine）
 * ---------------------------------------------------- */

/**
 * あらゆるオブジェクト構造・プロパティ揺れ・装飾文字列（👑等）から
 * 純粋なカードランク文字列（'3'〜'10', 'J', 'Q', 'K', 'A', '2', 'JOKER'）を100%抽出する
 */
function normalizeCardRank(card) {
  if (!card) return '';
  if (card.isJoker) return 'JOKER';

  let raw = '';
  if (card.display !== undefined && card.display !== null) {
    raw = String(card.display);
  } else if (card.rank !== undefined && card.rank !== null) {
    raw = String(card.rank);
  } else if (card.value !== undefined && card.value !== null) {
    raw = String(card.value);
  }

  // 王冠マークや絵文字、空白を除去
  raw = raw.replace(/[👑★☆🃏🎭\s]/g, '').trim();

  // 数値型表現の吸収（14 -> A, 13 -> K, 12 -> Q, 11 -> J, 15 -> 2 など）
  if (raw === '14') return 'A';
  if (raw === '13') return 'K';
  if (raw === '12') return 'Q';
  if (raw === '11') return 'J';
  if (raw === '15') return '2';
  if (raw === '1') return 'A';

  const upper = raw.toUpperCase();
  if (upper === 'JOKER') return 'JOKER';
  if (['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'].includes(upper)) {
    return upper;
  }

  return upper;
}

/**
 * スート（記号）の完全正規化
 */
function normalizeCardSuit(card) {
  if (!card) return '';
  if (card.isJoker) return card.suitSymbol || card.suit || '★';

  const raw = String(card.suitSymbol || card.suit || card.suitClass || '');
  if (raw.includes('♠') || raw.toLowerCase().includes('spade')) return '♠';
  if (raw.includes('♥') || raw.toLowerCase().includes('heart')) return '♥';
  if (raw.includes('♦') || raw.toLowerCase().includes('diamond')) return '♦';
  if (raw.includes('♣') || raw.toLowerCase().includes('club')) return '♣';
  return raw;
}

/* ----------------------------------------------------
 * 2. 明示的絶対強度テーブル（数式計算の完全廃止）
 * ---------------------------------------------------- */
// 平時（通常）の強さテーブル： 3が最弱(1) 〜 2が最強(13)、JOKERは絶対最強(9999)
const NORMAL_STRENGTH_MAP = {
  '3': 1,
  '4': 2,
  '5': 3,
  '6': 4,
  '7': 5,
  '8': 6,
  '9': 7,
  '10': 8,
  'J': 9,
  'Q': 10,
  'K': 11,
  'A': 12,
  '2': 13,
  'JOKER': 9999
};

// 反転時（革命・11バック）の強さテーブル： 2が最弱(1) 〜 3が最強(13)、JOKERは絶対最強(9999)
const REVERSE_STRENGTH_MAP = {
  '2': 1,
  'A': 2,
  'K': 3,
  'Q': 4,
  'J': 5,
  '10': 6,
  '9': 7,
  '8': 8,
  '7': 9,
  '6': 10,
  '5': 11,
  '4': 12,
  '3': 13,
  'JOKER': 9999
};

function getCardKey(card) {
  return normalizeCardRank(card);
}

function getCardValue(card) {
  const rank = normalizeCardRank(card);
  return NORMAL_STRENGTH_MAP[rank] || 0;
}

function getCardStrength(card, reverse = false) {
  if (!card) return 0;
  const rank = normalizeCardRank(card);
  if (rank === 'JOKER') return 9999;
  return reverse ? (REVERSE_STRENGTH_MAP[rank] || 0) : (NORMAL_STRENGTH_MAP[rank] || 0);
}

/**
 * 2枚のカードが同一であるかをプロパティ単位で完全に厳格照合する安全ヘルパー
 */
function isSameCard(c1, c2) {
  if (!c1 || !c2) return false;
  const isJ1 = !!c1.isJoker || normalizeCardRank(c1) === 'JOKER';
  const isJ2 = !!c2.isJoker || normalizeCardRank(c2) === 'JOKER';

  if (isJ1 || isJ2) {
    if (!isJ1 || !isJ2) return false;
    const jId1 = c1.jokerId || (normalizeCardSuit(c1) === '★' ? 'J1' : (normalizeCardSuit(c1) === '☆' ? 'J2' : null));
    const jId2 = c2.jokerId || (normalizeCardSuit(c2) === '★' ? 'J1' : (normalizeCardSuit(c2) === '☆' ? 'J2' : null));
    if (jId1 && jId2) return jId1 === jId2;
    return true;
  }

  const s1 = normalizeCardSuit(c1);
  const s2 = normalizeCardSuit(c2);
  const r1 = normalizeCardRank(c1);
  const r2 = normalizeCardRank(c2);
  return s1 === s2 && r1 === r2;
}

function sortHand(hand, reverse = false) {
  if (!hand || !Array.isArray(hand)) return [];
  return hand.sort((a, b) => {
    const isJokerA = a.isJoker || normalizeCardRank(a) === 'JOKER';
    const isJokerB = b.isJoker || normalizeCardRank(b) === 'JOKER';
    if (isJokerA && isJokerB) return 0;
    if (isJokerA) return 1;
    if (isJokerB) return -1;

    const strA = getCardStrength(a, reverse);
    const strB = getCardStrength(b, reverse);
    if (strA !== strB) return strA - strB;

    const suitA = normalizeCardSuit(a);
    const suitB = normalizeCardSuit(b);
    return suitA.localeCompare(suitB);
  });
}

function createDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    CARD_RANKS.forEach(rank => {
      deck.push({
        suitSymbol: suit.symbol,
        suitClass: suit.class,
        display: rank.display,
        rank: rank.display,
        isJoker: false
      });
    });
  });
  deck.push({ suitSymbol: '★', suitClass: 'joker-sun', display: 'JOKER', rank: 'JOKER', isJoker: true, jokerId: 'J1', jokerName: '太陽の道化師' });
  deck.push({ suitSymbol: '☆', suitClass: 'joker-moon', display: 'JOKER', rank: 'JOKER', isJoker: true, jokerId: 'J2', jokerName: '月の道化師' });
  return deck;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(RandomManager.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 提出された手（1枚またはペア等）の「基準の強さ」を算出する
 * ※JOKERを含むペアの場合、JOKERはもう一方のカードの強さとして扱われる
 */
function getPlayStrength(cards, reverse = false) {
  if (!cards || cards.length === 0) return 0;

  // JOKER単騎
  if (cards.length === 1 && (cards[0].isJoker || normalizeCardRank(cards[0]) === 'JOKER')) {
    return 9999;
  }

  // JOKERのみで構成されたペア（JOKER2枚出し）
  if (cards.every(c => c.isJoker || normalizeCardRank(c) === 'JOKER')) {
    return 9999;
  }

  // JOKER以外のカードを基準として強さを測定
  const nonJoker = cards.filter(c => !c.isJoker && normalizeCardRank(c) !== 'JOKER');
  if (nonJoker.length === 0) return 9999;

  return getCardStrength(nonJoker[0], reverse);
}

/**
 * 指定されたカードセットが禁止あがり対象カードを含むか純粋判定
 * @param {Array} cards - 出されたカード配列
 * @param {boolean} reverse - 革命中フラグ
 * @returns {boolean} 禁止あがり対象なら true
 */
function isForbiddenFinish(cards, reverse = false) {
  if (!cards || cards.length === 0) return false;

  // 1. ジョーカーあがり禁止（単騎・ペア問わずJOKERを含めば反則）
  if (cards.some(c => c.isJoker || normalizeCardRank(c) === 'JOKER')) {
    return true;
  }

  // 2. 8あがり禁止（8切りを伴うあがり）
  if (cards.some(c => normalizeCardRank(c) === '8')) {
    return true;
  }

  // 3. 最強数字あがり禁止（平時は2、革命時は3）
  const strongestRank = reverse ? '3' : '2';
  if (cards.some(c => normalizeCardRank(c) === strongestRank)) {
    return true;
  }

  // 4. スペード3単騎あがり禁止（平時のみ最強ジョーカーキラーのため禁止扱い）
  if (!reverse && cards.length === 1) {
    const c = cards[0];
    if (normalizeCardSuit(c) === '♠' && normalizeCardRank(c) === '3') {
      return true;
    }
  }

  return false;
}

/**
 * 禁止あがり手判定純粋関数
 * rules.forbiddenFinish が ON の場合のみ、ラスト1手になるあがり手（JOKER、2/3、8、スペ3等）を反則手とみなす
 */
function isForbiddenFinishMove(cards, hand, rules = null, reverse = false) {
  if (!cards || cards.length === 0 || !hand) return false;
  if (cards.length !== hand.length) return false;

  const activeRules = getActiveGameRules(rules);
  if (!activeRules.forbiddenFinish) {
    return false;
  }

  return isForbiddenFinish(cards, reverse);
}

/**
 * 選択したカードを出した場合、残りの手札がすべて禁止あがりカード（2・8・JOKER・革命時3・♠3等）のみになり
 * 次回以降にあがれなくなる「1手前詰み状態」になるかを厳密判定するヘルパー
 * @param {Array} selectedCards - 出そうとしているカード配列
 * @param {Array} hand - 現在の手札配列
 * @param {boolean} reverse - 革命中フラグ
 * @returns {boolean} 残り手札が禁止カードのみになる場合は true
 */
function willLeaveOnlyForbiddenCards(selectedCards, hand, reverse = false) {
  if (!selectedCards || selectedCards.length === 0 || !hand) return false;
  if (selectedCards.length >= hand.length) return false; // あがり手そのものは判定外

  // 選択カードを除外した残手札をシミュレート
  const remainingHand = hand.filter(hCard => !selectedCards.some(sCard => isSameCard(hCard, sCard)));
  if (remainingHand.length === 0) return false;

  // 残り手札に含まれるすべてのカードが単体で禁止あがり対象であるか検証
  // （2, 8, JOKER, 革命時3, ♠3単騎など、あがる瞬間に反則となる札しか手元に残らない状態）
  const allCardsForbidden = remainingHand.every(card => isForbiddenFinish([card], reverse));
  if (!allCardsForbidden) {
    return false; // 1枚でも通常あがり可能なカード（3〜A等）が残るなら詰みではない
  }

  // 残手札がすべて禁止カードで構成されている場合、
  // それらを単騎で出そうが、ペアやトリプルで出そうが、あがる瞬間には必ず禁止カードが含まれるため
  // 例外なく100%反則負け（完全詰み）となる
  return true;
}

/**
 * カード着手の妥当性検証（バリデーションの完全純粋関数化）
 */
function isValidPlay(cards, currentField, reverse = false) {
  if (!cards || !Array.isArray(cards) || cards.length === 0) return false;
  if (!currentField || !Array.isArray(currentField)) currentField = [];

  // ① ♠3返し特殊判定（場がJOKER単騎の時のみ）
  const isFieldLoneJoker = (currentField.length === 1 && (currentField[0].isJoker || normalizeCardRank(currentField[0]) === 'JOKER'));
  if (isFieldLoneJoker) {
    const isSingle = cards.length === 1;
    const isSpade3 = !cards[0].isJoker && normalizeCardSuit(cards[0]) === '♠' && normalizeCardRank(cards[0]) === '3';
    if (isSingle && isSpade3) {
      return true; // ♠3返し成立
    }
  }

  // ② 場がJOKERのみで構成されている場合（単騎またはペア）、♠3返し以外は絶対に上回れない
  if (currentField.length > 0 && currentField.every(c => c.isJoker || normalizeCardRank(c) === 'JOKER')) {
    return false;
  }

  // ③ 出そうとしているカード群が「同一ランクのセット（ペア等）」として成立しているか検証
  const nonJokers = cards.filter(c => !c.isJoker && normalizeCardRank(c) !== 'JOKER');
  if (nonJokers.length > 1) {
    const firstRank = normalizeCardRank(nonJokers[0]);
    const isAllSame = nonJokers.every(c => normalizeCardRank(c) === firstRank);
    if (!isAllSame) {
      return false; // 数字がバラバラなカードは同時に出せない
    }
  }

  // ④ 親番（場が空）の場合：セットが成立していれば無条件に出せる
  if (currentField.length === 0) {
    return true;
  }

  // ⑤ 子番の場合：場の枚数と完全に一致している必要がある
  if (cards.length !== currentField.length) {
    return false;
  }

  // ⑥ 強さ比較判定（絶対強度テーブルによる比較）
  const playStr = getPlayStrength(cards, reverse);
  const fieldStr = getPlayStrength(currentField, reverse);

  // 提出手がJOKER単騎（9999）なら、場がJOKERでなければ無条件で勝てる
  if (playStr === 9999) {
    return fieldStr < 9999;
  }

  // 厳格な大なり比較（playStr > fieldStr）
  // 平時: K(11) に対して A(12) -> 12 > 11 (true)
  return playStr > fieldStr;
}

function getAllValidMoves(hand, currentField, reverse = false, filterForbidden = false, rules = null) {
  const moves = [];
  if (!hand || !Array.isArray(hand) || hand.length === 0) return moves;

  const jokers = hand.filter(c => c.isJoker || normalizeCardRank(c) === 'JOKER');
  const nonJokers = hand.filter(c => !c.isJoker && normalizeCardRank(c) !== 'JOKER');

  const groups = {};
  nonJokers.forEach(c => {
    const key = normalizeCardRank(c);
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  if (!currentField || currentField.length === 0) {
    // 親番（場が空）
    for (let disp in groups) {
      const cards = groups[disp];
      const maxLen = cards.length + jokers.length;
      for (let len = 1; len <= maxLen; len++) {
        const naturalNeed = Math.min(len, cards.length);
        const jokerNeed = len - naturalNeed;
        if (jokerNeed > jokers.length) continue;
        moves.push([...cards.slice(0, naturalNeed), ...jokers.slice(0, jokerNeed)]);
      }
    }
    // ジョーカー単騎出し
    if (jokers.length >= 1) moves.push([jokers[0]]);
    // ジョーカー2枚出しペアの親番手
    if (jokers.length >= 2) moves.push([jokers[0], jokers[1]]);
  } else {
    const reqLen = currentField.length;

    // スペード3返し候補
    if (reqLen === 1 && (currentField[0].isJoker || normalizeCardRank(currentField[0]) === 'JOKER')) {
      const spade3 = nonJokers.find(c => normalizeCardSuit(c) === '♠' && normalizeCardRank(c) === '3');
      if (spade3) moves.push([spade3]);
      return moves;
    }

    for (let disp in groups) {
      const cards = groups[disp];
      const naturalNeed = Math.min(reqLen, cards.length);
      const jokerNeed = reqLen - naturalNeed;
      if (naturalNeed === 0 || jokerNeed > jokers.length) continue;
      const candidate = [...cards.slice(0, naturalNeed), ...jokers.slice(0, jokerNeed)];
      if (isValidPlay(candidate, currentField, reverse)) {
        moves.push(candidate);
      }
    }

    // ジョーカー単騎受け
    if (reqLen === 1 && jokers.length >= 1 && isValidPlay([jokers[0]], currentField, reverse)) {
      moves.push([jokers[0]]);
    }

    // ジョーカー2枚出しペア受け
    if (reqLen === 2 && jokers.length >= 2 && isValidPlay([jokers[0], jokers[1]], currentField, reverse)) {
      moves.push([jokers[0], jokers[1]]);
    }
  }

  if (filterForbidden) {
    const activeRules = getActiveGameRules(rules);
    if (activeRules.forbiddenFinish) {
      return moves.filter(m => !isForbiddenFinishMove(m, hand, activeRules, reverse));
    }
  }

  return moves;
}

/**
 * 貧民・大貧民用の絶対最強カード選定（強い順にcount枚）
 */
function selectTributeCards(hand, count, reverse = false) {
  const sorted = [...hand].sort((a, b) => getCardStrength(b, reverse) - getCardStrength(a, reverse));
  return sorted.slice(0, count);
}

function selectExchangeCardsSmart(hand, count) {
  const groups = {};
  hand.forEach(c => {
    const key = normalizeCardRank(c);
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const hasQuad = Object.values(groups).some(list => list.length >= 4);
  const hasTriple = Object.values(groups).some(list => list.length === 3);
  const lowCardCount = hand.filter(c => !c.isJoker && getCardValue(c) <= 4).length;
  const isRevolutionOriented = hasQuad || (hasTriple && lowCardCount >= 3);

  const scored = hand.map(c => {
    let score = 0;
    const key = normalizeCardRank(c);
    const size = groups[key] ? groups[key].length : 1;
    const val = getCardValue(c);

    if (c.isJoker || key === 'JOKER') score -= 50000;
    if (key === '2') score -= 30000;
    if (key === 'A') score -= 15000;
    if (key === '8') score -= 25000;
    if (key === 'J') score -= 6000;

    if (!c.isJoker && normalizeCardSuit(c) === '♦' && key === '3') {
      score -= 40000; // 初手親番権利札の保護
    }

    if (size >= 4) score -= 30000;
    else if (size === 3) score -= 15000;
    else if (size === 2) score -= 8000;
    else if (size === 1) {
      score += 5000;
      if (isRevolutionOriented) {
        if (key === '3') score -= 12000;
        else if (key === '4') score -= 8000;
        else if (key === '5') score -= 4000;
        else if (val >= 4 && val <= 8) score += 9000 - val * 20;
        else score += 4000 - val * 50;
      } else {
        if (key === '3') score += 1500;
        else if (val >= 2 && val <= 6) score += 6000 - val * 10;
        else score += 4000 - val * 50;
      }
    }

    return { card: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(x => x.card);
}

/**
 * 4プレイヤー間のカード交換を実行する
 * @param {Object} playersCards - { playerId: Card[] }
 * @param {Object} ranks - { playerId: 'daifugo' | 'fugo' | 'heimin' | 'hinmin' | 'daihinmin' } または 前局順位マップ
 * @returns {Object} { exchangeLog, updatedCards }
 */
function executeCardExchange(playersCards, ranks) {
  const resultLog = [];
  const updated = {};
  for (const pid in playersCards) {
    updated[pid] = [...playersCards[pid]];
  }

  let daifugoId = null, fugoId = null, hinminId = null, daihinminId = null;
  for (const pid in ranks) {
    const r = ranks[pid];
    if (r === 'daifugo' || r === '大富豪' || r === 1) daifugoId = pid;
    else if (r === 'fugo' || r === '富豪' || r === 2) fugoId = pid;
    else if (r === 'hinmin' || r === '貧民' || r === 3) hinminId = pid;
    else if (r === 'daihinmin' || r === '大貧民' || r === 4) daihinminId = pid;
  }

  // 1. 大富豪 ⇆ 大貧民（2枚交換）
  if (daifugoId && daihinminId && updated[daifugoId] && updated[daihinminId]) {
    const tributeCards = selectTributeCards(updated[daihinminId], 2, false);
    const giveCards = selectExchangeCardsSmart(updated[daifugoId], 2);

    tributeCards.forEach(c => {
      const idx = updated[daihinminId].findIndex(x => isSameCard(x, c));
      if (idx !== -1) updated[daihinminId].splice(idx, 1);
      updated[daifugoId].push(c);
    });

    giveCards.forEach(c => {
      const idx = updated[daifugoId].findIndex(x => isSameCard(x, c));
      if (idx !== -1) updated[daifugoId].splice(idx, 1);
      updated[daihinminId].push(c);
    });

    resultLog.push({
      type: 'DAIFUGO_EXCHANGE',
      daifugo: daifugoId,
      daihinmin: daihinminId,
      tributeCards,
      giveCards
    });
  }

  // 2. 富豪 ⇆ 貧民（1枚交換）
  if (fugoId && hinminId && updated[fugoId] && updated[hinminId]) {
    const tributeCards = selectTributeCards(updated[hinminId], 1, false);
    const giveCards = selectExchangeCardsSmart(updated[fugoId], 1);

    tributeCards.forEach(c => {
      const idx = updated[hinminId].findIndex(x => isSameCard(x, c));
      if (idx !== -1) updated[hinminId].splice(idx, 1);
      updated[fugoId].push(c);
    });

    giveCards.forEach(c => {
      const idx = updated[fugoId].findIndex(x => isSameCard(x, c));
      if (idx !== -1) updated[fugoId].splice(idx, 1);
      updated[hinminId].push(c);
    });

    resultLog.push({
      type: 'FUGO_EXCHANGE',
      fugo: fugoId,
      hinmin: hinminId,
      tributeCards,
      giveCards
    });
  }

  for (const pid in updated) {
    sortHand(updated[pid]);
  }

  return { updatedCards: updated, exchangeLog: resultLog };
}

/**
 * プレイヤーが着手した直後の勝敗・失格判定
 */
function evaluatePlayFinish(context) {
  const {
    playerId,
    playedCards,
    remainingHand,
    previousDaifugoId,
    currentRankings = [],
    activePlayers = [],
    effRev = false,
    rules = null
  } = context;

  const activeRules = getActiveGameRules(rules);

  if (remainingHand.length > 0) {
    return { status: 'CONTINUE' };
  }

  // ① 禁止あがりチェック
  if (activeRules.forbiddenFinish && isForbiddenFinish(playedCards, effRev)) {
    return {
      status: 'FORBIDDEN_FINISH',
      disqualifiedPlayerId: playerId,
      assignedRank: 4,
      reason: '禁止カードであがったため反則負け'
    };
  }

  // ② 通常あがり成立（1位確定時、かつ前大富豪が別プレイヤーなら都落ちチェック）
  const finishOrder = currentRankings.length + 1;
  const events = [];

  let capitalFallVictim = null;
  if (activeRules.capitalFall && finishOrder === 1 && previousDaifugoId && previousDaifugoId !== playerId) {
    if (activePlayers.includes(previousDaifugoId)) {
      capitalFallVictim = previousDaifugoId;
      events.push({
        type: 'CAPITAL_FALL',
        victimId: previousDaifugoId,
        assignedRank: 4,
        reason: '他プレイヤーの1位あがりにより都落ち確定'
      });
    }
  }

  return {
    status: 'FINISH',
    winnerId: playerId,
    finishRank: finishOrder,
    capitalFallVictim,
    events
  };
}

function estimateTurnsToWin(hand, reverse = false) {
  if (!hand || hand.length === 0) return 0;
  let controlCards = 0;
  const groups = {};
  let jokers = 0;

  hand.forEach(c => {
    const key = normalizeCardRank(c);
    if (key === 'JOKER') { jokers++; return; }
    groups[key] = (groups[key] || 0) + 1;
  });

  const keys = Object.keys(groups);
  let turns = keys.length;
  if (jokers > 0 && turns === 0) turns = 1;

  if (groups['8']) controlCards += groups['8'];
  keys.forEach(k => {
    if (k === '8') return;
    const str = reverse ? REVERSE_STRENGTH_MAP[k] : NORMAL_STRENGTH_MAP[k];
    const isStrong = (str >= 11);
    if (isStrong) controlCards += groups[k];
  });

  controlCards += jokers;
  if (turns === 1) return 1;
  return Math.max(1, turns - Math.floor(controlCards * 0.8));
}

function isGuaranteedAbsoluteWin(move, unrevealed, reverse = false) {
  if (!move || move.length === 0) return false;
  if (!unrevealed) unrevealed = [];

  const count = move.length;
  const isJokerSolo = (count === 1 && (move[0].isJoker || normalizeCardRank(move[0]) === 'JOKER'));

  if (isJokerSolo) {
    const hasUnrevealedSpade3 = unrevealed.some(c =>
      !c.isJoker &&
      normalizeCardSuit(c) === '♠' &&
      normalizeCardRank(c) === '3'
    );
    return !hasUnrevealedSpade3;
  }

  const moveStr = getPlayStrength(move, reverse);

  const groups = {};
  let jokers = 0;
  unrevealed.forEach(c => {
    const key = normalizeCardRank(c);
    if (key === 'JOKER') { jokers++; return; }
    groups[key] = (groups[key] || 0) + 1;
  });

  for (let disp in groups) {
    const dummyCard = { rank: disp, isJoker: false };
    const str = getCardStrength(dummyCard, reverse);
    if (str > moveStr && groups[disp] + jokers >= count) return false;
  }

  if (jokers >= count && moveStr < 9999) {
    return false;
  }
  return true;
}

/**
 * 終盤確定読みエンジン (Endgame Solver)
 */
function solveEndgameWinningSequence(hand, currentField, unrevealed = [], reverse = false, rules = null, maxDepth = 4) {
  if (!hand || hand.length === 0) return null;
  const activeRules = getActiveGameRules(rules);
  const rawMoves = getAllValidMoves(hand, currentField, reverse, true, activeRules);
  if (rawMoves.length === 0) return null;

  const instant = rawMoves.find(m => m.length === hand.length && !isForbiddenFinishMove(m, hand, activeRules, reverse));
  if (instant) return instant;

  if (hand.length > 5) return null;

  // 8切り架け橋コンボ探索
  const eightMoves = rawMoves.filter(m => m.some(c => normalizeCardRank(c) === '8'));
  for (const em of eightMoves) {
    const remHand = hand.filter(c => !em.some(ec => isSameCard(ec, c)));
    if (remHand.length === 0) continue;

    const nextLeadMoves = getAllValidMoves(remHand, [], reverse, true, activeRules);
    const winNext = nextLeadMoves.find(nm => nm.length === remHand.length && !isForbiddenFinishMove(nm, remHand, activeRules, reverse));
    if (winNext) {
      return em;
    }
  }

  // 親番での確定制圧コンボ探索
  if ((!currentField || currentField.length === 0) && hand.length <= 4) {
    for (const firstMove of rawMoves) {
      if (isForbiddenFinishMove(firstMove, hand, activeRules, reverse)) continue;
      
      if (isGuaranteedAbsoluteWin(firstMove, unrevealed, reverse)) {
        const remHand = hand.filter(c => !firstMove.some(fc => isSameCard(fc, c)));
        if (remHand.length === 0) return firstMove;

        const nextMoves = getAllValidMoves(remHand, [], reverse, true, activeRules);
        const winNext = nextMoves.find(nm => nm.length === remHand.length && !isForbiddenFinishMove(nm, remHand, activeRules, reverse));
        if (winNext) {
          return firstMove;
        }

        if (maxDepth >= 3 && remHand.length <= 3) {
          for (const secondMove of nextMoves) {
            if (isGuaranteedAbsoluteWin(secondMove, unrevealed, reverse)) {
              const remRemHand = remHand.filter(c => !secondMove.some(sc => isSameCard(sc, c)));
              const finalMoves = getAllValidMoves(remRemHand, [], reverse, true, activeRules);
              const finalWin = finalMoves.find(fm => fm.length === remRemHand.length && !isForbiddenFinishMove(fm, remRemHand, activeRules, reverse));
              if (finalWin) {
                return firstMove;
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * 未出カード特定関数
 */
function getUnrevealedCards(myHand = [], playedHistory = [], currentField = []) {
  const known = [...(myHand || []), ...(playedHistory || []), ...(currentField || [])];
  return createDeck().filter(c => !known.some(k => isSameCard(c, k)));
}

function findDynamicBossCardsJS(myHand, unrevealed, rev = false) {
  const bossSingles = [];
  const bossPairs = [];

  const unrevJokers = unrevealed.filter(c => c.isJoker || normalizeCardRank(c) === 'JOKER');
  const hasSpade3 = myHand.some(c => !c.isJoker && normalizeCardSuit(c) === '♠' && normalizeCardRank(c) === '3');
  const unrevNj = unrevealed.filter(c => !c.isJoker && normalizeCardRank(c) !== 'JOKER');

  myHand.forEach(c => {
    if (c.isJoker || normalizeCardRank(c) === 'JOKER') { bossSingles.push(c); return; }
    const cStr = getCardStrength(c, rev);
    const stronger = unrevNj.filter(uc => getCardStrength(uc, rev) > cStr);
    if (stronger.length === 0) {
      if (unrevJokers.length === 0 || hasSpade3) {
        bossSingles.push(c);
      }
    }
  });

  const unrevGroups = {};
  unrevNj.forEach(c => {
    const k = normalizeCardRank(c);
    unrevGroups[k] = (unrevGroups[k] || 0) + 1;
  });
  const unrevPairDisplays = Object.keys(unrevGroups).filter(d => unrevGroups[d] + unrevJokers.length >= 2);

  const myGroups = {};
  myHand.forEach(c => {
    if (!c.isJoker && normalizeCardRank(c) !== 'JOKER') {
      const k = normalizeCardRank(c);
      if (!myGroups[k]) myGroups[k] = [];
      myGroups[k].push(c);
    }
  });

  Object.keys(myGroups).forEach(disp => {
    if (myGroups[disp].length >= 2) {
      const pStr = getCardStrength({ rank: disp, isJoker: false }, rev);
      const strongerPairs = unrevPairDisplays.filter(d => getCardStrength({ isJoker: false, rank: d }, rev) > pStr);
      if (strongerPairs.length === 0) {
        bossPairs.push(disp);
      }
    }
  });

  const myJokers = myHand.filter(c => c.isJoker || normalizeCardRank(c) === 'JOKER');
  if (myJokers.length >= 2) {
    bossPairs.push('JOKER');
  }

  return { bossSingles, bossPairs };
}

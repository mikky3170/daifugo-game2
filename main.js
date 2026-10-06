/* ====================================================================
 * ROYAL DAIFUGO - main.js 【前半（安全完全版）】
 * [Version: v4.0.0 - ウォッチドッグ外科手術・打牌即時応答＆都落ち直上警告根絶版]
 * ※ファイル先頭（1行目）から「7. DOM描画・手札アニメーション・UI同期」の終了までを出力します。
 * ==================================================================== */

/* ----------------------------------------------------
 * 1. ゲーム進行状態変数
 * ---------------------------------------------------- */
let isAutoPlayMode = false;
let hasPlayerUsedAutoInMatch = false; // 対局中の代行使用追跡フラグ
let isSpectatePaused = false;         // 観戦モード専用 一時停止フラグ
let enableCardExchange = true;
let currentSpeed = 1;
let isSoundMuted = false;
let currentStatsTab = 'practice';

let hands = { player: [], cpu1: [], cpu2: [], cpu3: [] };
let playerPassCounts = { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };
let hasPassedInRound = { player: false, cpu1: false, cpu2: false, cpu3: false };
let fieldCards = [];
let lastPlayedPlayer = null;
let currentTurnIndex = 0;
let consecutivePasses = 0;
let selectedIndices = [];
let isProcessing = false;              // 絶対排他ロック（演出・AI思考・アニメーション中）
let finishedPlayers = [];
let playerStatusMap = {};
let previousRanks = {};
let isRevolution = false;
let isElevenBack = false;
let isExchangePhase = false;
let isPreExchangePhase = false;
let isExchangeTransitioning = false; // カード交換演出・受取確認インターバル防護フラグ
let requiredExchangeCount = 0;
let pendingReceivedCards = [];       // カード交換保留バッファ（大富豪・富豪用）
let gameEnded = false;

// 禁止あがり自爆防止・確認待機フラグ
let pendingForbiddenConfirmation = false;
// 都落ち・反則負け記録
let foulPlayers = {};

let assignedCharacters = { player: null, cpu1: null, cpu2: null, cpu3: null };
let playedCardsHistory = [];
let currentRoundCards = [];
let clearedCardsHistory = [];
let cpuCooldowns = { cpu1: 0, cpu2: 0, cpu3: 0 };

let scenarioMatchActionStats = {
  player: { eightCuts: 0, revolutions: 0, finishCard: null },
  cpu1: { eightCuts: 0, revolutions: 0, finishCard: null },
  cpu2: { eightCuts: 0, revolutions: 0, finishCard: null },
  cpu3: { eightCuts: 0, revolutions: 0, finishCard: null }
};

// 手番スタック監視用タイムスタンプ
let lastTurnActivityTimestamp = Date.now();

/* ============================================================
 * 2. 全画面（フルスクリーン）モード コントローラー
 * ============================================================ */
function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function updateFullscreenButtonsUI() {
  const isFull = isFullscreenActive();
  const text = isFull ? '✖ 全画面解除' : '⛶ 全画面';
  document.querySelectorAll('.btn-fullscreen-toggle').forEach(b => {
    if (b) b.textContent = text;
  });
}

let isFullscreenToggling = false;
function toggleFullScreen() {
  if (isFullscreenToggling) return;
  isFullscreenToggling = true;
  soundMgr.playSelect();
  const isFull = isFullscreenActive();

  if (!isFull) {
    const docEl = document.documentElement;
    const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (req) {
      req.call(docEl).then(() => {
        updateFullscreenButtonsUI();
      }).catch(err => {
        console.warn('全画面化リクエスト失敗:', err);
        updateFullscreenButtonsUI();
      }).finally(() => {
        setTimeout(() => { isFullscreenToggling = false; }, 300);
      });
    } else {
      isFullscreenToggling = false;
    }
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) {
      exit.call(document).then(() => {
        updateFullscreenButtonsUI();
      }).catch(err => {
        console.warn('全画面解除リクエスト失敗:', err);
        updateFullscreenButtonsUI();
      }).finally(() => {
        setTimeout(() => { isFullscreenToggling = false; }, 300);
      });
    } else {
      isFullscreenToggling = false;
    }
  }

  setTimeout(updateFullscreenButtonsUI, 80);
  setTimeout(updateFullscreenButtonsUI, 350);
}

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
  document.addEventListener(evt, updateFullscreenButtonsUI);
});
window.addEventListener('focus', updateFullscreenButtonsUI);
window.addEventListener('pageshow', updateFullscreenButtonsUI);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(updateFullscreenButtonsUI, 120);
  }
});

/* ============================================================
 * 3. 演出バナー ＆ 一元化セッション終了関数 ＆ 飛翔着弾アニメーション
 * ============================================================ */
let eventBannerTimer = null;
let activeFlyingBanner = null;

function triggerEventBanner(text, bannerClass) {
  const banner = document.getElementById('event-banner');
  const bannerText = document.getElementById('event-banner-text');
  if (!banner || !bannerText) return;

  if (eventBannerTimer) clearTimeout(eventBannerTimer);

  banner.className = 'event-banner';
  bannerText.textContent = text;
  void banner.offsetWidth;

  banner.classList.add(bannerClass);

  eventBannerTimer = setTimeout(() => {
    banner.className = 'event-banner';
  }, 1900);
}

/**
 * 革命 / 11バック専用：中央出現 ➔ 上部ステータス枠へ「シュッ！」と吸い込まれる飛翔・着弾演出
 */
function triggerStatusFlyIn(bannerType, bannerText, targetBadgeId, onLanded) {
  if (activeFlyingBanner) {
    activeFlyingBanner.remove();
    activeFlyingBanner = null;
  }
  const oldBanner = document.getElementById('event-banner');
  if (oldBanner) oldBanner.className = 'event-banner';

  const targetBadge = document.getElementById(targetBadgeId);
  const viewport = document.getElementById('app-viewport') || document.body;

  const flyingEl = document.createElement('div');
  flyingEl.className = `flying-status-banner fly-${bannerType}`;
  flyingEl.innerHTML = `<div class="flying-banner-inner">${bannerText}</div>`;
  document.body.appendChild(flyingEl);
  activeFlyingBanner = flyingEl;

  const vpRect = viewport.getBoundingClientRect();
  const startX = vpRect.left + vpRect.width / 2;
  const startY = vpRect.top + vpRect.height * 0.44;

  flyingEl.style.left = `${startX}px`;
  flyingEl.style.top = `${startY}px`;
  flyingEl.style.transform = 'translate(-50%, -50%) scale(0.65)';
  flyingEl.style.opacity = '0';

  requestAnimationFrame(() => {
    flyingEl.style.transition = 'transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.22s ease';
    flyingEl.style.transform = 'translate(-50%, -50%) scale(1.08)';
    flyingEl.style.opacity = '1';
  });

  setTimeout(() => {
    if (!flyingEl || !flyingEl.parentNode) return;

    let targetX = startX;
    let targetY = vpRect.top + 70;

    if (targetBadge) {
      const bRect = targetBadge.getBoundingClientRect();
      if (bRect.width > 0 && bRect.height > 0) {
        targetX = bRect.left + bRect.width / 2;
        targetY = bRect.top + bRect.height / 2;
      } else {
        const statusArea = document.getElementById('status-area');
        if (statusArea) {
          const sRect = statusArea.getBoundingClientRect();
          targetX = sRect.left + sRect.width / 2;
          targetY = sRect.top + sRect.height / 2;
        }
      }
    }

    flyingEl.style.transition = 'left 0.38s cubic-bezier(0.25, 1, 0.5, 1), top 0.38s cubic-bezier(0.25, 1, 0.5, 1), transform 0.38s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s ease';
    flyingEl.style.left = `${targetX}px`;
    flyingEl.style.top = `${targetY}px`;
    flyingEl.style.transform = 'translate(-50%, -50%) scale(0.55)';
    flyingEl.style.opacity = '0.85';

    setTimeout(() => {
      if (flyingEl) {
        flyingEl.remove();
        if (activeFlyingBanner === flyingEl) activeFlyingBanner = null;
      }

      if (onLanded) onLanded();

      if (targetBadge) {
        targetBadge.classList.remove('landing-impact');
        void targetBadge.offsetWidth;
        targetBadge.classList.add('landing-impact');

        soundMgr.playTone(880, 1760, 'sine', 0.18, 0.25);

        setTimeout(() => {
          targetBadge.classList.remove('landing-impact');
        }, 700);
      }
    }, 380);
  }, 460);
}

/**
 * 手札配列から特定のカード群を安全かつ確実に1枚ずつ取り除くヘルパー
 */
function removeCardsFromHandSafe(hand, cardsToRemove) {
  if (!hand || !cardsToRemove || cardsToRemove.length === 0) return;
  cardsToRemove.forEach(targetCard => {
    const idx = hand.findIndex(c => isSameCard(c, targetCard));
    if (idx !== -1) {
      hand.splice(idx, 1);
    }
  });
}

function terminateCurrentSession() {
  console.log('[SESSION] セッション完全終了クリーンアップを実行します。');

  currentSessionGeneration++;
  GameTimer.clearAll();

  if (typeof ReplayManager !== 'undefined') {
    ReplayManager.stopAutoPlay();
  }

  if (activeFlyingBanner) {
    activeFlyingBanner.remove();
    activeFlyingBanner = null;
  }

  if (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.nextMatchTimerId) {
    GameTimer.clear(MatchSeriesManager.nextMatchTimerId);
    MatchSeriesManager.nextMatchTimerId = null;
  }

  isProcessing = false;
  gameEnded = false;
  isSpectatePaused = false;
  isExchangeTransitioning = false;
  pendingForbiddenConfirmation = false;
  foulPlayers = {};
  selectedIndices = [];
  pendingReceivedCards = [];
  hasPlayerUsedAutoInMatch = false;
  lastTurnActivityTimestamp = Date.now();

  document.querySelectorAll('.card-play-anim').forEach(el => el.remove());
  document.querySelectorAll('.champion-particle').forEach(el => el.remove());

  const fieldEl = document.getElementById('field-cards');
  if (fieldEl) fieldEl.classList.remove('clear-animation');

  PLAYERS.forEach(p => {
    const pt = document.getElementById(`${p}-portrait`);
    if (pt) {
      pt.classList.remove('portrait-talk');
      if (pt.timeoutId) GameTimer.clear(pt.timeoutId);
    }
    const bubble = document.querySelector(`#${p} .dialogue-bubble`);
    if (bubble) {
      bubble.classList.remove('show');
      if (bubble.timeoutId) GameTimer.clear(bubble.timeoutId);
    }
    const box = document.getElementById(p);
    if (box) box.classList.remove('is-speaking-parent');
  });

  const foulAlert = document.getElementById('player-foul-alert');
  if (foulAlert) {
    foulAlert.className = 'player-foul-alert is-hidden';
    foulAlert.textContent = '';
  }

  const banner = document.getElementById('event-banner');
  if (banner) {
    banner.className = 'event-banner';
    if (eventBannerTimer) clearTimeout(eventBannerTimer);
  }

  const modalsToClose = [
    'next-game-modal', 'modal-stage-clear', 'modal-scenario-next-match',
    'victory-popup', 'adv-overlay', 'practice-interim-modal', 'practice-finish-modal', 'replay-modal'
  ];
  modalsToClose.forEach(id => {
    const m = document.getElementById(id);
    if (m) {
      m.classList.remove('active');
      if (id === 'adv-overlay') m.classList.add('is-hidden');
    }
  });

  AIStatusUI.restoreIdleState();
  AIStatusUI.clearAllBrainDots();
}

function effectiveReverse() {
  return isRevolution !== isElevenBack;
}

function getSpeedMultiplier() {
  const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
  const isAuto = isAutoPlayMode || isSpectate;

  if (!isAuto) {
    if (finishedPlayers.includes('player')) {
      return 1.4;
    }
    return 1.0;
  }

  let base = currentSpeed;
  if (base === 2) return 1.8;
  if (base === 3) return 2.8;
  return 1.0;
}

function findCardIndexInHand(hand, targetCard, excludeIndices = []) {
  if (!hand || !targetCard) return -1;
  return hand.findIndex((c, i) => {
    if (excludeIndices.includes(i)) return false;
    return isSameCard(c, targetCard);
  });
}

function clearReceivedCardHighlights() {
  let hasAny = false;
  if (hands.player) {
    hands.player.forEach(c => {
      if (c.isReceivedCard || c.isGivingCard) {
        c.isReceivedCard = false;
        c.isGivingCard = false;
        hasAny = true;
      }
    });
  }
  if (hasAny) {
    const handEl = document.getElementById('player-hand');
    if (handEl) {
      handEl.querySelectorAll('.card.card-received-highlight, .card.card-giving-highlight').forEach(el => {
        el.classList.remove('card-received-highlight', 'card-giving-highlight');
      });
    }
  }
}

/* ============================================================
 * ★ 完全自立型・常時ハートビート監視（外科手術版）
 * 1. プレイヤーの手動手番は絶対に勝手にパスさせない（完全保護）
 * 2. CPUの3.5秒以上停止時のみ救済し、親番でのパスは構造的に完全禁止
 * ============================================================ */
setInterval(() => {
  if (typeof gameEnded === 'undefined' || gameEnded) return;
  if (typeof finishedPlayers === 'undefined' || finishedPlayers.length >= 3) return;
  
  if (isExchangePhase || isPreExchangePhase || isExchangeTransitioning) return;
  if (isSpectatePaused) return;

  const now = Date.now();
  const curr = PLAYERS[currentTurnIndex];

  // ★【完全保護防壁】手動プレイ中のプレイヤー手番はウォッチドッグの介入を100%遮断
  if (curr === 'player' && !isAutoPlayMode) {
    lastTurnActivityTimestamp = now;
    return;
  }

  // アニメーション進行中もタイムスタンプを維持して誤爆を防止
  if (isProcessing) {
    lastTurnActivityTimestamp = now;
    return;
  }

  // CPU手番におけるスタック判定（3.5秒以上の硬直）
  const stallThreshold = Math.max(3500, 4200 / getSpeedMultiplier());
  if (now - lastTurnActivityTimestamp > stallThreshold) {
    console.warn(`[WATCHDOG ENGINE] CPU手番停滞(${curr})を検知！自動着手または正当なパスで解決します。`);

    document.querySelectorAll('.card-play-anim').forEach(c => c.remove());
    GameTimer.clearAll();
    isProcessing = false;
    lastTurnActivityTimestamp = Date.now();

    AIStatusUI.clearAllBrainDots();
    AIStatusUI.restoreIdleState();

    const rev = effectiveReverse();
    const rawMoves = getAllValidMoves(hands[curr] || [], fieldCards, rev, true, gameRules);
    const charDef = assignedCharacters[curr] || CHARACTER_DEFS.KING;
    const validMoves = filterCpuMovesForCharacter(charDef.id, rawMoves);

    // ★親番（場が空）の場合：パスは絶対に認められないため、最弱単騎を強制着手
    if (fieldCards.length === 0) {
      if (validMoves && validMoves.length > 0) {
        const fallbackMove = validMoves[0];
        removeCardsFromHandSafe(hands[curr], fallbackMove);
        if (curr !== 'player') renderCpuStack(curr, hands[curr].length);
        playCardSuccessDirect(curr, fallbackMove);
        return;
      }
    }

    // 子番で手がない、またはパス可能な場合のみパス処理
    const seatNum = PLAYERS.indexOf(curr) + 1;
    AIDataLogger.recordStep(
      curr, seatNum, charDef, hands[curr], fieldCards, isRevolution, isElevenBack,
      consecutivePasses, hasPassedInRound, validMoves, null, null, false
    );

    playerPassCounts[curr]++;
    consecutivePasses++;
    selectedIndices = [];
    hasPassedInRound[curr] = true;

    const active = PLAYERS.filter(p => !finishedPlayers.includes(p));
    const willClear = (consecutivePasses >= active.length - 1 || consecutivePasses >= 3);
    AIDataLogger.recordTurnAction(seatNum, 'pass', [], willClear);

    setMessage(`${getPlayerDisplayName(curr)}がパスしました。`);
    render(false);
    nextTurn();
  }
}, 600);

/* ============================================================
 * 4. ゲーム開始 ＆ 進行ループ
 * ============================================================ */
function resetGame(reshuffle = false, keepRanks = false) {
  isProcessing = false;
  if (!keepRanks || reshuffle) previousRanks = {};
  if (reshuffle || !assignedCharacters.cpu1) pickRandomCPUCharacters();
  startNewGame();
}

function startNewGame() {
  terminateCurrentSession();

  const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
  if (!isAutoPlayMode && !isSpectate) {
    currentSpeed = 1;
  }

  const patternName = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive)
    ? 'SCENARIO_BATTLE'
    : ((typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive)
      ? (isAutoPlayMode ? 'SERIES_AUTO' : 'SERIES_MANUAL')
      : (isAutoPlayMode ? 'OBSERVE_AUTO' : 'MANUAL_GAME'));
  AIDataLogger.startNewGame(patternName);

  const deck = shuffle(createDeck());
  isRevolution = false;
  isElevenBack = false;
  playedCardsHistory = [];
  currentRoundCards = [];
  clearedCardsHistory = [];
  cpuCooldowns = { cpu1: 0, cpu2: 0, cpu3: 0 };
  hasPlayerUsedAutoInMatch = isAutoPlayMode;
  lastTurnActivityTimestamp = Date.now();
  pendingReceivedCards = [];
  isExchangeTransitioning = false;
  pendingForbiddenConfirmation = false;
  foulPlayers = {};

  scenarioMatchActionStats = {
    player: { eightCuts: 0, revolutions: 0, finishCard: null },
    cpu1: { eightCuts: 0, revolutions: 0, finishCard: null },
    cpu2: { eightCuts: 0, revolutions: 0, finishCard: null },
    cpu3: { eightCuts: 0, revolutions: 0, finishCard: null }
  };

  const dealOrder = shuffle([...PLAYERS]);
  hands.player = []; hands.cpu1 = []; hands.cpu2 = []; hands.cpu3 = [];
  deck.forEach((card, i) => hands[dealOrder[i % dealOrder.length]].push(card));
  PLAYERS.forEach(p => sortHand(hands[p]));

  playerPassCounts = { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };
  hasPassedInRound = { player: false, cpu1: false, cpu2: false, cpu3: false };
  fieldCards = [];
  lastPlayedPlayer = null;
  currentTurnIndex = 0;
  consecutivePasses = 0;
  selectedIndices = [];
  finishedPlayers = [];
  gameEnded = false;
  playerStatusMap = {};

  updateStatusUI();
  bgmMgr.update(isRevolution, isElevenBack);
  AIStatusUI.restoreIdleState();
  AIStatusUI.clearAllBrainDots();

  const canExchange = enableCardExchange && (Object.keys(previousRanks).length > 0);

  if (canExchange) {
    isPreExchangePhase = true;
    isExchangePhase = false;
    setMessage('カードが配られました。下の「カード交換へ」を押してください。');
    render(true);

    if (!ScenarioManager || !ScenarioManager.isActive) {
      SaveLoadManager.saveGameState(true, isAutoPlayMode ? 'auto' : 'player');
    }

    if (isAutoPlayMode) {
      GameTimer.set(() => { if (isPreExchangePhase) proceedToExchange(); }, 1400 / getSpeedMultiplier());
    }
  } else {
    isPreExchangePhase = false;
    isExchangePhase = false;
    setFirstTurnByDiamond3();
    render(true);

    if (!ScenarioManager || !ScenarioManager.isActive) {
      SaveLoadManager.saveGameState(true, isAutoPlayMode ? 'auto' : 'player');
    }

    checkTurn();
  }
}

function setFirstTurnByDiamond3() {
  let leaderPlayer = null;
  for (let i = 0; i < PLAYERS.length; i++) {
    const p = PLAYERS[i];
    const hasD3 = hands[p] && hands[p].some(c => 
      !c.isJoker &&
      normalizeCardSuit(c) === '♦' &&
      normalizeCardRank(c) === '3'
    );
    if (hasD3) {
      currentTurnIndex = i;
      leaderPlayer = p;
      break;
    }
  }
  if (!leaderPlayer) {
    currentTurnIndex = 0;
    leaderPlayer = 'player';
  }

  const pName = getPlayerDisplayName('player');
  if (leaderPlayer === 'player') {
    setMessage(`ゲーム開始！${pName}が「♦3」を持っています。最初に出すカードを選んでください。`);
  } else {
    setMessage(`${getPlayerDisplayName(leaderPlayer)}が「♦3」を持っています。${getPlayerDisplayName(leaderPlayer)}からスタート！`);
  }

  if (leaderPlayer !== 'player') {
    checkAndTriggerDialogue(leaderPlayer, 'GAME_START');
  }

  PLAYERS.filter(p => p !== 'player' && p !== leaderPlayer).forEach((otherCpu, idx) => {
    if (RandomManager.random() < 0.45) {
      GameTimer.set(() => {
        if (!gameEnded && fieldCards.length === 0) {
          checkAndTriggerDialogue(otherCpu, 'GAME_START');
        }
      }, (idx + 1) * 750);
    }
  });
}

/* ----------------------------------------------------
 * 5. カード交換処理
 * ---------------------------------------------------- */
function proceedToExchange() {
  soundMgr.playSelect();
  isPreExchangePhase = false;
  isExchangePhase = true;
  isExchangeTransitioning = false;
  pendingReceivedCards = [];

  let daifugo = null, fugo = null, hinmin = null, daihinmin = null;
  PLAYERS.forEach(p => {
    if (previousRanks[p] === '大富豪') daifugo = p;
    if (previousRanks[p] === '富豪') fugo = p;
    if (previousRanks[p] === '貧民') hinmin = p;
    if (previousRanks[p] === '大貧民') daihinmin = p;
  });

  if (daihinmin && daihinmin !== 'player') {
    checkAndTriggerDialogue(daihinmin, 'EXCHANGE');
  }
  if (hinmin && hinmin !== 'player') {
    GameTimer.set(() => {
      checkAndTriggerDialogue(hinmin, 'EXCHANGE');
    }, 400);
  }

  const isPlayerTribute = (daihinmin === 'player' || hinmin === 'player');
  if (isPlayerTribute) {
    sortHand(hands.player);
    const tributeCount = (daihinmin === 'player') ? 2 : 1;
    const startIndex = hands.player.length - tributeCount;
    for (let i = startIndex; i < hands.player.length; i++) {
      if (hands.player[i]) {
        hands.player[i].isGivingCard = true;
      }
    }
    render(true);

    const tributeNames = hands.player.slice(startIndex).map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(', ');
    const receiverRank = (daihinmin === 'player') ? '大富豪' : '富豪';
    setMessage(`【カード献上】最強カード【${tributeNames}】を${receiverRank}へ献上します`);

    isProcessing = true;
    GameTimer.set(() => {
      isProcessing = false;
      executeTributeExchange(daifugo, fugo, hinmin, daihinmin);
    }, 1300 / getSpeedMultiplier());
  } else {
    executeTributeExchange(daifugo, fugo, hinmin, daihinmin);
  }
}

function executeTributeExchange(daifugo, fugo, hinmin, daihinmin) {
  let playerTributeStr = '';
  let playerReceivedStr = '';

  if (daihinmin && daifugo) {
    sortHand(hands[daihinmin]);
    const tribute = hands[daihinmin].splice(hands[daihinmin].length - 2, 2);
    tribute.forEach(c => { c.isGivingCard = false; });

    if (daifugo === 'player') {
      pendingReceivedCards = tribute;
      GameStorage.recordExchange(0, 2);
    } else {
      hands[daifugo].push(...tribute);
      sortHand(hands[daifugo]);
    }

    if (daihinmin === 'player') {
      GameStorage.recordExchange(2, 0);
      playerTributeStr = tribute.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(', ');
    }
  }

  if (hinmin && fugo) {
    sortHand(hands[hinmin]);
    const tribute = hands[hinmin].splice(hands[hinmin].length - 1, 1);
    tribute.forEach(c => { c.isGivingCard = false; });

    if (fugo === 'player') {
      pendingReceivedCards = tribute;
      GameStorage.recordExchange(0, 1);
    } else {
      hands[fugo].push(...tribute);
      sortHand(hands[fugo]);
    }

    if (hinmin === 'player') {
      GameStorage.recordExchange(1, 0);
      playerTributeStr = tribute.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(', ');
    }
  }

  if (daifugo && daifugo !== 'player') {
    const cards = selectExchangeCardsSmart(hands[daifugo], 2);
    removeCardsFromHandSafe(hands[daifugo], cards);

    if (daihinmin === 'player') {
      cards.forEach(c => c.isReceivedCard = true);
      playerReceivedStr = cards.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(', ');
    }
    hands[daihinmin].push(...cards);
    sortHand(hands[daihinmin]);

    GameTimer.set(() => {
      checkAndTriggerDialogue(daifugo, 'EXCHANGE');
    }, 700);
  }

  if (fugo && fugo !== 'player') {
    const cards = selectExchangeCardsSmart(hands[fugo], 1);
    removeCardsFromHandSafe(hands[fugo], cards);

    if (hinmin === 'player') {
      cards.forEach(c => c.isReceivedCard = true);
      playerReceivedStr = cards.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(', ');
    }
    hands[hinmin].push(...cards);
    sortHand(hands[hinmin]);

    GameTimer.set(() => {
      checkAndTriggerDialogue(fugo, 'EXCHANGE');
    }, 900);
  }

  if (previousRanks.player === '大富豪') {
    requiredExchangeCount = 2;
    if (isAutoPlayMode) {
      autoSelectExchangeCards('player', 2);
    } else {
      setMessage(`【カード交換】不要なカードを <strong>2枚</strong> 選び「交換決定」を押してください`);
      render(true);
    }
  } else if (previousRanks.player === '富豪') {
    requiredExchangeCount = 1;
    if (isAutoPlayMode) {
      autoSelectExchangeCards('player', 1);
    } else {
      setMessage(`【カード交換】不要なカードを <strong>1枚</strong> 選び「交換決定」を押してください`);
      render(true);
    }
  } else {
    isExchangePhase = false;
    isExchangeTransitioning = true;
    PLAYERS.forEach(p => sortHand(hands[p]));
    render(true);

    setMessage(`【交換完了】下賜:${playerReceivedStr} ⇄ 献上:${playerTributeStr}`);

    lastTurnActivityTimestamp = Date.now();
    isProcessing = true;
    GameTimer.set(() => {
      isExchangeTransitioning = false;
      clearReceivedCardHighlights();
      render(false);
      setFirstTurnByDiamond3();
      lastTurnActivityTimestamp = Date.now();
      isProcessing = false;
      checkTurn();
    }, 1500 / getSpeedMultiplier());
  }
}

function autoSelectExchangeCards(player, count) {
  isProcessing = true;
  const cards = selectExchangeCardsSmart(hands[player], count);
  selectedIndices = [];
  cards.forEach(c => {
    const idx = findCardIndexInHand(hands[player], c, selectedIndices);
    if (idx > -1) selectedIndices.push(idx);
  });
  render(true);
  GameTimer.set(() => {
    isProcessing = false;
    confirmExchange();
  }, 1100 / getSpeedMultiplier());
}

function confirmExchange() {
  if (selectedIndices.length !== requiredExchangeCount) {
    setMessage(`カードを正しく${requiredExchangeCount}枚選択してください。`);
    return;
  }
  soundMgr.playCardPlay();

  const isDaifugo = (previousRanks.player === '大富豪');
  const target = isDaifugo
    ? PLAYERS.find(p => previousRanks[p] === '大貧民')
    : PLAYERS.find(p => previousRanks[p] === '貧民');

  const given = selectedIndices.map(idx => hands.player[idx]);
  removeCardsFromHandSafe(hands.player, given);

  if (target) {
    hands[target].push(...given);
    sortHand(hands[target]);
  }

  const receivedTextList = [];
  if (pendingReceivedCards && pendingReceivedCards.length > 0) {
    pendingReceivedCards.forEach(c => {
      c.isReceivedCard = true;
      hands.player.push(c);
      receivedTextList.push(c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`);
    });
    pendingReceivedCards = [];
  }

  const givenTextList = given.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`);

  selectedIndices = [];
  isExchangePhase = false;
  isExchangeTransitioning = true;
  PLAYERS.forEach(p => sortHand(hands[p]));

  const givenStr = givenTextList.join(', ');
  const receivedStr = receivedTextList.join(', ');

  render(true);
  setMessage(`【交換完了】受取:${receivedStr} ⇄ 放出:${givenStr}`);

  lastTurnActivityTimestamp = Date.now();
  isProcessing = true;
  GameTimer.set(() => {
    isExchangeTransitioning = false;
    clearReceivedCardHighlights();
    render(false);
    setFirstTurnByDiamond3();
    lastTurnActivityTimestamp = Date.now();
    isProcessing = false;
    checkTurn();
  }, 1500 / getSpeedMultiplier());
}

/* ----------------------------------------------------
 * 6. プレイヤー操作 ＆ 打牌処理（即時応答＆自爆防止ガードレール統合）
 * ---------------------------------------------------- */
function toggleSelectCardByCard(card) {
  const idx = hands.player.findIndex(c => isSameCard(c, card));
  if (idx > -1) toggleSelectCard(idx);
}

function toggleSelectCard(index) {
  if (isAutoPlayMode) return;
  if (isProcessing && !isExchangePhase) {
    // プレイヤー手番かつカード操作時は、前手番アニメーションの軽微な残留ロックを能動解除
    if (PLAYERS[currentTurnIndex] === 'player') {
      isProcessing = false;
    } else {
      return;
    }
  }
  if (isPreExchangePhase || isExchangeTransitioning) return;
  if (!isExchangePhase && PLAYERS[currentTurnIndex] !== 'player') return;

  clearReceivedCardHighlights();
  pendingForbiddenConfirmation = false;

  const handEl = document.getElementById('player-hand');
  const cardEls = handEl ? handEl.children : [];
  const selPos = selectedIndices.indexOf(index);

  if (selPos > -1) {
    selectedIndices.splice(selPos, 1);
    soundMgr.playDeselect();
    if (cardEls[index]) cardEls[index].classList.remove('selected');
  } else {
    if (isExchangePhase && selectedIndices.length >= requiredExchangeCount) {
      const removed = selectedIndices.shift();
      if (cardEls[removed]) cardEls[removed].classList.remove('selected');
    }
    selectedIndices.push(index);
    soundMgr.playSelect();
    if (cardEls[index]) cardEls[index].classList.add('selected');
  }

  if (isExchangePhase) {
    const curLen = selectedIndices.length;
    const req = requiredExchangeCount;
    if (curLen === 0) {
      setMessage(`【カード交換】不要なカードを <strong>${req}枚</strong> 選び「交換決定」を押してください`);
    } else if (curLen < req) {
      setMessage(`【カード交換】あと <strong>${req - curLen}枚</strong> 選択してください`);
    } else {
      setMessage(`✅ <strong>${req}枚</strong> 選択完了！「交換決定」を押してください`);
    }
  }

  updateControlsOnly();
}

function playerPlayCard() {
  if (PLAYERS[currentTurnIndex] !== 'player') return;

  // ★【即時応答最適化】プレイヤー手番中、前アニメの微小ディレイ残留によるロックを自動パージ
  if (isProcessing) {
    isProcessing = false;
  }

  if (selectedIndices.length === 0) { setMessage('出したいカードを選択してください。'); return; }

  clearReceivedCardHighlights();

  const cards = selectedIndices.map(i => hands.player[i]);
  const rev = effectiveReverse();
  if (!isValidPlay(cards, fieldCards, rev)) {
    setMessage('選択したカードはルール上出すことができません。');
    return;
  }

  // ★【禁止あがり警告アシスト】盤面中央への特大警告バッジ連動
  const isLastMove = (cards.length === hands.player.length);
  const activeRules = getActiveGameRules(gameRules);
  const willTrapForbidden = willLeaveOnlyForbiddenCards(cards, hands.player, rev);
  const foulAlert = document.getElementById('player-foul-alert');

  if (activeRules.forbiddenFinish && (isLastMove || willTrapForbidden)) {
    if (GAME_SETTINGS.forbiddenFinishAlert && !pendingForbiddenConfirmation) {
      pendingForbiddenConfirmation = true;
      soundMgr.playPass();

      if (isLastMove && isForbiddenFinish(cards, rev)) {
        triggerEventBanner('⚠️ 禁止あがり警告 ⚠️', 'banner-foul');
        if (foulAlert) {
          foulAlert.className = 'player-foul-alert';
          foulAlert.textContent = '⚠️ 反則負け（禁止あがり）になります！もう一度押すと強行';
          foulAlert.classList.remove('is-hidden');
        }
      } else if (willTrapForbidden) {
        triggerEventBanner('⚠️ 禁止カード詰み警告 ⚠️', 'banner-foul');
        if (foulAlert) {
          foulAlert.className = 'player-foul-alert';
          foulAlert.textContent = '⚠️ 残りが禁止カードのみになり詰みます！もう一度押すと強行';
          foulAlert.classList.remove('is-hidden');
        }
      }
      return;
    }
  }

  pendingForbiddenConfirmation = false;
  lastTurnActivityTimestamp = Date.now();

  // ★着手確定と同時に新規排他ロックを敷き、連打による不正な2重着手を完全遮断
  isProcessing = true;

  if (foulAlert && !foulPlayers.player) foulAlert.classList.add('is-hidden');

  const validMoves = getAllValidMoves(hands.player, fieldCards, rev, false, activeRules);
  AIDataLogger.recordStep(
    'player', 1, assignedCharacters.player, hands.player, fieldCards, isRevolution, isElevenBack,
    consecutivePasses, hasPassedInRound, validMoves, cards, null, true
  );

  const playedIndices = [...selectedIndices];
  animateCardMovement('player', playedIndices, cards, () => {
    removeCardsFromHandSafe(hands.player, cards);
    playCardSuccess('player', cards, false, playedIndices);
  });
}

function playerPass() {
  if (PLAYERS[currentTurnIndex] !== 'player') return;
  if (isProcessing) {
    isProcessing = false;
  }

  // ★親番（場が空＝fieldCards.length === 0）では絶対にパスできない
  if (fieldCards.length === 0) {
    setMessage('親番（場にカードがない状態）ではパスできません。カードを選んで出してください。');
    return;
  }

  clearReceivedCardHighlights();
  pendingForbiddenConfirmation = false;

  const foulAlert = document.getElementById('player-foul-alert');
  if (foulAlert && !foulPlayers.player) foulAlert.classList.add('is-hidden');

  if (selectedIndices.length > 0) {
    setMessage('💬 カードが選択されています。選択を解除するか「カードを出す」を押してください。');
    return;
  }

  lastTurnActivityTimestamp = Date.now();

  const rev = effectiveReverse();
  const validMoves = getAllValidMoves(hands.player, fieldCards, rev);
  AIDataLogger.recordStep(
    'player', 1, assignedCharacters.player, hands.player, fieldCards, isRevolution, isElevenBack,
    consecutivePasses, hasPassedInRound, validMoves, null, null, true
  );

  selectedIndices = [];
  const handEl = document.getElementById('player-hand');
  if (handEl) {
    const cardEls = handEl.querySelectorAll('.card.selected');
    cardEls.forEach(el => el.classList.remove('selected'));
  }
  updateControlsOnly();

  soundMgr.playPass();
  processPass('player');
}

function playCardSuccessDirect(player, cards) {
  clearReceivedCardHighlights();
  lastTurnActivityTimestamp = Date.now();

  const wasLoneJoker = fieldCards.length === 1 && (fieldCards[0].isJoker || normalizeCardRank(fieldCards[0]) === 'JOKER');
  fieldCards = cards;
  currentRoundCards.push(...cards);
  lastPlayedPlayer = player;
  consecutivePasses = 0;
  selectedIndices = [];
  playedCardsHistory.push(...cards);

  PLAYERS.forEach(p => { hasPassedInRound[p] = false; });

  const isSpade3Return = wasLoneJoker && cards.length === 1 && !cards[0].isJoker && normalizeCardSuit(cards[0]) === '♠' && normalizeCardRank(cards[0]) === '3';
  if (cards.length >= 4) {
    isRevolution = !isRevolution;
    scenarioMatchActionStats[player].revolutions++;
    PLAYERS.forEach(p => sortHand(hands[p]));
  }
  const isElevenBackCard = cards.some(c => normalizeCardRank(c) === 'J');
  if (isElevenBackCard) {
    isElevenBack = true;
    PLAYERS.forEach(p => sortHand(hands[p]));
  }
  const isEight = cards.some(c => normalizeCardRank(c) === '8');
  if (isEight) {
    scenarioMatchActionStats[player].eightCuts++;
  }

  const seatNum = PLAYERS.indexOf(player) + 1;
  AIDataLogger.recordTurnAction(seatNum, 'play', cards, isEight || isSpade3Return);

  // ★【本格競技ルール判定連動】都落ち＆反則負け評価
  const prevDaifugoId = Object.keys(previousRanks).find(k => previousRanks[k] === '大富豪');
  const activeList = PLAYERS.filter(p => !finishedPlayers.includes(p));
  const finishEvaluation = evaluatePlayFinish({
    playerId: player,
    playedCards: cards,
    remainingHand: hands[player],
    previousDaifugoId: prevDaifugoId,
    currentRankings: [...finishedPlayers],
    activePlayers: activeList,
    effRev: effectiveReverse(),
    rules: gameRules
  });

  if (finishEvaluation.status === 'FORBIDDEN_FINISH') {
    finishedPlayers.push(player);
    playerStatusMap[player] = '大貧民';
    foulPlayers[player] = '反則負け';
    if (player === 'player') {
      triggerEventBanner('⚠️ 反則負け（禁止あがり） ⚠️', 'banner-foul');
    }
  } else if (finishEvaluation.status === 'FINISH') {
    if (!finishedPlayers.includes(player)) {
      finishedPlayers.push(player);
      assignWinRank(player);
      scenarioMatchActionStats[player].finishCard = cards[0];
    }
    if (finishEvaluation.capitalFallVictim) {
      const victim = finishEvaluation.capitalFallVictim;
      if (!finishedPlayers.includes(victim)) {
        finishedPlayers.push(victim);
        playerStatusMap[victim] = '大貧民';
        foulPlayers[victim] = '都落ち';

        // ★プレイヤーが都落ちした場合のみ全画面バナー＆警告バッジを表示
        if (victim === 'player') {
          triggerEventBanner('🏛️ 都落ち発動！ 🏛️', 'banner-eight-cut');
          const foulAlert = document.getElementById('player-foul-alert');
          if (foulAlert) {
            foulAlert.className = 'player-foul-alert is-capital-fall';
            foulAlert.textContent = '🏛️ 都落ち発動！ 他者が先にあがったため大貧民確定（離脱）';
            foulAlert.classList.remove('is-hidden');
          }
        }
      }
    }
  }

  updateStatusUI();
  bgmMgr.update(isRevolution, isElevenBack);
  render(true);

  if (isEight || isSpade3Return) {
    clearFieldDirect(player);
  } else {
    nextTurn();
  }
}

function playCardSuccess(player, cards, needFullRedraw = false, playedIndices = []) {
  clearReceivedCardHighlights();
  lastTurnActivityTimestamp = Date.now();

  const wasLoneJoker = fieldCards.length === 1 && (fieldCards[0].isJoker || normalizeCardRank(fieldCards[0]) === 'JOKER');
  fieldCards = cards;
  currentRoundCards.push(...cards);
  lastPlayedPlayer = player;
  consecutivePasses = 0;
  selectedIndices = [];
  playedCardsHistory.push(...cards);

  PLAYERS.forEach(p => {
    hasPassedInRound[p] = false;
  });

  const cardStr = cards.map(c => (c.isJoker ? `${normalizeCardSuit(c)}JOKER` : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`)).join(' ');
  let actionText = `${getPlayerDisplayName(player)}が「${cardStr}」を出しました。`;
  let hasSpecial = false;
  let specialType = null;

  const isSpade3Return = wasLoneJoker && cards.length === 1 && !cards[0].isJoker && normalizeCardSuit(cards[0]) === '♠' && normalizeCardRank(cards[0]) === '3';
  const isJokerSolo = cards.length === 1 && (cards[0].isJoker || normalizeCardRank(cards[0]) === 'JOKER');

  if (isSpade3Return) {
    actionText += '<br>⚔️ スペード3返し発動！ジョーカーを撃破し場を流します！';
    triggerEventBanner('⚔️ ♠3返し ⚔️', 'banner-eight-cut');
    hasSpecial = true;
    specialType = 'STRONG';
    soundMgr.playSpade3Return();
  } else if (isJokerSolo) {
    actionText += '<br>ジョーカー、絶対強者の一撃！';
    hasSpecial = true; specialType = 'STRONG';
    soundMgr.playJoker();
  }

  if (cards.length >= 4) {
    const wasRev = isRevolution;
    isRevolution = !isRevolution;
    if (wasRev) {
      actionText += '<br>⚡ 革命返し成立！秩序が戻った！';
      triggerStatusFlyIn('revolution-reverse', '⚡ 革命返し！ ⚡', 'revolution-status', () => {
        updateStatusUI();
      });
    } else {
      actionText += '<br>⚡ 革命発生！強弱が逆転！';
      triggerStatusFlyIn('revolution', '⚡ REVOLUTION ⚡', 'revolution-status', () => {
        updateStatusUI();
      });
    }
    scenarioMatchActionStats[player].revolutions++;
    PLAYERS.forEach(p => sortHand(hands[p]));
    needFullRedraw = true; hasSpecial = true; specialType = 'REVOLUTION';
  }

  const isEleven = cards.some(c => normalizeCardRank(c) === 'J');
  if (isEleven) {
    isElevenBack = true;
    actionText += '<br>⚡ 11バック発動！';
    triggerStatusFlyIn('eleven-back', '⚡ 11 BACK ⚡', 'eleven-back-status', () => {
      updateStatusUI();
    });
    PLAYERS.forEach(p => sortHand(hands[p]));
    needFullRedraw = true; hasSpecial = true;
    if (!specialType) specialType = 'ELEVEN_BACK';
  }

  const isEight = cards.some(c => normalizeCardRank(c) === '8');
  if (isEight) {
    actionText += '<br>⚔️ 8切り発動！';
    triggerEventBanner('⚔️ 8切り ⚔️', 'banner-eight-cut');
    scenarioMatchActionStats[player].eightCuts++;
    hasSpecial = true;
    if (!specialType) specialType = 'EIGHT_CUT';
  }

  const seatNum = PLAYERS.indexOf(player) + 1;
  const isClearedAction = isEight || isSpade3Return;
  AIDataLogger.recordTurnAction(seatNum, 'play', cards, isClearedAction);

  if (hasSpecial && !isSpade3Return && !isJokerSolo) soundMgr.playSpecial();

  // ★【本格競技ルール判定連動】都落ち＆反則負け評価
  const prevDaifugoId = Object.keys(previousRanks).find(k => previousRanks[k] === '大富豪');
  const activeList = PLAYERS.filter(p => !finishedPlayers.includes(p));
  const finishEvaluation = evaluatePlayFinish({
    playerId: player,
    playedCards: cards,
    remainingHand: hands[player],
    previousDaifugoId: prevDaifugoId,
    currentRankings: [...finishedPlayers],
    activePlayers: activeList,
    effRev: effectiveReverse(),
    rules: gameRules
  });

  let hasPlayerCapitalFallen = false;

  if (finishEvaluation.status === 'FORBIDDEN_FINISH') {
    finishedPlayers.push(player);
    playerStatusMap[player] = '大貧民';
    foulPlayers[player] = '反則負け';
    soundMgr.playTone(220, 110, 'sawtooth', 0.4, 0.3);
    if (player === 'player') {
      triggerEventBanner('⚠️ 反則負け（禁止あがり） ⚠️', 'banner-foul');
    }
    actionText += `<br><span style="color:#ff6b6b; font-weight:bold;">⚠️ 【反則負け】${getPlayerDisplayName(player)}が禁止カードであがったため失格・大貧民確定！</span>`;
  } else if (finishEvaluation.status === 'FINISH') {
    if (!finishedPlayers.includes(player)) {
      finishedPlayers.push(player);
      assignWinRank(player);
      scenarioMatchActionStats[player].finishCard = cards[0];
      soundMgr.playWin();
      actionText += `<br>${getPlayerDisplayName(player)}が上がり！<br>【${playerStatusMap[player]}】確定！`;
      if (player !== 'player') checkAndTriggerDialogue(player, 'WIN');
    }

    if (finishEvaluation.capitalFallVictim) {
      const victim = finishEvaluation.capitalFallVictim;
      if (!finishedPlayers.includes(victim)) {
        finishedPlayers.push(victim);
        playerStatusMap[victim] = '大貧民';
        foulPlayers[victim] = '都落ち';
        actionText += `<br><span style="color:#ffd700; font-weight:bold;">🏛️ 【都落ち】前大富豪（${getPlayerDisplayName(victim)}）が1位になれなかったため失格・大貧民転落！</span>`;
        if (victim !== 'player') checkAndTriggerDialogue(victim, 'LOSE');

        // ★プレイヤーが都落ちした場合のみ全画面バナー＆警告バッジを表示
        if (victim === 'player') {
          hasPlayerCapitalFallen = true;
          triggerEventBanner('🏛️ 都落ち発動！ 🏛️', 'banner-eight-cut');
          const foulAlert = document.getElementById('player-foul-alert');
          if (foulAlert) {
            foulAlert.className = 'player-foul-alert is-capital-fall';
            foulAlert.textContent = '🏛️ 都落ち発動！ 他者が先にあがったため大貧民確定（離脱）';
            foulAlert.classList.remove('is-hidden');
          }
        }
      }
    }
  }

  setMessage(actionText);
  updateStatusUI();
  bgmMgr.update(isRevolution, isElevenBack);

  const hasWon = hands[player].length === 0;
  if (!hasWon && player !== 'player') {
    checkAndTriggerDialogue(player, specialType || 'PLAY_CARD', cards);
  }

  if (!ScenarioManager || !ScenarioManager.isActive) {
    SaveLoadManager.saveGameState(true, player);
  }

  if (needFullRedraw) render(true);
  else if (player === 'player') { syncPlayerHandAfterPlay(playedIndices); render(false); }
  else render(false);

  // ★都落ち発動時の一時停止（プレイヤーが状況を目視できるディレイ）
  if (hasPlayerCapitalFallen) {
    isProcessing = true;
    GameTimer.set(() => {
      isProcessing = false;
      if (isEight || isSpade3Return) {
        clearFieldDirect(player);
      } else {
        nextTurn();
      }
    }, 1800 / getSpeedMultiplier());
    return;
  }

  if (isEight || isSpade3Return) {
    clearFieldDirect(player);
  } else {
    nextTurn();
  }
}

function assignWinRank(player) {
  const ranks = ['大富豪', '富豪', '貧民', '大貧民'];
  for (let r of ranks) {
    if (!Object.values(playerStatusMap).includes(r)) {
      playerStatusMap[player] = r;
      if (r === '大富豪') showVictoryPopup(player);
      break;
    }
  }
}

function processPass(player) {
  // ★親番（場が空＝fieldCards.length === 0）では絶対にパスできないガードレール
  if (fieldCards.length === 0) {
    console.warn(`[SAFETY] 親番でのパス要求(${player})を遮断しました。強制着手を促します。`);
    return;
  }

  clearReceivedCardHighlights();
  lastTurnActivityTimestamp = Date.now();

  playerPassCounts[player]++;
  consecutivePasses++;
  selectedIndices = [];
  hasPassedInRound[player] = true;

  const seatNum = PLAYERS.indexOf(player) + 1;
  const active = PLAYERS.filter(p => !finishedPlayers.includes(p));
  const willClear = (consecutivePasses >= active.length - 1 || consecutivePasses >= 3);
  AIDataLogger.recordTurnAction(seatNum, 'pass', [], willClear);

  if (player !== 'player') checkAndTriggerDialogue(player, 'PASS');
  setMessage(`${getPlayerDisplayName(player)}がパスしました。`);

  if (!ScenarioManager || !ScenarioManager.isActive) {
    SaveLoadManager.saveGameState(true, player);
  }

  render(false);
  nextTurn();
}

function nextTurn() {
  lastTurnActivityTimestamp = Date.now();
  isProcessing = false;

  const foulAlert = document.getElementById('player-foul-alert');
  if (foulAlert && !foulPlayers.player) foulAlert.classList.add('is-hidden');

  const active = PLAYERS.filter(p => !finishedPlayers.includes(p));

  if (active.length <= 1) {
    if (active.length === 1) {
      const last = active[0];
      finishedPlayers.push(last);
      assignWinRank(last);
      if (last !== 'player') checkAndTriggerDialogue(last, 'LOSE');
    }
    gameEnded = true;
    previousRanks = { ...playerStatusMap };

    PLAYERS.forEach(p => {
      const pt = document.getElementById(`${p}-portrait`);
      if (pt) pt.classList.remove('portrait-talk');
      const bubble = document.querySelector(`#${p} .dialogue-bubble`);
      if (bubble) bubble.classList.remove('show');
      AIStatusUI.clearBrainDot(p);
    });

    const rankValues = { '大富豪': 1, '富豪': 2, '貧民': 3, '大貧民': 4 };
    const seatResults = PLAYERS.map((p, idx) => ({
      seat: idx + 1,
      charId: assignedCharacters[p]?.id || p,
      charName: getPlayerDisplayName(p),
      finalRank: rankValues[playerStatusMap[p]] || 4,
      rankTitle: playerStatusMap[p]
    }));
    const remainingCardsMap = {};
    PLAYERS.forEach((p, idx) => { remainingCardsMap[`seat_${idx + 1}`] = AIDataLogger.serializeCards(hands[p]); });
    
    AIDataLogger.recordEpisodeEnd(seatResults, remainingCardsMap);

    render(false);

    const msgBox = document.getElementById('message-text');
    const existingMsg = msgBox ? msgBox.innerHTML : '';
    const hasFoulOrCapital = Object.keys(foulPlayers).length > 0;
    if (existingMsg && hasFoulOrCapital) {
      setMessage(`${existingMsg}<br><strong style="color:#ffd700;">【ゲームセット】全員の順位が確定しました。</strong>`);
    } else {
      setMessage('ゲームセット！全員の順位が確定しました。');
    }

    const finishDelay = hasFoulOrCapital ? Math.max(1600, 2000 / getSpeedMultiplier()) : Math.max(700, 900 / getSpeedMultiplier());
    isProcessing = true;

    GameTimer.set(() => {
      isProcessing = false;
      GameEventManager.emit('gameEnd', {
        playerStatusMap: { ...playerStatusMap },
        finishedPlayers: [...finishedPlayers],
        previousRanks: { ...previousRanks },
        actionStats: { ...scenarioMatchActionStats },
        isAutoPlayMode: isAutoPlayMode,
        hasUsedAuto: hasPlayerUsedAutoInMatch
      });
    }, finishDelay);

    return;
  }

  const isAllActivePassed = active.length > 0 && active.every(p => hasPassedInRound[p]);
  const othersPassed = lastPlayedPlayer && active.filter(p => p !== lastPlayedPlayer).every(p => hasPassedInRound[p]);
  const isParentFinishedAndAllPassed = lastPlayedPlayer && finishedPlayers.includes(lastPlayedPlayer) && active.every(p => hasPassedInRound[p]);
  const isConsecutiveLimit = consecutivePasses >= active.length;

  if (fieldCards.length > 0 && (isAllActivePassed || othersPassed || isParentFinishedAndAllPassed || isConsecutiveLimit)) {
    clearFieldDirect();
    return;
  }

  let nextIdx = currentTurnIndex;
  let loopCount = 0;
  let found = false;

  while (loopCount < PLAYERS.length * 2) {
    nextIdx = (nextIdx + 1) % PLAYERS.length;
    loopCount++;
    const p = PLAYERS[nextIdx];

    if (!finishedPlayers.includes(p)) {
      if (fieldCards.length > 0 && lastPlayedPlayer === p) {
        currentTurnIndex = nextIdx;
        clearFieldDirect();
        return;
      }

      if (!hasPassedInRound[p]) {
        currentTurnIndex = nextIdx;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    clearFieldDirect();
    return;
  }

  checkTurn();
}

function clearFieldDirect(nextPlayer = null) {
  lastTurnActivityTimestamp = Date.now();

  clearedCardsHistory.push(...currentRoundCards);
  currentRoundCards = [];
  fieldCards = [];
  consecutivePasses = 0;

  const fieldEl = document.getElementById('field-cards');
  if (fieldEl) {
    fieldEl.innerHTML = '';
    fieldEl.classList.remove('clear-animation');
  }

  PLAYERS.forEach(p => hasPassedInRound[p] = false);

  let redraw = false;
  if (isElevenBack) {
    isElevenBack = false;
    PLAYERS.forEach(p => sortHand(hands[p]));
    selectedIndices = [];
    redraw = true;
  }

  updateStatusUI();
  bgmMgr.update(isRevolution, isElevenBack);

  const activeSurvivors = PLAYERS.filter(p => !finishedPlayers.includes(p));
  if (activeSurvivors.length <= 1) {
    nextTurn();
    return;
  }

  if (nextPlayer && !finishedPlayers.includes(nextPlayer)) {
    currentTurnIndex = PLAYERS.indexOf(nextPlayer);
  } else if (lastPlayedPlayer && !finishedPlayers.includes(lastPlayedPlayer)) {
    currentTurnIndex = PLAYERS.indexOf(lastPlayedPlayer);
  } else {
    let candidateSeat = lastPlayedPlayer ? PLAYERS.indexOf(lastPlayedPlayer) : currentTurnIndex;
    let searchCount = 0;
    let resolved = false;
    while (searchCount < PLAYERS.length) {
      candidateSeat = (candidateSeat + 1) % PLAYERS.length;
      searchCount++;
      if (!finishedPlayers.includes(PLAYERS[candidateSeat])) {
        currentTurnIndex = candidateSeat;
        resolved = true;
        break;
      }
    }
    if (!resolved) {
      const survivor = PLAYERS.find(pl => !finishedPlayers.includes(pl));
      if (survivor) currentTurnIndex = PLAYERS.indexOf(survivor);
    }
  }

  lastPlayedPlayer = null;
  isProcessing = false;
  render(redraw);

  const leadP = PLAYERS[currentTurnIndex];
  if (leadP === 'player') {
    setMessage(`場が流れました。${getPlayerDisplayName('player')}の親番です。自由に出すカードを選んでください。`);
  } else {
    setMessage(`場が流れました。${getPlayerDisplayName(leadP)}の親番から再開します。`);
  }

  checkTurn();
}

function checkTurn() {
  if (gameEnded || finishedPlayers.length >= 3) return;
  if (isSpectatePaused || isExchangeTransitioning) return;

  lastTurnActivityTimestamp = Date.now();
  isProcessing = false;

  let curr = PLAYERS[currentTurnIndex];
  
  if (!curr || finishedPlayers.includes(curr)) {
    let searchCount = 0;
    let nextCandidate = currentTurnIndex;
    let foundActive = false;
    while (searchCount < PLAYERS.length) {
      nextCandidate = (nextCandidate + 1) % PLAYERS.length;
      searchCount++;
      if (!finishedPlayers.includes(PLAYERS[nextCandidate])) {
        currentTurnIndex = nextCandidate;
        curr = PLAYERS[currentTurnIndex];
        foundActive = true;
        break;
      }
    }
    if (!foundActive) {
      nextTurn();
      return;
    }
  }

  const speed = getSpeedMultiplier();

  if (curr === 'player' && !isAutoPlayMode) {
    // ★【完全即応保証】プレイヤーの手番が来たら直前の残留アニメ・ロックを確実にパージ
    isProcessing = false;
    currentSpeed = 1;
    AIStatusUI.restoreIdleState();
    AIStatusUI.clearAllBrainDots();
    render(false);

    if (!ScenarioManager || !ScenarioManager.isActive) {
      SaveLoadManager.saveGameState(true, 'player');
    }
  } else {
    isProcessing = true;
    render(false);

    const charDef = assignedCharacters[curr];
    const isTarget = isPythonServerTargetChar(charDef?.id);

    if (isTarget) {
      AIStatusUI.setBrainDot(curr, true, AIStatusUI.isServerOnline);
    }

    const baseDelay = isTarget ? 880 : 720;
    const tickDelay = Math.max(260, baseDelay / speed);
    GameTimer.set(() => cpuPlayTurn(curr), tickDelay);
  }
}

async function cpuPlayTurn(cpu) {
  if (gameEnded || finishedPlayers.includes(cpu) || isSpectatePaused || isExchangeTransitioning) {
    AIStatusUI.clearBrainDot(cpu);
    isProcessing = false;
    return;
  }

  const activeGen = currentSessionGeneration;
  lastTurnActivityTimestamp = Date.now();

  try {
    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isPlayerAuto = (cpu === 'player' && isAutoPlayMode);

    if (isPlayerAuto && !isSpectate) {
      hasPlayerUsedAutoInMatch = true;
    }

    const charDef = assignedCharacters[cpu] || CHARACTER_DEFS.KING;

    const isTargetServerChar = isPythonServerTargetChar(charDef?.id);
    AIStatusUI.setBrainDot(cpu, true, AIStatusUI.isServerOnline);

    const rev = effectiveReverse();
    const rawMoves = getAllValidMoves(hands[cpu] || [], fieldCards, rev, true, gameRules);
    const validMoves = filterCpuMovesForCharacter(charDef.id, rawMoves);
    let move = null;

    if (validMoves.length === 0) {
      move = null;
    } else if (isTargetServerChar && AIStatusUI.isServerOnline) {
      move = await askPythonAI(hands[cpu], fieldCards, validMoves, 'super', cpu, activeGen);
      if (activeGen !== currentSessionGeneration) {
        AIStatusUI.clearBrainDot(cpu);
        isProcessing = false;
        return;
      }
    } else {
      const explicitContext = {
        hands: hands,
        fieldCards: fieldCards,
        rev: rev,
        finished: finishedPlayers,
        playedHistory: playedCardsHistory,
        lastPlayer: lastPlayedPlayer,
        passes: consecutivePasses,
        assigned: assignedCharacters
      };
      move = decideCpuMove(cpu, explicitContext);
    }

    // ★親番（場が空）での絶対フォールバック保証
    if (fieldCards.length === 0 && (!move || move.length === 0) && validMoves.length > 0) {
      move = validMoves[0];
    }

    if (activeGen !== currentSessionGeneration || gameEnded || isSpectatePaused || isExchangeTransitioning) {
      AIStatusUI.clearBrainDot(cpu);
      isProcessing = false;
      return;
    }

    const seatNum = PLAYERS.indexOf(cpu) + 1;
    AIDataLogger.recordStep(
      cpu,
      seatNum,
      charDef,
      hands[cpu],
      fieldCards,
      isRevolution,
      isElevenBack,
      consecutivePasses,
      hasPassedInRound,
      validMoves,
      move,
      null,
      false
    );

    if (move && move.length > 0) {
      AIStatusUI.clearBrainDot(cpu);
      AIStatusUI.restoreIdleState();

      const playedIndices = [];
      move.forEach(c => {
        const idx = findCardIndexInHand(hands[cpu], c, playedIndices);
        if (idx > -1) {
          playedIndices.push(idx);
        }
      });

      animateCardMovement(cpu, playedIndices, move, () => {
        removeCardsFromHandSafe(hands[cpu], move);
        if (cpu !== 'player') renderCpuStack(cpu, hands[cpu].length);
        playCardSuccess(cpu, move, false, playedIndices);
      });
    } else {
      // 親番で万一手が出なかった場合は強制的に最弱手を着手してスタックを回避
      if (fieldCards.length === 0 && hands[cpu] && hands[cpu].length > 0) {
        const forcedMove = [hands[cpu][0]];
        removeCardsFromHandSafe(hands[cpu], forcedMove);
        if (cpu !== 'player') renderCpuStack(cpu, hands[cpu].length);
        playCardSuccess(cpu, forcedMove, false, [0]);
        return;
      }

      AIStatusUI.clearBrainDot(cpu);
      AIStatusUI.restoreIdleState();
      isProcessing = false;
      soundMgr.playPass();
      processPass(cpu);
    }
  } catch (err) {
    if (activeGen !== currentSessionGeneration || gameEnded) return;
    console.error(`[CPU Turn Error] ${cpu}:`, err);
    AIStatusUI.clearBrainDot(cpu);
    AIStatusUI.restoreIdleState();
    isProcessing = false;
    soundMgr.playPass();
    processPass(cpu);
  }
}

/* ============================================================
 * 7. DOM描画・手札アニメーション・UI同期
 * ============================================================ */
function createCardElement(card) {
  const el = document.createElement('div');
  const receivedClass = card.isReceivedCard ? ' card-received-highlight' : '';
  const givingClass = card.isGivingCard ? ' card-giving-highlight' : '';

  if (card.isJoker || normalizeCardRank(card) === 'JOKER') {
    const isSun = (card.jokerId === 'J1' || card.suitClass === 'joker-sun' || normalizeCardSuit(card) === '★');
    if (isSun) {
      el.className = `card joker joker-sun${receivedClass}${givingClass}`;
      el.innerHTML = `
        <div class="card-top">
          <span class="card-suit-symbol">★</span>
          <span class="card-rank">JOKER</span>
        </div>
        <span class="card-center-icon">🃏</span>
        <div class="card-watermark">☀️</div>
      `;
    } else {
      el.className = `card joker joker-moon${receivedClass}${givingClass}`;
      el.innerHTML = `
        <div class="card-top">
          <span class="card-suit-symbol">☆</span>
          <span class="card-rank">JOKER</span>
        </div>
        <span class="card-center-icon">🎭</span>
        <div class="card-watermark">🌙</div>
      `;
    }
  } else {
    const disp = normalizeCardRank(card);
    const isPicture = (disp === 'J' || disp === 'Q' || disp === 'K');
    const crownHtml = isPicture ? '<span class="royal-crown-mini">👑</span>' : '';
    const rankClass = (disp === '2') ? ' card-rank-2' : '';
    const suitSym = normalizeCardSuit(card) || '♠';
    const sClass = (
      suitSym === '♠' ? 'spade' :
      suitSym === '♥' ? 'heart' :
      suitSym === '♦' ? 'diamond' : 'club'
    );
    
    el.className = `card ${sClass}${rankClass}${receivedClass}${givingClass}`;
    el.innerHTML = `
      <div class="card-top">
        <span class="card-suit-symbol">${suitSym}</span>
        <span class="card-rank">${disp}${crownHtml}</span>
      </div>
      <div class="card-watermark">${suitSym}</div>
    `;
  }
  return el;
}

function renderCpuStack(cpuId, count) {
  const stack = document.getElementById(`${cpuId}-stack`);
  if (!stack) return;
  stack.innerHTML = '';
  if (count <= 0) return;

  const isTablet = window.innerWidth > 600;
  const cardW = isTablet ? 42 : 34;
  let maxStackW = isTablet ? 92 : 80;

  if (cpuId === 'cpu2') {
    maxStackW = isTablet ? 220 : 185;
  }

  let overlapPx = 0;
  if (count > 1) {
    const step = (maxStackW - cardW) / (count - 1);
    overlapPx = Math.floor(step - cardW);
    overlapPx = Math.min(0, Math.max(overlapPx, -(cardW - 8)));
  }

  stack.style.setProperty('--cpu-overlap', `${overlapPx}px`);

  for (let i = 0; i < count; i++) {
    const back = document.createElement('div');
    back.className = 'card-back';
    stack.appendChild(back);
  }
}

function updateHandOverlap() {
  const handEl = document.getElementById('player-hand');
  if (!handEl) return;
  const cards = handEl.querySelectorAll(':scope > .card');
  const n = cards.length;
  if (n <= 1) {
    handEl.style.removeProperty('--hand-overlap');
    return;
  }

  const viewportW = window.innerWidth || document.documentElement.clientWidth || 360;
  const effectiveMaxW = Math.min(viewportW, 520);
  const containerW = effectiveMaxW - 8;
  const cardWidth = cards[0].offsetWidth || (viewportW <= 600 ? 46 : 56);

  let marginPx = 0;
  if (n <= 5) {
    marginPx = 0;
  } else {
    const needed = (containerW - cardWidth) / (n - 1) - cardWidth;
    const minStep = 14;
    const maxOverlap = -(cardWidth - minStep);
    marginPx = Math.min(0, Math.max(maxOverlap, Math.floor(needed)));
  }

  handEl.style.setProperty('--hand-overlap', `${marginPx}px`);
}

function updateFieldOverlap() {
  const container = document.getElementById('field-container-el');
  const fieldEl = document.getElementById('field-cards');
  if (!container || !fieldEl) return;

  const cards = fieldEl.querySelectorAll(':scope > .card');
  const n = cards.length;
  if (n <= 1) {
    fieldEl.style.removeProperty('--field-overlap');
    return;
  }

  const cardWidth = cards[0].offsetWidth || 45;
  const availableW = container.clientWidth - 12;
  const normalTotal = n * cardWidth + (n - 1) * 4;

  if (normalTotal <= availableW) {
    fieldEl.style.setProperty('--field-overlap', '4px');
    return;
  }

  const overlapMargin = (availableW - cardWidth) / (n - 1) - cardWidth;
  fieldEl.style.setProperty('--field-overlap', `${Math.min(4, overlapMargin)}px`);
}

function syncPlayerHandAfterPlay(playedIndices) {
  const handEl = document.getElementById('player-hand');
  if (!handEl) return;
  const cardEls = Array.from(handEl.children);
  [...playedIndices].filter(i => i >= 0).sort((a, b) => b - a).forEach(idx => {
    if (cardEls[idx]) cardEls[idx].remove();
  });
  Array.from(handEl.children).forEach((el, i) => {
    const c = hands.player[i];
    el.style.zIndex = i + 1;
    el.classList.remove('selected');
    el.onclick = () => toggleSelectCardByCard(c);
  });
  updateHandOverlap();
}

function animateCardMovement(player, indices, cardsToPlay, callback) {
  isProcessing = true;
  lastTurnActivityTimestamp = Date.now();
  soundMgr.playCardPlay();
  const speed = getSpeedMultiplier();
  const targetContainer = document.getElementById('field-container-el');
  const targetRect = targetContainer ? targetContainer.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: 200, width: 80, height: 90 };
  const originRects = [];

  document.querySelectorAll('.card-play-anim').forEach(c => c.remove());

  if (player === 'player') {
    const handEl = document.getElementById('player-hand');
    const els = handEl ? handEl.querySelectorAll('.card') : [];
    if (indices && indices.length > 0) {
      indices.forEach(i => {
        if (els[i]) {
          originRects.push(els[i].getBoundingClientRect());
          els[i].style.visibility = 'hidden';
        }
      });
    }
    if (originRects.length === 0 && handEl) {
      const hRect = handEl.getBoundingClientRect();
      cardsToPlay.forEach((_, i) => originRects.push({ left: hRect.left + 20 + (i * 20), top: hRect.top, width: 44, height: 64 }));
    }
  } else {
    const stack = document.getElementById(`${player}-stack`) || document.getElementById(player);
    const rect = stack ? stack.getBoundingClientRect() : { left: 40, top: 120, width: 40, height: 60 };
    cardsToPlay.forEach((_, i) => originRects.push({ left: rect.left + (i * 8), top: rect.top, width: 36, height: 52 }));
  }

  if (originRects.length === 0) {
    isProcessing = false;
    callback();
    return;
  }

  const clones = cardsToPlay.map((card, idx) => {
    const r = originRects[idx] || originRects[0];
    const clone = createCardElement(card);
    clone.classList.add('card-play-anim');
    clone.style.setProperty('--speed-factor', speed);
    clone.style.left = `${r.left}px`;
    clone.style.top = `${r.top}px`;
    document.body.appendChild(clone);
    return clone;
  });

  GameTimer.set(() => {
    const w = clones[0].offsetWidth || 45;
    const totalW = clones.length * w + (clones.length - 1) * 4;
    const startX = targetRect.left + (targetRect.width - totalW) / 2;
    clones.forEach((clone, i) => {
      clone.style.left = `${startX + i * (w + 4)}px`;
      clone.style.top = `${targetRect.top + targetRect.height / 2 - clone.offsetHeight / 2}px`;
    });
  }, 20);

  let hasEnded = false;
  const finishAnim = () => {
    if (hasEnded) return;
    hasEnded = true;
    clones.forEach(c => c.remove());
    document.querySelectorAll('.card-play-anim').forEach(c => c.remove());
    isProcessing = false;
    callback();
  };

  GameTimer.set(finishAnim, 300 / speed);
}

function showVictoryPopup(player) {
  const def = assignedCharacters[player];
  if (!def) return;

  PLAYERS.forEach(p => {
    const pt = document.getElementById(`${p}-portrait`);
    if (pt) pt.classList.remove('portrait-talk');
    const bubble = document.querySelector(`#${p} .dialogue-bubble`);
    if (bubble) bubble.classList.remove('show');
  });

  const portrait = document.getElementById('victory-portrait');
  const name = document.getElementById('victory-name');
  const popup = document.getElementById('victory-popup');
  if (!portrait || !name || !popup) return;

  GameTimer.set(() => {
    const pSrc = (player === 'player' && typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive)
      ? ScenarioManager.getCurrentAvatar().image
      : (CHAR_IMAGES[def.id] || 'fugo-絵柄/king.png');
    portrait.src = pSrc;
    portrait.onerror = () => { portrait.src = 'king.png'; };
    name.textContent = getPlayerDisplayName(player);
    popup.classList.add('active');

    if (popup.timeoutId) GameTimer.clear(popup.timeoutId);
    popup.timeoutId = GameTimer.set(() => popup.classList.remove('active'), 2600);
  }, 120);
}

function render(isFullRedraw = false) {
  if (isFullRedraw) {
    const handEl = document.getElementById('player-hand');
    if (handEl) {
      handEl.innerHTML = '';
      hands.player.forEach((card, index) => {
        const el = createCardElement(card);
        el.style.zIndex = index + 1;
        el.classList.add('draw-anim');
        if (selectedIndices.includes(index)) el.classList.add('selected');
        el.onclick = () => toggleSelectCardByCard(card);
        handEl.appendChild(el);
      });
    }
  }

  updateHandOverlap();
  ['cpu1', 'cpu2', 'cpu3'].forEach(c => renderCpuStack(c, hands[c].length));

  PLAYERS.forEach(p => {
    const countBadge = document.getElementById(`${p}-card-count`);
    if (countBadge) {
      const count = hands[p] ? hands[p].length : 0;
      countBadge.textContent = `残り ${count}枚`;
      countBadge.classList.toggle('danger-few', count > 0 && count <= 3 && !finishedPlayers.includes(p));
    }

    const passEl = document.getElementById(`${p}-pass`);
    if (passEl) {
      passEl.textContent = playerPassCounts[p];
    }
  });

  const fieldEl = document.getElementById('field-cards');
  const emptyPlaceholder = document.getElementById('field-empty-placeholder');
  const comboBadge = document.getElementById('field-combo-badge');

  if (fieldEl) {
    fieldEl.classList.remove('clear-animation');
    fieldEl.innerHTML = '';
    fieldCards.forEach((c, i) => {
      const cel = createCardElement(c);
      cel.style.zIndex = i + 1;
      fieldEl.appendChild(cel);
    });
  }
  updateFieldOverlap();

  if (emptyPlaceholder) {
    emptyPlaceholder.style.display = (fieldCards.length === 0) ? 'block' : 'none';
  }
  if (comboBadge) {
    if (fieldCards.length > 0) {
      comboBadge.classList.remove('is-hidden');
      let comboName = '単体';
      if (fieldCards.length === 1 && (fieldCards[0].isJoker || normalizeCardRank(fieldCards[0]) === 'JOKER')) comboName = '🃏 ジョーカー単騎';
      else if (fieldCards.length === 2 && fieldCards.every(c => c.isJoker || normalizeCardRank(c) === 'JOKER')) comboName = '🃏🃏 最強ジョーカーペア';
      else if (fieldCards.length === 2) comboName = 'ペア';
      else if (fieldCards.length === 3) comboName = '3カード';
      else if (fieldCards.length === 4) comboName = '革命 (4枚出し)';
      else if (fieldCards.length === 5) comboName = 'ファイブカード (5枚出し革命)';
      else if (fieldCards.length >= 6) comboName = '🤡 シックスカード (6枚出し超革命)';
      comboBadge.textContent = comboName;
    } else {
      comboBadge.classList.add('is-hidden');
    }
  }

  updateControlsOnly();
  updateEvalMeterUI();

  const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');

  PLAYERS.forEach(p => {
    const area = document.getElementById(p === 'player' ? 'player-area' : p);
    const badge = document.getElementById(p === 'player' ? 'player-badge' : `${p}-badge`);
    if (area && badge) {
      if (hasPassedInRound[p]) {
        badge.textContent = 'PASS';
        badge.classList.add('is-pass');
        badge.classList.remove('is-exchange-prompt');
        area.classList.remove('active-turn');
      } else {
        badge.classList.remove('is-pass');
        
        if (p === 'player' && isExchangePhase) {
          badge.textContent = '交換カードを選んで';
          badge.classList.add('is-exchange-prompt');
          area.classList.add('active-turn');
        } else {
          badge.classList.remove('is-exchange-prompt');
          
          let badgeText = 'THINKING';
          if (p === 'player') {
            if (isSpectate) {
              badgeText = 'THINKING';
            } else if (isAutoPlayMode) {
              badgeText = '代行思考中';
            } else {
              badgeText = 'あなたの順番です';
            }
          }
          badge.textContent = badgeText;

          if (!isPreExchangePhase && !isExchangePhase && !isExchangeTransitioning && PLAYERS[currentTurnIndex] === p && !finishedPlayers.includes(p) && !gameEnded) {
            area.classList.add('active-turn');
          } else {
            area.classList.remove('active-turn');
          }
        }
      }
    }

    const rankEl = document.getElementById(`${p}-rank`);
    if (rankEl) {
      let rText = '';
      if (playerStatusMap[p]) {
        rText = playerStatusMap[p];
        if (foulPlayers[p]) rText += ` [${foulPlayers[p]}]`;
      } else if (previousRanks[p]) {
        rText = previousRanks[p];
      }
      rankEl.textContent = rText;
    }
  });
}

function updateControlsOnly() {
  const playBtn = document.getElementById('play-btn');
  const playBtnIcon = document.getElementById('play-btn-icon');
  const playBtnText = document.getElementById('play-btn-text');

  const passBtn = document.getElementById('pass-btn');
  const passBtnIcon = document.getElementById('pass-btn-icon');
  const passBtnText = document.getElementById('pass-btn-text');

  const goExBtn = document.getElementById('go-exchange-btn');
  const exBtn = document.getElementById('exchange-btn');
  const autoBtn = document.getElementById('auto-play-btn');
  const speedControls = document.getElementById('speed-controls');
  const foulAlert = document.getElementById('player-foul-alert');

  const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
  const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');

  if (isScenario) {
    if (autoBtn) autoBtn.classList.add('is-hidden');
    if (speedControls) speedControls.classList.add('is-hidden');
  } else if (isSpectate) {
    if (autoBtn) {
      autoBtn.classList.remove('is-hidden', 'btn-gold-active', 'active');
      if (isSpectatePaused) {
        autoBtn.textContent = '▶ 再開';
        autoBtn.classList.add('btn-paused');
      } else {
        autoBtn.textContent = '⏸ 一時停止';
        autoBtn.classList.remove('btn-paused');
      }
    }
    if (speedControls) speedControls.classList.remove('is-hidden');
  } else {
    if (autoBtn) {
      autoBtn.classList.remove('is-hidden', 'btn-paused');
      autoBtn.textContent = isAutoPlayMode ? '🤖 代行: ON' : '🤖 代行: OFF';
      autoBtn.classList.toggle('btn-gold-active', isAutoPlayMode);
    }
    if (speedControls) speedControls.classList.add('is-hidden');
  }

  if (isPreExchangePhase) {
    if (foulAlert && !foulPlayers.player) foulAlert.classList.add('is-hidden');
    if (playBtn) playBtn.classList.add('is-hidden');
    if (passBtn) passBtn.classList.add('is-hidden');
    if (goExBtn) {
      goExBtn.classList.remove('is-hidden');
      goExBtn.disabled = isAutoPlayMode;
    }
    if (exBtn) exBtn.classList.add('is-hidden');
  } else if (isExchangePhase) {
    if (foulAlert && !foulPlayers.player) foulAlert.classList.add('is-hidden');
    if (playBtn) playBtn.classList.add('is-hidden');
    if (passBtn) passBtn.classList.add('is-hidden');
    if (goExBtn) goExBtn.classList.add('is-hidden');
    if (exBtn) {
      exBtn.classList.remove('is-hidden');
      const isReady = (selectedIndices.length === requiredExchangeCount);
      exBtn.disabled = (!isReady) || isAutoPlayMode;
      exBtn.textContent = isReady ? `交換決定 (${requiredExchangeCount}枚)` : `あと${requiredExchangeCount - selectedIndices.length}枚選択`;
    }
  } else {
    if (playBtn) playBtn.classList.remove('is-hidden');
    if (passBtn) passBtn.classList.remove('is-hidden');
    if (goExBtn) goExBtn.classList.add('is-hidden');
    if (exBtn) exBtn.classList.add('is-hidden');

    const myTurn = (PLAYERS[currentTurnIndex] === 'player') && !isExchangeTransitioning && !finishedPlayers.includes('player') && !gameEnded;
    const isLeadPlay = (fieldCards.length === 0);

    if (!myTurn || isAutoPlayMode) {
      if (foulAlert && !foulPlayers.player) foulAlert.classList.add('is-hidden');

      if (playBtn) {
        playBtn.disabled = true;
        playBtn.className = 'btn btn-play-main is-auto-disabled';
      }
      if (playBtnIcon) playBtnIcon.textContent = isSpectate ? '👀' : (isAutoPlayMode ? '🤖' : '🃏');
      if (playBtnText) playBtnText.textContent = isSpectate ? '観戦中...' : (isAutoPlayMode ? '代行中...' : 'カードを出す');

      if (passBtn) {
        passBtn.disabled = true;
        passBtn.className = 'btn btn-pass-sub';
      }
      if (passBtnIcon) passBtnIcon.textContent = '▶▶';
      if (passBtnText) passBtnText.textContent = 'パス';
    } else {
      const selectedCards = selectedIndices.map(i => hands.player[i]);
      const rev = effectiveReverse();
      const fieldLen = fieldCards.length;
      const selLen = selectedIndices.length;

      // ★ 禁止あがり・残手札詰み状態のリアルタイム検査
      const activeRules = getActiveGameRules(gameRules);
      let isDirectForbiddenFinish = false;
      let isTrapForbidden = false;

      if (activeRules.forbiddenFinish && selLen > 0) {
        if (selLen === hands.player.length) {
          isDirectForbiddenFinish = isForbiddenFinish(selectedCards, rev);
        } else {
          isTrapForbidden = willLeaveOnlyForbiddenCards(selectedCards, hands.player, rev);
        }
      }

      if (foulAlert && !foulPlayers.player) {
        if (GAME_SETTINGS.forbiddenFinishAlert && (isDirectForbiddenFinish || isTrapForbidden)) {
          foulAlert.className = 'player-foul-alert';
          foulAlert.textContent = isDirectForbiddenFinish
            ? '⚠️ この手であがると反則負け！'
            : '⚠️ 残りが禁止カードのみになり詰みます！';
          foulAlert.classList.remove('is-hidden');
        } else {
          foulAlert.classList.add('is-hidden');
        }
      }

      if (selLen === 0) {
        if (playBtn) {
          playBtn.disabled = true;
          playBtn.className = 'btn btn-play-main state-prompt';
        }
        if (playBtnIcon) playBtnIcon.textContent = '👆';
        if (playBtnText) playBtnText.textContent = 'カードを選択';

        if (!isExchangeTransitioning && !isPreExchangePhase && !isExchangePhase) {
          if (fieldLen === 0) {
            setMessage('最初に出すカードを選んでください。');
          } else {
            setMessage('場に出ているカードより強いカードを選んでください。');
          }
        }
      } else if (fieldLen > 1 && selLen < fieldLen) {
        const needed = fieldLen - selLen;
        if (playBtn) {
          playBtn.disabled = true;
          playBtn.className = 'btn btn-play-main state-prompt';
        }
        if (playBtnIcon) playBtnIcon.textContent = '🃏';
        if (playBtnText) playBtnText.textContent = `あと${needed}枚選択`;

        setMessage(`💬 場の枚数（${fieldLen}枚）に合わせて、あと <strong>${needed}枚</strong> 選んでください。`);
      } else if (isValidPlay(selectedCards, fieldCards, rev)) {
        if (playBtn) {
          playBtn.disabled = false;
          playBtn.className = 'btn btn-play-main';
        }
        if (playBtnIcon) playBtnIcon.textContent = '🃏';
        if (playBtnText) playBtnText.textContent = 'カードを出す';
      } else {
        if (playBtn) {
          playBtn.disabled = true;
          playBtn.className = 'btn btn-play-main state-invalid';
        }
        if (playBtnIcon) playBtnIcon.textContent = '⚠️';
        if (playBtnText) playBtnText.textContent = '出せません';

        if (fieldLen === 0 && selLen > 1) {
          setMessage('⚠️ 親番では同じ数字のカード（ペア等）を選択してください。');
        } else if (fieldLen > 0 && selLen !== fieldLen) {
          setMessage(`⚠️ 場の枚数（${fieldLen}枚）に合わせて選択してください。`);
        } else {
          setMessage('⚠️ 場より強いカードを選択してください。');
        }
      }

      if (passBtn) {
        if (isLeadPlay) {
          passBtn.disabled = true;
          passBtn.className = 'btn btn-pass-sub';
          if (passBtnIcon) passBtnIcon.textContent = 'ー';
          if (passBtnText) passBtnText.textContent = 'パス不可';
        } else if (selLen > 0) {
          passBtn.disabled = true;
          passBtn.className = 'btn btn-pass-sub';
          if (passBtnIcon) passBtnIcon.textContent = '⛔';
          if (passBtnText) passBtnText.textContent = '選択中';
        } else {
          passBtn.disabled = false;
          passBtn.className = 'btn btn-pass-sub is-active';
          if (passBtnIcon) passBtnIcon.textContent = '▶▶';
          if (passBtnText) passBtnText.textContent = 'パス';
        }
      }
    }
  }
}

function showCharacterDialogue(player, text) {
  if (!text || player === 'player') return;
  const box = document.getElementById(player);
  if (!box) return;

  const targetAnchor = box.querySelector('.cpu2-layout-plate') || box.querySelector('.player-layout-plate') || box.querySelector('.char-row') || box;
  const portrait = document.getElementById(`${player}-portrait`);
  if (!portrait) return;

  let bubble = box.querySelector('.dialogue-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'dialogue-bubble';
    targetAnchor.appendChild(bubble);
  }

  if (bubble.timeoutId) GameTimer.clear(bubble.timeoutId);
  if (portrait.timeoutId) GameTimer.clear(portrait.timeoutId);

  bubble.textContent = `「${text}」`;
  bubble.classList.add('show');
  portrait.classList.add('portrait-talk');

  box.classList.add('is-speaking-parent');

  const dur = Math.min(3200, Math.max(1800, text.length * 150));
  const cleanup = () => {
    bubble.classList.remove('show');
    portrait.classList.remove('portrait-talk');
    box.classList.remove('is-speaking-parent');
  };

  bubble.timeoutId = GameTimer.set(cleanup, dur);
  portrait.timeoutId = bubble.timeoutId;
}

function checkAndTriggerDialogue(player, eventType, extraCards = []) {
  if (player === 'player') return;
  const def = assignedCharacters[player];
  if (!def) return;

  if (cpuCooldowns[player] > 0 && ['NORMAL', 'MULTI', 'STRONG', 'PASS'].includes(eventType)) {
    cpuCooldowns[player]--;
    return;
  }

  const rates = {
    NORMAL: 0.25, MULTI: 0.35, STRONG: 0.45, PASS: 0.35,
    EIGHT_CUT: 0.90, ELEVEN_BACK: 0.90, REVOLUTION: 1.0,
    ENEMY_FEW: 0.70, MY_FEW: 0.80, WIN: 1.0, LOSE: 1.0,
    GAME_START: 1.0, EXCHANGE: 1.0, NEXT_GAME: 1.0
  };

  const enemyLens = PLAYERS.filter(p => p !== player && !finishedPlayers.includes(p)).map(p => (hands[p] ? hands[p].length : 0));
  const minEnemy = enemyLens.length > 0 ? Math.min(...enemyLens) : 99;

  let cat = eventType;
  if (eventType === 'PLAY_CARD') {
    if (hands[player].length <= 2) cat = 'MY_FEW';
    else if (minEnemy <= 2) cat = 'ENEMY_FEW';
    else if (extraCards.some(c => {
      const r = normalizeCardRank(c);
      return r === '2' || r === 'A';
    })) cat = 'STRONG';
    else if (extraCards.length >= 2) cat = 'MULTI';
    else cat = 'NORMAL';
  }

  if (RandomManager.random() <= (rates[cat] || 0.3)) {
    const list = CHARACTER_DIALOGUES[def.id]?.[cat] || CHARACTER_DIALOGUES[def.id]?.NORMAL;
    if (list && list.length > 0) {
      const text = list[Math.floor(RandomManager.random() * list.length)];
      showCharacterDialogue(player, text);
      cpuCooldowns[player] = 2;
    }
  }
}

function renderRankCountBadges(df, f, h, dh) {
  const badge = (cls, count, title) => {
    const countText = (count === 0) ? '' : count;
    const emptyCls = (count === 0) ? ' rcb-empty' : '';
    return `<span class="rank-count-badge ${cls}${emptyCls}" title="${title}">${countText}</span>`;
  };
  return `
    ${badge('rcb-df', df, '大富豪')}
    ${badge('rcb-f', f, '富豪')}
    ${badge('rcb-h', h, '貧民')}
    ${badge('rcb-dh', dh, '大貧民')}
  `;
}

function getPlayerDisplayName(player, withIcon = false) {
  if (player === 'player') {
    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isAutoActive = (typeof isAutoPlayMode !== 'undefined' && isAutoPlayMode && !isSpectate);
    const hasUsedAuto = (typeof hasPlayerUsedAutoInMatch !== 'undefined' && hasPlayerUsedAutoInMatch && !isSpectate);
    const isUsingAuto = (isAutoActive || hasUsedAuto);

    if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) {
      const a = ScenarioManager.getCurrentAvatar();
      const short = a ? (a.shortName || a.name.split(' ')[0]) : '自分';
      if (isUsingAuto) {
        return withIcon ? `👤 ${short} [🤖代行]` : `${short} [🤖代行]`;
      }
      return withIcon ? `👤 ${short}（あなた）` : `${short}（あなた）`;
    }

    const def = assignedCharacters.player;
    const pName = def ? (def.name || '自分') : '自分';

    if (isSpectate) {
      const icon = def ? (def.icon || '👤') : '👤';
      return withIcon ? `${icon} ${pName}` : pName;
    }

    if (isUsingAuto) {
      return withIcon ? `👤 ${pName} [🤖代行]` : `${pName} [🤖代行]`;
    }

    return withIcon ? `👤 ${pName}（あなた）` : `${pName}（あなた）`;
  }
  const char = assignedCharacters[player];
  if (!char) return player;
  return withIcon ? `${char.icon} ${char.name}` : char.name;
}

function setMessage(msg) {
  const el = document.getElementById('message-text');
  if (!el) return;
  el.innerHTML = msg;
}

function updateStatusUI() {
  const revEl = document.getElementById('revolution-status');
  const ebEl = document.getElementById('eleven-back-status');
  const normEl = document.getElementById('normal-status');
  const guideEl = document.getElementById('field-strength-guide');
  const labelEl = document.getElementById('field-strength-label');
  const orderEl = document.getElementById('field-strength-order');
  const exRuleEl = document.getElementById('rule-list-exchange');

  if (revEl) revEl.classList.toggle('active', !!isRevolution);
  if (ebEl) ebEl.classList.toggle('active', !!isElevenBack);
  if (normEl) normEl.style.display = (!isRevolution && !isElevenBack) ? 'inline-block' : 'none';

  if (exRuleEl) {
    exRuleEl.textContent = enableCardExchange ? 'カード交換: あり (座席継続)' : 'カード交換: なし (毎回席替え)';
  }

  if (guideEl && labelEl && orderEl) {
    guideEl.classList.remove('guide-revolution', 'guide-eleven-back');

    const isEffectiveRev = effectiveReverse();

    if (isEffectiveRev) {
      if (isRevolution && !isElevenBack) {
        guideEl.classList.add('guide-revolution');
        labelEl.textContent = '🔥 革命中';
      } else {
        guideEl.classList.add('guide-eleven-back');
        labelEl.textContent = '⚡ 11バック';
      }
      orderEl.textContent = '2 < A < K ... < 4 < 3 < 🃏';
    } else {
      if (isRevolution && isElevenBack) {
        labelEl.textContent = '🌀 革命+11バック(相殺)';
        orderEl.textContent = '3 < 4 < 5 ... < 2 < 🃏';
      } else {
        labelEl.textContent = 'カードの強さ';
        orderEl.textContent = '3 < 4 < 5 ... < 2 < 🃏';
      }
    }
  }

  updateEvalMeterUI();
}

function updateEvalMeterUI() {
  const { rates, topPlayer, diffFromSecond, isFinished } = calculateRealtimeWinRates();
  const gridEl = document.getElementById('eval-rates-grid');
  if (!gridEl) return;

  let gridHtml = '';
  PLAYERS.forEach(p => {
    const name = getPlayerDisplayName(p);
    const color = CONFIG.COLORS[p] || '#d4af37';
    const pct = rates[p] !== undefined ? rates[p] : 25;

    const isTop = (p === topPlayer) && (diffFromSecond >= 3 || isFinished);
    const topClass = isTop ? ' is-top-rank' : '';
    const crownPrefix = isTop ? '👑 ' : '';

    gridHtml += `
      <div class="eval-rate-item${topClass}">
        <span class="eval-name" title="${name}">${crownPrefix}${name}</span>
        <div class="eval-mini-track">
          <div class="eval-mini-fill" style="width:${pct}%; background:${color};"></div>
        </div>
        <span class="eval-pct">${pct}%</span>
      </div>
    `;
  });
  gridEl.innerHTML = gridHtml;
}

function pickRandomCPUCharacters() {
  const unlocked = GameStorage.loadUnlockedChars();
  const keys = unlocked.filter(k => (!assignedCharacters.player || k !== assignedCharacters.player.id));
  const shuffled = shuffle(keys);
  assignedCharacters.cpu1 = CHARACTER_DEFS[shuffled[0]];
  assignedCharacters.cpu2 = CHARACTER_DEFS[shuffled[1]];
  assignedCharacters.cpu3 = CHARACTER_DEFS[shuffled[2]];
  updateCharacterUI();
}

function updateCharacterUI() {
  PLAYERS.forEach(p => {
    const def = assignedCharacters[p];
    if (!def) return;
    const title = document.getElementById(`${p}-char-title`);
    const img = document.getElementById(`${p}-portrait`);
    if (title) {
      const displayName = getPlayerDisplayName(p, true);
      title.textContent = displayName;
    }
    if (img) {
      if (p === 'player' && typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) {
        img.src = ScenarioManager.getCurrentAvatar().image;
      } else {
        img.src = CHAR_IMAGES[def.id] || 'fugo-絵柄/king.png';
      }
      img.onerror = () => { img.src = 'king.png'; };
    }
  });
}

function renderFinalRanking() {
  const container = document.getElementById('final-ranking-list');
  const winnerImg = document.getElementById('modal-winner-portrait');
  const winnerName = document.getElementById('modal-winner-name');

  const daifugoPlayer = PLAYERS.find(pl => playerStatusMap[pl] === '大富豪') || finishedPlayers[0];
  if (daifugoPlayer && assignedCharacters[daifugoPlayer]) {
    const wDef = assignedCharacters[daifugoPlayer];
    if (winnerImg) {
      winnerImg.src = (daifugoPlayer === 'player' && typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive)
        ? ScenarioManager.getCurrentAvatar().image
        : (CHAR_IMAGES[wDef.id] || 'fugo-絵柄/king.png');
      winnerImg.onerror = () => { winnerImg.src = 'king.png'; };
    }
    if (winnerName) winnerName.textContent = getPlayerDisplayName(daifugoPlayer, true);
  }

  if (!container) return;
  const order = ['大富豪', '富豪', '貧民', '大貧民'];
  container.innerHTML = order.map((rankName, idx) => {
    const p = PLAYERS.find(pl => playerStatusMap[pl] === rankName);
    if (!p) return '';
    const def = assignedCharacters[p];
    const imgSrc = (p === 'player' && typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive)
      ? ScenarioManager.getCurrentAvatar().image
      : (CHAR_IMAGES[def.id] || 'fugo-絵柄/king.png');
    const foulNote = foulPlayers[p] ? ` <span class="foul-badge">(${foulPlayers[p]})</span>` : '';

    // ★通算スコアの統合表示（誰が何勝して平均何位か）
    let cumScoreHtml = '';
    if (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive) {
      const cid = (p === 'player' && MatchSeriesManager.mode === 'practice') ? MatchSeriesManager.playerCharId : def.id;
      const s = MatchSeriesManager.historyStats[cid];
      if (s && s.games > 0) {
        cumScoreHtml = `<span class="final-rank-cum-score">通算: <strong>${s.df}勝</strong> (平均${(s.rankSum / s.games).toFixed(1)}位)</span>`;
      }
    } else if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) {
      const isMe = (p === 'player');
      const cid = isMe ? 'player' : def.id;
      const st = ScenarioManager.data.stageMatchStats[cid];
      if (st && st.games > 0) {
        cumScoreHtml = `<span class="final-rank-cum-score">通算: <strong>${st.df}勝</strong> (平均${(st.rankSum / st.games).toFixed(1)}位)</span>`;
      }
    }

    return `
      <div class="final-rank-row${idx === 0 ? ' rank-1' : ''}">
        <div class="final-rank-position">${rankName}</div>
        <img src="${imgSrc}" onerror="this.onerror=null; this.src='king.png';" alt="">
        <div class="final-rank-name">${getPlayerDisplayName(p, true)}${foulNote}</div>
        ${cumScoreHtml}
      </div>
    `;
  }).join('');
}

function updateCharIntroVisibility() {
  const sData = (typeof ScenarioManager !== 'undefined') ? ScenarioManager.data : null;
  const p = sData ? sData.currentPhase : 'STAGE_1_A';
  const unlocked = sData ? sData.unlockedSecrets : { YOUNG_KING: false, QUEEN: false, AWAKENED_KING: false };
  const permUnlocked = GameStorage.loadUnlockedChars();

  const isYoungKingUnlocked = permUnlocked.includes('BEGINNER_AI') || !!unlocked.YOUNG_KING;
  const isQueenUnlocked = permUnlocked.includes('SUPER_AI') || !!unlocked.QUEEN;
  const isAwakenedKingUnlocked = permUnlocked.includes('AWAKENED_KING') || !!unlocked.AWAKENED_KING;

  const heroPhaseOrder = ['STAGE_3_NOBUNAGA', 'STAGE_3_SHOTOKU', 'STAGE_3_SHI_HUANGDI', 'STAGE_3_ALEXANDER', 'STAGE_3_GILGAMESH', 'COMPLETED'];
  const curHeroIdx = heroPhaseOrder.indexOf(p);

  const isNobunagaUnlocked = permUnlocked.includes('NOBUNAGA') || curHeroIdx >= 0;
  const isShotokuUnlocked = permUnlocked.includes('SHOTOKU') || curHeroIdx >= 1;
  const isShiHuangdiUnlocked = permUnlocked.includes('SHI_HUANGDI') || curHeroIdx >= 2;
  const isAlexanderUnlocked = permUnlocked.includes('ALEXANDER') || curHeroIdx >= 3;
  const isGilgameshUnlocked = permUnlocked.includes('GILGAMESH') || curHeroIdx >= 4;

  const unlockMap = {
    BEGINNER_AI: isYoungKingUnlocked,
    SUPER_AI: isQueenUnlocked,
    AWAKENED_KING: isAwakenedKingUnlocked,
    NOBUNAGA: isNobunagaUnlocked,
    SHOTOKU: isShotokuUnlocked,
    SHI_HUANGDI: isShiHuangdiUnlocked,
    ALEXANDER: isAlexanderUnlocked,
    GILGAMESH: isGilgameshUnlocked
  };

  const activeBattlingIds = PLAYERS.map(cpu => assignedCharacters[cpu]?.id).filter(Boolean);

  document.querySelectorAll('#char-modal .char-intro-item').forEach(item => {
    const cId = item.getAttribute('data-char-id');

    if (unlockMap[cId] !== undefined) {
      item.classList.toggle('is-locked-char', !unlockMap[cId]);
    } else {
      item.classList.remove('is-locked-char');
    }

    const isBattling = activeBattlingIds.includes(cId);
    item.classList.toggle('is-currently-battling', isBattling);
  });
}

/* ====================================================================
 * 【main.js 前半（安全完全版） 終了地点】
 * 次の結合先：「8. 各種モーダルUI・ビューア（新設ReplayManager含む）」
 * ==================================================================== */
/* ====================================================================
 * ROYAL DAIFUGO - main.js 【後半（完全修復版・パート1）】
 * [Version: v4.0.0 - 統合オープニング完全制御＆BGM調和・リプレイ客観表示版]
 * ※「8. 各種モーダルUI・ビューア（新設ReplayManager含む）」の開始から
 *   OpeningManager の定義終了までを出力します。
 * ==================================================================== */

/* ============================================================
 * 8. 各種モーダルUI・ビューア（新設ReplayManager含む）
 * ============================================================ */
function showEvalModal() {
  const { rates, topPlayer, topPct, diffFromSecond, isFinished } = calculateRealtimeWinRates();
  const body = document.getElementById('eval-modal-body');
  if (!body) return;

  const rev = effectiveReverse();

  let balanceSegsHtml = '';
  PLAYERS.forEach(p => {
    const rate = rates[p] || 0;
    if (rate > 0) {
      const color = CONFIG.COLORS[p] || '#d4af37';
      const name = getPlayerDisplayName(p);
      balanceSegsHtml += `
        <div class="eval-balance-seg" style="width: ${rate}%; background: ${color};" title="${name}: ${rate}%">
          ${rate >= 14 ? `${rate}%` : ''}
        </div>
      `;
    }
  });

  let cardsHtml = '';
  PLAYERS.forEach(p => {
    const h = hands[p] || [];
    const len = h.length;
    const turns = isFinished ? (finishedPlayers.includes(p) ? (finishedPlayers.indexOf(p) === 0 ? 0 : 99) : 99) : estimateTurnsToWin(h, rev);
    const rate = rates[p] || 0;
    const color = CONFIG.COLORS[p] || '#d4af37';
    const def = assignedCharacters[p] || { id: 'KING', name: p, icon: '👤' };
    const portraitSrc = (p === 'player' && typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive)
      ? ScenarioManager.getCurrentAvatar().image
      : (CHAR_IMAGES[def.id] || 'fugo-絵柄/king.png');
    const isLeader = (p === topPlayer && !isFinished) || (finishedPlayers[0] === p);

    let jCount = 0, twoCount = 0, eightCount = 0, aceCount = 0;
    h.forEach(c => {
      const disp = normalizeCardRank(c);
      if (c.isJoker || disp === 'JOKER') jCount++;
      else if (disp === '2') twoCount++;
      else if (disp === '8') eightCount++;
      else if (disp === 'A') aceCount++;
    });

    const strongTokens = [];
    if (jCount > 0) strongTokens.push(`🃏×${jCount}`);
    if (twoCount > 0) strongTokens.push(`2×${twoCount}`);
    if (eightCount > 0) strongTokens.push(`8×${eightCount}`);
    if (aceCount > 0) strongTokens.push(`A×${aceCount}`);
    const strongDisplay = strongTokens.length > 0 ? strongTokens.join(' ') : 'なし';

    let badgeClass = 'eval-status-even';
    let badgeText = '⚖️ 拮抗';
    if (finishedPlayers.includes(p)) {
      const finishRank = finishedPlayers.indexOf(p) + 1;
      badgeClass = finishRank === 1 ? 'eval-status-leader' : 'eval-status-danger';
      badgeText = finishRank === 1 ? '👑 1位ゴール' : `${finishRank}位確定`;
    } else if (isLeader && topPct >= 50) {
      badgeClass = 'eval-status-leader';
      badgeText = '👑 独走態勢';
    } else if (isLeader) {
      badgeClass = 'eval-status-leader';
      badgeText = '⚔️ 首位リード';
    } else if (rate >= 25) {
      badgeClass = 'eval-status-chase';
      badgeText = '🔥 追撃態勢';
    } else if (len <= 2) {
      badgeClass = 'eval-status-chase';
      badgeText = '🎯 リーチ';
    } else if (rate <= 12) {
      badgeClass = 'eval-status-danger';
      badgeText = '🛡️ 耐え忍び';
    }

    cardsHtml += `
      <div class="eval-seat-card${isLeader ? ' is-leader' : ''}">
        <img class="eval-seat-portrait" src="${portraitSrc}" onerror="this.onerror=null; this.src='king.png';" alt="">
        <div class="eval-seat-info">
          <div class="eval-seat-name-row">
            <span class="eval-seat-name">${getPlayerDisplayName(p, true)}</span>
            <span class="eval-seat-status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="eval-seat-stats-line">
            <span>手札: <strong style="color:#fff">${len}</strong>枚</span>
            <span>あがり予測: <strong style="color:#ffd700">🎯 最短${turns === 0 ? '-' : turns}手</strong></span>
          </div>
          <div class="eval-seat-strong-cards">
            <span>支配札:</span>
            <span>${strongDisplay}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
            <span style="font-size:9.5px; color:#94a3b8;">勝率期待値</span>
            <span style="font-size:11px; font-weight:800; color:#ffd700;">${rate}%</span>
          </div>
          <div class="eval-seat-rate-bar-track">
            <div class="eval-seat-rate-bar-fill" style="width:${rate}%; background:${color};"></div>
          </div>
        </div>
      </div>
    `;
  });

  const unrevealed = getUnrevealedCards(hands.player || [], playedCardsHistory, fieldCards);
  const remJokers = unrevealed.filter(c => c.isJoker || normalizeCardRank(c) === 'JOKER').length + (hands.player ? hands.player.filter(c => c.isJoker || normalizeCardRank(c) === 'JOKER').length : 0);
  const remEights = unrevealed.filter(c => normalizeCardRank(c) === '8').length + (hands.player ? hands.player.filter(c => normalizeCardRank(c) === '8').length : 0);
  const remTwos = unrevealed.filter(c => normalizeCardRank(c) === '2').length + (hands.player ? hands.player.filter(c => normalizeCardRank(c) === '2').length : 0);

  const topName = getPlayerDisplayName(topPlayer);
  let advisorText = '';

  if (finishedPlayers.length > 0) {
    advisorText = `既に ${getPlayerDisplayName(finishedPlayers[0])} が大富豪ゴールを決めています。後続の2位・3位争いに集中し、大貧民への転落を確実に阻止してください。`;
  } else if (topPlayer === 'player' && topPct >= 60) {
    advisorText = `【${getPlayerDisplayName('player')}が圧倒的有利】あがりまで最短ルートを捉えています。相手の「8切り」によるターン中断だけを警戒し、支配札で確実に場を制圧して勝ち切ってください。`;
  } else if (topPlayer === 'player') {
    advisorText = `【${getPlayerDisplayName('player')}が首位リード】現在の手札構造は非常に優勢です。ペアや単騎の切り替えタイミングを見極め、親番を奪われないよう主導権を握り続けましょう。`;
  } else if (topPct >= 60) {
    advisorText = `【警戒警報】${topName}が独走状態に入っています。放置するとそのままゴールされるため、全員で「8切り」や強力カードを惜しみなく投入して親権を阻止すべき局面です。`;
  } else if (diffFromSecond <= 10) {
    advisorText = `【白熱の拮抗戦】上位陣の手札期待値が僅差で並んでいます。不要な端札を先に処理し、後半のセット勝負に備えてリソースを整えてください。`;
  } else {
    advisorText = `【中盤・探り合い】互いに強力なカードを温存し合っています。革命や11バックの奇襲に備えつつ、相手の残り枚数を常に意識した立ち回りを推奨します。`;
  }

  const fullHtml = `
    <div class="eval-balance-card">
      <div class="eval-balance-title-row">
        <span style="font-family:'Cinzel',serif; font-size:11.5px; font-weight:800; color:#ffd700;">👑 宮廷勢力バランスメーター (勝率分布)</span>
        <span style="font-size:10px; color:#94a3b8;">合計 100%</span>
      </div>
      <div class="eval-balance-bar">
        ${balanceSegsHtml}
      </div>
    </div>

    <div class="eval-players-card-grid">
      ${cardsHtml}
    </div>

    <div class="eval-keycards-box">
      <div class="eval-keycard-badge">
        <span>🃏 ジョーカー残存:</span>
        <strong>${remJokers} / 2枚</strong>
      </div>
      <div class="eval-keycard-badge">
        <span>⚔️ 8切り残存:</span>
        <strong>${remEights} / 4枚</strong>
      </div>
      <div class="eval-keycard-badge">
        <span>👑 最強「2」残存:</span>
        <strong>${remTwos} / 4枚</strong>
      </div>
    </div>

    <div class="eval-advisor-box">
      <div class="eval-advisor-header">
        <span>🏛️ 宮廷大占勝師の戦況レポート ＆ 天意の託宣</span>
      </div>
      <div class="eval-advisor-text">${advisorText}</div>
    </div>
  `;

  body.innerHTML = fullHtml;
  document.getElementById('eval-modal').classList.add('active');
}

/* ============================================================
 * 8.1 途中決着画面・折れ線グラフ ＆ 本格集計表 直接描画エンジン
 * ============================================================ */
function renderNextGameInterimDashboard() {
  const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
  const isMatchSeries = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive);

  const bannerEl = document.getElementById('next-game-match-banner');
  const tableWrap = document.getElementById('next-game-ranking-wrap');
  const chartCanvas = document.getElementById('next-game-chart');
  const chartLegend = document.getElementById('next-game-chart-legend');

  if (!tableWrap) return;

  let curGame = 1;
  let totGames = 1;
  let resultsList = [];
  let rankHistoryData = [];
  let playerCharKey = 'player';
  let opponentCharKeys = [];

  if (isScenario) {
    curGame = ScenarioManager.data.currentMatchIndex || 1;
    totGames = ScenarioManager.data.matchesPerStage || 1;
    const statsList = Object.values(ScenarioManager.data.stageMatchStats || {});
    resultsList = statsList.map(st => {
      const g = Math.max(1, st.games);
      return {
        id: st.charId,
        name: st.name,
        icon: st.icon || '👤',
        isPlayer: st.isPlayer,
        avg: (st.rankSum / g).toFixed(2),
        winRate: ((st.df / g) * 100).toFixed(1),
        df: st.df, f: st.f, h: st.h, dh: st.dh,
        rankSum: st.rankSum,
        games: st.games
      };
    }).sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg));

    rankHistoryData = ScenarioManager.data.stageRankHistory || [];
    playerCharKey = 'player';
    opponentCharKeys = ['cpu1', 'cpu2', 'cpu3'].map(c => assignedCharacters[c]?.id).filter(Boolean);

    if (bannerEl) bannerEl.textContent = `📜 シナリオ関門：第 ${curGame} / ${totGames} 試合 終了 (突破条件: 最低1勝 ＋ 首位)`;
  } else if (isMatchSeries) {
    curGame = MatchSeriesManager.currentGame || 1;
    totGames = MatchSeriesManager.totalGames || 10;
    resultsList = MatchSeriesManager.getSortedResults();
    rankHistoryData = MatchSeriesManager.rankHistory || [];
    playerCharKey = MatchSeriesManager.playerCharId;
    opponentCharKeys = [...MatchSeriesManager.selectedOpponentIds];

    const modeStr = (MatchSeriesManager.mode === 'auto') ? '観戦モード' : '練習モード';
    if (bannerEl) bannerEl.textContent = `⚔️ ${modeStr}：第 ${curGame} / ${totGames} 試合 終了 (全 ${totGames} 戦の激闘)`;
  }

  // ① 👑 本格総合成績テーブル描画
  let html = `
    <table class="ranking-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">総合</th>
          <th>参加者</th>
          <th style="text-align: right;">平均順位</th>
          <th style="text-align: right;">大富豪率</th>
          <th style="text-align: center; white-space: nowrap !important; min-width: 102px;">大 / 富 / 貧 / 大貧</th>
        </tr>
      </thead>
      <tbody>
  `;

  resultsList.forEach((item, idx) => {
    const rankBadge = `<span class="rank-num-badge rank-num-${idx + 1}">${idx + 1}</span>`;
    const isMe = item.isPlayer;
    const rowStyle = isMe ? ' style="background: rgba(212,175,55,0.18); font-weight: bold;"' : '';
    const avatarSrc = (isMe && isScenario)
      ? ScenarioManager.getCurrentAvatar().image
      : (CHAR_IMAGES[item.id] || 'fugo-絵柄/king.png');
    const displayName = isMe ? getPlayerDisplayName('player', true) : `${item.icon} ${item.name}`;
    const foulSuffix = (typeof foulPlayers !== 'undefined' && foulPlayers[isMe ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)])
      ? ` <span class="foul-badge">(${foulPlayers[isMe ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)]})</span>`
      : '';

    html += `
      <tr${rowStyle}>
        <td style="text-align: center;">${rankBadge}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <img src="${avatarSrc}" onerror="this.onerror=null; this.src='boy.png';" style="width: 20px; aspect-ratio: 2/3; border-radius: 3px; border: 1px solid rgba(212,175,55,0.4);" alt="">
            <span style="color: ${isMe ? '#fff3a8' : '#e0e6ed'}; font-size: 11.5px;">${displayName}</span>
          </div>
        </td>
        <td style="text-align: right; color: #ffd700; font-weight: 800;">${item.avg}位</td>
        <td style="text-align: right; color: #fff3a8;">${item.winRate}%</td>
        <td style="text-align: center; white-space: nowrap !important;">
          ${renderRankCountBadges(item.df, item.f, item.h, item.dh)}${foulSuffix}
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  tableWrap.innerHTML = html;

  // ② 📈 順位推移折れ線グラフ（Canvasチャート）描画
  if (chartCanvas) {
    setTimeout(() => {
      renderSharedRankChart(chartCanvas, chartLegend, rankHistoryData, totGames, playerCharKey, opponentCharKeys, isScenario);
    }, 60);
  }
}

function renderSharedRankChart(canvas, legendEl, rankHistory, totalGames, playerCharId, opponentIds, isScenario = false) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || 600;
  const h = rect.height || 145;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const padLeft = 44;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 22;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const rankY = {
    1: padTop,
    2: padTop + chartH * (1 / 3),
    3: padTop + chartH * (2 / 3),
    4: padTop + chartH
  };

  const rankLabels = { 1: '1位', 2: '2位', 3: '3位', 4: '4位' };

  [1, 2, 3, 4].forEach(r => {
    const y = rankY[r];
    ctx.beginPath();
    ctx.setLineDash(r === 1 ? [] : [3, 3]);
    ctx.strokeStyle = r === 1 ? 'rgba(255, 215, 0, 0.45)' : 'rgba(212, 175, 55, 0.18)';
    ctx.lineWidth = 1;
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = r === 1 ? '#ffd700' : '#8c9ba5';
    ctx.font = r === 1 ? 'bold 9px "Cinzel", "Noto Serif JP", serif' : '8.5px "Cinzel", "Noto Serif JP", serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(rankLabels[r], padLeft - 6, y);
  });

  const gamesCount = Math.max(1, rankHistory.length);
  const maxAxisGames = Math.max(gamesCount, Math.min(totalGames, 20));

  const getX = (gIdx) => {
    if (maxAxisGames <= 1) return padLeft + chartW / 2;
    return padLeft + ((gIdx - 1) / (maxAxisGames - 1)) * chartW;
  };

  const stepGame = maxAxisGames <= 10 ? 1 : 5;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748b';
  ctx.font = '8.5px "JetBrains Mono", monospace';

  for (let g = 1; g <= maxAxisGames; g++) {
    if (g === 1 || g === maxAxisGames || g % stepGame === 0) {
      const x = getX(g);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.setLineDash([2, 4]);
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(`${g}戦`, x, padTop + chartH + 5);
    }
  }

  if (rankHistory.length === 0) return;

  const rosterKeys = [playerCharId, ...opponentIds];
  const colorPalette = ['#4caf50', '#00e5ff', '#ff4081', '#f59e0b'];
  const rosterColorMap = {};
  rosterColorMap[playerCharId] = '#ffd700';
  opponentIds.forEach((id, idx) => {
    rosterColorMap[id] = colorPalette[idx % colorPalette.length];
  });

  if (legendEl) {
    let lhtml = '';
    rosterKeys.forEach(cid => {
      const isPlayer = (cid === playerCharId);
      const def = isPlayer
        ? (isScenario ? ScenarioManager.getCurrentAvatar() : CHARACTER_DEFS[cid])
        : CHARACTER_DEFS[cid];
      const name = isPlayer ? getPlayerDisplayName('player') : (def?.name || cid);
      const icon = isPlayer ? '👤' : (def?.icon || '⚔️');
      const color = rosterColorMap[cid] || '#d4af37';
      lhtml += `
        <div class="practice-chart-legend-item">
          <span class="practice-chart-legend-dot" style="background: ${color}; color: ${color};"></span>
          <span>${icon} ${name}</span>
        </div>
      `;
    });
    legendEl.innerHTML = lhtml;
  }

  rosterKeys.forEach(cid => {
    const isPlayer = (cid === playerCharId);
    const color = rosterColorMap[cid] || '#d4af37';
    const points = [];

    rankHistory.forEach(h => {
      const r = h.ranks[cid] || 4;
      points.push({ x: getX(h.gameIndex), y: rankY[r] });
    });

    if (points.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = isPlayer ? 2.8 : 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (isPlayer) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
      ctx.shadowBlur = 6;
    } else {
      ctx.shadowBlur = 0;
    }

    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    points.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isPlayer ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isPlayer ? '#ffffff' : color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isPlayer ? '#ffd700' : '#0a101a';
      ctx.stroke();
    });
  });
}

/* ============================================================
 * 8.2 対局リプレイ ＆ 勝敗因分析マネージャー (ReplayManager)
 * ============================================================ */
const ReplayManager = {
  currentEpisodes: [],
  selectedEpisodeIndex: 0,
  currentSteps: [],
  currentIndex: 0,
  branchIndices: [],
  playerFinalRank: 4,
  handPotential: 'EVEN',
  handPotentialDesc: '',
  matchDiagnosis: null,
  macroWarChronicle: null,
  seriesMacroSummary: '',
  fullHandsSnapshot: [],
  allowSeriesOverview: false,
  autoPlayTimer: null,
  isPlaying: false,
  previousModalId: null,

  openReplayModal() {
    try {
      soundMgr.playSelect();

      this.previousModalId = null;
      ['practice-finish-modal', 'modal-stage-clear', 'next-game-modal', 'practice-interim-modal', 'modal-scenario-next-match'].forEach(id => {
        const m = document.getElementById(id);
        if (m && m.classList.contains('active')) {
          this.previousModalId = id;
          m.classList.remove('active');
        }
      });

      const allEpisodes = AIDataLogger.episodeLogs || [];
      if (allEpisodes.length === 0) {
        alert('対戦データがまだありません。対局終了後にご利用いただけます。');
        this.restorePreviousModal();
        return;
      }

      this.setupAvailableEpisodes();

      if (this.currentEpisodes.length === 0) {
        alert('手番ステップの記録がありません。');
        this.restorePreviousModal();
        return;
      }

      const isFinishTrigger = (this.previousModalId === 'practice-finish-modal' || this.previousModalId === 'modal-stage-clear');
      this.allowSeriesOverview = (isFinishTrigger && this.currentEpisodes.length >= 2);

      if (this.allowSeriesOverview) {
        this.generateSeriesMacroWarChronicle();
        this.selectedEpisodeIndex = -1;
      } else {
        this.selectedEpisodeIndex = this.currentEpisodes.length - 1;
      }

      const titleEl = document.getElementById('replay-modal-title');
      if (titleEl) {
        titleEl.textContent = '📜 対局リプレイ ＆ 勝敗因分析（振り返り）';
      }

      this.renderGameSelectorUI();
      this.loadSelectedEpisode();

      const replayModal = document.getElementById('replay-modal');
      if (replayModal) {
        replayModal.classList.add('active');
      }
      updateFullscreenButtonsUI();
    } catch (err) {
      console.error('[Replay Error]', err);
      alert('対戦データの展開中にエラーが発生しました: ' + err.message);
      this.restorePreviousModal();
    }
  },

  setupAvailableEpisodes() {
    const all = AIDataLogger.episodeLogs || [];
    const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
    const isMatchSeries = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive);

    if (isScenario) {
      const matchCount = ScenarioManager.data.matchesPerStage || ScenarioManager.data.currentMatchIndex || 1;
      const targetCount = Math.min(all.length, matchCount);
      this.currentEpisodes = all.slice(all.length - targetCount);
    } else if (isMatchSeries) {
      const currentMatch = MatchSeriesManager.currentGame || 1;
      const targetCount = Math.min(all.length, currentMatch);
      this.currentEpisodes = all.slice(all.length - targetCount);
    } else {
      this.currentEpisodes = [...all];
    }
  },

  renderGameSelectorUI() {
    const container = document.querySelector('.replay-game-nav-col');
    const prevBtn = document.getElementById('btn-replay-prev-game');
    const nextBtn = document.getElementById('btn-replay-next-game');
    if (!container) return;

    const nativeSelect = document.getElementById('replay-game-select');
    if (nativeSelect) nativeSelect.classList.add('is-hidden-native');

    let customWrap = container.querySelector('.custom-replay-dropdown');
    if (!customWrap) {
      customWrap = document.createElement('div');
      customWrap.className = 'custom-replay-dropdown';
      if (nativeSelect && nativeSelect.nextSibling) {
        container.insertBefore(customWrap, nativeSelect.nextSibling);
      } else {
        container.appendChild(customWrap);
      }
    }

    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
    const pAvatar = isScenario ? ScenarioManager.getCurrentAvatar() : null;
    const actorPrefix = isSpectate ? '席1' : (pAvatar ? pAvatar.shortName : 'あなた');

    const optionsData = [];

    if (this.allowSeriesOverview) {
      optionsData.push({
        val: -1,
        label: `👑【全 ${this.currentEpisodes.length} 試合の通算総括戦記（シリーズ総決算）】`
      });
    }

    this.currentEpisodes.forEach((ep, idx) => {
      const winnerSeat = ep.seats ? ep.seats.find(s => s.finalRank === 1) : null;
      const winnerName = winnerSeat ? winnerSeat.charName : '未確定';
      const seat1 = ep.seats ? ep.seats.find(s => s.seat === 1) : null;
      const seat1Title = seat1 ? seat1.rankTitle : '';
      const label = `第 ${idx + 1} 試合 / 全${this.currentEpisodes.length}試合 (${winnerName}大富豪 / ${actorPrefix}:${seat1Title})`;
      optionsData.push({ val: idx, label: label });
    });

    const currentItem = optionsData.find(o => o.val === this.selectedEpisodeIndex) || optionsData[0];
    const triggerLabel = currentItem ? currentItem.label : '試合を選択';

    let menuItemsHtml = '';
    optionsData.forEach(item => {
      const isSelected = (item.val === this.selectedEpisodeIndex);
      menuItemsHtml += `
        <div class="custom-dropdown-item${isSelected ? ' is-selected' : ''}" data-val="${item.val}">
          ${item.label}
        </div>
      `;
    });

    customWrap.innerHTML = `
      <div class="custom-dropdown-trigger" id="custom-replay-dropdown-trigger">
        ${triggerLabel}
      </div>
      <div class="custom-dropdown-menu" id="custom-replay-dropdown-menu">
        ${menuItemsHtml}
      </div>
    `;

    const triggerEl = customWrap.querySelector('#custom-replay-dropdown-trigger');
    const menuEl = customWrap.querySelector('#custom-replay-dropdown-menu');

    if (triggerEl && menuEl) {
      triggerEl.onclick = (e) => {
        e.stopPropagation();
        soundMgr.playSelect();
        menuEl.classList.toggle('is-open');
      };

      menuEl.querySelectorAll('.custom-dropdown-item').forEach(itemEl => {
        itemEl.onclick = (e) => {
          e.stopPropagation();
          soundMgr.playSelect();
          const val = parseInt(itemEl.getAttribute('data-val'), 10);
          menuEl.classList.remove('is-open');
          this.changeEpisode(val);
        };
      });
    }

    if (!window._hasReplayDropdownDocClick) {
      window._hasReplayDropdownDocClick = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
      });
    }

    const minIdx = this.allowSeriesOverview ? -1 : 0;
    if (prevBtn) prevBtn.disabled = (this.selectedEpisodeIndex <= minIdx);
    if (nextBtn) nextBtn.disabled = (this.selectedEpisodeIndex >= this.currentEpisodes.length - 1);
  },

  changeEpisode(newIndex) {
    const minIdx = this.allowSeriesOverview ? -1 : 0;
    if (newIndex < minIdx || newIndex >= this.currentEpisodes.length) return;
    this.selectedEpisodeIndex = newIndex;
    this.renderGameSelectorUI();
    this.loadSelectedEpisode();
  },

  loadSelectedEpisode() {
    this.stopAutoPlay();

    const stageBoard = document.getElementById('replay-stage-board') || document.querySelector('.replay-stage-board');
    const ctrlBar = document.getElementById('replay-controller-bar') || document.querySelector('.replay-controller-bar');

    if (this.selectedEpisodeIndex === -1) {
      this.currentSteps = [];
      this.branchIndices = [];
      this.fullHandsSnapshot = [];
      this.currentIndex = 0;
      this.matchDiagnosis = null;

      if (stageBoard) stageBoard.classList.add('is-hidden');
      if (ctrlBar) ctrlBar.classList.add('is-hidden');

      const modeBadge = document.getElementById('replay-meta-mode');
      const winnerBadge = document.getElementById('replay-meta-winner');
      if (modeBadge) modeBadge.textContent = '👑 シリーズ総決算';
      if (winnerBadge) winnerBadge.textContent = `全 ${this.currentEpisodes.length} 試合の激闘譜`;

      this.renderSeriesOverviewMode();
      return;
    }

    if (stageBoard) stageBoard.classList.remove('is-hidden');
    if (ctrlBar) ctrlBar.classList.remove('is-hidden');

    const ep = this.currentEpisodes[this.selectedEpisodeIndex];
    if (!ep) return;

    const rawSteps = AIDataLogger.getStepsByGameId(ep.gameId) || [];
    this.currentSteps = rawSteps.filter(s => s.action !== 'GAME_END');
    if (this.currentSteps.length === 0) this.currentSteps = rawSteps;

    const mySeatResult = ep.seats ? ep.seats.find(s => s.seat === 1) : null;
    this.playerFinalRank = mySeatResult ? (mySeatResult.finalRank || 4) : 4;

    this.buildFullHandsHistory(ep);
    this.evaluateStartingHandPotential();
    this.buildMatchDiagnosis(ep);

    this.generateMatchMacroWarChronicle(ep);
    this.analyzeBranches(ep);
    this.currentIndex = 0;

    const slider = document.getElementById('replay-seek-slider');
    if (slider) {
      slider.min = 1;
      slider.max = Math.max(1, this.currentSteps.length);
      slider.value = 1;
    }

    const modeBadge = document.getElementById('replay-meta-mode');
    const winnerBadge = document.getElementById('replay-meta-winner');
    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
    const pAvatar = isScenario ? ScenarioManager.getCurrentAvatar() : null;

    if (modeBadge) {
      let modeText = '練習モード';
      if (isScenario) modeText = 'シナリオモード';
      else if (isSpectate) modeText = '観戦モード';
      modeBadge.textContent = modeText;
    }
    if (winnerBadge) {
      const winnerSeat = ep.seats ? ep.seats.find(s => s.finalRank === 1) : null;
      const seat1 = ep.seats ? ep.seats.find(s => s.seat === 1) : null;
      const seat1Name = isSpectate ? (seat1 ? seat1.charName : '席1') : (pAvatar ? `${pAvatar.shortName}（あなた）` : 'あなた');
      winnerBadge.textContent = `結果: ${seat1Name}【${seat1 ? seat1.rankTitle : '---'}】 (勝者: ${winnerSeat ? winnerSeat.charName : '---'})`;
    }

    this.renderCurrentStep();
  },

  restorePreviousModal() {
    if (this.previousModalId) {
      const pm = document.getElementById(this.previousModalId);
      if (pm) pm.classList.add('active');
      this.previousModalId = null;
    }
  },

  calculateHandPowerScore(cards) {
    if (!cards || cards.length === 0) return 0;
    let score = 0;
    const jCount = cards.filter(c => c && (c.isJoker || normalizeCardRank(c) === 'JOKER')).length;
    const twoCount = cards.filter(c => c && !c.isJoker && normalizeCardRank(c) === '2').length;
    const eightCount = cards.filter(c => c && !c.isJoker && normalizeCardRank(c) === '8').length;
    const aceCount = cards.filter(c => c && !c.isJoker && normalizeCardRank(c) === 'A').length;

    const groups = {};
    cards.forEach(c => {
      if (c && !c.isJoker && normalizeCardRank(c) !== 'JOKER') {
        const k = normalizeCardRank(c);
        groups[k] = (groups[k] || 0) + 1;
      }
    });

    const multiCards = Object.values(groups).filter(cnt => cnt >= 2).reduce((a, b) => a + b, 0);

    score += jCount * 80;
    score += twoCount * 45;
    score += eightCount * 30;
    score += aceCount * 18;
    score += multiCards * 8;

    const isolatedLowCount = cards.filter(c => c && !c.isJoker && ['3', '4', '5', '6', '7'].includes(normalizeCardRank(c)) && groups[normalizeCardRank(c)] === 1).length;
    score -= isolatedLowCount * 12;
    return score;
  },

  buildMatchDiagnosis(ep) {
    const isPlayerWin = (this.playerFinalRank === 1);
    const myInitCards = this.fullHandsSnapshot[0]?.seat_1 || [];
    const myScore = this.calculateHandPowerScore(myInitCards);

    const winnerSeat = ep.seats ? ep.seats.find(s => s.finalRank === 1) : null;
    const winnerName = winnerSeat ? winnerSeat.charName : '勝者';
    const winnerSeatKey = winnerSeat ? `seat_${winnerSeat.seat}` : 'seat_2';
    const winnerInitCards = this.fullHandsSnapshot[0]?.[winnerSeatKey] || [];
    const winnerScore = this.calculateHandPowerScore(winnerInitCards);
    const totalTurns = ep.totalTurns || this.currentSteps.length;

    const seat1Steps = this.currentSteps.filter(s => s.seat === 1 || s.player === 'player');
    const lastPlayerStep = seat1Steps[seat1Steps.length - 1];
    const isPlayerFoulFinish = lastPlayerStep && lastPlayerStep.chosenMove && isForbiddenFinish(lastPlayerStep.chosenMove, (lastPlayerStep.isRevolution !== lastPlayerStep.isElevenBack)) && (lastPlayerStep.hand && lastPlayerStep.hand.length === lastPlayerStep.chosenMove.length);

    if (isPlayerFoulFinish) {
      this.matchDiagnosis = {
        category: 'FOUL_FORBIDDEN_FINISH',
        forcePct: 0,
        badgeHtml: '<span class="eval-status-danger" style="font-size:10px; padding:2px 7px; background:#dc2626; color:#fff;">⚠️ 致命的敗因: 禁止あがり (反則負け失格)</span>',
        summaryText: '手札の最後の1手として禁止カード（2・8・JOKER等）を出してしまったため、ルール上即座に反則負け・大貧民確定となりました。あがり手およびその1手前に詰みルートを避ける手順の改善が最重要課題です。',
        allowBlame: true
      };
      return;
    }

    if (isPlayerWin) {
      this.matchDiagnosis = {
        category: 'WIN_COMPLETE',
        forcePct: 0,
        badgeHtml: '<span class="eval-status-leader" style="font-size:10px; padding:2px 7px;">👑 実力戴冠: 堂々の完全勝利</span>',
        summaryText: '初期手札の好機を最大限に活かし、序盤の温存から中盤の制空権奪取、終盤の確定詰みまで一切の隙を見せぬ盤石の横綱相撲でした！',
        allowBlame: false
      };
      return;
    }

    const isWinnerGodHand = (winnerScore >= 115);
    const isWinnerFaster = (winnerScore > myScore + 18);
    const isMyHandHard = (this.handPotential === 'HARD' || myScore <= 35);
    const isSpeedGame = (totalTurns <= 58);
    const isDaihinmin = (this.playerFinalRank === 4);
    const isHinmin = (this.playerFinalRank === 3);

    if ((isWinnerGodHand && isWinnerFaster) || (isMyHandHard && isSpeedGame) || (isWinnerFaster && myScore <= 55)) {
      let text = '';
      if (isDaihinmin) {
        text = `大富豪となった **${winnerName}** の初期手札戦力と展開速度が圧倒的であり、完全な不可抗力の局でした。相手の猛攻を受け止める手立てがなく押し切られた不運の試合です。あなたのカード選択ミスによる敗北ではありません。次局の反撃に期待します。`;
      } else if (isHinmin) {
        text = `大富豪となった **${winnerName}** の初期手札戦力と展開速度が圧倒的でしたが、最悪の大貧民転落を回避し貧民に踏みとどまった損切り巧者の立ち回りでした。完全な不可抗力であり、あなたのカード選択ミスではありません。`;
      } else {
        text = `大富豪となった **${winnerName}** の初期手札戦力とあがり速度が圧倒的であり、完全な不可抗力の局でした。あなたのカード選択ミスによる敗北ではありません。堂々の富豪（2位）死守であり、「あの打ち方で正解だった」と自信を持って次局へ挑んでください。`;
      }

      this.matchDiagnosis = {
        category: 'A_FORCE_MAJEURE',
        forcePct: 90,
        badgeHtml: '<span class="eval-status-chase" style="font-size:10px; padding:2px 7px; background:#0284c7; color:#fff;">🛡️ 本局の要因: 不可抗力 90% (天命の逆境)</span>',
        summaryText: text,
        allowBlame: false
      };
    } else if (myScore >= 90 && myScore >= winnerScore - 10) {
      let text = '';
      if (isDaihinmin) {
        text = `初期手札の戦力は十分に大富豪を狙える強力な布陣でした。しかし、中盤以降の親権争いで後手に回り、手札の連携を活かせず大貧民に沈んでしまった悔やまれる局です。`;
      } else {
        text = `初期手札の戦力は大富豪を十分に狙える強力な布陣でした。致命的なミスというよりは、終盤の親権争いで相手にわずかに先行を許したことが惜敗の要因です。`;
      }

      this.matchDiagnosis = {
        category: 'C_CHANCE_LOST',
        forcePct: 30,
        badgeHtml: '<span class="eval-status-even" style="font-size:10px; padding:2px 7px; background:#d97706; color:#fff;">⚔️ 本局の要因: 立ち回り 70% (勝機のあった局)</span>',
        summaryText: text,
        allowBlame: true
      };
    } else {
      let text = '';
      if (isDaihinmin) {
        text = `双方の手札戦力は拮抗していましたが、相手の決定打が一歩先行し、苦しい押し引きの末に大貧民となってしまった惜敗の局です。`;
      } else {
        text = `双方の手札戦力は拮抗していましたが、相手の決定打が一歩先行した惜敗です。最悪の大貧民転落を冷静に回避し、上位に踏みとどまった損切り巧者の立ち回りは見事でした。`;
      }

      this.matchDiagnosis = {
        category: 'B_CLOSE_CALL',
        forcePct: 60,
        badgeHtml: '<span class="eval-status-even" style="font-size:10px; padding:2px 7px; background:#475569; color:#fff;">⚖️ 本局の要因: 不可抗力 60% (紙一重の激突)</span>',
        summaryText: text,
        allowBlame: false
      };
    }
  },

  analyzeCountingAtStep(stepIdx, playerHand, isEffectiveRev) {
    const steps = this.currentSteps || [];
    const playedCards = [];

    for (let i = 0; i < stepIdx; i++) {
      const st = steps[i];
      if (st && st.chosenMove && st.chosenMove.length > 0) {
        playedCards.push(...st.chosenMove);
      }
    }

    const countCard = (rank) => playedCards.filter(c => c && !c.isJoker && normalizeCardRank(c) === rank).length;
    const jokerPlayed = playedCards.filter(c => c && (c.isJoker || normalizeCardRank(c) === 'JOKER')).length;

    const myJokers = playerHand.filter(c => c && (c.isJoker || normalizeCardRank(c) === 'JOKER'));

    let absoluteHighestRanks = [];
    let adviceType = null;
    let cardKeyName = '';

    if (!isEffectiveRev) {
      const twoPlayed = countCard('2');
      const acePlayed = countCard('A');
      const isJokerAllGone = (jokerPlayed + myJokers.length >= 2);
      const isTwoAllGone = (twoPlayed + playerHand.filter(c => normalizeCardRank(c) === '2').length >= 4);
      const isAceAllGone = (acePlayed + playerHand.filter(c => normalizeCardRank(c) === 'A').length >= 4);

      if (isJokerAllGone && isTwoAllGone && isAceAllGone) {
        absoluteHighestRanks = ['K'];
      } else if (isJokerAllGone && isTwoAllGone) {
        absoluteHighestRanks = ['A'];
      } else if (isJokerAllGone) {
        absoluteHighestRanks = ['2'];
      } else {
        absoluteHighestRanks = ['JOKER'];
      }

      const highestCardInHand = playerHand.find(c => {
        if ((c.isJoker || normalizeCardRank(c) === 'JOKER') && absoluteHighestRanks.includes('JOKER')) return true;
        const r = normalizeCardRank(c);
        return absoluteHighestRanks.includes(r);
      });

      if (highestCardInHand) {
        cardKeyName = (highestCardInHand.isJoker || normalizeCardRank(highestCardInHand) === 'JOKER') ? '🃏JOKER' : `${normalizeCardSuit(highestCardInHand)}${normalizeCardRank(highestCardInHand)}`;
        adviceType = 'PROMOTED_HIGHEST';
      }
    } else {
      const threePlayed = countCard('3');
      const isJokerAllGone = (jokerPlayed + myJokers.length >= 2);
      const isThreeAllGone = (threePlayed + playerHand.filter(c => normalizeCardRank(c) === '3').length >= 4);

      if (isJokerAllGone && isThreeAllGone) {
        absoluteHighestRanks = ['4'];
      } else if (isJokerAllGone) {
        absoluteHighestRanks = ['3'];
      } else {
        absoluteHighestRanks = ['3', 'JOKER'];
      }

      const highestCardInHand = playerHand.find(c => {
        if ((c.isJoker || normalizeCardRank(c) === 'JOKER') && absoluteHighestRanks.includes('JOKER')) return true;
        const r = normalizeCardRank(c);
        return absoluteHighestRanks.includes(r);
      });

      if (highestCardInHand) {
        cardKeyName = (highestCardInHand.isJoker || normalizeCardRank(highestCardInHand) === 'JOKER') ? '🃏JOKER' : `${normalizeCardSuit(highestCardInHand)}${normalizeCardRank(highestCardInHand)}`;
        adviceType = 'REVERSE_PROMOTED_HIGHEST';
      }
    }

    return {
      playedCardsCount: playedCards.length,
      absoluteHighestRanks,
      adviceType,
      cardKeyName
    };
  },

  buildFullHandsHistory(ep) {
    this.fullHandsSnapshot = [];
    const steps = this.currentSteps || [];
    if (steps.length === 0) return;

    const initialHands = { seat_1: [], seat_2: [], seat_3: [], seat_4: [] };
    [1, 2, 3, 4].forEach(seatNum => {
      const firstStep = steps.find(s => (s.seat === seatNum) && s.hand && s.hand.length > 0);
      if (firstStep) {
        initialHands[`seat_${seatNum}`] = firstStep.hand.map(c => ({ ...c }));
      }
    });

    const currentSimHands = {
      seat_1: initialHands.seat_1.map(c => ({ ...c })),
      seat_2: initialHands.seat_2.map(c => ({ ...c })),
      seat_3: initialHands.seat_3.map(c => ({ ...c })),
      seat_4: initialHands.seat_4.map(c => ({ ...c }))
    };

    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      const seatKey = `seat_${st.seat}`;

      this.fullHandsSnapshot.push({
        seat_1: currentSimHands.seat_1.map(c => ({ ...c })),
        seat_2: currentSimHands.seat_2.map(c => ({ ...c })),
        seat_3: currentSimHands.seat_3.map(c => ({ ...c })),
        seat_4: currentSimHands.seat_4.map(c => ({ ...c }))
      });

      if (st.chosenMove && st.chosenMove.length > 0 && currentSimHands[seatKey]) {
        st.chosenMove.forEach(playedCard => {
          const idx = currentSimHands[seatKey].findIndex(c => isSameCard(c, playedCard));
          if (idx !== -1) {
            currentSimHands[seatKey].splice(idx, 1);
          }
        });
      }
    }
  },

  generateSeriesMacroWarChronicle() {
    const eps = this.currentEpisodes || [];
    if (eps.length === 0) {
      this.seriesMacroSummary = '';
      return;
    }

    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
    const pAvatar = isScenario ? ScenarioManager.getCurrentAvatar() : null;
    let seat1Wins = 0;
    const rankHistory = [];
    const winnerNames = [];
    let seat1CharName = pAvatar ? `${pAvatar.shortName}（あなた）` : 'あなた';

    eps.forEach((e) => {
      const seat1 = e.seats ? e.seats.find(s => s.seat === 1) : null;
      if (seat1) {
        if (!pAvatar) seat1CharName = seat1.charName;
        const rank = seat1.finalRank || 4;
        rankHistory.push(rank);
        if (rank === 1) seat1Wins++;
      }

      const winnerSeat = e.seats ? e.seats.find(s => s.finalRank === 1) : null;
      if (winnerSeat) winnerNames.push(winnerSeat.charName);
    });

    const totalGames = eps.length;
    if (totalGames === 1) {
      this.seriesMacroSummary = '第1試合の単独決着です。ドロップダウンより各手番の詳細な戦記をご覧ください。';
      return;
    }

    const winCounts = {};
    winnerNames.forEach(name => {
      if (name !== seat1CharName && !name.includes('あなた')) {
        winCounts[name] = (winCounts[name] || 0) + 1;
      }
    });

    const topRival = Object.keys(winCounts).sort((a, b) => winCounts[b] - winCounts[a])[0] || '敵陣営の精鋭';
    const actorLabel = isSpectate ? '席1' : seat1CharName;

    let storyText = '';
    if (seat1Wins >= 2 && rankHistory[rankHistory.length - 1] === 1) {
      storyText = `全 ${totalGames} 戦の激闘のクライマックスにおいて、${actorLabel}が見事に怒涛の【大富豪戴冠】を達成！ 前半に猛威を振るった${topRival}の進撃を完膚なきまでに打ち破り、宮廷の真の覇者として堂々たる勝利を収めた英雄譜です。`;
    } else if (seat1Wins >= 1) {
      storyText = `全 ${totalGames} 戦の激闘譜。${topRival}ら手強いライバルたちの熾烈な猛攻を耐え忍び、見事に大富豪を奪取して確かな勝鬨を上げました。随所に光る冷静な自制と決定打が刻まれた見応えあるシリーズです。`;
    } else {
      storyText = `全 ${totalGames} 戦の苦闘録。${topRival}ら敵陣営の電撃的な攻勢に押される逆境の連続でしたが、大貧民転落を回避する粘り強い立ち回りで次なる逆襲の布石を築き上げました。`;
    }

    this.seriesMacroSummary = storyText;
  },

  evaluateStartingHandPotential() {
    const startHand = this.fullHandsSnapshot[0]?.seat_1 || [];
    const score = this.calculateHandPowerScore(startHand);

    if (score >= 115) this.handPotential = 'BLESSED';
    else if (score <= 25) this.handPotential = 'HARD';
    else this.handPotential = 'EVEN';

    const jCount = startHand.filter(c => c && (c.isJoker || normalizeCardRank(c) === 'JOKER')).length;
    const twoCount = startHand.filter(c => c && !c.isJoker && normalizeCardRank(c) === '2').length;
    const eightCount = startHand.filter(c => c && !c.isJoker && normalizeCardRank(c) === '8').length;
    const jEightCount = startHand.filter(c => c && !c.isJoker && normalizeCardRank(c) === 'J').length;

    const rankGroups = {};
    startHand.forEach(c => {
      if (c && !c.isJoker && normalizeCardRank(c) !== 'JOKER') {
        const k = normalizeCardRank(c);
        rankGroups[k] = (rankGroups[k] || 0) + 1;
      }
    });

    const pairs = Object.entries(rankGroups).filter(([_, cnt]) => cnt === 2);
    const tripples = Object.entries(rankGroups).filter(([_, cnt]) => cnt === 3);
    const quads = Object.entries(rankGroups).filter(([_, cnt]) => cnt >= 4);

    const isolatedLows = startHand.filter(c => c && !c.isJoker && ['3', '4', '5', '6'].includes(normalizeCardRank(c)) && rankGroups[normalizeCardRank(c)] === 1);

    let strengthText = '';
    if (jCount >= 1 && twoCount >= 1) strengthText = '🃏JOKERと最強の「2」という絶対的支配札を兼ね備え';
    else if (jCount >= 1) strengthText = '万能の切り札「🃏JOKER」を擁し';
    else if (twoCount >= 2) strengthText = '最強札「2」を複数抱える高い支配力を持ち';
    else if (quads.length >= 1) strengthText = '一撃で戦況を反転させる【革命の火種（4枚同数）】を秘め';
    else if (tripples.length >= 1 && pairs.length >= 1) strengthText = '3カードやペアなど重装セットが豊富で高い手札圧縮力を誇り';
    else if (pairs.length >= 2) strengthText = '複数のペアによって手札をスムーズに減らせる展開力を備え';
    else if (eightCount >= 2) strengthText = '親権を強制奪還する「8切り」を複数枚保持し';
    else strengthText = '標準的な戦力バランスを保ち';

    let challengeText = '';
    if (isolatedLows.length >= 3) {
      const lowNames = isolatedLows.map(c => normalizeCardRank(c)).join('・');
      challengeText = `低ランクの孤立端札（${lowNames}）が多く、親権を失うと処分に苦しむ手札構造でした。`;
    } else if (twoCount === 0 && jCount === 0 && eightCount === 0) {
      challengeText = '場を強制清算する決定打（2/JOKER/8）が極めて乏しく、親権維持に苦戦を強いられる手札でした。';
    } else if (pairs.length === 0 && tripples.length === 0) {
      challengeText = '手札がほぼ単騎に偏っており、相手の複数枚出し（ペア等）への対応力が問われる布陣でした。';
    } else if (jEightCount >= 2) {
      challengeText = '11バックの奇襲発動タイミングが上位進出の命運を握る布陣でした。';
    } else {
      challengeText = '隙のないバランス配分となっており、立ち回り次第で戴冠を狙える手札でした。';
    }

    const conjunction = (this.handPotential === 'BLESSED' || challengeText.includes('隙のない')) ? 'ており、' : 'つつも、';
    this.handPotentialDesc = `${strengthText}${conjunction}${challengeText}`;
  },

  generateMatchMacroWarChronicle(ep) {
    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
    const pAvatar = isScenario ? ScenarioManager.getCurrentAvatar() : null;
    const isPlayerWin = (this.playerFinalRank === 1);
    const mySeat = ep.seats ? ep.seats.find(s => s.seat === 1) : null;
    const totalTurns = ep.totalTurns || this.currentSteps.length;
    const seat1Name = isSpectate ? (mySeat ? mySeat.charName : '席1') : (pAvatar ? `${pAvatar.shortName}（あなた）` : 'あなた');

    const winnerSeat = ep.seats ? ep.seats.find(s => s.finalRank === 1) : null;
    const winnerName = winnerSeat ? winnerSeat.charName : '勝者';

    const diag = this.matchDiagnosis || {
      category: 'B_CLOSE_CALL',
      badgeHtml: '',
      summaryText: '',
      allowBlame: false
    };

    let threatTitle = '【敵軍の動向と自軍の制圧】';
    let mainEnemyThreatHtml = '';

    if (isPlayerWin) {
      threatTitle = '【敵軍の動向と自軍の制圧】';
      mainEnemyThreatHtml = `敵陣営も猛追を仕掛けてきましたが、${seat1Name}の隙のない手札管理と勝負所での的確な踏み込みが終始盤面を圧倒しました。`;
    } else {
      threatTitle = `【勝者（${winnerName}）の決め手】`;
      let winnerClimaxCombo = null;
      let winnerClimaxStepIdx = null;

      if (winnerSeat) {
        const winnerSteps = this.currentSteps.map((s, idx) => ({ s, idx })).filter(item => item.s.seat === winnerSeat.seat);
        const winnerPlays = winnerSteps.filter(item => item.s.chosenMove && item.s.chosenMove.length > 0);
        const lastPlays = winnerPlays.slice(-2);

        const eightCutPlay = lastPlays.find(item => item.s.chosenMove.some(c => c && normalizeCardRank(c) === '8'));
        const revPlay = winnerPlays.find(item => item.s.chosenMove.length >= 4);
        const multiPlay = lastPlays.find(item => item.s.chosenMove.length >= 2);
        const jokerSolo = lastPlays.find(item => item.s.chosenMove.length === 1 && (item.s.chosenMove[0]?.isJoker || normalizeCardRank(item.s.chosenMove[0]) === 'JOKER'));
        const twoSolo = lastPlays.find(item => item.s.chosenMove.length === 1 && !item.s.chosenMove[0]?.isJoker && normalizeCardRank(item.s.chosenMove[0]) === '2');

        if (revPlay) {
          winnerClimaxCombo = `敢行した【4枚出し革命】で力関係を逆転させ、そのまま一気に駆け抜け`;
          winnerClimaxStepIdx = revPlay.idx;
        } else if (eightCutPlay) {
          winnerClimaxCombo = `絶妙なタイミングで繰り出した【8切り架け橋】`;
          winnerClimaxStepIdx = eightCutPlay.idx;
        } else if (jokerSolo) {
          winnerClimaxCombo = `決定打として投じた【🃏JOKER単騎】による絶対制圧`;
          winnerClimaxStepIdx = jokerSolo.idx;
        } else if (twoSolo) {
          winnerClimaxCombo = `最強札【2】による力づくのねじ伏せ`;
          winnerClimaxStepIdx = twoSolo.idx;
        } else if (multiPlay) {
          winnerClimaxCombo = `中盤以降の【強固なペア連打による制圧】`;
          winnerClimaxStepIdx = multiPlay.idx;
        } else if (lastPlays.length > 0) {
          winnerClimaxCombo = `支配札を温存した盤石の逃げ切り`;
          winnerClimaxStepIdx = lastPlays[0].idx;
        }
      }

      const jumpBtnHtml = (winnerClimaxStepIdx !== null)
        ? `<button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${winnerClimaxStepIdx})">👉 第 ${winnerClimaxStepIdx + 1} 手へ飛ぶ</button>`
        : '';
      mainEnemyThreatHtml = `大富豪となった **${winnerName}** が${winnerClimaxCombo ? winnerClimaxCombo : '放った強力なカード'}を決定打とし、そのまま逃げ切りを許しました。 ${jumpBtnHtml}`;
    }

    let turningPointText = '';
    const revolutionStep = this.currentSteps.map((s, idx) => ({ s, idx })).find(item => item.s.chosenMove && item.s.chosenMove.length >= 4);
    const elevenBackStep = this.currentSteps.map((s, idx) => ({ s, idx })).find(item => item.s.chosenMove && item.s.chosenMove.some(c => c && normalizeCardRank(c) === 'J'));
    const eightCutStep = this.currentSteps.map((s, idx) => ({ s, idx })).find(item => (item.s.player === 'player' || item.s.seat === 1) && item.s.chosenMove && item.s.chosenMove.some(c => c && normalizeCardRank(c) === '8'));
    const blockStep = this.currentSteps.map((s, idx) => ({ s, idx })).find(item => (item.s.player === 'player' || item.s.seat === 1) && item.s.chosenMove && item.s.chosenMove.some(c => c && (c.isJoker || normalizeCardRank(c) === '2' || normalizeCardRank(c) === 'JOKER')));

    if (revolutionStep) {
      turningPointText = `第${revolutionStep.idx + 1}手で勃発した【革命】により盤面の力関係が一変し、低ランク牌を持つ陣営へ一気に風向きが傾いた決定的な山場 <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${revolutionStep.idx})">👉 第 ${revolutionStep.idx + 1} 手へ</button>`;
    } else if (eightCutStep) {
      turningPointText = `第${eightCutStep.idx + 1}手で繰り出した【8切り】によって相手の猛攻を強制切断し、自陣営へ主導権を手繰り寄せた決定的な山場 <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${eightCutStep.idx})">👉 第 ${eightCutStep.idx + 1} 手へ</button>`;
    } else if (elevenBackStep) {
      turningPointText = `第${elevenBackStep.idx + 1}手で炸裂した【11バック】により一時的に力関係が逆転し、戦況の主導権争いが激化した山場 <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${elevenBackStep.idx})">👉 第 ${elevenBackStep.idx + 1} 手へ</button>`;
    } else if (blockStep) {
      turningPointText = `第${blockStep.idx + 1}手で支配札を投入し、相手の進撃を物理的に封殺して場を流した防衛の山場 <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${blockStep.idx})">👉 第 ${blockStep.idx + 1} 手へ</button>`;
    } else {
      turningPointText = `${seat1Name}が相手の猛攻に対して冷静にパスでいなし、敵同士に最強カード（2・JOKER）をぶつけ合わせて消耗させた自制の立ち回り`;
    }

    let finishClimaxText = '終盤の主導権争いを制した的確なカード処理';
    const playerSteps = this.currentSteps.filter(s => s.player === 'player' || s.seat === 1);
    const lastThree = playerSteps.slice(-3);
    const hasTripple = lastThree.some(s => s.chosenMove && s.chosenMove.length >= 3);
    const hasEight = lastThree.some(s => s.chosenMove && s.chosenMove.some(c => c && normalizeCardRank(c) === '8'));
    const lastMove = lastThree[lastThree.length - 1];
    const isPairFinish = lastMove && lastMove.chosenMove && lastMove.chosenMove.length === 2;

    if (isPlayerWin) {
      if (hasTripple && hasEight && isPairFinish) {
        finishClimaxText = '残り6枚からの【3カード制圧 ➔ 8切り親権継続 ➔ ペア即ゴール】という教科書通りの確定詰みコンボ';
      } else if (hasEight) {
        finishClimaxText = '終盤の親権を決定づけた【8切り架け橋】からの鮮やかなゴールイン';
      } else if (isPairFinish) {
        finishClimaxText = '手札を温存した強固な【ペア連打】による完全封殺';
      } else {
        finishClimaxText = '切り札の優位性を活かしきった盤石のフィニッシュ';
      }
    }

    let winningPrescriptionHtml = null;

    if (!isPlayerWin && winnerSeat) {
      if (diag.category === 'A_FORCE_MAJEURE') {
        winningPrescriptionHtml = null;
      } else if (diag.category === 'B_CLOSE_CALL') {
        winningPrescriptionHtml = null;
      } else {
        const candidateSteps = [];
        for (let i = 0; i < this.currentSteps.length; i++) {
          const st = this.currentSteps[i];
          if (!st || (st.player !== 'player' && st.seat !== 1)) continue;
          const handNow = this.fullHandsSnapshot[i]?.seat_1 || [];
          const counts = st.remainingCounts || {};
          const winnerRem = counts[`seat_${winnerSeat.seat}`] || 99;

          if (handNow.length <= 6 || winnerRem <= 3) {
            candidateSteps.push({ st, idx: i, handNow, winnerRem });
          }
        }

        for (let k = candidateSteps.length - 1; k >= 0; k--) {
          const item = candidateSteps[k];
          const i = item.idx;
          const st = item.st;
          const handNow = item.handNow;
          const winnerRem = item.winnerRem;
          const isRevNow = (st.isRevolution !== st.isElevenBack);
          const counting = this.analyzeCountingAtStep(i, handNow, isRevNow);
          const field = st.fieldCards || [];
          const isPass = !!st.isPass || (!st.chosenMove || st.chosenMove.length === 0);
          const valid = st.validMoves || [];

          if (winnerRem <= 2 && isPass && valid.length > 0) {
            const strongBlock = valid.find(m => Array.isArray(m) && m.some(c => c && (c.isJoker || normalizeCardRank(c) === '2' || normalizeCardRank(c) === '8' || normalizeCardRank(c) === 'JOKER')));
            if (strongBlock) {
              const cardName = strongBlock.map(c => (c.isJoker || normalizeCardRank(c) === 'JOKER') ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(' ');
              winningPrescriptionHtml = `
                大富豪となった **${winnerName}** が残り${winnerRem}枚のリーチ状態でした！ 手元の【${cardName}】を出し惜しみせずぶつけて場を流すのが最善の防衛手でした。
                <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${i})">👉 第 ${i + 1} 手へ飛んで検証</button>
              `;
              break;
            }
          }

          if (!isRevNow && counting.absoluteHighestRanks.includes('A') && isPass && valid.length > 0) {
            const playableA = valid.find(m => Array.isArray(m) && m.length === (field.length || 1) && m.some(c => normalizeCardRank(c) === 'A'));
            if (playableA) {
              const cardName = playableA.map(c => `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(' ');
              winningPrescriptionHtml = `
                この時点で既に「2」と「JOKER」が出尽くしていたため、あなたの【${cardName}】は**誰にも返されない『絶対最強札（確定親権）』**でした！ ここで切って親権を確定奪取していれば、相手に逃げ切りを許さず自力であがりきれていました。
                <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${i})">👉 第 ${i + 1} 手へ飛んで検証</button>
              `;
              break;
            }
          }
        }
      }
    }

    this.macroWarChronicle = {
      isWin: isPlayerWin,
      rankTitle: mySeat ? mySeat.rankTitle : '大富豪',
      forceMajeureBadge: diag.badgeHtml,
      potentialDesc: this.handPotentialDesc,
      threatTitle: threatTitle,
      threatHtml: mainEnemyThreatHtml,
      turningHtml: turningPointText,
      finishText: finishClimaxText,
      summaryText: diag.summaryText,
      prescriptionHtml: winningPrescriptionHtml,
      totalTurns: totalTurns
    };
  },

  analyzeBranches(ep) {
    this.branchIndices = [];
    const steps = this.currentSteps || [];
    const isWin = (this.playerFinalRank === 1);
    const diag = this.matchDiagnosis;
    const allowMistakeDetection = !isWin && diag && diag.allowBlame;

    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (!st) continue;

      const isTargetActor = (st.player === 'player' || st.seat === 1);
      if (!isTargetActor) continue;

      const hand = this.fullHandsSnapshot[i]?.seat_1 || st.hand || [];
      const field = st.fieldCards || [];
      const chosen = st.chosenMove || [];
      const valid = st.validMoves || [];
      const isPass = !!st.isPass || chosen.length === 0;

      const counts = st.remainingCounts || {};
      const enemyCounts = [counts['seat_2'], counts['seat_3'], counts['seat_4']].filter(c => c !== undefined && c > 0);
      const minEnemyLen = enemyCounts.length > 0 ? Math.min(...enemyCounts) : 99;
      const isEnemyReach = (minEnemyLen <= 2);

      const isEffectiveRev = (st.isRevolution !== st.isElevenBack);
      if (!isPass && chosen.length === hand.length && isForbiddenFinish(chosen, isEffectiveRev)) {
        this.branchIndices.push({
          index: i,
          isBest: false,
          title: '⚠️ 【致命的反省点：禁止あがり失格】',
          reason: 'この手番で禁止カード（2・8・JOKER等）を出してあがってしまったため、即座に反則負け（最下位確定）となりました。'
        });
        continue;
      }

      if (!isPass && willLeaveOnlyForbiddenCards(chosen, hand, isEffectiveRev)) {
        this.branchIndices.push({
          index: i,
          isBest: false,
          title: '⚠️ 【敗因の根本分岐点：禁止カード詰み】',
          reason: 'この手番でカードを出したことにより、手元が禁止カードのみとなり、次回以降どうあがいても反則負けになる詰み状態を生み出してしまいました。'
        });
        continue;
      }

      if (isWin) {
        if (!isPass && chosen.some(c => c && normalizeCardRank(c) === '8')) {
          const isFinishNext = (hand.length - chosen.length <= 2);
          this.branchIndices.push({
            index: i,
            isBest: true,
            title: isFinishNext ? '✨ 【勝因の決定打：8切り即ゴール架け橋】' : '✨ 【勝因の決定打：8切り親権奪取】',
            reason: '場の主導権を「8切り」で即座に清算・奪取しました。相手の追撃を断ち切り、自らの確定あがりルートへ直結させた見事な一手です。'
          });
          continue;
        }

        if (!isPass && ((st.isElevenBack && chosen.some(c => ['3','4','5','6','7'].includes(normalizeCardRank(c)))) || (st.isRevolution && chosen.some(c => ['3','4','5','6'].includes(normalizeCardRank(c)))))) {
          this.branchIndices.push({
            index: i,
            isBest: true,
            title: '✨ 【好手・勝因ハイライト】',
            reason: '強弱反転（11バック・革命）の好機を逃さず、手元で腐りかけていた低ランク札を有利札として鮮やかに消化しました。'
          });
          continue;
        }

        if (!isPass && chosen.length >= 3) {
          this.branchIndices.push({
            index: i,
            isBest: true,
            title: '✨ 【好手・勝因ハイライト】',
            reason: '3枚以上の複数枚出しで盤面を完全に制圧し、他プレイヤー全員にパスを強要して手札を劇的に圧縮しました。'
          });
          continue;
        }

        if (!isPass && isEnemyReach && field.length > 0) {
          const isStrongPlay = chosen.some(c => c && (c.isJoker || normalizeCardRank(c) === '2' || normalizeCardRank(c) === '8' || normalizeCardRank(c) === 'JOKER'));
          if (isStrongPlay) {
            this.branchIndices.push({
              index: i,
              isBest: true,
              title: '✨ 【好手・勝因ハイライト】',
              reason: '対戦相手のリーチ（残り1〜2枚）を察知し、出し惜しみせず強力な支配札を投入してあがりを物理的に阻止しました。'
            });
            continue;
          }
        }
      } else if (allowMistakeDetection) {
        if (isPass && isEnemyReach && field.length > 0 && valid.length > 0) {
          const canBlock = valid.some(m => Array.isArray(m) && m.some(c => c && (normalizeCardRank(c) === '8' || normalizeCardRank(c) === '2' || c.isJoker || normalizeCardRank(c) === 'JOKER')));
          if (canBlock) {
            this.branchIndices.push({
              index: i,
              isBest: false,
              title: '⚠️ 【反省・要検討の一手】',
              reason: '対戦相手が残り1〜2枚のリーチ状態であり、手札に止められるカード（8切りや2、JOKER）があったにもかかわらずパスを選択してしまい、そのままゴールを許す原因となりました。'
            });
            continue;
          }
        }

        if (!isPass && chosen.length >= 4) {
          const rem = hand.filter(c => !chosen.some(cc => isSameCard(c, cc)));
          const highCount = rem.filter(c => c && (c.isJoker || ['2','A','K','Q'].includes(normalizeCardRank(c)))).length;
          const lowCount = rem.filter(c => c && !c.isJoker && ['3','4','5','6'].includes(normalizeCardRank(c))).length;
          if (highCount >= 3 && lowCount <= 1) {
            this.branchIndices.push({
              index: i,
              isBest: false,
              title: '⚠️ 【反省・要検討の一手】',
              reason: '手元に高ランクの支配札（2やA）が多く残っている段階で革命を起こしてしまい、自分の手札を一瞬で最弱化させてしまいました。'
            });
            continue;
          }
        }
      }
    }
  },

  renderSeriesOverviewMode() {
    const advisorText = document.getElementById('replay-advisor-text');
    const evalRate = document.getElementById('replay-eval-rate');
    const turnBadge = document.getElementById('replay-turn-badge');
    const actorName = document.getElementById('replay-actor-name');
    const actionDesc = document.getElementById('replay-action-desc');
    const branchIndicator = document.getElementById('replay-branch-indicator');

    if (turnBadge) turnBadge.textContent = `全 ${this.currentEpisodes.length} 試合 通算総括`;
    if (actorName) actorName.textContent = '宮廷大占勝師';
    if (actionDesc) actionDesc.textContent = '👑 シリーズ総決算 評定中';
    if (branchIndicator) branchIndicator.classList.add('is-hidden');
    if (evalRate) evalRate.textContent = '戦歴: 🏛️ 全試合総覧';

    if (advisorText) {
      advisorText.innerHTML = `
        <div style="text-align: left; padding: 2px 4px; font-size: 11.5px; line-height: 1.45; color: #e2e8f0;">
          <div style="color: #ffd700; font-weight: bold; font-size: 12px; border-bottom: 1px solid rgba(212,175,55,0.35); padding-bottom: 2px; margin-bottom: 4px;">
            🏛️ 万象を統べる宮廷大占勝師のシリーズ通算総括戦記（全 ${this.currentEpisodes.length} 試合）
          </div>
          <div style="margin-bottom: 5px; color: #fffadb;">
            　${this.seriesMacroSummary}
          </div>
          <div style="font-size: 10.5px; color: #94a3b8; border-top: 1px dashed rgba(212,175,55,0.25); padding-top: 2px;">
            ※上部のドロップダウンより「第1試合」「第2試合」等を選択いただくと、各試合の詳細な盤面再現および現場検証（1手送り・好手/反省手ジャンプ）が展開されます。
          </div>
        </div>
      `;
    }
  },

  renderCurrentStep() {
    if (!this.currentSteps || this.currentSteps.length === 0) return;
    const st = this.currentSteps[this.currentIndex];
    if (!st) return;

    const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');
    const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
    const pAvatar = isScenario ? ScenarioManager.getCurrentAvatar() : null;

    const turnBadge = document.getElementById('replay-turn-badge');
    const actorName = document.getElementById('replay-actor-name');
    const actionDesc = document.getElementById('replay-action-desc');
    const branchIndicator = document.getElementById('replay-branch-indicator');
    const slider = document.getElementById('replay-seek-slider');
    const envBadge = document.getElementById('replay-field-env');

    if (turnBadge) turnBadge.textContent = `第 ${this.currentIndex + 1} / ${this.currentSteps.length} 手`;
    
    const isSeat1Actor = (st.player === 'player' || st.seat === 1);
    let actualActorName = st.playerCharName || st.player;
    if (isSeat1Actor) {
      actualActorName = isSpectate ? `${st.playerCharName || '席1'}` : (pAvatar ? `${pAvatar.shortName}（あなた）` : `${st.playerCharName || 'あなた'}（あなた）`);
    }
    if (actorName) actorName.textContent = actualActorName;
    if (slider) slider.value = this.currentIndex + 1;

    const chosen = st.chosenMove || [];
    const isPass = !!st.isPass || chosen.length === 0;

    if (actionDesc) {
      if (isPass) {
        actionDesc.textContent = '❌ パス';
      } else {
        const cStr = chosen.map(c => (c?.isJoker || normalizeCardRank(c) === 'JOKER') ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(' ');
        actionDesc.textContent = `🃏 「${cStr}」を打牌`;
      }
    }

    if (envBadge) {
      if (st.isRevolution && !st.isElevenBack) {
        envBadge.textContent = '🔥 革命中';
      } else if (!st.isRevolution && st.isElevenBack) {
        envBadge.textContent = '⚡ 11バック';
      } else if (st.isRevolution && st.isElevenBack) {
        envBadge.textContent = '🌀 革命+11バック';
      } else {
        envBadge.textContent = '⚜️ 平時';
      }
    }

    const branchInfo = this.branchIndices.find(b => b.index === this.currentIndex);
    if (branchIndicator) {
      branchIndicator.classList.toggle('is-hidden', !branchInfo);
      if (branchInfo) {
        branchIndicator.textContent = branchInfo.isBest ? '✨ 好手ハイライト' : '⚠️ 反省ハイライト';
        branchIndicator.className = branchInfo.isBest ? 'replay-branch-badge badge-best-move' : 'replay-branch-badge badge-mistake-move';
      }
    }

    ['top', 'left', 'right', 'bottom'].forEach(pos => {
      const seatEl = document.getElementById(`replay-seat-${pos}`);
      if (seatEl) seatEl.classList.remove('is-active-turn');
    });

    const activeSeatNum = st.seat || (PLAYERS.indexOf(st.player) + 1);
    if (activeSeatNum === 1) {
      const s = document.getElementById('replay-seat-bottom');
      if (s) s.classList.add('is-active-turn');
    } else if (activeSeatNum === 2) {
      const s = document.getElementById('replay-seat-left');
      if (s) s.classList.add('is-active-turn');
    } else if (activeSeatNum === 3) {
      const s = document.getElementById('replay-seat-top');
      if (s) s.classList.add('is-active-turn');
    } else if (activeSeatNum === 4) {
      const s = document.getElementById('replay-seat-right');
      if (s) s.classList.add('is-active-turn');
    }

    const handsNow = this.fullHandsSnapshot[this.currentIndex] || {
      seat_1: [], seat_2: [], seat_3: [], seat_4: []
    };

    const ep = this.currentEpisodes[this.selectedEpisodeIndex];
    const getSeatFoulType = (seatNum) => {
      if (!ep || !ep.seats) return null;
      const s = ep.seats.find(item => item.seat === seatNum);
      if (!s) return null;
      if (foulPlayers && foulPlayers[PLAYERS[seatNum - 1]]) {
        return foulPlayers[PLAYERS[seatNum - 1]];
      }
      return null;
    };

    const nameTop = document.getElementById('replay-name-top');
    const countTop = document.getElementById('replay-count-top');
    const handTop = document.getElementById('replay-hand-top');
    if (nameTop) nameTop.textContent = getPlayerDisplayName('cpu2', true);
    const topCards = handsNow.seat_3 || [];
    if (countTop) {
      const fType = getSeatFoulType(3);
      if (topCards.length === 0 && fType === '反則負け') {
        countTop.innerHTML = '<span class="replay-status-foul">⚠️ 反則負け</span>';
      } else if (fType === '都落ち') {
        countTop.innerHTML = '<span class="replay-status-capital-fall">🏛️ 都落ち</span>';
      } else {
        countTop.textContent = `残り ${topCards.length}枚`;
      }
    }
    this.renderSeatCardsOpen(handTop, topCards, activeSeatNum === 3 ? chosen : [], getSeatFoulType(3));

    const nameLeft = document.getElementById('replay-name-left');
    const countLeft = document.getElementById('replay-count-left');
    const handLeft = document.getElementById('replay-hand-left');
    if (nameLeft) nameLeft.textContent = getPlayerDisplayName('cpu1', true);
    const leftCards = handsNow.seat_2 || [];
    if (countLeft) {
      const fType = getSeatFoulType(2);
      if (leftCards.length === 0 && fType === '反則負け') {
        countLeft.innerHTML = '<span class="replay-status-foul">⚠️ 反則負け</span>';
      } else if (fType === '都落ち') {
        countLeft.innerHTML = '<span class="replay-status-capital-fall">🏛️ 都落ち</span>';
      } else {
        countLeft.textContent = `残り ${leftCards.length}枚`;
      }
    }
    this.renderSeatCardsOpen(handLeft, leftCards, activeSeatNum === 2 ? chosen : [], getSeatFoulType(2));

    const nameRight = document.getElementById('replay-name-right');
    const countRight = document.getElementById('replay-count-right');
    const handRight = document.getElementById('replay-hand-right');
    if (nameRight) nameRight.textContent = getPlayerDisplayName('cpu3', true);
    const rightCards = handsNow.seat_4 || [];
    if (countRight) {
      const fType = getSeatFoulType(4);
      if (rightCards.length === 0 && fType === '反則負け') {
        countRight.innerHTML = '<span class="replay-status-foul">⚠️ 反則負け</span>';
      } else if (fType === '都落ち') {
        countRight.innerHTML = '<span class="replay-status-capital-fall">🏛️ 都落ち</span>';
      } else {
        countRight.textContent = `残り ${rightCards.length}枚`;
      }
    }
    this.renderSeatCardsOpen(handRight, rightCards, activeSeatNum === 4 ? chosen : [], getSeatFoulType(4));

    const nameBottom = document.getElementById('replay-name-bottom');
    const countBottom = document.getElementById('replay-count-bottom');
    const handBottom = document.getElementById('replay-hand-cards');
    const bottomDisplayName = isSpectate ? (assignedCharacters.player ? assignedCharacters.player.name : '席1') : (pAvatar ? `${pAvatar.shortName}（あなた）` : `${getPlayerDisplayName('player')}`);
    if (nameBottom) nameBottom.textContent = `${bottomDisplayName} の手札`;

    const bottomCards = handsNow.seat_1 || [];
    if (countBottom) {
      const fType = getSeatFoulType(1);
      if (bottomCards.length === 0 && fType === '反則負け') {
        countBottom.innerHTML = '<span class="replay-status-foul">⚠️ 反則負け</span>';
      } else if (fType === '都落ち') {
        countBottom.innerHTML = '<span class="replay-status-capital-fall">🏛️ 都落ち</span>';
      } else {
        countBottom.textContent = `残り ${bottomCards.length}枚`;
      }
    }

    if (handBottom) {
      handBottom.innerHTML = '';
      if (bottomCards.length === 0) {
        const fType = getSeatFoulType(1);
        if (fType === '反則負け') {
          handBottom.innerHTML = '<span style="font-size:11px; color:#f87171; font-weight:800;">⚠️ 反則負け（失格・大貧民確定）</span>';
        } else if (fType === '都落ち') {
          handBottom.innerHTML = '<span style="font-size:11px; color:#ffd700; font-weight:800;">🏛️ 都落ち（大貧民転落・離脱）</span>';
        } else {
          handBottom.innerHTML = '<span style="font-size:11px; color:#ffd700; font-weight:800;">👑 上がり！</span>';
        }
      } else {
        bottomCards.forEach(c => {
          if (!c) return;
          const isThisPlayed = (activeSeatNum === 1) && chosen.some(pc => isSameCard(pc, c));
          handBottom.appendChild(this.createRoyalCardEl(c, isThisPlayed, false));
        });
      }
    }

    const fieldCardsEl = document.getElementById('replay-field-cards');
    const actionActor = document.getElementById('replay-action-actor');
    const actionCards = document.getElementById('replay-action-cards');

    if (fieldCardsEl) {
      fieldCardsEl.innerHTML = '';
      const fCards = st.fieldCards || [];
      if (fCards.length === 0) {
        fieldCardsEl.innerHTML = '<span style="color:#64748b; font-size:11px;">(場にカードなし・親番)</span>';
      } else {
        fCards.forEach(c => {
          if (c) fieldCardsEl.appendChild(this.createRoyalCardEl(c, false, false));
        });
      }
    }

    if (actionActor) actionActor.textContent = `【${actualActorName}】`;
    if (actionCards) {
      if (isPass) {
        actionCards.innerHTML = '<span style="color:#94a3b8; font-size:11px;">パス を選択</span>';
      } else {
        const cStr = chosen.map(c => (c?.isJoker || normalizeCardRank(c) === 'JOKER') ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(' ');
        actionCards.innerHTML = `<span style="color:#ffd700; font-size:11.5px;">${cStr}</span> を打牌`;
      }
    }

    const advisorText = document.getElementById('replay-advisor-text');
    const evalRate = document.getElementById('replay-eval-rate');
    const chronicle = this.macroWarChronicle;

    if (evalRate) {
      const myRemLen = bottomCards.length;
      const enemyRemLens = [topCards.length, leftCards.length, rightCards.length].filter(l => l > 0);
      const minEnemyLen = enemyRemLens.length > 0 ? Math.min(...enemyRemLens) : 99;

      if (myRemLen === 0) {
        evalRate.textContent = '戦況: 👑 1位ゴール達成';
      } else if (myRemLen <= 2 && minEnemyLen >= 4) {
        evalRate.textContent = '戦況: 👑 独走態勢';
      } else if (myRemLen <= minEnemyLen) {
        evalRate.textContent = '戦況: 🔥 首位リード';
      } else if (minEnemyLen <= 2 && myRemLen >= 5) {
        evalRate.textContent = '戦況: 🛡️ 危機的防衛';
      } else {
        evalRate.textContent = '戦況: ⚖️ 拮抗推移';
      }
    }

    let macroHeaderHtml = '';
    if (chronicle) {
      const crownIcon = chronicle.isWin ? '👑' : (this.playerFinalRank === 2 ? '🥈' : '📜');
      const resultColor = chronicle.isWin ? '#ffd700' : (this.playerFinalRank === 2 ? '#38bdf8' : '#67e8f9');
      macroHeaderHtml = `
        <div style="text-align: left; background: rgba(10, 16, 26, 0.88); border: 1px solid rgba(212, 175, 55, 0.45); border-radius: 5px; padding: 4px 8px; margin-bottom: 4px; font-size: 11px; line-height: 1.4;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(212,175,55,0.3); padding-bottom:2px; margin-bottom:3px;">
            <span style="font-weight:bold; color:${resultColor}; font-size:11.5px;">${crownIcon} 宮廷大占勝師の戦記総括（第 ${this.selectedEpisodeIndex + 1} 試合 / 【${chronicle.rankTitle}】確定）</span>
            <div style="display:flex; align-items:center; gap:6px;">
              ${chronicle.forceMajeureBadge || ''}
              <span style="color:#94a3b8; font-size:10px;">総手数: ${chronicle.totalTurns}手</span>
            </div>
          </div>

          <div style="margin-bottom:3px;">
            <div style="color:#ffd700; font-weight:bold;">【初期手札の運命】</div>
            <div style="color:#e2e8f0;">　${chronicle.potentialDesc}</div>
          </div>

          <div style="margin-bottom:3px;">
            <div style="color:#f87171; font-weight:bold;">${chronicle.threatTitle}</div>
            <div style="color:#e2e8f0;">　${chronicle.threatHtml}</div>
          </div>

          <div style="margin-bottom:3px;">
            <div style="color:#38bdf8; font-weight:bold;">【勝敗を分けた最大の山場】</div>
            <div style="color:#e2e8f0;">　${chronicle.turningHtml}</div>
          </div>

          ${chronicle.isWin ? `
          <div style="margin-bottom:3px;">
            <div style="color:#4ade80; font-weight:bold;">【終盤の詰み】</div>
            <div style="color:#e2e8f0;">　${chronicle.finishText}</div>
          </div>` : ''}

          ${chronicle.prescriptionHtml ? `
          <div style="margin-bottom:3px; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.45); border-radius:4px; padding:3px 6px;">
            <div style="color:#f59e0b; font-weight:bold;">👑 【大富豪戴冠への処方箋（もしものIF分岐）】</div>
            <div style="color:#fffadb; margin-top:1px;">　${chronicle.prescriptionHtml}</div>
          </div>` : ''}

          <div style="margin-top:3px; border-top:1px dashed rgba(212,175,55,0.25); padding-top:2px;">
            <div style="color:#ffd700; font-weight:bold;">🏛️ 天意の総評:</div>
            <div style="color:#fff3a8;">　${chronicle.summaryText}</div>
          </div>
        </div>
      `;
    }

    if (branchInfo) {
      if (advisorText) {
        const titleColor = branchInfo.isBest ? '#ffd700' : '#ff6b6b';
        advisorText.innerHTML = `
          ${macroHeaderHtml}
          <div style="text-align: left; margin-top: 3px; background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px; border-left: 3px solid ${titleColor};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:${titleColor}; font-weight:bold; font-size:11.5px;">${branchInfo.title}</span>
              <button type="button" class="btn btn-sub btn-inline-jump" onclick="ReplayManager.jumpToStep(${branchInfo.index})">👉 この手番 (${branchInfo.index + 1}) へ</button>
            </div>
            <div style="color:#e2e8f0; font-size:11px; line-height:1.4; margin-top: 2px;">　${branchInfo.reason}</div>
          </div>
        `;
      }
    } else {
      if (advisorText) {
        let stepText = '';
        if (isSeat1Actor) {
          const isRevNow = (st.isRevolution !== st.isElevenBack);
          const stepCounting = this.analyzeCountingAtStep(this.currentIndex, bottomCards, isRevNow);

          if (stepCounting.adviceType === 'PROMOTED_HIGHEST') {
            stepText = `場に出た2やJOKERの消化により、手札の【${stepCounting.cardKeyName}】が誰にも返されない『絶対最強札』に昇格しています。親権奪取の最大の武器です。`;
          } else if (stepCounting.adviceType === 'REVERSE_PROMOTED_HIGHEST') {
            stepText = `強弱反転中につき、手札の低ランク札【${stepCounting.cardKeyName}】が『逆転最強札』となっています。`;
          } else if (this.handPotential === 'HARD' && this.playerFinalRank <= 3) {
            stepText = '過酷な手札を冷静に受け流し、大貧民転落を回避する見事な損切り巧者の立ち回りです。';
          } else if (chronicle && chronicle.isWin) {
            stepText = '手札の巡りと盤面の呼吸が合致しています。詰みを見据えた盤石のカード選択です。';
          } else {
            stepText = '場の枚数と残存カードの強弱を測りつつ、次なる好機を窺う立ち回りです。';
          }
        } else {
          stepText = isPass ? `${actualActorName} は出せる手がないか、後半を見据えてパスを選択しました。` : `${actualActorName} は手札の圧縮または親権奪取を狙った打牌を行いました。`;
        }

        advisorText.innerHTML = `
          ${macroHeaderHtml}
          <div style="text-align: left; font-size:11px; color:#e2e8f0; line-height:1.4; margin-top:2px;">
            <div style="color:#93c5fd; font-weight:bold;">【第 ${this.currentIndex + 1} 手：カード選択鑑定（${actualActorName}）】</div>
            <div>　${stepText}</div>
          </div>
        `;
      }
    }
  },

  renderSeatCardsOpen(containerEl, cards, chosen, foulType = null) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    if (!cards || cards.length === 0) {
      if (foulType === '反則負け') {
        containerEl.innerHTML = '<span style="font-size:9.5px; color:#f87171; font-weight:800;">⚠️ 反則負け</span>';
      } else if (foulType === '都落ち') {
        containerEl.innerHTML = '<span style="font-size:9.5px; color:#ffd700; font-weight:800;">🏛️ 都落ち</span>';
      } else {
        containerEl.innerHTML = '<span style="font-size:9.5px; color:#ffd700; font-weight:800;">👑 上がり！</span>';
      }
      return;
    }

    cards.forEach(c => {
      const isThisPlayed = chosen && chosen.some(pc => isSameCard(pc, c));
      containerEl.appendChild(this.createRoyalCardEl(c, isThisPlayed, true));
    });
  },

  createRoyalCardEl(card, isPlayed = false, isMini = false) {
    const el = document.createElement('div');
    if (!card) return el;

    const isJoker = !!card.isJoker || normalizeCardRank(card) === 'JOKER';
    const miniClass = isMini ? ' is-mini-seat' : '';
    const playedClass = isPlayed ? ' is-played' : '';

    if (isJoker) {
      const isSun = (card.jokerId === 'J1' || normalizeCardSuit(card) === '★');
      const jType = isSun ? 'joker-sun' : 'joker-moon';
      const jIcon = isSun ? '🃏' : '🎭';
      el.className = `replay-card ${jType}${miniClass}${playedClass}`;
      el.innerHTML = `
        <div class="replay-card-top">
          <span class="replay-card-suit">${isSun ? '★' : '☆'}</span>
          <span class="replay-card-rank">JOKER</span>
        </div>
        <span class="replay-card-center-icon">${jIcon}</span>
      `;
    } else {
      const suitSym = normalizeCardSuit(card) || '♠';
      const disp = normalizeCardRank(card) || '3';
      const sClass = (suitSym === '♥') ? 'heart' : (suitSym === '♦' ? 'diamond' : (suitSym === '♣' ? 'club' : 'spade'));
      el.className = `replay-card ${sClass}${miniClass}${playedClass}`;
      el.innerHTML = `
        <div class="replay-card-top">
          <span class="replay-card-suit">${suitSym}</span>
          <span class="replay-card-rank">${disp}</span>
        </div>
        <div class="replay-card-watermark">${suitSym}</div>
      `;
    }

    return el;
  },

  jumpToStep(stepIdx) {
    soundMgr.playSelect();
    if (this.selectedEpisodeIndex === -1) return;
    if (stepIdx >= 0 && stepIdx < this.currentSteps.length) {
      this.currentIndex = stepIdx;
      this.renderCurrentStep();
    }
  },

  next() {
    if (this.selectedEpisodeIndex === -1) return;
    if (this.currentIndex < this.currentSteps.length - 1) {
      this.currentIndex++;
      this.renderCurrentStep();
    } else {
      this.stopAutoPlay();
    }
  },

  prev() {
    if (this.selectedEpisodeIndex === -1) return;
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentStep();
    }
  },

  first() {
    if (this.selectedEpisodeIndex === -1) return;
    this.currentIndex = 0;
    this.renderCurrentStep();
  },

  last() {
    if (this.selectedEpisodeIndex === -1) return;
    this.currentIndex = Math.max(0, this.currentSteps.length - 1);
    this.renderCurrentStep();
  },

  jumpToBranch() {
    soundMgr.playSelect();
    if (this.selectedEpisodeIndex === -1) return;

    const advisorText = document.getElementById('replay-advisor-text');

    if (this.branchIndices.length === 0) {
      if (advisorText) {
        const diag = this.matchDiagnosis;
        const msg = (diag && diag.category === 'A_FORCE_MAJEURE')
          ? '🏛️ 【宮廷の託宣】本局は相手の圧倒的速度による完全な不可抗力であり、反省すべき悪手はありません。全員が手札に応じた堅実な立ち回りを行った試合でした。'
          : '🏛️ 【宮廷の託宣】本局は大きな失着（悪手）はなく、全員が手札に応じたセオリー通りの立ち回りを行った極めて堅実な局でした。';

        advisorText.innerHTML = `
          <div style="text-align: left; background: rgba(10, 16, 26, 0.92); border: 1px solid rgba(212, 175, 55, 0.45); border-radius: 5px; padding: 6px 10px; margin-bottom: 4px; font-size: 11.5px; line-height: 1.45; color: #fffadb;">
            <div style="color: #ffd700; font-weight: bold; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 2px; margin-bottom: 3px;">
              🎯 好手・反省手ハイライトの検証
            </div>
            <div>${msg}</div>
          </div>
        `;
      }
      return;
    }

    const nextBranch = this.branchIndices.find(b => b.index > this.currentIndex);
    if (nextBranch) {
      this.currentIndex = nextBranch.index;
    } else {
      this.currentIndex = this.branchIndices[0].index;
    }
    this.renderCurrentStep();
  },

  toggleAutoPlay() {
    if (this.selectedEpisodeIndex === -1) return;
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  },

  startAutoPlay() {
    if (this.selectedEpisodeIndex === -1) return;
    this.isPlaying = true;
    const playBtn = document.getElementById('btn-replay-play');
    if (playBtn) playBtn.textContent = '⏸ 一時停止';

    if (this.currentIndex >= this.currentSteps.length - 1) {
      this.currentIndex = 0;
    }

    this.autoPlayTimer = setInterval(() => {
      if (this.currentIndex < this.currentSteps.length - 1) {
        this.next();
      } else {
        this.stopAutoPlay();
      }
    }, 1200);
  },

  stopAutoPlay() {
    this.isPlaying = false;
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    const playBtn = document.getElementById('btn-replay-play');
    if (playBtn) playBtn.textContent = '▶ 再生';
  },

  closeModal() {
    soundMgr.playDeselect();
    this.stopAutoPlay();
    const m = document.getElementById('replay-modal');
    if (m) m.classList.remove('active');
    this.restorePreviousModal();
    updateFullscreenButtonsUI();
  }
};

let currentViewerEpisodeIndex = 0;
async function openUnifiedLogViewer() {
  soundMgr.playSelect();

  if (AIDataLogger.episodeLogs.length === 0) {
    alert('対戦データがまだありません。\n「練習モード」または「観戦モード」を実行してください。');
    return;
  }

  currentViewerEpisodeIndex = AIDataLogger.episodeLogs.length - 1;
  updateLogViewerUI();
  document.getElementById('log-viewer-modal').classList.add('active');
}

function updateLogViewerUI() {
  const episodes = AIDataLogger.episodeLogs;
  if (episodes.length === 0) return;

  if (currentViewerEpisodeIndex < 0) currentViewerEpisodeIndex = 0;
  if (currentViewerEpisodeIndex >= episodes.length) currentViewerEpisodeIndex = episodes.length - 1;

  const ep = episodes[currentViewerEpisodeIndex];
  const selectEl = document.getElementById('log-game-select');
  const prevBtn = document.getElementById('btn-log-prev');
  const nextBtn = document.getElementById('btn-log-next');
  const summaryEl = document.getElementById('log-episode-summary');
  const tableWrap = document.getElementById('modal-step-table-wrap');

  const getModeLabel = (p) => {
    if (p === 'SERIES_MANUAL') return '⚔️ 練習モード';
    if (p === 'SERIES_AUTO') return '🤖 観戦モード';
    if (p === 'SCENARIO_BATTLE') return '📜 シナリオ';
    if (p === 'MANUAL_GAME') return '👤 手動対戦';
    if (p === 'OBSERVE_AUTO') return '🤖 自動観戦';
    return p || '対戦';
  };

  selectEl.innerHTML = episodes.map((e, idx) =>
    `<option value="${idx}" ${idx === currentViewerEpisodeIndex ? 'selected' : ''}>試合 ${idx + 1} / ${episodes.length} [${getModeLabel(e.pattern)}]</option>`
  ).join('');

  prevBtn.disabled = (currentViewerEpisodeIndex === 0);
  nextBtn.disabled = (currentViewerEpisodeIndex === episodes.length - 1);

  const rankSortedSeats = [...ep.seats].sort((a, b) => a.finalRank - b.finalRank);
  summaryEl.innerHTML = `
    <div><strong>🏆 決着結果:</strong> ${rankSortedSeats.map(s => `<span style="color:#ffd700; font-weight:800;">${s.finalRank}位:</span> ${s.charName} (席${s.seat})`).join(' ｜ ')}</div>
    <div><span style="color:#fff3a8; font-family:'Cinzel',serif; font-weight:800;">総手数: ${ep.totalTurns}手</span></div>
  `;

  const steps = AIDataLogger.getStepsByGameId(ep.gameId);
  if (steps.length === 0) {
    tableWrap.innerHTML = '<div style="padding:18px; text-align:center; color:#8c9ba5;">手番データがありません。</div>';
    return;
  }

  const renderMiniCardTokens = (cards) => {
    if (!cards || cards.length === 0) return '';
    return `<div class="mini-cards-wrap">${cards.map(c => {
      if (c.isJoker || normalizeCardRank(c) === 'JOKER') {
        const jId = c.jokerId || (normalizeCardSuit(c) === '★' ? 'J1' : 'J2');
        const tokenClass = (jId === 'J1') ? 'token-joker-sun' : 'token-joker-moon';
        return `<span class="mini-card-token ${tokenClass}">${normalizeCardSuit(c) || '★'}JOKER</span>`;
      }
      const s = normalizeCardSuit(c);
      let suitClass = 'token-spade';
      if (s === '♥') suitClass = 'token-heart';
      else if (s === '♦') suitClass = 'token-diamond';
      else if (s === '♣') suitClass = 'token-club';
      return `<span class="mini-card-token ${suitClass}">${s}${normalizeCardRank(c)}</span>`;
    }).join('')}</div>`;
  };

  let thtml = `
    <table class="step-table">
      <thead>
        <tr>
          <th style="text-align:center; width: 48px;">手数</th>
          <th style="text-align:center; width: 44px;">座席</th>
          <th>キャラクター</th>
          <th style="text-align:center; width: 52px;">種別</th>
          <th style="text-align:center; width: 60px;">残手札</th>
          <th>場のカード</th>
          <th>選択手 (打牌/パス)</th>
          <th style="text-align:center; width: 84px; background:#1b2838; color:#ffd700;">確定順位</th>
        </tr>
      </thead>
      <tbody>
  `;

  steps.forEach(st => {
    const cardTokensHtml = st.chosenMove && st.chosenMove.length > 0
      ? renderMiniCardTokens(st.chosenMove)
      : '<span class="step-pass-badge">パス</span>';

    const fieldTokensHtml = st.fieldCards && st.fieldCards.length > 0
      ? renderMiniCardTokens(st.fieldCards)
      : '<span style="color:#64748b; font-size:10px;">(場なし)</span>';

    const rankBadge = `<span class="step-rank-badge srb-${st.finalRank}">${st.finalRank}位 (${st.rankTitle})</span>`;
    const isHuman = (st.isManual === true);
    const actorBadge = isHuman
      ? `<span class="step-actor-badge step-actor-human">👤 手動</span>`
      : `<span class="step-actor-badge step-actor-ai">🤖 AI</span>`;

    const rowBg = isHuman ? ' style="background:rgba(212,175,55,0.07);"' : '';

    thtml += `
      <tr${rowBg}>
        <td style="text-align:center; color:#94a3b8; font-family:'JetBrains Mono',monospace;">#${st.turnNumber}</td>
        <td style="text-align:center; font-weight:bold; color:#fff3a8;">席${st.seat}</td>
        <td><strong style="color:${isHuman ? '#ffd700' : '#e2e8f0'};">${st.playerCharName || st.playerChar}</strong></td>
        <td style="text-align:center;">${actorBadge}</td>
        <td style="text-align:center; font-weight:700; color:#fffadb;">${st.hand ? st.hand.length : 0}枚</td>
        <td>${fieldTokensHtml}</td>
        <td>${cardTokensHtml}</td>
        <td style="text-align:center; background:rgba(212,175,55,0.06);">${rankBadge}</td>
      </tr>
    `;
  });

  thtml += `</tbody></table>`;
  tableWrap.innerHTML = thtml;
}

function renderRankingModalContent() {
  const body = document.getElementById('stats-body');
  if (!body) return;

  updateResetButtonUI();

  if (currentStatsTab === 'practice') {
    if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) {
      const statsList = Object.values(ScenarioManager.data.stageMatchStats || {});
      const pAvatar = ScenarioManager.getCurrentAvatar();
      let html = `
        <div style="margin-bottom: 8px; font-size: 11.5px; color: #b0bec5; line-height: 1.45;">
          📜 シナリオ関門 途中成績<br>
          <span style="font-size:10px; color:#8c9ba5;">※現在挑戦中の関門（ステージ）における対戦スコアです。規定試合消化後に【最低1勝 ＋ 首位（大富豪率または平均順位）】で関門突破となります。</span>
        </div>
        <div class="user-overall-summary-badge">
          <span>📜 関門進捗:</span>
          <span>第 <strong>${ScenarioManager.data.currentMatchIndex}</strong> / <strong>${ScenarioManager.data.matchesPerStage}</strong> 試合消化中</span>
          <span>突破条件: <strong>最低1勝 ＋ 首位</strong></span>
        </div>
        <div class="ranking-table-container">
          <table class="ranking-table">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">席</th>
                <th>参加者</th>
                <th style="text-align: right;">平均順位</th>
                <th style="text-align: right;">大富豪率</th>
                <th style="text-align: center; white-space: nowrap !important; min-width: 102px;">大 / 富 / 貧 / 大貧</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (statsList.length === 0) {
        html += `
          <tr>
            <td colspan="5" style="text-align: center; color: #8c9ba5; padding: 12px;">第1試合の終了後に途中経過が表示されます。</td>
          </tr>
        `;
      } else {
        const sortedScenario = [...statsList].map(item => {
          const g = Math.max(1, item.games);
          return {
            ...item,
            dfRate: ((item.df / g) * 100).toFixed(1),
            avgRank: (item.rankSum / g).toFixed(2)
          };
        }).sort((a, b) => parseFloat(a.avgRank) - parseFloat(b.avgRank));

        sortedScenario.forEach((item, idx) => {
          const isPlayer = item.isPlayer;
          const rowStyle = isPlayer ? ' style="background: rgba(212,175,55,0.18); font-weight: bold;"' : '';
          const avatarSrc = isPlayer ? pAvatar.image : (CHAR_IMAGES[item.charId] || 'fugo-絵柄/king.png');
          const displayName = isPlayer ? getPlayerDisplayName('player', true) : `${item.icon} ${item.name}`;
          const foulSuffix = (typeof foulPlayers !== 'undefined' && foulPlayers[isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.charId)]) ? ` <span class="foul-badge">(${foulPlayers[isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.charId)]})</span>` : '';

          html += `
            <tr${rowStyle}>
              <td style="text-align: center; color: #ffd700;">${idx + 1}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <img src="${avatarSrc}" onerror="this.onerror=null; this.src='boy.png';" style="width: 20px; aspect-ratio: 2/3; border-radius: 3px; border: 1px solid rgba(212,175,55,0.4);" alt="">
                  <span style="color: ${isPlayer ? '#fff3a8' : '#e0e6ed'};">${displayName}</span>
                </div>
              </td>
              <td style="text-align: right; color: #ffd700; font-weight: 800;">${item.avgRank}位</td>
              <td style="text-align: right; color: #fff3a8;">${item.dfRate}%</td>
              <td style="text-align: center; white-space: nowrap !important;">
                ${renderRankCountBadges(item.df, item.f, item.h, item.dh)}${foulSuffix}
              </td>
            </tr>
          `;
        });
      }

      html += `</tbody></table></div>`;
      body.innerHTML = html;
      return;
    }

    const isSeriesActive = (MatchSeriesManager && MatchSeriesManager.isActive);
    if (!isSeriesActive) {
      body.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: #cbd5e1; line-height: 1.6;">
          現在進行中の対戦（練習/観戦）はありません。<br>
          <span style="font-size: 11px; color: #8c9ba5;">タイトルメニューから「練習モード」または「観戦モード」を開始するとここにリアルタイム成績が表示されます。</span>
        </div>
      `;
      return;
    }

    const pStats = GameStorage.loadPlayerStats();
    const pTotal = pStats.totalGames;
    const pAvg = pTotal > 0 ? (pStats.totalRankSum / pTotal).toFixed(2) : '-';
    const pDfRate = pTotal > 0 ? ((pStats.rankCounts['大富豪'] / pTotal) * 100).toFixed(1) : '0.0';

    const list = MatchSeriesManager.getSortedResults();
    let html = `
      <div style="margin-bottom: 8px; font-size: 11.5px; color: #b0bec5; line-height: 1.45;">
        ⚔️ 進行中マッチ成績（練習・観戦シリーズ途中経過）<br>
        <span style="font-size:10px; color:#8c9ba5;">※現在進行中の連続試合シリーズにおけるリアルタイム順位です。平均順位が高い順（1位に近い順）に表示されます。</span>
      </div>

      <div class="user-overall-summary-badge">
        <span>👤 あなたの通算実績:</span>
        <span>通算 <strong>${pTotal}</strong> 戦</span>
        <span>平均 <strong>${pAvg}</strong> 位</span>
        <span>大富豪率 <strong>${pDfRate}%</strong></span>
      </div>

      <div style="margin-bottom: 8px; font-size: 12px; color: #fff3a8; font-weight: bold; text-align: center;">
        現在の対戦状況: 第 ${MatchSeriesManager.currentGame} / ${MatchSeriesManager.totalGames} 試合消化（${MatchSeriesManager.mode === 'auto' ? '観戦モード' : '練習モード'}）
      </div>
      <div class="ranking-table-container">
        <table class="ranking-table">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">順位</th>
              <th>参加者</th>
              <th style="text-align: right;">平均順位</th>
              <th style="text-align: right;">大富豪率</th>
              <th style="text-align: center; white-space: nowrap !important; min-width: 102px;">大 / 富 / 貧 / 大貧</th>
            </tr>
          </thead>
          <tbody>
    `;

    list.forEach((item, idx) => {
      const rankBadge = `<span class="rank-num-badge rank-num-${idx + 1}">${idx + 1}</span>`;
      const isPlayer = item.isPlayer;
      const rowStyle = isPlayer ? ' style="background: rgba(212,175,55,0.18); font-weight: bold;"' : '';
      const avatarEl = `<img src="${CHAR_IMAGES[item.id] || 'fugo-絵柄/king.png'}" onerror="this.onerror=null; this.src='${item.id.toLowerCase()}.png';" style="width: 20px; aspect-ratio: 2/3; border-radius: 3px; border: 1px solid rgba(212,175,55,0.4);" alt="">`;
      const displayName = isPlayer ? getPlayerDisplayName('player', true) : `${item.icon} ${item.name}`;
      const foulSuffix = (typeof foulPlayers !== 'undefined' && foulPlayers[isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)]) ? ` <span class="foul-badge">(${foulPlayers[isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)]})</span>` : '';

      html += `
        <tr${rowStyle}>
          <td style="text-align: center;">${rankBadge}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              ${avatarEl}
              <span style="color: ${isPlayer ? '#fff3a8' : '#e0e6ed'};">${displayName}</span>
            </div>
          </td>
          <td style="text-align: right; color: #ffd700; font-weight: 800;">${item.avg}位</td>
          <td style="text-align: right; color: #fff3a8;">${item.winRate}%</td>
          <td style="text-align: center; white-space: nowrap !important;">
            ${renderRankCountBadges(item.df, item.f, item.h, item.dh)}${foulSuffix}
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    body.innerHTML = html;

  } else if (currentStatsTab === 'my') {
    const stats = GameStorage.loadPlayerStats();
    const total = stats.totalGames;
    const avg = total > 0 ? (stats.totalRankSum / total).toFixed(2) : '-';
    const pct = count => (total > 0 ? Math.round((count / total) * 100) : 0);
    const maxStreak = stats.maxStreak || 0;
    const currentStreak = stats.currentStreak || 0;

    let nemesis = '記録なし';
    let nemesisReason = 'まだ十分な対戦データがありません。';
    let maxBeat = 0;
    let nemesisTotal = 0;

    for (let c in stats.cpuStats) {
      if (stats.cpuStats[c].beatMe > maxBeat) {
        maxBeat = stats.cpuStats[c].beatMe;
        nemesisTotal = stats.cpuStats[c].games;
        const charObj = CHARACTER_DEFS[c];
        nemesis = charObj ? `${charObj.icon} ${charObj.fullName || charObj.name}` : c;
        const beatPct = nemesisTotal > 0 ? Math.round((maxBeat / nemesisTotal) * 100) : 0;
        nemesisReason = `同席対戦${nemesisTotal}戦中、あなたより上位でゴールした回数が最多の${maxBeat}回（被上位率 ${beatPct}%）。`;
      }
    }

    body.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 11.5px; color: #b0bec5; line-height: 1.45;">
        👤 あなたの個人戦績（手動対戦・全対局累計記録）<br>
        <span style="font-size:10px; color:#8c9ba5;">※あなたが手動でカードを選んで戦った全対戦の実績です（自動代行を使用した試合は混入されず純粋な腕前が記録されます）。</span>
      </div>

      <div class="stats-category-card">
        <div class="stats-category-title">📊 プレイヤー通算戦績（手動対戦・全記録）</div>
        <div class="stats-grid">
          <div>総対局数: <strong style="color:#fff3a8">${total}</strong> 試合</div>
          <div>平均順位: <strong style="color:#fff3a8">${avg}</strong> 位</div>
          <div>大富豪: ${stats.rankCounts['大富豪']}回 (${pct(stats.rankCounts['大富豪'])}%)</div>
          <div>富豪: ${stats.rankCounts['富豪']}回 (${pct(stats.rankCounts['富豪'])}%)</div>
          <div>貧民: ${stats.rankCounts['貧民']}回 (${pct(stats.rankCounts['貧民'])}%)</div>
          <div>大貧民: ${stats.rankCounts['大貧民']}回 (${pct(stats.rankCounts['大貧民'])}%)</div>
        </div>
      </div>

      <div class="stats-category-card">
        <div class="stats-category-title">🔥 大富豪 連続防衛記録 ＆ 役職移動</div>
        <div class="stats-grid">
          <div>大富豪 最高連続防衛: <strong style="color:#d4af37;">${maxStreak}</strong> 連続</div>
          <div>大富豪 現在の連続防衛: <strong style="color:#fff3a8;">${currentStreak}</strong> 連続</div>
          <div>総上納: <strong style="color:#ff6b6b">${stats.givenCards}</strong> 枚</div>
          <div>総搾取: <strong style="color:#4caf50">${stats.takenCards}</strong> 枚</div>
          <div style="grid-column: span 2;">下克上成功 (大貧民→大富豪): <strong style="color:#d4af37">${stats.gekokujo}</strong> 回</div>
        </div>
      </div>

      <div class="stats-category-card">
        <div class="stats-category-title">⚔️ あなたの天敵AIとその根拠</div>
        <div style="margin-bottom: 4px; font-size: 12px;">最も敗北を喫した相手: <strong style="color:#ff6b6b; font-size: 13.5px;">${nemesis}</strong></div>
        <div style="font-size: 11px; color: #b0bec5; line-height: 1.4;">根拠: ${nemesisReason}</div>
      </div>
    `;

  } else if (currentStatsTab === 'all') {
    const all = GameStorage.loadAllCharStats();
    const pStats = GameStorage.loadPlayerStats();
    const unlocked = GameStorage.loadUnlockedChars();

    const list = StartSetupManager.getAllCharListOrder()
      .filter(id => unlocked.includes(id))
      .map(id => {
        const def = CHARACTER_DEFS[id];
        const st = all[id] || { games: 0, df: 0, f: 0, h: 0, dh: 0, rankSum: 0 };
        const winRate = st.games > 0 ? ((st.df / st.games) * 100).toFixed(1) : '0.0';
        const avgRank = st.games > 0 ? (st.rankSum / st.games).toFixed(2) : '-';
        return {
          id: def.id,
          name: def.fullName || def.name,
          icon: def.icon,
          isPlayer: false,
          games: st.games,
          df: st.df, f: st.f, h: st.h, dh: st.dh,
          avgRank: avgRank,
          avgRankVal: st.games > 0 ? (st.rankSum / st.games) : 99,
          winRate: parseFloat(winRate)
        };
      });

    const pWinRate = pStats.totalGames > 0 ? ((pStats.rankCounts['大富豪'] / pStats.totalGames) * 100).toFixed(1) : '0.0';
    list.push({
      id: 'PLAYER',
      name: getPlayerDisplayName('player'),
      icon: '👤',
      isPlayer: true,
      games: pStats.totalGames,
      df: pStats.rankCounts['大富豪'],
      f: pStats.rankCounts['富豪'],
      h: pStats.rankCounts['貧民'],
      dh: pStats.rankCounts['大貧民'],
      avgRank: pStats.totalGames > 0 ? (pStats.totalRankSum / pStats.totalGames).toFixed(2) : '-',
      avgRankVal: pStats.totalGames > 0 ? (pStats.totalRankSum / pStats.totalGames) : 99,
      winRate: parseFloat(pWinRate)
    });

    list.sort((a, b) => {
      if (a.avgRankVal !== b.avgRankVal) return a.avgRankVal - b.avgRankVal;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.games - a.games;
    });

    let html = `
      <div style="margin-bottom: 8px; font-size: 11.5px; color: #b0bec5; line-height: 1.45;">
        宮廷総合格付け（解放済みキャラクター・平均順位 順）<br>
        <span style="font-size:10px; color:#8c9ba5;">※AIは全対戦、あなたは手動対戦の実績が集計・蓄積されます（横スクロールで全項目閲覧可能）。</span>
      </div>
      <div class="ranking-table-container">
        <table class="ranking-table">
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">順位</th>
              <th>参加者</th>
              <th style="text-align: right;">平均順位</th>
              <th style="text-align: right;">大富豪率</th>
              <th style="text-align: center; white-space: nowrap !important; min-width: 102px;">大 / 富 / 貧 / 大貧</th>
              <th style="text-align: right; white-space: nowrap !important;">試合数</th>
            </tr>
          </thead>
          <tbody>
    `;

    list.forEach((c, idx) => {
      const rankBadge = idx < 3 ? `<span class="rank-num-badge rank-num-${idx + 1}">${idx + 1}</span>` : `${idx + 1}`;
      const rowClass = c.isPlayer ? ' class="ranking-row-player"' : '';
      const avatarEl = c.isPlayer
        ? `<div style="width: 22px; height: 33px; border-radius: 3px; border: 1px solid rgba(212,175,55,0.8); background: #1a2332; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;">👤</div>`
        : `<img src="${CHAR_IMAGES[c.id] || 'fugo-絵柄/king.png'}" onerror="this.onerror=null; this.src='${c.id.toLowerCase()}.png';" style="width: 22px; height: 33px; border-radius: 3px; border: 1px solid rgba(212,175,55,0.4); flex-shrink: 0; object-fit: cover;" alt="">`;
      const foulSuffix = (typeof foulPlayers !== 'undefined' && foulPlayers[c.isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === c.id)]) ? ` <span class="foul-badge">(${foulPlayers[c.isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)]})</span>` : '';

      html += `
        <tr${rowClass}>
          <td style="text-align: center;">${rankBadge}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${avatarEl}
              <span style="font-weight: bold; color: ${c.isPlayer ? '#fff3a8' : '#e0e6ed'}; font-size: 12px;">${c.name}</span>
            </div>
          </td>
          <td style="text-align: right; color: #ffd700; font-weight: 800;">${c.avgRank}位</td>
          <td style="text-align: right; color: #fff3a8; font-weight: 600;">${c.winRate}%</td>
          <td style="text-align: center; white-space: nowrap !important;">
            ${renderRankCountBadges(c.df, c.f, c.h, c.dh)}${foulSuffix}
          </td>
          <td style="text-align: right; color: #b0bec5; white-space: nowrap !important;">${c.games}戦</td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    html += `
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(212,175,55,0.25); display: flex; justify-content: flex-end;">
        <button class="btn btn-sub" id="btn-view-observe-log" style="padding: 6px 14px; font-size: 11.5px; width: auto; color: #ffd700; border-color: #ffd700;">
          <span>🔍 直近の対戦・観戦ステップログを閲覧</span>
        </button>
      </div>
    `;

    body.innerHTML = html;
    const vBtn = document.getElementById('btn-view-observe-log');
    if (vBtn) vBtn.onclick = openUnifiedLogViewer;
  }
}

function updateResetButtonUI() {
  const clearBtn = document.getElementById('modal-stats-clear-btn');
  const unlockClearBtn = document.getElementById('modal-unlock-clear-btn');
  if (!clearBtn) return;

  if (currentStatsTab === 'my') {
    clearBtn.style.display = 'inline-block';
    clearBtn.textContent = '👤 通算戦績のみリセット';
    if (unlockClearBtn) unlockClearBtn.classList.add('is-hidden');
  } else if (currentStatsTab === 'all') {
    clearBtn.style.display = 'inline-block';
    clearBtn.textContent = '👑 格付けランキングのみリセット';
    if (unlockClearBtn) {
      unlockClearBtn.classList.remove('is-hidden');
      unlockClearBtn.onclick = () => {
        if (confirm('シナリオで解放されたキャラクターの実績を初期状態（初期貴族＋王のみ）に戻しますか？\n（※シナリオモードの進行状況には影響しません）')) {
          soundMgr.playSelect();
          GameStorage.resetUnlockedChars();
          StartSetupManager.renderPlayerCharGrid();
          StartSetupManager.renderOpponentsGrid();
          updateCharIntroVisibility();
          alert('キャラクターの解放状況を初期状態にリセットしました。');
        }
      };
    }
  } else {
    clearBtn.style.display = 'none';
    if (unlockClearBtn) unlockClearBtn.classList.add('is-hidden');
  }
}

function openDebugLogModal() {
  soundMgr.playSelect();
  document.getElementById('debug-log-modal').classList.add('active');
  const container = document.getElementById('debug-log-container');
  if (container) container.scrollTop = container.scrollHeight;
  if (!AIStatusUI.isServerOnline) AIStatusUI.pingServer();
}

function renderVersionHistoryModal() {
  const body = document.getElementById('version-modal-body');
  if (!body) return;

  const rawList = (typeof VERSION_HISTORY !== 'undefined') ? VERSION_HISTORY : [];
  const list = rawList.slice(0, 10);

  if (list.length === 0) {
    body.innerHTML = '<p style="color:#8c9ba5;">更新履歴はありません。</p>';
    return;
  }

  let html = '';
  list.forEach(item => {
    html += `
      <div class="version-card">
        <div class="version-header">
          <span class="version-tag">${item.ver}</span>
          <span class="version-date">${item.date}</span>
        </div>
        <div class="version-title">${item.title || '更新情報'}</div>
        <ul class="version-changes">
          ${item.changes.map(c => `<li>${c}</li>`).join('')}
        </ul>
        <div class="version-files">対象ファイル: ${item.files.join(', ')}</div>
      </div>
    `;
  });

  body.innerHTML = html;
}

/* ============================================================
 * 9. スタート設定マネージャー (StartSetupManager)
 * ============================================================ */
const StartSetupManager = {
  selectedMode: 'practice',
  selectedExchange: 'yes',
  selectedForbiddenAssist: 'on',
  selectedGames: 10,
  selectedPlayerCharId: 'DUKE',
  selectedOpponentIds: ['MARQUIS', 'COUNT', 'KNIGHT'],

  init() {
    this.setupModeToggles();
    this.setupExchangeToggles();
    this.setupForbiddenAssistToggles();
    this.renderGamesCards();
    this.renderPlayerCharGrid();
    this.renderOpponentsGrid();
    this.updateStartButtonState();
    this.updateGuidanceMessage();
  },

  enableWheelScroll(element) {
    if (!element) return;
    if (element._hasWheelScroll) return;
    element._hasWheelScroll = true;

    element.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        element.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  },

  setupModeToggles() {
    const pBtn = document.getElementById('btn-mode-practice');
    const aBtn = document.getElementById('btn-mode-auto');
    const sBtn = document.getElementById('btn-mode-scenario');
    const scenarioPlate = document.getElementById('setup-scenario-info-plate');
    const practiceWrap = document.getElementById('setup-practice-options-wrap');

    const setModeVisual = (mode) => {
      terminateCurrentSession();
      this.selectedMode = mode;
      if (pBtn) pBtn.classList.toggle('active', mode === 'practice');
      if (aBtn) aBtn.classList.toggle('active', mode === 'auto');
      if (sBtn) sBtn.classList.toggle('active', mode === 'scenario');

      const isScenario = (mode === 'scenario');
      if (scenarioPlate) scenarioPlate.classList.toggle('is-hidden', !isScenario);
      if (practiceWrap) practiceWrap.classList.toggle('is-hidden', isScenario);

      this.updateStartButtonState();
      this.updateGuidanceMessage();
    };

    if (pBtn) {
      pBtn.onclick = () => {
        soundMgr.playSelect();
        setModeVisual('practice');
      };
    }

    if (aBtn) {
      aBtn.onclick = () => {
        soundMgr.playSelect();
        setModeVisual('auto');
      };
    }

    if (sBtn) {
      sBtn.onclick = () => {
        soundMgr.playSelect();
        setModeVisual('scenario');
      };
    }
  },

  setupExchangeToggles() {
    const yBtn = document.getElementById('btn-exchange-yes');
    const nBtn = document.getElementById('btn-exchange-no');
    if (!yBtn || !nBtn) return;

    yBtn.onclick = () => {
      soundMgr.playSelect();
      this.selectedExchange = 'yes';
      yBtn.classList.add('active');
      nBtn.classList.remove('active');
      this.updateStartButtonState();
      this.updateGuidanceMessage();
    };

    nBtn.onclick = () => {
      soundMgr.playSelect();
      this.selectedExchange = 'no';
      nBtn.classList.add('active');
      yBtn.classList.remove('active');
      this.updateStartButtonState();
      this.updateGuidanceMessage();
    };
  },

  setupForbiddenAssistToggles() {
    const onBtn = document.getElementById('btn-forbidden-assist-on');
    const offBtn = document.getElementById('btn-forbidden-assist-off');
    if (!onBtn || !offBtn) return;

    onBtn.onclick = () => {
      soundMgr.playSelect();
      this.selectedForbiddenAssist = 'on';
      GAME_SETTINGS.forbiddenFinishAlert = true;
      onBtn.classList.add('active');
      offBtn.classList.remove('active');
    };

    offBtn.onclick = () => {
      soundMgr.playSelect();
      this.selectedForbiddenAssist = 'off';
      GAME_SETTINGS.forbiddenFinishAlert = false;
      offBtn.classList.add('active');
      onBtn.classList.remove('active');
    };
  },

  renderGamesCards() {
    const grid = document.getElementById('setup-games-cards-grid');
    const label = document.getElementById('setup-games-label');
    if (!grid) return;
    grid.innerHTML = '';

    const presetCounts = [1, 5, 10, 20, 50];
    presetCounts.forEach(count => {
      const card = document.createElement('div');
      const isActive = (this.selectedGames === count);
      card.className = `practice-game-card${isActive ? ' is-active' : ''}`;
      card.innerHTML = `
        <div class="pgc-num">${count}</div>
        <div class="pgc-label">試合</div>
      `;

      card.onclick = () => {
        soundMgr.playSelect();
        this.selectedGames = count;
        if (label) label.textContent = `全 ${count} 試合の連続対戦`;
        this.renderGamesCards();
        this.updateStartButtonState();
        this.updateGuidanceMessage();
      };

      grid.appendChild(card);
    });
  },

  getAllCharListOrder() {
    return [
      'DUKE', 'MARQUIS', 'COUNT', 'KNIGHT', 'MERCHANT', 'SCHOLAR', 'STRATEGIST', 'REVOLUTIONARY', 'JESTER',
      'BEGINNER_AI', 'KING', 'SUPER_AI', 'AWAKENED_KING',
      'NOBUNAGA', 'SHOTOKU', 'SHI_HUANGDI', 'ALEXANDER', 'GILGAMESH'
    ];
  },

  renderPlayerCharGrid() {
    const grid = document.getElementById('setup-player-char-grid');
    const badge = document.getElementById('setup-player-badge');
    if (!grid) return;
    grid.innerHTML = '';

    const allChars = this.getAllCharListOrder();
    const unlockedChars = GameStorage.loadUnlockedChars();
    let currentSelected = this.selectedPlayerCharId;

    if (!unlockedChars.includes(currentSelected)) {
      currentSelected = 'DUKE';
      this.selectedPlayerCharId = 'DUKE';
    }

    if (badge) {
      const def = CHARACTER_DEFS[currentSelected];
      badge.textContent = def ? `${def.icon} ${def.fullName || def.name}` : '未選択';
      badge.classList.toggle('is-ready', !!def);
    }

    allChars.forEach(charId => {
      const def = CHARACTER_DEFS[charId];
      if (!def) return;
      const isUnlocked = unlockedChars.includes(charId);

      if (!isUnlocked) return;

      const isSelected = (charId === currentSelected);
      const shortDesc = CHAR_SHORT_DESC[charId] || '';
      const displayName = def.fullName || def.name;
      const icon = def.icon;
      const imgSrc = CHAR_IMAGES[def.id] || 'fugo-絵柄/king.png';

      const item = document.createElement('div');
      item.className = `compact-char-item${isSelected ? ' is-selected' : ''}`;
      item.innerHTML = `
        <img src="${imgSrc}" onerror="this.onerror=null; this.src='king.png';" alt="">
        <span class="c-name">${icon} ${displayName}</span>
        <span class="c-desc">${shortDesc}</span>
      `;

      item.onclick = () => {
        soundMgr.playSelect();
        this.selectedPlayerCharId = charId;
        if (this.selectedOpponentIds.includes(charId)) {
          this.selectedOpponentIds = this.selectedOpponentIds.filter(id => id !== charId);
        }
        this.renderPlayerCharGrid();
        this.renderOpponentsGrid();
        this.updateStartButtonState();
        this.updateGuidanceMessage();
      };

      grid.appendChild(item);
    });

    this.enableWheelScroll(grid);
  },

  renderOpponentsGrid() {
    const grid = document.getElementById('setup-opponents-char-grid');
    const badge = document.getElementById('setup-opponents-badge');
    if (!grid) return;
    grid.innerHTML = '';

    const allChars = this.getAllCharListOrder();
    const unlockedChars = GameStorage.loadUnlockedChars();
    const myChar = this.selectedPlayerCharId;

    this.selectedOpponentIds = this.selectedOpponentIds.filter(id => unlockedChars.includes(id) && id !== myChar);

    const count = this.selectedOpponentIds.length;

    if (badge) {
      badge.textContent = `${count} / 3人 選択中`;
      badge.classList.toggle('is-ready', count === 3);
    }

    allChars.forEach(charId => {
      const def = CHARACTER_DEFS[charId];
      if (!def) return;
      const isUnlocked = unlockedChars.includes(charId);

      if (!isUnlocked) return;

      const isMyChar = (charId === myChar);
      const isSelected = this.selectedOpponentIds.includes(charId);
      const shortDesc = isMyChar ? '操作キャラ' : (CHAR_SHORT_DESC[charId] || '');
      const displayName = isMyChar ? '自分' : (def.fullName || def.name);
      const icon = isMyChar ? '👤' : def.icon;
      const imgSrc = CHAR_IMAGES[def.id] || 'fugo-絵柄/king.png';

      const item = document.createElement('div');
      item.className = `compact-char-item${isSelected ? ' is-selected' : ''}`;
      item.innerHTML = `
        <img src="${imgSrc}" onerror="this.onerror=null; this.src='king.png';" alt="">
        <span class="c-name">${icon} ${displayName}</span>
        <span class="c-desc">${shortDesc}</span>
      `;

      if (!isMyChar) {
        item.onclick = () => {
          soundMgr.playSelect();
          if (this.selectedOpponentIds.includes(charId)) {
            this.selectedOpponentIds = this.selectedOpponentIds.filter(id => id !== charId);
          } else {
            if (this.selectedOpponentIds.length >= 3) {
              alert('対戦相手のキャラクターはちょうど3人選択してください。');
              return;
            }
            this.selectedOpponentIds.push(charId);
          }
          this.renderOpponentsGrid();
          this.updateStartButtonState();
          this.updateGuidanceMessage();
        };
      }

      grid.appendChild(item);
    });

    this.enableWheelScroll(grid);
  },

  pickRandomOpponents() {
    soundMgr.playSelect();
    const unlocked = GameStorage.loadUnlockedChars();
    const available = unlocked.filter(id => id !== this.selectedPlayerCharId);
    const shuffled = shuffle(available);
    this.selectedOpponentIds = shuffled.slice(0, 3);
    this.renderOpponentsGrid();
    this.updateStartButtonState();
    this.updateGuidanceMessage();
  },

  updateGuidanceMessage() {
    const textEl = document.getElementById('setup-guidance-text');
    if (!textEl) return;

    if (this.selectedMode === 'scenario') {
      textEl.textContent = '📜 シナリオモード：下のボタンから物語画面へ進み、勝負師を選択してください';
      return;
    }

    const hasPlayer = !!this.selectedPlayerCharId;
    const oppoCount = this.selectedOpponentIds.length;

    if (!hasPlayer) {
      textEl.textContent = '💬 「④ あなたの分身となるキャラクター」を左右にスワイプして選択してください';
    } else if (oppoCount < 3) {
      textEl.textContent = `💬 「⑤ 対戦相手CPU」をあと ${3 - oppoCount} 人選択してください（🎲おまかせ選出も可能）`;
    } else {
      textEl.textContent = '👑 布陣が決まったら、下の【対戦開始ボタン】を押して出陣してください！';
    }
  },

  updateStartButtonState() {
    const btn = document.getElementById('btn-start-configured-match');
    const icon = document.getElementById('btn-start-icon');
    const text = document.getElementById('btn-start-text');
    if (!btn) return;

    if (this.selectedMode === 'scenario') {
      btn.disabled = false;
      if (icon) icon.textContent = '📜';
      if (text) text.textContent = 'シナリオモードへ進む（専用画面へ） ⚔️';
      this.updateGuidanceMessage();
      return;
    }

    const hasPlayer = !!this.selectedPlayerCharId;
    const oppoCount = this.selectedOpponentIds.length;
    const isReady = hasPlayer && (oppoCount === 3);

    btn.disabled = !isReady;

    if (isReady) {
      const modeText = this.selectedMode === 'auto' ? '観戦モード (AI自動)' : '練習モード (手動)';
      const exText = this.selectedExchange === 'yes' ? '交換あり' : '交換なし';
      if (icon) icon.textContent = this.selectedMode === 'auto' ? '🤖' : '⚔️';
      if (text) text.textContent = `${modeText}を開始 (${this.selectedGames}試合 / ${exText})`;
    } else {
      if (icon) icon.textContent = '👆';
      if (!hasPlayer) {
        if (text) text.textContent = '操作キャラクターを選択してください';
      } else {
        if (text) text.textContent = `対戦相手をあと ${3 - oppoCount} 人選択してください`;
      }
    }

    this.updateGuidanceMessage();
  },

  startConfiguredGame() {
    soundMgr.playSelect();
    terminateCurrentSession();

    if (this.selectedMode === 'scenario') {
      ScenarioManager.load();
      if (ScenarioManager.data.avatarId) {
        ScenarioManager.openMapScreen();
      } else {
        ScenarioManager.openAvatarSelectScreen();
      }
      return;
    }

    const mode = this.selectedMode;
    const isExchange = (this.selectedExchange === 'yes');
    const total = this.selectedGames;
    const playerChar = this.selectedPlayerCharId;
    const opponents = [...this.selectedOpponentIds];

    bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    MatchSeriesManager.startSeries(mode, isExchange, total, playerChar, opponents);
  }
};

/* ============================================================
 * 10. 連続マッチマネージャー (MatchSeriesManager)
 * ============================================================ */
const MatchSeriesManager = {
  isActive: false,
  mode: 'practice',
  enableCardExchange: true,
  totalGames: 10,
  currentGame: 1,
  playerCharId: 'DUKE',
  selectedOpponentIds: ['MARQUIS', 'COUNT', 'KNIGHT'],
  currentSeatRoster: [],
  roster: [],
  historyStats: {},
  rankHistory: [],
  stepLogs: [],
  nextMatchTimerId: null,

  init() {
    GameEventManager.on('gameEnd', (payload) => {
      if (this.isActive) {
        this.recordGameResult(payload.playerStatusMap);
        renderFinalRanking();

        if (this.currentGame >= this.totalGames) {
          SaveLoadManager.clearSaveData();
          this.showFinishModal();
        } else {
          SaveLoadManager.saveGameState(true, 'series_next_match');

          const promptEl = document.getElementById('next-game-prompt-text');
          const nextMatchBtnText = document.getElementById('next-match-btn-text');

          if (promptEl) {
            const exStr = this.enableCardExchange ? '（座席継続・カード交換あり）' : '（席替えシャッフル・直接配札）';
            promptEl.textContent = `第 ${this.currentGame} / ${this.totalGames} 試合が終了しました${exStr}。`;
          }
          if (nextMatchBtnText) {
            nextMatchBtnText.innerHTML = this.enableCardExchange
              ? '次の試合へ (座席継続・カード交換へ)'
              : '次の試合へ (席替えランダム・直接配札)';
          }

          renderNextGameInterimDashboard();

          const nModal = document.getElementById('next-game-modal');
          if (nModal) nModal.classList.add('active');

          if (isAutoPlayMode) {
            if (this.nextMatchTimerId) GameTimer.clear(this.nextMatchTimerId);
            const waitTime = Math.max(1800, 3000 / getSpeedMultiplier());
            this.nextMatchTimerId = GameTimer.set(() => {
              this.nextMatchTimerId = null;
              const modal = document.getElementById('next-game-modal');
              if (modal && modal.classList.contains('active')) {
                this.nextMatch();
              }
            }, waitTime);
          }
        }
      } else if (!ScenarioManager || !ScenarioManager.isActive) {
        renderFinalRanking();
        SaveLoadManager.clearSaveData();
        const nModal = document.getElementById('next-game-modal');
        if (nModal) nModal.classList.add('active');
      }
    });
  },

  startSeries(mode, enableExchange, totalGames, playerCharId, opponentIds) {
    this.isActive = true;
    if (typeof ScenarioManager !== 'undefined') ScenarioManager.isActive = false;
    this.mode = mode;
    this.enableCardExchange = enableExchange;
    enableCardExchange = enableExchange;
    this.totalGames = totalGames;
    this.currentGame = 1;
    this.playerCharId = playerCharId;
    this.selectedOpponentIds = [...opponentIds];
    this.roster = [playerCharId, ...opponentIds];
    this.stepLogs = [];
    this.historyStats = {};
    this.rankHistory = [];

    previousRanks = {};
    if (this.nextMatchTimerId) {
      GameTimer.clear(this.nextMatchTimerId);
      this.nextMatchTimerId = null;
    }

    isAutoPlayMode = (mode === 'auto');
    hasPlayerUsedAutoInMatch = false;
    isSpectatePaused = false;
    isProcessing = false;
    isExchangeTransitioning = false;

    if (mode === 'practice') {
      currentSpeed = 1;
      document.querySelectorAll('.btn-speed').forEach(b => b.classList.toggle('active', b.getAttribute('data-speed') === '1'));
    }

    this.roster.forEach(cid => {
      const def = CHARACTER_DEFS[cid];
      const isPlayer = (cid === this.playerCharId);
      this.historyStats[cid] = {
        id: cid,
        name: isPlayer ? (mode === 'auto' ? (def ? def.name : cid) : getPlayerDisplayName('player')) : (def ? def.name : cid),
        icon: isPlayer ? (mode === 'auto' ? (def ? def.icon : '👤') : '👤') : (def ? def.icon : '👤'),
        isPlayer: isPlayer && (mode === 'practice'),
        games: 0,
        df: 0, f: 0, h: 0, dh: 0,
        rankSum: 0
      };
    });

    document.getElementById('char-select-overlay').classList.remove('active');
    bgmMgr.setCharSelectPhase(false);
    bgmMgr.setBattleBaseSrc('bgm_normal.mp3');

    this.setupMatchRound(true);
  },

  setupMatchRound(isFirst = false) {
    if (this.nextMatchTimerId) {
      GameTimer.clear(this.nextMatchTimerId);
      this.nextMatchTimerId = null;
    }

    const pBadge = document.getElementById('practice-progress-badge');
    const pText = document.getElementById('practice-progress-text');
    const pIcon = document.getElementById('progress-mode-icon');
    if (pBadge && pText) {
      pBadge.classList.remove('is-hidden');
      pBadge.classList.remove('mode-badge-practice', 'mode-badge-auto', 'mode-badge-scenario');
      pBadge.classList.add(this.mode === 'auto' ? 'mode-badge-auto' : 'mode-badge-practice');

      const modeLabel = this.mode === 'auto' ? '観戦モード' : '練習モード';
      if (pIcon) pIcon.textContent = this.mode === 'auto' ? '🤖' : '⚔️';
      pText.textContent = `第 ${this.currentGame} / ${this.totalGames} 試合（${modeLabel}）`;
    }

    isAutoPlayMode = (this.mode === 'auto');
    if (this.mode !== 'auto') {
      hasPlayerUsedAutoInMatch = false;
      currentSpeed = 1;
      document.querySelectorAll('.btn-speed').forEach(b => b.classList.toggle('active', b.getAttribute('data-speed') === '1'));
    }
    isSpectatePaused = false;
    isProcessing = false;
    isExchangeTransitioning = false;

    const shouldShuffleSeats = isFirst || (!this.enableCardExchange);

    if (shouldShuffleSeats || this.currentSeatRoster.length === 0) {
      assignedCharacters.player = CHARACTER_DEFS[this.playerCharId];
      const shuffledCpuIds = shuffle([...this.selectedOpponentIds]);
      assignedCharacters.cpu1 = CHARACTER_DEFS[shuffledCpuIds[0]];
      assignedCharacters.cpu2 = CHARACTER_DEFS[shuffledCpuIds[1]];
      assignedCharacters.cpu3 = CHARACTER_DEFS[shuffledCpuIds[2]];

      this.currentSeatRoster = [
        this.playerCharId,
        shuffledCpuIds[0],
        shuffledCpuIds[1],
        shuffledCpuIds[2]
      ];
    } else {
      assignedCharacters.player = CHARACTER_DEFS[this.currentSeatRoster[0]];
      assignedCharacters.cpu1 = CHARACTER_DEFS[this.currentSeatRoster[1]];
      assignedCharacters.cpu2 = CHARACTER_DEFS[this.currentSeatRoster[2]];
      assignedCharacters.cpu3 = CHARACTER_DEFS[this.currentSeatRoster[3]];
    }

    updateCharacterUI();

    if (isFirst || !this.enableCardExchange) {
      previousRanks = {};
    }

    startNewGame();
  },

  recordStepLog(step) {
    if (!this.isActive) return;
    this.stepLogs.push({
      matchIndex: this.currentGame,
      totalGames: this.totalGames,
      mode: this.mode,
      ...step
    });
  },

  recordGameResult(statusMap) {
    const rankValues = { '大富豪': 1, '富豪': 2, '貧民': 3, '大貧民': 4 };
    const thisGameRanks = {};

    PLAYERS.forEach(p => {
      const charDef = assignedCharacters[p];
      if (!charDef) return;
      const cid = (p === 'player' && this.mode === 'practice') ? this.playerCharId : charDef.id;
      const r = statusMap[p];
      const rankNum = rankValues[r] || 4;

      thisGameRanks[cid] = rankNum;

      const s = this.historyStats[cid];
      if (s) {
        s.games++;
        s.rankSum += rankNum;
        if (r === '大富豪') s.df++;
        else if (r === '富豪') s.f++;
        else if (r === '貧民') s.h++;
        else if (r === '大貧民') s.dh++;
      }
    });

    this.rankHistory.push({
      gameIndex: this.currentGame,
      ranks: thisGameRanks
    });
  },

  nextMatch() {
    if (this.nextMatchTimerId) {
      GameTimer.clear(this.nextMatchTimerId);
      this.nextMatchTimerId = null;
    }
    const nModal = document.getElementById('next-game-modal');
    if (nModal) nModal.classList.remove('active');
    this.currentGame++;
    this.setupMatchRound(false);
  },

  getSortedResults() {
    const list = Object.values(this.historyStats).map(s => {
      const avg = s.games > 0 ? (s.rankSum / s.games).toFixed(2) : '-';
      const winRate = s.games > 0 ? ((s.df / s.games) * 100).toFixed(1) : '0.0';
      return { ...s, avg: avg, winRate: parseFloat(winRate) };
    });

    list.sort((a, b) => {
      const avgA = parseFloat(a.avg) || 99;
      const avgB = parseFloat(b.avg) || 99;
      if (avgA !== avgB) return avgA - avgB;
      return b.winRate - a.winRate;
    });

    return list;
  },

  showFinishModal() {
    const nextGameModal = document.getElementById('next-game-modal');
    if (nextGameModal) nextGameModal.classList.remove('active');

    const finishModal = document.getElementById('practice-finish-modal');
    const tableWrap = document.getElementById('practice-finish-table-wrap');
    const titleEl = document.getElementById('practice-finish-title');
    const subEl = document.getElementById('practice-finish-sub');
    const wImg = document.getElementById('practice-finish-winner-img');
    const wName = document.getElementById('practice-finish-winner-name');
    const wTitle = document.getElementById('practice-finish-winner-title');
    const winnerPlate = document.getElementById('practice-finish-winner-plate');

    if (!tableWrap) return;

    const modeStr = this.mode === 'auto' ? '観戦モード' : '練習モード';
    if (titleEl) titleEl.textContent = `🏆 ${modeStr} 総合決着 🏆`;
    if (subEl) subEl.textContent = `全 ${this.totalGames} 試合が終了しました！対戦ログは正常に記録されました。`;

    const list = this.getSortedResults();
    const champion = list[0] || { id: 'KING', name: '王 (King)' };

    if (winnerPlate) {
      winnerPlate.classList.remove('is-tier1-champion', 'is-tier3-champion');
      winnerPlate.classList.add('is-tier2-champion');
    }

    if (wImg) {
      const cImgSrc = (champion.isPlayer && typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive)
        ? ScenarioManager.getCurrentAvatar().image
        : (CHAR_IMAGES[champion.id] || 'fugo-絵柄/king.png');
      wImg.src = cImgSrc;
      wImg.onerror = () => { wImg.src = 'king.png'; };
    }

    if (wName) wName.textContent = champion.name;
    if (wTitle) wTitle.textContent = `${this.mode === 'auto' ? '🤖 SPECTATE' : '👑 TOURNAMENT'} CHAMPION`;

    document.querySelectorAll('.champion-particle').forEach(p => p.remove());
    ScenarioManager.spawnGoldParticles(finishModal, 2);
    soundMgr.playFanfare(2);

    ReplayManager.setupAvailableEpisodes();
    ReplayManager.generateSeriesMacroWarChronicle();
    const seriesStory = ReplayManager.seriesMacroSummary || '全試合の熱戦が終了しました。';

    let html = `
      <div style="background: rgba(10, 16, 26, 0.88); border: 1px solid rgba(212, 175, 55, 0.55); border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; text-align: left;">
        <div style="color: #ffd700; font-weight: bold; font-size: 12px; margin-bottom: 3px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 2px;">
          🏛️ 万象を統べる宮廷大占勝師のシリーズ総括評定（全 ${this.totalGames} 試合）
        </div>
        <div style="font-size: 11.5px; color: #fffadb; line-height: 1.4;">
          ${seriesStory}
        </div>
      </div>

      <table class="ranking-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">順位</th>
            <th>参加者</th>
            <th style="text-align: right;">平均順位</th>
            <th style="text-align: right;">大富豪率</th>
            <th style="text-align: center; white-space: nowrap !important; min-width: 102px;">大 / 富 / 貧 / 大貧</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach((item, idx) => {
      const rankBadge = `<span class="rank-num-badge rank-num-${idx + 1}">${idx + 1}</span>`;
      const isPlayer = item.isPlayer;
      const rowStyle = isPlayer ? ' style="background: rgba(212,175,55,0.18); font-weight: bold;"' : '';
      const avatarEl = `<img src="${CHAR_IMAGES[item.id] || 'fugo-絵柄/king.png'}" onerror="this.onerror=null; this.src='${item.id.toLowerCase()}.png';" style="width: 20px; aspect-ratio: 2/3; border-radius: 3px; border: 1px solid rgba(212,175,55,0.4);" alt="">`;
      const displayName = isPlayer ? getPlayerDisplayName('player', true) : `${item.icon} ${item.name}`;
      const foulSuffix = (typeof foulPlayers !== 'undefined' && foulPlayers[isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)]) ? ` <span class="foul-badge">(${foulPlayers[isPlayer ? 'player' : PLAYERS.find(pl => assignedCharacters[pl]?.id === item.id)]})</span>` : '';

      html += `
        <tr${rowStyle}>
          <td style="text-align: center;">${rankBadge}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              ${avatarEl}
              <span style="color: ${isPlayer ? '#fff3a8' : '#e0e6ed'};">${displayName}</span>
            </div>
          </td>
          <td style="text-align: right; color: #ffd700; font-weight: 800;">${item.avg}位</td>
          <td style="text-align: right; color: #fff3a8;">${item.winRate}%</td>
          <td style="text-align: center; white-space: nowrap !important;">
            ${renderRankCountBadges(item.df, item.f, item.h, item.dh)}${foulSuffix}
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    tableWrap.innerHTML = html;

    const msgEl = document.getElementById('practice-save-status-msg');
    if (msgEl) msgEl.classList.add('is-hidden');

    updateFullscreenButtonsUI();
    if (finishModal) finishModal.classList.add('active');

    setTimeout(() => {
      renderSharedRankChart(
        document.getElementById('practice-finish-chart'),
        document.getElementById('practice-finish-chart-legend'),
        this.rankHistory,
        this.totalGames,
        this.playerCharId,
        this.selectedOpponentIds,
        false
      );
    }, 60);
  },

  showStatusMessage(text) {
    const msgEl = document.getElementById('practice-save-status-msg');
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.classList.remove('is-hidden');
    setTimeout(() => {
      if (msgEl) msgEl.classList.add('is-hidden');
    }, 4500);
  },

  copyResultsSummary() {
    const list = this.getSortedResults();
    let text = `【ROYAL DAIFUGO ${this.mode === 'auto' ? '観戦' : '練習'}結果（全${this.totalGames}試合）】\n`;
    list.forEach((item, idx) => {
      text += `${idx + 1}位: ${item.name} (平均 ${item.avg}位 / 大富豪:${item.df} 富豪:${item.f} 貧民:${item.h} 大貧民:${item.dh})\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = document.getElementById('btn-copy-practice-summary');
      if (copyBtn) {
        const orig = copyBtn.textContent;
        copyBtn.textContent = '✅ コピー完了！';
        setTimeout(() => copyBtn.textContent = orig, 2200);
      }
      this.showStatusMessage('📋 試合結果サマリーをクリップボードにコピーしました！');
    }).catch(() => {
      prompt('結果テキストをコピーしてください:', text);
    });
  },

  async downloadResultsCsv() {
    const list = this.getSortedResults();
    let csv = '順位,キャラクター名,平均順位,大富豪率(%),大富豪,富豪,貧民,大貧民\n';
    list.forEach((item, idx) => {
      csv += `${idx + 1},"${item.name}",${item.avg},${item.winRate},${item.df},${item.f},${item.h},${item.dh}\n`;
    });

    const fileName = `match_ranking_${this.mode}_${this.totalGames}games_${getFormattedTimestamp()}.csv`;
    const bomCsv = '\uFEFF' + csv;

    if (AIStatusUI.isServerOnline) {
      try {
        const res = await fetch(CONFIG.PYTHON_SAVE_LOG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileName, content: bomCsv })
        });
        if (res.ok) {
          const csvBtn = document.getElementById('btn-download-practice-csv');
          if (csvBtn) {
            const orig = csvBtn.textContent;
            csvBtn.textContent = '✅ PC保存完了！';
            setTimeout(() => csvBtn.textContent = orig, 2500);
          }
          this.showStatusMessage(`📊 PC側の logs/ フォルダに直接保存しました！ (${fileName}) ※全画面維持`);
          updateFullscreenButtonsUI();
          return;
        }
      } catch (err) {}
    }

    AIDataLogger.downloadFile(bomCsv, fileName, 'text/csv;charset=utf-8');
    this.showStatusMessage(`📊 成績表CSV（${fileName}）を保存しました！`);
  },

  async downloadLogs() {
    if (this.stepLogs.length === 0) {
      alert('保存可能な対戦ログがありません。');
      return;
    }

    const rankValues = { '大富豪': 1, '富豪': 2, '貧民': 3, '大貧民': 4 };
    const currentRanks = {};
    PLAYERS.forEach((p, idx) => {
      currentRanks[idx + 1] = rankValues[playerStatusMap[p]] || 4;
    });

    this.stepLogs.forEach(st => {
      if (st.finalRank === null && st.seat) {
        st.finalRank = currentRanks[st.seat] || 4;
        st.allSeatsFinalRank = { ...currentRanks };
      }
    });

    const jsonl = this.stepLogs.map(s => JSON.stringify(s)).join('\n');
    const fileName = `match_log_${this.mode}_${this.totalGames}games_${getFormattedTimestamp()}.jsonl`;

    if (AIStatusUI.isServerOnline) {
      try {
        const res = await fetch(CONFIG.PYTHON_SAVE_LOG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileName, content: jsonl })
        });
        if (res.ok) {
          const dlBtn = document.getElementById('btn-download-practice-jsonl');
          if (dlBtn) {
            const orig = dlBtn.innerHTML;
            dlBtn.innerHTML = '✅ PCへ直接保存完了！';
            setTimeout(() => dlBtn.innerHTML = orig, 2500);
          }
          this.showStatusMessage(`💾 PC側の logs/ フォルダに直接保存しました！ (${fileName}) ※全画面維持`);
          updateFullscreenButtonsUI();
          return;
        }
      } catch (err) {}
    }

    AIDataLogger.downloadFile(jsonl, fileName, 'application/x-ndjson;charset=utf-8');
    this.showStatusMessage(`📥 打牌ログ（${fileName}）を正常に保存しました！`);
  },

  closeAndEnd() {
    soundMgr.playDeselect();

    const finishModal = document.getElementById('practice-finish-modal');
    if (finishModal) finishModal.classList.remove('active');

    if (this.nextMatchTimerId) {
      GameTimer.clear(this.nextMatchTimerId);
      this.nextMatchTimerId = null;
    }

    previousRanks = {};

    terminateCurrentSession();
    this.isActive = false;

    const pBadge = document.getElementById('practice-progress-badge');
    if (pBadge) pBadge.classList.add('is-hidden');

    bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
    bgmMgr.setCharSelectPhase(true);
    document.getElementById('char-select-overlay').classList.add('active');
    updateFullscreenButtonsUI();
  }
};
MatchSeriesManager.init();

/* ============================================================
 * 11. オートセーブ＆復元マネージャー (SaveLoadManager)
 * ============================================================ */
const SaveLoadManager = {
  SAVE_KEY: 'royalDaifugoSaveData_v3',
  autoSaveTimer: null,

  showAutoSaveNotification() {
    const badge = document.getElementById('auto-save-badge');
    if (!badge) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);

    badge.classList.add('show');
    this.autoSaveTimer = setTimeout(() => {
      badge.classList.remove('show');
    }, 1100);
  },

  saveGameState(isAutoTrigger = false, triggerAgent = 'player') {
    if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) return false;

    const isMatchSeries = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive);
    if (typeof gameEnded !== 'undefined' && gameEnded && !isMatchSeries) return false;

    const currentTurnCount = AIDataLogger ? AIDataLogger.currentTurnCount : 1;

    const cleanHands = {};
    PLAYERS.forEach(p => {
      cleanHands[p] = (hands[p] || []).map(c => ({
        suitSymbol: normalizeCardSuit(c),
        suitClass: c.suitClass || '',
        display: normalizeCardRank(c),
        rank: normalizeCardRank(c),
        isJoker: !!c.isJoker || normalizeCardRank(c) === 'JOKER',
        jokerId: c.jokerId || null
      }));
    });

    const cleanField = (fieldCards || []).map(c => ({
      suitSymbol: normalizeCardSuit(c),
      suitClass: c.suitClass || '',
      display: normalizeCardRank(c),
      rank: normalizeCardRank(c),
      isJoker: !!c.isJoker || normalizeCardRank(c) === 'JOKER',
      jokerId: c.jokerId || null
    }));

    const cleanAssigned = {};
    PLAYERS.forEach(p => {
      const def = assignedCharacters[p];
      if (def) cleanAssigned[p] = { id: def.id, name: def.name, icon: def.icon };
    });

    let matchData = null;
    if (isMatchSeries) {
      matchData = {
        mode: MatchSeriesManager.mode,
        currentGame: MatchSeriesManager.currentGame,
        totalGames: MatchSeriesManager.totalGames,
        enableCardExchange: MatchSeriesManager.enableCardExchange,
        playerCharId: MatchSeriesManager.playerCharId,
        selectedOpponentIds: [...MatchSeriesManager.selectedOpponentIds],
        currentSeatRoster: [...MatchSeriesManager.currentSeatRoster],
        roster: [...MatchSeriesManager.roster],
        historyStats: MatchSeriesManager.historyStats,
        rankHistory: MatchSeriesManager.rankHistory || []
      };
    }

    const saveData = {
      version: APP_VERSION,
      timestamp: Date.now(),
      isAutoPlayMode: typeof isAutoPlayMode !== 'undefined' ? isAutoPlayMode : false,
      enableCardExchange: typeof enableCardExchange !== 'undefined' ? enableCardExchange : true,
      forbiddenFinishAlert: (typeof GAME_SETTINGS !== 'undefined' && GAME_SETTINGS.forbiddenFinishAlert !== undefined) ? GAME_SETTINGS.forbiddenFinishAlert : true,
      agent: triggerAgent,
      turnCount: currentTurnCount,
      currentSpeed: typeof currentSpeed !== 'undefined' ? currentSpeed : 1,
      hands: cleanHands,
      playerPassCounts: { ...playerPassCounts },
      hasPassedInRound: { ...hasPassedInRound },
      fieldCards: cleanField,
      lastPlayedPlayer: lastPlayedPlayer,
      currentTurnIndex: currentTurnIndex,
      consecutivePasses: consecutivePasses,
      finishedPlayers: [...finishedPlayers],
      playerStatusMap: { ...playerStatusMap },
      previousRanks: { ...previousRanks },
      isRevolution: !!isRevolution,
      isElevenBack: !!isElevenBack,
      isExchangePhase: !!isExchangePhase,
      isPreExchangePhase: !!isPreExchangePhase,
      requiredExchangeCount: requiredExchangeCount,
      assignedCharacters: cleanAssigned,
      gameEnded: !!gameEnded,
      isMatchSeries: isMatchSeries,
      matchSeriesData: matchData
    };

    try {
      const serialized = JSON.stringify(saveData);
      localStorage.setItem(this.SAVE_KEY, serialized);

      if (isAutoTrigger) {
        this.showAutoSaveNotification();
      }
      this.updateLoadButtonState();
      return true;
    } catch (e) {
      console.warn('⚠️ [Storage Retry] 容量確保を試みます:', e.message);
      try {
        localStorage.removeItem('royalManualStepsLogs_v2');
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
        this.updateLoadButtonState();
        return true;
      } catch (err2) {
        console.error('❌ [CRITICAL SAVE ERROR]', err2);
        return false;
      }
    }
  },

  hasSaveData() {
    try {
      return !!localStorage.getItem(this.SAVE_KEY);
    } catch {
      return false;
    }
  },

  getSaveDataSummary() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const isMatch = !!data.isMatchSeries;
      const turn = data.turnCount || 1;
      const mData = data.matchSeriesData;
      return {
        isMatch: isMatch,
        mode: mData ? mData.mode : (data.isAutoPlayMode ? 'auto' : 'practice'),
        currentGame: mData ? mData.currentGame : 1,
        totalGames: mData ? mData.totalGames : 10,
        turn: turn
      };
    } catch {
      return null;
    }
  },

  clearSaveData() {
    localStorage.removeItem(this.SAVE_KEY);
    this.updateLoadButtonState();
  },

  loadGameState(isAutoResume = false) {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) {
        if (!isAutoResume) alert('セーブデータが見つかりません。');
        return false;
      }
      const data = JSON.parse(raw);
      GameTimer.clearAll();
      isProcessing = false;

      document.querySelectorAll('.card-play-anim').forEach(c => c.remove());
      const fCardsEl = document.getElementById('field-cards');
      if (fCardsEl) fCardsEl.classList.remove('clear-animation');

      const isMatch = !!data.isMatchSeries && !!data.matchSeriesData;

      isAutoPlayMode = (data.isAutoPlayMode !== undefined) ? !!data.isAutoPlayMode : false;
      hasPlayerUsedAutoInMatch = isAutoPlayMode;
      enableCardExchange = (data.enableCardExchange !== undefined) ? !!data.enableCardExchange : true;

      if (data.forbiddenFinishAlert !== undefined && typeof GAME_SETTINGS !== 'undefined') {
        GAME_SETTINGS.forbiddenFinishAlert = !!data.forbiddenFinishAlert;
        const onBtn = document.getElementById('btn-forbidden-assist-on');
        const offBtn = document.getElementById('btn-forbidden-assist-off');
        if (onBtn && offBtn) {
          onBtn.classList.toggle('active', GAME_SETTINGS.forbiddenFinishAlert);
          offBtn.classList.toggle('active', !GAME_SETTINGS.forbiddenFinishAlert);
        }
      }

      const isSpectateSeries = isMatch && data.matchSeriesData.mode === 'auto';
      if (!isAutoPlayMode && !isSpectateSeries) {
        currentSpeed = 1;
      } else {
        currentSpeed = data.currentSpeed || 1;
      }

      hands = data.hands || { player: [], cpu1: [], cpu2: [], cpu3: [] };
      playerPassCounts = data.playerPassCounts || { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };
      hasPassedInRound = data.hasPassedInRound || { player: false, cpu1: false, cpu2: false, cpu3: false };
      fieldCards = data.fieldCards || [];
      lastPlayedPlayer = data.lastPlayedPlayer || null;
      currentTurnIndex = data.currentTurnIndex || 0;
      consecutivePasses = data.consecutivePasses || 0;
      finishedPlayers = data.finishedPlayers || [];
      playerStatusMap = data.playerStatusMap || {};
      previousRanks = data.previousRanks || {};

      isRevolution = !!data.isRevolution;
      isElevenBack = !!data.isElevenBack;
      isExchangePhase = !!data.isExchangePhase;
      isPreExchangePhase = !!data.isPreExchangePhase;
      isExchangeTransitioning = false;
      requiredExchangeCount = data.requiredExchangeCount || 0;
      pendingReceivedCards = [];
      pendingForbiddenConfirmation = false;
      foulPlayers = {};

      playedCardsHistory = [];
      currentRoundCards = [];
      clearedCardsHistory = [];
      cpuCooldowns = { cpu1: 0, cpu2: 0, cpu3: 0 };
      selectedIndices = [];
      gameEnded = !!data.gameEnded;

      assignedCharacters = {};
      PLAYERS.forEach(p => {
        const savedChar = data.assignedCharacters ? data.assignedCharacters[p] : null;
        if (savedChar && CHARACTER_DEFS[savedChar.id]) {
          assignedCharacters[p] = CHARACTER_DEFS[savedChar.id];
        } else {
          assignedCharacters[p] = CHARACTER_DEFS.KING;
        }
      });

      const pBadge = document.getElementById('practice-progress-badge');
      const pText = document.getElementById('practice-progress-text');
      const pIcon = document.getElementById('progress-mode-icon');
      const autoBtn = document.getElementById('auto-play-btn');

      if (isMatch && typeof MatchSeriesManager !== 'undefined') {
        MatchSeriesManager.isActive = true;
        MatchSeriesManager.mode = data.matchSeriesData.mode || (isAutoPlayMode ? 'auto' : 'practice');
        MatchSeriesManager.currentGame = data.matchSeriesData.currentGame;
        MatchSeriesManager.totalGames = data.matchSeriesData.totalGames;
        MatchSeriesManager.enableCardExchange = data.matchSeriesData.enableCardExchange;
        MatchSeriesManager.playerCharId = data.matchSeriesData.playerCharId;
        MatchSeriesManager.selectedOpponentIds = data.matchSeriesData.selectedOpponentIds || [];
        MatchSeriesManager.currentSeatRoster = data.matchSeriesData.currentSeatRoster || [];
        MatchSeriesManager.roster = data.matchSeriesData.roster || [];
        MatchSeriesManager.historyStats = data.matchSeriesData.historyStats || {};
        MatchSeriesManager.rankHistory = data.matchSeriesData.rankHistory || [];

        if (pBadge && pText) {
          pBadge.classList.remove('is-hidden');
          pBadge.classList.remove('mode-badge-practice', 'mode-badge-auto', 'mode-badge-scenario');
          pBadge.classList.add(MatchSeriesManager.mode === 'auto' ? 'mode-badge-auto' : 'mode-badge-practice');

          const modeLabel = MatchSeriesManager.mode === 'auto' ? '観戦モード' : '練習モード';
          if (pIcon) pIcon.textContent = MatchSeriesManager.mode === 'auto' ? '🤖' : '⚔️';
          pText.textContent = `第 ${MatchSeriesManager.currentGame} / ${MatchSeriesManager.totalGames} 試合（${modeLabel}）`;
        }
      } else {
        if (typeof MatchSeriesManager !== 'undefined') MatchSeriesManager.isActive = false;
        if (pBadge) pBadge.classList.add('is-hidden');
      }

      if (autoBtn) {
        const isSpectate = (isMatch && MatchSeriesManager.mode === 'auto');
        if (isSpectate) {
          autoBtn.textContent = '⏸ 一時停止';
          autoBtn.classList.remove('btn-gold-active', 'active', 'btn-paused');
        } else {
          autoBtn.textContent = isAutoPlayMode ? '🤖 代行: ON' : '🤖 代行: OFF';
          autoBtn.classList.toggle('btn-gold-active', isAutoPlayMode);
        }
      }

      if (fieldCards.length > 0 && fieldCards.some(c => normalizeCardRank(c) === '8')) {
        fieldCards = [];
        consecutivePasses = 0;
      }

      const speedControls = document.getElementById('speed-controls');
      if (speedControls) {
        if (isSpectateSeries) {
          speedControls.classList.remove('is-hidden');
        } else {
          speedControls.classList.add('is-hidden');
        }
      }

      document.querySelectorAll('.btn-speed').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-speed') === String(currentSpeed));
      });

      updateCharacterUI();
      updateStatusUI();
      bgmMgr.setCharSelectPhase(false);
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      bgmMgr.update(isRevolution, isElevenBack);

      document.getElementById('char-select-overlay').classList.remove('active');
      render(true);

      const resumeTurn = data.turnCount || 1;
      const msgBox = document.getElementById('message-text');
      if (msgBox) {
        msgBox.innerHTML = `● 前回の対局（第${resumeTurn}手）から再開しました`;
        msgBox.classList.add('message-resume-active');
        setTimeout(() => msgBox.classList.remove('message-resume-active'), 2500);
      }

      soundMgr.playWin();

      if (gameEnded && isMatch) {
        renderFinalRanking();
        const promptEl = document.getElementById('next-game-prompt-text');
        const nextMatchBtnText = document.getElementById('next-match-btn-text');
        if (promptEl) {
          const exStr = MatchSeriesManager.enableCardExchange ? '（座席継続・カード交換あり）' : '（席替えシャッフル・直接配札）';
          promptEl.textContent = `第 ${MatchSeriesManager.currentGame} / ${MatchSeriesManager.totalGames} 試合が終了しました${exStr}。`;
        }
        if (nextMatchBtnText) {
          nextMatchBtnText.innerHTML = MatchSeriesManager.enableCardExchange
            ? '次の試合へ (座席継続・カード交換へ)'
            : '次の試合へ (席替えランダム・直接配札)';
        }

        renderNextGameInterimDashboard();
        const nModal = document.getElementById('next-game-modal');
        if (nModal) nModal.classList.add('active');
      } else if (isPreExchangePhase) {
        setMessage('カードが配られました。下の「カード交換へ」を押してください。');
        if (isAutoPlayMode) proceedToExchange();
      } else if (isExchangePhase) {
        if (PLAYERS[currentTurnIndex] === 'player') {
          setMessage('【カード交換】手札から渡すカードを選んで交換決定を押してください。');
        }
      } else {
        setMessage(PLAYERS[currentTurnIndex] === 'player' ? `${getPlayerDisplayName('player')}の順番です。出すカードを選んでください。` : `${getPlayerDisplayName(PLAYERS[currentTurnIndex])}の順番です。`);
        checkTurn();
      }

      return true;
    } catch (e) {
      console.error('⚠️ [LOAD FAILED]', e);
      if (!isAutoResume) alert('セーブデータの読み込みに失敗しました。');
      return false;
    }
  },

  updateLoadButtonState() {
    const loadBtn = document.getElementById('btn-load-game');
    const loadBtnText = document.getElementById('btn-load-game-text');
    if (!loadBtn) return;
    const hasData = this.hasSaveData();
    loadBtn.disabled = !hasData;

    if (hasData) {
      const summary = this.getSaveDataSummary();
      let modeInfo = '';
      if (summary) {
        if (summary.isMatch) {
          const mLabel = summary.mode === 'auto' ? '観戦' : '練習';
          modeInfo = ` (${mLabel} 第${summary.currentGame}/${summary.totalGames}試合)`;
        } else {
          modeInfo = ` (通常 第${summary.turn}手)`;
        }
      }
      if (loadBtnText) loadBtnText.textContent = `前回の続きから再開${modeInfo}`;
    } else {
      if (loadBtnText) loadBtnText.textContent = '前回の続きから再開 (セーブデータなし)';
    }
  }
};

/* ============================================================
 * 11.5 統合オープニングマネージャー (OpeningManager)
 * ★全画面モード維持・優美3Dカルーセル＆確実な音楽開始制御
 * ============================================================ */
const OpeningManager = {
  STORAGE_KEY: 'royalLastOpeningSeenTime',
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
  currentStep: 0,
  totalSteps: 5,
  autoTimer: null,
  carouselTimer: null,
  bgmAudio: null,
  isAudioPlaying: false,
  hasRequestedFullscreen: false,
  isOpen: false,

  SCRIPT_DATA: {
    1: [
      { role: "勝機まで牙を隠す、重鎮の温存術", quote: "焦るな……最強の札は、最後に切るものだ。" },
      { role: "王者の威厳・冷徹なる盤面支配", quote: "我が宮廷の掟、容易く破れると思うなよ。" },
      { role: "愚直一徹・最弱札からの正攻法", quote: "小細工はいらぬ！弱い札から正々堂々と攻めるのみ！" },
      { role: "優雅なるパス・無駄な消耗の回避", quote: "無理な小競り合いは美しくない。ここは引かせていただくよ。" },
      { role: "算盤の駆け引き・鉄壁のペア構築", quote: "札は単発で捨てちゃ損。ペアで揃えてこそ価値が出るのさ！" },
      { role: "天地逆転・一撃必殺の革命魔", quote: "強者が勝つ時代は終わりだ……すべてをひっくり返してやる！" }
    ],
    2: [
      { role: "次代を担う俊英・電光石火の読み", quote: "父上の時代は終わった。この盤面、僕が支配してみせる！" },
      { role: "宮廷政治の真髄・冷徹な手札管理", quote: "あなたの手札、すべてお見通しよ。無駄なあがきはおやめなさい。" },
      { role: "深謀遠慮・場に出た札の完全記録", quote: "あの札がもう出尽くしたなら……私の勝ち筋はここにある。" },
      { role: "絶望を超越せし、王族最強の到達点", quote: "幾多の敗北を越えてきた。貴様の次の一手、すべて看破したぞ。" }
    ],
    3: [
      { role: "あなたの分身・華麗なる支配", isHero: false, quote: "ふふ、そんな熱い視線を向けられたら……全部奪いたくなっちゃうわ。" },
      { role: "あなたの分身・若き天才の知謀", isHero: false, quote: "盤面を支配する理は、僕の手の中にある。" },
      { role: "あなたの分身・底知れぬ直感", isHero: false, quote: "カードの声が聞こえる……あなたの次の一手もね。" },
      { role: "あなたの分身・百戦錬磨の勝負勘", isHero: false, quote: "小細工はいらねぇ。修羅場をくぐった数がモノを言うのさ。" },
      { role: "立ちはだかる覇王・天下布武の連打", isHero: true, quote: "8切りで親を奪い、一気に畳み掛ける！天下を獲る札は揃うた！" },
      { role: "神話の頂点・原初の英雄王", isHero: true, quote: "上がりを狙うなど片腹痛い！王の宝物庫の前にひれ伏すがよい！" },
      { role: "法家統制・徹底した手札圧縮", isHero: true, quote: "法に従い整然と札を刈り取る。天下統一の盤面を見よ。" },
      { role: "完全傾聴・大調和カウンター", isHero: true, quote: "和を以て貴しと為す……だがジョーカー単騎には容赦せぬ。" },
      { role: "不敗の重装ファランクス進軍", isHero: true, quote: "我が進軍を遮る壁などない！最短の手数で駆け抜けてみせよう！" }
    ]
  },

  trackPointers: { 1: 1, 2: 1, 3: 1 },

  checkShouldAutoPlay() {
    try {
      const lastSeen = localStorage.getItem(this.STORAGE_KEY);
      const now = Date.now();
      if (!lastSeen || (now - parseInt(lastSeen, 10) > this.ONE_WEEK_MS)) {
        return true;
      }
    } catch (e) {}
    return false;
  },

  initOpening() {
    this.createGoldSpecks();
    this.setupEvents();

    if (this.checkShouldAutoPlay()) {
      this.openOpening();
    }
  },

  openOpening() {
    this.isOpen = true;
    this.currentStep = 0;
    this.hasRequestedFullscreen = false;

    const screen = document.getElementById('screen-opening');
    if (screen) {
      screen.classList.remove('is-hidden');
    }

    if (bgmMgr) {
      bgmMgr.setCharSelectPhase(false);
      bgmMgr.audioA.pause();
      bgmMgr.audioB.pause();
    }

    this.renderStep(0);
  },

  startBgm() {
    if (this.isAudioPlaying) return;
    if (isSoundMuted) return;

    if (!this.bgmAudio) {
      this.bgmAudio = new Audio();
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.55;
      this.bgmAudio.src = 'bgm_opening.mp3';

      this.bgmAudio.play().then(() => {
        this.isAudioPlaying = true;
        this.updatePrompt();
      }).catch(err => {
        console.warn('初回BGM自動再生ブロック（ユーザー操作待機）:', err);
      });
    } else {
      this.bgmAudio.play().then(() => {
        this.isAudioPlaying = true;
        this.updatePrompt();
      }).catch(() => {});
    }
  },

  tryFullscreen() {
    if (this.hasRequestedFullscreen) return;
    this.hasRequestedFullscreen = true;
    try {
      const docEl = document.documentElement;
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (req && !isFullscreenActive()) {
        req.call(docEl).catch(() => {});
      }
    } catch (e) {}
  },

  createGoldSpecks() {
    const box = document.getElementById('opening-stage-box');
    if (!box) return;
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('div');
      s.className = 'gold-speck';
      const sz = Math.floor(Math.random() * 5) + 3;
      s.style.width = `${sz}px`;
      s.style.height = `${sz}px`;
      s.style.left = `${Math.random() * 98}%`;
      s.style.animationDuration = `${(Math.random() * 3 + 3.8)}s`;
      s.style.animationDelay = `${(Math.random() * 4)}s`;
      box.appendChild(s);
    }
  },

  shiftCarousel(actId) {
    const rail = document.getElementById(`rail-act-${actId}`);
    if (!rail) return;
    const cards = rail.querySelectorAll('.plaque-box');
    const total = cards.length;
    if (total < 3) return;

    this.trackPointers[actId] = (this.trackPointers[actId] + 1) % total;
    const center = this.trackPointers[actId];
    const left = (center - 1 + total) % total;
    const right = (center + 1) % total;

    cards.forEach((card, idx) => {
      card.classList.remove('pos-left', 'pos-center', 'pos-right', 'pos-back');
      if (idx === center) card.classList.add('pos-center');
      else if (idx === left) card.classList.add('pos-left');
      else if (idx === right) card.classList.add('pos-right');
      else card.classList.add('pos-back');
    });

    const dataArr = this.SCRIPT_DATA[actId];
    if (dataArr && dataArr[center]) {
      const rEl = document.getElementById(`role-act-${actId}`);
      const qEl = document.getElementById(`quote-act-${actId}`);
      if (rEl && qEl) {
        rEl.style.opacity = '0';
        qEl.style.opacity = '0';
        setTimeout(() => {
          rEl.textContent = dataArr[center].role;
          if (dataArr[center].isHero) rEl.classList.add('hero-rival');
          else rEl.classList.remove('hero-rival');
          qEl.textContent = dataArr[center].quote;
          rEl.style.opacity = '1';
          qEl.style.opacity = '1';
        }, 220);
      }
    }
  },

  launchCarousel(actId) {
    this.stopCarousel();
    if (actId < 1 || actId > 3) return;
    this.carouselTimer = setInterval(() => {
      this.shiftCarousel(actId);
    }, 4800);
  },

  stopCarousel() {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  },

  updatePrompt() {
    const pr = document.getElementById('opening-guide-text');
    if (!pr) return;
    if (this.currentStep === 4) {
      pr.textContent = '👑 入城するかタップで最初へ ↺';
    } else if (!this.isAudioPlaying) {
      pr.textContent = 'タップして開宴 ＆ 次へ ▼';
    } else {
      pr.textContent = 'TAP / クリックで進む ▼';
    }
  },

  renderStep(idx) {
    if (idx < 0 || idx >= this.totalSteps) return;
    this.currentStep = idx;

    for (let i = 0; i < this.totalSteps; i++) {
      const sc = document.getElementById(`opening-act-${i}`);
      if (sc) sc.classList.toggle('active', i === this.currentStep);
    }

    const dots = document.querySelectorAll('.opening-dot-item');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentStep);
    });

    if (this.currentStep >= 1 && this.currentStep <= 3) {
      this.launchCarousel(this.currentStep);
    } else {
      this.stopCarousel();
    }

    this.updatePrompt();
    this.scheduleNext();
  },

  advanceStep() {
    this.startBgm();
    this.tryFullscreen();
    if (this.currentStep < this.totalSteps - 1) {
      this.renderStep(this.currentStep + 1);
    } else {
      this.renderStep(0);
    }
  },

  scheduleNext() {
    if (this.autoTimer) clearTimeout(this.autoTimer);
    let wait = 11000;
    if (this.currentStep === 0) wait = 9000;
    else if (this.currentStep === 4) wait = 12000;
    this.autoTimer = setTimeout(() => this.advanceStep(), wait);
  },

  exitToGame() {
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.stopCarousel();
    this.isOpen = false;

    try {
      localStorage.setItem(this.STORAGE_KEY, String(Date.now()));
    } catch (e) {}

    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch (e) {}
    }
    this.isAudioPlaying = false;

    const screen = document.getElementById('screen-opening');
    if (screen) {
      screen.classList.add('is-hidden');
    }

    updateFullscreenButtonsUI();

    if (bgmMgr && !isSoundMuted) {
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      bgmMgr.setCharSelectPhase(true);
    }
  },

  setupEvents() {
    const box = document.getElementById('opening-stage-box');
    if (box) {
      box.addEventListener('click', (e) => {
        if (!this.isOpen) return;
        if (e.target && (e.target.id === 'btn-enter-palace' || e.target.closest('#btn-enter-palace'))) return;
        if (e.target.closest('.plaque-box')) {
          e.stopPropagation();
          this.startBgm();
          this.tryFullscreen();
          if (this.currentStep >= 1 && this.currentStep <= 3) {
            this.shiftCarousel(this.currentStep);
            this.launchCarousel(this.currentStep);
          }
          return;
        }
        this.advanceStep();
      });
    }

    const btnSkip = document.getElementById('btn-skip-gate');
    if (btnSkip) {
      btnSkip.addEventListener('click', (e) => {
        e.stopPropagation();
        soundMgr.playSelect();
        this.exitToGame();
      });
    }

    const btnEnter = document.getElementById('btn-enter-palace');
    if (btnEnter) {
      btnEnter.addEventListener('click', (e) => {
        e.stopPropagation();
        soundMgr.playWin();
        this.exitToGame();
      });
    }

    const startPrompt = document.getElementById('opening-start-prompt');
    if (startPrompt) {
      startPrompt.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startBgm();
        this.tryFullscreen();
        this.advanceStep();
      });
    }

    const dots = document.querySelectorAll('.opening-dot-item');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startBgm();
        this.tryFullscreen();
        const target = parseInt(dot.getAttribute('data-step'), 10);
        this.renderStep(target);
      });
    });

    const prologueBtn = document.getElementById('btn-open-prologue');
    if (prologueBtn) {
      prologueBtn.onclick = () => {
        soundMgr.playSelect();
        this.openOpening();
      };
    }

    document.addEventListener('visibilitychange', () => {
      if (!this.isOpen) return;
      if (document.hidden) {
        if (this.autoTimer) clearTimeout(this.autoTimer);
        this.stopCarousel();
        if (this.bgmAudio) { try { this.bgmAudio.pause(); } catch (e) {} }
      } else {
        this.scheduleNext();
        if (this.currentStep >= 1 && this.currentStep <= 3) this.launchCarousel(this.currentStep);
        if (this.bgmAudio && this.isAudioPlaying && !isSoundMuted) {
          try { this.bgmAudio.play(); } catch (e) {}
        }
      }
    });
  }
};

/* ====================================================================
 * 【main.js 後半（完全修復版・パート1） 終了地点】
 * 次の結合先：「12. イベントリスナー初期化 ＆ アプリ起動」
 * ==================================================================== */
/* ====================================================================
 * ROYAL DAIFUGO - main.js 【後半（完全修復版・パート2）】
 * [Version: v4.0.0 - 統合オープニング完全制御＆BGM調和・リプレイ客観表示版]
 * ※「12. イベントリスナー初期化 ＆ アプリ起動」の開始から
 *   ファイル末尾（最後まで）を出力します。
 * 【パート1の直下にそのまま貼り付けるだけで構文エラーなく結合可能】
 * ==================================================================== */

/* ============================================================
 * 12. イベントリスナー初期化 ＆ アプリ起動
 * ============================================================ */
function initEvents() {
  if (window._hasInitEvents) return;
  window._hasInitEvents = true;

  const rulesPanel = document.getElementById('rules-panel');
  const ruleModal = document.getElementById('rule-modal');
  const charModal = document.getElementById('char-modal');
  const statsModal = document.getElementById('stats-modal');
  const evalModal = document.getElementById('eval-modal');
  const nextGameModal = document.getElementById('next-game-modal');
  const versionModal = document.getElementById('version-modal');
  const logViewerModal = document.getElementById('log-viewer-modal');
  const debugLogModal = document.getElementById('debug-log-modal');
  const practiceInterimModal = document.getElementById('practice-interim-modal');
  const replayModal = document.getElementById('replay-modal');

  const aiOrbBtn = document.getElementById('ai-status-orb');
  const debugBtn = document.getElementById('debug-log-btn');
  if (aiOrbBtn) aiOrbBtn.onclick = openDebugLogModal;
  if (debugBtn) debugBtn.onclick = openDebugLogModal;

  const loadBtn = document.getElementById('btn-load-game');
  if (loadBtn) {
    loadBtn.onclick = () => {
      soundMgr.playSelect();
      SaveLoadManager.loadGameState();
    };
  }

  const startMatchBtn = document.getElementById('btn-start-configured-match');
  if (startMatchBtn) {
    startMatchBtn.onclick = () => {
      StartSetupManager.startConfiguredGame();
    };
  }

  const randomOppBtn = document.getElementById('btn-opponents-random');
  if (randomOppBtn) {
    randomOppBtn.onclick = () => {
      StartSetupManager.pickRandomOpponents();
    };
  }

  const replayBtnNormal = document.getElementById('btn-open-replay-normal');
  const replayBtnPractice = document.getElementById('btn-open-replay-practice');
  const replayBtnScenario = document.getElementById('btn-open-replay-scenario');
  if (replayBtnNormal) {
    replayBtnNormal.innerHTML = '📜 直前対局のリプレイ ＆ 勝敗因分析を見る';
    replayBtnNormal.onclick = () => ReplayManager.openReplayModal();
  }
  if (replayBtnPractice) {
    replayBtnPractice.innerHTML = '📜 対局リプレイ ＆ 勝敗因分析を見る';
    replayBtnPractice.onclick = () => ReplayManager.openReplayModal();
  }
  if (replayBtnScenario) {
    replayBtnScenario.innerHTML = '📜 対局リプレイ ＆ 勝敗因分析を見る';
    replayBtnScenario.onclick = () => ReplayManager.openReplayModal();
  }

  const btnReplayPrevGame = document.getElementById('btn-replay-prev-game');
  const btnReplayNextGame = document.getElementById('btn-replay-next-game');

  if (btnReplayPrevGame) {
    btnReplayPrevGame.onclick = () => {
      soundMgr.playSelect();
      ReplayManager.changeEpisode(ReplayManager.selectedEpisodeIndex - 1);
    };
  }
  if (btnReplayNextGame) {
    btnReplayNextGame.onclick = () => {
      soundMgr.playSelect();
      ReplayManager.changeEpisode(ReplayManager.selectedEpisodeIndex + 1);
    };
  }

  const btnReplayClose = document.getElementById('modal-replay-close-btn');
  const btnReplayCloseX = document.getElementById('modal-replay-close-x');
  if (btnReplayClose) btnReplayClose.onclick = () => ReplayManager.closeModal();
  if (btnReplayCloseX) btnReplayCloseX.onclick = () => ReplayManager.closeModal();

  const btnReplayFirst = document.getElementById('btn-replay-first');
  const btnReplayPrev = document.getElementById('btn-replay-prev');
  const btnReplayPlay = document.getElementById('btn-replay-play');
  const btnReplayNext = document.getElementById('btn-replay-next');
  const btnReplayLast = document.getElementById('btn-replay-last');
  const btnReplayBranch = document.getElementById('btn-replay-branch');
  const seekSlider = document.getElementById('replay-seek-slider');

  if (btnReplayFirst) btnReplayFirst.onclick = () => { soundMgr.playSelect(); ReplayManager.first(); };
  if (btnReplayPrev) btnReplayPrev.onclick = () => { soundMgr.playSelect(); ReplayManager.prev(); };
  if (btnReplayPlay) btnReplayPlay.onclick = () => { soundMgr.playSelect(); ReplayManager.toggleAutoPlay(); };
  if (btnReplayNext) btnReplayNext.onclick = () => { soundMgr.playSelect(); ReplayManager.next(); };
  if (btnReplayLast) btnReplayLast.onclick = () => { soundMgr.playSelect(); ReplayManager.last(); };
  if (btnReplayBranch) {
    btnReplayBranch.onclick = () => ReplayManager.jumpToBranch();
    btnReplayBranch.innerHTML = '🎯 好手・反省手へ';
  }

  if (seekSlider) {
    seekSlider.oninput = (e) => {
      const idx = parseInt(e.target.value, 10) - 1;
      if (idx >= 0 && idx < ReplayManager.currentSteps.length) {
        ReplayManager.currentIndex = idx;
        ReplayManager.renderCurrentStep();
      }
    };
  }

  const btnNextMatchProceed = document.getElementById('btn-next-match-proceed');
  if (btnNextMatchProceed) {
    btnNextMatchProceed.onclick = () => {
      soundMgr.playSelect();
      if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) {
        ScenarioManager.proceedNextScenarioMatch();
      } else if (MatchSeriesManager && MatchSeriesManager.isActive) {
        MatchSeriesManager.nextMatch();
      } else {
        if (nextGameModal) nextGameModal.classList.remove('active');
        resetGame(false, enableCardExchange);
      }
    };
  }

  if (practiceInterimModal) {
    const pCloseX = document.getElementById('modal-practice-interim-close-x');
    if (pCloseX) {
      pCloseX.onclick = () => {
        soundMgr.playDeselect();
        practiceInterimModal.classList.remove('active');
        updateFullscreenButtonsUI();
      };
    }
    const pCloseBtn = document.getElementById('btn-practice-interim-close');
    if (pCloseBtn) {
      pCloseBtn.onclick = () => {
        soundMgr.playDeselect();
        practiceInterimModal.classList.remove('active');
        updateFullscreenButtonsUI();
      };
    }
  }

  const practiceJsonlBtn = document.getElementById('btn-download-practice-jsonl');
  if (practiceJsonlBtn) {
    practiceJsonlBtn.onclick = () => {
      MatchSeriesManager.downloadLogs();
    };
  }

  const scenarioJsonlBtn = document.getElementById('btn-scenario-download-jsonl');
  if (scenarioJsonlBtn) {
    scenarioJsonlBtn.onclick = () => {
      if (typeof ScenarioManager !== 'undefined') {
        ScenarioManager.downloadLogs();
      }
    };
  }

  const copyPracticeBtn = document.getElementById('btn-copy-practice-summary');
  if (copyPracticeBtn) {
    copyPracticeBtn.onclick = () => {
      MatchSeriesManager.copyResultsSummary();
    };
  }

  const downloadPracticeCsvBtn = document.getElementById('btn-download-practice-csv');
  if (downloadPracticeCsvBtn) {
    downloadPracticeCsvBtn.onclick = () => {
      MatchSeriesManager.downloadResultsCsv();
    };
  }

  const practiceCloseBtn = document.getElementById('btn-practice-finish-close');
  if (practiceCloseBtn) {
    practiceCloseBtn.onclick = () => {
      MatchSeriesManager.closeAndEnd();
    };
  }

  if (debugLogModal) {
    const dbgClose = document.getElementById('modal-debug-log-close-btn');
    if (dbgClose) dbgClose.onclick = () => { soundMgr.playDeselect(); debugLogModal.classList.remove('active'); };
    const dbgCloseX = document.getElementById('modal-debug-log-close-x');
    if (dbgCloseX) dbgCloseX.onclick = () => { soundMgr.playDeselect(); debugLogModal.classList.remove('active'); };
    const dbgClear = document.getElementById('btn-clear-logs');
    if (dbgClear) dbgClear.onclick = () => { soundMgr.playSelect(); InAppLogger.clear(); };
    const dbgCopy = document.getElementById('btn-copy-logs');
    if (dbgCopy) dbgCopy.onclick = () => { soundMgr.playSelect(); InAppLogger.copyAll(); };
  }

  if (logViewerModal) {
    const lvClose = document.getElementById('modal-log-viewer-close-btn');
    if (lvClose) lvClose.onclick = () => { soundMgr.playDeselect(); logViewerModal.classList.remove('active'); };
    const lvCloseX = document.getElementById('modal-log-viewer-close-x');
    if (lvCloseX) lvCloseX.onclick = () => { soundMgr.playDeselect(); logViewerModal.classList.remove('active'); };
    const lvPrev = document.getElementById('btn-log-prev');
    if (lvPrev) lvPrev.onclick = () => { soundMgr.playSelect(); currentViewerEpisodeIndex--; updateLogViewerUI(); };
    const lvNext = document.getElementById('btn-log-next');
    if (lvNext) lvNext.onclick = () => { soundMgr.playSelect(); currentViewerEpisodeIndex++; updateLogViewerUI(); };
    const lvSelect = document.getElementById('log-game-select');
    if (lvSelect) lvSelect.onchange = (e) => { soundMgr.playSelect(); currentViewerEpisodeIndex = parseInt(e.target.value); updateLogViewerUI(); };
  }

  const vClose = document.getElementById('modal-version-close-btn');
  if (vClose) vClose.onclick = () => { soundMgr.playDeselect(); if (versionModal) versionModal.classList.remove('active'); };
  const vCloseX = document.getElementById('modal-version-close-x');
  if (vCloseX) vCloseX.onclick = () => { soundMgr.playDeselect(); if (versionModal) versionModal.classList.remove('active'); };

  const ruleToggleBtn = document.getElementById('rule-toggle-btn');
  if (ruleToggleBtn) {
    ruleToggleBtn.onclick = () => {
      soundMgr.playSelect();
      if (ScenarioManager && ScenarioManager.isActive) {
        ScenarioManager.openRulesModal();
      } else {
        if (rulesPanel && rulesPanel.classList.contains('open')) {
          rulesPanel.classList.remove('open');
          if (ruleModal) ruleModal.classList.add('active');
        } else if (rulesPanel) {
          rulesPanel.classList.add('open');
        }
      }
    };
  }

  const toggleSound = () => {
    isSoundMuted = !isSoundMuted;
    const label = isSoundMuted ? '🔇 BGM OFF' : '🔊 BGM ON';
    document.querySelectorAll('#sound-toggle-btn, #char-select-sound-btn, #btn-sound-toggle, #btn-map-sound-toggle').forEach(b => {
      b.textContent = label;
    });
    bgmMgr.audioA.muted = isSoundMuted;
    bgmMgr.audioB.muted = isSoundMuted;

    if (OpeningManager && OpeningManager.bgmAudio) {
      OpeningManager.bgmAudio.muted = isSoundMuted;
    }

    if (!isSoundMuted) {
      soundMgr.playSelect();
      if (OpeningManager && OpeningManager.isOpen) {
        OpeningManager.startBgm();
      } else {
        const rev = typeof isRevolution !== 'undefined' ? isRevolution : false;
        const eb = typeof isElevenBack !== 'undefined' ? isElevenBack : false;
        bgmMgr.update(rev, eb);
      }
      soundMgr.init();
    } else {
      bgmMgr.audioA.pause();
      bgmMgr.audioB.pause();
      if (OpeningManager && OpeningManager.bgmAudio) {
        OpeningManager.bgmAudio.pause();
      }
      if (soundMgr.ctx && soundMgr.ctx.state === 'running') soundMgr.ctx.suspend();
    }
  };

  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) soundBtn.onclick = toggleSound;
  const csSoundBtn = document.getElementById('char-select-sound-btn');
  if (csSoundBtn) csSoundBtn.onclick = toggleSound;
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  if (btnSoundToggle) btnSoundToggle.onclick = toggleSound;
  const btnMapSoundToggle = document.getElementById('btn-map-sound-toggle');
  if (btnMapSoundToggle) btnMapSoundToggle.onclick = toggleSound;

  const csCharBtn = document.getElementById('char-select-char-btn');
  const csRuleBtn = document.getElementById('char-select-rule-btn');
  if (csCharBtn) {
    csCharBtn.onclick = () => {
      soundMgr.playSelect();
      updateCharIntroVisibility();
      if (charModal) charModal.classList.add('active');
    };
  }
  if (csRuleBtn) {
    csRuleBtn.onclick = () => { soundMgr.playSelect(); if (ruleModal) ruleModal.classList.add('active'); };
  }

  const csFsBtn = document.getElementById('char-select-fullscreen-btn');
  const bFsBtn = document.getElementById('fullscreen-btn');
  const btnFsToggle = document.getElementById('btn-fullscreen-toggle');
  const btnMapFsToggle = document.getElementById('btn-map-fullscreen-toggle');
  if (csFsBtn) csFsBtn.onclick = toggleFullScreen;
  if (bFsBtn) bFsBtn.onclick = toggleFullScreen;
  if (btnFsToggle) btnFsToggle.onclick = toggleFullScreen;
  if (btnMapFsToggle) btnMapFsToggle.onclick = toggleFullScreen;

  const mCloseBtn = document.getElementById('modal-close-btn');
  if (mCloseBtn) mCloseBtn.onclick = () => { soundMgr.playDeselect(); if (ruleModal) ruleModal.classList.remove('active'); };
  const mCloseX = document.getElementById('modal-close-x');
  if (mCloseX) mCloseX.onclick = () => { soundMgr.playDeselect(); if (ruleModal) ruleModal.classList.remove('active'); };

  const charHelpBtn = document.getElementById('char-help-btn');
  if (charHelpBtn) {
    charHelpBtn.onclick = () => {
      soundMgr.playSelect();
      if (ScenarioManager && ScenarioManager.isActive) {
        ScenarioManager.openCharsModal();
      } else {
        updateCharIntroVisibility();
        if (charModal) charModal.classList.add('active');
      }
    };
  }
  const mCharCloseBtn = document.getElementById('modal-char-close-btn');
  if (mCharCloseBtn) mCharCloseBtn.onclick = () => { soundMgr.playDeselect(); if (charModal) charModal.classList.remove('active'); };
  const mCharCloseX = document.getElementById('modal-char-close-x');
  if (mCharCloseX) mCharCloseX.onclick = () => { soundMgr.playDeselect(); if (charModal) charModal.classList.remove('active'); };

  const evalMeterBtn = document.getElementById('eval-meter-btn');
  if (evalMeterBtn) evalMeterBtn.onclick = () => { soundMgr.playSelect(); showEvalModal(); };
  const mEvalCloseBtn = document.getElementById('modal-eval-close-btn');
  if (mEvalCloseBtn) mEvalCloseBtn.onclick = () => { soundMgr.playDeselect(); if (evalModal) evalModal.classList.remove('active'); };
  const mEvalCloseX = document.getElementById('modal-eval-close-x');
  if (mEvalCloseX) mEvalCloseX.onclick = () => { soundMgr.playDeselect(); if (evalModal) evalModal.classList.remove('active'); };

  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.onclick = () => {
      soundMgr.playSelect();
      const isScenarioActive = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
      const isSeriesActive = (MatchSeriesManager && MatchSeriesManager.isActive);

      currentStatsTab = (isScenarioActive || isSeriesActive) ? 'practice' : 'my';

      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      const targetTabBtn = document.getElementById((isScenarioActive || isSeriesActive) ? 'tab-practice-btn' : 'tab-my-stats-btn');
      if (targetTabBtn) targetTabBtn.classList.add('active');

      renderRankingModalContent();
      if (statsModal) statsModal.classList.add('active');
    };
  }

  const mStatsCloseBtn = document.getElementById('modal-stats-close-btn');
  if (mStatsCloseBtn) mStatsCloseBtn.onclick = () => { soundMgr.playDeselect(); if (statsModal) statsModal.classList.remove('active'); };
  const mStatsCloseX = document.getElementById('modal-stats-close-x');
  if (mStatsCloseX) mStatsCloseX.onclick = () => { soundMgr.playDeselect(); if (statsModal) statsModal.classList.remove('active'); };

  const tabPracticeBtn = document.getElementById('tab-practice-btn');
  if (tabPracticeBtn) {
    tabPracticeBtn.onclick = () => {
      soundMgr.playSelect();
      currentStatsTab = 'practice';
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      tabPracticeBtn.classList.add('active');
      renderRankingModalContent();
    };
  }

  const tabMyStatsBtn = document.getElementById('tab-my-stats-btn');
  if (tabMyStatsBtn) {
    tabMyStatsBtn.onclick = () => {
      soundMgr.playSelect();
      currentStatsTab = 'my';
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      tabMyStatsBtn.classList.add('active');
      renderRankingModalContent();
    };
  }

  const tabAllRankingBtn = document.getElementById('tab-all-ranking-btn');
  if (tabAllRankingBtn) {
    tabAllRankingBtn.onclick = () => {
      soundMgr.playSelect();
      currentStatsTab = 'all';
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      tabAllRankingBtn.classList.add('active');
      renderRankingModalContent();
    };
  }

  const mStatsClearBtn = document.getElementById('modal-stats-clear-btn');
  if (mStatsClearBtn) {
    mStatsClearBtn.onclick = () => {
      if (currentStatsTab === 'my') {
        if (confirm('あなたの通算対戦成績を初期化しますか？\n（※宮廷総合格付けランキングは保持されます）')) {
          soundMgr.playSelect();
          GameStorage.clearPlayerOnly();
          renderRankingModalContent();
        }
      } else if (currentStatsTab === 'all') {
        if (confirm('宮廷総合格付け（全キャラクターの通算対戦記録）を初期化しますか？\n（※あなたの個人戦績は保持されます）')) {
          soundMgr.playSelect();
          GameStorage.clearRankingOnly();
          renderRankingModalContent();
        }
      }
    };
  }

  document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      soundMgr.playSelect();
      document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const spd = parseInt(this.getAttribute('data-speed'), 10);
      currentSpeed = !isNaN(spd) ? spd : 1;
      console.log(`[SPEED] 速度切替: ${currentSpeed}x (倍率: ${getSpeedMultiplier()})`);
    });
  });

  const autoPlayBtn = document.getElementById('auto-play-btn');
  if (autoPlayBtn) {
    autoPlayBtn.onclick = () => {
      soundMgr.playSelect();

      const isScenario = (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive);
      if (isScenario) return;

      const isSpectate = (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.mode === 'auto');

      if (isSpectate) {
        isSpectatePaused = !isSpectatePaused;
        updateControlsOnly();

        if (isSpectatePaused) {
          setMessage('⏸ 観戦を一時停止しました。「▶ 再開」を押すと対局を再開します。');
        } else {
          setMessage('▶ 観戦を再開しました。');
          lastTurnActivityTimestamp = Date.now();
          checkTurn();
        }
        return;
      }

      isAutoPlayMode = !isAutoPlayMode;
      if (isAutoPlayMode) {
        hasPlayerUsedAutoInMatch = true;
      }

      if (!isAutoPlayMode) {
        currentSpeed = 1;
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.toggle('active', b.getAttribute('data-speed') === '1'));
        isProcessing = false;
      }

      updateCharacterUI();
      updateControlsOnly();

      if (isAutoPlayMode) {
        if (isPreExchangePhase) {
          proceedToExchange();
        } else if (isExchangePhase && PLAYERS[currentTurnIndex] === 'player') {
          if (previousRanks.player === '大富豪') autoSelectExchangeCards('player', 2);
          else if (previousRanks.player === '富豪') autoSelectExchangeCards('player', 1);
        } else if (PLAYERS[currentTurnIndex] === 'player' && !gameEnded && !isExchangeTransitioning) {
          isProcessing = false;
          lastTurnActivityTimestamp = Date.now();
          render(false);
          checkTurn();
        }
      } else {
        if (PLAYERS[currentTurnIndex] === 'player' && !gameEnded && !isExchangeTransitioning) {
          isProcessing = false;
          render(false);
        }
      }
    };
  }

  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.onclick = () => {
      if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive && !gameEnded) {
        soundMgr.playDeselect();
        const ok = confirm('対局を中断してマップ画面へ戻りますか？\n（※現在の試合の進行状況は破棄されます）');
        if (!ok) return;
      }

      soundMgr.playSelect();

      terminateCurrentSession();

      if (ScenarioManager && ScenarioManager.isActive) {
        ScenarioManager.isActive = false;
        ScenarioManager.data.currentMatchIndex = 1;
        ScenarioManager.data.stageMatchStats = {};
        if (typeof pendingReceivedCards !== 'undefined') pendingReceivedCards = [];
        previousRanks = {};
        ScenarioManager.save();
        bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
        ScenarioManager.openMapScreen();
        return;
      }

      if (MatchSeriesManager && MatchSeriesManager.isActive) {
        SaveLoadManager.saveGameState(true, 'player');
        const pBadge = document.getElementById('practice-progress-badge');
        if (pBadge) pBadge.classList.add('is-hidden');
      } else {
        SaveLoadManager.clearSaveData();
        previousRanks = {};
      }

      previousRanks = {};

      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      bgmMgr.setCharSelectPhase(true);
      SaveLoadManager.updateLoadButtonState();
      StartSetupManager.renderPlayerCharGrid();
      StartSetupManager.renderOpponentsGrid();
      document.getElementById('char-select-overlay').classList.add('active');

      updateFullscreenButtonsUI();
    };
  }

  const btnAvatarDecide = document.getElementById('btn-avatar-decide');
  if (btnAvatarDecide) {
    btnAvatarDecide.onclick = () => {
      if (!ScenarioManager.data.avatarId) return;
      soundMgr.playWin();
      ScenarioManager.save();
      ScenarioManager.openMapScreen();
    };
  }

  document.querySelectorAll('.avatar-card-large').forEach(card => {
    card.onclick = () => {
      soundMgr.playSelect();
      document.querySelectorAll('.avatar-card-large').forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      const avId = card.getAttribute('data-avatar-id');
      ScenarioManager.data.avatarId = avId;
      const dBtn = document.getElementById('btn-avatar-decide');
      if (dBtn) dBtn.disabled = false;
    };
  });

  document.querySelectorAll('.btn-scenario-game-count').forEach(btn => {
    btn.onclick = () => {
      soundMgr.playSelect();
      document.querySelectorAll('.btn-scenario-game-count').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const count = parseInt(btn.getAttribute('data-games'), 10) || 1;
      ScenarioManager.data.matchesPerStage = count;
      ScenarioManager.save();
      const hintEl = document.getElementById('scenario-games-hint');
      if (hintEl) hintEl.textContent = `（現在: ${count}試合勝負）`;
    };
  });

  const yScenarioExBtn = document.getElementById('btn-scenario-exchange-yes');
  const nScenarioExBtn = document.getElementById('btn-scenario-exchange-no');
  const scenarioExHint = document.getElementById('scenario-exchange-hint');
  if (yScenarioExBtn && nScenarioExBtn) {
    yScenarioExBtn.onclick = () => {
      soundMgr.playSelect();
      ScenarioManager.data.enableCardExchange = true;
      ScenarioManager.save();
      yScenarioExBtn.classList.add('active');
      nScenarioExBtn.classList.remove('active');
      if (scenarioExHint) scenarioExHint.textContent = '（現在: 交換あり・座席継続）';
    };
    nScenarioExBtn.onclick = () => {
      soundMgr.playSelect();
      ScenarioManager.data.enableCardExchange = false;
      ScenarioManager.save();
      nScenarioExBtn.classList.add('active');
      yScenarioExBtn.classList.remove('active');
      if (scenarioExHint) scenarioExHint.textContent = '（現在: 交換なし・毎回席替え）';
    };
  }

  const btnScenarioReset = document.getElementById('btn-scenario-reset');
  if (btnScenarioReset) {
    btnScenarioReset.onclick = () => {
      if (confirm('マイキャラを選び直して最初からやり直しますか？\n（シナリオの進行状況がリセットされますが、一度解放したキャラクターは保持されます）')) {
        terminateCurrentSession();
        ScenarioManager.reset();
      }
    };
  }

  const btnAvatarBackTitle = document.getElementById('btn-avatar-back-title');
  if (btnAvatarBackTitle) {
    btnAvatarBackTitle.onclick = () => {
      soundMgr.playSelect();
      terminateCurrentSession();
      if (typeof ScenarioManager !== 'undefined') ScenarioManager.isActive = false;
      const sAvatar = document.getElementById('screen-avatar-select');
      if (sAvatar) {
        sAvatar.classList.add('is-hidden');
        sAvatar.classList.remove('active');
      }
      previousRanks = {};
      StartSetupManager.renderPlayerCharGrid();
      StartSetupManager.renderOpponentsGrid();
      document.getElementById('char-select-overlay').classList.add('active');
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      bgmMgr.setCharSelectPhase(true);
      updateFullscreenButtonsUI();
    };
  }

  const btnScenarioBackTitle = document.getElementById('btn-scenario-back-title');
  if (btnScenarioBackTitle) {
    btnScenarioBackTitle.onclick = () => {
      soundMgr.playSelect();
      terminateCurrentSession();
      if (typeof ScenarioManager !== 'undefined') ScenarioManager.isActive = false;
      const sMap = document.getElementById('screen-map');
      if (sMap) { sMap.classList.add('is-hidden'); sMap.classList.remove('active'); }
      previousRanks = {};
      StartSetupManager.renderPlayerCharGrid();
      StartSetupManager.renderOpponentsGrid();
      document.getElementById('char-select-overlay').classList.add('active');
      bgmMgr.setBattleBaseSrc('bgm_normal.mp3');
      bgmMgr.setCharSelectPhase(true);
      updateFullscreenButtonsUI();
    };
  }

  const btnLaunchBattle = document.getElementById('btn-launch-battle');
  if (btnLaunchBattle) {
    btnLaunchBattle.onclick = () => {
      ScenarioManager.launchScenarioBattle();
    };
  }

  const btnScenarioProceedNext = document.getElementById('btn-scenario-proceed-next-game');
  if (btnScenarioProceedNext) {
    btnScenarioProceedNext.onclick = () => {
      soundMgr.playSelect();
      ScenarioManager.proceedNextScenarioMatch();
    };
  }

  const btnRestartScenario = document.getElementById('btn-restart-scenario');
  if (btnRestartScenario) {
    btnRestartScenario.onclick = () => {
      if (confirm('シナリオを最初からやり直しますか？\n（ステージ進行状況がリセットされますが、一度解放したキャラクターは保持されます）')) {
        const clearModal = document.getElementById('modal-stage-clear');
        if (clearModal) clearModal.classList.remove('active');
        terminateCurrentSession();
        ScenarioManager.reset();
      }
    };
  }

  const btnCharHelp2 = document.getElementById('btn-char-help');
  const btnMapCharHelp = document.getElementById('btn-map-char-help');
  const btnRuleHelp2 = document.getElementById('btn-rule-help');
  const btnMapRuleHelp = document.getElementById('btn-map-rule-help');

  if (btnCharHelp2) btnCharHelp2.onclick = () => ScenarioManager.openCharsModal();
  if (btnMapCharHelp) btnMapCharHelp.onclick = () => ScenarioManager.openCharsModal();
  if (btnRuleHelp2) btnRuleHelp2.onclick = () => ScenarioManager.openRulesModal();
  if (btnMapRuleHelp) btnMapRuleHelp.onclick = () => ScenarioManager.openRulesModal();

  const mScenarioCharsCloseX = document.getElementById('modal-scenario-chars-close-x');
  const btnScenarioCharsClose = document.getElementById('btn-scenario-chars-close');
  if (mScenarioCharsCloseX) mScenarioCharsCloseX.onclick = () => { soundMgr.playDeselect(); const m = document.getElementById('modal-scenario-chars'); if (m) m.classList.remove('active'); };
  if (btnScenarioCharsClose) btnScenarioCharsClose.onclick = () => { soundMgr.playDeselect(); const m = document.getElementById('modal-scenario-chars'); if (m) m.classList.remove('active'); };

  const mScenarioRulesCloseX = document.getElementById('modal-scenario-rules-close-x');
  const btnScenarioRulesClose = document.getElementById('btn-scenario-rules-close');
  if (mScenarioRulesCloseX) mScenarioRulesCloseX.onclick = () => { soundMgr.playDeselect(); const m = document.getElementById('modal-scenario-rules'); if (m) m.classList.remove('active'); };
  if (btnScenarioRulesClose) btnScenarioRulesClose.onclick = () => { soundMgr.playDeselect(); const m = document.getElementById('modal-scenario-rules'); if (m) m.classList.remove('active'); };

  const goExBtn = document.getElementById('go-exchange-btn');
  if (goExBtn) goExBtn.onclick = proceedToExchange;
  const exBtn = document.getElementById('exchange-btn');
  if (exBtn) exBtn.onclick = confirmExchange;
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.onclick = playerPlayCard;
  const passBtn = document.getElementById('pass-btn');
  if (passBtn) passBtn.onclick = playerPass;

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateHandOverlap();
      updateFieldOverlap();
      ['cpu1', 'cpu2', 'cpu3'].forEach(c => renderCpuStack(c, hands[c].length));

      const nextGameModal = document.getElementById('next-game-modal');
      if (nextGameModal && nextGameModal.classList.contains('active')) {
        renderNextGameInterimDashboard();
      }

      const finishModal = document.getElementById('practice-finish-modal');
      if (finishModal && finishModal.classList.contains('active')) {
        renderSharedRankChart(
          document.getElementById('practice-finish-chart'),
          document.getElementById('practice-finish-chart-legend'),
          MatchSeriesManager.rankHistory,
          MatchSeriesManager.totalGames,
          MatchSeriesManager.playerCharId,
          MatchSeriesManager.selectedOpponentIds,
          false
        );
      }
      updateFullscreenButtonsUI();
    }, 100);
  });
}

function initRuleTexts() {
  const rPass = document.getElementById('rule-list-pass');
  if (rPass) rPass.textContent = 'パス制限なし';
  const exRuleEl = document.getElementById('rule-list-exchange');
  if (exRuleEl) {
    exRuleEl.textContent = enableCardExchange ? 'カード交換: あり (座席継続)' : 'カード交換: なし (毎回席替え)';
  }
}

function startApp() {
  try {
    document.querySelectorAll('#char-modal img[data-char-img]').forEach(img => {
      img.src = CHAR_IMAGES[img.getAttribute('data-char-img')] || 'fugo-絵柄/king.png';
      img.onerror = () => { img.src = 'fugo-絵柄/king.png'; };
    });
    initRuleTexts();
    ScenarioManager.init();
    GameStorage.syncWithScenarioProgress(ScenarioManager.data);
    StartSetupManager.init();
    initEvents();
    SaveLoadManager.updateLoadButtonState();
    AIStatusUI.pingServer();
    OpeningManager.initOpening();

    if (!OpeningManager.isOpen) {
      bgmMgr.setCharSelectPhase(true);
    }

    const badgeIds = [
      'version-badge',
      'char-select-version-badge',
      'scenario-version-badge-select',
      'scenario-version-badge-map',
      'adv-version-badge'
    ];

    badgeIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && typeof APP_VERSION !== 'undefined') {
        el.textContent = `👑 Ver. ${APP_VERSION.replace('v', '')}`;
        el.onclick = () => {
          soundMgr.playSelect();
          renderVersionHistoryModal();
          const vModal = document.getElementById('version-modal');
          if (vModal) vModal.classList.add('active');
        };
      }
    });

    updateFullscreenButtonsUI();
    console.log(`[SYSTEM] アプリ初期化完了（${APP_VERSION} モジュール分割・完全整合版）`);
  } catch (err) {
    console.error('[CRITICAL] 起動初期化エラー:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

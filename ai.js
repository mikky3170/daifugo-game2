/* ====================================================================
 * ROYAL DAIFUGO - ai.js
 * [Version: v4.1.2 - サーバー推論一元化・PC直接保存純化・軽量堅牢版]
 * ==================================================================== */

/* ============================================================
 * 1. AI通信ステータスランプ管理（Render/Pythonサーバー通信キャラ専用）
 * ============================================================ */
const AI_SERVER_TARGET_CHAR_IDS = [
  'GILGAMESH', 'AWAKENED_KING', 'BEGINNER_AI', 'SUPER_AI',
  'NOBUNAGA', 'SHOTOKU', 'SHI_HUANGDI', 'ALEXANDER', 'KING'
];

function isPythonServerTargetChar(charId) {
  return charId && AI_SERVER_TARGET_CHAR_IDS.includes(charId);
}

const LOCAL_FALLBACK_QUOTES = {
  GILGAMESH: 'フン、通信が途切れようと雑種相手に我の知恵を借りるまでもないわ！',
  AWAKENED_KING: '外界との繋がりが絶たれようと…この直感だけで十分だ！',
  SUPER_AI: '回線など頼らずとも、王家の品格は揺るぎません。',
  KING: '神託を待たずとも、余の威光に揺らぎはない。',
  NOBUNAGA: '狼煙が途絶えたか！ならばこの信長、自らの勘で斬り捨てるまで！',
  SHOTOKU: '天の声は遮られようとも、十七条の憲法に迷いはありませぬ。',
  SHI_HUANGDI: '万里の長城の外など知らぬ。余の法は朕自身にある。',
  ALEXANDER: '援軍の報せなど要らぬ！我が軍団の突撃で押し通す！',
  BEGINNER_AI: '電波が届かなくても…僕自身の力でやってみせるよ！'
};

const localFallbackCooldowns = {};

const AIStatusUI = {
  isServerOnline: false,
  isWakingUp: false,
  retryTimer: null,
  consecutiveFailures: 0,

  set(state, text = null) {
    const dot = document.getElementById('ai-orb-dot');
    const label = document.getElementById('ai-orb-label');
    const summary = document.getElementById('debug-status-summary');
    if (!label) return;

    if (dot) {
      dot.classList.remove('status-online', 'status-waking', 'status-offline', 'status-thinking');
    }

    if (state === 'thinking') {
      if (this.isServerOnline) {
        if (dot) dot.classList.add('status-thinking');
        label.textContent = text || 'AI: 思考中...';
      } else {
        if (dot) dot.classList.add('status-offline');
        label.textContent = 'AI: オフライン(思考中)';
      }
    } else if (state === 'online') {
      this.isServerOnline = true;
      this.isWakingUp = false;
      this.consecutiveFailures = 0;
      if (dot) dot.classList.add('status-online');
      label.textContent = text || 'AI: 稼働中';
      if (summary) summary.textContent = `🟢 接続中: ${AI_SERVER_BASE_URL}`;
      if (this.retryTimer) {
        clearInterval(this.retryTimer);
        this.retryTimer = null;
      }
    } else if (state === 'waking') {
      this.isWakingUp = true;
      if (dot) dot.classList.add('status-waking');
      label.textContent = text || 'AI: サーバー起動中...';
      if (summary) summary.textContent = `🟡 起動確認中: ${AI_SERVER_BASE_URL}`;
    } else {
      this.isServerOnline = false;
      this.isWakingUp = false;
      if (dot) dot.classList.add('status-offline');
      label.textContent = text || 'AI: オフライン';
      if (summary) summary.textContent = `🔴 未接続: ${AI_SERVER_BASE_URL}`;

      if (!this.retryTimer) {
        this.retryTimer = setInterval(() => {
          if (!this.isServerOnline) this.pingServer(true);
        }, 15000);
      }
    }
  },

  restoreIdleState() {
    if (this.isServerOnline) {
      this.set('online', 'AI: 稼働中');
    } else if (this.isWakingUp) {
      this.set('waking', 'AI: サーバー起動中...');
    } else {
      this.set('offline', 'AI: オフライン');
    }
  },

  setBrainDot(playerKey, isThinking = true, isOnline = true) {
    const dot = document.getElementById(`${playerKey}-brain-dot`);
    if (!dot) return;

    const charDef = (typeof assignedCharacters !== 'undefined') ? assignedCharacters[playerKey] : null;
    const effectiveCharId = charDef?.id;

    const isTarget = isPythonServerTargetChar(effectiveCharId);

    if (!isTarget || !isThinking) {
      dot.classList.remove('active', 'offline-thinking');
      return;
    }

    dot.classList.remove('active', 'offline-thinking');
    void dot.offsetWidth;
    if (isOnline && this.isServerOnline) {
      dot.classList.add('active');
    } else {
      dot.classList.add('offline-thinking');
    }
  },

  clearBrainDot(playerKey) {
    const dot = document.getElementById(`${playerKey}-brain-dot`);
    if (!dot) return;
    dot.classList.remove('active', 'offline-thinking');
  },

  clearAllBrainDots() {
    ['player', 'cpu1', 'cpu2', 'cpu3'].forEach(p => this.clearBrainDot(p));
  },

  async pingServer(isSilent = false) {
    if (!this.isServerOnline) {
      this.set('waking', 'AI: サーバー起動中...');
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(CONFIG.PYTHON_HEALTH_URL, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.isServerOnline = true;
        this.isWakingUp = false;
        this.consecutiveFailures = 0;
        this.set('online', 'AI: 稼働中');
        console.log(`✅ [Pythonサーバー接続成功] モデル: ${data.model_unified || data.apex_name || 'APEX-v3'}`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (!isSilent) console.warn(`⚠️ [ヘルスチェック未到達] Pythonサーバー未起動: ${err.message}`);
      this.isServerOnline = false;
      this.set('offline', 'AI: オフライン');
    }
  }
};

/* ----------------------------------------------------
 * 2. キャラクター戦術プロファイル取得ヘルパー
 * ---------------------------------------------------- */
function getCharacterTacticalProfile(charId) {
  if (typeof CHARACTER_TACTICAL_PROFILES !== 'undefined' && charId && CHARACTER_TACTICAL_PROFILES[charId]) {
    return CHARACTER_TACTICAL_PROFILES[charId];
  }
  return {
    R2_reachBlock: 0.80,
    R3_capitalFallDefense: 0.80,
    R4_leadMulti: 0.80,
    R5_trashCardClear: 0.70,
    R6_eightCutBridge: 0.70,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.60,
    R9_revolutionCounter: 0.40,
    R10_suitLockAwareness: 0.40,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.75,
    R14_endgameSolverDepth: 0.50
  };
}

/* ----------------------------------------------------
 * 3. PyTorch深層学習サーバー通信
 * ---------------------------------------------------- */
let currentSessionGeneration = 0;

function matchReturnedMoveWithHand(hand, returnedCards) {
  if (!returnedCards || returnedCards.length === 0) return null;
  const chosen = [];
  const tempHand = [...hand];
  for (const rCard of returnedCards) {
    const isJoker = rCard.isJoker || rCard.rank === 'JOKER' || rCard.display === 'JOKER';
    const rSuit = rCard.suit || rCard.suitSymbol;
    const rRank = rCard.rank || rCard.display;
    const rJId = rCard.jokerId;

    const idx = tempHand.findIndex(c => {
      if (isJoker && c.isJoker) {
        if (rJId && c.jokerId) return c.jokerId === rJId;
        return true;
      }
      return !isJoker && !c.isJoker && (c.suitSymbol === rSuit || c.suit === rSuit) && (c.display === rRank || c.rank === rRank);
    });

    if (idx !== -1) {
      chosen.push(tempHand.splice(idx, 1)[0]);
    }
  }
  return chosen.length === returnedCards.length ? chosen : null;
}

function filterCpuMovesForCharacter(charId, moves) {
  if (!moves || moves.length === 0) return moves;
  if (charId === 'JESTER') return moves;
  const filtered = moves.filter(m => m.length < 6);
  return filtered.length > 0 ? filtered : moves;
}

async function askPythonAI(hand, currentField, validMoves, modelType = 'apex', playerKey = 'cpu2', activeGen = null) {
  const gen = (activeGen !== null) ? activeGen : currentSessionGeneration;
  const charDef = assignedCharacters[playerKey] || CHARACTER_DEFS.SUPER_AI;

  if (!AIStatusUI.isServerOnline) {
    AIStatusUI.setBrainDot(playerKey, true, false);
    const localMove = decideCpuMove(playerKey);
    return localMove;
  }

  AIStatusUI.set('thinking', 'AI: 思考中...');
  AIStatusUI.setBrainDot(playerKey, true, true);

  const targetMoves = filterCpuMovesForCharacter(charDef.id, validMoves);
  const isHeavyMcts = (charDef.id === 'GILGAMESH' || charDef.id === 'AWAKENED_KING');
  const timeoutMs = isHeavyMcts ? 5000 : 3500;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const mySeat = PLAYERS.indexOf(playerKey);

    const payload = {
      modelType: 'apex',
      charId: charDef.id,
      seat: mySeat >= 0 ? mySeat : 0,
      isRevolution: !!isRevolution,
      isElevenBack: !!isElevenBack,
      hand: hand.map(c => ({ suit: c.suitSymbol || c.suit, rank: c.display || c.rank, isJoker: !!c.isJoker, jokerId: c.jokerId })),
      field: currentField.map(c => ({ suit: c.suitSymbol || c.suit, rank: c.display || c.rank, isJoker: !!c.isJoker, jokerId: c.jokerId })),
      clearedCards: AIDataLogger.serializeCards(typeof clearedCardsHistory !== 'undefined' ? clearedCardsHistory : []),
      playedHistory: AIDataLogger.serializeCards(typeof playedCardsHistory !== 'undefined' ? playedCardsHistory : []),
      validMoves: targetMoves.map(m => m.map(c => ({ suit: c.suitSymbol || c.suit, rank: c.display || c.rank, isJoker: !!c.isJoker, jokerId: c.jokerId }))),
      allHands: {
        0: AIDataLogger.serializeCards(hands.player),
        1: AIDataLogger.serializeCards(hands.cpu1),
        2: AIDataLogger.serializeCards(hands.cpu2),
        3: AIDataLogger.serializeCards(hands.cpu3)
      },
      finishedPlayers: (typeof finishedPlayers !== 'undefined' ? finishedPlayers : []).map(p => PLAYERS.indexOf(p)),
      lastSeat: (typeof lastPlayedPlayer !== 'undefined' && lastPlayedPlayer) ? PLAYERS.indexOf(lastPlayedPlayer) : 0,
      passCount: typeof consecutivePasses !== 'undefined' ? consecutivePasses : 0
    };

    const response = await fetch(CONFIG.PYTHON_AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const resData = await response.json();

    if (gen !== currentSessionGeneration) {
      AIStatusUI.clearBrainDot(playerKey);
      return null;
    }

    if (resData && resData.status === 'success') {
      AIStatusUI.isServerOnline = true;
      AIStatusUI.consecutiveFailures = 0;
      AIStatusUI.restoreIdleState();

      if (!resData.chosenMove) {
        console.log(`%c🟢 [AIサーバー推論: ${charDef.name}] APEX-v3/MCTS -> パス`, 'color: #10b981; font-weight: bold;');
        return null;
      }
      const matched = matchReturnedMoveWithHand(hand, resData.chosenMove);
      const moveStr = matched ? matched.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(' ') : 'パス';
      console.log(`%c🟢 [AIサーバー推論: ${charDef.name}] APEX-v3/MCTS -> ${moveStr}`, 'color: #10b981; font-weight: bold;');
      return matched;
    }
  } catch (err) {
    if (gen !== currentSessionGeneration) return null;

    AIStatusUI.consecutiveFailures = (AIStatusUI.consecutiveFailures || 0) + 1;
    if (AIStatusUI.consecutiveFailures >= 2) {
      AIStatusUI.isServerOnline = false;
      AIStatusUI.set('offline', 'AI: オフライン');
    } else {
      AIStatusUI.restoreIdleState();
    }
    AIStatusUI.setBrainDot(playerKey, true, false);

    const now = Date.now();
    const lastQuoteTime = localFallbackCooldowns[playerKey] || 0;
    if (now - lastQuoteTime > 6000 && LOCAL_FALLBACK_QUOTES[charDef.id]) {
      localFallbackCooldowns[playerKey] = now;
      if (typeof showCharacterDialogue === 'function') {
        showCharacterDialogue(playerKey, LOCAL_FALLBACK_QUOTES[charDef.id]);
      }
    }

    const localMove = decideCpuMove(playerKey);
    const moveStr = localMove ? localMove.map(c => c.isJoker ? '🃏JOKER' : `${normalizeCardSuit(c)}${normalizeCardRank(c)}`).join(' ') : 'パス';
    console.warn(`🟡 [AIローカル代替: ${charDef.name}] サーバー未接続/タイムアウトのためローカル思考 -> ${moveStr}`);
    return localMove;
  }

  return decideCpuMove(playerKey);
}

/* ----------------------------------------------------
 * 4. AIデータロガー (AIDataLogger) - PC logs/ 直接保存一本化版
 * ---------------------------------------------------- */
const AIDataLogger = {
  activeGameId: null,
  activePattern: null,
  currentTurnCount: 0,
  stepLogs: [],
  episodeLogs: [],
  currentTurnHistory: [],

  init() {
    try {
      localStorage.removeItem('royalManualStepsLogs_v2');
      localStorage.removeItem('royalCardGameStats');
    } catch (e) {}
  },

  startNewGame(pattern = 'OBSERVE_GAME') {
    this.activeGameId = 'game_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    this.activePattern = pattern;
    this.currentTurnCount = 0;
    this.currentTurnHistory = [];
  },

  serializeCard(c) {
    if (!c) return null;
    const isJoker = !!(c.isJoker || c.rank === 'JOKER' || c.display === 'JOKER');
    const suit = c.suitSymbol || c.suit || (isJoker ? '★' : '♠');
    const rank = c.display || c.rank || (isJoker ? 'JOKER' : '3');
    if (isJoker) {
      const jId = c.jokerId || (suit === '★' ? 'J1' : 'J2');
      return { suit: suit, rank: 'JOKER', isJoker: true, jokerId: jId };
    }
    return { suit: suit, rank: rank, isJoker: false };
  },

  serializeCards(cards) {
    return cards ? cards.map(c => this.serializeCard(c)) : [];
  },

  recordTurnAction(seatNum, action, cards, isCleared = false) {
    if (!CONFIG.ENABLE_AI_DATA_LOGGING) return;
    this.currentTurnHistory.push({
      turn: this.currentTurnCount,
      seat: seatNum,
      action: action,
      cards: (action === 'play' && cards) ? this.serializeCards(cards) : [],
      isCleared: !!isCleared
    });
  },

  recordStep(player, seatNum, charDef, hand, fieldCards, isRev, isEb, consecutivePasses, passMap, validMoves, chosenMove, evalScore = null, isManual = false) {
    if (!CONFIG.ENABLE_AI_DATA_LOGGING) return;
    this.currentTurnCount++;

    const remaining = {};
    [1, 2, 3, 4].forEach(s => {
      const pKey = PLAYERS[s - 1];
      remaining[`seat_${s}`] = (typeof hands !== 'undefined' && hands[pKey]) ? hands[pKey].length : 0;
    });

    const step = {
      gameId: this.activeGameId,
      pattern: this.activePattern || ((typeof isAutoPlayMode !== 'undefined' && isAutoPlayMode) ? 'OBSERVE_AUTO' : 'MANUAL_GAME'),
      turnNumber: this.currentTurnCount,
      seat: seatNum,
      player: player,
      playerChar: charDef?.id || player,
      playerCharName: charDef?.name || (player === 'player' ? getPlayerDisplayName('player') : player),
      isManual: !!isManual,
      hand: this.serializeCards(hand),
      fieldCards: this.serializeCards(fieldCards),
      clearedCards: this.serializeCards(typeof clearedCardsHistory !== 'undefined' ? clearedCardsHistory : []),
      isRevolution: !!isRev,
      isElevenBack: !!isEb,
      consecutivePasses: consecutivePasses,
      hasPassedInRound: { ...passMap },
      remainingCounts: remaining,
      validMoves: validMoves.map(m => this.serializeCards(m)),
      chosenMove: chosenMove ? this.serializeCards(chosenMove) : null,
      isPass: (chosenMove === null),
      done: false,
      isTerminal: false,
      evalScore: evalScore,
      finalRank: null,
      rankTitle: null,
      allSeatsFinalRank: null,
      timestamp: Date.now()
    };

    this.stepLogs.push(step);
    if (this.stepLogs.length > 2500) this.stepLogs.shift();

    if (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive) {
      MatchSeriesManager.recordStepLog(step);
    }
  },

  recordEpisodeEnd(seatResults, remainingCardsMap) {
    if (!CONFIG.ENABLE_AI_DATA_LOGGING) return;

    const rankMapBySeat = {};
    const titleMapBySeat = {};
    seatResults.forEach(r => {
      rankMapBySeat[r.seat] = r.finalRank;
      titleMapBySeat[r.seat] = r.rankTitle;
    });

    for (let i = this.stepLogs.length - 1; i >= 0; i--) {
      const st = this.stepLogs[i];
      if (st.gameId === this.activeGameId) {
        st.finalRank = rankMapBySeat[st.seat] || 4;
        st.rankTitle = titleMapBySeat[st.seat] || '大貧民';
        st.allSeatsFinalRank = { ...rankMapBySeat };
      } else {
        break;
      }
    }

    if (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive && MatchSeriesManager.stepLogs) {
      for (let i = MatchSeriesManager.stepLogs.length - 1; i >= 0; i--) {
        const pst = MatchSeriesManager.stepLogs[i];
        if (pst.gameId === this.activeGameId) {
          pst.finalRank = rankMapBySeat[pst.seat] || 4;
          pst.rankTitle = titleMapBySeat[pst.seat] || '大貧民';
          pst.allSeatsFinalRank = { ...rankMapBySeat };
        } else {
          break;
        }
      }
    }

    const terminalRemaining = {};
    [1, 2, 3, 4].forEach(s => {
      const pKey = PLAYERS[s - 1];
      const isFinished = typeof finishedPlayers !== 'undefined' ? finishedPlayers.includes(pKey) : false;
      terminalRemaining[`seat_${s}`] = isFinished ? 0 : ((typeof hands !== 'undefined' && hands[pKey]) ? hands[pKey].length : 0);
    });

    this.currentTurnCount++;
    const terminalStep = {
      gameId: this.activeGameId,
      pattern: this.activePattern || ((typeof isAutoPlayMode !== 'undefined' && isAutoPlayMode) ? 'OBSERVE_AUTO' : 'MANUAL_GAME'),
      turnNumber: this.currentTurnCount,
      action: "GAME_END",
      seat: seatResults.find(r => r.finalRank === 1)?.seat || 1,
      player: PLAYERS[(seatResults.find(r => r.finalRank === 1)?.seat || 1) - 1],
      isManual: false,
      hand: [],
      fieldCards: [],
      clearedCards: this.serializeCards(typeof clearedCardsHistory !== 'undefined' ? clearedCardsHistory : []),
      isRevolution: typeof isRevolution !== 'undefined' ? !!isRevolution : false,
      isElevenBack: typeof isElevenBack !== 'undefined' ? !!isElevenBack : false,
      consecutivePasses: 0,
      hasPassedInRound: { player: true, cpu1: true, cpu2: true, cpu3: true },
      remainingCounts: terminalRemaining,
      validMoves: [],
      chosenMove: null,
      isPass: true,
      done: true,
      isTerminal: true,
      evalScore: 1.0,
      finalRank: 1,
      rankTitle: "大富豪",
      allSeatsFinalRank: { ...rankMapBySeat },
      timestamp: Date.now()
    };

    this.stepLogs.push(terminalStep);
    if (typeof MatchSeriesManager !== 'undefined' && MatchSeriesManager.isActive) {
      MatchSeriesManager.recordStepLog(terminalStep);
    }

    const ep = {
      gameId: this.activeGameId,
      pattern: this.activePattern || ((typeof isAutoPlayMode !== 'undefined' && isAutoPlayMode) ? 'OBSERVE_AUTO' : 'MANUAL_GAME'),
      totalTurns: this.currentTurnCount,
      seats: seatResults,
      remainingCards: remainingCardsMap,
      allSeatsFinalRank: { ...rankMapBySeat },
      done: true,
      playedCardsHistory: [...this.currentTurnHistory],
      timestamp: Date.now()
    };
    this.episodeLogs.push(ep);
    if (this.episodeLogs.length > 500) this.episodeLogs.shift();
  },

  getStepsByGameId(gameId) {
    return this.stepLogs.filter(s => s.gameId === gameId);
  },

  async saveLogFile(content, fileName, onMessageCallback = null) {
    const notify = (msg, isSuccess = true) => {
      console.log(`[AIDataLogger] ${msg}`);
      if (typeof onMessageCallback === 'function') onMessageCallback(msg, isSuccess);
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(CONFIG.PYTHON_SAVE_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, content: content }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const resData = await res.json();
        const savedFilename = resData.filename || fileName;
        notify(`💾 パソコンの logs/ フォルダに直接保存しました！ (${savedFilename})`, true);
        return true;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('⚠️ [直接保存失敗] server.py が未起動です:', err.message);
      notify('⚠️ server.py が未起動のため logs/ に保存できませんでした。server.py を起動してください。', false);
      return false;
    }
  }
};
AIDataLogger.init();

/* ----------------------------------------------------
 * 5. 戦績＆データ管理 (GameStorage)
 * ---------------------------------------------------- */
const GameStorage = {
  VERSION_KEY: 'royalStatsSchemaVersion',
  CURRENT_SCHEMA_VER: 'v1.6.0',
  PLAYER_STATS_KEY: 'royalPlayerPersonalStats_v3',
  ALL_CHAR_KEY: 'royalAllCharStats_v3',
  PERM_UNLOCK_KEY: 'royalPermanentUnlockedChars_v1',

  init() {
    this.initSchema();
    GameEventManager.on('gameEnd', (payload) => {
      if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) return;
      this.recordGameEnd(payload);
    });
  },

  initSchema() {
    const savedVer = localStorage.getItem(this.VERSION_KEY);
    if (savedVer !== this.CURRENT_SCHEMA_VER) {
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_SCHEMA_VER);
    }
  },

  loadUnlockedChars() {
    try {
      const raw = localStorage.getItem(this.PERM_UNLOCK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [...DEFAULT_UNLOCKED_CHARS];
  },

  saveUnlockedChar(charId) {
    if (!charId) return;
    const current = this.loadUnlockedChars();
    if (!current.includes(charId)) {
      current.push(charId);
      try {
        localStorage.setItem(this.PERM_UNLOCK_KEY, JSON.stringify(current));
        console.log(`🔓 [アンロック] 新規キャラクターを永久解放しました: ${charId}`);
      } catch (e) {}
    }
  },

  resetUnlockedChars() {
    try {
      localStorage.setItem(this.PERM_UNLOCK_KEY, JSON.stringify([...DEFAULT_UNLOCKED_CHARS]));
      console.log('🔒 [アンロック初期化] キャラクター解放状況を初期状態にリセットしました。');
    } catch (e) {}
  },

  syncWithScenarioProgress(scenarioData) {
    if (!scenarioData) return;
    const current = new Set(this.loadUnlockedChars());
    const secrets = scenarioData.unlockedSecrets || {};
    const phase = scenarioData.currentPhase || '';

    if (secrets.YOUNG_KING || phase === 'STAGE_2_KING' || phase === 'STAGE_2_QUEEN' || phase === 'STAGE_2_AWAKENED_KING' || phase.startsWith('STAGE_3_') || phase === 'COMPLETED') {
      current.add('BEGINNER_AI');
    }
    if (secrets.QUEEN || phase === 'STAGE_2_AWAKENED_KING' || phase.startsWith('STAGE_3_') || phase === 'COMPLETED') {
      current.add('SUPER_AI');
    }
    if (secrets.AWAKENED_KING || phase.startsWith('STAGE_3_') || phase === 'COMPLETED') {
      current.add('AWAKENED_KING');
    }

    const heroPhases = ['STAGE_3_NOBUNAGA', 'STAGE_3_SHOTOKU', 'STAGE_3_SHI_HUANGDI', 'STAGE_3_ALEXANDER', 'STAGE_3_GILGAMESH', 'COMPLETED'];
    const idx = heroPhases.indexOf(phase);
    if (idx >= 0) current.add('NOBUNAGA');
    if (idx >= 1) current.add('SHOTOKU');
    if (idx >= 2) current.add('SHI_HUANGDI');
    if (idx >= 3) current.add('ALEXANDER');
    if (idx >= 4) current.add('GILGAMESH');

    try {
      localStorage.setItem(this.PERM_UNLOCK_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {}
  },

  loadAllCharStats() {
    this.initSchema();
    const data = localStorage.getItem(this.ALL_CHAR_KEY);
    if (data) {
      try { return JSON.parse(data); } catch (e) {}
    }
    const init = {};
    Object.keys(CHARACTER_DEFS).forEach(id => {
      init[id] = { games: 0, df: 0, f: 0, h: 0, dh: 0, rankSum: 0 };
    });
    return init;
  },

  saveAllCharStats(stats) {
    localStorage.setItem(this.ALL_CHAR_KEY, JSON.stringify(stats));
  },

  loadPlayerStats() {
    this.initSchema();
    const data = localStorage.getItem(this.PLAYER_STATS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.currentStreak === undefined) parsed.currentStreak = 0;
        if (parsed.maxStreak === undefined) parsed.maxStreak = 0;
        return parsed;
      } catch (e) {}
    }
    return {
      totalGames: 0,
      rankCounts: { '大富豪': 0, '富豪': 0, '貧民': 0, '大貧民': 0 },
      totalRankSum: 0,
      currentStreak: 0,
      maxStreak: 0,
      givenCards: 0,
      takenCards: 0,
      gekokujo: 0,
      cpuStats: {}
    };
  },

  savePlayerStats(stats) {
    localStorage.setItem(this.PLAYER_STATS_KEY, JSON.stringify(stats));
  },

  recordGameEnd(payload) {
    const statusMap = payload ? payload.playerStatusMap : playerStatusMap;
    const isAuto = payload ? payload.isAutoPlayMode : isAutoPlayMode;
    const prevRanks = payload ? payload.previousRanks : previousRanks;
    const hasUsedAuto = (typeof hasPlayerUsedAutoInMatch !== 'undefined' && hasPlayerUsedAutoInMatch);

    this.initSchema();
    const rankValues = { '大富豪': 1, '富豪': 2, '貧民': 3, '大貧民': 4 };
    const allCharStats = this.loadAllCharStats();

    PLAYERS.forEach(p => {
      const def = assignedCharacters[p];
      if (!def) return;
      const cid = def.id;

      if (p === 'player' && (!isAuto && !hasUsedAuto)) return;

      if (!allCharStats[cid]) allCharStats[cid] = { games: 0, df: 0, f: 0, h: 0, dh: 0, rankSum: 0 };
      const r = statusMap[p];
      allCharStats[cid].games++;
      if (r === '大富豪') { allCharStats[cid].df++; allCharStats[cid].rankSum += 1; }
      else if (r === '富豪') { allCharStats[cid].f++; allCharStats[cid].rankSum += 2; }
      else if (r === '貧民') { allCharStats[cid].h++; allCharStats[cid].rankSum += 3; }
      else if (r === '大貧民') { allCharStats[cid].dh++; allCharStats[cid].rankSum += 4; }
    });
    this.saveAllCharStats(allCharStats);

    if (!isAuto && !hasUsedAuto) {
      const pStats = this.loadPlayerStats();
      pStats.totalGames++;
      const myRank = statusMap.player;
      if (pStats.rankCounts[myRank] !== undefined) pStats.rankCounts[myRank]++;
      const myRankVal = rankValues[myRank] || 4;
      pStats.totalRankSum += myRankVal;

      if (myRank === '大富豪') {
        pStats.currentStreak = (pStats.currentStreak || 0) + 1;
        if (pStats.currentStreak > (pStats.maxStreak || 0)) pStats.maxStreak = pStats.currentStreak;
      } else {
        pStats.currentStreak = 0;
      }

      if (prevRanks.player === '大貧民' && myRank === '大富豪') pStats.gekokujo++;

      ['cpu1', 'cpu2', 'cpu3'].forEach(cpu => {
        const cpuChar = assignedCharacters[cpu];
        if (!cpuChar) return;
        const cpuId = cpuChar.id;
        if (!pStats.cpuStats[cpuId]) pStats.cpuStats[cpuId] = { games: 0, beatMe: 0 };
        pStats.cpuStats[cpuId].games++;
        if ((rankValues[statusMap[cpu]] || 4) < myRankVal) {
          pStats.cpuStats[cpuId].beatMe++;
        }
      });

      this.savePlayerStats(pStats);
    }
  },

  recordExchange(given, taken) {
    if (isAutoPlayMode) return;
    const pStats = this.loadPlayerStats();
    pStats.givenCards += given;
    pStats.takenCards += taken;
    this.savePlayerStats(pStats);
  },

  clearRankingOnly() {
    const init = {};
    Object.keys(CHARACTER_DEFS).forEach(id => {
      init[id] = { games: 0, df: 0, f: 0, h: 0, dh: 0, rankSum: 0 };
    });
    this.saveAllCharStats(init);
    console.log('👑 [GameStorage] 宮廷総合ランキングを初期化しました。');
  },

  clearPlayerOnly() {
    const init = {
      totalGames: 0,
      rankCounts: { '大富豪': 0, '富豪': 0, '貧民': 0, '大貧民': 0 },
      totalRankSum: 0,
      currentStreak: 0,
      maxStreak: 0,
      givenCards: 0,
      takenCards: 0,
      gekokujo: 0,
      cpuStats: {}
    };
    this.savePlayerStats(init);
    console.log('👤 [GameStorage] 個人通算戦績を初期化しました。');
  }
};
GameStorage.init();

/* ----------------------------------------------------
 * 6. 軽量堅牢・ローカルフォールバック思考ルーチン
 * ---------------------------------------------------- */
function decideCpuMove(cpu, explicitContext = null) {
  const ctx = explicitContext || {
    hands: (typeof hands !== 'undefined' ? hands : {}),
    fieldCards: (typeof fieldCards !== 'undefined' ? fieldCards : []),
    rev: (typeof effectiveReverse === 'function' ? effectiveReverse() : false),
    finished: (typeof finishedPlayers !== 'undefined' ? finishedPlayers : []),
    assigned: (typeof assignedCharacters !== 'undefined' ? assignedCharacters : {}),
    rules: getActiveGameRules()
  };

  const charDef = ctx.assigned[cpu] || CHARACTER_DEFS.KING;
  const hand = ctx.hands[cpu] || [];
  const field = ctx.fieldCards || [];
  const rev = ctx.rev;
  const isFieldEmpty = (field.length === 0);

  const rawMoves = getAllValidMoves(hand, field, rev, true, ctx.rules);
  const validMoves = filterCpuMovesForCharacter(charDef.id, rawMoves);

  if (validMoves.length === 0) return null;

  const currentRevState = (typeof isRevolution !== 'undefined') ? !!isRevolution : false;
  const instantWin = validMoves.find(m => m.length === hand.length && !isForbiddenFinish(m, currentRevState));
  if (instantWin) return instantWin;

  const profile = getCharacterTacticalProfile(charDef.id);

  const activeOthers = PLAYERS.filter(p => p !== cpu && !ctx.finished.includes(p));
  const otherLens = activeOthers.map(p => (ctx.hands[p] ? ctx.hands[p].length : 99));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOpponentReach = (minOppLen <= 2);

  // 他家リーチ時の迎撃ガード（8切りまたは支配札）
  if (isOpponentReach && !isFieldEmpty) {
    const eightMove = validMoves.find(m => m.some(c => normalizeCardRank(c) === '8'));
    if (eightMove) return eightMove;

    const strongBlocker = validMoves.find(m => m.some(c => c.isJoker || normalizeCardRank(c) === (rev ? '3' : '2')));
    if (strongBlocker && Math.random() < profile.R2_reachBlock) return strongBlocker;
  }

  // 手札形成スコアリング
  const scoredMoves = validMoves.map(m => {
    let score = (m.length * 20.0 * profile.R4_leadMulti) - getPlayStrength(m, rev);

    if (willLeadToForbiddenTrap(m, hand, currentRevState)) {
      score -= 99999.0;
    }

    if (m.some(c => normalizeCardRank(c) === '8')) {
      score += (isFieldEmpty ? -30.0 : 40.0) * profile.R6_eightCutBridge;
    }

    if (m.some(c => normalizeCardRank(c) === 'J')) {
      score += (rev ? 30.0 : -30.0) * profile.R7_elevenBackControl;
    }

    if (m.length >= 4) {
      score += 60.0 * profile.R8_plannedRevolution;
    }

    // 親番でのチケット単騎出し自滅抑制
    if (isFieldEmpty && hand.length >= 4 && m.length === 1) {
      const isTicket = m[0].isJoker || normalizeCardRank(m[0]) === (rev ? '3' : '2');
      if (isTicket) score -= (50.0 * profile.R5_trashCardClear);
    }

    return { move: m, score: score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  const bestChoice = scoredMoves[0].move;

  // スマートパス判断
  if (!isFieldEmpty && Math.random() < profile.R12_smartPass && hand.length > 3) {
    const isSingleHigh = bestChoice.length === 1 && (bestChoice[0].isJoker || normalizeCardRank(bestChoice[0]) === (rev ? '3' : '2'));
    if (isSingleHigh && !isOpponentReach) {
      return null;
    }
  }

  return bestChoice || (isFieldEmpty ? validMoves[0] : null);
}

/* ----------------------------------------------------
 * 7. リアルタイム勝率計算
 * ---------------------------------------------------- */
function calculateRealtimeWinRates() {
  const active = PLAYERS.filter(p => !finishedPlayers.includes(p));
  const rates = { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };

  finishedPlayers.forEach((p, idx) => {
    rates[p] = (idx === 0) ? 100 : 0;
  });

  if (finishedPlayers.length > 0 && rates[finishedPlayers[0]] === 100) {
    return { rates, topPlayer: finishedPlayers[0], topPct: 100, diffFromSecond: 100, isFinished: true };
  }

  const rev = effectiveReverse();
  const rawScores = {};

  active.forEach(p => {
    const h = hands[p] || [];
    const len = h.length;
    const turns = estimateTurnsToWin(h, rev);

    let s = Math.pow(15 / Math.max(1, len), 2.5) * 15 + Math.pow(10 / Math.max(1, turns), 2.3) * 20;
    h.forEach(c => {
      const k = getCardKey(c);
      if (c.isJoker) s += (len <= 5 ? 120 : 40);
      else if (k === '8') s += (len <= 5 ? 90 : 30);
      else if (k === '2') s += rev ? 15 : (len <= 5 ? 70 : 25);
      else if (k === 'A') s += rev ? 10 : 20;
      else if (k === '3') s += rev ? (len <= 5 ? 70 : 25) : 10;
    });

    if (len === 1) s *= 3.0;
    else if (len === 2) s *= 2.0;
    else if (len === 3) s *= 1.5;

    if (fieldCards.length === 0 && lastPlayedPlayer === p) s *= 1.25;
    rawScores[p] = Math.max(5, s);
  });

  let totalRaw = 0;
  active.forEach(p => totalRaw += rawScores[p]);

  const sorted = [];
  active.forEach(p => {
    const pct = Math.round((rawScores[p] / totalRaw) * 100);
    rates[p] = pct;
    sorted.push({ p, pct });
  });

  sorted.sort((a, b) => b.pct - a.pct);
  const topPlayer = sorted[0] ? sorted[0].p : 'player';
  const topPct = sorted[0] ? sorted[0].pct : 25;
  const secondPct = sorted.length > 1 ? sorted[1].pct : 0;

  let sum = 0;
  active.forEach(p => sum += rates[p]);
  if (sum !== 100 && active.length > 0) rates[topPlayer] += (100 - sum);

  return { rates, topPlayer, topPct: rates[topPlayer], diffFromSecond: topPct - secondPct, isFinished: false };
}

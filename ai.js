/* ====================================================================
 * ROYAL DAIFUGO - ai.js
 * [Version: v4.0.0 - Render対応型リアルタイム・ステータス完全同期版]
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

  flashBrainDot(playerKey, isOnline = true) {
    const charDef = (typeof assignedCharacters !== 'undefined') ? assignedCharacters[playerKey] : null;
    const effectiveCharId = charDef?.id;

    if (!isPythonServerTargetChar(effectiveCharId)) {
      this.clearBrainDot(playerKey);
      return;
    }
    this.setBrainDot(playerKey, true, isOnline);
    setTimeout(() => this.clearBrainDot(playerKey), 1200);
  },

  async pingServer(isSilent = false) {
    if (!this.isServerOnline) {
      this.set('waking', 'AI: サーバー起動中...');
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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
        console.log(`✅ [Pythonサーバー接続成功] モデル: ${data.hi2_name || 'hi2'} & ${data.gilgamesh_name || 'gilgamesh'}`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (!isSilent) console.warn(`⚠️ [ヘルスチェック未到達] サーバー未起動またはスリープ中: ${err.message}`);
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
 * 3. PyTorch深層学習サーバー通信（確実なオフライン保護版）
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

async function askPythonAI(hand, currentField, validMoves, modelType = 'super', playerKey = 'cpu2', activeGen = null) {
  const gen = (activeGen !== null) ? activeGen : currentSessionGeneration;

  if (!AIStatusUI.isServerOnline) {
    AIStatusUI.setBrainDot(playerKey, true, false);
    return decideCpuMove(playerKey);
  }

  AIStatusUI.set('thinking', 'AI: 思考中...');
  AIStatusUI.setBrainDot(playerKey, true, true);

  const charDef = assignedCharacters[playerKey] || CHARACTER_DEFS.SUPER_AI;
  const targetMoves = filterCpuMovesForCharacter(charDef.id, validMoves);

  const isHeavyMcts = (charDef.id === 'GILGAMESH' || charDef.id === 'AWAKENED_KING');
  const timeoutMs = isHeavyMcts ? 5000 : 3500;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const mySeat = PLAYERS.indexOf(playerKey);

    const payload = {
      modelType: 'super',
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
      console.log('[AI GHOST GUARD] 破棄されたセッションの推論結果を安全に無視しました。');
      AIStatusUI.clearBrainDot(playerKey);
      return null;
    }

    if (resData && resData.status === 'success') {
      AIStatusUI.isServerOnline = true;
      AIStatusUI.consecutiveFailures = 0;
      AIStatusUI.restoreIdleState();

      if (!resData.chosenMove) return null;
      return matchReturnedMoveWithHand(hand, resData.chosenMove);
    }
  } catch (err) {
    if (gen !== currentSessionGeneration) return null;
    console.warn(`[AI通信遅延/例外] ${charDef.name}: ${err.message} -> ローカル代替思考を実行`);

    AIStatusUI.consecutiveFailures = (AIStatusUI.consecutiveFailures || 0) + 1;
    if (AIStatusUI.consecutiveFailures >= 2) {
      AIStatusUI.isServerOnline = false;
      AIStatusUI.set('offline', 'AI: オフライン');
    } else {
      AIStatusUI.restoreIdleState();
    }
    AIStatusUI.setBrainDot(playerKey, true, false);
  }

  return decideCpuMove(playerKey);
}

/* ----------------------------------------------------
 * 4. AIデータロガー (AIDataLogger)
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
    if (c.isJoker) {
      const suit = c.suitSymbol || c.suit || '★';
      const jId = c.jokerId || (suit === '★' ? 'J1' : 'J2');
      return { suit: suit, rank: 'JOKER', isJoker: true, jokerId: jId };
    }
    return { suit: c.suitSymbol || c.suit, rank: c.display || c.rank, isJoker: false };
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
    if (this.stepLogs.length > 2000) this.stepLogs.shift();

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

  downloadFile(content, fileName, mimeType) {
    let safeMime = mimeType;
    if (fileName.endsWith('.jsonl')) safeMime = 'application/x-ndjson;charset=utf-8';
    else if (fileName.endsWith('.json')) safeMime = 'application/json;charset=utf-8';
    else if (fileName.endsWith('.csv')) safeMime = 'text/csv;charset=utf-8';
    else if (!safeMime) safeMime = 'application/octet-stream';

    const blob = new Blob([content], { type: safeMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.type = safeMime;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    setTimeout(updateFullscreenButtonsUI, 120);
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
      if (typeof ScenarioManager !== 'undefined' && ScenarioManager.isActive) {
        return;
      }
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
 * 6. キャラクター個別AI思考ルーチン ＆ 評価ヘルパー
 * ---------------------------------------------------- */
function evaluateHandFormation(move, hand, effRev = false, minOppLen = 99) {
  if (!move || !hand) return 0;
  const handLen = hand.length;
  const moveLen = move.length;

  if (moveLen === handLen) {
    if (isForbiddenFinish(move, effRev)) return -99999;
    return 200;
  }

  if (willLeaveOnlyForbiddenCards(move, hand, effRev) && minOppLen > 1) {
    return -99999;
  }

  const remHand = hand.filter(c => !move.some(mc => isSameCard(mc, c)));
  const remLen = remHand.length;
  if (remLen === 0) return 200;

  let score = 0;

  if (remLen === 1) {
    if (isForbiddenFinish(remHand, effRev)) score -= 120;
    else score += 40;
  } else if (remLen === 2) {
    if (remHand.every(c => isForbiddenFinish([c], effRev))) score -= 80;
  }

  const origGroups = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      const k = c.display || c.rank;
      origGroups[k] = (origGroups[k] || 0) + 1;
    }
  });

  const remGroups = {};
  let remJokers = 0;
  remHand.forEach(c => {
    if (c.isJoker) remJokers++;
    else {
      const k = c.display || c.rank;
      remGroups[k] = (remGroups[k] || 0) + 1;
    }
  });

  if (handLen >= 5 && minOppLen > 2 && moveLen === 1 && !move[0].isJoker) {
    const disp = move[0].display || move[0].rank;
    const origCount = origGroups[disp] || 0;
    if (origCount >= 2) {
      score -= (origCount === 2 ? 22 : 35);
    }
  }

  if (remLen >= 3 && minOppLen > 2) {
    const hasBossRem = (
      remJokers > 0 ||
      remHand.some(c => (c.display || c.rank) === (effRev ? '3' : '2')) ||
      remHand.some(c => (c.display || c.rank) === '8')
    );
    if (hasBossRem) {
      score += 15;
    } else {
      score -= 20;
    }
  }

  if (moveLen === 1 && !move[0].isJoker) {
    const disp = move[0].display || move[0].rank;
    if ((origGroups[disp] || 0) === 1 && getCardStrength(move[0], effRev) <= 7) {
      score += 12;
    }
  }

  const groupCount = Object.keys(remGroups).length;
  const effectiveTurns = groupCount + (remJokers > 0 && groupCount === 0 ? 1 : 0);
  score -= (effectiveTurns * 3.5);

  return score;
}

function isJokerWasteMove(move, hand) {
  if (!move || !hand) return false;
  if (move.length === hand.length) return false;

  const hasJ = move.some(c => c.isJoker);
  const hasNJ = move.some(c => !c.isJoker);

  if (hasJ && hasNJ && move.length < 4) return true;
  if (hasJ && !hasNJ && move.length >= 2 && hand.length >= 4) return true;

  return false;
}

function evaluateEightBridge(move, hand, minOppLen, isOppReach, isFieldEmpty = false, effRev = false) {
  if (!move || !move.some(c => (c.display || c.rank) === '8')) return 0;
  const handLen = hand.length;
  if (move.length === handLen) {
    return isForbiddenFinish(move, effRev) ? -99999 : 130;
  }

  if (isFieldEmpty && handLen >= 4) {
    return -45;
  }

  const remHand = hand.filter(c => !move.some(mc => isSameCard(mc, c)));
  const remLen = remHand.length;

  if (isOppReach) return 70;

  const remGroups = {};
  let remJokers = 0;
  remHand.forEach(c => {
    if (c.isJoker) remJokers++;
    else {
      const k = c.display || c.rank;
      remGroups[k] = (remGroups[k] || 0) + 1;
    }
  });

  const canFinishNext = (
    remLen === 1 ||
    (Object.keys(remGroups).length === 1 && remJokers === 0) ||
    (Object.keys(remGroups).length === 0 && remJokers > 0)
  );
  if (canFinishNext) {
    if (!isForbiddenFinish(remHand, effRev)) return 95;
  }

  if (handLen >= 6) {
    const hasStrongFollowup = (
      remJokers > 0 ||
      remHand.some(c => (c.display || c.rank) === '2') ||
      Object.values(remGroups).some(cnt => cnt >= 2)
    );
    if (!hasStrongFollowup) return -35;
  }

  return isFieldEmpty ? -25 : 20;
}

function evaluateElevenBackBalance(move, hand, effRev) {
  if (!move || !move.some(c => (c.display || c.rank) === 'J')) return 0;
  const remHand = hand.filter(c => !move.some(mc => isSameCard(mc, c)));
  if (remHand.length === 0) return 15;

  const lowBeneficial = remHand.filter(c => !c.isJoker && getCardValue(c) <= 4).length;
  const highRuined = remHand.filter(c => !c.isJoker && getCardValue(c) >= 11).length;

  if (!effRev) {
    if (lowBeneficial >= 3 && highRuined <= 1) return 30;
    else if (highRuined >= 2) return -45;
  } else {
    if (highRuined >= 2) return 35;
    else if (lowBeneficial >= 2) return -35;
  }
  return 0;
}

function evaluateRevolutionImpact(move, hand, currentRev, minOppLen = 99) {
  if (!move || move.length < 4) return 0;
  const willBeRev = !currentRev;

  if (move.length === hand.length) {
    if (isForbiddenFinish(move, willBeRev)) return -99999;
    return 120;
  }

  const remHand = hand.filter(c => !move.some(mc => isSameCard(mc, c)));
  if (remHand.length === 0) return 120;

  if (minOppLen <= 2) return 20;

  const normalStrongCount = remHand.filter(c => !c.isJoker && getCardValue(c) >= 11).length;
  const revStrongCount = remHand.filter(c => !c.isJoker && getCardValue(c) <= 5).length;

  if (willBeRev) {
    if (normalStrongCount >= 3 && revStrongCount <= 1) return -70;
    if (normalStrongCount >= 2 && revStrongCount === 0) return -60;
    if (revStrongCount >= 3 && normalStrongCount <= 1) return 40;
  } else {
    if (normalStrongCount >= 2) return 45;
    if (revStrongCount >= 3 && normalStrongCount === 0) return -50;
  }
  return 0;
}

function evaluateMoveDefault(move, hand = null, isFieldEmpty = false, rev = false, minOppLen = 99, customRules = null, playedHistory = [], charProfile = null) {
  if (!move || move.length === 0) return -999;
  const rules = getActiveGameRules(customRules);
  const profile = charProfile || {
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

  if (hand && move.length === hand.length) {
    if (isForbiddenFinishMove(move, hand, rules, rev)) {
      return -99999;
    }
    return 500;
  }

  if (hand && willLeaveOnlyForbiddenCards(move, hand, rev) && minOppLen > 1) {
    return -99999;
  }

  const count = move.length;
  const nonJ = move.filter(c => !c.isJoker);
  const val = nonJ.length > 0 ? getCardValue(nonJ[0]) : 14;

  const multiMultiplier = count >= 2 ? (0.6 + profile.R4_leadMulti * 0.5) : 1.0;
  let score = ((count * 10) * multiMultiplier) - val;

  if (hand) {
    if (isJokerWasteMove(move, hand)) {
      score -= 55;
    }

    const isOppReach = (minOppLen <= 2);
    score += evaluateEightBridge(move, hand, minOppLen, isOppReach, isFieldEmpty, rev) * profile.R6_eightCutBridge;
    score += evaluateElevenBackBalance(move, hand, rev) * profile.R7_elevenBackControl;

    if (move.length >= 4) {
      score += evaluateRevolutionImpact(move, hand, rev, minOppLen) * profile.R8_plannedRevolution;
    }

    if (rules.spade3 && move.length === 1 && move[0].isJoker && !rev) {
      const myHasSpade3 = hand.some(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
      const playedHasSpade3 = playedHistory.some(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
      if (!myHasSpade3 && !playedHasSpade3 && hand.length >= 3) {
        score -= (40 * profile.R11_spade3Alert);
      }
    }

    if (isFieldEmpty && hand.length >= 4 && move.length === 1) {
      const isSoloJoker = move[0].isJoker;
      const isSoloTwo = (!move[0].isJoker && (move[0].display === '2' || move[0].rank === '2'));
      if (isSoloJoker || isSoloTwo) {
        const hasLowOrMid = hand.some(c => !c.isJoker && getCardValue(c) <= 10);
        if (hasLowOrMid) {
          score -= (50 + (profile.R5_trashCardClear * 25));
        }
      }
    }
  }

  return score;
}

function shouldStrategicPassOnHighCard(move, hand, field, rev, minOppLen, charProfile = null) {
  if (!field || field.length === 0) return false;
  if (!move || move.length === 0) return false;

  const profile = charProfile || { R12_smartPass: 0.75, R2_reachBlock: 0.80 };
  const handLen = hand.length;
  const isOpponentReach = (minOppLen <= 2);

  if (isOpponentReach) {
    if (RandomManager.random() < profile.R2_reachBlock) {
      return false;
    }
  }

  if (profile.R12_smartPass <= 0.05) {
    return false;
  }

  if (handLen <= 3) return false;
  if (move.length === handLen) return false;

  if (isJokerWasteMove(move, hand) && handLen >= 4) {
    return true;
  }

  const isSoloJoker = (move.length === 1 && move[0].isJoker);
  const isSoloTwo = (move.length === 1 && !move[0].isJoker && (move[0].display === '2' || move[0].rank === '2'));

  if (isSoloJoker || isSoloTwo) {
    const lowCardsCount = hand.filter(c => !c.isJoker && getCardValue(c) <= 7).length;
    if (lowCardsCount >= 2) {
      return (RandomManager.random() < profile.R12_smartPass);
    }
    const fieldTopVal = field[0].isJoker ? 14 : getCardValue(field[0]);
    if (fieldTopVal <= 11) {
      return (RandomManager.random() < profile.R12_smartPass);
    }
  }

  return false;
}

function findSafeInstantWin(validMoves, hand, rules, rev) {
  if (!validMoves || validMoves.length === 0 || !hand) return null;
  const wins = validMoves.filter(m => m.length === hand.length);
  if (wins.length === 0) return null;
  const safeWins = wins.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  return safeWins.length > 0 ? safeWins[0] : null;
}

/* [0] 👑 ギルガメッシュ */
function decideGilgameshClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('GILGAMESH');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('GILGAMESH', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  const unrevealed = getUnrevealedCards(hand, played, field);
  const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 6);
  if (endgameMove) return endgameMove;

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOppReach = (minOppLen <= 2);

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  if (isOppReach && !isFieldEmpty) {
    const eights = poolMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
    if (eights.length > 0) return eights[0];

    const reachSeats = activeOthers.filter(p => (allHands[p] ? allHands[p].length : 99) <= 2);
    const threatCards = reachSeats.flatMap(s => allHands[s] || []);

    const solidBlockers = poolMoves.filter(m => 
      threatCards.every(tc => !isValidPlay([tc], m, rev))
    );

    if (solidBlockers.length > 0) {
      solidBlockers.sort((a, b) => (b.length * 100) - getCardStrength(b[0], rev));
      return solidBlockers[0];
    }

    const sorted = [...poolMoves].sort((a, b) => getCardStrength(b[0], rev) - getCardStrength(a[0], rev));
    return sorted[0];
  }

  if (isFieldEmpty) {
    if (handLen <= 3) {
      const multi = poolMoves.filter(m => m.length >= 2);
      if (multi.length > 0) {
        multi.sort((a, b) => (b.length * 100) + getCardStrength(b[0], rev) - (a.length * 100 + getCardStrength(a[0], rev)));
        return multi[0];
      }
      poolMoves.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return poolMoves[0];
    }

    const unWasteMoves = poolMoves.filter(m => !isJokerWasteMove(m, hand));
    const pool = unWasteMoves.length > 0 ? unWasteMoves : poolMoves;

    const nonEightPool = pool.filter(m => !(m.length === 1 && (m[0].display || m[0].rank) === '8' && handLen >= 4));
    const usePool = nonEightPool.length > 0 ? nonEightPool : pool;

    const quads = usePool.filter(m => m.length >= 4);
    if (quads.length > 0) return quads[0];

    const triples = usePool.filter(m => m.length === 3);
    if (triples.length > 0) {
      triples.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return triples[0];
    }

    const pairs = usePool.filter(m => m.length === 2);
    if (pairs.length > 0) {
      pairs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return pairs[0];
    }

    const lowSingles = usePool.filter(m => m.length === 1 && !m[0].isJoker && getCardStrength(m[0], rev) <= 10);
    if (lowSingles.length > 0) {
      lowSingles.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return lowSingles[0];
    }

    usePool.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
    return usePool[0];
  }

  const filteredValid = poolMoves.filter(m => !isJokerWasteMove(m, hand));
  const cands = filteredValid.length > 0 ? filteredValid : poolMoves;

  let bestM = null, bestS = -9999;
  for (const m of cands) {
    let s = evaluateMoveDefault(m, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    const isEight = m.some(c => (c.display || c.rank) === '8');

    if (isEight) {
      s += isOppReach ? 80 : 35;
    }

    if (handLen <= 4 && (m.some(c => c.isJoker || (c.display === '2' || c.rank === '2')))) {
      s += 40;
    }

    if (s > bestS) {
      bestS = s;
      bestM = m;
    }
  }

  const chosen = bestM || cands[0];
  if (shouldStrategicPassOnHighCard(chosen, hand, field, rev, minOppLen, profile)) {
    return null;
  }

  return chosen;
}

/* [1] 🤴 覚醒新王 */
function decideAwakenedYoungKingClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('AWAKENED_KING');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('AWAKENED_KING', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 5);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  let bestMove = null;
  let bestScore = -999;

  for (let move of poolMoves) {
    let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    if (move.length >= 4) s += 25;
    if (isJokerWasteMove(move, hand)) s -= 50;

    if (!isFieldEmpty && move.some(c => (c.display || c.rank) === '8') && (minOppLen <= 3 || handLen <= 4)) {
      s += 18;
    }

    s += evaluateHandFormation(move, hand, rev, minOppLen) * 1.0;

    if (s > bestScore) {
      bestScore = s;
      bestMove = move;
    }
  }

  const chosenMove = bestMove || poolMoves[0];
  if (shouldStrategicPassOnHighCard(chosenMove, hand, field, rev, minOppLen, profile)) {
    return null;
  }

  return chosenMove;
}

/* [2] 👸 女王 */
function decideQueenClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('SUPER_AI');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('SUPER_AI', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 4);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOppReach = (minOppLen <= 2);

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  let bestMove = null;
  let bestScore = -9999;
  for (const m of poolMoves) {
    let s = evaluateMoveDefault(m, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    s += evaluateEightBridge(m, hand, minOppLen, isOppReach, isFieldEmpty, rev) * profile.R6_eightCutBridge;
    s += evaluateElevenBackBalance(m, hand, rev) * profile.R7_elevenBackControl;

    if (isOppReach && !isFieldEmpty) {
      if (m.some(c => (c.display || c.rank) === '8')) s += 85;
      else if (m.some(c => c.isJoker || (c.display === '2' || c.rank === '2'))) s += 50;
    }

    if (s > bestScore) {
      bestScore = s;
      bestMove = m;
    }
  }

  const chosen = bestMove || poolMoves[0];
  if (shouldStrategicPassOnHighCard(chosen, hand, field, rev, minOppLen, profile)) {
    return null;
  }
  return chosen;
}

/* [3] 🏰 王 */
function decideKingClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('KING');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('KING', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 5);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOppReach = (minOppLen <= 2);

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  if (isOppReach && !isFieldEmpty) {
    const eightMove = poolMoves.find(m => m.some(c => (c.display || c.rank) === '8'));
    if (eightMove) return eightMove;

    const sorted = [...poolMoves].sort((a, b) => (b.length * 100) + getCardStrength(b[0], rev) - ((a.length * 100) + getCardStrength(a[0], rev)));
    return sorted[0];
  }

  const groups = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      const k = c.display || c.rank;
      groups[k] = (groups[k] || 0) + 1;
    }
  });

  if (isFieldEmpty) {
    const quads = poolMoves.filter(m => m.length >= 4);
    if (quads.length > 0) return quads[0];

    const triples = poolMoves.filter(m => m.length === 3);
    if (triples.length > 0) {
      triples.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return triples[0];
    }

    const pairs = poolMoves.filter(m => m.length === 2);
    if (pairs.length > 0) {
      pairs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return pairs[0];
    }
  }

  let bestM = null, bestS = -9999;
  for (const m of poolMoves) {
    let s = evaluateMoveDefault(m, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    const mLen = m.length;
    const disp = m[0].display || m[0].rank;

    if (mLen >= 4) {
      s += 55.0;
    } else if (mLen === 3) {
      s += 24.0;
    } else if (mLen === 2) {
      s += 18.0;
    } else if (mLen === 1) {
      if (!m[0].isJoker && (groups[disp] || 0) >= 2) s -= 45.0;
      if (getCardStrength(m[0], rev) <= 8) s += 8.0;
    }

    if (isJokerWasteMove(m, hand)) s -= 50.0;

    if (!isFieldEmpty && m.some(c => (c.display || c.rank) === '8') && (minOppLen <= 3 || handLen <= 4)) {
      s += 20.0;
    }

    s += evaluateHandFormation(m, hand, rev, minOppLen) * 0.8;

    if (s > bestS) {
      bestS = s;
      bestM = m;
    }
  }

  const chosen = bestM || poolMoves[0];
  if (shouldStrategicPassOnHighCard(chosen, hand, field, rev, minOppLen, profile)) {
    return null;
  }
  return chosen;
}

/* [4] ⚔️ 織田信長 */
function decideNobunagaClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('NOBUNAGA');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('NOBUNAGA', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 4);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  const groups = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      const k = c.display || c.rank;
      groups[k] = (groups[k] || 0) + 1;
    }
  });

  const quads = poolMoves.filter(m => m.length >= 4);
  if (quads.length > 0) {
    if (handLen === quads[0].length && !isForbiddenFinishMove(quads[0], hand, rules, rev)) return quads[0];
    const remaining = hand.filter(c => !quads[0].some(qc => isSameCard(qc, c)));
    if (rev) {
      const normalHigh = remaining.filter(c => c.isJoker || getCardValue(c) >= 11).length;
      const revHigh = remaining.filter(c => !c.isJoker && getCardValue(c) <= 5).length;
      if (normalHigh >= revHigh || minOppLen <= 2) return quads[0];
    } else {
      const lowCount = remaining.filter(c => !c.isJoker && getCardValue(c) <= 5).length;
      const highCount = remaining.filter(c => c.isJoker || getCardValue(c) >= 12).length;
      if (lowCount >= highCount || minOppLen <= 2) return quads[0];
    }
  }

  const eightMoves = poolMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
  if (eightMoves.length > 0 && field.length > 0) {
    if (minOppLen <= 2 || handLen <= 5) return eightMoves[0];
    const hasMultiFollowup = Object.values(groups).some(cnt => cnt >= 2);
    if (hasMultiFollowup) return eightMoves[0];
  }

  if (field.length === 0) {
    if (minOppLen === 1) {
      const multi = poolMoves.filter(m => m.length >= 2);
      if (multi.length > 0) {
        multi.sort((a, b) => (b.length !== a.length ? b.length - a.length : getCardStrength(b[0], rev) - getCardStrength(a[0], rev)));
        return multi[0];
      }
    }

    const triples = poolMoves.filter(m => m.length === 3);
    if (triples.length > 0) {
      triples.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return triples[0];
    }
    const pairs = poolMoves.filter(m => m.length === 2);
    if (pairs.length > 0) {
      pairs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return pairs[0];
    }
  }

  let bestMove = null;
  let bestScore = -999;
  for (let move of poolMoves) {
    let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    if (move.length >= 4) s += 55;
    else if (move.length === 3) s += 26;
    else if (move.length === 2) s += 18;
    else if (move.length === 1) {
      const k = move[0].display || move[0].rank;
      if (!move[0].isJoker && (groups[k] || 0) >= 2) s -= 48;
      if (getCardStrength(move[0], rev) <= 7) s += 10;
    }

    if (isJokerWasteMove(move, hand)) s -= 50;

    if (s > bestScore) {
      bestScore = s;
      bestMove = move;
    }
  }

  return bestMove || poolMoves[0];
}

/* [5] 🏛️ 秦の始皇帝 */
function decideShiHuangdiClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('SHI_HUANGDI');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('SHI_HUANGDI', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 6);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOppReach = (minOppLen <= 2);

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  const groups = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      const k = c.display || c.rank;
      groups[k] = (groups[k] || 0) + 1;
    }
  });

  const quads = poolMoves.filter(m => m.length >= 4);
  if (quads.length > 0) {
    if (handLen === quads[0].length && !isForbiddenFinishMove(quads[0], hand, rules, rev)) return quads[0];
    const remaining = hand.filter(c => !quads[0].some(qc => isSameCard(qc, c)));
    if (rev) {
      const normalHigh = remaining.filter(c => c.isJoker || getCardValue(c) >= 11).length;
      const revHigh = remaining.filter(c => !c.isJoker && getCardValue(c) <= 5).length;
      if (normalHigh >= revHigh || minOppLen <= 2) return quads[0];
    } else {
      const lowCount = remaining.filter(c => !c.isJoker && getCardValue(c) <= 5).length;
      const highCount = remaining.filter(c => c.isJoker || getCardValue(c) >= 12).length;
      if (lowCount >= highCount || minOppLen <= 2) return quads[0];
    }
  }

  const eightMoves = poolMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
  if (eightMoves.length > 0 && field.length > 0) {
    if (isOppReach || handLen <= 5) return eightMoves[0];
    if (evaluateEightBridge(eightMoves[0], hand, minOppLen, isOppReach, isFieldEmpty, rev) > 0) return eightMoves[0];
  }

  if (field.length === 0) {
    if (minOppLen === 1) {
      const multi = poolMoves.filter(m => m.length >= 2);
      if (multi.length > 0) {
        multi.sort((a, b) => (b.length !== a.length ? b.length - a.length : getCardStrength(b[0], rev) - getCardStrength(a[0], rev)));
        return multi[0];
      }
    }

    const triples = poolMoves.filter(m => m.length === 3);
    if (triples.length > 0) {
      triples.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return triples[0];
    }
    const pairs = poolMoves.filter(m => m.length === 2);
    if (pairs.length > 0) {
      pairs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return pairs[0];
    }
  }

  let cands = poolMoves;
  if (field.length > 0 && handLen > 3) {
    const nonTicket = poolMoves.filter(m => !(m.length === 1 && (m[0].isJoker || (rev ? (m[0].display === '3' || m[0].rank === '3') : (m[0].display === '2' || m[0].rank === '2')))));
    if (nonTicket.length > 0) cands = nonTicket;
  }

  let bestMove = null;
  let bestScore = -999;
  for (let move of cands) {
    let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    if (move.length >= 4) s += 55;
    else if (move.length === 3) s += 24;
    else if (move.length === 2) s += 18;
    else if (move.length === 1) {
      const k = move[0].display || move[0].rank;
      if (!move[0].isJoker && (groups[k] || 0) >= 2) s -= 48;
      if (handLen >= 4 && (move[0].isJoker || getCardValue(move[0]) >= 13)) s -= 50;
      else if (getCardStrength(move[0], rev) <= 8) s += 8;
    }

    if (isJokerWasteMove(move, hand)) s -= 60;

    if (s > bestScore) {
      bestScore = s;
      bestMove = move;
    }
  }

  const chosenMove = bestMove || poolMoves[0];
  if (shouldStrategicPassOnHighCard(chosenMove, hand, field, rev, minOppLen, profile)) {
    return null;
  }

  if (field.length > 0 && bestScore < -8 && minOppLen >= 4) return null;
  return chosenMove;
}

/* [6] 🔮 聖徳太子 */
function decideShotokuClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('SHOTOKU');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('SHOTOKU', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 5);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOppReach = (minOppLen <= 2);

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  const groups = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      const k = c.display || c.rank;
      groups[k] = (groups[k] || 0) + 1;
    }
  });

  const quads = poolMoves.filter(m => m.length >= 4);
  if (quads.length > 0) {
    if (rev) {
      const normalHighCount = hand.filter(c => c.isJoker || getCardValue(c) >= 11).length;
      const revHighCount = hand.filter(c => !c.isJoker && getCardValue(c) <= 4).length;
      if (normalHighCount >= revHighCount || minOppLen <= 2) {
        return quads[0];
      }
      const elevens = poolMoves.filter(m => m.some(c => (c.display || c.rank) === 'J'));
      if (elevens.length > 0) return elevens[0];
    } else {
      const remaining = hand.filter(c => !quads[0].some(qc => isSameCard(qc, c)));
      if (remaining.length === 0) return quads[0];
      const revStrong = remaining.filter(c => c.isJoker || getCardValue(c) <= 5).length;
      const revWeak = remaining.filter(c => !c.isJoker && getCardValue(c) >= 9).length;
      if (revStrong >= revWeak || minOppLen <= 2) {
        return quads[0];
      }
    }
  }

  if (field.length === 0) {
    if (minOppLen <= 2) {
      const multi = poolMoves.filter(m => m.length >= 2);
      if (multi.length > 0) {
        multi.sort((a, b) => (b.length !== a.length ? b.length - a.length : getCardStrength(b[0], rev) - getCardStrength(a[0], rev)));
        return multi[0];
      }
    }
    const pairs = poolMoves.filter(m => m.length >= 2);
    if (pairs.length > 0) {
      pairs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return pairs[0];
    }
  }

  if (isOppReach && field.length > 0) {
    const blockers = poolMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
    if (blockers.length > 0) return blockers[0];
  }

  const unWasteMoves = poolMoves.filter(m => !(m.length === 1 && !m[0].isJoker && (groups[m[0].display || m[0].rank] || 0) >= 2 && handLen > 2));
  const cands = unWasteMoves.length > 0 ? unWasteMoves : poolMoves;

  let bestMove = null;
  let bestScore = -999;
  for (let move of cands) {
    let s = (move.length * 100) - getCardStrength(move[0], rev);
    s += evaluateEightBridge(move, hand, minOppLen, isOppReach, isFieldEmpty, rev) * profile.R6_eightCutBridge;
    s += evaluateElevenBackBalance(move, hand, rev) * profile.R7_elevenBackControl;
    if (s > bestScore) {
      bestScore = s;
      bestMove = move;
    }
  }

  const chosenMove = bestMove || cands[0];
  if (field.length > 0 && shouldStrategicPassOnHighCard(chosenMove, hand, field, rev, minOppLen, profile)) {
    return null;
  }

  return chosenMove;
}

/* [7] 🛡️ アレク王 */
function decideAlexanderHybridClient(cpuKey, hand, field, rev, allHands, finished, played, lastPlayer, passCount) {
  const rules = getActiveGameRules();
  const profile = getCharacterTacticalProfile('ALEXANDER');
  const rawMoves = getAllValidMoves(hand, field, rev);
  const valid = filterCpuMovesForCharacter('ALEXANDER', rawMoves);
  if (valid.length === 0) return null;

  const instantWin = findSafeInstantWin(valid, hand, rules, rev);
  if (instantWin) return instantWin;

  if (RandomManager.random() < profile.R14_endgameSolverDepth) {
    const unrevealed = getUnrevealedCards(hand, played, field);
    const endgameMove = solveEndgameWinningSequence(hand, field, unrevealed, rev, rules, 7);
    if (endgameMove) return endgameMove;
  }

  if (field.length === 1 && (field[0].isJoker || field[0].rank === 'JOKER' || field[0].display === 'JOKER')) {
    const spade3 = hand.find(c => !c.isJoker && (c.suitSymbol === '♠' || c.suit === '♠') && (c.display === '3' || c.rank === '3'));
    if (spade3) return [spade3];
  }

  const handLen = hand.length;
  const isFieldEmpty = (field.length === 0);
  const activeOthers = PLAYERS.filter(p => p !== cpuKey && !finished.includes(p));
  const otherLens = activeOthers.map(p => (allHands[p] ? allHands[p].length : 0));
  const minOppLen = otherLens.length > 0 ? Math.min(...otherLens) : 99;
  const isOppReach = (minOppLen <= 2);

  const safeMoves = valid.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : valid) : valid;

  const groups = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      const k = c.display || c.rank;
      groups[k] = (groups[k] || 0) + 1;
    }
  });

  const quads = poolMoves.filter(m => m.length >= 4);
  if (quads.length > 0) {
    if (handLen === quads[0].length && !isForbiddenFinishMove(quads[0], hand, rules, rev)) return quads[0];
    const remaining = hand.filter(c => !quads[0].some(qc => isSameCard(qc, c)));
    if (rev) {
      const normalHigh = remaining.filter(c => c.isJoker || getCardValue(c) >= 11).length;
      const revHigh = remaining.filter(c => !c.isJoker && getCardValue(c) <= 5).length;
      if (normalHigh >= revHigh || minOppLen <= 2) return quads[0];
    } else {
      const lowCount = remaining.filter(c => !c.isJoker && getCardValue(c) <= 5).length;
      const highCount = remaining.filter(c => c.isJoker || getCardValue(c) >= 12).length;
      if (lowCount >= highCount || minOppLen <= 2) return quads[0];
    }
  }

  const eights = poolMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
  if (eights.length > 0 && field.length > 0) {
    if (isOppReach || handLen <= 5) return eights[0];
    if (evaluateEightBridge(eights[0], hand, minOppLen, isOppReach, isFieldEmpty, rev) > 0) return eights[0];
  }

  if (field.length === 0) {
    if (minOppLen === 1) {
      const multi = poolMoves.filter(m => m.length >= 2);
      if (multi.length > 0) {
        multi.sort((a, b) => (b.length !== a.length ? b.length - a.length : getCardStrength(b[0], rev) - getCardStrength(a[0], rev)));
        return multi[0];
      }
    }

    const triples = poolMoves.filter(m => m.length === 3);
    if (triples.length > 0) {
      triples.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return triples[0];
    }
    const pairs = poolMoves.filter(m => m.length === 2);
    if (pairs.length > 0) {
      pairs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
      return pairs[0];
    }
  }

  let bestMove = null;
  let bestScore = -999;
  for (let move of poolMoves) {
    let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOppLen, rules, played, profile);
    if (move.length >= 4) s += 60;
    else if (move.length === 3) s += 28;
    else if (move.length === 2) s += 18;
    else if (move.length === 1) {
      const k = move[0].display || move[0].rank;
      if (!move[0].isJoker && (groups[k] || 0) >= 2) s -= 45;
      if ((move[0].isJoker || getCardValue(move[0]) >= 13) && handLen >= 4 && minOppLen >= 3) s -= 45;
      else if (getCardStrength(move[0], rev) <= 8) s += 8;
    }

    if (isJokerWasteMove(move, hand)) s -= 50;

    if (s > bestScore) {
      bestScore = s;
      bestMove = move;
    }
  }

  const chosenMove = bestMove || poolMoves[0];
  if (shouldStrategicPassOnHighCard(chosenMove, hand, field, rev, minOppLen, profile)) {
    return null;
  }

  if (field.length > 0 && bestScore < -6 && minOppLen >= 4) return null;
  return chosenMove;
}

/* 知性派貴族・防衛動員令＆スマート選択ルーチン */
function selectMoveByCharacterDef(charDef, hand, currentField, rev, otherCounts, canPass, unrevealedCards, nextPlayerHandCount, customRules = null, playedHistory = []) {
  const rules = getActiveGameRules(customRules);
  const profile = getCharacterTacticalProfile(charDef.id);
  const rawMoves = getAllValidMoves(hand, currentField, rev);
  const validMoves = filterCpuMovesForCharacter(charDef.id, rawMoves);
  if (validMoves.length === 0) return null;

  const instantWinningMove = findSafeInstantWin(validMoves, hand, rules, rev);
  if (instantWinningMove) {
    return instantWinningMove;
  }

  if (profile.R14_endgameSolverDepth >= 0.30 && RandomManager.random() < profile.R14_endgameSolverDepth) {
    const depth = charDef.id === 'SCHOLAR' ? 6 : 4;
    const endgameMove = solveEndgameWinningSequence(hand, currentField, unrevealedCards, rev, rules, depth);
    if (endgameMove) return endgameMove;
  }

  const isFieldEmpty = (!currentField || currentField.length === 0);
  const minOpp = otherCounts && otherCounts.length > 0 ? Math.min(...otherCounts) : 99;
  const isOpponentsDangerous = (minOpp <= 2);
  const isEarlyOrMid = (hand.length >= 6);

  const safeMoves = validMoves.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
  const poolMoves = (safeMoves.length > 0 || isFieldEmpty) ? (safeMoves.length > 0 ? safeMoves : validMoves) : validMoves;

  switch (charDef.id) {
    case 'BEGINNER_AI': {
      let bestMove = null, bestScore = -999;
      for (let move of poolMoves) {
        let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile);
        if (move.length >= 3) s += 25;
        else if (move.length === 2) s += 15;
        if (!isFieldEmpty && move.some(c => (c.display || c.rank) === '8') && isOpponentsDangerous) s += 40;
        if (isEarlyOrMid && move.some(c => c.isJoker || (c.display === '2' || c.rank === '2'))) s -= 30;

        s += evaluateHandFormation(move, hand, rev, minOpp) * 0.6;

        if (s > bestScore) { bestScore = s; bestMove = move; }
      }

      const cand = bestMove || poolMoves[0];
      if (shouldStrategicPassOnHighCard(cand, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      return (canPass && bestScore < -8 && !isOpponentsDangerous) ? null : cand;
    }

    case 'DUKE': {
      const dukeValid = poolMoves.filter(m => !isJokerWasteMove(m, hand));
      const useMoves = dukeValid.length > 0 ? dukeValid : poolMoves;

      if (isOpponentsDangerous && !isFieldEmpty) {
        const eights = useMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
        if (eights.length > 0) return eights[0];
        useMoves.sort((a, b) => (b.length * 100 + getCardValue(b[0])) - (a.length * 100 + getCardValue(a[0])));
        return useMoves[0];
      }

      if (isFieldEmpty) {
        const nonEightMoves = useMoves.filter(m => !(m.length === 1 && (m[0].display || m[0].rank) === '8' && hand.length >= 4));
        const cands = nonEightMoves.length > 0 ? nonEightMoves : useMoves;

        const lowCands = cands.filter(m => !m.some(c => c.isJoker || (c.display === '2' || c.rank === '2') || (c.display === 'A' || c.rank === 'A')));
        const finalPool = (lowCands.length > 0 && hand.length >= 3) ? lowCands : cands;

        finalPool.sort((a, b) => {
          if (b.length !== a.length) return b.length - a.length;
          return getCardValue(a[0]) - getCardValue(b[0]);
        });
        return finalPool[0] || useMoves[0];
      }

      const isStrongCard = (c) => c.isJoker || (c.display === 'A' || c.rank === 'A') || (c.display === '2' || c.rank === '2');
      const highCards = hand.filter(isStrongCard);
      const otherCards = hand.filter(c => !isStrongCard(c));
      const canClearAll = highCards.length >= otherCards.length;

      let filtered = useMoves;
      if (!canClearAll) {
        filtered = useMoves.filter(m => !m.some(isStrongCard));
      }

      if (filtered.length === 0) {
        return canPass && !isOpponentsDangerous ? null : useMoves[0];
      }
      filtered.sort((a, b) => evaluateMoveDefault(b, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile) - evaluateMoveDefault(a, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile));
      const chosen = filtered[0] || useMoves[0];
      if (canPass && shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      return chosen;
    }

    case 'MARQUIS': {
      const marquisValid = poolMoves.filter(m => !isJokerWasteMove(m, hand));
      const useMoves = marquisValid.length > 0 ? marquisValid : poolMoves;

      let bestMove = null, bestScore = -999;
      for (let move of useMoves) {
        let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile);
        const hasJoker = move.some(c => c.isJoker);
        const hasTwo = move.some(c => (c.display === '2' || c.rank === '2'));

        if (isEarlyOrMid && !isOpponentsDangerous) {
          if (hasJoker) s -= 35;
          else if (hasTwo) s -= 20;
        }

        if (s > bestScore) { bestScore = s; bestMove = move; }
      }
      const chosen = bestMove || useMoves[0];
      if (canPass && (bestScore < -6 || shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile)) && !isOpponentsDangerous) {
        return null;
      }
      return chosen;
    }

    case 'COUNT': {
      const isLate = hand.length <= 5;
      const countValid = poolMoves.filter(m => !isJokerWasteMove(m, hand));
      const useMoves = countValid.length > 0 ? countValid : poolMoves;

      let bestMove = null, bestScore = -999;
      for (let move of useMoves) {
        const hasSuperStrong = move.some(c => c.isJoker || (c.display === '2' || c.rank === '2'));
        let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile);

        if (isLate) {
          s += (move.length * 15);
          if (hasSuperStrong && hand.length > move.length) {
            s -= 40;
          }
        } else {
          if (hasSuperStrong) {
            s -= isOpponentsDangerous ? 10 : 35;
          }
        }

        if (s > bestScore) { bestScore = s; bestMove = move; }
      }
      const chosen = bestMove || useMoves[0];
      if (canPass && !isLate && !isOpponentsDangerous && (bestScore < -15 || shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile))) {
        return null;
      }
      return chosen;
    }

    case 'KNIGHT': {
      if (poolMoves.length === 0) return null;

      if (isFieldEmpty) {
        const nonSuper = poolMoves.filter(m => !(m.length === 1 && (m[0].isJoker || (m[0].display === '2' || m[0].rank === '2') || ((m[0].display === '8' || m[0].rank === '8') && hand.length >= 5)) && hand.length > 1));
        const pool = nonSuper.length > 0 ? nonSuper : poolMoves;
        const sorted = [...pool].sort((a, b) => {
          if (!a || !a[0]) return 1;
          if (!b || !b[0]) return -1;
          const strA = getCardStrength(a[0], rev);
          const strB = getCardStrength(b[0], rev);
          if (strA !== strB) return strA - strB;
          return b.length - a.length;
        });
        return sorted[0] || poolMoves[0];
      }

      const safeKnightMoves = poolMoves.filter(m => !isJokerWasteMove(m, hand));
      const pool = safeKnightMoves.length > 0 ? safeKnightMoves : poolMoves;

      const scoredMoves = pool.map(m => {
        let score = 100 - getCardStrength(m[0], rev);
        score += evaluateElevenBackBalance(m, hand, rev) * profile.R7_elevenBackControl;
        if (m.length >= 4) {
          score += evaluateRevolutionImpact(m, hand, rev, minOpp) * profile.R8_plannedRevolution;
        }
        return { move: m, score };
      });
      scoredMoves.sort((a, b) => b.score - a.score);

      const candidate = scoredMoves[0] ? scoredMoves[0].move : pool[0];

      if (canPass && shouldStrategicPassOnHighCard(candidate, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      return candidate || poolMoves[0];
    }

    case 'MERCHANT': {
      const groups = {};
      hand.forEach(c => {
        const k = getCardKey(c);
        groups[k] = (groups[k] || 0) + 1;
      });

      let bestMove = poolMoves[0], bestScore = -999;
      for (let move of poolMoves) {
        let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile);
        if (move.length === 2) s += 30;
        if (move.length >= 3) s += 35;
        if (move.length === 1 && groups[getCardKey(move[0])] >= 2 && !isFieldEmpty && hand.length > 3) {
          s -= 25;
        }
        if (s > bestScore) { bestScore = s; bestMove = move; }
      }

      const chosen = bestMove || poolMoves[0];
      if (canPass && shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      return chosen;
    }

    case 'SCHOLAR': {
      const scholarValid = poolMoves.filter(m => !isJokerWasteMove(m, hand));
      const useMoves = scholarValid.length > 0 ? scholarValid : poolMoves;

      if (isOpponentsDangerous && !isFieldEmpty) {
        const eights = useMoves.filter(m => m.some(c => (c.display || c.rank) === '8'));
        if (eights.length > 0) return eights[0];
        const highs = useMoves.filter(m => m[0].isJoker || (m[0].display === '2' || m[0].rank === '2') || (m[0].display === 'A' || m[0].rank === 'A'));
        if (highs.length > 0) {
          highs.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
          return highs[0];
        }
      }

      const safe = useMoves.filter(m => isGuaranteedAbsoluteWin(m, unrevealedCards, rev));
      if (safe.length > 0) {
        if (isOpponentsDangerous || hand.length <= 4) {
          safe.sort((a, b) => (b.length !== a.length ? b.length - a.length : evaluateMoveDefault(b, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile) - evaluateMoveDefault(a, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile)));
          return safe[0] || useMoves[0];
        }
      }

      let filtered = useMoves;
      if (isEarlyOrMid && !isOpponentsDangerous && canPass) {
        const nonSuper = useMoves.filter(m => !m.some(c => c.isJoker || (c.display === '2' || c.rank === '2')));
        if (nonSuper.length > 0) {
          filtered = nonSuper;
        } else {
          return null;
        }
      }

      if (!filtered || filtered.length === 0) filtered = useMoves;
      filtered.sort((a, b) => evaluateMoveDefault(b, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile) - evaluateMoveDefault(a, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile));
      const chosen = filtered[0] || useMoves[0];
      if (canPass && shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      return chosen;
    }

    case 'STRATEGIST': {
      const stratValid = poolMoves.filter(m => !isJokerWasteMove(m, hand));
      const useMoves = stratValid.length > 0 ? stratValid : poolMoves;

      const safeWins = useMoves.filter(m => isGuaranteedAbsoluteWin(m, unrevealedCards, rev));
      if (safeWins.length > 0) {
        safeWins.sort((a, b) => b.length - a.length);
        return safeWins[0];
      }

      if (isFieldEmpty) {
        const nonEightMoves = useMoves.filter(m => !(m.some(c => (c.display || c.rank) === '8') && hand.length > m.length));
        const cands = nonEightMoves.length > 0 ? nonEightMoves : useMoves;

        const multi = cands.filter(m => m.length >= 2);
        if (multi.length > 0) {
          multi.sort((a, b) => {
            if (b.length !== a.length) return b.length - a.length;
            return getCardStrength(a[0], rev) - getCardStrength(b[0], rev);
          });
          return multi[0];
        }

        const safeSingles = cands.filter(m => !m[0].isJoker && (m[0].display !== '2' && m[0].rank !== '2'));
        const pool = safeSingles.length > 0 ? safeSingles : cands;
        pool.sort((a, b) => getCardStrength(a[0], rev) - getCardStrength(b[0], rev));
        return pool[0] || useMoves[0];
      }

      let bestMove = null, bestScore = -999;
      for (let move of useMoves) {
        let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile);

        if (isOpponentsDangerous) {
          if (move.some(c => (c.display || c.rank) === '8')) {
            s += 70;
          } else if (move.some(c => (c.display === '2' || c.rank === '2'))) {
            s += 35;
          } else if (move.some(c => c.isJoker)) {
            s += (move.length === hand.length) ? 80 : 15;
          }
        } else {
          if (move.some(c => c.isJoker || (c.display === '2' || c.rank === '2'))) {
            s -= 30;
          }
        }

        if (s > bestScore) { bestScore = s; bestMove = move; }
      }
      const chosen = bestMove || useMoves[0];
      if (canPass && shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      if (!isOpponentsDangerous && canPass && bestScore < 0) return null;
      return chosen;
    }

    case 'REVOLUTIONARY': {
      const quad = poolMoves.find(m => m.length >= 4);
      if (quad && isFieldEmpty) {
        const remaining = hand.filter(c => !quad.some(qc => isSameCard(qc, c)));
        if (remaining.length === 0 && !isForbiddenFinishMove(quad, hand, rules, rev)) return quad;

        const revFavored = remaining.filter(c => !c.isJoker && getCardValue(c) <= 6).length;
        const revUnfavored = remaining.filter(c => !c.isJoker && getCardValue(c) >= 11).length;
        if (revFavored >= revUnfavored || revUnfavored <= 1 || minOpp <= 2) {
          return quad;
        }
      }

      let bestMove = poolMoves[0], bestScore = -999;
      for (let move of poolMoves) {
        let s = evaluateMoveDefault(move, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile);
        if (move.length >= 4) s += 45;
        if (move.some(c => (c.display || c.rank) === '8')) {
          if (move.length === hand.length) s += 120;
          else if (!isFieldEmpty || isOpponentsDangerous || hand.length <= 5) s += 50;
          else if (isFieldEmpty && hand.length >= 6) s -= 40;
        }
        if (s > bestScore) { bestScore = s; bestMove = move; }
      }
      const chosen = bestMove || poolMoves[0];
      if (canPass && shouldStrategicPassOnHighCard(chosen, hand, currentField, rev, minOpp, profile)) {
        return null;
      }
      return chosen;
    }

    case 'JESTER': {
      const sixCardMove = poolMoves.find(m => m.length === 6);
      if (sixCardMove && RandomManager.random() < 0.85) return sixCardMove;

      if (RandomManager.random() < 0.35) {
        if (canPass && RandomManager.random() < 0.45) return null;
        const move2 = poolMoves.find(m => m.some(c => (c.display === '2' || c.rank === '2')));
        if (move2 && !isEarlyOrMid) return move2;
        return poolMoves[Math.floor(RandomManager.random() * poolMoves.length)] || poolMoves[0];
      }
      poolMoves.sort((a, b) => evaluateMoveDefault(b, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile) - evaluateMoveDefault(a, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile));
      return poolMoves[0];
    }

    default:
      poolMoves.sort((a, b) => evaluateMoveDefault(b, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile) - evaluateMoveDefault(a, hand, isFieldEmpty, rev, minOpp, rules, playedHistory, profile));
      return poolMoves[0];
  }
}

/* ----------------------------------------------------
 * 7. CPU・プレイヤー代行 手番決定
 * ---------------------------------------------------- */
function decideCpuMove(cpu, explicitContext = null) {
  const ctx = explicitContext || {
    hands: (typeof hands !== 'undefined' ? hands : {}),
    fieldCards: (typeof fieldCards !== 'undefined' ? fieldCards : []),
    rev: (typeof effectiveReverse === 'function' ? effectiveReverse() : false),
    finished: (typeof finishedPlayers !== 'undefined' ? finishedPlayers : []),
    playedHistory: (typeof playedCardsHistory !== 'undefined' ? playedCardsHistory : []),
    lastPlayer: (typeof lastPlayedPlayer !== 'undefined' ? lastPlayedPlayer : null),
    passes: (typeof consecutivePasses !== 'undefined' ? consecutivePasses : 0),
    assigned: (typeof assignedCharacters !== 'undefined' ? assignedCharacters : {}),
    rules: getActiveGameRules()
  };

  const rules = ctx.rules || getActiveGameRules();
  const charDef = ctx.assigned[cpu] || CHARACTER_DEFS.KING;
  const hand = ctx.hands[cpu] || [];
  const field = ctx.fieldCards || [];
  const rev = ctx.rev;
  const rawMoves = getAllValidMoves(hand, field, rev);
  const validMoves = filterCpuMovesForCharacter(charDef.id, rawMoves);
  const canPass = field.length > 0;

  if (validMoves.length === 0) return null;

  let chosen = null;
  const cid = charDef.id;

  if (cid === 'GILGAMESH') {
    chosen = decideGilgameshClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'AWAKENED_KING') {
    chosen = decideAwakenedYoungKingClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'SUPER_AI') {
    chosen = decideQueenClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'KING') {
    chosen = decideKingClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'NOBUNAGA') {
    chosen = decideNobunagaClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'SHOTOKU') {
    chosen = decideShotokuClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'SHI_HUANGDI') {
    chosen = decideShiHuangdiClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else if (cid === 'ALEXANDER') {
    chosen = decideAlexanderHybridClient(cpu, hand, field, rev, ctx.hands, ctx.finished, ctx.playedHistory, ctx.lastPlayer, ctx.passes);
  } else {
    const nextIdx = (PLAYERS.indexOf(cpu) + 1) % PLAYERS.length;
    const nextCount = ctx.hands[PLAYERS[nextIdx]] ? ctx.hands[PLAYERS[nextIdx]].length : 10;
    const otherCounts = PLAYERS.filter(p => p !== cpu && !ctx.finished.includes(p)).map(p => (ctx.hands[p] ? ctx.hands[p].length : 0));
    const unrevealed = getUnrevealedCards(hand, ctx.playedHistory, field);
    chosen = selectMoveByCharacterDef(charDef, hand, field, rev, otherCounts, canPass, unrevealed, nextCount, rules, ctx.playedHistory);
  }

  // 親番フォールバック
  if (field.length === 0 && (!chosen || chosen.length === 0)) {
    const safeInstant = validMoves.filter(m => !isForbiddenFinishMove(m, hand, rules, rev));
    chosen = safeInstant.length > 0 ? safeInstant[0] : validMoves[0];
  }

  return chosen !== undefined ? chosen : validMoves[0];
}

/* ----------------------------------------------------
 * 8. リアルタイム勝率計算
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

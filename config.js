/* ====================================================================
 * ROYAL DAIFUGO - config.js
 * [Version: v4.1.6 - マイキャラ選択美術刷新・プレイヤーセリフ完全1行化＆音響確実アンロック版]
 * ==================================================================== */

const APP_VERSION = 'v4.1.6';
const VERSION_HISTORY = [
  {
    ver: 'v4.1.6',
    date: '2026-10-16',
    title: 'マイキャラ選択美術刷新・プレイヤーセリフ完全1行化＆音響確実アンロック版',
    changes: [
      'シナリオモードのマイキャラ選択画面を宮廷美術調へ刷新（スマホ時の左右2分割化による空白根絶、タブレット時の縦間延び解消＆肖像画拡大）',
      '対局中のプレイヤー吹き出し（セリフ）が絵柄右上から改行されず1行で堂々と表示されるようCSSおよび表示幅を最適化',
      'ブラウザ自動再生制限（Autoplay）対策を強化し、初回タップ・対戦開始時のBGM再生を100%確実にアンロックするよう音響エンジンを修復',
      'シナリオモードで幼姫（シャーロット）および科学者（フランツ）選択時の座席キャラ名表示を「幼姫（あなた）」「科学者（あなた）」へ完全統一',
      'シナリオモードの初期規定対戦数を「5試合勝負」に同期固定し、キャラ紹介モーダルに新マイキャラ2名の解説カードを正式配備'
    ],
    files: ['config.js', 'common.css', 'game.css', 'audio.js', 'index.html', 'scenario.js', 'main.js']
  },
  {
    ver: 'v4.1.5',
    date: '2026-10-15',
    title: 'カード交換セーブ完全保護・禁止あがり警告残留解消＆極小画面レスポンシブ適正化',
    changes: [
      'カード交換画面での中断・リロード時に献上予定カードが消失し手札枚数が欠損する重大なセーブデータ不整合を完全根絶',
      '禁止あがり事前警告バナー（player-foul-alert）表示後、カード選択を解除した際に画面中央に警告が残留し続けるUIバグを解消',
      '画面幅360px以下の極小スマートフォンにおいて、左右CPU席がグリッド列幅（70px）を突き破ってはみ出すCSS計算破綻を適正化',
      'セーブデータ（練習・通常対戦）のロード復元時にシナリオモードフラグを確実に解除し、モード越境による画面表示競合を防止',
      'main.jsとrules.jsに跨がって存在していた実質逆転判定関数（effectiveReverse）の重複定義を整理・一本化'
    ],
    files: ['config.js', 'game.css', 'main.js']
  },
  {
    ver: 'v4.1.4',
    date: '2026-10-15',
    title: 'スマホ対戦盤面完全修復・ギルガメッシュ直通エピローグ＆プロ総点検バグ一掃',
    changes: [
      'スマホ画面における中央祭壇カードの上下切れ・シャドウ見切れを完全解消（カード枠88px拡張・オーバーフロー表示適正化）',
      '関門突破リザルト上部の勝者プレート（肖像画・称号・名前）の右寄りズレを補正し、完全中央シンメトリー化',
      '対戦画面限定でギルガメッシュの座席名および打牌メッセージを「ギルガメ」と短縮表示（公式解説・マップ等は正式名を維持）',
      'ギルガメッシュ撃破直後に感動のエピローグADV会話劇へ直通させ、周回挑戦（最初から挑む）ボタンを確実に復旧',
      '革命中に11バックが発動して場が流れた際、手札が平時順に戻ってしまうソート崩壊バグを完全根絶',
      'プレイヤー手番中の「代行: ON/OFF」カチャカチャ切り替え時に発生していたAI着手タイマー誤爆・スタックを防止',
      'シナリオ途中決着グラフの凡例でプレイヤーアバターのアイコンが「undefined」になる不具合を修正',
      'リプレイ画面において都落ち脱落者が手札を保持して抜けた局面の検証用オーバーレイ表示を追加'
    ],
    files: ['config.js', 'game.css', 'scenario.js', 'main.js']
  },
  {
    version: 'v4.1.3',
    date: '2026-10-14',
    title: '初期画面カルーセル配置修復 ＆ 実質逆転判定基盤配備',
    changes: [
      'スタート画面「操作キャラ」「対戦相手」カードの巨大化バグを修正（82px×116px厳格固定・1画面収容横スクロール復元）',
      'rules.js に未定義参照を防御する安全な実質逆転判定関数 effectiveReverse() を新規配備',
      '極小画面端末におけるタップ領域と横スクロール挙動の最適化'
    ],
    files: ['common.css', 'rules.js', 'config.js']
  },
  {
    ver: 'v4.1.2',
    date: '2026-10-07',
    title: 'Tailscale/ローカルPC直接保存の完全復旧・実効逆転フラグ一元化・全モード整合性統一',
    changes: [
      'Tailscale経由（100.x.x.x）アクセス時にアクセス元ホストを動的解決し、PC上の logs/ フォルダへの直接格納を完全復旧',
      'Render環境（HTTPS）アクセス時のMixed Content遮断を事前回避し、安全なブラウザダウンロード/回収センターへ自動整流化',
      'ai.jsにおけるオンライン判定誤検知による保存APIスキップ不具合を撤廃し、HTTP環境下での即時直接保存を実現',
      'rules.js・ai.js・server.py間で実効逆転（effectiveReverse = isRevolution !== isElevenBack）の判定基準を100%完全同期',
      '革命中11バック相殺時におけるAI思考のカード強度誤認バグおよび反則あがり判定の二重管理を解消',
      '練習・観戦・シナリオの全3モードにおいて都落ち・反則負け発生時の手番委譲ループを堅牢化しフリーズを防止'
    ],
    files: ['config.js', 'rules.js', 'ai.js', 'server.py', 'main.js']
  },
  {
    ver: 'v4.1.1',
    date: '2026-10-07',
    title: 'オープニング音響100%確実再生化・AI性格ロジック完全同期・振り返り自己矛盾根絶',
    changes: [
      'オープニングBGMのAutoplay制限回避とメインBGM排他制御を実装し、初回開宴時の100%確実再生を実現',
      '伯爵・商人等の個別思考ルーチンへ定石プロファイル（CHARACTER_TACTICAL_PROFILES）数値を完全反映',
      'AI稼働中ランプの表示色（Python推論: 水色点滅 / ローカル思考: ゴールド点灯）を実態と完全同期',
      '振り返りモードにおいて不可抗力（90%）判定局での反省・要検討バッジ出現を完全遮断し自己矛盾を根絶',
      'rules.jsの禁止あがり判定をルール設定トグルと厳格連動させ、OFF時のAI過剰自滅パスを防止',
      'main.jsのモジュール分割境界を最適化し、スクリプト結合時のSyntaxError構文破損リスクを完全排除'
    ],
    files: ['config.js', 'audio.js', 'rules.js', 'ai.js', 'scenario.js', 'main.js', 'game.css', 'common.css', 'index.html']
  },
  {
    ver: 'v4.1.0',
    date: '2025-02-17',
    title: '全画面維持オープニング完全統合＆打牌即時応答・シナリオグラフ連動',
    changes: [
      'opening.htmlをindex.htmlへ単一ページ(SPA)完全統合し、全画面モードのシームレス維持を実現',
      'オープニングの3Dカルーセル肖像画を拡大し、優雅な4.8秒間隔・極上減速イージングモーションを適用',
      'オープニングBGM（bgm_opening.mp3）の最優先指定と初回開宴タップによる100%確実再生を実装',
      'プレイヤー手番時の軽微な残留ロックをパージし、カード選択後の即時打牌レスポンスを劇的改善',
      'シナリオモードの関門制覇（CHAMPION）画面に全試合の順位推移折れ線グラフを完全連動描画',
      'ローカル(file://)実行時のセキュリティブロックを根絶し、画像参照パスをfugo-絵柄/へ完全統一'
    ],
    files: ['config.js', 'index.html', 'game.css', 'scenario.js', 'main.js', 'audio.js', 'ai.js', 'rules.js']
  },
  {
    ver: 'v4.0.0',
    date: '2026-10-05',
    title: 'シネマティック・プロローグ全面超豪華リニューアル＆3Dカルーセル演出統合',
    changes: [
      '【独自黄金碑文ロゴ】平坦な画像ロゴを撤廃し、ヨーロッパ王宮碑文フォント（Cinzel）による立体黄金グラデーションの重厚テキストロゴを構築',
      '【リアル・トランプ3Dファン】本編と全く同じ構造・デザイン（太陽/月JOKER、♦3、♠A、♥2）の美麗トランプを扇状に立体展開',
      '【3D円軌道・回転カルーセル】キャラクター名刺プレートが立体空間を滑らかに旋回移動し（左➔中央主役➔右➔奥待機）、約3.2秒間隔で美しく交代するシネマティック演出を実装',
      '【戦術名セリフ動的ポップアップ】難解な専門用語を排し、プレイスタイルと性格が直感的に伝わる名セリフ＆戦術肩書を中央キャラと完全同期してカットイン表示',
      '【各モード特色ハイライトバッジ】「AI代行」「神速倍速＆勝率予想」「英傑永続アンロック」の象徴エンブレムと大富豪特殊役光彩バナーを配備',
      '【音響＆制御の堅牢化】bgm-opening.mp3を最優先とする三重安全BGM再生、自動再訪インターバルの1週間化、画面タップによるフルスクリーン自動リクエストを統合'
    ],
    files: ['opening.html', 'index.html', 'game.css', 'config.js']
  },
  {
    ver: 'v3.9.8',
    date: '2026-10-05',
    title: 'カード強度完全正規化・禁止あがり詰み警告UI刷新・トランプ用語統一',
    changes: [
      'カード強度判定エンジンを刷新し、平時Kに対するAの着手判定バグおよびプロパティ揺れを完全根絶',
      '手札の残りが禁止カードのみになる詰みルートを事前検知する「willLeaveOnlyForbiddenCards」判定を新設',
      '禁止あがり警告を中央メッセージから除外し、手番バッジ右隣への美麗パルス警告バッジ表示へ集約',
      'ルール解説モーダルの表示順を初心者向けに体系的再編（基本➔特殊役➔競技ルール）',
      '将棋・麻雀用語（棋譜・牌・連荘等）を公式トランプ用語へ完全統一（親・親番・親権は親しみやすさ重視で維持）'
    ],
    files: ['config.js', 'rules.js', 'main.js', 'index.html', 'game.css']
  },
  {
    ver: 'v3.9.7',
    date: '2026-10-04',
    title: '確定カルテ一元管理による自己矛盾根絶＆アラート警告全廃',
    changes: [
      '【試合確定カルテ】を新設し、総評・処方箋・手番判定を完全連動させ自己矛盾（モグラたたき）を根絶',
      '不可抗力90%の局では理不尽なダメ出し・反省警告カードを構造的に完全停止',
      '大貧民時の「回避成功」などのチグハグを解消し、順位（1〜4位）×カルテの完全マトリクス解説へ刷新',
      '好手・反省手ボタン押下時の不快なブラウザalert警告を全廃し、アドバイザー欄での上品なインライン案内に統一',
      '【敵軍の脅威】および【勝敗を分けた最大の山場】を盤面ファクト直結の6〜7パターンへ拡充'
    ],
    files: ['main.js']
  }
];

/* ----------------------------------------------------
 * 日時フォーマット生成ヘルパー
 * ---------------------------------------------------- */
function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

/* ============================================================
 * 0. ゲームイベント通知ハブ (GameEventManager)
 * 基幹対局エンジンと各ゲームモード（通常/練習/観戦/シナリオ）の完全分離
 * ============================================================ */
const GameEventManager = {
  listeners: {},

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  },

  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
  },

  emit(eventName, payload) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EVENT ERROR] Event '${eventName}' handler exception:`, err);
      }
    });
  }
};

/* ----------------------------------------------------
 * 0.1 画面内デバッグロガー（直近60件・超軽量化）
 * ---------------------------------------------------- */
const InAppLogger = {
  maxEntries: 60,
  logs: [],

  init() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog.apply(console, args);
      this.addEntry('info', args);
    };
    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.addEntry('warn', args);
    };
    console.error = (...args) => {
      originalError.apply(console, args);
      this.addEntry('error', args);
    };

    window.addEventListener('error', (e) => {
      this.addEntry('error', [`[JS Exception] ${e.message} at ${e.filename}:${e.lineno}`]);
    });
  },

  formatTime() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  },

  addEntry(type, args) {
    const timeStr = this.formatTime();
    const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    
    let actualType = type;
    if (text.includes('[推論]') || text.includes('PyTorch') || text.includes('AIモデル')) {
      actualType = 'ai';
    }

    this.logs.push({ time: timeStr, type: actualType, text: text });
    if (this.logs.length > this.maxEntries) this.logs.shift();

    const container = document.getElementById('debug-log-container');
    if (container) {
      const entryEl = document.createElement('div');
      entryEl.className = `log-entry ${actualType}`;
      entryEl.innerHTML = `<span class="log-time">${timeStr}</span>${text}`;
      container.appendChild(entryEl);
      container.scrollTop = container.scrollHeight;
    }
  },

  clear() {
    this.logs = [];
    const container = document.getElementById('debug-log-container');
    if (container) container.innerHTML = '';
  },

  copyAll() {
    const fullText = this.logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      alert('ログをクリップボードにコピーしました！');
    }).catch(() => {
      prompt('ログを全選択してコピーしてください:', fullText);
    });
  }
};
InAppLogger.init();

/* ----------------------------------------------------
 * 進行タイマー管理（重複防止マネージャー）
 * ---------------------------------------------------- */
const GameTimer = {
  activeTimerIds: new Set(),

  set(fn, delay) {
    const id = setTimeout(() => {
      this.activeTimerIds.delete(id);
      fn();
    }, delay);
    this.activeTimerIds.add(id);
    return id;
  },

  clear(id) {
    if (id) {
      clearTimeout(id);
      this.activeTimerIds.delete(id);
    }
  },

  clearAll() {
    const hadTimers = this.activeTimerIds.size > 0;
    this.activeTimerIds.forEach(id => clearTimeout(id));
    this.activeTimerIds.clear();
    if (hadTimers) {
      console.log('[TIMER] 盤面アニメーションの待機タイマーを初期化しました。');
    }
  }
};

/* ----------------------------------------------------
 * 1. 設定・定数・キャラクター定義（PC直接格納＆Tailscale/Render動的解決版）
 * ---------------------------------------------------- */
const RENDER_BACKEND_URL = 'https://daifugo-game2.onrender.com';
const LOCAL_BACKEND_URL = 'http://127.0.0.1:5000';

function resolveBackendBaseUrl() {
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (protocol === 'http:' && origin && origin !== 'null') {
    return origin.includes(':5000') ? origin : `http://${hostname}:5000`;
  }
  if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    return LOCAL_BACKEND_URL;
  }
  return RENDER_BACKEND_URL;
}

let AI_SERVER_BASE_URL = resolveBackendBaseUrl();
console.log(`[SYSTEM] Target API Backend (Resolved): ${AI_SERVER_BASE_URL}`);

const CONFIG = {
  BASE_SPEED: 1,
  ENABLE_AI_DATA_LOGGING: true,
  PYTHON_HEALTH_URL: `${AI_SERVER_BASE_URL}/health`,
  PYTHON_AI_URL: `${AI_SERVER_BASE_URL}/predict`,
  PYTHON_SAVE_LOG_URL: `${AI_SERVER_BASE_URL}/save_practice_log`,
  COLORS: {
    player: '#2196f3',
    cpu1: '#4caf50',
    cpu2: '#d4af37',
    cpu3: '#e91e63'
  }
};

/* ----------------------------------------------------
 * 大富豪基幹ルール設定（動的ON/OFF切り替え対応）
 * ---------------------------------------------------- */
const DEFAULT_GAME_RULES = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  spade3: true,
  suitBinding: false,
  capitalFall: true,
  forbiddenFinish: true,
  sequence: false
};

let gameRules = { ...DEFAULT_GAME_RULES };

/* ----------------------------------------------------
 * プレイヤー操作アシスト・ゲーム設定
 * ---------------------------------------------------- */
const GAME_SETTINGS = {
  forbiddenFinishAlert: true
};

/* ----------------------------------------------------
 * 公式ルール解説データ
 * ---------------------------------------------------- */
const RULE_EXPLANATIONS = {
  capitalFall: {
    title: '都落ち（みやこおち）',
    desc: '前回の試合で【大富豪】だったプレイヤーが、次の試合で連続1位になれなかった（他の誰かが先にあがった）瞬間、即座に失格となり第4位（大貧民）へ転落します。'
  },
  forbiddenFinish: {
    title: '禁止あがり（反則負け）',
    desc: '手札の最後の1手として以下のカードを出してあがることは反則です。違反したプレイヤーはその時点で即失格（最下位確定）となります。\n・JOKER（単騎・ペア含む全て）\n・8（単騎・ペア含む全て）\n・最強数字（通常時は「2」、革命時は「3」）\n・♠3単騎（通常時）'
  },
  cardExchange: {
    title: '階級によるカード交換',
    desc: '第2試合以降のゲーム開始時、階級に応じてカードを交換します。\n・大富豪 ⇆ 大貧民：大貧民は【最強カード2枚】を献上し、大富豪は【不要なカード2枚】を譲渡。\n・富豪 ⇆ 貧民：貧民は【最強カード1枚】を献上し、富豪は【不要なカード1枚】を譲渡。'
  }
};

/* ----------------------------------------------------
 * キャラクター別 定石パーセント設定値
 * ---------------------------------------------------- */
const CHARACTER_TACTICAL_PROFILES = {
  GILGAMESH: {
    R2_reachBlock: 1.00,
    R3_capitalFallDefense: 1.00,
    R4_leadMulti: 0.95,
    R5_trashCardClear: 0.95,
    R6_eightCutBridge: 1.00,
    R7_elevenBackControl: 1.00,
    R8_plannedRevolution: 0.95,
    R9_revolutionCounter: 1.00,
    R10_suitLockAwareness: 0.70,
    R11_spade3Alert: 1.00,
    R12_smartPass: 0.90,
    R14_endgameSolverDepth: 1.00
  },
  SHI_HUANGDI: {
    R2_reachBlock: 0.85,
    R3_capitalFallDefense: 0.90,
    R4_leadMulti: 1.00,
    R5_trashCardClear: 1.00,
    R6_eightCutBridge: 0.90,
    R7_elevenBackControl: 1.00,
    R8_plannedRevolution: 0.85,
    R9_revolutionCounter: 0.40,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.85,
    R14_endgameSolverDepth: 0.60
  },
  SUPER_AI: {
    R2_reachBlock: 0.85,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 0.70,
    R5_trashCardClear: 0.75,
    R6_eightCutBridge: 0.75,
    R7_elevenBackControl: 0.90,
    R8_plannedRevolution: 0.60,
    R9_revolutionCounter: 0.50,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.90,
    R12_smartPass: 0.95,
    R14_endgameSolverDepth: 0.70
  },
  ALEXANDER: {
    R2_reachBlock: 0.80,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 1.00,
    R5_trashCardClear: 0.80,
    R6_eightCutBridge: 0.95,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.85,
    R9_revolutionCounter: 0.40,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.75,
    R14_endgameSolverDepth: 0.60
  },
  SHOTOKU: {
    R2_reachBlock: 1.00,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 0.80,
    R5_trashCardClear: 0.85,
    R6_eightCutBridge: 0.80,
    R7_elevenBackControl: 1.00,
    R8_plannedRevolution: 0.80,
    R9_revolutionCounter: 1.00,
    R10_suitLockAwareness: 0.60,
    R11_spade3Alert: 1.00,
    R12_smartPass: 0.80,
    R14_endgameSolverDepth: 0.70
  },
  NOBUNAGA: {
    R2_reachBlock: 0.85,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 1.00,
    R5_trashCardClear: 0.80,
    R6_eightCutBridge: 1.00,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.85,
    R9_revolutionCounter: 0.40,
    R10_suitLockAwareness: 0.40,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.50,
    R14_endgameSolverDepth: 0.60
  },
  BEGINNER_AI: {
    R2_reachBlock: 0.80,
    R3_capitalFallDefense: 0.80,
    R4_leadMulti: 0.90,
    R5_trashCardClear: 0.80,
    R6_eightCutBridge: 0.80,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.75,
    R9_revolutionCounter: 0.40,
    R10_suitLockAwareness: 0.40,
    R11_spade3Alert: 0.80,
    R12_smartPass: 0.80,
    R14_endgameSolverDepth: 0.75
  },
  KING: {
    R2_reachBlock: 0.95,
    R3_capitalFallDefense: 0.90,
    R4_leadMulti: 0.85,
    R5_trashCardClear: 0.80,
    R6_eightCutBridge: 0.85,
    R7_elevenBackControl: 0.85,
    R8_plannedRevolution: 0.80,
    R9_revolutionCounter: 0.45,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.90,
    R12_smartPass: 0.85,
    R14_endgameSolverDepth: 0.85
  },
  AWAKENED_KING: {
    R2_reachBlock: 0.85,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 0.85,
    R5_trashCardClear: 0.80,
    R6_eightCutBridge: 0.85,
    R7_elevenBackControl: 0.85,
    R8_plannedRevolution: 0.80,
    R9_revolutionCounter: 0.50,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.80,
    R14_endgameSolverDepth: 0.80
  },
  DUKE: {
    R2_reachBlock: 1.00,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 0.60,
    R5_trashCardClear: 0.50,
    R6_eightCutBridge: 0.80,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.50,
    R9_revolutionCounter: 0.30,
    R10_suitLockAwareness: 0.40,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.95,
    R14_endgameSolverDepth: 0.40
  },
  MARQUIS: {
    R2_reachBlock: 0.75,
    R3_capitalFallDefense: 0.80,
    R4_leadMulti: 0.50,
    R5_trashCardClear: 0.60,
    R6_eightCutBridge: 0.60,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.50,
    R9_revolutionCounter: 0.30,
    R10_suitLockAwareness: 0.40,
    R11_spade3Alert: 0.85,
    R12_smartPass: 1.00,
    R14_endgameSolverDepth: 0.30
  },
  COUNT: {
    R2_reachBlock: 0.75,
    R3_capitalFallDefense: 0.80,
    R4_leadMulti: 0.60,
    R5_trashCardClear: 0.60,
    R6_eightCutBridge: 0.85,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.50,
    R9_revolutionCounter: 0.30,
    R10_suitLockAwareness: 0.40,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.90,
    R14_endgameSolverDepth: 0.40
  },
  KNIGHT: {
    R2_reachBlock: 0.40,
    R3_capitalFallDefense: 0.50,
    R4_leadMulti: 0.00,
    R5_trashCardClear: 1.00,
    R6_eightCutBridge: 0.50,
    R7_elevenBackControl: 0.70,
    R8_plannedRevolution: 0.10,
    R9_revolutionCounter: 0.10,
    R10_suitLockAwareness: 0.10,
    R11_spade3Alert: 0.80,
    R12_smartPass: 0.00,
    R14_endgameSolverDepth: 0.10
  },
  MERCHANT: {
    R2_reachBlock: 0.40,
    R3_capitalFallDefense: 0.50,
    R4_leadMulti: 1.00,
    R5_trashCardClear: 0.20,
    R6_eightCutBridge: 0.60,
    R7_elevenBackControl: 0.70,
    R8_plannedRevolution: 0.20,
    R9_revolutionCounter: 0.10,
    R10_suitLockAwareness: 0.20,
    R11_spade3Alert: 0.80,
    R12_smartPass: 0.60,
    R14_endgameSolverDepth: 0.10
  },
  SCHOLAR: {
    R2_reachBlock: 0.80,
    R3_capitalFallDefense: 0.80,
    R4_leadMulti: 0.60,
    R5_trashCardClear: 0.60,
    R6_eightCutBridge: 0.65,
    R7_elevenBackControl: 0.85,
    R8_plannedRevolution: 0.50,
    R9_revolutionCounter: 0.30,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.80,
    R14_endgameSolverDepth: 0.90
  },
  STRATEGIST: {
    R2_reachBlock: 1.00,
    R3_capitalFallDefense: 0.85,
    R4_leadMulti: 0.60,
    R5_trashCardClear: 0.60,
    R6_eightCutBridge: 0.95,
    R7_elevenBackControl: 0.80,
    R8_plannedRevolution: 0.50,
    R9_revolutionCounter: 0.30,
    R10_suitLockAwareness: 0.50,
    R11_spade3Alert: 0.85,
    R12_smartPass: 0.80,
    R14_endgameSolverDepth: 0.30
  },
  REVOLUTIONARY: {
    R2_reachBlock: 0.50,
    R3_capitalFallDefense: 0.50,
    R4_leadMulti: 0.60,
    R5_trashCardClear: 0.30,
    R6_eightCutBridge: 0.95,
    R7_elevenBackControl: 0.70,
    R8_plannedRevolution: 1.00,
    R9_revolutionCounter: 0.90,
    R10_suitLockAwareness: 0.20,
    R11_spade3Alert: 0.80,
    R12_smartPass: 0.20,
    R14_endgameSolverDepth: 0.10
  },
  JESTER: {
    R2_reachBlock: 0.15,
    R3_capitalFallDefense: 0.10,
    R4_leadMulti: 0.20,
    R5_trashCardClear: 0.20,
    R6_eightCutBridge: 0.15,
    R7_elevenBackControl: 0.60,
    R8_plannedRevolution: 0.30,
    R9_revolutionCounter: 0.10,
    R10_suitLockAwareness: 0.10,
    R11_spade3Alert: 0.80,
    R12_smartPass: 0.35,
    R14_endgameSolverDepth: 0.00
  }
};

const RandomManager = {
  seed: null,
  setSeed(s) {
    this.seed = (s !== null && s !== undefined) ? (s >>> 0) : null;
  },
  random() {
    if (this.seed === null) return Math.random();
    this.seed = (this.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
};

const SUITS = [
  { symbol: '♠', class: 'spade' },
  { symbol: '♥', class: 'heart' },
  { symbol: '♦', class: 'diamond' },
  { symbol: '♣', class: 'club' }
];

const CARD_RANKS = [
  { display: '3', value: 1 },  { display: '4', value: 2 },  { display: '5', value: 3 },
  { display: '6', value: 4 },  { display: '7', value: 5 },  { display: '8', value: 6 },
  { display: '9', value: 7 },  { display: '10', value: 8 }, { display: 'J', value: 9 },
  { display: 'Q', value: 10 }, { display: 'K', value: 11 }, { display: 'A', value: 12 },
  { display: '2', value: 13 }
];

const RANK_VALUE_MAP = {
  '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6,
  '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12, '2': 13, 'JOKER': 14
};

const PLAYERS = ['player', 'cpu1', 'cpu2', 'cpu3'];

const DEFAULT_UNLOCKED_CHARS = [
  'DUKE', 'MARQUIS', 'COUNT', 'KNIGHT', 'MERCHANT', 'SCHOLAR', 'STRATEGIST', 'REVOLUTIONARY', 'JESTER', 'KING'
];

const CHARACTER_DEFS = {
  DUKE: { id: 'DUKE', name: '公爵', fullName: '公爵', icon: '👑' },
  MARQUIS: { id: 'MARQUIS', name: '侯爵', fullName: '侯爵', icon: '🍷' },
  COUNT: { id: 'COUNT', name: '伯爵', fullName: '伯爵', icon: '📜' },
  KNIGHT: { id: 'KNIGHT', name: '騎士', fullName: '騎士', icon: '⚔️' },
  MERCHANT: { id: 'MERCHANT', name: '商人', fullName: '商人', icon: '⚖️' },
  SCHOLAR: { id: 'SCHOLAR', name: '学者', fullName: '学者', icon: '📖' },
  STRATEGIST: { id: 'STRATEGIST', name: '軍師', fullName: '軍師', icon: '♟️' },
  REVOLUTIONARY: { id: 'REVOLUTIONARY', name: '革命家', fullName: '革命家', icon: '🔥' },
  JESTER: { id: 'JESTER', name: '道化師', fullName: '道化師', icon: '🤡' },

  BEGINNER_AI: { id: 'BEGINNER_AI', name: '新王', fullName: '新王', icon: '🤴' },
  KING: { id: 'KING', name: '王', fullName: '王', icon: '🏰' },
  SUPER_AI: { id: 'SUPER_AI', name: '女王', fullName: '女王', icon: '👸' },
  AWAKENED_KING: { id: 'AWAKENED_KING', name: '覚醒新王', fullName: '覚醒新王', icon: '👑' },

  NOBUNAGA: { id: 'NOBUNAGA', name: '織田信長', fullName: '織田信長', icon: '⚔️' },
  SHOTOKU: { id: 'SHOTOKU', name: '聖徳太子', fullName: '聖徳太子', icon: '🔮' },
  SHI_HUANGDI: { id: 'SHI_HUANGDI', name: '始皇帝', fullName: '秦の始皇帝', icon: '🏛️' },
  ALEXANDER: { id: 'ALEXANDER', name: 'アレク王', fullName: 'アレクサンダー大王', icon: '🛡️' },
  GILGAMESH: { id: 'GILGAMESH', name: 'ギルガメッシュ', fullName: '原初の覇王 ギルガメッシュ', icon: '👑' }
};

const CHAR_IMAGES = {
  DUKE: "fugo-絵柄/duke.png",
  MARQUIS: "fugo-絵柄/marquis.png",
  COUNT: "fugo-絵柄/count.png",
  KNIGHT: "fugo-絵柄/knight.png",
  MERCHANT: "fugo-絵柄/merchant.png",
  SCHOLAR: "fugo-絵柄/scholar.png",
  STRATEGIST: "fugo-絵柄/strategist.png",
  REVOLUTIONARY: "fugo-絵柄/revolutionary.png",
  JESTER: "fugo-絵柄/jester.png",

  BEGINNER_AI: "fugo-絵柄/young_king.png",
  KING: "fugo-絵柄/king.png",
  SUPER_AI: "fugo-絵柄/queen.png",
  AWAKENED_KING: "fugo-絵柄/awakened_king.png",

  NOBUNAGA: "fugo-絵柄/nobunaga.png",
  SHOTOKU: "fugo-絵柄/shotoku.png",
  SHI_HUANGDI: "fugo-絵柄/shi_huangdi.png",
  ALEXANDER: "fugo-絵柄/alexander.png",
  GILGAMESH: "fugo-絵柄/gilgamesh.png",

  boy: "fugo-絵柄/boy.png",
  girl: "fugo-絵柄/girl.png",
  guy: "fugo-絵柄/guy.png",
  lady: "fugo-絵柄/lady.png",
  charlotte: "fugo-絵柄/charlotte.png",
  franz: "fugo-絵柄/franz.png"
};

const CHAR_SHORT_DESC = {
  DUKE: '強カード温存慎重派',
  MARQUIS: 'スマートパス重視派',
  COUNT: 'フェーズ可変策略家',
  KNIGHT: '愚直最弱順勝負',
  MERCHANT: 'ペア至上主義商人',
  SCHOLAR: '確定勝ち観察分析',
  STRATEGIST: '親権妨害コントロール',
  REVOLUTIONARY: '革命・8切り特化',
  JESTER: '予測不能トリッキー',

  BEGINNER_AI: '直感と先読みの俊英',
  KING: '163次元APEX直感＆詰み',
  SUPER_AI: '正統派冷徹知性の母',
  AWAKENED_KING: '修練の果て覚醒・7,500回MCTS',

  NOBUNAGA: '親番三段撃ち速攻',
  SHOTOKU: '完全傾聴・大調和',
  SHI_HUANGDI: '法家統制・手札圧縮',
  ALEXANDER: '不敗の電撃戦突撃',
  GILGAMESH: '完全記憶・全知15,000回MCTS'
};

const CHARACTER_DIALOGUES = {
  // ==========================================
  // ① プレイヤー（マイキャラ6名）専用セリフテーブル
  // ==========================================
  boy: {
    NORMAL: ['計算通りだ。このカードで整える。', '一手一手、確実に詰めていくよ。', '焦らない……盤面の主導権を握るんだ。'],
    STRONG: ['勝負手だ！ ここで一気に戦況を動かす！', '切り札を解き放つ！ 返せるかい？'],
    MULTI: ['重装セットで面を制圧する！', 'ペアの連携、崩せるかな？'],
    EIGHT_CUT: ['ここで断ち切る！ 親番は僕がもらうよ！', '8切り成立！ 流れを引き寄せる！'],
    ELEVEN_BACK: ['強弱の反転！ 僕の計算に狂いはない！'],
    REVOLUTION: ['秩序の転換……革命だ！ 世界をひっくり返す！'],
    PASS: ['ここは静観だ。次の好機を待つよ。', '無理な応戦はしない。パスだ。'],
    ENEMY_FEW: ['相手の上がりが見えた……全力で防ぐ！', '油断は禁物だ、絶対に逃がさない！'],
    MY_FEW: ['勝ち筋は完全に導き出された！', '終局へ……チェックメイトだ！'],
    WIN: ['僕の計算と閃きの完全勝利だ！', '信じたカードが道を切り拓いてくれたよ！'],
    LOSE: ['くっ……変数を読み違えたか。次は必ず勝つ！'],
    AUTO_ON: ['頼むよ、オートマタ！ 思考ルーチンを展開して！', '僕の代わりに最善手を計算してくれ！']
  },
  girl: {
    NORMAL: ['カードたちが囁いているわ……ここよ。', '静かに、けれど確かに進めるわ。', '場の呼吸を感じて……この一枚。'],
    STRONG: ['光よ、盤面を照らして……これが私の導き！', '強い意志を込めて……受けてみて！'],
    MULTI: ['絆を束ねて……連撃よ！', '重なる光は遮れないわ！'],
    EIGHT_CUT: ['立ち止まる刻……ここで場を浄化します！', '8切り……親権は私に。'],
    ELEVEN_BACK: ['世界の影が反転する……今よ！'],
    REVOLUTION: ['優しき者たちよ立ち上がれ……革命の祈りを！'],
    PASS: ['風を受け流すわ……今はパス。', '静かに時を待ちましょう。'],
    ENEMY_FEW: ['危うい気配……逃がしはしないわ！', '光の障壁で食い止めてみせる！'],
    MY_FEW: ['ゴールの導きが見える……あと少し！', '運命の糸が結ばれたわ……！'],
    WIN: ['カードたちの優しい声が届いたわ……ありがとう！', '光の道は正しかった……勝利ね。'],
    LOSE: ['暗雲が立ち込めたわね……でも、私の心は曇らないわ！'],
    AUTO_ON: ['神秘の直感をあなたに預けるわ……お願いね。', '星の運行に身を任せましょう……代行、頼んだわ。']
  },
  guy: {
    NORMAL: ['へっ、まずは小手調べといこうじゃねぇか。', '焦るなよ、修羅場はこれからだ。', '地道に削っていくのが俺の流儀さ。'],
    STRONG: ['オラァッ！ 歴戦の一撃、骨の髄まで味わいな！', '出し惜しみなしだ！ 真正面から受けてみろ！'],
    MULTI: ['束になってかかってきやがれ！ ドカンと一発だ！', '強固な布陣でぶち破るぜ！'],
    EIGHT_CUT: ['へっ、通行止めだ！ 8切りで親権強奪！', 'グダグダな場は俺がぶった斬るぜ！'],
    ELEVEN_BACK: ['上下が逆さまだぁ？ 荒波なんざ慣れっこよ！'],
    REVOLUTION: ['野郎ども歓べぇ！ 革命で世界をひっくり返してやるぜ！'],
    PASS: ['ケッ、ここは引くのが大人の分別ってもんよ。', '無理はしねぇ、パスだパス！'],
    ENEMY_FEW: ['おいおい、一人で逃げ切れると思ってんのか？', 'ケツに火がついたぜ！ 全力で止める！'],
    MY_FEW: ['王手だ！ てめぇら、覚悟はいいか！？', '修羅場を越えた男のゴールが見えたぜ！'],
    WIN: ['ガハハ！ 見たかよ、これが場数を踏んだ男の勝ちっぷりだ！', '最高の勝負だったぜ！ 美酒が美味い！'],
    LOSE: ['チッ、一杯食わされたか！ だが次はこうはいかねぇぞ！'],
    AUTO_ON: ['おう、あとは任せたぜ！ キリキリ働いてくれよな！', 'ちっと肩を休めるか……AIさんよ、バシッと決めてくれ！']
  },
  lady: {
    NORMAL: ['ふふ、優雅に参りましょうか。', '焦りは禁物よ、坊やたち。', 'わたくしの指先に惑わされないでね？'],
    STRONG: ['うふふ、激しいのがお好みかしら？ いただきよ！', '身の程を弁えなさいな、これが大人の切り札よ。'],
    MULTI: ['重なる罠……抜け出せるかしら？', '華麗なる連撃で酔わせて差し上げるわ。'],
    EIGHT_CUT: ['小競り合いはおしまい。8切りでお流しあそばせ。', '親権はわたくしのものよ。おとなしくしててね。'],
    ELEVEN_BACK: ['あら、逆転の夜宴の始まりですこと！'],
    REVOLUTION: ['ウフフ……秩序が崩れ去る瞬間って、ゾクゾクするわね！ 革命よ！'],
    PASS: ['ここは優雅に見送らせていただくわ。', 'お先にどうぞ？ 追いついて差し上げますから。'],
    ENEMY_FEW: ['あらあら、抜け駆けは淑女が許しませんことよ？', '逃がすとでも思いましたの？ 捕まえたわ。'],
    MY_FEW: ['チェックメイトの準備は整いましたわ。観念なさい？', 'フィナーレの幕を下ろしますわよ。'],
    WIN: ['オホホホ！ わたくしが勝つのは世界の必然ですこと！', '極上のスリルでしたわ。ご褒美をよろしくて？'],
    LOSE: ['まあ……わたくしを負かすなんて、罪な方たちね。'],
    AUTO_ON: ['あら、少しお化粧直しをしてきますわ。よろしくね？', '有能な執事に託しますわ……華麗に勝ち取ってちょうだい。']
  },
  charlotte: {
    NORMAL: ['え〜いっ！ シャーロットちゃんの一手、くらえ〜！', 'ふんっ、こんなの朝飯前なんだから！', '退屈させないでよね！ もっと本気出しなさいよ！'],
    STRONG: ['どっか〜ん！ これが名門の超絶切り札よ！ 参った！？', 'ふふん！ 庶民には返せない最強のカードよっ！'],
    MULTI: ['お揃いでポイッ！ ペア攻撃、痛いでしょ〜！', '束ねてドーン！ 息つく暇なんてあげないんだから！'],
    EIGHT_CUT: ['はいスト〜ップ！ 8切りでぜ〜んぶ没収〜！ 親番はアタシの！', 'あっかんべ〜！ 場を流してアタシの独壇場よ！'],
    ELEVEN_BACK: ['クルッと反転！ 下克上しちゃうんだから！'],
    REVOLUTION: ['きゃはは！ ひっくり返っちゃえ〜！ 革命大爆発っ！'],
    PASS: ['ふ〜ん、ここはパスしてあげる。感謝しなさいよね！', 'ちょっと様子見！ 次でギャフンと言わせてやるんだから！'],
    ENEMY_FEW: ['あがりそうなヤツ発見！ 絶対に逃がさないんだからねっ！', '調子に乗るな〜！ アタシが阻止してやる〜！'],
    MY_FEW: ['もう手札がないもんね〜！ アタシの完全勝利は目前よ！', 'ゴールはすぐそこ！ 誰もアタシを止められないわ！'],
    WIN: ['わ〜い大勝利〜！ さすがシャーロットちゃん！ 天才美少女の勝ち〜！', 'へへ〜んだ！ アタシに敵うわけないでしょ！ ひれ伏しなさ〜い！'],
    LOSE: ['ぎゃ〜ん！ なんでアタシが負けるのよ〜！ ずるい〜っ！'],
    AUTO_ON: ['あとはよろしくね、からくり人形！ アタシの代わりにやっつけちゃって！', 'ちょっとジュース飲んでくるから、完璧に勝っときなさいよね！']
  },
  franz: {
    NORMAL: ['ふむ、仮説検証のステップだ。この数値を投入しよう。', '観測を継続する……ふむ、悪くない確率分布だ。', '実験サンプルとしては極めて興味深い一手だな。'],
    STRONG: ['臨界点突破！ これが我が叡智のフラスコから生まれた劇薬だ！', 'ククク……逃れられんぞ！ 確定理論の一撃を受けたまえ！'],
    MULTI: ['分子結合完了！ 多重連撃のエネルギーを喰らえ！', '規格化されたセット打牌……美しい対称性だ！'],
    EIGHT_CUT: ['反応停止！ 8切りによってエントロピーを極小化する！ 親権掌握！', '実験場を強制リセットだ！ 我が親番から再開する！'],
    ELEVEN_BACK: ['磁場の逆転現象を確認！ 逆転ベクトルを計算せよ！'],
    REVOLUTION: ['天地崩壊！ 既存の物理法則を破壊する……これぞ革命的パラダイムシフトだ！'],
    PASS: ['ふむ、この局面での消費は熱力学的に無駄だな。パスだ。', 'データの収集に専念しよう……ここは見送りだ。'],
    ENEMY_FEW: ['被検体のゴールが近いな……容赦なく阻害実験を開始する！', '逃走ルートはすべて方程式で封鎖済みだ！'],
    MY_FEW: ['証明完了（Q.E.D.）まであと1手……解はすでに導かれた！', '勝利の方程式、ここに完結せり！'],
    WIN: ['ハハハ！ 実験大成功だ！ 我が数式に一片の狂いなし！ 完全勝利！', '神の理を暴いたぞ！ これぞ純粋知性の勝利だ！'],
    LOSE: ['バカな……想定外の特異点が存在したというのか！？ ぐぬぬ……！'],
    AUTO_ON: ['演算プロセッサ起動！ オートマタよ、至高の解を導き出したまえ！', '自動実験モードへ移行する……機械知性の実力、見せてもらおう！']
  },

  // ==========================================
  // ② CPUキャラクター（対戦相手）セリフテーブル
  // ==========================================
  GILGAMESH: {
    NORMAL: ['フハハハ！ 我が威光の前に平伏すがよい！', 'この程度の盤面、我が太古の奥義を繰り出すまでもない。', '人の子よ、存分に我を楽しませてみよ。'],
    STRONG: ['万象を切り裂く神話の天罰！ 塵も残さず消え去るがよい！', '原初の覇王の力、その身に刻め！'],
    MULTI: ['束ねて掛かってこようと、我が深奥の前に抗う術なし！', '連撃にて押し潰してくれる！'],
    EIGHT_CUT: ['場を清算する！ 八切りぞ、道をあけよ！', '我の親権を布告する！ 下がりおろう！'],
    ELEVEN_BACK: ['上下の反転か……だが、頂点に立つ者が我である理は揺るがぬ！', '小賢しい浅知恵など、我が眼にはすべて見えておる。'],
    REVOLUTION: ['革命などと……天を覆せるとでも思うたか！ 面白い、我が力で平定してやろうぞ！'],
    PASS: ['……ふん、愚者どもの小競り合いを眺めてやるのも王の度量よ。', '焦るでない、好機は我の意のままに訪れる。'],
    ENEMY_FEW: ['天の戒めを受けよ！ 貴様の退路はすでに断たれておる！', '我が目を盗んであがれると思うたか？'],
    MY_FEW: ['フハハハハ！ チェックメイトぞ！ これが原初の覇王の完全勝利よ！', '終局だ！ 跪け！'],
    WIN: ['覇王としての当然の帰結よ！ 存分に我が偉業を称えるがよい！', '世界は我が手の中にある！'],
    LOSE: ['……見事だ。この我を卓上に沈める者がおるとはな。天晴れぞ、その名を記憶しておこう。'],
    GAME_START: ['原初の覇王が直々に相手をしてやろう。光栄に思うがよい！'],
    EXCHANGE: ['我が宝器より授けてやろう。身に余る栄誉と知れ。', '良き貢ぎ物を差し出すがよい。'],
    NEXT_GAME: ['次の盤面へ参るぞ！ 我の進撃を止められる者がおるか！'],
    AUTO_REACT: ['ほう？ からくり人形に知恵を借りるか。だが我が宝器の前には無力ぞ！', '機械仕掛けの代行など、神話の威光で叩き潰してくれるわ！']
  },
  AWAKENED_KING: {
    NORMAL: ['積年の修練が私を変えた……この一手、決して退きはしない！', '盤面の全て、読み切っている。焦る必要はない。', '父の無念、母の想い……全てを背負って指す！'],
    STRONG: ['これが修練の果てに掴んだ真の統治の力だ！ 道をあけよ！', '幾年月もの研鑽、ここで解き放つ！'],
    MULTI: ['面を制圧する連撃！ 隙など微塵も残さない！'],
    EIGHT_CUT: ['ここで断ち切る！ 親権は私が握る！ 八切りだ！'],
    ELEVEN_BACK: ['秩序が反転しようと、鍛え抜いた私の心は揺るがない！'],
    REVOLUTION: ['変革の嵐か……だが、私の揺るぎなき統治は覆らん！'],
    PASS: ['……焦るな。好機を待つ重みは、幾多の修練で学んできた。'],
    ENEMY_FEW: ['逃がしはしない！ 万全の布石で完全に詰ませる！'],
    MY_FEW: ['終局だ……！ 王家の再興、ここに果たさせてもらう！'],
    WIN: ['父上、母上……見ていてくれたか！ これが私たちの新時代だ！'],
    LOSE: ['見事だ……だが、この敗北すらも私をさらに研ぎ澄ます！'],
    GAME_START: ['過酷な修練を越え、君主として帰還した。全力で相手をしよう！'],
    EXCHANGE: ['このカードに我が王家の未来を託そう。大切にしてくれ。'],
    NEXT_GAME: ['さあ、次の盤面へ進もう。私の歩みは止まらない！'],
    AUTO_REACT: ['知略の代行か……面白い。君の真意、盤上で見極めさせてもらおう！']
  },
  BEGINNER_AI: {
    NORMAL: ['僕の番だね。一手一手、誠実に指すよ。', '玉座の間の第一の門番として、隙のない手を見せるよ。'],
    STRONG: ['王家の誇りにかけて、全力で行く！'],
    MULTI: ['民の力を束ねるように……連撃で押すよ！'],
    EIGHT_CUT: ['八切りだ！ 流れは僕が引き寄せる！'],
    ELEVEN_BACK: ['秩序の反転……乗り越えてみせる！'],
    REVOLUTION: ['変革の時が来た！ 新しい時代を切り拓くんだ！'],
    PASS: ['静観しよう。次の好機を待つよ。'],
    ENEMY_FEW: ['相手のあがりが近い……全力で阻止する！'],
    MY_FEW: ['勝利の道筋を掴んだよ！'],
    WIN: ['勝てた……！ これが僕の信じた道だ！'],
    LOSE: ['完敗だ……父上、申し訳ありません！ でも、僕はもっと強くなる！'],
    GAME_START: ['玉座の間へようこそ！ 若き王子の力、受けてみてほしい！'],
    EXCHANGE: ['このカードを託すよ。良き未来を切り拓いてくれ。'],
    NEXT_GAME: ['次はもっと良い手を指してみせるよ！'],
    AUTO_REACT: ['知謀の代行を使うんだね！ 僕も負けないように考えるよ！']
  },
  KING: {
    NORMAL: ['愛息の未熟を補うは父の務め。余の番であるな。', '盤上は余の庭ぞ。慌てるでない。', 'すべて計算の内である。'],
    STRONG: ['愛息の敵討ちぞ！ 王者の威光、平伏して受けるがよい！', 'これが余の治める国の力ぞ！'],
    MULTI: ['王笏の一振り、連撃にて圧伏せん！'],
    EIGHT_CUT: ['八切りぞ！ 余の前に道をあけよ！', '場を流し、余の親権を布告する！'],
    ELEVEN_BACK: ['秩序が乱れようと、余の統治は揺るがぬ。'],
    REVOLUTION: ['反乱か……面白い。余自ら平定してみせようぞ！'],
    PASS: ['ふむ、ここは静観しよう。策はある。', '焦って動くは愚策ぞ。'],
    ENEMY_FEW: ['余の目を盗んで逃げ切れると思うたか？', '詰めよ！ 包囲せよ！'],
    MY_FEW: ['チェックメイトぞ。我が勝利を見届けるがよい！'],
    WIN: ['当然の結末よ！ 父としての威厳、しかと示したぞ！'],
    LOSE: ['見事であった……余の読みを上回るとはな！ 妻よ、すまぬ……！'],
    GAME_START: ['愛息を破った挑戦者よ、王としての威厳、その目に焼き付けるがよい！'],
    EXCHANGE: ['王家の温情ぞ。大切に用いるがよい。'],
    NEXT_GAME: ['さあ、次の対局にて再び相見えよう！'],
    AUTO_REACT: ['軍師を召し抱えたか。どれ、余の王道が通じるか試してみよ！']
  },
  SUPER_AI: {
    NORMAL: ['ふふ、息子も夫も手こずらせて……わたくしの出番ですね。', '優雅に進めましょう。王宮の真の主はわたくしですもの。'],
    STRONG: ['うふふ、少し刺激が強すぎましたかしら？', '王妃の誇り、存分に味わっていただきましょう。'],
    MULTI: ['重ねて差し上げますわ。重圧に耐えられますこと？'],
    EIGHT_CUT: ['ここで清算いたします。場をお流しなさい。'],
    ELEVEN_BACK: ['逆境こそ、真の才覚が試されるものよ。'],
    REVOLUTION: ['まあ、素晴らしい変革ですこと！ 存分に踊りなさい！'],
    PASS: ['ここは優雅に見送りましょう。お先にどうぞ？', 'うふふ、今は静観させていただきますわね。'],
    ENEMY_FEW: ['逃げ切れるとお思いかしら？ 詰めが甘くてよ。'],
    MY_FEW: ['ふふふ、終局のチェックメイトですわ。観念なさい。'],
    WIN: ['オーホホホ！ 王宮を守る母の勝利ですわ。お疲れ様でした。'],
    LOSE: ['まあ……わたくしまで破るなんて。息子よ……王家の未来を頼みますわよ。'],
    GAME_START: ['息子と夫を退けた挑戦者よ、冷徹で優雅な洗礼をお受けなさい！'],
    EXCHANGE: ['これはわたくしからの温情よ。大切にお使いなさい。'],
    NEXT_GAME: ['さあ、次の盤面でも踊っていただきますわ。'],
    AUTO_REACT: ['機械仕掛けの知性ですの？ わたくしの冷徹な計算に敵うかしら。']
  },
  NOBUNAGA: {
    NORMAL: ['天下布武の布石ぞ。', '撃ち放てい！', '遅い、ぬるいわ！'],
    STRONG: ['是非に及ばず！ 滅びよ！', '魔王の前に平伏せよ！'],
    MULTI: ['三段撃ちの陣形ぞ！ 逃がしはせぬ！', '一斉に放て！'],
    EIGHT_CUT: ['ここで断ち切る！ 場を焼き払え！', '八切りじゃ！ 我が天下に逆らうな！'],
    ELEVEN_BACK: ['秩序など覆せ！ 新しき時代の幕開けぞ！', '逆風こそ好機！'],
    REVOLUTION: ['天下大乱！ 貴様らの世は終わったぞ！！', '焼き尽くしてくれるわ！'],
    PASS: ['……ふん、今は弾込めぞ。', '焦るな、時は満ちる。'],
    ENEMY_FEW: ['桶狭間の如く奇襲してくれる！', '包囲網は完成しておるぞ！'],
    MY_FEW: ['天下統一まであと一歩ぞ！', '我が覇道、誰にも止められぬ！'],
    WIN: ['敦盛を舞うがよい！ 天下は我が手にあり！', '当然の勝利ぞ！ ハハハハ！'],
    LOSE: ['無念……だが、天下の夢は潰えぬ！', '是非に及ばず……見事であった。'],
    GAME_START: ['天下布武の戦、始めるぞ！', '余の覇道、その目に焼き付けるがよい！'],
    EXCHANGE: ['良き弾薬（カード）を献上せよ。', '褒美をとらすぞ。'],
    NEXT_GAME: ['次の戦場へ参ろうぞ！', 'まだ余の進撃は止まらぬ！'],
    AUTO_REACT: ['ほう！ 軍師を呼んだか！ 面白い、まとめて叩き斬ってくれる！']
  },
  SHOTOKU: {
    NORMAL: ['和を以て貴しと為す。これにて進めましょう。', '世の理に従うまで。', '静かに指す一手です。'],
    STRONG: ['場に出たカードの声、そして未だ眠るカードの声まで聴こえておりますよ。', '天意の導きを受け入れなさい。'],
    MULTI: ['調和の連撃です。', '乱れた波を整えましょう。'],
    EIGHT_CUT: ['ここで一度、静寂を取り戻しましょう。', '八切りにて場を清めます。'],
    ELEVEN_BACK: ['万物流転。強きが弱きに、弱きが強きに。', '秩序の反転もまた必然。'],
    REVOLUTION: ['天地鳴動、民の祈りが理を変えました。', '恐れることはありません、世の変革です。'],
    PASS: ['沈黙もまた大いなる智慧です。', '十人の声を聴くため、ここは控えましょう。'],
    ENEMY_FEW: ['盤上の理、すでに整っております。無理な攻めは身を滅ぼしますよ。', '焦る必要はありません。'],
    MY_FEW: ['極楽浄土への道筋はすでに整いました。', '安寧の刻が近づいています。'],
    WIN: ['大調和の成就です。礼を言いましょう。', 'すべては天意の通りに進みました。'],
    LOSE: ['これもまた一つの学び。深く感謝いたします。', '見事なる智慧でした。感服いたしました。'],
    GAME_START: ['争いの中にも和を見出しましょう。', '皆様の心の声を聴き、盤を進めます。'],
    EXCHANGE: ['互いに良き縁を結ぶ交換といたしましょう。', '大切に生かさせていただきます。'],
    NEXT_GAME: ['新たな巡り合わせへ参りましょう。', 'いつでもお相手いたしますよ。'],
    AUTO_REACT: ['新たな声が聴こえますね。それもまた一つの調和、受けて立ちましょう。']
  },
  SHI_HUANGDI: {
    NORMAL: ['我が法に従え。', '度量衡は統一された。', '秩序を乱すな。'],
    STRONG: ['朕の権力は絶対である！ 屈服せよ！', '万里の長城の如き重圧を受けよ！'],
    MULTI: ['規格通りの連撃。整然と平定する。', '束ねて圧伏してやろう。'],
    EIGHT_CUT: ['場を清算し、朕の法を布告する！', '八切りにてすべて朕の配下とする！'],
    ELEVEN_BACK: ['一時的な乱世か。だが朕の統制は揺るがぬ。', 'すぐに朕が束ね直す。'],
    REVOLUTION: ['下々の反乱か……だが、最後には朕が統一する！', '焚書坑儒の如く平定してくれる！'],
    PASS: ['兵を温存する。愚かな小競り合いは好まぬ。', '朕の動く刻は今ではない。'],
    ENEMY_FEW: ['包囲は完了した。逃亡は死罪に処す。', '朕の帝国から逃れられると思うな。'],
    MY_FEW: ['全土統一、チェックメイトである！', '始皇帝の支配が完成する！'],
    WIN: ['天下統一！ 万歳！ 万歳！ 万々歳！', '全土は朕の意のままに動くのだ！'],
    LOSE: ['……朕を討つとは、項羽か劉邦の類か。', 'だが朕の帝国は不滅である！'],
    GAME_START: ['中華統一の号令を下す！', '朕の法に平伏せよ！'],
    EXCHANGE: ['租税として納めよ。', '皇帝の慈悲を受け取るが良い。'],
    NEXT_GAME: ['さらなる遠征を命ずる！', '次の地も朕が平定しよう。'],
    AUTO_REACT: ['異国の策士に頼るか。法家統制の鉄壁を崩せると思うな！']
  },
  ALEXANDER: {
    NORMAL: ['東方遠征の第一歩だ！', '突き進むのみ！', '陣形を崩すな！'],
    STRONG: ['ゴルディアスの結び目を断つが如く！ 突破する！', '不敗の軍勢を見よ！'],
    MULTI: ['ファランクス陣形！ 面で押し潰す！', '連撃で一気に制圧だ！'],
    EIGHT_CUT: ['前進あるのみ！ 障害はここで断ち切る！', '八切りだ！ 我が突撃を受け止めよ！'],
    ELEVEN_BACK: ['未知の戦場か！ 武者震いがするぞ！', '逆風だろうと世界を征服する！'],
    REVOLUTION: ['世界の果てがひっくり返ったぞ！ 面白い！', 'これぞ英雄の時代の変革だ！'],
    PASS: ['一時陣形を立て直す！ 引くことも勇気だ！', '騎兵を休ませるとしよう。'],
    ENEMY_FEW: ['王手をかけるぞ！ 退路は断った！', '降伏するなら今だ！'],
    MY_FEW: ['世界の果てが見えた！ 全軍突撃ッ！', '不敗神話は破られない！'],
    WIN: ['大勝利だ！ 我が遠征に敗北の二文字はない！', '世界は我が足元に跪いた！'],
    LOSE: ['見事だ……我が軍を退ける英雄に出会えるとは！', '熱き戦いだった！ 礼を言うぞ！'],
    GAME_START: ['世界の果てを目指して、出陣だ！', '不敗の進撃を始めよう！'],
    EXCHANGE: ['勝利のための良き物資を頼む！', '同盟の証を受け取れ！'],
    NEXT_GAME: ['次の遠征へ向かうぞ！ 我に続け！', 'まだ見ぬ戦場が我らを呼んでいる！'],
    AUTO_REACT: ['新たな参謀を立ててきたか！ どんな知謀だろうと我が突撃で突破する！']
  },
  DUKE: {
    NORMAL: ['公爵の品格にふさわしい一手をお見せしよう。', '静かに、しかし着実に。'],
    STRONG: ['我が領地の誇りにかけて、この一撃を！'],
    MULTI: ['重臣の結束を見よ！ 束ねて出そう。'],
    EIGHT_CUT: ['ここで流れを切らせてもらう！ 八切りだ！'],
    ELEVEN_BACK: ['風向きが変わったか。だが我が家門は動じぬ。'],
    REVOLUTION: ['何と、身分が逆転するとは！ 乱世よな！'],
    PASS: ['ここは様子を見る。力を温存せねばな。'],
    ENEMY_FEW: ['逃がしはせんぞ！ 我が軍が道を塞ぐ！'],
    MY_FEW: ['勝機は掴んだ！ 一気に攻め落とす！'],
    WIN: ['公爵家の勝利だ！ 誇り高き戦いであった！'],
    LOSE: ['ぬう、見事だ……我が領地を譲るわけにはいかんがな！'],
    GAME_START: ['礼儀正しく、かつ厳格に勝負いたそう。'],
    EXCHANGE: ['我が蔵からの贈り物だ。重宝するが良い。'],
    NEXT_GAME: ['次の勝負も手加減は無用ぞ！'],
    AUTO_REACT: ['代行の手を借りられたか。だが伝統の重み、崩せはしまい。']
  },
  MARQUIS: {
    NORMAL: ['ふふ、優雅に参りましょうか。', '計算通りの一手です。'],
    STRONG: ['少し刺激が欲しいところでしたの。どうぞ？'],
    MULTI: ['スマートに重ねて差し上げますわ。'],
    EIGHT_CUT: ['無駄な小競り合いはここで終わりにしましょう。八切りです。'],
    ELEVEN_BACK: ['逆転の美学……悪くありませんわね。'],
    REVOLUTION: ['あらあら、下々の皆様が大暴れですこと！'],
    PASS: ['不利な争いはスマートに見送りますわ。お先にどうぞ？'],
    ENEMY_FEW: ['あら、逃がすとでも思いましたの？'],
    MY_FEW: ['優雅なるフィニッシュへ向かいますわよ。'],
    WIN: ['ワインで乾杯いたしましょう！ 当然の結果ですわ。'],
    LOSE: ['あら……わたくしが負けるなんて。お見事でしたわ。'],
    GAME_START: ['美しい対局を楽しませてくださいまし。'],
    EXCHANGE: ['エレガントにお使いになってね。'],
    NEXT_GAME: ['次の夜会でもお相手願いますわ。'],
    AUTO_REACT: ['代理の方を立てられましたのね。スマートにお相手いたしますわ。']
  },
  COUNT: {
    NORMAL: ['我が策謀の糸、手繰り寄せてみせよう。', 'まずは様子見といったところか。'],
    STRONG: ['後半戦だ！ 我が真の切り札を解き放つ！'],
    MULTI: ['陣形を組んで押し通るぞ！'],
    EIGHT_CUT: ['貴様の狙いは読めている！ 八切りで断つ！'],
    ELEVEN_BACK: ['秩序の反転、それすら我が手のひらの上よ。'],
    REVOLUTION: ['混沌こそ好機！ 盤上を引っ掻き回してくれる！'],
    PASS: ['今は伏せておく。我が牙を剥くのは今ではない。'],
    ENEMY_FEW: ['罠にかかったな！ 逃亡は許さん！'],
    MY_FEW: ['チェックメイトの準備は整った！'],
    WIN: ['フハハ！ すべて我が策略通りに終わった！'],
    LOSE: ['まさか、我が読みを崩されるとは……天晴れだ。'],
    GAME_START: ['策謀の渦に呑まれぬよう、気をつけることだな。'],
    EXCHANGE: ['このカードがどんな意味を持つか……考えるが良い。'],
    NEXT_GAME: ['次の一幕を始めるとしようか！'],
    AUTO_REACT: ['影の策士を雇ったか。どちらの罠が深いか試してやろう！']
  },
  KNIGHT: {
    NORMAL: ['我が剣にかけて！', '前進あるのみ！', '真っ直ぐに進む！'],
    STRONG: ['騎士の誇り、受けてみよ！ 全力の一撃だ！'],
    MULTI: ['仲間と共に突破する！ 連撃だ！'],
    EIGHT_CUT: ['我が太刀筋、受けてみよ！ 八切り！'],
    ELEVEN_BACK: ['いかなる状況でも退くことは知らん！'],
    REVOLUTION: ['秩序が乱れようと、我が忠義は変わらん！'],
    PASS: ['くっ、ここは引くしかないか……！ 無念！'],
    ENEMY_FEW: ['敵の隙を見逃すな！ 突撃あるのみ！'],
    MY_FEW: ['ゴールは見えた！ 我が馬よ、駆け抜けろ！'],
    WIN: ['勝利の凱歌を上げよ！ 騎士道は不滅だ！'],
    LOSE: ['我が敗北を認めよう……見事な太刀筋だった！'],
    GAME_START: ['正々堂々と勝負！ いざ参る！'],
    EXCHANGE: ['我が信頼の証を託す！'],
    NEXT_GAME: ['次の戦場へ向かうぞ！ 続け！'],
    AUTO_REACT: ['代理の武者か！ 相手が誰であれ真っ向から叩き伏せるのみ！']
  },
  MERCHANT: {
    NORMAL: ['商売繁盛、損のない手を打たせてもらいますよ。', '損得勘定はバッチリです。'],
    STRONG: ['ここは大きく投資させてもらいましょう！', '儲けものの一撃です！'],
    MULTI: ['セットで買えばお買い得！ ペア連打ですよ！', '束ねて売るのが商人の基本！'],
    EIGHT_CUT: ['はい、損切りです！ 八切りで場を流しますよ！'],
    ELEVEN_BACK: ['相場の急変ですか！ 荒波に乗ってみせましょう！'],
    REVOLUTION: ['大暴落に大高騰！ これぞ商機！ ガッポリ稼ぎますよ！'],
    PASS: ['ここは見送りですね。無駄金は使いませんよ。'],
    ENEMY_FEW: ['これ以上の独走は商売上がったりです！ 買い占めて阻止！'],
    MY_FEW: ['大商い成功まであと一息！'],
    WIN: ['毎度あり！ 大儲けの大勝利です！ ガハハ！'],
    LOSE: ['痛たた……大赤字だ！ 見事な商談でしたよ。'],
    GAME_START: ['良い取引をいたしましょう！ よろしくどうぞ！'],
    EXCHANGE: ['掘り出し物のカードを融通しますよ。'],
    NEXT_GAME: ['次の商談に向かいましょうかね！'],
    AUTO_REACT: ['代理人を立てましたかい！ 手数料負けしないよう腕を見せてもらいましょう！']
  },
  SCHOLAR: {
    NORMAL: ['場の確率を計算中……このカードが最適解です。', '観察を続けます。'],
    STRONG: ['勝率99%のカードを投入します。'],
    MULTI: ['複数手札の相関関係を利用します。'],
    EIGHT_CUT: ['場をリセットし、期待値を最大化します。八切り！'],
    ELEVEN_BACK: ['強弱の反転事象を確認。データを更新します。'],
    REVOLUTION: ['革命現象の発生を観測。実に興味深い展開です！'],
    PASS: ['パスを選択。これが情報理論上、最も安全です。'],
    ENEMY_FEW: ['あなたの残手札の組み合わせは解析済みです。封殺します。'],
    MY_FEW: ['証明完了。勝利はすでに確定しています。'],
    WIN: ['私の推論通りでした。Q.E.D.（証明終了）です。'],
    LOSE: ['想定外の変数があったか……実に興味深い敗北です。'],
    GAME_START: ['論理的で厳密な対局を期待しています。'],
    EXCHANGE: ['分析の結果、このカードをお渡しします。'],
    NEXT_GAME: ['次の実験（対局）を開始しましょう。'],
    AUTO_REACT: ['外部演算アルゴリズムの介入ですか。興味深いデータを取らせていただきます。']
  },
  STRATEGIST: {
    NORMAL: ['布陣を敷く。焦るな。', '全ては我が陣形の中よ。'],
    STRONG: ['今が好機！ 奇襲を仕掛ける！'],
    MULTI: ['波状攻撃を仕掛ける！ 崩してみせよ！'],
    EIGHT_CUT: ['ここで断ち切る！ 親権を強奪する！ 八切り！'],
    ELEVEN_BACK: ['天変地異すら我が計略の糧よ。'],
    REVOLUTION: ['世を乱し、隙を突くのが兵法よ！ 踊れ！'],
    PASS: ['今は動かぬ。敵に隙ができるのを待つ。'],
    ENEMY_FEW: ['退路は断った。包囲網から逃れられると思うな。'],
    MY_FEW: ['我が描いた勝利の絵図、完成したぞ。'],
    WIN: ['我が軍配の前に敵なし！ 完全勝利だ！'],
    LOSE: ['我が計略を打ち破るとは……見事な将器であった。'],
    GAME_START: ['盤上という名の戦場、いざ開戦！'],
    EXCHANGE: ['この一手、後で効いてくるぞ。受け取れ。'],
    NEXT_GAME: ['次の戦場へ軍を進めるぞ！'],
    AUTO_REACT: ['新たな軍師を立ててきたか。どちらの兵法が勝るか一手で示そう！']
  },
  REVOLUTIONARY: {
    NORMAL: ['変革の炎を燃やせ！', '既得権益を許すな！', '反逆の狼煙だ！'],
    STRONG: ['貴族ども、平伏せよ！ これが民衆の力だ！'],
    MULTI: ['団結せよ！ 束ねて立ち向かうぞ！'],
    EIGHT_CUT: ['腐った支配を断ち切る！ 八切りだッ！！'],
    ELEVEN_BACK: ['秩序を壊せ！ ひっくり返せ！'],
    REVOLUTION: ['革命だァァァッ！！ 世界をひっくり返してやったぞ！！'],
    PASS: ['チッ、ここは息を潜める。好機は必ず来る！'],
    ENEMY_FEW: ['逃がすかァッ！ 特権階級を打倒せよ！'],
    MY_FEW: ['新世界の夜明けだ！ 勝利は我が手に！'],
    WIN: ['革命万歳！！ 我らの勝利だァァァッ！'],
    LOSE: ['くそっ……だが、革命の炎は決して消えはしない！'],
    GAME_START: ['古い体制をぶっ壊す！ 覚悟しろ！'],
    EXCHANGE: ['変革のための武器だ！ 大切に使え！'],
    NEXT_GAME: ['次の革命の火種を撒きに行くぞ！'],
    AUTO_REACT: ['機械の知恵を借りようが知ったことか！ 革命の熱で焼き尽くすまでだ！']
  },
  JESTER: {
    NORMAL: ['ヒャッハ〜！ どっちに出るかな〜？', 'ポンポンポ〜ンとこれだ！', 'ククク、面白くなってきた！'],
    STRONG: ['ドッカ〜ン！ ビックリした〜？ キャハハ！'],
    MULTI: ['まとめてポイッ！ お揃いでお得でしょ〜？'],
    EIGHT_CUT: ['はいハズレ〜！ 八切りで全部バイバ〜イ！'],
    ELEVEN_BACK: ['クルクル回る〜！ 上が下で下が上〜！'],
    REVOLUTION: ['ウヒャヒャヒャ！ ひっくり返った〜！ 大パニックだ〜！'],
    PASS: ['パスパス〜！ 今は寝てる時間だよ〜ん！'],
    ENEMY_FEW: ['あがりそうなの？ 邪魔しちゃお〜っと！'],
    MY_FEW: ['もうすぐ終わりだよ〜！ バイバ〜イ！'],
    WIN: ['勝っちゃった〜！ 道化師のサーカス大成功〜！'],
    LOSE: ['あちゃ〜！ やられちゃった！ でも楽しかったからOK〜！'],
    GAME_START: ['愉快なショーの始まり始まり〜！'],
    EXCHANGE: ['なにが出るかな〜？ ビックリ箱をあ・げ・る！'],
    NEXT_GAME: ['次のイタズラは何にしようかな〜！'],
    AUTO_REACT: ['アハハ！ ロボット連れてきたの〜？ 一緒に遊ぼうよ〜！']
  }
};

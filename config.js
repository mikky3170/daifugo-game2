/* ====================================================================
 * ROYAL DAIFUGO - config.js
 * [Version: v4.1.0 - 全画面維持オープニング完全統合＆打牌即時応答・シナリオグラフ連動]
 * ==================================================================== */
const APP_VERSION = 'v4.1.1';
const VERSION_HISTORY = [
  {
    ver: 'v4.1.1',
    date: '2025-02-17',
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
    date: '2026-03-31',
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
    date: '2026-03-30',
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
    date: '2025-02-18',
    title: '確定カルテ一元管理による自己矛盾根絶＆アラート警告全廃',
    changes: [
      '【試合確定カルテ】を新設し、総評・処方箋・手番判定を完全連動させ自己矛盾（モグラたたき）を根絶',
      '不可抗力90%の局では理不尽なダメ出し・反省警告カードを構造的に完全停止',
      '大貧民時の「回避成功」などのチグハグを解消し、順位（1〜4位）×カルテの完全マトリクス解説へ刷新',
      '好手・反省手ボタン押下時の不快なブラウザalert警告を全廃し、アドバイザー欄での上品なインライン案内に統一',
      '【敵軍の脅威】および【勝敗を分けた最大の山場】を盤面ファクト直結の6〜7パターンへ拡充'
    ],
    files: ['main.js']
  },
  {
    ver: 'v3.9.6',
    date: '2026-10-04',
    title: '終盤確定読みEndgame Solver黄金版＆王宮ヒエラルキー最高記録正式確立',
    changes: [
      '【最高峰三強バランス確立】10,000試合大規模均等リーグ戦の実証を経て、ギルガメッシュ42.5%（第1位）、女王36.4%（第2位）、覚醒新王33.0%（第3位）の歴代最高峰バランスを公式確立',
      '【健全な終盤確定読み（Endgame Solver）】不完全情報下の推測自滅を排し、安全・確実なあがりルートのみを探索・実行する健全型Endgame Solverを正式統合',
      '【初期貴族9名の個性完全保護】騎士（愚直最弱順）、商人（ペア至上主義）、侯爵（スマートパス）、道化師（奇抜トリッキー）等の愛されるプレイスタイルを完全維持',
      '【伯爵フェーズ制御適正化】伯爵の手札5枚以下での強札解禁（策略フェーズ）を最適化し、中盤から終盤への主導権奪還精度を向上',
      '【全プラットフォーム黄金状態同期】Webフロントエンド（rules.js/ai.js/config.js）およびPythonサーバー・シミュレータ間の完全整合を保証'
    ],
    files: ['config.js', 'rules.js', 'ai.js', 'server.py', 'simulate_league.py']
  },
  {
    ver: 'v3.9.5',
    date: '2026-10-03',
    title: '全18キャラ定石パーセント制御アーキテクチャ＆動的ルール連動基盤正式統合（10,000試合実証版）',
    changes: [
      '【定石パーセント制御アーキテクチャ】全18キャラクターの戦術定石（R2リーチ迎撃〜R14終盤詰み探索）を0%〜100%の数値パラメータ（CHARACTER_TACTICAL_PROFILES）で一元管理する新世代エンジンを導入',
      '【個性厳守＆弱体化ゼロ実証】10,000試合の大規模均等リーグ戦を経て、騎士（愚直最弱順）、商人（ペアまとめ売り）、道化師（奇抜トリッキー）等の愛される個性を完全保護しつつ、ギルガメッシュが過去最高の大富豪率42.6%（第1位）を樹立',
      '【王族ヒエラルキーの完全復権】新王（大富豪率+1.9%向上・第8位）および王（大富豪率+2.6%向上・第9位）の思考精度を底上げし、貴族層9名を完全制圧して王宮の階位秩序を確立',
      '【動的ルールベース基盤】将来のルールトグル拡張（都落ち・禁止あがり・スート縛り等）を見据え、ゲーム設定に応じてAIが反則負け回避や都落ち阻止を動的にON/OFF切り替えできるセーフティガードを配備',
      '【全プラットフォーム同期】Webブラウザ（ai.js/config.js/rules.js）およびPython本番サーバー（server.py/simulate_league.py）の完全同期を達成'
    ],
    files: ['config.js', 'rules.js', 'ai.js', 'server.py', 'simulate_league.py']
  },
  {
    ver: 'v3.9.4',
    date: '2026-03-30',
    title: '棋譜リプレイ・勝敗因分析エンジン深層強化＆UI不具合完全解消',
    changes: [
      '【棋譜リプレイ】全4席の残存手札を全手番で常時全開（完全オープン）表示するスナップショット復元エンジンを実装',
      '【不具合修正】親番がCPUの序盤手番において、手前席（プレイヤー）にCPUの手札が混入・誤表示されるバグを完全解消',
      '【仕様是正】シリーズ通算総括は全試合終了時のみ表示し、試合途中の決着画面からは直前の試合を直接開くよう適正化',
      '【富豪深層鑑定】富豪（2位）の分析を3パターン（相手の神配牌による不可抗力／親権争いの取りこぼし／過酷配牌からの好損切り）へ刷新',
      '【直接ジャンプ】解説枠内の勝因・敗因の横に「👉 第○手へ飛ぶ」インラインジャンプボタンを配備し操作性を向上'
    ],
    files: ['main.js', 'config.js']
  },
  {
    ver: 'v3.9.3',
    date: '2026-10-02',
    title: '宮廷大占勝師マクロ戦記総括エンジン＆プレイヤー主観・勝敗因分析完全統合版',
    changes: [
      '【宮廷大占勝師マクロ戦記総括エンジンの新設】外部AI通信なし・ブラウザ単体で、1試合全体のストーリー（配牌の運命・敵軍の脅威・勝負の転換点・終盤の確定詰み筋）を構造化して一画面で総括する新レイヤーを搭載',
      '【勝敗＆逆境の正当評価】過酷な配牌から大貧民転落を回避し富豪・貧民を死守した「ダメージコントロール・損切り巧者」を客観的に評価。勝利時は3カード制圧や8切り架け橋などの決定的コンボを称賛',
      '【プレイヤー名スナップショット厳格化】リプレイ表示時、シナリオのアバター名（麗人・少年等）がステップログのスナップショット通りに100%正確に反映されるよう是正',
      '【解説者表記の完全昇格】旧来の「軍師AI」「貴族AI」表記を完全撲滅し、「🏛️ 万象を統べる宮廷大占勝師（天の声・天意の託宣）」へ完全統一',
      '【リプレイUI枠のガタつき完全根絶】場・手札・解説枠の最小・固定高さを厳格定義し、ステップ送り時の上下伸縮・画面揺れをゼロに抑制'
    ],
    files: ['main.js', 'config.js']

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
 * 1. 設定・定数・キャラクター定義（Render＆ローカル完全ハイブリッド解決版）
 * ---------------------------------------------------- */
const RENDER_BACKEND_URL = 'https://daifugo-game2.onrender.com';
const LOCAL_BACKEND_URL = 'http://127.0.0.1:5000';

/**
 * サーバー接続先URL動的解決
 * ・localhost / 127.0.0.1 のローカル開発時：127.0.0.1:5000 を優先
 * ・file: プロトコル、GitHub Pages、Web公開時：Render本番サーバー（RENDER_BACKEND_URL）へ自動接続
 */
let AI_SERVER_BASE_URL = RENDER_BACKEND_URL;

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  AI_SERVER_BASE_URL = LOCAL_BACKEND_URL;
} else {
  AI_SERVER_BASE_URL = RENDER_BACKEND_URL;
}

console.log(`[SYSTEM] Target API Backend: ${AI_SERVER_BASE_URL}`);

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
  eightCut: true,          // 8切り
  elevenBack: true,        // 11バック
  revolution: true,        // 革命
  spade3: true,            // スペ3返し
  suitBinding: false,      // スート縛り（初期設定: OFF）
  capitalFall: true,       // 都落ち（本格競技ルール: ON）
  forbiddenFinish: true,   // 禁止あがり（本格競技ルール: ON）
  sequence: false          // 階段（初期設定: OFF）
};

let gameRules = { ...DEFAULT_GAME_RULES };

/* ----------------------------------------------------
 * プレイヤー操作アシスト・ゲーム設定
 * ---------------------------------------------------- */
const GAME_SETTINGS = {
  forbiddenFinishAlert: true // 禁止あがり警告アシスト（初期値: ON）
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
 * キャラクター別 定石パーセント設定値（個性整合 ＆ 弱体化ゼロ保証）
 * ---------------------------------------------------- */
const CHARACTER_TACTICAL_PROFILES = {
  // ① 原初の覇王：全知全能（透視15,000手読み・天の鎖）
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

  // ② 秦の始皇帝：法家統制手札圧縮 ＆ 11自滅抑制
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

  // ③ 女王 (SUPER_AI)：正統派冷徹知性（5,000回MCTS・優雅な温存）
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

  // ④ アレク王：ファランクス重装突撃 ＆ 8架け橋
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

  // ⑤ 聖徳太子：完全傾聴カウンター ＆ 大調和
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

  // ⑥ 織田信長：親番三段撃ち速攻 ＆ 電撃8切り
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

  // ⑦ 新王 (BEGINNER_AI)：俊英マルチセット ＆ 堅実思考
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

  // ⑧ 王 (KING)：163次元APEX大局観 ＆ 君主の迎撃
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

  // ⑨ 覚醒新王 (AWAKENED_KING)：修練の果て覚醒 ＆ PUCT融合
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

  // ⑩ 公爵 (DUKE)：徹底温存 ＆ リーチ防衛動員令
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

  // ⑪ 侯爵 (MARQUIS)：スマートパス重視 ＆ エレガント手札保存
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

  // ⑫ 伯爵 (COUNT)：フェーズ可変策略家（手札5枚以下で強札連打）
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

  // ⑬ 騎士 (KNIGHT)：愚直最弱順（駆け引き・パス嫌い）
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

  // ⑭ 商人 (MERCHANT)：ペア至上主義・まとめ売り
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

  // ⑮ 学者 (SCHOLAR)：残存カード分析 ＆ 確定詰み特化
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

  // ⑯ 軍師 (STRATEGIST)：親権妨害 ＆ 8切りコントロール
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

  // ⑰ 革命家 (REVOLUTIONARY)：革命 ＆ 8切り特化
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

  // ⑱ 道化師 (JESTER)：予測不能トリッキー（カオス）
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

/* 初期解放キャラクター10名の定数定義（一元管理） */
const DEFAULT_UNLOCKED_CHARS = [
  'DUKE', 'MARQUIS', 'COUNT', 'KNIGHT', 'MERCHANT', 'SCHOLAR', 'STRATEGIST', 'REVOLUTIONARY', 'JESTER', 'KING'
];

/* キャラクター定義順：初期貴族9名 ➔ 王族4名 ➔ 歴史の英傑5名 */
const CHARACTER_DEFS = {
  // ① 初期宮廷貴族・戦略家（9名）
  DUKE: { id: 'DUKE', name: '公爵', fullName: '公爵', icon: '👑' },
  MARQUIS: { id: 'MARQUIS', name: '侯爵', fullName: '侯爵', icon: '🍷' },
  COUNT: { id: 'COUNT', name: '伯爵', fullName: '伯爵', icon: '📜' },
  KNIGHT: { id: 'KNIGHT', name: '騎士', fullName: '騎士', icon: '⚔️' },
  MERCHANT: { id: 'MERCHANT', name: '商人', fullName: '商人', icon: '⚖️' },
  SCHOLAR: { id: 'SCHOLAR', name: '学者', fullName: '学者', icon: '📖' },
  STRATEGIST: { id: 'STRATEGIST', name: '軍師', fullName: '軍師', icon: '♟️' },
  REVOLUTIONARY: { id: 'REVOLUTIONARY', name: '革命家', fullName: '革命家', icon: '🔥' },
  JESTER: { id: 'JESTER', name: '道化師', fullName: '道化師', icon: '🤡' },

  // ② 王宮の頂点グループ（4名：王族）
  BEGINNER_AI: { id: 'BEGINNER_AI', name: '新王', fullName: '新王', icon: '🤴' },
  KING: { id: 'KING', name: '王', fullName: '王', icon: '🏰' },
  SUPER_AI: { id: 'SUPER_AI', name: '女王', fullName: '女王', icon: '👸' },
  AWAKENED_KING: { id: 'AWAKENED_KING', name: '覚醒新王', fullName: '覚醒新王', icon: '👑' },

  // ③ 歴史の英傑・神話（5名）
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
  lady: "fugo-絵柄/lady.png"
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
    NEXT_GAME: ['次の盤面へ参るぞ！ 我の進撃を止められる者がおるか！']
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
    NEXT_GAME: ['さあ、次の盤面へ進もう。私の歩みは止まらない！']
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
    NEXT_GAME: ['次はもっと良い手を指してみせるよ！']
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
    NEXT_GAME: ['さあ、次の対局にて再び相見えよう！']
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
    NEXT_GAME: ['さあ、次の盤面でも踊っていただきますわ。']
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
    NEXT_GAME: ['次の戦場へ参ろうぞ！', 'まだ余の進撃は止まらぬ！']
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
    NEXT_GAME: ['新たな巡り合わせへ参りましょう。', 'いつでもお相手いたしますよ。']
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
    NEXT_GAME: ['さらなる遠征を命ずる！', '次の地も朕が平定しよう。']
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
    NEXT_GAME: ['次の遠征へ向かうぞ！ 我に続け！', 'まだ見ぬ戦場が我らを呼んでいる！']
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
    NEXT_GAME: ['次の勝負も手加減は無用ぞ！']
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
    NEXT_GAME: ['次の夜会でもお相手願いますわ。']
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
    NEXT_GAME: ['次の一幕を始めるとしようか！']
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
    NEXT_GAME: ['次の戦場へ向かうぞ！ 続け！']
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
    NEXT_GAME: ['次の商談に向かいましょうかね！']
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
    NEXT_GAME: ['次の実験（対局）を開始しましょう。']
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
    NEXT_GAME: ['次の戦場へ軍を進めるぞ！']
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
    NEXT_GAME: ['次の革命の火種を撒きに行くぞ！']
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
    NEXT_GAME: ['次のイタズラは何にしようかな〜！']
  }
};

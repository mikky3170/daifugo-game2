# [Python Data Processor] create_dataset_163dim.py
# 【王打倒・最終決戦仕様】パターンA・B・C限定 / 勝者（1位・2位）厳選 / ペア出し手札圧縮ブースト 163次元抽出スクリプト

import os
import sys
import glob
import json
import numpy as np

# ----------------------------------------------------
# 1. 基本定義・カードマッピング (163次元完全対応)
# ----------------------------------------------------
SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
RANK_VALUE_MAP = {r: i + 1 for i, r in enumerate(RANKS)}
RANK_VALUE_MAP['JOKER'] = 14

def card_to_idx(card):
    """カード辞書またはオブジェクトから53次元インデックス(0〜52)を算出"""
    if not card:
        return -1
    is_joker = card.get('isJoker') or card.get('rank') == 'JOKER' or card.get('display') == 'JOKER'
    if is_joker:
        return 52
    suit = card.get('suit') or card.get('suitSymbol')
    rank = card.get('rank') or card.get('display')
    if suit in SUITS and rank in RANKS:
        return SUITS.index(suit) * 13 + RANKS.index(rank)
    return -1

def encode_cards_to_vector(cards):
    """カードリストを53次元ワンホット/マルチホットベクトルに変換"""
    vec = np.zeros(53, dtype=np.float32)
    if not cards:
        return vec
    for c in cards:
        idx = card_to_idx(c)
        if 0 <= idx < 53:
            vec[idx] = 1.0
    return vec

def build_163dim_vector(hand, field, cleared, is_rev, is_eb):
    """手札(53) + 場(53) + 流札(53) + 盤面フラグ(4) = 163次元ベクトルを構築"""
    h_vec = encode_cards_to_vector(hand)
    f_vec = encode_cards_to_vector(field)
    c_vec = encode_cards_to_vector(cleared)

    hand_len = len(hand) if hand else 0
    flags = np.array([
        1.0 if is_rev else 0.0,
        1.0 if is_eb else 0.0,
        1.0 if (not field or len(field) == 0) else 0.0,
        min(1.0, hand_len / 14.0)
    ], dtype=np.float32)

    return np.concatenate([h_vec, f_vec, c_vec, flags])

# ----------------------------------------------------
# 2. ログファイルの自動探索
# ----------------------------------------------------
def find_log_files():
    """カレントディレクトリ内の対戦ログファイル（JSONL / JSON）を網羅的に探索"""
    candidates = []
    # 1. 典型的なファイル名
    for pat in ["royal_daifugo_steps_*.jsonl", "royal_daifugo_batch_*.json", "game_logs.jsonl", "training_data.jsonl", "*.jsonl"]:
        for f in glob.glob(pat):
            if os.path.isfile(f) and f not in candidates:
                candidates.append(f)
    return candidates

def load_records_from_file(filepath):
    """ファイルからステップレコードを読み込む"""
    records = []
    print(f"📖 ログファイルを読み込み中: {filepath} ({os.path.getsize(filepath) / (1024*1024):.2f} MB)...", flush=True)

    if filepath.endswith('.jsonl'):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    records.append(obj)
                except Exception:
                    pass
    elif filepath.endswith('.json'):
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if isinstance(data, dict) and 'steps' in data:
                    records.extend(data['steps'])
                elif isinstance(data, list):
                    records.extend(data)
            except Exception as e:
                print(f"⚠️ JSONパースエラー: {e}", flush=True)

    return records

# ----------------------------------------------------
# 3. エキスパート厳選・抽出パイプライン
# ----------------------------------------------------
def create_expert_dataset():
    print("=================================================================", flush=True)
    print("🏆 ROYAL DAIFUGO - 王打倒・最高純度エキスパートデータセット抽出", flush=True)
    print("=================================================================", flush=True)

    log_files = find_log_files()
    if not log_files:
        print("❌ ログファイル（.jsonl または .json）が見つかりません。", flush=True)
        print("   ブラウザまたはサーバーからシミュレーションを実行し、ログを保存してください。", flush=True)
        return

    print(f"🔍 発見したログファイル候補 ({len(log_files)}件):")
    for i, f in enumerate(log_files):
        print(f"  [{i+1}] {f}")

    all_raw_steps = []
    for f in log_files:
        steps = load_records_from_file(f)
        all_raw_steps.extend(steps)

    print(f"\n📊 読み込み完了: 総手番データ {len(all_raw_steps):,} 手", flush=True)

    X_list = []
    Y_list = []

    # 統計トラッキング
    stats = {
        'total_examined': 0,
        'excluded_pattern_d': 0,
        'excluded_losers': 0,
        'excluded_passes': 0,
        'excluded_joker_blunder': 0,
        'extracted_single': 0,
        'extracted_multi_boosted': 0,
        'char_counts': {}
    }

    ALLOWED_PATTERNS = {'PATTERN_A', 'PATTERN_B', 'PATTERN_C'}

    for st in all_raw_steps:
        stats['total_examined'] += 1

        # 【条件1】パターン限定（A・B・Cのみ、Dは100%除外）
        pattern = st.get('pattern', '')
        if pattern and pattern not in ALLOWED_PATTERNS:
            stats['excluded_pattern_d'] += 1
            continue

        # 【条件2】順位フィルター（大富豪・富豪のみ。3位・4位は全カット）
        rank = st.get('finalRank')
        if rank not in [1, 2]:
            stats['excluded_losers'] += 1
            continue

        # パス（何もしない手）は除外（カードを出した攻めの勝ち筋を抽出）
        chosen_move = st.get('chosenMove')
        if not chosen_move or st.get('isPass'):
            stats['excluded_passes'] += 1
            continue

        hand = st.get('hand', [])
        field = st.get('fieldCards', [])
        cleared = st.get('clearedCards', [])
        is_rev = bool(st.get('isRevolution', False))
        is_eb = bool(st.get('isElevenBack', False))
        cid = st.get('playerChar', 'UNKNOWN')

        # 【条件3】戦術サニタイズ（序盤のJoker無駄撃ちの除外）
        is_joker_play = any(c.get('isJoker') or c.get('rank') == 'JOKER' for c in chosen_move)
        if is_joker_play and len(hand) >= 6 and len(field) > 0:
            top_val = RANK_VALUE_MAP.get(field[0].get('rank', '3'), 3)
            if (not is_rev and top_val <= 8) or (is_rev and top_val >= 6):
                stats['excluded_joker_blunder'] += 1
                continue

        # 163次元入力ベクトルの生成
        x_vec = build_163dim_vector(hand, field, cleared, is_rev, is_eb)

        # 53次元ターゲットベクトルの生成（マルチホット）
        y_vec = np.zeros(53, dtype=np.float32)
        for c in chosen_move:
            c_idx = card_to_idx(c)
            if 0 <= c_idx < 53:
                y_vec[c_idx] = 1.0

        # 【条件4】ペア出し手札圧縮ブースト（商人と王の複数枚出しを重み2倍で登録）
        move_len = len(chosen_move)
        if move_len >= 2:
            # 複数枚出しは2回登録（学習ウェイト2.0倍）
            X_list.append(x_vec)
            Y_list.append(y_vec)
            X_list.append(x_vec)
            Y_list.append(y_vec)
            stats['extracted_multi_boosted'] += 2
        else:
            X_list.append(x_vec)
            Y_list.append(y_vec)
            stats['extracted_single'] += 1

        stats['char_counts'][cid] = stats['char_counts'].get(cid, 0) + 1

    if not X_list:
        print("❌ 条件に一致する有効な手番データが抽出できませんでした。ログデータを確認してください。", flush=True)
        return

    X_arr = np.array(X_list, dtype=np.float32)
    Y_arr = np.array(Y_list, dtype=np.float32)

    # ----------------------------------------------------
    # 4. NPZファイルへの保存
    # ----------------------------------------------------
    out_filename = "expert_dataset_163dim.npz"
    np.savez_compressed(out_filename, X=X_arr, Y=Y_arr)

    print("\n=================================================================", flush=True)
    print(f"🎉 【最高純度エキスパートデータセット完成】: '{out_filename}'", flush=True)
    print("=================================================================", flush=True)
    print(f"・検査総手数:             {stats['total_examined']:,} 手")
    print(f"・除外: パターンD(雑多戦): {stats['excluded_pattern_d']:,} 手")
    print(f"・除外: 負け筋(3位/4位):   {stats['excluded_losers']:,} 手")
    print(f"・除外: パス手番:         {stats['excluded_passes']:,} 手")
    print(f"・除外: Joker序盤浪費:    {stats['excluded_joker_blunder']:,} 手")
    print("-----------------------------------------------------------------")
    print(f"🌟 最終登録サンプル総数:   {len(X_arr):,} 手")
    print(f"   ├ 単騎出し手順:        {stats['extracted_single']:,} 手")
    print(f"   └ 複数枚出し(強化2倍):  {stats['extracted_multi_boosted']:,} 手 (手札圧縮ブースト)")
    print("-----------------------------------------------------------------")
    print("👑 抽出キャラクター別内訳 (勝者のみ):")
    for cid, cnt in sorted(stats['char_counts'].items(), key=lambda x: x[1], reverse=True):
        print(f"   ・{cid:15s}: {cnt:,} 手")
    print(f"・入力次元: {X_arr.shape[1]} 次元 (手札53 + 場53 + 流札53 + フラグ4)")
    print(f"・出力次元: {Y_arr.shape[1]} 次元 (複数枚出し完全対応)")
    print("=================================================================\n", flush=True)

if __name__ == '__main__':
    create_expert_dataset()
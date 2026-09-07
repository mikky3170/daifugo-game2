# [Python Standalone Benchmark] simulate_1000.py
# 大富豪 1,000試合 AI総当たり高速シミュレーター (初級AI PyTorchモデル直結)
import os
import random
import time
import torch
import torch.nn as nn

# ----------------------------------------------------
# 1. PyTorchモデルの定義 ＆ ロード
# ----------------------------------------------------
class DaifugoAI(nn.Module):
    def __init__(self):
        super(DaifugoAI, self).__init__()
        self.fc1 = nn.Linear(106, 128)
        self.fc2 = nn.Linear(128, 128)
        self.fc3 = nn.Linear(128, 53)
        self.relu = nn.ReLU()

    def forward(self, hand, field):
        x = torch.cat((hand, field), dim=1)
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.fc3(x)
        return x

device = torch.device('cpu')
model = DaifugoAI().to(device)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'daifugo_ai.pth')

if os.path.exists(MODEL_PATH):
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.eval()
        print(f"✅ 学習済みモデル '{MODEL_PATH}' をロードしました。")
    except Exception as e:
        print(f"⚠️ モデルロード警告: {e}")
else:
    print(f"⚠️ '{MODEL_PATH}' が見つかりません。ランダム推論で待機します。")

# ----------------------------------------------------
# 2. カード定義 & ヘルパー
# ----------------------------------------------------
SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
RANK_VALUE_MAP = {r: i + 1 for i, r in enumerate(RANKS)}
RANK_VALUE_MAP['JOKER'] = 14

class Card:
    def __init__(self, suit, display, is_joker=False):
        self.suit = suit
        self.display = display
        self.is_joker = is_joker

    def key(self):
        return 'JOKER' if self.is_joker else self.display

    def val(self):
        return RANK_VALUE_MAP[self.key()]

    def strength(self, rev=False):
        if self.is_joker: return 9999
        v = self.val()
        return (14 - v) if rev else v

    def __repr__(self):
        return '★JOKER' if self.is_joker else f"{self.suit}{self.display}"

def create_deck():
    deck = [Card(s, r) for s in SUITS for r in RANKS]
    deck.append(Card('★', 'JOKER', True))
    deck.append(Card('☆', 'JOKER', True))
    return deck

def card_to_idx(c):
    if c.is_joker: return 52
    if c.suit in SUITS and c.display in RANKS:
        return SUITS.index(c.suit) * 13 + RANKS.index(c.display)
    return -1

def encode_cards(cards):
    vec = [0.0] * 53
    for c in cards:
        idx = card_to_idx(c)
        if 0 <= idx < 53: vec[idx] = 1.0
    return vec

def get_play_strength(cards, rev=False):
    if len(cards) == 1 and cards[0].is_joker: return 9999
    non_joker = [c for c in cards if not c.is_joker]
    return 9999 if not non_joker else non_joker[0].strength(rev)

def is_valid_play(cards, field, rev=False):
    if not cards: return False
    # ♠3返し
    if len(field) == 1 and field[0].is_joker and len(cards) == 1 and not cards[0].is_joker and cards[0].suit == '♠' and cards[0].display == '3':
        return True
    non_joker = [c for c in cards if not c.is_joker]
    if non_joker:
        t = non_joker[0].display
        if not all(c.display == t for c in non_joker): return False
    if not field: return True
    if len(cards) != len(field): return False
    if len(field) == 1 and field[0].is_joker: return False
    p_str = get_play_strength(cards, rev)
    f_str = get_play_strength(field, rev)
    return True if p_str == 9999 else p_str > f_str

def get_all_valid_moves(hand, field, rev=False):
    moves = []
    jokers = [c for c in hand if c.is_joker]
    non_jokers = [c for c in hand if not c.is_joker]
    groups = {}
    for c in non_jokers:
        groups.setdefault(c.display, []).append(c)

    if not field:
        for disp, cards in groups.items():
            max_len = len(cards) + len(jokers)
            for l in range(1, max_len + 1):
                nat = min(l, len(cards))
                jok = l - nat
                if jok <= len(jokers):
                    moves.append(cards[:nat] + jokers[:jok])
        if jokers: moves.append([jokers[0]])
    else:
        req = len(field)
        if req == 1 and field[0].is_joker:
            spade3 = next((c for c in non_jokers if c.suit == '♠' and c.display == '3'), None)
            if spade3: moves.append([spade3])
            return moves

        for disp, cards in groups.items():
            nat = min(req, len(cards))
            jok = req - nat
            if nat > 0 and jok <= len(jokers):
                cand = cards[:nat] + jokers[:jok]
                if is_valid_play(cand, field, rev):
                    moves.append(cand)
        if req == 1 and jokers and is_valid_play([jokers[0]], field, rev):
            moves.append([jokers[0]])

    return moves

# ----------------------------------------------------
# 3. キャラクター思考ルーチン (11キャラ完全再現)
# ----------------------------------------------------
CHARACTERS = ['DUKE', 'MARQUIS', 'COUNT', 'KNIGHT', 'MERCHANT', 'SCHOLAR', 'STRATEGIST', 'REVOLUTIONARY', 'JESTER', 'KING', 'BEGINNER_AI']
CHAR_NAMES = {
    'KING': '🏰 王', 'MERCHANT': '⚖️ 商人', 'MARQUIS': '🍷 侯爵', 'REVOLUTIONARY': '🔥 革命家',
    'COUNT': '📜 伯爵', 'SCHOLAR': '📖 学者', 'KNIGHT': '⚔️ 騎士', 'DUKE': '👑 公爵',
    'JESTER': '🤡 道化師', 'STRATEGIST': '♟️ 軍師', 'BEGINNER_AI': '🤖 初級AI'
}

def evaluate_move_default(move):
    return (len(move) * 10) - move[0].val()

def decide_move(cid, hand, field, rev, other_counts, next_count, sim_all=None):
    valid = get_all_valid_moves(hand, field, rev)
    if not valid: return None
    can_pass = (len(field) > 0)

    # 🤖 初級AI (PyTorchモデル推論・インメモリ直結)
    if cid == 'BEGINNER_AI':
        hand_vec = encode_cards(hand)
        field_vec = encode_cards(field)
        with torch.no_grad():
            h_t = torch.tensor([hand_vec], dtype=torch.float32).to(device)
            f_t = torch.tensor([field_vec], dtype=torch.float32).to(device)
            scores = model(h_t, f_t).squeeze(0).tolist()

        best_m = None
        best_s = -float('inf')
        for m in valid:
            s = sum(scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53) / max(1, len(m))
            if len(m) >= 2: s += 0.5 * len(m)
            if s > best_s:
                best_s = s
                best_m = m
        return best_m

    # 🏰 王 (終盤詰め・温存・最強手)
    if cid == 'KING':
        finish = next((m for m in valid if len(m) == len(hand)), None)
        if finish: return finish
        # 複数枚出しを重視しつつ、手札を減らす
        valid.sort(key=lambda m: (len(m) * 15 - m[0].val()), reverse=True)
        return valid[0]

    # ⚖️ 商人 (ペア・セット超優先)
    if cid == 'MERCHANT':
        groups = {}
        for c in hand: groups[c.key()] = groups.get(c.key(), 0) + 1
        best_m, best_s = valid[0], -999
        for m in valid:
            s = evaluate_move_default(m)
            if len(m) == 2: s += 15
            elif len(m) >= 3: s += 25
            if len(m) == 1 and groups.get(m[0].key(), 0) >= 2: s -= 20
            if s > best_s: best_s, best_m = s, m
        return best_m

    # 🍷 侯爵 (スコア重視)
    if cid == 'MARQUIS':
        best_m = max(valid, key=evaluate_move_default)
        return None if (can_pass and evaluate_move_default(best_m) < -5) else best_m

    # ⚔️ 騎士 (最弱順)
    if cid == 'KNIGHT':
        valid.sort(key=lambda m: (m[0].val() if not rev else -m[0].val()))
        return valid[0]

    # 🔥 革命家 (革命・8切り重視)
    if cid == 'REVOLUTIONARY':
        quad = next((m for m in valid if len(m) >= 4), None)
        if quad and not field: return quad
        best_m, best_s = valid[0], -999
        for m in valid:
            s = evaluate_move_default(m)
            if m[0].display == '8': s += 50
            if s > best_s: best_s, best_m = s, m
        return best_m

    # ♟️ 軍師 (妨害8切り)
    if cid == 'STRATEGIST':
        danger = any(cnt <= 3 for cnt in other_counts)
        best_m, best_s = valid[0], -999
        for m in valid:
            s = evaluate_move_default(m)
            if danger:
                if m[0].display == '8': s += 60
                elif m[0].display in ['2', 'A']: s += 40
            if s > best_s: best_s, best_m = s, m
        return best_m

    # 👑 公爵 (温存型)
    if cid == 'DUKE':
        high = [c for c in hand if c.display in ['2', 'A']]
        other = [c for c in hand if c.display not in ['2', 'A']]
        filtered = [m for m in valid if not any(c.display in ['2', 'A'] for c in m)] if len(high) < len(other) else valid
        if not filtered: return None if can_pass else valid[0]
        return max(filtered, key=evaluate_move_default)

    # 📜 伯爵 / 📖 学者 / 🤡 道化師 / その他
    if cid == 'JESTER' and random.random() < 0.4:
        if can_pass and random.random() < 0.5: return None
        return random.choice(valid)

    valid.sort(key=evaluate_move_default, reverse=True)
    return valid[0]

# ----------------------------------------------------
# 4. 高速1試合実行エンジン (8切り親権・上がり後親権完全準拠)
# ----------------------------------------------------
def run_single_game(seat_chars):
    deck = create_deck()
    random.shuffle(deck)

    hands = {s: [] for s in range(4)}
    for i, c in enumerate(deck):
        hands[i % 4].append(c)
    for s in range(4):
        hands[s].sort(key=lambda c: (14 if c.is_joker else c.val()))

    field = []
    is_rev = False
    is_eb = False
    last_seat = None
    pass_cnt = 0
    finished = []
    ranks = {}

    curr_seat = 0
    for s in range(4):
        if any(c.suit == '♦' and c.display == '3' for c in hands[s]):
            curr_seat = s
            break

    turn_limit = 250
    while len(finished) < 3 and turn_limit > 0:
        turn_limit -= 1
        s = curr_seat
        p_hand = hands[s]
        rev = (is_rev != is_eb)
        cid = seat_chars[s]

        next_cnt = len(hands[(s + 1) % 4])
        others = [len(hands[st]) for st in range(4) if st != s and st not in finished]
        move = decide_move(cid, p_hand, field, rev, others, next_cnt)

        if move:
            for c in move: p_hand.remove(c)
            field = move
            last_seat = s
            pass_cnt = 0

            if len(move) >= 4:
                is_rev = not is_rev
                for st in range(4): hands[st].sort(key=lambda c: (14 if c.is_joker else c.val()))
            if move[0].display == 'J':
                is_eb = True
                for st in range(4): hands[st].sort(key=lambda c: (14 if c.is_joker else c.val()))

            is_eight = (move[0].display == '8')
            if len(p_hand) == 0 and s not in finished:
                finished.append(s)
                ranks[s] = ['大富豪', '富豪', '貧民', '大貧民'][len(finished) - 1]

            # 8切り親権維持
            if is_eight:
                field = []
                is_eb = False
                pass_cnt = 0
                active = [st for st in range(4) if st not in finished]
                if len(active) <= 1: break

                if s in finished:
                    while True:
                        curr_seat = (curr_seat + 1) % 4
                        if curr_seat not in finished: break
                else:
                    curr_seat = s
                continue
        else:
            pass_cnt += 1

        active = [st for st in range(4) if st not in finished]
        if len(active) <= 1: break

        # 全員パス後の親権処理
        if field and (pass_cnt >= len(active) - 1 or pass_cnt >= 3):
            field = []
            is_eb = False
            pass_cnt = 0
            if last_seat is not None:
                curr_seat = last_seat
                while curr_seat in finished:
                    curr_seat = (curr_seat + 1) % 4
        else:
            while True:
                curr_seat = (curr_seat + 1) % 4
                if curr_seat not in finished: break

    remaining = [st for st in range(4) if st not in finished]
    if remaining:
        finished.append(remaining[0])
        ranks[remaining[0]] = '大貧民'

    rank_vals = {'大富豪': 1, '富豪': 2, '貧民': 3, '大貧民': 4}
    return {seat_chars[s]: rank_vals[ranks[s]] for s in range(4)}

# ----------------------------------------------------
# 5. メイン：1,000試合ベンチマーク実行
# ----------------------------------------------------
def main():
    TOTAL_GAMES = 1000
    print("==========================================================================")
    print(f"🚀 大富豪 1,000試合 高速自己対戦シミュレーター (全11キャラ均等選抜)")
    print("   ※PyTorchモデル (初級AI) インメモリ直結推論")
    print("==========================================================================")

    stats = {cid: {'games': 0, 'df': 0, 'f': 0, 'h': 0, 'dh': 0, 'rankSum': 0} for cid in CHARACTERS}
    char_play_counts = {cid: 0 for cid in CHARACTERS}

    start_time = time.time()

    for g in range(1, TOTAL_GAMES + 1):
        # 11キャラ均等選抜
        all_ids = sorted(CHARACTERS, key=lambda x: (char_play_counts[x], random.random()))
        seat_chars = all_ids[:4]
        random.shuffle(seat_chars)
        for cid in seat_chars: char_play_counts[cid] += 1

        res = run_single_game(seat_chars)

        for cid, f_rank in res.items():
            stats[cid]['games'] += 1
            if f_rank == 1: stats[cid]['df'] += 1
            elif f_rank == 2: stats[cid]['f'] += 1
            elif f_rank == 3: stats[cid]['h'] += 1
            elif f_rank == 4: stats[cid]['dh'] += 1
            stats[cid]['rankSum'] += f_rank

        if g % 100 == 0 or g == TOTAL_GAMES:
            elapsed = time.time() - start_time
            pct = g / TOTAL_GAMES * 100
            print(f"   [進捗] {g:4d}/{TOTAL_GAMES} 試合完了 ({pct:5.1f}%) - 経過時間: {elapsed:.1f}秒")

    total_time = time.time() - start_time
    print(f"\n🎉 1,000試合対戦が完了しました！ (総所要時間: {total_time:.2f}秒)")
    print("==========================================================================")
    print(f"{'順位':<4} {'キャラクター':<14} {'試合数':<7} {'大富豪率':<9} {'平均順位':<9} {'大 / 富 / 貧 / 大貧'}")
    print("--------------------------------------------------------------------------")

    results_list = []
    for cid in CHARACTERS:
        st = stats[cid]
        win_pct = (st['df'] / st['games'] * 100) if st['games'] > 0 else 0.0
        avg_rank = (st['rankSum'] / st['games']) if st['games'] > 0 else 4.0
        results_list.append({'cid': cid, 'name': CHAR_NAMES[cid], 'st': st, 'win_pct': win_pct, 'avg_rank': avg_rank})

    results_list.sort(key=lambda x: x['win_pct'], reverse=True)

    for i, r in enumerate(results_list, 1):
        st = r['st']
        breakdown = f"{st['df']:3d} / {st['f']:3d} / {st['h']:3d} / {st['dh']:3d}"
        print(f"{i:<4} {r['name']:<14} {st['games']:<5}戦  {r['win_pct']:6.1f}%   {r['avg_rank']:5.2f}位    {breakdown}")

    print("==========================================================================\n")

if __name__ == '__main__':
    main()


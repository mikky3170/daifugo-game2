# [Python Server] server.py - 大富豪 上級AI(110次元)・中級AI(106次元)推論 ＆ 5パターンシャッフルシミュレーションサーバー
import os
import json
import time
import random
import math
import torch
import torch.nn as nn
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

# ----------------------------------------------------
# 1. PyTorchモデルの定義（上級用 Sequential ＆ 中級用 FC）
# ----------------------------------------------------
class MidDaifugoAI(nn.Module):
    """中級AI用: fc1 -> fc2 -> fc3 (106 -> 128 -> 64 -> 53)"""
    def __init__(self, in_dim=106, h1=128, h2=64, out_dim=53):
        super(MidDaifugoAI, self).__init__()
        self.fc1 = nn.Linear(in_dim, h1)
        self.fc2 = nn.Linear(h1, h2)
        self.fc3 = nn.Linear(h2, out_dim)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.fc3(x)
        return x

class DeepHiDaifugoAI(nn.Module):
    """上級AI用: net (Sequential + BatchNorm対応 110次元入力モデル)"""
    def __init__(self, net_module):
        super(DeepHiDaifugoAI, self).__init__()
        self.net = net_module

    def forward(self, x):
        return self.net(x)

device = torch.device('cpu')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_hi_model(target_filenames):
    for fname in target_filenames:
        full_path = os.path.join(BASE_DIR, fname)
        if not os.path.exists(full_path) and os.path.exists(fname):
            full_path = os.path.abspath(fname)
        if not os.path.exists(full_path):
            continue

        try:
            state_dict = torch.load(full_path, map_location=device)
            if any(k.startswith("net.") for k in state_dict):
                net_keys = list(state_dict.keys())
                module_dict = nn.ModuleDict()
                for k in net_keys:
                    parts = k.split('.')
                    if len(parts) >= 3 and parts[2] == 'weight':
                        layer_idx = parts[1]
                        w = state_dict[k]
                        if len(w.shape) == 2:
                            bias = f"net.{layer_idx}.bias" in state_dict
                            module_dict[layer_idx] = nn.Linear(w.shape[1], w.shape[0], bias=bias)
                        elif len(w.shape) == 1:
                            module_dict[layer_idx] = nn.BatchNorm1d(w.shape[0])

                sorted_indices = sorted([int(i) for i in module_dict.keys()])
                seq_layers = []
                for i in range(max(sorted_indices) + 1):
                    s_i = str(i)
                    if s_i in module_dict:
                        seq_layers.append(module_dict[s_i])
                    else:
                        seq_layers.append(nn.ReLU())

                net = nn.Sequential(*seq_layers)
                model = DeepHiDaifugoAI(net).to(device)
                model.load_state_dict(state_dict)
                model.eval()
                in_dim = state_dict['net.0.weight'].shape[1] if 'net.0.weight' in state_dict else 110
                print(f"✅ 上級AIモデルロード成功: '{os.path.basename(full_path)}' (入力次元: {in_dim})")
                return model, True, os.path.basename(full_path), in_dim
            else:
                m = MidDaifugoAI().to(device)
                m.load_state_dict(state_dict)
                m.eval()
                print(f"✅ 上級AIモデルロード成功 (標準FC): '{os.path.basename(full_path)}'")
                return m, True, os.path.basename(full_path), 106
        except Exception as e:
            print(f"⚠️ モデルファイル '{fname}' のロードで例外が発生しました: {e}")

    return None, False, None, 110

def load_mid_model(target_filenames):
    for fname in target_filenames:
        full_path = os.path.join(BASE_DIR, fname)
        if not os.path.exists(full_path) and os.path.exists(fname):
            full_path = os.path.abspath(fname)
        if not os.path.exists(full_path):
            continue

        try:
            state_dict = torch.load(full_path, map_location=device)
            in_dim = state_dict['fc1.weight'].shape[1] if 'fc1.weight' in state_dict else 106
            h1 = state_dict['fc1.weight'].shape[0] if 'fc1.weight' in state_dict else 128
            h2 = state_dict['fc2.weight'].shape[0] if 'fc2.weight' in state_dict else 64
            out_dim = state_dict['fc3.weight'].shape[0] if 'fc3.weight' in state_dict else 53

            ai_model = MidDaifugoAI(in_dim=in_dim, h1=h1, h2=h2, out_dim=out_dim).to(device)
            ai_model.load_state_dict(state_dict)
            ai_model.eval()
            print(f"✅ 中級AIモデルロード成功: '{os.path.basename(full_path)}' (構成: {in_dim} -> {h1} -> {h2} -> {out_dim})")
            return ai_model, True, os.path.basename(full_path), in_dim
        except Exception as e:
            print(f"⚠️ 中級モデルロード例外 '{fname}': {e}")

    return MidDaifugoAI().to(device), False, None, 106

# 上級AIモデルのロード
model_hi, model_hi_loaded, hi_model_name, hi_in_dim = load_hi_model([
    'daifugou_ai_hi.pth',
    'daifugo_ai_hi.pth'
])
if not model_hi_loaded:
    print("❌ [警告] 上級AIモデル（daifugou_ai_hi.pth）が見つかりません。")

# 中級AIモデルのロード
model_mid, model_mid_loaded, mid_model_name, mid_in_dim = load_mid_model([
    'daifugo_ai_mid.pth',
    'daifugou_ai_mid.pth',
    'daifugo_ai.pth'
])
if not model_mid_loaded:
    print("❌ [警告] 中級AIモデル（daifugo_ai_mid.pth）が見つかりません。")

# ----------------------------------------------------
# 2. カード定義 & ヘルパー (54枚完全ユニーク識別)
# ----------------------------------------------------
SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
RANK_VALUE_MAP = {r: i + 1 for i, r in enumerate(RANKS)}
RANK_VALUE_MAP['JOKER'] = 14

CHARACTER_NAMES = {
    'DUKE': '公爵',
    'MARQUIS': '侯爵',
    'COUNT': '伯爵',
    'KNIGHT': '騎士',
    'MERCHANT': '商人',
    'SCHOLAR': '学者',
    'STRATEGIST': '軍師',
    'REVOLUTIONARY': '革命家',
    'JESTER': '道化師',
    'KING': '王',
    'BEGINNER_AI': '上級AI',
    'MID_AI': '中級AI'
}

CHARACTER_ICONS = {
    'DUKE': '👑', 'MARQUIS': '🍷', 'COUNT': '📜', 'KNIGHT': '⚔️',
    'MERCHANT': '⚖️', 'SCHOLAR': '📖', 'STRATEGIST': '♟️',
    'REVOLUTIONARY': '🔥', 'JESTER': '🤡', 'KING': '🏰',
    'BEGINNER_AI': '🤖', 'MID_AI': '🦾'
}

PLAYERS = [0, 1, 2, 3]

class Card:
    def __init__(self, suit, display, is_joker=False, joker_id=None):
        self.suit = suit
        self.display = display
        self.is_joker = is_joker
        self.joker_id = joker_id

    def key(self):
        return 'JOKER' if self.is_joker else self.display

    def val(self):
        return RANK_VALUE_MAP[self.key()]

    def strength(self, rev=False):
        if self.is_joker: return 9999
        v = self.val()
        return (14 - v) if rev else v

    def __eq__(self, other):
        if not isinstance(other, Card): return False
        if self.is_joker or other.is_joker:
            return self.is_joker and other.is_joker and (self.joker_id == other.joker_id if self.joker_id and other.joker_id else True)
        return self.suit == other.suit and self.display == other.display

    def __hash__(self):
        return hash((self.suit, self.display, self.is_joker, self.joker_id))

def serialize_card(c):
    if not c: return None
    if isinstance(c, Card):
        if c.is_joker:
            j_id = c.joker_id or ('J1' if c.suit == '★' else 'J2')
            return {'suit': c.suit, 'rank': 'JOKER', 'isJoker': True, 'jokerId': j_id}
        return {'suit': c.suit, 'rank': c.display, 'isJoker': False}
    else:
        is_joker = c.get('isJoker') or c.get('rank') == 'JOKER' or c.get('display') == 'JOKER'
        if is_joker:
            suit = c.get('suit') or c.get('suitSymbol') or '★'
            j_id = c.get('jokerId') or ('J1' if suit == '★' else 'J2')
            return {'suit': suit, 'rank': 'JOKER', 'isJoker': True, 'jokerId': j_id}
        suit = c.get('suit') or c.get('suitSymbol')
        rank = c.get('rank') or c.get('display')
        return {'suit': suit, 'rank': rank, 'isJoker': False}

def serialize_cards(cards):
    return [serialize_card(c) for c in cards] if cards else []

def create_deck():
    deck = [Card(s, r) for s in SUITS for r in RANKS]
    deck.append(Card('★', 'JOKER', True, 'J1'))
    deck.append(Card('☆', 'JOKER', True, 'J2'))
    return deck

def card_to_idx(card):
    if isinstance(card, Card):
        if card.is_joker: return 52
        if card.suit in SUITS and card.display in RANKS:
            return SUITS.index(card.suit) * 13 + RANKS.index(card.display)
        return -1
    else:
        if card.get('isJoker') or card.get('rank') == 'JOKER' or card.get('display') == 'JOKER':
            return 52
        suit = card.get('suit') or card.get('suitSymbol')
        rank = card.get('rank') or card.get('display')
        if suit in SUITS and rank in RANKS:
            return SUITS.index(suit) * 13 + RANKS.index(rank)
        return -1

def encode_cards_to_vector(cards):
    vec = [0.0] * 53
    if not cards: return vec
    for c in cards:
        idx = card_to_idx(c)
        if 0 <= idx < 53: vec[idx] = 1.0
    return vec

def build_input_vector(hand, field, required_dim=106, is_rev=False, is_eb=False):
    """手札(53) + 場(53) ＋ 必要に応じて状態フラグ(4)を結合してベクトル化"""
    h_vec = encode_cards_to_vector(hand)
    f_vec = encode_cards_to_vector(field)
    base = h_vec + f_vec  # 106次元

    if required_dim == 110:
        extra = [
            1.0 if is_rev else 0.0,
            1.0 if is_eb else 0.0,
            1.0 if (not field or len(field) == 0) else 0.0,
            min(1.0, len(hand) / 14.0)
        ]
        return base + extra

    return base

def get_play_strength(cards, rev=False):
    if len(cards) == 1 and cards[0].is_joker: return 9999
    non_joker = [c for c in cards if not c.is_joker]
    return 9999 if not non_joker else non_joker[0].strength(rev)

def is_valid_play(cards, field, rev=False):
    if not cards: return False
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

def evaluate_move_default(move):
    return (len(move) * 10) - move[0].val()

# ----------------------------------------------------
# 3. 王（KING）専用: 完全シミュレーション ＆ MCTSエンジン
# ----------------------------------------------------
def estimate_turns_to_win(hand, rev=False):
    if not hand: return 0
    control_cards = 0
    groups = {}
    jokers = 0
    for c in hand:
        if c.is_joker:
            jokers += 1
        else:
            groups[c.display] = groups.get(c.display, 0) + 1

    turns = len(groups)
    if jokers > 0 and turns == 0: turns = 1

    if '8' in groups: control_cards += groups['8']
    for k, cnt in groups.items():
        if k == '8': continue
        val = RANK_VALUE_MAP[k]
        is_strong = (val <= 3) if rev else (val >= 12)
        if is_strong: control_cards += cnt

    control_cards += jokers
    if turns == 1: return 1
    return max(1, turns - int(control_cards * 0.8))

def is_guaranteed_absolute_win(move, unrevealed, rev=False):
    if len(move) == 1 and move[0].is_joker: return True
    move_val = move[0].val()
    count = len(move)

    groups = {}
    jokers = 0
    for c in unrevealed:
        if c.is_joker: jokers += 1
        else: groups[c.display] = groups.get(c.display, 0) + 1

    if count == 1 and move[0].is_joker and '3' in groups:
        if any(c.suit == '♠' and c.display == '3' for c in unrevealed):
            return False

    for disp, cnt in groups.items():
        val = RANK_VALUE_MAP[disp]
        is_stronger = (val < move_val) if rev else (val > move_val)
        if is_stronger and (cnt + jokers >= count):
            return False

    if jokers >= count and move_val < RANK_VALUE_MAP['JOKER']:
        return False
    return True

class SimGame:
    def __init__(self, hands, field_cards, is_revolution, is_eleven_back, last_played_player, consecutive_passes, finished_players, player_keys=PLAYERS):
        self.player_keys = list(player_keys)
        self.hands = {p: list(hands.get(p, [])) for p in self.player_keys}
        self.field_cards = list(field_cards)
        self.is_revolution = is_revolution
        self.is_eleven_back = is_eleven_back
        self.last_played_player = last_played_player
        self.consecutive_passes = consecutive_passes
        self.finished_players = list(finished_players)

    def clone(self):
        return SimGame(
            self.hands, self.field_cards, self.is_revolution,
            self.is_eleven_back, self.last_played_player, self.consecutive_passes,
            self.finished_players, self.player_keys
        )

    def effective_reverse(self):
        return self.is_revolution != self.is_eleven_back

    def get_valid_moves(self, player):
        return get_all_valid_moves(self.hands.get(player, []), self.field_cards, self.effective_reverse())

    def do_move(self, player, move):
        h = self.hands[player]
        for c in move:
            if c in h: h.remove(c)
        self.field_cards = list(move)
        self.last_played_player = player
        self.consecutive_passes = 0

        if len(move) >= 4: self.is_revolution = not self.is_revolution
        if move[0].display == 'J': self.is_eleven_back = True

        if len(self.hands[player]) == 0 and player not in self.finished_players:
            self.finished_players.append(player)

    def do_pass(self):
        self.consecutive_passes += 1

    def advance_turn(self, current_idx, was_eight):
        active = [p for p in self.player_keys if p not in self.finished_players]

        if was_eight or (self.last_played_player is not None and (self.consecutive_passes >= len(active) - 1 or self.consecutive_passes >= 3)):
            self.field_cards = []
            self.is_eleven_back = False
            self.consecutive_passes = 0
            next_p = current_idx if was_eight else self.player_keys.index(self.last_played_player)
            g = 0
            while self.player_keys[next_p] in self.finished_players and g < 8:
                next_p = (next_p + 1) % len(self.player_keys)
                g += 1
            return next_p

        next_p = (current_idx + 1) % len(self.player_keys)
        g = 0
        while self.player_keys[next_p] in self.finished_players and g < 8:
            next_p = (next_p + 1) % len(self.player_keys)
            g += 1
        return next_p

class MCTSNode:
    def __init__(self, move, parent, player_idx):
        self.move = move
        self.parent = parent
        self.player_idx = player_idx
        self.children = []
        self.visits = 0
        self.total_score = 0.0
        self.unexpanded_moves = None

def king_evaluate_state(sim, king_cpu):
    if king_cpu in sim.finished_players:
        return 200000 - sim.finished_players.index(king_cpu) * 50000

    score = 0
    king_hand = sim.hands.get(king_cpu, [])
    rev = sim.effective_reverse()
    my_turns = estimate_turns_to_win(king_hand, rev)

    score -= my_turns * 4000
    score -= len(king_hand) * 15

    rank_counts = {}
    for c in king_hand:
        k = c.key()
        rank_counts[k] = rank_counts.get(k, 0) + 1
    for cnt in rank_counts.values():
        if cnt == 2: score += 40
        elif cnt == 3: score += 80
        elif cnt >= 4: score += 150

    for c in king_hand:
        score += c.strength(rev) * 4

    for p in sim.player_keys:
        if p == king_cpu: continue
        if p in sim.finished_players:
            score -= (200000 - sim.finished_players.index(p) * 50000) / 2.5
            continue
        p_len = len(sim.hands.get(p, []))
        e_turns = estimate_turns_to_win(sim.hands.get(p, []), rev)
        score += e_turns * 80 + p_len * 20
        if p_len == 1: score -= 9000
        elif p_len == 2: score -= 4000
        elif p_len == 3: score -= 1800

    if not sim.field_cards and sim.last_played_player == king_cpu:
        score += 800
    return score

def king_solve_exact_win(sim, king_cpu, depth=0, max_depth=5):
    if len(sim.hands.get(king_cpu, [])) == 0: return True, None
    if depth >= max_depth: return False, None

    moves = sim.get_valid_moves(king_cpu)
    if not moves: return False, None

    instant = next((m for m in moves if len(m) == len(sim.hands[king_cpu])), None)
    if instant: return True, instant

    for move in moves:
        next_sim = sim.clone()
        next_sim.do_move(king_cpu, move)
        was_eight = (move[0].display == '8')
        next_idx = next_sim.advance_turn(sim.player_keys.index(king_cpu), was_eight)

        can_be_beaten = False
        next_p = sim.player_keys[next_idx]
        if next_p != king_cpu and next_p not in next_sim.finished_players:
            opp_moves = next_sim.get_valid_moves(next_p)
            candidates = opp_moves if opp_moves else [None]

            for opp_move in candidates:
                opp_sim = next_sim.clone()
                if opp_move is None: opp_sim.do_pass()
                else: opp_sim.do_move(next_p, opp_move)

                opp_sim.advance_turn(next_idx, opp_move is not None and opp_move[0].display == '8')
                if len(opp_sim.hands.get(next_p, [])) == 0:
                    can_be_beaten = True
                    break

        if not can_be_beaten:
            if len(next_sim.hands.get(king_cpu, [])) == 0: return True, move
            win, _ = king_solve_exact_win(next_sim, king_cpu, depth + 1, max_depth)
            if win: return True, move

    return False, None

def king_decide_move_universal(cpu_key, hand, current_field, rev, all_hands, all_finished, played_history, last_player, pass_count, player_keys=PLAYERS):
    valid_moves = get_all_valid_moves(hand, current_field, rev)
    can_pass = len(current_field) > 0
    if not valid_moves: return None

    active_others = [p for p in player_keys if p != cpu_key and p not in all_finished]
    if not active_others: return valid_moves[0]

    finish = next((m for m in valid_moves if len(m) == len(hand)), None)
    if finish: return finish

    total_cards = sum(len(all_hands.get(p, [])) for p in player_keys)
    base_sim = SimGame(all_hands, current_field, False, False, last_player, pass_count, all_finished, player_keys)

    if total_cards <= 16 or len(hand) <= 5 or any(len(all_hands.get(p, [])) <= 3 for p in active_others):
        win, exact_move = king_solve_exact_win(base_sim, cpu_key, 0, 5)
        if win and exact_move: return exact_move

    known = list(hand) + list(played_history) + list(current_field)
    unrevealed = [c for c in create_deck() if not any(c == k for k in known)]
    safe_moves = [m for m in valid_moves if is_guaranteed_absolute_win(m, unrevealed, rev)]
    if safe_moves and estimate_turns_to_win(hand, rev) <= 2:
        safe_moves.sort(key=lambda m: (len(m), evaluate_move_default(m)), reverse=True)
        return safe_moves[0]

    king_idx = player_keys.index(cpu_key)
    root = MCTSNode(None, None, king_idx)

    candidate_moves = sorted(valid_moves, key=evaluate_move_default, reverse=True)
    root.unexpanded_moves = list(candidate_moves)
    if can_pass: root.unexpanded_moves.insert(0, None)

    max_iterations = 100
    for _ in range(max_iterations):
        node = root
        sim = base_sim.clone()

        while node.unexpanded_moves is not None and len(node.unexpanded_moves) == 0 and len(node.children) > 0:
            best_child = None
            best_ucb = -float('inf')
            for child in node.children:
                if child.visits == 0:
                    best_child = child
                    break
                ucb = (child.total_score / child.visits) + 1.414 * math.sqrt(math.log(node.visits) / child.visits)
                if ucb > best_ucb:
                    best_ucb = ucb
                    best_child = child
            node = best_child
            if node.move is None: sim.do_pass()
            else: sim.do_move(sim.player_keys[node.parent.player_idx], node.move)
            sim.advance_turn(node.parent.player_idx, node.move is not None and node.move[0].display == '8')

        if node.unexpanded_moves and len(node.unexpanded_moves) > 0:
            move = node.unexpanded_moves.pop()
            next_idx = sim.advance_turn(node.player_idx, move is not None and move[0].display == '8')
            if move is None: sim.do_pass()
            else: sim.do_move(sim.player_keys[node.player_idx], move)

            child = MCTSNode(move, node, next_idx)
            child.unexpanded_moves = sim.get_valid_moves(sim.player_keys[next_idx])
            if len(sim.field_cards) > 0: child.unexpanded_moves.append(None)
            node.children.append(child)
            node = child

        depth = 0
        curr_p_idx = node.player_idx
        while depth < 4 and len(sim.finished_players) < 3:
            p = sim.player_keys[curr_p_idx]
            cands = sim.get_valid_moves(p)
            if len(sim.field_cards) > 0: cands.append(None)
            if not cands: break
            chosen = random.choice(cands)
            if chosen is None: sim.do_pass()
            else: sim.do_move(p, chosen)
            curr_p_idx = sim.advance_turn(curr_p_idx, chosen is not None and chosen[0].display == '8')
            depth += 1

        score = king_evaluate_state(sim, cpu_key)
        reward = 1.0 / (1.0 + math.exp(-score / 8000.0))
        curr = node
        while curr is not None:
            curr.visits += 1
            curr.total_score += reward
            curr = curr.parent

    best_child = None
    max_visits = -1
    for child in root.children:
        if child.visits > max_visits:
            max_visits = child.visits
            best_child = child

    return best_child.move if best_child else candidate_moves[0]

# ----------------------------------------------------
# 4. キャラクター思考ルーチン
# ----------------------------------------------------
BASE_10_CHARACTERS = ['DUKE', 'MARQUIS', 'COUNT', 'KNIGHT', 'MERCHANT', 'SCHOLAR', 'STRATEGIST', 'REVOLUTIONARY', 'JESTER', 'KING']
ALL_CHARACTERS = BASE_10_CHARACTERS + ['BEGINNER_AI', 'MID_AI']

def select_move_by_character_def(cid, hand, field, rev, other_counts, can_pass, unrevealed, next_cnt):
    valid_moves = get_all_valid_moves(hand, field, rev)
    if not valid_moves: return None

    if cid == 'DUKE':
        high = [c for c in hand if c.display in ['A', '2']]
        other = [c for c in hand if c.display not in ['A', '2']]
        filtered = [m for m in valid_moves if not any(c.display in ['A', '2'] for c in m)] if len(high) < len(other) else valid_moves
        if field and next_cnt >= 8 and 1 <= field[0].val() <= 7:
            return None
        if not filtered: return None if can_pass else valid_moves[0]
        filtered.sort(key=evaluate_move_default, reverse=True)
        return filtered[0]

    if cid == 'MARQUIS':
        best_m = max(valid_moves, key=evaluate_move_default)
        return None if (can_pass and evaluate_move_default(best_m) < -5) else best_m

    if cid == 'COUNT':
        is_late = len(hand) <= 5
        best_m, best_s = valid_moves[0], -999
        for m in valid_moves:
            v = m[0].val()
            s = (len(m) * 10) + (v * 2) if is_late else (len(m) * 10) - (v * 3)
            if s > best_s: best_s, best_m = s, m
        return best_m

    if cid == 'KNIGHT':
        valid_moves.sort(key=lambda m: (m[0].val() if not rev else -m[0].val()))
        return valid_moves[0]

    if cid == 'MERCHANT':
        groups = {}
        for c in hand: groups[c.key()] = groups.get(c.key(), 0) + 1
        best_m, best_s = valid_moves[0], -999
        for m in valid_moves:
            s = evaluate_move_default(m)
            if len(m) == 2: s += 15
            elif len(m) >= 3: s += 25
            if len(m) == 1 and groups.get(m[0].key(), 0) >= 2: s -= 20
            if s > best_s: best_s, best_m = s, m
        return best_m

    if cid == 'SCHOLAR':
        safe = [m for m in valid_moves if is_guaranteed_absolute_win(m, unrevealed, rev)]
        if safe:
            safe.sort(key=lambda m: (len(m), evaluate_move_default(m)), reverse=True)
            return safe[0]
        valid_moves.sort(key=evaluate_move_default, reverse=True)
        return valid_moves[0]

    if cid == 'STRATEGIST':
        danger = any(cnt <= 3 for cnt in other_counts)
        best_m, best_s = None, -999
        for m in valid_moves:
            s = evaluate_move_default(m)
            if is_guaranteed_absolute_win(m, unrevealed, rev): s += 50
            if danger:
                if m[0].display == '8': s += 60
                elif m[0].display in ['A', '2']: s += 40
                elif m[0].display == 'J': s += 30
            if s > best_s: best_s, best_m = s, m
        if danger and can_pass and best_s < 20: return None
        return best_m or valid_moves[0]

    if cid == 'REVOLUTIONARY':
        quad = next((m for m in valid_moves if len(m) >= 4), None)
        if quad and not field: return quad
        best_m, best_s = valid_moves[0], -999
        for m in valid_moves:
            s = evaluate_move_default(m)
            if m[0].display == '8': s += 50
            if s > best_s: best_s, best_m = s, m
        return best_m

    if cid == 'JESTER' and random.random() < 0.4:
        if can_pass and random.random() < 0.5: return None
        m2 = next((m for m in valid_moves if any(c.display == '2' for c in m)), None)
        if m2: return m2
        return random.choice(valid_moves)

    valid_moves.sort(key=evaluate_move_default, reverse=True)
    return valid_moves[0]

def decide_neural_move(target_model, is_loaded, required_dim, hand, field, valid, is_rev=False, is_eb=False):
    if not is_loaded or target_model is None:
        valid_sorted = sorted(valid, key=evaluate_move_default, reverse=True)
        return valid_sorted[0]

    in_vec = build_input_vector(hand, field, required_dim=required_dim, is_rev=is_rev, is_eb=is_eb)
    with torch.no_grad():
        t = torch.tensor([in_vec], dtype=torch.float32).to(device)
        scores = target_model(t).squeeze(0).tolist()

    best_m = None
    best_s = -float('inf')
    for m in valid:
        s = sum(scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53) / max(1, len(m))
        if len(m) >= 2: s += 0.5 * len(m)
        if s > best_s:
            best_s = s
            best_m = m
    return best_m or valid[0]

def decide_move_sim(seat, seat_chars, hands, field, rev, finished, played_history, last_seat, pass_cnt, is_rev=False, is_eb=False):
    cid = seat_chars[seat]
    hand = hands[seat]
    valid = get_all_valid_moves(hand, field, rev)
    if not valid: return None
    can_pass = len(field) > 0

    # 🏰 王 (KING)
    if cid == 'KING':
        return king_decide_move_universal(seat, hand, field, rev, hands, finished, played_history, last_seat, pass_cnt, PLAYERS)

    # 🤖 上級AI (BEGINNER_AI): 110次元入力対応
    if cid == 'BEGINNER_AI':
        return decide_neural_move(model_hi, model_hi_loaded, hi_in_dim, hand, field, valid, is_rev=is_rev, is_eb=is_eb)

    # 🦾 中級AI (MID_AI): 106次元入力対応
    if cid == 'MID_AI':
        return decide_neural_move(model_mid, model_mid_loaded, mid_in_dim, hand, field, valid, is_rev=is_rev, is_eb=is_eb)

    # その他 10キャラクター
    next_seat = (seat + 1) % 4
    next_cnt = len(hands[next_seat])
    other_counts = [len(hands[st]) for st in PLAYERS if st != seat and st not in finished]
    known = list(hand) + list(played_history) + list(field)
    unrevealed = [c for c in create_deck() if not any(c == k for k in known)]
    return select_move_by_character_def(cid, hand, field, rev, other_counts, can_pass, unrevealed, next_cnt)

# ----------------------------------------------------
# 5. 高速シミュレーション ＆ ステップ収集
# ----------------------------------------------------
latest_batch_data = {
    "episodes": [],
    "steps": []
}

def run_single_game_fast(seat_chars, pattern_name="PATTERN_A", collect_steps=True):
    game_id = f"game_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
    deck = create_deck()
    random.shuffle(deck)

    hands = {s: [] for s in range(4)}
    for i, c in enumerate(deck): hands[i % 4].append(c)
    for s in range(4): hands[s].sort(key=lambda c: (14 if c.is_joker else c.val()))

    field = []
    is_rev, is_eb = False, False
    last_seat, pass_cnt = None, 0
    pass_map = {f"seat_{s + 1}": False for s in range(4)}
    played_history = []
    finished = []
    ranks = {}
    game_steps = []
    turn_count = 0

    curr_seat = 0
    for s in range(4):
        if any(c.suit == '♦' and c.display == '3' for c in hands[s]):
            curr_seat = s
            break

    turn_limit = 250
    while len(finished) < 3 and turn_limit > 0:
        turn_limit -= 1
        turn_count += 1
        s = curr_seat
        p_hand = hands[s]
        rev = (is_rev != is_eb)
        cid = seat_chars[s]

        valid_moves = get_all_valid_moves(p_hand, field, rev)
        move = decide_move_sim(s, seat_chars, hands, field, rev, finished, played_history, last_seat, pass_cnt, is_rev=is_rev, is_eb=is_eb)

        if collect_steps:
            rem_counts = {f"seat_{st + 1}": len(hands[st]) for st in range(4)}
            step_record = {
                "gameId": game_id,
                "pattern": pattern_name,
                "turnNumber": turn_count,
                "seat": s + 1,
                "player": f"seat_{s + 1}",
                "playerChar": cid,
                "playerCharName": CHARACTER_NAMES.get(cid, cid),
                "hand": serialize_cards(p_hand),
                "fieldCards": serialize_cards(field),
                "isRevolution": bool(is_rev),
                "isElevenBack": bool(is_eb),
                "consecutivePasses": pass_cnt,
                "hasPassedInRound": dict(pass_map),
                "remainingCounts": rem_counts,
                "validMoves": [serialize_cards(m) for m in valid_moves],
                "chosenMove": serialize_cards(move) if move else None,
                "isPass": (move is None),
                "evalScore": None,
                "finalRank": None,
                "rankTitle": None,
                "allSeatsFinalRank": None,
                "timestamp": int(time.time() * 1000)
            }
            game_steps.append(step_record)

        if move:
            for c in move: p_hand.remove(c)
            field = move
            last_seat = s
            pass_cnt = 0
            played_history.extend(move)
            for st in range(4): pass_map[f"seat_{st + 1}"] = False

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

            if is_eight:
                field = []
                is_eb = False
                pass_cnt = 0
                for st in range(4): pass_map[f"seat_{st + 1}"] = False
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
            pass_map[f"seat_{s + 1}"] = True

        active = [st for st in range(4) if st not in finished]
        if len(active) <= 1: break

        if field and (pass_cnt >= len(active) - 1 or pass_cnt >= 3):
            field = []
            is_eb = False
            pass_cnt = 0
            for st in range(4): pass_map[f"seat_{st + 1}"] = False
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

    seat_results = [{
        'seat': s + 1,
        'charId': seat_chars[s],
        'charName': CHARACTER_NAMES.get(seat_chars[s], seat_chars[s]),
        'finalRank': rank_vals[ranks[s]],
        'rankTitle': ranks[s]
    } for s in range(4)]

    if collect_steps:
        rank_map_by_seat = {r['seat']: r['finalRank'] for r in seat_results}
        title_map_by_seat = {r['seat']: r['rankTitle'] for r in seat_results}
        for st in game_steps:
            st['finalRank'] = rank_map_by_seat.get(st['seat'], 4)
            st['rankTitle'] = title_map_by_seat.get(st['seat'], '大貧民')
            st['allSeatsFinalRank'] = rank_map_by_seat

    rem_cards_map = {f"seat_{s + 1}": serialize_cards(hands[s]) for s in range(4)}
    episode_record = {
        "gameId": game_id,
        "pattern": pattern_name,
        "totalTurns": turn_count,
        "seats": seat_results,
        "remainingCards": rem_cards_map,
        "timestamp": int(time.time() * 1000)
    }

    return seat_results, episode_record, game_steps

# ----------------------------------------------------
# 6. Web APIエンドポイント
# ----------------------------------------------------
app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "model_hi_loaded": model_hi_loaded,
        "model_hi_name": hi_model_name,
        "model_mid_loaded": model_mid_loaded,
        "model_mid_name": mid_model_name,
        "cached_episodes": len(latest_batch_data["episodes"]),
        "cached_steps": len(latest_batch_data["steps"])
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        hand_cards = data.get('hand', [])
        field_cards = data.get('field', [])
        valid_moves = data.get('validMoves', [])
        model_type = data.get('modelType', 'hi')
        is_rev = data.get('isRevolution', False)
        is_eb = data.get('isElevenBack', False)

        if not valid_moves:
            return jsonify({"chosenMove": None, "reason": "no_valid_moves"})

        target_model = model_mid if model_type == 'mid' else model_hi
        is_loaded = model_mid_loaded if model_type == 'mid' else model_hi_loaded
        m_name = mid_model_name if model_type == 'mid' else hi_model_name
        req_dim = mid_in_dim if model_type == 'mid' else hi_in_dim

        if not is_loaded or target_model is None:
            fallback = sorted(valid_moves, key=lambda m: (len(m) * 10) - (RANK_VALUE_MAP.get(m[0].get('rank', m[0].get('display', '3')), 0)), reverse=True)[0]
            print(f"[推論(未ロード代行)] {'中級AI' if model_type == 'mid' else '上級AI'} -> {fallback}")
            return jsonify({"chosenMove": fallback, "status": "success", "fallback": True})

        in_vec = build_input_vector(hand_cards, field_cards, required_dim=req_dim, is_rev=is_rev, is_eb=is_eb)

        with torch.no_grad():
            t = torch.tensor([in_vec], dtype=torch.float32).to(device)
            output_scores = target_model(t).squeeze(0).tolist()

        best_move = None
        best_score = -float('inf')

        for move in valid_moves:
            score = sum(output_scores[card_to_idx(card)] for card in move if 0 <= card_to_idx(card) < 53) / max(1, len(move))
            if len(move) >= 2: score += 0.5 * len(move)
            if score > best_score:
                best_score = score
                best_move = move

        ai_name = f"中級AI ({m_name})" if model_type == 'mid' else f"上級AI ({m_name})"
        move_str = ' '.join([f"{c.get('suit', c.get('suitSymbol', ''))}{c.get('rank', c.get('display', ''))}" for c in (best_move or [])])
        print(f"[推論] {ai_name} -> 出した手: {move_str}")

        return jsonify({
            "chosenMove": best_move,
            "bestScore": best_score,
            "modelType": model_type,
            "status": "success"
        })
    except Exception as e:
        print(f"⚠️ 推論エラー: {e}")
        fallback = valid_moves[0] if valid_moves else None
        return jsonify({"chosenMove": fallback, "status": "error", "message": str(e)})

@app.route('/simulate_batch', methods=['POST'])
def simulate_batch():
    data = request.get_json() or {}
    pattern = data.get('pattern', 'PATTERN_A')
    
    default_games = 1000 if pattern == 'PATTERN_C' else 500
    total_games = int(data.get('totalGames', default_games))

    def generate_progress():
        global latest_batch_data
        print(f"\n🚀 [シミュレーション開始] パターン: {pattern} ({total_games}試合・毎試合シャッフル)...")
        print(f"   使用モデル状況: 上級={'OK (' + str(hi_model_name) + ')' if model_hi_loaded else '未ロード'} / 中級={'OK (' + str(mid_model_name) + ')' if model_mid_loaded else '未ロード'}")
        start_t = time.time()

        if pattern == 'PATTERN_A':
            expected_chars = ['BEGINNER_AI', 'KING']
        elif pattern == 'PATTERN_B':
            expected_chars = ['BEGINNER_AI', 'KING', 'MID_AI']
        elif pattern == 'PATTERN_C':
            expected_chars = ['BEGINNER_AI'] + BASE_10_CHARACTERS
        elif pattern == 'PATTERN_D':
            expected_chars = ['BEGINNER_AI', 'MID_AI']
        else: # PATTERN_E
            expected_chars = ['BEGINNER_AI']

        stats = {
            cid: {
                'name': CHARACTER_NAMES.get(cid, cid),
                'icon': CHARACTER_ICONS.get(cid, '👤'),
                'games': 0, 'df': 0, 'f': 0, 'h': 0, 'dh': 0, 'rankSum': 0
            }
            for cid in expected_chars
        }

        latest_batch_data = {
            "episodes": [],
            "steps": []
        }

        update_interval = 25

        for g in range(1, total_games + 1):
            if pattern == 'PATTERN_A':
                seat_chars = ['BEGINNER_AI', 'BEGINNER_AI', 'KING', 'KING']
            elif pattern == 'PATTERN_B':
                seat_chars = ['BEGINNER_AI', 'BEGINNER_AI', 'KING', 'MID_AI']
            elif pattern == 'PATTERN_C':
                others = random.sample(BASE_10_CHARACTERS, 2)
                seat_chars = ['BEGINNER_AI', 'BEGINNER_AI', others[0], others[1]]
            elif pattern == 'PATTERN_D':
                seat_chars = ['BEGINNER_AI', 'BEGINNER_AI', 'MID_AI', 'MID_AI']
            else: # PATTERN_E
                seat_chars = ['BEGINNER_AI', 'BEGINNER_AI', 'BEGINNER_AI', 'BEGINNER_AI']

            random.shuffle(seat_chars)

            seat_results, episode_rec, game_steps = run_single_game_fast(seat_chars, pattern_name=pattern, collect_steps=True)

            latest_batch_data["episodes"].append(episode_rec)
            latest_batch_data["steps"].extend(game_steps)

            for item in seat_results:
                cid = item['charId']
                r = item['finalRank']
                if cid not in stats:
                    stats[cid] = {
                        'name': CHARACTER_NAMES.get(cid, cid),
                        'icon': CHARACTER_ICONS.get(cid, '👤'),
                        'games': 0, 'df': 0, 'f': 0, 'h': 0, 'dh': 0, 'rankSum': 0
                    }
                stats[cid]['games'] += 1
                if r == 1: stats[cid]['df'] += 1
                elif r == 2: stats[cid]['f'] += 1
                elif r == 3: stats[cid]['h'] += 1
                elif r == 4: stats[cid]['dh'] += 1
                stats[cid]['rankSum'] += r

            if g % update_interval == 0 or g == total_games:
                pct = round((g / total_games) * 100, 1)
                progress_payload = json.dumps({
                    "type": "progress",
                    "current": g,
                    "total": total_games,
                    "pct": pct
                })
                yield f"{progress_payload}\n"

        elapsed = time.time() - start_t
        filtered_stats = {k: v for k, v in stats.items() if v['games'] > 0}
        print(f"🎉 [シミュレーション完了] 所要時間: {elapsed:.2f}秒 (総ステップ数: {len(latest_batch_data['steps'])}手)")

        complete_payload = json.dumps({
            "type": "complete",
            "status": "success",
            "pattern": pattern,
            "totalGames": total_games,
            "totalSteps": len(latest_batch_data['steps']),
            "elapsedSeconds": round(elapsed, 2),
            "results": filtered_stats,
            "isFixedSeats": False
        })
        yield f"{complete_payload}\n"

    return Response(stream_with_context(generate_progress()), mimetype='application/x-ndjson')

@app.route('/download_json', methods=['GET'])
def download_json():
    try:
        content = json.dumps(latest_batch_data, ensure_ascii=False, indent=2)
        filename = f"royal_daifugo_batch_{int(time.time())}.json"
        return Response(
            content,
            mimetype="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/download_jsonl', methods=['GET'])
def download_jsonl():
    try:
        lines = [json.dumps(s, ensure_ascii=False) for s in latest_batch_data["steps"]]
        content = "\n".join(lines)
        filename = f"royal_daifugo_steps_{int(time.time())}.jsonl"
        return Response(
            content,
            mimetype="application/x-ndjson",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/latest_simulation_data', methods=['GET'])
def latest_simulation_data():
    try:
        recent_episodes = latest_batch_data["episodes"][-100:]
        recent_game_ids = set(ep["gameId"] for ep in recent_episodes)
        recent_steps = [s for s in latest_batch_data["steps"] if s["gameId"] in recent_game_ids]
        return jsonify({
            "status": "success",
            "totalEpisodes": len(latest_batch_data["episodes"]),
            "totalSteps": len(latest_batch_data["steps"]),
            "episodes": recent_episodes,
            "steps": recent_steps
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print("=======================================================")
    print("🚀 大富豪 上級AI(110次元)・中級AI(106次元)推論 ＆ シミュレーションサーバー")
    print("   ポート: 5000 / URL: http://localhost:5000")
    print("=======================================================")
    app.run(host='0.0.0.0', port=5000, debug=False)



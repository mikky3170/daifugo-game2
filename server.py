# ==============================================================================
# [Python Server] server.py - 大富豪 ROYAL CARD GAME 本番統合サーバー
# 👑 ギルガメッシュ【全知全能透視15,000回MCTS ＆ 終盤確定詰み】
# ＆ 覚醒新王【APEX-v3直感×7,500回MCTS完全体 ＆ 手札形成フル適用 ＆ 確定詰み】
# ＆ 女王【正統派5,000回MCTS ＆ 不完全情報確定詰み】
# ＆ 🏰 王【APEX-v3直感×手札形成0.8×深さ5詰み＆絶対防衛】
# ＆ 🤴 新王【俊英マルチ×手札形成0.6×深さ5詰み】
# ＆ 🏛️ 始皇帝【深さ6詰み】 ＆ 🛡️ アレク王【深さ7詰み】 ＆ 四大英傑
# 【本格競技ルール（禁止あがり自爆防止・都落ち・10連戦）完全同期版】
# ==============================================================================

import os
import sys
import json
import time
import random
import math
from collections import defaultdict

try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

import torch
import torch.nn as nn
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS

# ----------------------------------------------------
# 1. PyTorchモデルの定義 ＆ 三刀流モデル並行ロード機構
# ----------------------------------------------------
class ImprovedDaifugoModel(nn.Module):
    """163次元 / 159次元 対応モデル: 6層全結合 + BatchNorm + Dropout対応"""
    def __init__(self, input_size=163):
        super(ImprovedDaifugoModel, self).__init__()
        self.fc1 = nn.Linear(input_size, 512)
        self.bn1 = nn.BatchNorm1d(512)
        self.dropout1 = nn.Dropout(0.4)
        self.fc2 = nn.Linear(512, 256)
        self.bn2 = nn.BatchNorm1d(256)
        self.dropout2 = nn.Dropout(0.4)
        self.fc3 = nn.Linear(256, 128)
        self.bn3 = nn.BatchNorm1d(128)
        self.dropout3 = nn.Dropout(0.3)
        self.fc4 = nn.Linear(128, 64)
        self.bn4 = nn.BatchNorm1d(64)
        self.dropout4 = nn.Dropout(0.2)
        self.fc5 = nn.Linear(64, 53)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.bn1(self.fc1(x)))
        x = self.dropout1(x)
        x = self.relu(self.bn2(self.fc2(x)))
        x = self.dropout2(x)
        x = self.relu(self.bn3(self.fc3(x)))
        x = self.dropout3(x)
        x = self.relu(self.bn4(self.fc4(x)))
        x = self.dropout4(x)
        return self.fc5(x)

class SuperDaifugoAI(nn.Module):
    """4層全結合モデル"""
    def __init__(self, in_dim=159, h1=128, h2=64, h3=64, out_dim=53, has_bn3=False):
        super(SuperDaifugoAI, self).__init__()
        self.fc1 = nn.Linear(in_dim, h1)
        self.bn1 = nn.BatchNorm1d(h1)
        self.fc2 = nn.Linear(h1, h2)
        self.bn2 = nn.BatchNorm1d(h2)
        self.fc3 = nn.Linear(h2, h3)
        self.has_bn3 = has_bn3
        if has_bn3: self.bn3 = nn.BatchNorm1d(h3)
        self.fc4 = nn.Linear(h3, out_dim)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.bn1(self.fc1(x)))
        x = self.relu(self.bn2(self.fc2(x)))
        x = self.relu(self.bn3(self.fc3(x))) if self.has_bn3 else self.relu(self.fc3(x))
        return self.fc4(x)

device = torch.device('cpu')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_flexible_model(target_filenames, default_dim=163, model_role="超級AI"):
    for fname in target_filenames:
        full_path = os.path.join(BASE_DIR, fname)
        if not os.path.exists(full_path) and os.path.exists(fname):
            full_path = os.path.abspath(fname)
        if not os.path.exists(full_path):
            continue
        try:
            state_dict = torch.load(full_path, map_location=device)
            if 'fc5.weight' in state_dict and 'bn4.weight' in state_dict:
                in_dim = state_dict['fc1.weight'].shape[1]
                model = ImprovedDaifugoModel(input_size=in_dim).to(device)
                model.load_state_dict(state_dict)
                model.eval()
                print(f"✅ {model_role}ロード成功: '{os.path.basename(full_path)}' ({in_dim}次元 6層BN)", flush=True)
                return model, True, os.path.basename(full_path), in_dim
            elif 'fc4.weight' in state_dict and 'bn1.weight' in state_dict:
                in_dim = state_dict['fc1.weight'].shape[1]
                model = SuperDaifugoAI(in_dim=in_dim).to(device)
                model.load_state_dict(state_dict)
                model.eval()
                print(f"✅ {model_role}ロード成功: '{os.path.basename(full_path)}' ({in_dim}次元 4層BN)", flush=True)
                return model, True, os.path.basename(full_path), in_dim
        except Exception as e:
            print(f"⚠️ モデルロード例外 ({fname}): {e}", flush=True)
    return None, False, None, default_dim

# 三刀流モデル並行ロード機構（最新APEX-v3最優先認識）
model_hi2, model_hi2_loaded, hi2_name, hi2_in_dim = load_flexible_model(
    ['daifugou_ai_hi2.pth', 'daifugou_ai_apex_v2.pth', 'daifugo_ai_163dim.pth'],
    default_dim=163, model_role="Model-1 [hi2/標準]"
)

model_gilgamesh, model_gilgamesh_loaded, gilgamesh_name, gilgamesh_in_dim = load_flexible_model(
    ['daifugou_ai_gilgamesh.pth', 'daifugou_ai_hi2.pth'],
    default_dim=163, model_role="Model-2 [gilgamesh/特化]"
)

model_apex, model_apex_loaded, apex_name, apex_in_dim = load_flexible_model(
    ['daifugou_ai_apex_v3.pth', 'daifugou_ai_apex.pth', 'daifugou_ai_hi2.pth'],
    default_dim=163, model_role="Model-3 [apex/覚醒新王・王専用]"
)

if not model_gilgamesh_loaded and model_hi2_loaded:
    model_gilgamesh = model_hi2
    model_gilgamesh_loaded = True
    gilgamesh_name = hi2_name
    gilgamesh_in_dim = hi2_in_dim

if not model_apex_loaded and model_hi2_loaded:
    model_apex = model_hi2
    model_apex_loaded = True
    apex_name = hi2_name
    apex_in_dim = hi2_in_dim

if not model_hi2_loaded and model_gilgamesh_loaded:
    model_hi2 = model_gilgamesh
    model_hi2_loaded = True
    hi2_name = gilgamesh_name
    hi2_in_dim = gilgamesh_in_dim

# ----------------------------------------------------
# 2. キャラクター別 定石パーセント設定値 (CHARACTER_TACTICAL_PROFILES)
# ----------------------------------------------------
CHARACTER_TACTICAL_PROFILES = {
    'GILGAMESH': {
        'R2_reachBlock': 1.00, 'R3_capitalFallDefense': 1.00, 'R4_leadMulti': 0.95,
        'R5_trashCardClear': 0.95, 'R6_eightCutBridge': 1.00, 'R7_elevenBackControl': 1.00,
        'R8_plannedRevolution': 0.95, 'R9_revolutionCounter': 1.00, 'R10_suitLockAwareness': 0.70,
        'R11_spade3Alert': 1.00, 'R12_smartPass': 0.90, 'R14_endgameSolverDepth': 1.00
    },
    'SHI_HUANGDI': {
        'R2_reachBlock': 0.85, 'R3_capitalFallDefense': 0.90, 'R4_leadMulti': 1.00,
        'R5_trashCardClear': 1.00, 'R6_eightCutBridge': 0.90, 'R7_elevenBackControl': 1.00,
        'R8_plannedRevolution': 0.85, 'R9_revolutionCounter': 0.40, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.85, 'R14_endgameSolverDepth': 0.60
    },
    'SUPER_AI': {
        'R2_reachBlock': 0.85, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 0.70,
        'R5_trashCardClear': 0.75, 'R6_eightCutBridge': 0.75, 'R7_elevenBackControl': 0.90,
        'R8_plannedRevolution': 0.60, 'R9_revolutionCounter': 0.50, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.90, 'R12_smartPass': 0.95, 'R14_endgameSolverDepth': 0.70
    },
    'ALEXANDER': {
        'R2_reachBlock': 0.80, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 1.00,
        'R5_trashCardClear': 0.80, 'R6_eightCutBridge': 0.95, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.85, 'R9_revolutionCounter': 0.40, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.75, 'R14_endgameSolverDepth': 0.60
    },
    'SHOTOKU': {
        'R2_reachBlock': 1.00, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 0.80,
        'R5_trashCardClear': 0.85, 'R6_eightCutBridge': 0.80, 'R7_elevenBackControl': 1.00,
        'R8_plannedRevolution': 0.80, 'R9_revolutionCounter': 1.00, 'R10_suitLockAwareness': 0.60,
        'R11_spade3Alert': 1.00, 'R12_smartPass': 0.80, 'R14_endgameSolverDepth': 0.70
    },
    'NOBUNAGA': {
        'R2_reachBlock': 0.85, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 1.00,
        'R5_trashCardClear': 0.80, 'R6_eightCutBridge': 1.00, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.85, 'R9_revolutionCounter': 0.40, 'R10_suitLockAwareness': 0.40,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.50, 'R14_endgameSolverDepth': 0.60
    },
    'BEGINNER_AI': {
        'R2_reachBlock': 0.80, 'R3_capitalFallDefense': 0.80, 'R4_leadMulti': 0.90,
        'R5_trashCardClear': 0.80, 'R6_eightCutBridge': 0.80, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.75, 'R9_revolutionCounter': 0.40, 'R10_suitLockAwareness': 0.40,
        'R11_spade3Alert': 0.80, 'R12_smartPass': 0.80, 'R14_endgameSolverDepth': 0.75
    },
    'KING': {
        'R2_reachBlock': 0.95, 'R3_capitalFallDefense': 0.90, 'R4_leadMulti': 0.85,
        'R5_trashCardClear': 0.80, 'R6_eightCutBridge': 0.85, 'R7_elevenBackControl': 0.85,
        'R8_plannedRevolution': 0.80, 'R9_revolutionCounter': 0.45, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.90, 'R12_smartPass': 0.85, 'R14_endgameSolverDepth': 0.85
    },
    'AWAKENED_KING': {
        'R2_reachBlock': 0.85, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 0.85,
        'R5_trashCardClear': 0.80, 'R6_eightCutBridge': 0.85, 'R7_elevenBackControl': 0.85,
        'R8_plannedRevolution': 0.80, 'R9_revolutionCounter': 0.50, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.80, 'R14_endgameSolverDepth': 0.80
    },
    'DUKE': {
        'R2_reachBlock': 1.00, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 0.60,
        'R5_trashCardClear': 0.50, 'R6_eightCutBridge': 0.80, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.50, 'R9_revolutionCounter': 0.30, 'R10_suitLockAwareness': 0.40,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.95, 'R14_endgameSolverDepth': 0.40
    },
    'MARQUIS': {
        'R2_reachBlock': 0.75, 'R3_capitalFallDefense': 0.80, 'R4_leadMulti': 0.50,
        'R5_trashCardClear': 0.60, 'R6_eightCutBridge': 0.60, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.50, 'R9_revolutionCounter': 0.30, 'R10_suitLockAwareness': 0.40,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 1.00, 'R14_endgameSolverDepth': 0.30
    },
    'COUNT': {
        'R2_reachBlock': 0.75, 'R3_capitalFallDefense': 0.80, 'R4_leadMulti': 0.60,
        'R5_trashCardClear': 0.60, 'R6_eightCutBridge': 0.85, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.50, 'R9_revolutionCounter': 0.30, 'R10_suitLockAwareness': 0.40,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.90, 'R14_endgameSolverDepth': 0.40
    },
    'KNIGHT': {
        'R2_reachBlock': 0.40, 'R3_capitalFallDefense': 0.50, 'R4_leadMulti': 0.00,
        'R5_trashCardClear': 1.00, 'R6_eightCutBridge': 0.50, 'R7_elevenBackControl': 0.70,
        'R8_plannedRevolution': 0.10, 'R9_revolutionCounter': 0.10, 'R10_suitLockAwareness': 0.10,
        'R11_spade3Alert': 0.80, 'R12_smartPass': 0.00, 'R14_endgameSolverDepth': 0.10
    },
    'MERCHANT': {
        'R2_reachBlock': 0.40, 'R3_capitalFallDefense': 0.50, 'R4_leadMulti': 1.00,
        'R5_trashCardClear': 0.20, 'R6_eightCutBridge': 0.60, 'R7_elevenBackControl': 0.70,
        'R8_plannedRevolution': 0.20, 'R9_revolutionCounter': 0.10, 'R10_suitLockAwareness': 0.20,
        'R11_spade3Alert': 0.80, 'R12_smartPass': 0.60, 'R14_endgameSolverDepth': 0.10
    },
    'SCHOLAR': {
        'R2_reachBlock': 0.80, 'R3_capitalFallDefense': 0.80, 'R4_leadMulti': 0.60,
        'R5_trashCardClear': 0.60, 'R6_eightCutBridge': 0.65, 'R7_elevenBackControl': 0.85,
        'R8_plannedRevolution': 0.50, 'R9_revolutionCounter': 0.30, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.80, 'R14_endgameSolverDepth': 0.90
    },
    'STRATEGIST': {
        'R2_reachBlock': 1.00, 'R3_capitalFallDefense': 0.85, 'R4_leadMulti': 0.60,
        'R5_trashCardClear': 0.60, 'R6_eightCutBridge': 0.95, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.50, 'R9_revolutionCounter': 0.30, 'R10_suitLockAwareness': 0.50,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.80, 'R14_endgameSolverDepth': 0.30
    },
    'REVOLUTIONARY': {
        'R2_reachBlock': 0.50, 'R3_capitalFallDefense': 0.50, 'R4_leadMulti': 0.60,
        'R5_trashCardClear': 0.30, 'R6_eightCutBridge': 0.95, 'R7_elevenBackControl': 0.70,
        'R8_plannedRevolution': 1.00, 'R9_revolutionCounter': 0.90, 'R10_suitLockAwareness': 0.20,
        'R11_spade3Alert': 0.80, 'R12_smartPass': 0.20, 'R14_endgameSolverDepth': 0.10
    },
    'JESTER': {
        'R2_reachBlock': 0.15, 'R3_capitalFallDefense': 0.10, 'R4_leadMulti': 0.20,
        'R5_trashCardClear': 0.20, 'R6_eightCutBridge': 0.15, 'R7_elevenBackControl': 0.60,
        'R8_plannedRevolution': 0.30, 'R9_revolutionCounter': 0.10, 'R10_suitLockAwareness': 0.10,
        'R11_spade3Alert': 0.80, 'R12_smartPass': 0.35, 'R14_endgameSolverDepth': 0.00
    }
}

def get_tactical_profile(char_id):
    char_key = str(char_id).upper()
    return CHARACTER_TACTICAL_PROFILES.get(char_key, {
        'R2_reachBlock': 0.80, 'R3_capitalFallDefense': 0.80, 'R4_leadMulti': 0.80,
        'R5_trashCardClear': 0.70, 'R6_eightCutBridge': 0.70, 'R7_elevenBackControl': 0.80,
        'R8_plannedRevolution': 0.60, 'R9_revolutionCounter': 0.40, 'R10_suitLockAwareness': 0.40,
        'R11_spade3Alert': 0.85, 'R12_smartPass': 0.75, 'R14_endgameSolverDepth': 0.50
    })

# ----------------------------------------------------
# 3. カード定義 ＆ 基本ルールエンジン
# ----------------------------------------------------
CHARACTER_NAMES = {
    'GILGAMESH': 'ギルガメッシュ',
    'AWAKENED_KING': '覚醒新王',
    'NOBUNAGA': '織田信長',
    'SHOTOKU': '聖徳太子',
    'SHI_HUANGDI': '秦の始皇帝',
    'ALEXANDER': 'アレク王',
    'SUPER_AI': '女王',
    'BEGINNER_AI': '新王',
    'KING': '王',
    'DUKE': '公爵',
    'MARQUIS': '侯爵',
    'COUNT': '伯爵',
    'KNIGHT': '騎士',
    'MERCHANT': '商人',
    'SCHOLAR': '学者',
    'STRATEGIST': '軍師',
    'REVOLUTIONARY': '革命家',
    'JESTER': '道化師'
}

SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
RANK_VALUE_MAP = {r: i + 1 for i, r in enumerate(RANKS)}
RANK_VALUE_MAP['JOKER'] = 14

class Card:
    __slots__ = ('suit', 'display', 'is_joker', 'joker_id')
    def __init__(self, suit, display, is_joker=False, joker_id=None):
        self.suit = suit
        self.display = display
        self.is_joker = is_joker
        self.joker_id = joker_id

    def key(self): return 'JOKER' if self.is_joker else self.display
    def val(self): return 14 if self.is_joker else RANK_VALUE_MAP[self.display]
    def strength(self, rev=False):
        if self.is_joker: return 9999
        v = self.val()
        return (14 - v) if rev else v

    def __eq__(self, o):
        if not isinstance(o, Card): return False
        if self.is_joker or o.is_joker:
            return self.is_joker and o.is_joker and (self.joker_id == o.joker_id if self.joker_id and o.joker_id else True)
        return self.suit == o.suit and self.display == o.display

    def __hash__(self):
        return hash((self.suit, self.display, self.is_joker, self.joker_id))

def parse_card_obj(c):
    if not c: return None
    if isinstance(c, Card): return c
    is_j = c.get('isJoker') or c.get('rank') == 'JOKER' or c.get('display') == 'JOKER'
    suit = c.get('suit') or c.get('suitSymbol') or ('★' if is_j else '♠')
    disp = c.get('rank') or c.get('display') or ('JOKER' if is_j else '3')
    j_id = c.get('jokerId')
    return Card(suit, disp, is_j, j_id)

def serialize_card(c):
    if not c: return None
    if isinstance(c, Card):
        if c.is_joker:
            j_id = c.joker_id or ('J1' if c.suit == '★' else 'J2')
            return {'suit': c.suit, 'rank': 'JOKER', 'isJoker': True, 'jokerId': j_id}
        return {'suit': c.suit, 'rank': c.display, 'isJoker': False}
    return c

def serialize_cards(cards):
    return [serialize_card(c) for c in cards] if cards else []

def create_deck():
    deck = [Card(s, r) for s in SUITS for r in RANKS]
    deck.append(Card('★', 'JOKER', True, 'J1'))
    deck.append(Card('☆', 'JOKER', True, 'J2'))
    return deck

def card_to_idx(c):
    if isinstance(c, dict): c = parse_card_obj(c)
    if c.is_joker: return 52
    if c.suit in SUITS and c.display in RANKS:
        return SUITS.index(c.suit) * 13 + RANKS.index(c.display)
    return -1

def encode_cards_vector(cards):
    vec = [0.0] * 53
    for c in cards:
        idx = card_to_idx(c)
        if 0 <= idx < 53: vec[idx] = 1.0
    return vec

def build_input_vector(hand, field, required_dim=163, is_rev=False, is_eb=False, cleared_cards=None):
    h_vec = encode_cards_vector(hand)
    f_vec = encode_cards_vector(field)
    flags = [1.0 if is_rev else 0.0, 1.0 if is_eb else 0.0, 1.0 if (not field) else 0.0, min(1.0, len(hand) / 14.0)]
    c_vec = encode_cards_vector(cleared_cards or [])
    full_vec = h_vec + f_vec + c_vec + flags
    return full_vec[:159] if required_dim == 159 else full_vec

# ----------------------------------------------------
# 【本格競技ルール】禁止あがり判定ヘルパー（完全同期版）
# ----------------------------------------------------
def is_forbidden_finish_move(move, eff_rev=False):
    if not move: return False
    if any(c.is_joker for c in move): return True
    if any(c.display == '8' for c in move): return True
    forbidden_rank = '3' if eff_rev else '2'
    if any(c.display == forbidden_rank for c in move): return True
    if not eff_rev and len(move) == 1 and not move[0].is_joker and move[0].suit == '♠' and move[0].display == '3':
        return True
    return False

def will_leave_only_forbidden_cards(move, hand, eff_rev=False):
    """
    指定の手 move を出した後の残手札が、すべて禁止あがり対象カードのみになり
    次回以降どうあがいても反則負けになる完全詰み状態かを厳密判定
    """
    if not move or hand is None: return False
    if len(move) >= len(hand): return False

    rem_hand = [c for c in hand if c not in move]
    if not rem_hand: return False

    # 残手札のすべてのカードが単体で禁止あがり対象であるか検証
    return all(is_forbidden_finish_move([c], eff_rev) for c in rem_hand)

def is_joker_waste_move(move, hand):
    if not move or hand is None: return False
    if len(move) == len(hand): return False

    jokers_in_move = any(c.is_joker for c in move)
    nj_in_move = any(not c.is_joker for c in move)

    if jokers_in_move and nj_in_move and len(move) < 4:
        return True
    if jokers_in_move and not nj_in_move and len(move) >= 2 and len(hand) >= 4:
        return True
    return False

def evaluate_move_default(move, hand=None, is_field_empty=False, profile=None, eff_rev=False, min_opp_len=99):
    if not move: return -999.0
    prof = profile or get_tactical_profile('KING')

    if hand is not None and len(move) == len(hand):
        if is_forbidden_finish_move(move, eff_rev):
            return -99999.0
        return 500.0

    # 残り手札が禁止カードのみになる手は自爆として除外（相手リーチ時は親権迎撃を優先）
    if hand is not None and will_leave_only_forbidden_cards(move, hand, eff_rev) and min_opp_len > 1:
        return -99999.0

    nj = [c for c in move if not c.is_joker]
    val = nj[0].val() if nj else 14
    count = len(move)

    multi_mult = (0.6 + prof['R4_leadMulti'] * 0.5) if count >= 2 else 1.0
    score = float(((count * 10) * multi_mult) - val)

    if hand is not None:
        if is_joker_waste_move(move, hand):
            score -= 55.0

        if any(c.display == '8' for c in move):
            if len(move) == len(hand):
                score = -99999.0 if is_forbidden_finish_move(move, eff_rev) else (score + 90.0)
            elif is_field_empty:
                score -= 45.0 if len(hand) >= 4 else 10.0
            else:
                score += (15.0 * prof['R6_eightCutBridge'])

        if is_field_empty and len(hand) >= 3 and len(move) == 1:
            is_solo_joker = move[0].is_joker
            is_solo_two = (not move[0].is_joker and move[0].display == '2')
            if is_solo_joker or is_solo_two:
                has_low_or_mid = any(not c.is_joker and c.val() <= 10 for c in hand)
                if has_low_or_mid:
                    score -= (50.0 + prof['R5_trashCardClear'] * 25.0)

    return score

def evaluate_hand_formation(move, hand, eff_rev=False, min_opp_len=99):
    if not move or hand is None:
        return 0.0

    hand_len = len(hand)
    move_len = len(move)
    if move_len == hand_len:
        if is_forbidden_finish_move(move, eff_rev):
            return -99999.0
        return 200.0

    # 残り手札がすべて禁止カードになる手は自爆回避
    if will_leave_only_forbidden_cards(move, hand, eff_rev) and min_opp_len > 1:
        return -99999.0

    rem_hand = [c for c in hand if c not in move]
    rem_len = len(rem_hand)
    if rem_len == 0:
        return 200.0

    score = 0.0

    orig_groups = defaultdict(list)
    for c in hand:
        if not c.is_joker:
            orig_groups[c.display].append(c)

    rem_groups = defaultdict(list)
    rem_jokers = sum(1 for c in rem_hand if c.is_joker)
    for c in rem_hand:
        if not c.is_joker:
            rem_groups[c.display].append(c)

    if rem_len == 1:
        if is_forbidden_finish_move(rem_hand, eff_rev):
            score -= 120.0
        else:
            score += 40.0
    elif rem_len == 2:
        if all(is_forbidden_finish_move([c], eff_rev) for c in rem_hand):
            score -= 80.0

    if hand_len >= 5 and min_opp_len > 2 and move_len == 1 and not move[0].is_joker:
        disp = move[0].display
        orig_count = len(orig_groups.get(disp, []))
        if orig_count >= 2:
            score -= 22.0 if orig_count == 2 else 35.0

    if rem_len >= 3 and min_opp_len > 2:
        has_boss_rem = (
            rem_jokers > 0 or
            any(c.display == ('3' if eff_rev else '2') for c in rem_hand) or
            any(c.display == '8' for c in rem_hand)
        )
        if has_boss_rem:
            score += 15.0
        else:
            score -= 20.0

    if move_len == 1 and not move[0].is_joker:
        disp = move[0].display
        if len(orig_groups.get(disp, [])) == 1 and move[0].strength(eff_rev) <= 7:
            score += 12.0

    effective_turns = len(rem_groups) + (1 if rem_jokers > 0 and len(rem_groups) == 0 else 0)
    score -= effective_turns * 3.5

    return score

def identify_exit_ticket(hand):
    if not hand: return None
    hand = [parse_card_obj(c) for c in hand]
    jokers = [c for c in hand if c.is_joker]
    if jokers: return jokers[0]
    twos = [c for c in hand if c.display == '2']
    if twos: return twos[0]
    aces = [c for c in hand if c.display == 'A']
    if aces: return aces[0]
    return max(hand, key=lambda c: c.val())

def evaluate_eight_bridge(move, hand, min_opp_len, is_opp_reach, is_field_empty=False, profile=None, eff_rev=False):
    if not move or not any(c.display == '8' for c in move):
        return 0.0

    prof = profile or get_tactical_profile('KING')
    bridge_weight = prof.get('R6_eightCutBridge', 1.0)

    hand_len = len(hand)
    if len(move) == hand_len:
        return -99999.0 if is_forbidden_finish_move(move, eff_rev) else 130.0

    if is_field_empty and hand_len >= 4:
        return -40.0

    rem_hand = [c for c in hand if c not in move]
    rem_len = len(rem_hand)

    if is_opp_reach:
        return 65.0 * bridge_weight

    rem_groups = defaultdict(list)
    rem_jokers = 0
    for c in rem_hand:
        if c.is_joker: rem_jokers += 1
        else: rem_groups[c.display].append(c)

    can_finish_next = (
        rem_len == 1 or
        (len(rem_groups) == 1 and rem_jokers == 0) or
        (len(rem_groups) == 0 and rem_jokers > 0)
    )
    if can_finish_next:
        if not is_forbidden_finish_move(rem_hand, eff_rev):
            return 95.0 * bridge_weight

    if hand_len >= 6:
        has_strong_followup = (
            rem_jokers > 0 or
            any(c.display == '2' for c in rem_hand) or
            any(len(cards) >= 2 for cards in rem_groups.values())
        )
        if not has_strong_followup:
            return -28.0

    return (-20.0 if is_field_empty else 20.0) * bridge_weight

def evaluate_eleven_back_balance(move, hand, eff_rev, profile=None):
    if not move or not any(c.display == 'J' for c in move):
        return 0.0

    prof = profile or get_tactical_profile('KING')
    ctrl_weight = prof.get('R7_elevenBackControl', 1.0)

    rem_hand = [c for c in hand if c not in move]
    if not rem_hand: return 10.0

    low_beneficial = sum(1 for c in rem_hand if not c.is_joker and c.val() <= 4)
    high_ruined = sum(1 for c in rem_hand if not c.is_joker and c.val() >= 11)

    if not eff_rev:
        if low_beneficial >= 3 and high_ruined <= 1:
            return 25.0 * ctrl_weight
        elif high_ruined >= 2:
            return -30.0 * ctrl_weight
    else:
        if high_ruined >= 2:
            return 30.0 * ctrl_weight
        elif low_beneficial >= 2:
            return -25.0 * ctrl_weight

    return 0.0

def should_strategic_pass_on_high_card(move, hand, field, rev, min_opp_len, profile=None):
    if not field or not move: return False
    prof = profile or get_tactical_profile('KING')

    if min_opp_len <= 2:
        if random.random() < prof.get('R2_reachBlock', 0.80):
            return False

    if prof.get('R12_smartPass', 0.80) <= 0.05:
        return False

    hand_len = len(hand)
    if hand_len <= 3: return False
    if len(move) == hand_len: return False

    is_solo_joker = (len(move) == 1 and move[0].is_joker)
    is_solo_two = (len(move) == 1 and not move[0].is_joker and move[0].display == '2')

    if is_joker_waste_move(move, hand) and hand_len >= 4:
        return True

    if is_solo_joker or is_solo_two:
        low_cards_count = sum(1 for c in hand if not c.is_joker and c.val() <= 7)
        if low_cards_count >= 2:
            return (random.random() < prof.get('R12_smartPass', 0.80))
        field_top_val = 14 if field[0].is_joker else field[0].val()
        if field_top_val <= 11:
            return (random.random() < prof.get('R12_smartPass', 0.80))

    return False

def should_strategic_pass_smart_shotoku(move, hand, field, eff_rev, min_opp_len):
    if not field or not move: return False
    if min_opp_len <= 2: return False
    hand_len = len(hand)
    if hand_len <= 3: return False
    if len(move) == hand_len: return False

    if is_joker_waste_move(move, hand) and hand_len >= 4:
        return True

    if len(move) == 1:
        c = move[0]
        is_boss = c.is_joker or (c.display == '3' if eff_rev else c.display == '2')
        if is_boss:
            weak_count = sum(1 for hc in hand if hc.strength(eff_rev) <= 6)
            if weak_count >= 2: return True
            field_top_str = field[0].strength(eff_rev)
            if field_top_str <= 11: return True
    return False

def get_play_strength(cards, rev=False):
    if len(cards) == 1 and cards[0].is_joker: return 9999
    nj = [c for c in cards if not c.is_joker]
    return 9999 if not nj else nj[0].strength(rev)

def is_valid_play(cards, field, rev=False):
    if not cards: return False
    if len(field) == 1 and field[0].is_joker and len(cards) == 1 and not cards[0].is_joker and cards[0].suit == '♠' and cards[0].display == '3':
        return True

    if field and all(c.is_joker for c in field):
        return False

    nj = [c for c in cards if not c.is_joker]
    if nj:
        t = nj[0].display
        if not all(c.display == t for c in nj): return False
    if not field: return True
    if len(cards) != len(field): return False

    p_str = get_play_strength(cards, rev)
    f_str = get_play_strength(field, rev)
    return True if p_str == 9999 else p_str > f_str

def get_all_valid_moves(hand, field, rev=False):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    moves = []
    jokers = [c for c in hand if c.is_joker]
    non_jokers = [c for c in hand if not c.is_joker]
    groups = defaultdict(list)
    for c in non_jokers: groups[c.display].append(c)

    if not field:
        for disp, cards in groups.items():
            max_len = len(cards) + len(jokers)
            for l in range(1, max_len + 1):
                nat = min(l, len(cards))
                jok = l - nat
                if jok <= len(jokers):
                    moves.append(cards[:nat] + jokers[:jok])
        if jokers:
            moves.append([jokers[0]])
        if len(jokers) >= 2:
            moves.append([jokers[0], jokers[1]])
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

        if req == 2 and len(jokers) >= 2 and is_valid_play([jokers[0], jokers[1]], field, rev):
            moves.append([jokers[0], jokers[1]])

    return moves

# ----------------------------------------------------
# 3.2 終盤確定読みエンジン (Endgame Solver 黄金版)
# ----------------------------------------------------
def is_guaranteed_absolute_win(move, unrevealed, rev=False):
    if not move: return False
    count = len(move)
    is_joker_solo = (count == 1 and move[0].is_joker)

    if is_joker_solo:
        has_spade3 = any(not c.is_joker and c.suit == '♠' and c.display == '3' for c in unrevealed)
        return not has_spade3

    nj = [c for c in move if not c.is_joker]
    move_val = nj[0].val() if nj else 14
    move_str = nj[0].strength(rev) if nj else 9999

    groups = defaultdict(int)
    jokers = 0
    for c in unrevealed:
        if c.is_joker: jokers += 1
        else: groups[c.display] += 1

    for disp, cnt in groups.items():
        val = RANK_VALUE_MAP[disp]
        str_val = (14 - val) if rev else val
        if str_val > move_str:
            if cnt + jokers >= count:
                return False

    if jokers >= count and move_val < 14:
        return False

    return True

def solve_endgame_winning_sequence(hand, current_field, unrevealed, rev=False, max_depth=4):
    if not hand: return None
    hand = [parse_card_obj(c) for c in hand]
    current_field = [parse_card_obj(c) for c in current_field]
    unrevealed = [parse_card_obj(c) for c in (unrevealed or [])]

    raw_moves = get_all_valid_moves(hand, current_field, rev)
    if not raw_moves: return None

    # 1. 手札全出し（安全な即ゴールのみ）
    instant = next((m for m in raw_moves if len(m) == len(hand) and not is_forbidden_finish_move(m, rev)), None)
    if instant: return instant

    if len(hand) > 5: return None

    # 2. 8切り架け橋コンボ探索
    eight_moves = [m for m in raw_moves if any(c.display == '8' for c in m)]
    for em in eight_moves:
        rem_hand = [c for c in hand if c not in em]
        if not rem_hand: continue
        next_lead_moves = get_all_valid_moves(rem_hand, [], rev)
        win_next = next((nm for nm in next_lead_moves if len(nm) == len(rem_hand) and not is_forbidden_finish_move(nm, rev)), None)
        if win_next:
            return em

    # 3. 親番確定制圧コンボ探索
    if not current_field and len(hand) <= 4:
        for first_move in raw_moves:
            if is_forbidden_finish_move(first_move, rev): continue
            if is_guaranteed_absolute_win(first_move, unrevealed, rev):
                rem_hand = [c for c in hand if c not in first_move]
                if not rem_hand: return first_move
                next_moves = get_all_valid_moves(rem_hand, [], rev)
                win_next = next((nm for nm in next_moves if len(nm) == len(rem_hand) and not is_forbidden_finish_move(nm, rev)), None)
                if win_next:
                    return first_move

                if max_depth >= 3 and len(rem_hand) <= 3:
                    for second_move in next_moves:
                        if is_forbidden_finish_move(second_move, rev): continue
                        if is_guaranteed_absolute_win(second_move, unrevealed, rev):
                            rem_rem = [c for c in rem_hand if c not in second_move]
                            final_moves = get_all_valid_moves(rem_rem, [], rev)
                            win_final = next((fm for fm in final_moves if len(fm) == len(rem_rem) and not is_forbidden_finish_move(fm, rev)), None)
                            if win_final:
                                return first_move

    return None

# ----------------------------------------------------
# 4. 探索コア ＆ MCTSエンジン
# ----------------------------------------------------
def get_unrevealed_cards(my_hand, field, cleared):
    known = set(my_hand) | set(field) | set(cleared or [])
    full_deck = create_deck()
    return [c for c in full_deck if c not in known]

class SimGame:
    def __init__(self, hands, field, rev, eb, last_p, passes, finished, p_keys=[0,1,2,3]):
        self.p_keys = list(p_keys)
        self.hands = {p: [parse_card_obj(c) for c in hands.get(p, [])] for p in self.p_keys}
        self.field = [parse_card_obj(c) for c in field]
        self.rev = rev
        self.eb = eb
        self.last_p = last_p
        self.passes = passes
        self.finished = list(finished)

    def clone(self):
        return SimGame(self.hands, self.field, self.rev, self.eb, self.last_p, self.passes, self.finished, self.p_keys)

    def eff_rev(self): return self.rev != self.eb

    def get_valid_moves(self, p):
        return get_all_valid_moves(self.hands.get(p, []), self.field, self.eff_rev())

    def do_move(self, p, move):
        h = self.hands[p]
        for c in move:
            for hc in list(h):
                if hc == c:
                    h.remove(hc)
                    break
        self.field = list(move)
        self.last_p = p
        self.passes = 0
        if len(move) >= 4: self.rev = not self.rev
        if any(c.display == 'J' for c in move): self.eb = True
        if len(h) == 0 and p not in self.finished:
            self.finished.append(p)

    def do_pass(self): self.passes += 1

    def advance_turn(self, curr_idx, was_8):
        active = [p for p in self.p_keys if p not in self.finished]
        if was_8 or (self.last_p is not None and (self.passes >= len(active) - 1 or self.passes >= 3)):
            self.field = []
            self.eb = False
            self.passes = 0
            next_p = curr_idx if was_8 else self.p_keys.index(self.last_p)
            g = 0
            while self.p_keys[next_p] in self.finished and g < 8:
                next_p = (next_p + 1) % len(self.p_keys)
                g += 1
            return next_p

        next_p = (curr_idx + 1) % len(self.p_keys)
        g = 0
        while self.p_keys[next_p] in self.finished and g < 8:
            next_p = (next_p + 1) % len(self.p_keys)
            g += 1
        return next_p

def king_solve_exact(sim, king_p, depth=0, max_depth=7, budget=None):
    if budget is not None:
        budget[0] -= 1
        if budget[0] < 0: return False, None
    if len(sim.hands.get(king_p, [])) == 0: return True, None
    if depth >= max_depth: return False, None

    moves = sim.get_valid_moves(king_p)
    if not moves: return False, None

    eff_rev = sim.eff_rev()
    instant = next((m for m in moves if len(m) == len(sim.hands[king_p]) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant: return True, instant

    for move in moves:
        if len(move) == len(sim.hands[king_p]) and is_forbidden_finish_move(move, eff_rev):
            continue

        nxt = sim.clone()
        nxt.do_move(king_p, move)
        was_8 = any(c.display == '8' for c in move)
        next_idx = nxt.advance_turn(sim.p_keys.index(king_p), was_8)

        beaten = False
        all_others_pass = True

        if not was_8:
            curr_sim = nxt.clone()
            curr_idx = next_idx
            safety_count = 0

            while safety_count < 6:
                safety_count += 1
                p = curr_sim.p_keys[curr_idx]
                if p == king_p: break

                if p not in curr_sim.finished:
                    opp_moves = curr_sim.get_valid_moves(p)
                    if opp_moves:
                        all_others_pass = False
                        if any(len(om) == len(curr_sim.hands.get(p, [])) for om in opp_moves):
                            beaten = True
                        break
                    else:
                        curr_sim.do_pass()
                curr_idx = curr_sim.advance_turn(curr_idx, False)

        if not beaten and (was_8 or all_others_pass):
            if len(nxt.hands.get(king_p, [])) == 0: return True, move
            nxt.field = []
            nxt.passes = 0
            win, _ = king_solve_exact(nxt, king_p, depth + 1, max_depth, budget)
            if win: return True, move

    return False, None

class MCTSNode:
    def __init__(self, move, parent, player_idx):
        self.move = move
        self.parent = parent
        self.player_idx = player_idx
        self.children = []
        self.visits = 0
        self.total_score = 0.0
        self.unexpanded_moves = None

def estimate_turns_to_win(hand, rev=False):
    if not hand: return 0
    groups = defaultdict(int)
    jokers = 0
    for c in hand:
        if c.is_joker: jokers += 1
        else: groups[c.display] += 1
    turns = len(groups)
    if jokers > 0 and turns == 0: turns = 1
    control = jokers + sum(1 for c in hand if not c.is_joker and (c.display == '8' or (c.val() <= 3 if rev else c.val() >= 12)))
    if turns == 1: return 1
    return max(1, turns - int(control * 0.8))

def king_evaluate_state(sim, king_p):
    if king_p in sim.finished:
        return 200000.0 - sim.finished.index(king_p) * 50000.0

    score = 0.0
    k_hand = sim.hands.get(king_p, [])
    rev = sim.eff_rev()
    my_turns = estimate_turns_to_win(k_hand, rev)

    score -= my_turns * 6000.0
    score -= len(k_hand) * 80.0

    for p in sim.p_keys:
        if p == king_p: continue
        if p in sim.finished:
            score -= (200000.0 - sim.finished.index(p) * 50000.0) / 2.0
        else:
            opp_len = len(sim.hands.get(p, []))
            if opp_len == 1: score -= 15000.0
            elif opp_len == 2: score -= 7000.0
            elif opp_len == 3: score -= 3000.0
    return score

def run_mcts_core(seat, hand, field, rev, eb, hands_for_sim, finished, last_p, pass_cnt, max_iters=5000, time_budget=0.10):
    eff_rev = (rev != eb)
    valid_moves = get_all_valid_moves(hand, field, eff_rev)
    can_pass = bool(field)
    if not valid_moves: return None

    finish = next((m for m in valid_moves if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if finish: return finish

    base_sim = SimGame(hands_for_sim, field, rev, eb, last_p, pass_cnt, finished)
    root = MCTSNode(None, None, seat)
    cands = sorted(valid_moves, key=lambda m: evaluate_move_default(m, hand, not field, eff_rev=eff_rev), reverse=True)
    root.unexpanded_moves = list(cands)
    if can_pass:
        root.unexpanded_moves.insert(0, None)

    start_t = time.perf_counter()
    iters = 0

    while (time.perf_counter() - start_t < time_budget) and (iters < max_iters):
        iters += 1
        node = root
        sim = base_sim.clone()

        while node.unexpanded_moves is not None and len(node.unexpanded_moves) == 0 and len(node.children) > 0:
            best_child, best_ucb = None, -float('inf')
            for child in node.children:
                if child.visits == 0:
                    best_child = child
                    break
                ucb = (child.total_score / child.visits) + 1.414 * math.sqrt(math.log(node.visits) / child.visits)
                if ucb > best_ucb:
                    best_ucb = ucb
                    best_child = child
            node = best_child
            if node.move is None:
                sim.do_pass()
            else:
                sim.do_move(sim.p_keys[node.parent.player_idx], node.move)
            sim.advance_turn(node.parent.player_idx, node.move is not None and any(c.display == '8' for c in node.move))

        if node.unexpanded_moves and len(node.unexpanded_moves) > 0:
            mv = node.unexpanded_moves.pop()
            next_idx = sim.advance_turn(node.player_idx, mv is not None and any(c.display == '8' for c in mv))
            if mv is None:
                sim.do_pass()
            else:
                sim.do_move(sim.p_keys[node.player_idx], mv)

            child = MCTSNode(mv, node, next_idx)
            child.unexpanded_moves = sim.get_valid_moves(sim.p_keys[next_idx])
            if sim.field:
                child.unexpanded_moves.append(None)
            node.children.append(child)
            node = child

        depth = 0
        curr_p = node.player_idx
        while depth < 4 and len(sim.finished) < 3:
            p = sim.p_keys[curr_p]
            c_moves = sim.get_valid_moves(p)
            if sim.field: c_moves.append(None)
            if not c_moves: break
            ch = random.choice(c_moves)
            if ch is None: sim.do_pass()
            else: sim.do_move(p, ch)
            curr_p = sim.advance_turn(curr_p, ch is not None and any(c.display == '8' for c in ch))
            depth += 1

        sc = king_evaluate_state(sim, seat)
        reward = 1.0 / (1.0 + math.exp(-sc / 8000.0))
        curr = node
        while curr is not None:
            curr.visits += 1
            curr.total_score += reward
            curr = curr.parent

    best_child = max(root.children, key=lambda c: c.visits) if root.children else None
    return best_child.move if best_child else cands[0]

def get_nn_scores(hand, field, rev=False, eb=False, cleared=None, model_choice='hi2'):
    if model_choice in ['apex_v3', 'apex'] and model_apex_loaded:
        target_model = model_apex
        in_dim = apex_in_dim
    elif model_choice == 'gilgamesh' and model_gilgamesh_loaded:
        target_model = model_gilgamesh
        in_dim = gilgamesh_in_dim
    else:
        target_model = model_hi2
        in_dim = hi2_in_dim

    if target_model is None:
        return [evaluate_move_default([c], hand, not field) for c in hand]

    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    cleared = [parse_card_obj(c) for c in (cleared or [])]

    vec = build_input_vector(hand, field, required_dim=in_dim, is_rev=rev, is_eb=eb, cleared_cards=cleared)
    with torch.no_grad():
        t = torch.tensor([vec], dtype=torch.float32).to(device)
        return target_model(t).squeeze(0).tolist()

# ----------------------------------------------------
# 5. キャラクター別 本番思考ルーチン (Endgame Solver 黄金版 連動)
# ----------------------------------------------------

# [0] 👑 ギルガメッシュ
def decide_gilgamesh(seat, hand, field, valid, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    if not valid: return None

    profile = get_tactical_profile('GILGAMESH')
    eff_rev = (rev != eb)

    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=6)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99
    is_opp_reach = (min_opp_len <= 2)

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 8 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, exact_m = king_solve_exact(base_sim, seat, depth=0, max_depth=8, budget=[4000])
        if win and exact_m: return exact_m

    if is_opp_reach and field:
        reach_seats = [s for s in range(4) if s != seat and s not in finished and len(all_hands[s]) <= 2]
        threat_cards = [c for rs in reach_seats for c in all_hands[rs]]
        solid_blockers = []
        for m in use_valid:
            if any(c.display == '8' for c in m): return m
            if all(not is_valid_play([tc], m, eff_rev) for tc in threat_cards):
                solid_blockers.append(m)

        if solid_blockers:
            solid_blockers.sort(key=lambda m: (len(m) * 100) - m[0].strength(eff_rev))
            return solid_blockers[0]

    filtered_valid = [m for m in use_valid if not is_joker_waste_move(m, hand)]
    if is_field_empty:
        non_eight = [m for m in filtered_valid if not (any(c.display == '8' for c in m) and hand_len > len(m))]
        if non_eight: filtered_valid = non_eight
    pool = filtered_valid if filtered_valid else use_valid

    mcts_res = run_mcts_core(seat, hand, field, rev, eb, all_hands, finished, last_p, pass_cnt, max_iters=15000, time_budget=0.25)
    if mcts_res:
        if not should_strategic_pass_on_high_card(mcts_res, hand, field, eff_rev, min_opp_len, profile):
            if not (len(mcts_res) == hand_len and is_forbidden_finish_move(mcts_res, eff_rev)):
                return mcts_res

    pool.sort(key=lambda m: (len(m) * 100) - m[0].strength(eff_rev), reverse=True)
    chosen = pool[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# [1] 🤴 覚醒新王 (AWAKENED_KING)
def decide_awakened_young_king(seat, hand, field, valid, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    if not valid: return None

    profile = get_tactical_profile('AWAKENED_KING')
    eff_rev = (rev != eb)

    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=5)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 7 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, exact_m = king_solve_exact(base_sim, seat, depth=0, max_depth=7)
        if win and exact_m: return exact_m

    if hand_len <= 8:
        mcts_move = run_mcts_core(
            seat, hand, field, rev, eb, all_hands, finished, last_p, pass_cnt,
            max_iters=7500, time_budget=0.15
        )
        if mcts_move:
            if not should_strategic_pass_on_high_card(mcts_move, hand, field, eff_rev, min_opp_len, profile):
                if not (len(mcts_move) == hand_len and is_forbidden_finish_move(mcts_move, eff_rev)):
                    return mcts_move

    scores = get_nn_scores(hand, field, rev, eb, cleared, model_choice='apex')

    best_m, best_s = None, -float('inf')
    for m in use_valid:
        card_sc = [scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]
        s = (sum(card_sc) / max(1, len(card_sc))) + (len(m) * 10.0 * profile['R4_leadMulti'])

        if len(m) >= 4:
            s += (25.0 * profile['R8_plannedRevolution'])

        if is_joker_waste_move(m, hand):
            s -= 50.0

        if is_field_empty and any(c.display == '8' for c in m) and hand_len > len(m):
            s -= 45.0

        s += evaluate_hand_formation(m, hand, eff_rev, min_opp_len) * 1.0

        if s > best_s:
            best_s = s
            best_m = m

    chosen = best_m or use_valid[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# [2] 👸 女王 (SUPER_AI)
def decide_queen_mcts_fair(seat, hand, field, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    eff_rev = (rev != eb)
    valid = get_all_valid_moves(hand, field, eff_rev)
    if not valid: return None

    profile = get_tactical_profile('SUPER_AI')
    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=4)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    is_field_empty = (len(field) == 0)
    random.shuffle(unrevealed)

    sim_hands = {seat: list(hand)}
    curr_idx = 0
    for p in range(4):
        if p == seat: continue
        req_len = len(all_hands.get(p, []))
        sim_hands[p] = unrevealed[curr_idx : curr_idx + req_len]
        curr_idx += req_len

    active_others = [p for p in range(4) if p != seat and p not in finished]
    if len(hand) <= 6 or any(len(all_hands.get(p, [])) <= 3 for p in active_others):
        base_sim = SimGame(sim_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, em = king_solve_exact(base_sim, seat, 0, 7)
        if win and em: return em

    mcts_res = run_mcts_core(seat, hand, field, rev, eb, sim_hands, finished, last_p, pass_cnt, max_iters=5000, time_budget=0.10)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99
    is_opp_reach = (min_opp_len <= 2)

    if mcts_res:
        if not should_strategic_pass_on_high_card(mcts_res, hand, field, eff_rev, min_opp_len, profile):
            if not (len(mcts_res) == len(hand) and is_forbidden_finish_move(mcts_res, eff_rev)):
                return mcts_res

    safe_valid = [m for m in valid if not (len(m) == len(hand) and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    use_valid.sort(key=lambda m: evaluate_move_default(m, hand, is_field_empty, profile, eff_rev, min_opp_len) + evaluate_eight_bridge(m, hand, min_opp_len, is_opp_reach, is_field_empty, profile, eff_rev) + evaluate_eleven_back_balance(m, hand, eff_rev, profile), reverse=True)
    chosen = use_valid[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# [3] 🏰 王 (KING)
def decide_king_apex_direct(seat, hand, field, valid, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    if not valid: return None

    profile = get_tactical_profile('KING')
    eff_rev = (rev != eb)

    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=5)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99
    is_opp_reach = (min_opp_len <= 2)

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 6 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, exact_m = king_solve_exact(base_sim, seat, depth=0, max_depth=5)
        if win and exact_m: return exact_m

    if is_opp_reach and field:
        eight_m = next((m for m in use_valid if any(c.display == '8' for c in m)), None)
        if eight_m: return eight_m
        use_valid.sort(key=lambda m: (len(m) * 100) + m[0].strength(eff_rev), reverse=True)
        return use_valid[0]

    groups = defaultdict(list)
    for c in hand:
        if not c.is_joker: groups[c.display].append(c)

    if not field:
        quads = [m for m in use_valid if len(m) >= 4]
        if quads: return quads[0]
        triples = [m for m in use_valid if len(m) == 3]
        if triples:
            triples.sort(key=lambda m: m[0].val())
            return triples[0]
        pairs = [m for m in use_valid if len(m) == 2]
        if pairs:
            pairs.sort(key=lambda m: m[0].val())
            return pairs[0]

    scores = get_nn_scores(hand, field, rev, eb, cleared, model_choice='apex')
    exit_ticket = identify_exit_ticket(hand)

    cands = [m for m in use_valid if not (len(m) == 1 and not m[0].is_joker and len(groups[m[0].display]) >= 2 and hand_len > 2)]
    if not cands: cands = use_valid

    best_m, best_s = None, -float('inf')
    for m in cands:
        card_sc = [scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]
        s = sum(card_sc) / max(1, len(card_sc))
        m_len = len(m)
        disp = m[0].display if not m[0].is_joker else 'JOKER'

        if m_len >= 4: s += 55.0
        elif m_len == 3: s += 24.0
        elif m_len == 2: s += 18.0
        elif m_len == 1:
            if disp in groups and len(groups[disp]) >= 2: s -= 45.0
            if exit_ticket is not None and exit_ticket in m:
                if hand_len >= 4: s -= 45.0
            elif m[0].val() <= 8: s += 8.0

        if is_joker_waste_move(m, hand):
            s -= 50.0

        if is_field_empty and any(c.display == '8' for c in m) and hand_len > m_len:
            s -= 45.0
        elif not is_field_empty and any(c.display == '8' for c in m) and (min_opp_len <= 3 or hand_len <= 4):
            s += 20.0

        s += evaluate_hand_formation(m, hand, eff_rev, min_opp_len) * 0.8

        if s > best_s: best_s, best_m = s, m

    chosen = best_m or use_valid[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# [4] ⚔️ 織田信長 (NOBUNAGA)
def decide_nobunaga(seat, hand, field, valid, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    if not valid: return None

    profile = get_tactical_profile('NOBUNAGA')
    eff_rev = (rev != eb)

    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=4)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 6 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, em = king_solve_exact(base_sim, seat, 0, 5)
        if win and em: return em

    groups = defaultdict(list)
    for c in hand:
        if not c.is_joker: groups[c.display].append(c)

    quads = [m for m in use_valid if len(m) >= 4]
    if quads:
        if hand_len == len(quads[0]): return quads[0]
        remaining = [c for c in hand if c not in quads[0]]
        if rev:
            normal_high = sum(1 for c in remaining if c.is_joker or c.val() >= 11)
            rev_high = sum(1 for c in remaining if not c.is_joker and c.val() <= 5)
            if normal_high >= rev_high or min_opp_len <= 2: return quads[0]
        else:
            low_count = sum(1 for c in remaining if not c.is_joker and c.val() <= 5)
            high_count = sum(1 for c in remaining if c.is_joker or c.val() >= 12)
            if low_count >= high_count or min_opp_len <= 2: return quads[0]

    eight_moves = [m for m in use_valid if any(c.display == '8' for c in m)]
    if eight_moves and field:
        if min_opp_len <= 2 or hand_len <= 5: return eight_moves[0]
        has_multi_followup = any(len(cards) >= 2 for cards in groups.values())
        if has_multi_followup: return eight_moves[0]

    if not field:
        if min_opp_len == 1:
            multi = [m for m in use_valid if len(m) >= 2]
            if multi:
                multi.sort(key=lambda m: (len(m), -m[0].strength(eff_rev)), reverse=True)
                return multi[0]

        triples = [m for m in use_valid if len(m) == 3]
        if triples:
            triples.sort(key=lambda m: m[0].strength(eff_rev))
            return triples[0]
        pairs = [m for m in use_valid if len(m) == 2]
        if pairs:
            pairs.sort(key=lambda m: m[0].strength(eff_rev))
            return pairs[0]

    scores = get_nn_scores(hand, field, rev, eb, cleared, model_choice='hi2')
    cands = use_valid

    best_m, best_s = None, -float('inf')
    for m in cands:
        card_sc = [scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]
        s = sum(card_sc) / max(1, len(card_sc))
        m_len = len(m)
        disp = m[0].display if not m[0].is_joker else 'JOKER'

        if m_len >= 4: s += (55.0 * profile['R8_plannedRevolution'])
        elif m_len == 3: s += (26.0 * profile['R4_leadMulti'])
        elif m_len == 2: s += (18.0 * profile['R4_leadMulti'])
        elif m_len == 1:
            if disp in groups and len(groups[disp]) >= 2: s -= 48.0
            if m[0].strength(eff_rev) <= 7: s += 10.0

        if is_joker_waste_move(m, hand):
            s -= 50.0

        if is_field_empty and any(c.display == '8' for c in m) and hand_len > m_len:
            s -= 45.0

        if s > best_s: best_s, best_m = s, m

    return best_m or use_valid[0]

# [5] 🏛️ 秦の始皇帝 (SHI_HUANGDI)
def decide_shi_huangdi(seat, hand, field, valid, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    if not valid: return None

    profile = get_tactical_profile('SHI_HUANGDI')
    eff_rev = (rev != eb)

    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=6)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99
    is_opp_reach = (min_opp_len <= 2)

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 6 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, em = king_solve_exact(base_sim, seat, 0, 6)
        if win and em: return em

    groups = defaultdict(list)
    for c in hand:
        if not c.is_joker: groups[c.display].append(c)

    quads = [m for m in use_valid if len(m) >= 4]
    if quads:
        if hand_len == len(quads[0]): return quads[0]
        remaining = [c for c in hand if c not in quads[0]]
        if rev:
            normal_high = sum(1 for c in remaining if c.is_joker or c.val() >= 11)
            rev_high = sum(1 for c in remaining if not c.is_joker and c.val() <= 5)
            if normal_high >= rev_high or min_opp_len <= 2: return quads[0]
        else:
            low_count = sum(1 for c in remaining if not c.is_joker and c.val() <= 5)
            high_count = sum(1 for c in remaining if c.is_joker or c.val() >= 12)
            if low_count >= high_count or min_opp_len <= 2: return quads[0]

    eight_moves = [m for m in use_valid if any(c.display == '8' for c in m)]
    if eight_moves and field:
        if is_opp_reach or hand_len <= 5: return eight_moves[0]
        if evaluate_eight_bridge(eight_moves[0], hand, min_opp_len, is_opp_reach, is_field_empty, profile, eff_rev) > 0: return eight_moves[0]

    if not field:
        if min_opp_len == 1:
            multi = [m for m in use_valid if len(m) >= 2]
            if multi:
                multi.sort(key=lambda m: (len(m), -m[0].strength(eff_rev)), reverse=True)
                return multi[0]

        triples = [m for m in use_valid if len(m) == 3]
        if triples:
            triples.sort(key=lambda m: m[0].strength(eff_rev))
            return triples[0]
        pairs = [m for m in use_valid if len(m) == 2]
        if pairs:
            pairs.sort(key=lambda m: m[0].strength(eff_rev))
            return pairs[0]

    scores = get_nn_scores(hand, field, rev, eb, cleared, model_choice='gilgamesh')
    exit_t = identify_exit_ticket(hand)

    cands = use_valid
    if field and hand_len > 3:
        non_ticket = [m for m in use_valid if not (len(m) == 1 and (m[0].is_joker or (m[0].display == '3' if eff_rev else m[0].display == '2')))]
        if non_ticket: cands = non_ticket

    best_m, best_s = None, -float('inf')
    for m in cands:
        card_sc = [scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]
        s = sum(card_sc) / max(1, len(card_sc))
        m_len = len(m)
        disp = m[0].display if not m[0].is_joker else 'JOKER'

        if m_len >= 4: s += 55.0
        elif m_len == 3: s += 24.0
        elif m_len == 2: s += 18.0
        elif m_len == 1:
            if disp in groups and len(groups[disp]) >= 2: s -= 48.0
            if exit_t is not None and exit_t in m:
                if hand_len >= 4: s -= 45.0
            elif m[0].strength(eff_rev) <= 8: s += 8.0

        if is_joker_waste_move(m, hand): s -= 60.0

        s += evaluate_eight_bridge(m, hand, min_opp_len, is_opp_reach, is_field_empty, profile, eff_rev)
        s += evaluate_eleven_back_balance(m, hand, eff_rev, profile)

        if s > best_s: best_s, best_m = s, m

    chosen = best_m or use_valid[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# [6] 🔮 聖徳太子 (SHOTOKU)
def decide_shotoku(seat, hand, field, rev, allHands, finished, played, other_lens, last_p, pass_cnt, cleared=None):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    eff_rev = rev
    valid = get_all_valid_moves(hand, field, eff_rev)
    if not valid: return None

    profile = get_tactical_profile('SHOTOKU')
    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=5)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    min_len = min(other_lens) if other_lens else 99
    is_opp_reach = (min_len <= 2)

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 6 or min_len <= 3:
        base_sim = SimGame(allHands, field, rev, False, last_p, pass_cnt, finished)
        win, em = king_solve_exact(base_sim, seat, 0, 7)
        if win and em: return em

    groups = defaultdict(list)
    for c in hand:
        if not c.is_joker: groups[c.display].append(c)

    quads = [m for m in use_valid if len(m) >= 4]
    if quads:
        if rev:
            normal_high_count = sum(1 for c in hand if c.is_joker or c.val() >= 11)
            rev_high_count = sum(1 for c in hand if not c.is_joker and c.val() <= 4)
            if (normal_high_count >= rev_high_count) or (min_len <= 2):
                return quads[0]
            elevens = [m for m in use_valid if any(c.display == 'J' for c in m)]
            if elevens: return elevens[0]
        else:
            remaining = [c for c in hand if c not in quads[0]]
            if not remaining: return quads[0]
            rev_strong = sum(1 for c in remaining if c.is_joker or c.val() <= 5)
            rev_weak = sum(1 for c in remaining if not c.is_joker and c.val() >= 9)
            if rev_strong >= rev_weak or min_len <= 2: return quads[0]

    if not field:
        if min_len <= 2:
            multi = [m for m in use_valid if len(m) >= 2]
            if multi:
                multi.sort(key=lambda m: (len(m), -m[0].strength(rev)), reverse=True)
                return multi[0]
        pairs = [m for m in use_valid if len(m) >= 2]
        if pairs:
            pairs.sort(key=lambda m: m[0].strength(rev))
            return pairs[0]

    if is_opp_reach and field:
        blockers = [m for m in use_valid if any(c.display == '8' for c in m)]
        if blockers: return blockers[0]

    safe_moves = [m for m in use_valid if not (len(m) == 1 and not m[0].is_joker and len(groups[m[0].display]) >= 2 and hand_len > 2)]
    safe_moves = [m for m in safe_moves if not is_joker_waste_move(m, hand)]
    cands = safe_moves if safe_moves else use_valid

    best_m, best_s = None, -float('inf')
    for m in cands:
        s = (len(m) * 100) - m[0].strength(rev)
        s += evaluate_eight_bridge(m, hand, min_len, is_opp_reach, is_field_empty, profile, eff_rev)
        s += evaluate_eleven_back_balance(m, hand, rev, profile)
        if s > best_s:
            best_s = s
            best_m = m

    chosen = best_m or cands[0]
    if field and should_strategic_pass_smart_shotoku(chosen, hand, field, rev, min_len):
        return None
    return chosen

# [7] 🛡️ アレク王 (ALEXANDER)
def decide_alexander_hybrid(seat, hand, field, rev, eb, cleared, all_hands, finished, played, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    eff_rev = (rev != eb)
    valid = get_all_valid_moves(hand, field, eff_rev)
    if not valid: return None

    profile = get_tactical_profile('ALEXANDER')
    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=7)
    if endgame_m: return endgame_m

    if len(field) == 1 and field[0].is_joker:
        spade3 = next((c for c in hand if not c.is_joker and c.suit == '♠' and c.display == '3'), None)
        if spade3: return [spade3]

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99
    is_opp_reach = (min_opp_len <= 2)

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 6 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, exact_m = king_solve_exact(base_sim, seat, depth=0, max_depth=7)
        if win and exact_m: return exact_m

    groups = defaultdict(list)
    for c in hand:
        if not c.is_joker: groups[c.display].append(c)

    quads = [m for m in use_valid if len(m) >= 4]
    if quads:
        if hand_len == len(quads[0]): return quads[0]
        remaining = [c for c in hand if c not in quads[0]]
        if rev:
            normal_high = sum(1 for c in remaining if c.is_joker or c.val() >= 11)
            rev_high = sum(1 for c in remaining if not c.is_joker and c.val() <= 5)
            if normal_high >= rev_high or min_opp_len <= 2: return quads[0]
        else:
            low_count = sum(1 for c in remaining if not c.is_joker and c.val() <= 5)
            high_count = sum(1 for c in remaining if c.is_joker or c.val() >= 12)
            if low_count >= high_count or min_opp_len <= 2: return quads[0]

    eight_moves = [m for m in use_valid if any(c.display == '8' for c in m)]
    if eight_moves and field:
        if is_opp_reach or hand_len <= 5: return eight_moves[0]
        if evaluate_eight_bridge(eight_moves[0], hand, min_opp_len, is_opp_reach, is_field_empty, profile, eff_rev) > 0: return eight_moves[0]

    if not field:
        if min_opp_len == 1:
            multi = [m for m in use_valid if len(m) >= 2]
            if multi:
                multi.sort(key=lambda m: (len(m), -m[0].strength(eff_rev)), reverse=True)
                return multi[0]

        triples = [m for m in use_valid if len(m) == 3]
        if triples:
            triples.sort(key=lambda m: m[0].strength(eff_rev))
            return triples[0]
        pairs = [m for m in use_valid if len(m) == 2]
        if pairs:
            pairs.sort(key=lambda m: m[0].strength(eff_rev))
            return pairs[0]

    scores = get_nn_scores(hand, field, rev, eb, cleared, model_choice='gilgamesh')
    cands = [m for m in use_valid if not (len(m) == 1 and not m[0].is_joker and len(groups[m[0].display]) >= 2 and hand_len > 2)]
    if not cands: cands = use_valid

    best_m, best_s = None, -float('inf')
    for m in cands:
        card_sc = [scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]
        s = sum(card_sc) / max(1, len(card_sc))
        m_len = len(m)
        disp = m[0].display if not m[0].is_joker else 'JOKER'

        if m_len >= 4: s += 60.0
        elif m_len == 3: s += 28.0
        elif m_len == 2: s += 18.0
        elif m_len == 1:
            if disp in groups and len(groups[disp]) >= 2: s -= 45.0
            if (m[0].is_joker or (m[0].val() <= 4 if eff_rev else m[0].val() >= 13)) and hand_len >= 4 and min_opp_len >= 3:
                s -= 45.0
            elif m[0].strength(eff_rev) <= 8: s += 8.0

        if is_joker_waste_move(m, hand): s -= 50.0

        s += evaluate_eight_bridge(m, hand, min_opp_len, is_opp_reach, is_field_empty, profile, eff_rev)
        s += evaluate_eleven_back_balance(m, hand, eff_rev, profile)

        if s > best_s: best_s, best_m = s, m

    chosen = best_m or use_valid[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# [8] 🤴 新王 (BEGINNER_AI)
def decide_young_king(seat, hand, field, valid, rev, eb, cleared, all_hands, finished, last_p, pass_cnt):
    hand = [parse_card_obj(c) for c in hand]
    field = [parse_card_obj(c) for c in field]
    if not valid: return None

    profile = get_tactical_profile('BEGINNER_AI')
    eff_rev = (rev != eb)

    instant_win = next((m for m in valid if len(m) == len(hand) and not is_forbidden_finish_move(m, eff_rev)), None)
    if instant_win: return instant_win

    unrevealed = get_unrevealed_cards(hand, field, cleared)
    endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=4)
    if endgame_m: return endgame_m

    hand_len = len(hand)
    is_field_empty = (len(field) == 0)
    other_lens = [len(all_hands[s]) for s in range(4) if s != seat and s not in finished]
    min_opp_len = min(other_lens) if other_lens else 99

    safe_valid = [m for m in valid if not (len(m) == hand_len and is_forbidden_finish_move(m, eff_rev))]
    use_valid = safe_valid if safe_valid else valid

    if hand_len <= 6 or min_opp_len <= 3:
        base_sim = SimGame(all_hands, field, rev, eb, last_p, pass_cnt, finished)
        win, exact_m = king_solve_exact(base_sim, seat, depth=0, max_depth=5)
        if win and exact_m: return exact_m

    groups = defaultdict(list)
    for c in hand:
        if not c.is_joker: groups[c.display].append(c)

    if not field:
        quads = [m for m in use_valid if len(m) >= 4]
        if quads: return quads[0]
        triples = [m for m in use_valid if len(m) == 3]
        if triples:
            triples.sort(key=lambda m: m[0].val())
            return triples[0]
        pairs = [m for m in use_valid if len(m) == 2]
        if pairs:
            pairs.sort(key=lambda m: m[0].val())
            return pairs[0]

    scores = get_nn_scores(hand, field, rev, eb, cleared, model_choice='hi2')
    exit_ticket = identify_exit_ticket(hand)

    cands = [m for m in use_valid if not (len(m) == 1 and not m[0].is_joker and len(groups[m[0].display]) >= 2 and hand_len > 2)]
    if not cands: cands = use_valid

    best_m, best_s = None, -float('inf')
    for m in cands:
        card_sc = [scores[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]
        s = sum(card_sc) / max(1, len(card_sc))
        m_len = len(m)
        disp = m[0].display if not m[0].is_joker else 'JOKER'

        if m_len >= 4: s += 50.0
        elif m_len == 3: s += 22.0
        elif m_len == 2: s += 16.0
        elif m_len == 1:
            if disp in groups and len(groups[disp]) >= 2: s -= 40.0
            if exit_ticket is not None and exit_ticket in m:
                if hand_len >= 4: s -= 40.0
            elif m[0].val() <= 8: s += 6.0

        if is_joker_waste_move(m, hand):
            s -= 40.0

        if is_field_empty and any(c.display == '8' for c in m) and hand_len > m_len:
            s -= 40.0
        elif not is_field_empty and any(c.display == '8' for c in m) and (min_opp_len <= 3 or hand_len <= 4):
            s += 18.0

        s += evaluate_hand_formation(m, hand, eff_rev, min_opp_len) * 0.6

        if s > best_s: best_s, best_m = s, m

    chosen = best_m or use_valid[0]
    if should_strategic_pass_on_high_card(chosen, hand, field, eff_rev, min_opp_len, profile):
        return None
    return chosen

# ----------------------------------------------------
# 6. Web API エンドポイント ＆ セキュリティ防壁
# ----------------------------------------------------
app = Flask(__name__)
CORS(app)

ALLOWED_STATIC_EXTENSIONS = {
    '.html', '.htm', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif',
    '.svg', '.ico', '.mp3', '.wav', '.ogg', '.json', '.woff', '.woff2', '.ttf'
}

FORBIDDEN_KEYWORDS = {
    'server.py', '.pth', '.pt', '.py', '.env', '.git', '.sh',
    'logs', '__pycache__', 'simulate_league'
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "model_hi2_loaded": model_hi2_loaded,
        "hi2_name": hi2_name,
        "model_gilgamesh_loaded": model_gilgamesh_loaded,
        "gilgamesh_name": gilgamesh_name,
        "model_apex_loaded": model_apex_loaded,
        "apex_name": apex_name,
        "active_characters": list(CHARACTER_NAMES.keys())
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json() or {}
        hand_raw = data.get('hand', [])
        field_raw = data.get('field', [])
        cleared_raw = data.get('clearedCards', [])
        valid_moves_raw = data.get('validMoves', [])
        char_id = data.get('charId') or data.get('character') or data.get('modelType', 'SUPER_AI')
        is_rev = data.get('isRevolution', False)
        is_eb = data.get('isElevenBack', False)
        all_hands_raw = data.get('allHands') or {0: hand_raw, 1: [], 2: [], 3: []}
        finished = data.get('finishedPlayers', [])
        played_history = data.get('playedHistory', [])
        last_seat = data.get('lastSeat', 0)
        pass_cnt = data.get('passCount', 0)
        my_seat = int(data.get('seat', data.get('mySeat', 0)))

        hand = [parse_card_obj(c) for c in hand_raw]
        field = [parse_card_obj(c) for c in field_raw]
        cleared = [parse_card_obj(c) for c in cleared_raw]
        all_hands = {int(k): [parse_card_obj(c) for c in v] for k, v in all_hands_raw.items()}

        if my_seat not in all_hands or not all_hands[my_seat]:
            all_hands[my_seat] = hand

        eff_rev = (is_rev != is_eb)

        valid_moves = [[parse_card_obj(c) for c in m] for m in valid_moves_raw]
        if not valid_moves:
            valid_moves = get_all_valid_moves(hand, field, eff_rev)

        if not valid_moves:
            return jsonify({"chosenMove": None, "reason": "no_valid_moves"})

        char_key = str(char_id).upper()
        role_name = CHARACTER_NAMES.get(char_key, '超級AI')
        profile = get_tactical_profile(char_key)

        if char_key == 'GILGAMESH':
            best_move = decide_gilgamesh(my_seat, hand, field, valid_moves, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        elif char_key in ['AWAKENED_KING', 'AWAKENED_YOUNG_KING']:
            best_move = decide_awakened_young_king(my_seat, hand, field, valid_moves, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        elif char_key == 'SUPER_AI':
            best_move = decide_queen_mcts_fair(my_seat, hand, field, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        elif char_key == 'KING':
            best_move = decide_king_apex_direct(my_seat, hand, field, valid_moves, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        elif char_key == 'NOBUNAGA':
            best_move = decide_nobunaga(my_seat, hand, field, valid_moves, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        elif char_key == 'SHI_HUANGDI':
            best_move = decide_shi_huangdi(my_seat, hand, field, valid_moves, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        elif char_key == 'SHOTOKU':
            other_lens = [len(all_hands[s]) for s in range(4) if s != my_seat and s not in finished]
            best_move = decide_shotoku(my_seat, hand, field, eff_rev, all_hands, finished, played_history, other_lens, last_seat, pass_cnt, cleared)
        elif char_key == 'ALEXANDER':
            best_move = decide_alexander_hybrid(my_seat, hand, field, is_rev, is_eb, cleared, all_hands, finished, played_history, last_seat, pass_cnt)
        elif char_key in ['BEGINNER_AI', 'YOUNG_KING']:
            best_move = decide_young_king(my_seat, hand, field, valid_moves, is_rev, is_eb, cleared, all_hands, finished, last_seat, pass_cnt)
        else:
            unrevealed = get_unrevealed_cards(hand, field, cleared)
            safe_valid = [m for m in valid_moves if not (len(m) == len(hand) and is_forbidden_finish_move(m, eff_rev))]
            cands = safe_valid if safe_valid else valid_moves

            if profile.get('R14_endgameSolverDepth', 0.5) >= 0.3:
                endgame_m = solve_endgame_winning_sequence(hand, field, unrevealed, eff_rev, max_depth=4)
                if endgame_m:
                    best_move = endgame_m
                else:
                    sc = get_nn_scores(hand, field, is_rev, is_eb, cleared, model_choice='hi2')
                    cand = max(cands, key=lambda m: sum([sc[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]))
                    other_lens = [len(all_hands[s]) for s in range(4) if s != my_seat and s not in finished]
                    min_opp = min(other_lens) if other_lens else 99
                    if should_strategic_pass_on_high_card(cand, hand, field, eff_rev, min_opp, profile):
                        best_move = None
                    else:
                        best_move = cand
            else:
                sc = get_nn_scores(hand, field, is_rev, is_eb, cleared, model_choice='hi2')
                cand = max(cands, key=lambda m: sum([sc[card_to_idx(c)] for c in m if 0 <= card_to_idx(c) < 53]))
                other_lens = [len(all_hands[s]) for s in range(4) if s != my_seat and s not in finished]
                min_opp = min(other_lens) if other_lens else 99
                if should_strategic_pass_on_high_card(cand, hand, field, eff_rev, min_opp, profile):
                    best_move = None
                else:
                    best_move = cand

        # 親番フォールバック
        if not field and not best_move and valid_moves:
            safe_lead = [m for m in valid_moves if not (len(m) == len(hand) and is_forbidden_finish_move(m, eff_rev))]
            best_move = safe_lead[0] if safe_lead else valid_moves[0]

        res_move = serialize_cards(best_move) if best_move else None
        move_str = ' '.join([f"{c.suit}{c.display}" for c in (best_move or [])]) if best_move else 'パス'
        print(f"[推論] {role_name} (席{my_seat}) -> 選択: {move_str}", flush=True)

        return jsonify({
            "chosenMove": res_move,
            "charId": char_key,
            "charName": role_name,
            "seat": my_seat,
            "status": "success"
        })
    except Exception as e:
        print(f"⚠️ 推論エラー: {e}", flush=True)
        return jsonify({"chosenMove": None, "status": "error", "message": str(e)})

@app.route('/save_practice_log', methods=['POST'])
def save_practice_log():
    try:
        data = request.get_json() or {}
        filename = data.get('filename')
        content = data.get('content')
        if not filename or content is None:
            return jsonify({"status": "error", "message": "パラメータ不足"}), 400

        safe_filename = os.path.basename(filename)
        _, ext = os.path.splitext(safe_filename)
        ext_lower = ext.lower()

        if ext_lower not in {'.jsonl', '.csv', '.json'}:
            return jsonify({"status": "error", "message": "無効なファイル形式です（.jsonl, .csv, .json のみ許可）"}), 400

        if len(content) > 10 * 1024 * 1024:
            return jsonify({"status": "error", "message": "ファイルサイズ上限（10MB）を超過しています"}), 413

        logs_dir = os.path.join(BASE_DIR, 'logs')
        os.makedirs(logs_dir, exist_ok=True)
        save_path = os.path.join(logs_dir, safe_filename)
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"💾 [PC直接保存成功] {safe_filename} ({len(content)} bytes)", flush=True)
        return jsonify({"status": "success", "filename": safe_filename})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/', methods=['GET'])
def serve_index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:path>', methods=['GET'])
def serve_static(path):
    normalized = path.replace('\\', '/').strip('/')
    parts = normalized.split('/')
    for part in parts:
        part_lower = part.lower()
        if any(fk in part_lower for fk in FORBIDDEN_KEYWORDS):
            abort(403)
        if part_lower.startswith('.'):
            abort(403)

    _, ext = os.path.splitext(normalized)
    ext_lower = ext.lower()
    
    if ext_lower and ext_lower not in ALLOWED_STATIC_EXTENSIONS:
        abort(403)

    full_target = os.path.abspath(os.path.join(BASE_DIR, normalized))
    if not full_target.startswith(BASE_DIR):
        abort(403)

    if not os.path.exists(full_target) or os.path.isdir(full_target):
        abort(404)

    return send_from_directory(BASE_DIR, normalized)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print("=======================================================", flush=True)
    print("👑 大富豪 ROYAL CARD GAME サーバー (本格競技ルール ＆ APEX-v3対応版)", flush=True)
    print(f"   ポート: {port} で稼働開始", flush=True)
    print(f"   👑 ギルガメッシュ: 【全知全能透視 15,000回MCTS ＆ 終盤確定詰み】", flush=True)
    print(f"   🤴 覚醒新王    : 【APEX-v3直感 × 7,500回MCTS ＆ 手札形成フル ＆ 確定詰み】", flush=True)
    print(f"   🏰 王          : 【APEX-v3直感 × 深さ5詰み ＆ 手札形成0.8 ＆ リーチ絶対防衛動員】", flush=True)
    print(f"   🤴 新王        : 【俊英マルチ × 手札形成0.6 ＆ 深さ5詰み】", flush=True)
    print(f"   ⚔️ 織田信長    : 【親番三段撃ち電撃速攻 ＆ 8架け橋キルコンボ】", flush=True)
    print(f"   👸 女王        : 【正統派不完全情報 5,000回MCTS ＆ 終盤確定詰み】", flush=True)
    print(f"   🔮 聖徳太子    : 【真・完全傾聴 ＆ 大調和11バック活用 ＆ 確定詰み】", flush=True)
    print(f"   🏛️ 秦の始皇帝  : 【法家統制手札圧縮 ＆ 11自滅抑制 ＆ 深さ6確定詰み】", flush=True)
    print(f"   🛡️ アレク王    : 【ファランクス重装突撃 ＆ 8架け橋 ＆ 深さ7確定詰み】", flush=True)
    print(f"   ⚙️ 制御基盤    : 【全18キャラ CHARACTER_TACTICAL_PROFILES 完全同期】", flush=True)
    print("=======================================================", flush=True)
    app.run(host='0.0.0.0', port=port, debug=False)

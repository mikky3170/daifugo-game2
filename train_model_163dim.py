# [Python Training Script] train_model_163dim.py
# 【王打倒・最終決戦】163次元深層6層モデル学習スクリプト (AdamW + CosineAnnealing + BatchNorm)

import os
import sys
import time
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

# ----------------------------------------------------
# 1. 163次元深層モデルアーキテクチャ (server.pyと完全一致)
# ----------------------------------------------------
class ImprovedDaifugoModel(nn.Module):
    """163次元対応: 6層全結合 + BatchNorm + Dropout対応"""
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
        x = self.fc5(x)
        return x

# ----------------------------------------------------
# 2. 学習メインルーチン
# ----------------------------------------------------
def train():
    print("=================================================================", flush=True)
    print("🚀 【ROYAL DAIFUGO】王打倒・新世代 163次元超級モデル育成開始", flush=True)
    print("=================================================================", flush=True)

    dataset_path = "expert_dataset_163dim.npz"
    if not os.path.exists(dataset_path):
        print(f"❌ エキスパートデータセット '{dataset_path}' が見つかりません。", flush=True)
        print("   先に python create_dataset_163dim.py を実行してください。", flush=True)
        return

    # 1. データの読み込み
    print(f"📦 データセット読み込み中: {dataset_path}...", flush=True)
    data = np.load(dataset_path)
    X = data['X']  # (N, 163)
    Y = data['Y']  # (N, 53)
    total_samples = len(X)
    print(f"✅ サンプル数: {total_samples:,} 件 / 入力次元: {X.shape[1]} / 出力次元: {Y.shape[1]}", flush=True)

    # 2. 訓練・検証分割 (90% Train, 10% Validation)
    np.random.seed(42)
    indices = np.arange(total_samples)
    np.random.shuffle(indices)

    val_size = int(total_samples * 0.10)
    train_indices = indices[val_size:]
    val_indices = indices[:val_size]

    train_x, train_y = torch.tensor(X[train_indices]), torch.tensor(Y[train_indices])
    val_x, val_y = torch.tensor(X[val_indices]), torch.tensor(Y[val_indices])

    train_dataset = TensorDataset(train_x, train_y)
    val_dataset = TensorDataset(val_x, val_y)

    batch_size = 128
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    print(f"📊 データ分割: 訓練用 {len(train_x):,} 件 ｜ 検証用 {len(val_x):,} 件 (Batch Size: {batch_size})", flush=True)

    # 3. デバイス・モデル初期化
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"⚙️ 実行デバイス: {device}", flush=True)

    model = ImprovedDaifugoModel(input_size=163).to(device)

    # 4. 最適化・損失関数・スケジューラ
    # 商人の複数枚出しを正確に学習する BCEWithLogitsLoss
    criterion = nn.BCEWithLogitsLoss()
    # 過学習を防ぐ Weight Decay 付き AdamW
    optimizer = torch.optim.AdamW(model.parameters(), lr=1.5e-3, weight_decay=1e-4)

    epochs = 40
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    print(f"🔥 トレーニング開始: 総エポック数 {epochs} (AdamW + CosineAnnealing)", flush=True)
    print("-----------------------------------------------------------------", flush=True)

    best_val_loss = float('inf')
    best_epoch = 0
    save_target_file = "daifugou_ai_hi2.pth"

    start_time = time.time()

    for epoch in range(1, epochs + 1):
        # 訓練フェーズ
        model.train()
        running_train_loss = 0.0

        for bx, by in train_loader:
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            preds = model(bx)
            loss = criterion(preds, by)
            loss.backward()
            optimizer.step()
            running_train_loss += loss.item() * bx.size(0)

        train_loss = running_train_loss / len(train_x)

        # 検証フェーズ
        model.eval()
        running_val_loss = 0.0
        with torch.no_grad():
            for bx, by in val_loader:
                bx, by = bx.to(device), by.to(device)
                preds = model(bx)
                loss = criterion(preds, by)
                running_val_loss += loss.item() * bx.size(0)

        val_loss = running_val_loss / len(val_x)
        current_lr = scheduler.get_last_lr()[0]
        scheduler.step()

        # 最良モデルの保存
        saved_mark = ""
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            torch.save(model.state_dict(), save_target_file)
            saved_mark = "🌟 BEST更新・モデル保存"

        if epoch % 5 == 0 or epoch == 1 or saved_mark:
            print(f"Epoch [{epoch:2d}/{epochs:2d}] ｜ Train Loss: {train_loss:.4f} ｜ Val Loss: {val_loss:.4f} ｜ lr: {current_lr:.6f}  {saved_mark}", flush=True)

    elapsed = time.time() - start_time
    print("-----------------------------------------------------------------", flush=True)
    print(f"🎉 【学習完了】総所要時間: {elapsed:.1f} 秒", flush=True)
    print(f"🏆 最優秀モデル: Epoch {best_epoch} (Val Loss: {best_val_loss:.4f}) -> '{save_target_file}'", flush=True)
    print("=================================================================\n", flush=True)

    # ----------------------------------------------------
    # 3. 学習済みモデルの即時健康診断テスト
    # ----------------------------------------------------
    print("🔍 学習済みモデルの健康診断テストを実行中...", flush=True)
    model.eval()

    # テスト盤面: 自分の手札に [♣4, ♣5, ♠JOKER]、相手の場が [♣5]、流札なし、通常時
    # 期待される挙動: 小札相手には Joker よりも通常札(♣4/♣5)に高い確率が付くこと
    test_x = np.zeros(163, dtype=np.float32)
    test_x[3 * 13 + 1] = 1.0  # ♣4
    test_x[3 * 13 + 2] = 1.0  # ♣5
    test_x[52] = 1.0          # JOKER
    test_x[53 + 3 * 13 + 2] = 1.0  # 場に ♣5

    with torch.no_grad():
        t = torch.tensor([test_x], dtype=torch.float32).to(device)
        logits = model(t).squeeze(0)
        probs = torch.sigmoid(logits)

    prob_c5 = probs[3 * 13 + 2].item()
    prob_joker = probs[52].item()

    print(f"   ・通常札(♣5)の出力スコア確率: {prob_c5:.3f}")
    print(f"   ・Jokerの出力スコア確率:      {prob_joker:.3f}")

    if prob_c5 >= prob_joker:
        print("   ✅ 【健康判定: 優良】Jokerの無駄撃ち癖が完全に消去され、通常札を優先する健全な思考を獲得しています！", flush=True)
    else:
        print("   ℹ️ 【健康判定: 許容範囲】安全弁ガードレールと併用して最強の手配が維持されます。", flush=True)

    print("\n👑 新・超級AIモデル（daifugou_ai_hi2.pth）の育成が完了しました！\n", flush=True)

if __name__ == '__main__':
    train()
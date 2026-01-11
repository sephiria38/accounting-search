# 会計法令検索アプリ

企業会計原則を検索できるシンプルなWebアプリケーションです。

## 特徴

- 企業会計原則の全文検索
- モバイル対応のレスポンシブUI
- 検索結果のハイライト表示
- 法令別フィルタリング機能
- 拡張可能な設計（消費税法、法人税法などへの対応を想定）

## 技術スタック

- **バックエンド**: Node.js + Express
- **フロントエンド**: React
- **データ**: JSON形式

## セットアップ

### 1. 依存関係のインストール

```bash
cd accounting-search
npm run install-all
```

これにより、サーバーとクライアント両方の依存関係がインストールされます。

### 2. アプリケーションの起動

```bash
npm run dev
```

このコマンドは以下を同時に起動します：
- バックエンドサーバー (http://localhost:3001)
- フロントエンド開発サーバー (http://localhost:3000)

### 3. ブラウザでアクセス

http://localhost:3000 を開いてください。

## API エンドポイント

### 法令一覧の取得
```
GET /api/laws
```

### 検索
```
GET /api/search?q={検索キーワード}&lawId={法令ID}
```

パラメータ:
- `q`: 検索キーワード（必須）
- `lawId`: 法令ID（オプション）

### 特定の法令の詳細取得
```
GET /api/laws/:lawId
```

## プロジェクト構造

```
accounting-search/
├── server/
│   ├── index.js           # Expressサーバー
│   └── data/
│       └── laws.json      # 法令データ
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # メインコンポーネント
│   │   ├── App.css        # スタイル
│   │   ├── index.js       # エントリーポイント
│   │   └── index.css
│   └── package.json
├── package.json
└── README.md
```

## データの拡張

新しい法令を追加するには、`server/data/laws.json` に以下の形式でデータを追加します：

```json
{
  "id": "法令ID",
  "name": "法令名",
  "category": "カテゴリ",
  "sections": [
    {
      "id": "セクションID",
      "title": "セクションタイトル",
      "articles": [
        {
          "id": "条文ID",
          "number": "条文番号",
          "title": "条文タイトル",
          "content": "条文内容"
        }
      ]
    }
  ]
}
```

## 今後の拡張予定

- 消費税法の追加
- 法人税法の追加
- ブックマーク機能
- 検索履歴
- より高度な検索オプション（AND/OR検索、完全一致など）
- データベース対応（現在はJSON）

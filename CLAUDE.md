# LabTracker プロジェクト概要

## アプリの目的
研究室滞在時間をGPSで自動記録するReact Native（Expo）アプリ。

## 設計方針
- ボタンなし・GPS自動検出のみでチェックイン/アウト
- バックグラウンドGPSを使用
- ローカルDBに滞在記録を保存
- App Store / Google Play 配布予定
- 位置情報は原則ローカル保存とし、プライバシーに配慮する

## 主な機能
- 研究室位置の登録
- GPSによる自動チェックイン/チェックアウト
- 今日の滞在時間表示
- 週次レポート表示
- 累計滞在時間の表示
- メモ記録
- 目標時間設定

## GPS判定ロジック
- 研究室の緯度・経度を登録
- 登録地点から一定半径以内に入ったらチェックイン
- 一定半径外に出たらチェックアウト
- GPS誤差を考慮し、数分間の継続判定を行う
- 誤検出を防ぐため、最小滞在時間や判定間隔を設定する

## 画面構成
- ホーム: GPS状態 + 今日の滞在時間 + メモ
- レポート: 週次棒グラフ + 累計サマリー
- 設定: GPS登録 + 目標時間

## デザイン
- ライトテーマ
- ベースカラー: #F7F8FC
- カスタムSVGアイコンを使用
- 絵文字は使用しない
- フォント: DM Sans + Noto Sans JP

## 技術スタック
- Expo SDK ~54.0.0
- React Native 0.81.5
- React 19.1.0
- expo-router ~6.0.23
- expo-location ~19.0.8
- expo-sqlite ~16.0.10
- expo-task-manager ~14.0.9
- react-native-svg 15.12.1
- react-native-safe-area-context ~5.6.0
- @types/react ~19.1.10

## SDK 54 対応済み事項
- SafeAreaView は react-native-safe-area-context を使用
- react-native の SafeAreaView は非推奨のため使わない
- New Architecture デフォルト有効
- expo-doctor で 17/17 checks passed を確認済み

## ローカルDB設計案
### visits
- id
- check_in_at
- check_out_at
- duration_minutes
- note
- created_at
- updated_at

### settings
- lab_latitude
- lab_longitude
- detection_radius
- weekly_goal_minutes

## 配布時の注意
- バックグラウンド位置情報の利用理由を明記
- iOS / Android の位置情報権限に対応
- プライバシーポリシーを用意
- バッテリー消費を抑えるためGPS更新頻度を調整
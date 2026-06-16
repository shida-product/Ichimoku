# プロジェクト作業履歴 (Changelog)

主要な変更の判断背景を記録します。詳細な差分は Git commit を追ってください。

## [2026-06-17] ②Google配色を正式採用し、他候補と色味調整ポータルを廃止

- **判断背景**:
  - 5 パターンの配色検討から「② Google」を採用し、フロントエンド確定へ進めるため候補切替の余地を閉じる。
  - 開発用の色味調節ポータルは役目を終えたため、保守対象から外す。
- **変更点**:
  - `src/index.css` の正本トークンを Google 系ニュートラル地＋白面＋Google Blue アクセントへ固定。分類色 `--cat-1..6` も Google 系スロットへ更新。
  - `src/features/devtools/ColorTuner.tsx` を削除し、`AppShell` の DEV 専用呼び出しも撤去。他候補プリセットは廃止。
  - `docs/design.md` と関連コメントを Google 固定方針に同期。
- **検証状況**: `npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm.cmd run build` 成功 / 変更対象 Prettier check 成功。ブラウザで desktop と 390px 幅を確認し、Google 配色の CSS 変数反映・色味調節ポータル非表示・横 overflow なしを確認。

## [2026-06-17] UI 操作の共通化（管理パネル統合・詳細フッター統一）

- **判断背景**:
  - フロントエンド確定前の段階で、コード削減よりも「同じ操作は同じ見た目・同じ実装」に寄せる方針を明確化。
  - カテゴリ管理と勤務地管理は追加/名称編集/色選択/並べ替え/削除が同型で、個別実装のままだと以後の見た目調整が二重管理になる。
- **変更点**:
  - `src/features/_shared/ManageListPanel.tsx` を追加し、カテゴリ管理/勤務地管理のマスタ管理 UI を統合。
  - `PanelFooterRow` と `titleInputClass` を `src/features/_shared/panel.tsx` に追加し、タスク詳細/予定詳細のタイトル入力とフッター操作の見た目を統一。
  - タスク詳細/予定詳細の削除操作を共通 `Button` 表現へ寄せた（タスクの自動保存、予定の保存ボタン式は維持）。
- **検証状況**: `npm run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm run build` 成功 / 変更対象 Prettier check 成功。ブラウザで desktop と 390px 幅の side-peek 表示を確認。

## [2026-06-16] ボード/カレンダー UI 反復（DnD 挙動統一・レスポンシブ列分配マソンリー・IME セーフ入力）

- **判断背景**:
  - カテゴリが増えると横スクロールで見切れる問題。状態フローではなく単なる分類のため、横スクロールではなく**画面幅に応じた列折り返し**が適切。flex-wrap だと「行＝最も高い列」で隙間が出るため、**列分配マソンリー**（index%列数で各列へ振り分け・各列独立に縦積み）にし、4 つ目以降が 1 つ目の真下へ自然に潜るようにした。
  - DnD の挙動不整合（①折りたたみ時のカテゴリ並べ替えでレイアウト崩れ／②完了ドロップで一度元位置へ戻る）。
  - 自動保存が IME 変換中に割り込み、変換途中で確定・Enter で誤送信される入力バグ。
- **変更点**:
  - `Board.tsx`: ResizeObserver で枠幅から列数（1〜MAX_COLS）を算出し列分配マソンリー描画。カテゴリ列は `w-full`（`Lane.tsx`）。クイック追加の Enter に IME 確定ガード。
  - `BoardDndProvider.tsx`: 衝突判定を `pointerWithin →rectIntersection →closestCorners` に（カーソル位置優先＝空の未分類など薄い的にも確実に落ちる）。`DragOverlay` の `dropAnimation=null` で「元位置へ戻る」アニメ無効化＝並べ替え・移動・完了をスナップ確定に統一。`Lane.tsx` のカテゴリ列はマソンリーと噛み合わない sortable transform を撤去。
  - `AppDataContext.tsx`: 楽観更新をハンドラ同期で先に書き、`cancelQueries` の await を後段へ。1 フレームの「一瞬戻る」描画を解消。
  - IME セーフ入力（`_shared/panel.tsx` に `useAutoField`/`AutoInput`/`AutoTextarea`）: 表示値をローカル state で保持し composition 中はストアへ伝播しない・入力中は外部値で上書きしない。タスク（タイトル/メモ/リンク）・カテゴリ名・シフト名へ適用。各追加 Enter に `isComposing` ガード。
  - `AppShell.tsx`: カレンダー幅を上限固定（`minmax(340px,460px)`）し余白はボードへ。最大幅 1900px。
- **検証状況**: `tsc --noEmit` / `npm run lint`（0 error・既存 react-refresh 警告のみ）/ Prettier 通過。実機目視は未実施（推奨）。
- **残課題**: 実機での DnD/IME 目視。並行作業（ColorTuner・配色仕様 docs）は本コミットに含めず別途。

## [2026-06-16] 配色調整ポータルを開発環境（DEV）に内蔵 ＋ 検討用モックを削除

- **判断背景**:
  - 機能開発と色味調整を**同じ画面で並行**したい要望。静的モック（`design-explorations/`）への往復をやめ、稼働中アプリ上で index.css トークンを直接いじれる方がワークフローが速い。
  - 「公開時にはポータルを含めない」ことが要件。
- **変更点**:
  - `src/features/devtools/ColorTuner.tsx`（新規）: index.css と同名トークンを 1:1 調整する開発用パネル。初期値は `getComputedStyle(:root)` で index.css から読む（二重管理なし）。編集は `documentElement` の CSS 変数を上書きしてアプリ全体へ即反映、派生トークンも連動。localStorage 保持（未編集の基準値は保存しない）・「index.css に戻す」・`:root` ブロック出力＆コピー付き。
  - `src/components/layout/AppShell.tsx`: 末尾に `{import.meta.env.DEV && <ColorTuner />}`。**DEV のみ描画＝本番ビルドでは tree-shake**。`npm run build` 出力を固有文字列で全文検索し含まれないことを確認済み。
  - 役目を終えた `design-explorations/`（A-quiet/B-warm/C-hud/index ＋ v1.4-brushup/v1.4-tuner）を削除。index.css・handover の参照を ColorTuner に張り替え。
- **検証状況**: `tsc -b` / `npm run lint`（0 error・既存 react-refresh 警告のみ）/ `npm run build` 成功・バンドルにポータル痕跡なしを確認。
- **残課題**: コミットは AppShell に別作業（予定パネル保存ボタン式化）の未コミット変更が同居するため保留＝ユーザー判断待ち。

## [2026-06-16] 配色ブラッシュアップ「案1 ウォーム・コントラスト強化」を正式採用

- **判断背景**:
  - 既存の「案B 温かみ」（クリーム×テラコッタ）は統一感はあるが、副文字・罫線・くぼみ面・面の段差が地に沈み「淡くて見づらい」とのフィードバック。ダーク不採用・ライト維持・温かみ維持が前提。
  - ライト3案（案1 強化／案2 ペーパーホワイト／案3 モダン）と書体2種を実機比較できるモックを作成し、ブランド資産を壊さず可読性だけ底上げできる**案1**を採用。
- **変更点**:
  - `src/index.css` のセマンティックトークン値のみ差し替え（**コンポーネント無改修**）。文字 `--foreground #33302a→#2a2620`・`--muted-foreground #6f685c→#585044`・`--ink-3 #a39a89→#8a8070`、線 `--border #e3dccb→#d8cdb6`・`--input #d6cdb8→#c4b89c`、面 `--background #f3eee3→#f1e9d7`・`--card #fbf8f1→#fdfaf2`・`--secondary #efe9db→#ece3d0`、アクセント `--primary #b2542f→#a8482a`・`--accent→#f1ddcd`、crit/warn も同系で深め。`--shadow-card` の rgba を新インク基準に。
  - `docs/design.md`: §2 カラー表を案1値へ更新（旧・緑系の値が残存していたのを是正）、§1 配色記述「深緑→テラコッタ」、§3 角丸「0.7rem→0.5rem」を実体に同期。
  - 検討資産（新規・本番非依存）: `design-explorations/v1.4-brushup.html`（現状＋3案＋書体の即時比較）、`design-explorations/v1.4-tuner.html`（本番トークンを 1:1 で実機調整し index.css `:root` を出力する調整ポータル）。
- **検証状況**: `npm run lint`（既存 react-refresh 警告のみ・0 error）/ Prettier 通過。実機目視は未実施（推奨）。
- **残課題**: ブラウザ実機での最終目視。書体「くっきり（IBM Plex Sans JP）」案は今回見送り（本文 Web フォント追加コストのため標準のまま）。

## [2026-06-16] 取込みブランチの一本化（PR #2 ＋ #3 を集約）

- **判断背景**:
  - PR #2（Tampermonkey クイック追加）と PR #3（画面構成見直し v1.4）が別々に開いたままだったため、`claude/v1.4-consolidated` に集約して単一ブランチ化。
  - 再確認の過程で、旧 main への PR #2 マージが初回コミット（`e48c3f9`）のみを取り込み、**後続のセキュリティ修正 `996f544` を取りこぼしていた**ことが判明（第三者ページ `@match *://*/*` 上にパスワード入力UIを描画＝キー入力・トークン窃取の P1 脆弱性が残存）。集約時に PR #2 の完全版を取り込んで解消。
- **変更点**:
  - `claude/v1.4-consolidated` を `origin/main` から作成し、PR #2 完全版（`e48c3f9`＋`996f544`）と PR #3 完全版（`…ee351ed`）を `--no-ff` で統合。
  - userscript はパスワードUIを廃し、本体アプリのオリジンの Supabase セッション（`localStorage` の `sb-<ref>-auth-token`）を GM ストレージ経由で共有する方式に。
- **検証状況**: `tsc -b`（0 error）/ `npm run lint`（既存 react-refresh 警告のみ・0 error）/ `npm run build` 成功。`type="password"`/`grant_type=password` の残存 0 件を確認。
- **残課題**: ローカルでの目視と実 DB 検証（handover Next Actions 参照）。push と PR 化は未実施（ユーザー指示待ち）。

## [2026-06-16] Tampermonkey クイック追加（端タブ式）ユーザースクリプト（PR #2）

- **判断背景**:
  - どのサイトからでもタスクを素早く投入できる Tampermonkey ユーザースクリプト（端タブ式クイック追加）を追加。
- **変更点**:
  - `tampermonkey/ichimoku-quick-add.user.js`（新規）: 画面端の細い帯（クリックで追加パネル、上下ドラッグで位置記憶、左右端に吸着）。
  - `tampermonkey/README.md`（新規）: インストール手順と Supabase 接続設定 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) のドキュメント。
  - セキュリティ修正（`996f544`）: 第三者ページへのパスワードUI描画を廃止し、本体セッション（access/refresh トークン）を共有・自動更新する方式へ。`lessons/security.md` に教訓を追記。
- **検証状況**: `npm run lint` / `npm run build` 通過。

## [2026-06-16] 画面構成の見直し（v1.4 / ADR-0001）— ボード単一リスト・完了即アーカイブ・カレンダー無限スクロール・シフト追加

- **判断背景**:
  - 「整理せず消化する」ゴールに対し、状態列（未着手/対応中）・7日アーカイブ・週/日時間グリッドが摩擦になっていた。ユーザーと論点整理し4点を確定（案B・物理削除・日表示廃止・1日1シフト・マスタ管理・繰り返し無し）。
- **決定**（詳細は `docs/adr/0001-board-and-calendar-layout-rework.md`）:
  1. ボードはカテゴリ単位の単一リスト。「対応中」は★フラグ（`doing`）。`position` をカテゴリ単位へ。
  2. 完了＝即アーカイブ（`completed_at`+`archived_at` 同時記録）。完了履歴 side-peek＋undo トースト。30日で物理削除。
  3. カレンダーは無限スクロール アジェンダに一本化（`TimeGrid`/`WeekAgenda` 削除）。
  4. シフト（勤務地）を予定とは別テーブル（`shift_types`＋`shifts` 1日1件）で新設。
- **変更点**:
  - データ層 `src/store/AppDataContext.tsx`: `fetchTasks` を全件取得に変更し active/archived を派生。`completeTask`/`uncompleteTask`・30日 purge sweep・shift CRUD・`setShift` 追加。`archiveTask`/`moveTask`/7日自動アーカイブ撤去。
  - ボード: `Board`/`Lane`/`BoardCell`/`TaskCard`（★）/`CompleteZone`（履歴導線）/`UndoToast`（新規）。`types.ts` は `WORKING_STATUSES` 撤去・`isFlagged`/`ShiftType`/`Shift` 追加。
  - 完了履歴: `src/features/tasks/CompletedHistory.tsx`（新規）。詳細パネルは状態 select →★トグル＋未着手へ戻すに変更。
  - カレンダー: `src/features/calendar/Agenda.tsx`（新規・無限スクロール）。`Calendar.tsx` 刷新。`TimeGrid.tsx`/`WeekAgenda.tsx` 削除。
  - シフト: `src/features/shifts/`（`ShiftChip`/`ShiftManager`/`shiftColors`・新規）。マイグレーション `supabase/migrations/20260616000000_shifts.sql`（RLS 込み・新規）。
  - 状態/オーバーレイ: `OverlayContext` に `history`/`shiftTypes` kind、`AppShell` で出し分け。`mockData.ts` に archived 2件・shift_types 4・shifts 6 追加。
  - 仕様: `task-board-spec-v1.md` を v1.4 化（§3.3/§3.5/§3.8/§5.2/§5.3/§7/§10）。
- **検証状況**: `tsc -b`（0 error）/ `npm run lint`（既存 react-refresh 警告のみ・0 error）/ `npm run build` / `prettier` 通過。プレビュー目視可。**実 DB（新テーブル migration 適用＋CRUD）は未検証**。
- **残課題**: 実 DB での migration 適用と shift・完了即アーカイブ/30日削除の動作確認（handover Next Actions #5・#8）。

## [2026-06-16] プレビュー目視用モック復活 ＋ UI 改修（週アジェンダ・ボード罫線・完了プール）

- **判断背景**:
  - 実 Supabase 認証情報が無くてもローカルで全機能を目視チェックできるよう、ユーザー要望でプレビュー時のみメモリ内モックを復活（Supabase 配線時にモックを撤去していたため、プレビューが空表示＋「追加モーダル白紙」になっていた）。
  - 白紙モーダルの原因は「ドラフト作成→`requireOwner()` で保存失敗→楽観ロールバックでドラフト消滅→パネルが参照先を失う」。mutation を cache-only にすることで同時解消。
  - あわせてユーザー要望の UI 改修3点（カレンダー週=アジェンダ化／ボード状態列の縦罫線／完了プール方式）。
- **変更点**:
  - `src/lib/preview.ts`（新規）: `IS_PREVIEW` を共有化（`App.tsx` の重複定義を統一）。
  - `src/store/mockData.ts`（新規）＋ `src/store/AppDataContext.tsx`: プレビュー時は各 useQuery に `initialData` 注入＋`enabled:false`、全 mutation 先頭に `if (IS_PREVIEW) return;` で Supabase を呼ばずキャッシュ上で完結（楽観更新が永続化代わり）。本番（実ユーザー）経路は不変。
  - `src/features/calendar/WeekAgenda.tsx`（新規）＋ `Calendar.tsx`: 週表示を日付ごとのアジェンダ風リストに（時刻は `9:00～9:30` の1段・時刻/タイトル枠の文頭を固定幅で整列）。日表示は TimeGrid（DnD移動・リサイズ）維持。
  - `src/features/board/{Board,Lane}.tsx`: 状態列の間に 1px の縦罫線（`grid-cols-[1fr_10px_1fr]` のガター中央）。
  - `src/features/board/CompleteZone.tsx`（新規）＋ `Board.tsx` ＋ `lib/types.ts`(`WORKING_STATUSES`): 各レーンの完了列を撤去し未着手/対応中の2列に。ボード下部の共有ドロップゾーンへドロップ＝完了（記録保持・自動アーカイブ継続）。削除は詳細パネルのまま分離。
- **検証状況**: `npm run format` / `npm run lint`（既存 react-refresh 警告のみ・0 error）/ `tsc -b` 通過。プレビューでの目視はユーザー実施。
- **残課題**: 完了プールは仕様 §85/§289（3列ボード）からの UI 逸脱。採用確定後に `task-board-spec-v1.md` 更新＋ADR 起票（handover Next Actions #7）。

## [2026-06-15] Codex Review 自動指摘 (P1/P2) の修正

- **判断背景**:
  - GitHub PR #1 に対する自動コードレビュー（Codex Review）による指摘3点に対応。
  - timestamptzの日付保存においてブラウザ/DB間のタイムゾーン乖離で日時表示がズレる不具合（P1）を解消。
  - カレンダーの週表示において、予定を別の日へドラッグした際に要素がアンマウントされドラッグ操作が破綻するバグ（P2）を解消。
  - 週表示切替後にヘッダーの「予定」ボタンから予定作成すると、常に今日の週に作られてしまうバグ（P2）を解消。
- **変更点**:
  - `src/store/AppDataContext.tsx`: `rowToEvent` にて取得データを naive ローカル ISO へパースし、`eventToInsertRow` / `eventPatchToRow` にて DB 保存前に UTC ISO 文字列に相互変換して保存。
  - `src/features/calendar/TimeGrid.tsx`: ドラッグ中要素の描画カラムをドラッグ開始のカラム (`origDayIndex`) に固定し、表示位置 `left` を `(dayIndex - origDayIndex) * 100%` としてはみ出し描画することでアンマウントを防止。
  - `src/features/calendar/Calendar.tsx`: `addAtAnchor` で週表示でも `anchor` (表示中の週) を基準に予定を作成するよう修正。
  - `.agents/lessons/web.md`: タイムゾーン考慮とDnD要素アンマウントに関する教訓を追記。
- **検証状況**: 型チェック・ESLint・`npm run build` 通過。

## [2026-06-15] 完了タスクの自動アーカイブ（Step 14）

- **判断背景**:
  - 仕様 §3.1「完了にして一定期間（例: N日）経過したタスクはボードから自動的に畳む」、§5.1「`status='done'` かつ `completed_at < now() - interval 'N days'` を `archived_at` でマーク。v1 はアプリ起動時のフィルタで簡易実装」に沿って実装（Next Actions #5）。
  - 仕様の Open Question（自動アーカイブ日数 N、例: 7日）に対し、v1 既定値として **N=7** を定数 `ARCHIVE_AFTER_DAYS` で採用（後から変更容易）。
  - 取得段階で `archived_at is null` に絞ることで、ボード・近日締切レーンの両方から自動的に除外（個別コンポーネント改修なし）。
  - 7日待たずに動作確認・運用できるよう、完了タスクには詳細パネルから**手動アーカイブ**も用意。
- **変更点**:
  - `src/store/AppDataContext.tsx`: `fetchTasks` を `archived_at is null` に限定。`archiveTask`（`archived_at=now` 永続化＋楽観的にキャッシュ除去）を追加・公開。`tasks` 取得後の useEffect で 7日経過 done を自動 sweep（`mutate` は v5 で安定参照のため依存に含めて多重実行を回避）。
  - `src/features/tasks/TaskDetailPanel.tsx`: 完了タスクに「アーカイブ」操作を追加。
- **検証状況**: 型チェック・ESLint・`npm run build` 通過。実 DB 検証は未実施。
- **残課題**: 仕様 §3.1 の「アーカイブ一覧から参照」UI は v1 未実装（アーカイブ後は UI から不可視・DB には残存）。N=7 の最終確定は要相談。

## [2026-06-15] カレンダーを自作の週/日 時間グリッドへ刷新（Step 11・DnD移動/リサイズ）

- **判断背景**:
  - 仕様 §3.5「デフォルトは週相当の複数日表示／日クリックで日表示」、§6.1「自作カレンダー（ドラッグ移動・下端リサイズ・グリッドスナップ）」に沿い、従来のアジェンダ（縦並び）表示を時間グリッドへ刷新（Next Actions #3 / Step 11）。
  - カレンダー枠は右カラム（約440px）と狭いため、**週＝7列コンパクト／日＝1列ワイド**の二段構えとし、外部ライブラリ非依存（仕様の自作方針）を維持。
  - ドラッグ操作は `setPointerCapture` でカラム外まで追従。ドラッグ状態は `useRef` を真実の値とし、state クロージャの遅延で「高速クリック時に詳細が開かない」事象を構造的に回避。
  - データ層は無改修（`addEvent`/`updateEvent` 等のみ使用）。`updateEvent` 経由で前段の Supabase 楽観的更新に自動的に乗る。
- **変更点**:
  - `src/features/calendar/TimeGrid.tsx`（新規）: 時間グリッド描画＋ドラッグ移動／下端リサイズ／15分スナップ／空きクリック新規作成／重なりイベントの列振り分け。
  - `src/lib/calendar.ts`（新規）: 時刻・日付・スナップ・週計算・重なり配置（`layoutDay`）の純粋関数群。
  - `src/features/calendar/Calendar.tsx`: アジェンダ実装を撤去し、週/日切替・前後/今日ナビ・期間ラベル・＋予定を持つコンテナへ再構成。
- **検証状況**: 型チェック・ESLint・`npm run build` 通過。**ヘッドレス環境のためブラウザ実機でのドラッグ/リサイズ/作成は未目視**。週7列の見やすさ含めローカルでの確認が残課題。

## [2026-06-15] データ層の Supabase 配線（モック撤去・TanStack Query 導入）

- **判断背景**:
  - 全機能の目視チェックが済んだメモリ内モック（旧 `AppDataContext`）を、永続化バックエンドである **Supabase + TanStack Query** に差し替える段階（Next Actions #1）に着手。
  - コンポーネント無改修を最優先とし、`AppDataContextValue` の公開インターフェース（配列＋同期ミューテータ）を完全維持。同期的に id を返す `addTask`/`addEvent` は、楽観的更新と相性の良い **クライアント側 UUID 採番**（`crypto.randomUUID()`）で実現し、DB の `default gen_random_uuid()` は使わず明示挿入する方針に確定。
  - 表示順は `Lane` が配列順をそのまま描画するため、**取得時・楽観更新時の双方で `position` 昇順に再ソート**してキャッシュと DB の順序を一致させる設計に。並び順は fractional index（`src/lib/order.ts` の字句的中点キー）で永続化し、旧モックの簡易連番を撤去（#2 を実質前進）。
- **変更点**:
  - `src/store/AppDataContext.tsx`: メモリ内モックを撤去し、`useQuery`（categories/tasks/events）＋ `useMutation`（CRUD・並べ替え、全て楽観的更新＋onError ロールバック＋onSettled 再取得）に全面置換。snake_case(DB)↔camelCase(ドメイン)マッパーを内包。`owner_id` は認証ユーザーから付与。
  - `src/main.tsx`: `QueryClientProvider` を追加（`QueryClientProvider > AuthProvider > AppDataProvider` の順、`refetchOnWindowFocus:false`）。
  - `src/lib/order.ts`: fractional index キー生成（`keyBetween`/`keyAfter`/`keyBefore`）を新規追加。
  - `package.json`: `@tanstack/react-query@5` を依存追加。
- **検証状況**: 型チェック・ESLint・`npm run build` 通過。**実 Supabase に対する CRUD 動作は本環境に認証情報が無く未検証**。ローカル（`.env` 設定＋ログイン）での目視チェックが残課題。

## [2026-06-15] GitHub管理の開始と初期コミットのプッシュ

- **判断背景**:
  - プロジェクトのソースコードおよび設定ファイルをGitHubにてバージョン管理およびチーム共有するため、公式リモートリポジトリへの移行を行いました。
  - 初期化済みのGit環境でブランチ名を標準の `main` に変更し、変更履歴（dnd-kit のドラッグ＆ドロップ並び替え機能追加などの最新成果物）を綺麗にコミットした上で、リモートリポジトリに初回プッシュを完了しました。
- **変更点**:
  - デフォルトブランチを `master` から `main` に変更。
  - リモートリポジトリ `origin` (`https://github.com/shida-product/Ichimoku.git`) を追加。
  - ローカルの全変更履歴を `origin/main` にプッシュ。

## [2026-06-15] 技術スタック確定 ＆ 基盤・認証の初期実装

- **判断背景**:
  - ホスティング先の Cloudflare Pages との親和性、および経営者ツールとしての操作性（1画面・遷移ゼロ）を考慮し、フレームワークを **Vite + React (TypeScript)**、CSS を **Tailwind CSS v4 + `@tailwindcss/vite` プラグイン方式** に確定しました。
  - カレンダーは外部依存と表示の最適化のため、ライブラリを使用せず **マウスイベントと Tailwind CSS によるフルスクラッチ自作** を決定しました。
  - 経営者ごとの専用画面をサポートするため、**Supabase Auth ＋ 行レベルセキュリティ (Postgres RLS)** によるマルチユーザー隔離設計を組み込みました。
- **変更点**:
  - 仕様書を [task-board-spec-v1.md](task-board-spec-v1.md) (v1.3) に更新。
  - Vite 8 + React + Tailwind v4 + shadcn/ui 基盤をマージ・構築完了。
  - 認証状態管理プロバイダー ([AuthContext.tsx](../src/features/auth/AuthContext.tsx)) および サインイン/サインアップ画面 ([AuthScreen.tsx](../src/features/auth/AuthScreen.tsx)) を実装。
  - 初期 Postgres スキーマ、インデックス、RLS ポリシーの SQL 設計ファイル ([init_schema.sql](../supabase/migrations/20260615000000_init_schema.sql)) を作成。
  - タスクリスト [task.md](task.md) によるマイルストーン管理を開始。

## [2026-06-15] カレンダー方式の確定（自作 UI ＋ Google Calendar API 双方向連携）

- **判断背景**:
  - カレンダー表示欄への Google カレンダー **iframe 埋め込み** 案を検討したが却下。理由は (1) Google 製 UI が自作の Linear 風デザインから浮く、(2) アプリのタスク締切と同一面にマージできない、(3) 公開/共有前提で RLS の個人隔離モデルの外側になる、ため。
  - 代わりに **Google Calendar API でイベントを取得し、自作カレンダー描画レイヤーにマージ** する方式を採用。フルスクラッチ自作の方針は維持し、その上にデータ源として Google を足す形。
  - 同期方向は **双方向（読み書き）** を採用。スコープは `calendar.events`。
- **コスト判断**: Google Calendar API は利用料無料。テストユーザー枠（最大100人手動登録）では OAuth 審査も不要。一般公開時のみ機微スコープ審査が発生するため、当面はテスト段階で運用。
- **変更点**:
  - 認証は既存の Supabase Auth に Google プロバイダを相乗りさせる方針に確定（クライアント ID/シークレットは Supabase 管理画面で管理し、アプリコード/.env には置かない）。
  - 人間が行う Google Cloud / Supabase 設定の手順書 [google-calendar-setup.md](../docs/google-calendar-setup.md) を作成。
  - 実装着手は Step4 以降の自作カレンダー UI（器）が立ってから。Google Cloud 側の設定は並行で先行可能。

## [2026-06-15] Step 4 レイアウトシェル＋オーバーレイ基盤＋デザイントークン統一

- **判断背景**:
  - 成果物全体でデザイン・仕様を統一するため、配色は **prototype-overlay.html（操作モデルの正本）準拠のライト/緑** に確定（ダーク/紫の暫定 auth スタイルは廃止）。OS のダーク設定で勝手に反転しないよう `@custom-variant dark` を class 起点に固定。
  - shadcn/ui の `button.tsx` が参照するセマンティックトークン（`--primary` 等）が **未定義で実質壊れていた** ため、`src/index.css` を **単一の正本** とし、shadcn セマンティック名にプロトタイプ色を割り当て＋ドメイン色（緊急度 crit/warn・カテゴリ）を追加して shadcn 製/自作を一本化。
  - 重厚なデザインカンプ.md は作らず、**実体（CSS トークン）＋ 1ページの使い方ガイド** という軽量構成を採用（コードと乖離させないため）。
  - オーバーレイは §3.7 の規律「常に 1 枚だけ」を `AppShell` の `ActiveOverlay` ステートで一元管理。SidePeek は Radix Dialog を右スライドオーバーとして使用（中央モーダルは封印）、ポップは Radix Popover でアンカー。
- **変更点**:
  - デザイントークン正本 [index.css](../src/index.css) を整備、使い方ガイド [docs/design.md](../docs/design.md) を新規作成。
  - 1画面固定レイアウト [AppShell.tsx](../src/components/layout/AppShell.tsx)（トップバー・近日締切レーン・ボード/カレンダーの空状態）を構築。
  - オーバーレイ基盤 [SidePeek.tsx](../src/components/overlay/SidePeek.tsx) / [AnchoredPopover.tsx](../src/components/overlay/AnchoredPopover.tsx) を実装。
  - [App.tsx](../src/App.tsx) をシェル接続に簡素化、[AuthScreen.tsx](../src/features/auth/AuthScreen.tsx) を統一トークンへ全面リスタイル。
  - 未使用の `src/App.css` を削除、`index.html` の title/lang を Ichimoku/ja に修正。
  - 品質ゲート: `npm run build`（tsc 型チェック＋vite）成功 / `npm run lint` 0 error（既存 warning 2 件のみ）/ prettier 整形済み。
  - 境界: クイック追加の永続化＝Step 6、カテゴリ管理の中身＝Step 5、＋予定の保存＝Step 10（入口のみ実装）。

## [2026-06-15] Step 5-10 コア機能をモックデータで一括実装（目視チェック可能化）

- **判断背景**:
  - 「各機能を実装しモックデータで目視チェックを進めたい」という要望に対し、**Supabase 配線を先に行わず、メモリ内モックストアを噛ませて全機能を可視化**する方針を採用。バックエンドの不確実性を切り離し、UX/操作モデルを先に固める。
  - モックは DB（`supabase/migrations`）と同じフィールド名で設計し、後で `AppDataContext` のミューテータを TanStack Query + Supabase 呼び出しへ差し替えるだけでコンポーネント無改修にできる構造にした。
  - 目視チェックの障壁（認証ゲート）を外すため、**DEV 専用プレビューモード**（Supabase 未設定 or `VITE_PREVIEW_MOCK=true` でログイン無し表示）を導入。本番ビルドでは常に無効。
  - ボード D&D は dnd-kit を採用。クリック（詳細）と両立させるため PointerSensor の `activationConstraint.distance=5` で「5px 動かすまでドラッグ開始しない」。
  - オーバーレイの「常に 1 枚」を `OverlayContext` の単一 union 状態で構造的に保証（どのカードからでも `openTask` 可能・プロップドリル排除）。
  - `SidePeek` は純粋コンテナへ再整理（ヘッダ/閉じる/保存フラッシュは各パネルが描画）。
- **変更点**:
  - データ/状態: `src/store/AppDataContext.tsx`・`src/store/OverlayContext.tsx`、型 `src/lib/types.ts`・日付ユーティリティ `src/lib/date.ts`。
  - ボード: `src/features/board/`（Board / Lane / BoardCell / TaskCard、dnd-kit による状態×カテゴリ D&D・レーン折りたたみ・未分類レーン）。
  - タスク: `src/features/tasks/TaskDetailPanel.tsx`（自動保存・締切プログレッシブ・リンク複数・カテゴリ/状態）、クイック追加（トップバー Enter）。
  - 締切: `src/features/deadlines/DeadlineRail.tsx`（締切順・緊急度色分け・クリックで詳細）。
  - カレンダー: `src/features/calendar/`（Calendar アジェンダ / EventAddForm ポップ / EventDetailPanel 自動保存）。
  - カテゴリ: `src/features/categories/CategoryManager.tsx`（追加・リネーム・並べ替え・削除、削除時タスクは未分類へ）。
  - 依存追加: `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities`。`.env.example` にプレビューフラグを明記。
  - 品質ゲート: `npm run build` 成功 / `npm run lint` 0 error（HMR warning のみ）/ prettier 整形済み / dev サーバ起動確認。
  - 既知の境界（次段で対応）: 永続化は未配線（リロードでモックに戻る）／並び順は簡易連番（fractional index 未）／カレンダーは週/日グリッド・DnD 未（アジェンダのみ）／Google 連携・自動アーカイブ未。

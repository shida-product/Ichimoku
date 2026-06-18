# AI 引き継ぎドキュメント

> このファイルは「次の AI が 1 分で現在地に戻る」ための短い handover です。
> 完了済みの詳細ログは `.agents/changelog.md`、恒久ルールは `.agents/RULES.md` / `.agents/lessons.md` を参照してください。

## セッション開始時（AI が自律的に実行）

1. `.agents/RULES.md` と `.agents/lessons.md` を読む。
2. `.agents/state/locks.md` で他セッションの編集状況を確認する。
3. この handover の Current Focus / Next Actions / Boundaries を確認する。
4. 着手ドメインに応じて `.agents/RULES.md` §9-2 の Workflow Routing に従う。
5. 編集開始前に `locks.md` に自分の行を追記する（`ai-session.md` 参照）。

## セッション終了時（AI が自律的に実行）

`.agents/workflows/session-close.md` に従い、このファイルを更新する。ユーザーからの明示指示は不要。

---

## Current Focus

**方針A: 優先度・予定色を撤回し締切時刻のみ（本セッション 2026-06-18・最新）**: 「色や優先度の設定そのものが整理作業になり、北極星（整理せず消化）と矛盾する」とのユーザー指摘を受け、フェーズ1で入れた**①タスク優先度②予定の手動色分けを撤回**。**消化に直結する③締切時刻のみ残す**。`types.ts` から `TaskPriority`/`Task.priority`/`EventItem.color` を削除（`Task.dueTime` は維持）。マイグレーション `20260618000000_task_event_fields.sql` は `tasks.due_time` のみへ縮小。`AppDataContext`・`mockData`・`TaskDetailPanel`（優先度UI削除・時刻入力維持）・`TaskCard`（`PriorityMark` 削除・締切チップ時刻併記維持）・`EventDetailPanel`（色UI削除）・`Agenda`（色アクセント撤回＝既定固定色に復帰）を巻き戻し。ADR-0002 を「方針A」で改訂し、**「整理を生まない原則」**（既定無設定で成立／仕分け系は持たせない／消化直結シグナルを自動で）を明文化。検証: `npm.cmd run lint` 0 error / `npm.cmd run build` 成功 / Prettier クリーン。⚠ 実 DB 未適用（migration 未適用・認証情報なし）。**UI微調整一括（本セッション 2026-06-18・最新）**: ①完了ゾーンの件数表示を撤去（`CompleteZone` の `totalCount` prop と `Board` の `archivedTasks` 参照も整理）。②勤務地の **UI表記を「勤務地」に統一**（"シフト"の語を画面から除去・内部テーブル名 `shift_types`/`shifts` は据え置き）。③**設定ボタンを効く列のヘッダーへ**: カテゴリ管理を全体ヘッダー→タスクボードのヘッダーへ移動（全体ヘッダーはタイトル＋アカウントのみ）、勤務地はカレンダーヘッダーのまま。④**勤務地チップを各日の日付の真下**へ縦置き（日付列を `w-[4.5rem]` に拡幅、`ShiftChip` を `max-w-full`＋name truncate で列幅に収める）、**左の色ドットは撤去**（チップ自体が色付きで冗長）。⑤**ファビコンを刷新**: 旧＝中身と無関係な紫の抽象グリフ（テンプレ流用）→ Google Blue 地に「一」（＝一目/Ichimoku）を白い角丸バーで描いた `public/favicon.svg`（フォント非依存・極小でも視認可）。`index.html` の `<title>` を「Ichimoku」に簡素化。各検証: lint 0 error / build 成功 / Prettier クリーン。

**タスク締切時刻を15分刻みプルダウン化＋時刻定義の共通化（本セッション 2026-06-18）**: タスク締切の時刻入力を native `<input type="time">` から **15分刻みの `<select>`**（先頭に「時刻なし」＝null）へ変更。予定パネルと同じ刻みに統一。重複していた時刻ユーティリティ（`STEP_MIN`/`pad2`/`minToHHMM`/`hhmmToMin`/`TIME_OPTIONS`）を新規 `src/lib/time.ts` に集約し、`EventDetailPanel`・`TaskDetailPanel` の両方から import（EventDetailPanel のローカル定義は撤去）。検証: lint 0 error / build 成功 / Prettier クリーン。

**カレンダーで予定/タスク締切を区別（実装済み・本セッション 2026-06-18）**: 方針A準拠で「色は種別から自動描き分け」。`Agenda.tsx` で **予定＝時計アイコン＋平たい行**（timed=primary時計/allDay=muted時計、左の縦アクセントバーは廃止しアイコンに置換）、**タスク締切＝旗アイコン＋緊急度色の淡い塗りカード**（`uc.bg`/`uc.border`/`uc.text`＋角丸枠、`締切 HH:mm`＋タイトル2段、hover で brightness 微変化）。ユーザー選定は4案中「アイコン＋淡い塗りカード」。追補: 締切カードを縦積み（締切/タイトル2段）から **予定と同じ1行構成**（`[旗][固定幅4.5rem ラベル「締切 HH:mm」][タイトル flex-1]`）に変更し、**タスクのタイトル文頭を予定と揃えた**。予定行にも `border border-transparent` を足し、塗りカードの 1px ボーダー分を相殺して列位置をピクセル一致。検証: lint 0 error / build 成功 / Prettier クリーン。実機目視推奨（当日 6/15 は予定3件、6/16 は予定＋締切が混在＝区別確認しやすい）。サブタスク（旧フェーズ2）は「整理を生まない原則」で要再評価のため保留。

**（履歴）詳細モーダル項目拡充フェーズ1（本セッション 2026-06-18・方針Aで撤回）**: モーダル内容の再検討を受け、ユーザー合意のうえ段階導入。**フェーズ1＝①タスク優先度（高/中/低）②タスク締切に時刻③予定の色分け**を実装（ADR-0002 起票）。データ: `types.ts` に `TaskPriority`・`Task.priority`/`Task.dueTime`・`EventItem.color` を追加。マイグレーション `supabase/migrations/20260618000000_task_event_fields.sql`（`tasks.priority` check付き / `tasks.due_time` / `events.color`、既存行は既定値で後方互換）。`AppDataContext` の Row 型・マッパー・insert/patch・addTask/addEvent 既定値を全て更新。`mockData` に各値を反映（プレビュー目視可）。UI: `TaskDetailPanel` に優先度3ボタン＋締切日付の隣に時刻入力（空=日付のみ）。`TaskCard` に `PriorityMark`（高=crit系/低=ミュート、中は非表示）＋締切チップに時刻併記（`formatDue`）。`DeadlineRail`・`Agenda` の締切表示も `formatDue` で時刻併記。`EventDetailPanel` に既存 `ColorPicker` を再利用した「色」欄、`Agenda` の予定アクセントバーを `events.color`（`slotVar`）で着色。検証: `npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm.cmd run build`（tsc 込み）成功 / 対象ファイル Prettier クリーン。⚠ **実 DB 検証は未実施**（migration 未適用・このリモート環境に Supabase 認証情報なし）。⏳ **次**: フェーズ2＝サブタスク/チェックリスト（`tasks.subtasks` JSONB 予定）。**繰り返しは Google 連携（Step12-13）と同時に本格実装＝今回見送り**（DB の rrule 箱は既存）。

**（履歴）side-peek 操作ボタン位置調整（本セッション 2026-06-18）**: スライドイン詳細パネルの保存/削除ボタンの位置をユーザー指示で調整。当初「最下部で見づらい」→ヘッダ直下（上部固定）に移したが、再指示で **「タイトル下ではなく入力項目の直下」** に変更。`PanelShell`（`src/features/_shared/panel.tsx`）の一時的な `actions`（上部固定）prop は撤去し元の構成へ復帰。`EventDetailPanel`（削除/キャンセル/保存・更新）と `TaskDetailPanel`（削除/未着手へ戻す）は操作行を **本体スクロール内の最後の要素**（最終入力項目の直下、`border-t` で区切り）として描画。タスクの作成/更新時刻は当面 `footer`（最下部・faint）に残置。説明テキストのみのパネル（`CategoryManager`/`ShiftManager`/`CompletedHistory`）は `footer` 下部のまま不変。検証: `npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm.cmd run build`（tsc 込み）成功 / 対象3ファイル Prettier クリーン。**スライドイン方式は維持で確定**（中央モーダル化は不採用）。⏳ **未決（ユーザー確認待ち）**: ①タスク/予定の追加項目（優先度・締切時刻・着手予定日・予定の色分け/繰り返し等）の要否、②タスク詳細の「作成/更新」表示を残すか外すか。

**3カラムレイアウト正式採用＋比較スキャフォールド撤去（本セッション 2026-06-18）**: デザイン改修の比較検討の結論。**レイアウトを「近日締切（左縦カラム）｜タスクボード｜カレンダー」の3カラムに変更**して正式採用。**配色・質感は現状（②Google）を維持**（A 洗練／B ソフト／D 高密度の各プリセットは不採用・撤去）。検討用に作った比較トグル・不採用レイアウト（サイドバー型／ヒーロー型／カレンダー主役）は全撤去。具体：①`src/index.css` の `html[data-theme]` プリセット3種を削除（:root は元の Google トークンのみに復帰）。②`ThemeSwitcher.tsx` と `previewChrome.tsx`（Sidebar/HeroSummary）を**ファイルごと削除**。③`AppShell.tsx` を layout 分岐・DEV トグル・localStorage を撤去し、トップバー＋3カラムグリッド（`lg:grid-cols-[minmax(220px,260px)_1fr_minmax(340px,460px)]`、lg 未満は縦積み）の単一実装へ。④`DeadlineRail.tsx` を縦カラム専用に簡素化（`variant`/`full` prop と横スクロール帯の旧実装を削除、カードは常に全幅）。⑤`docs/design.md` に「§4 ベースレイアウト（3カラム）」を新設し正本同期。⑥追補: 締切カラムのヘッダーをボード/カレンダーと同一スタイル（`border-b`＋`px-4 py-3`、見出し `font-display text-[15px] font-bold`＋アイコン `size-4`）に統一。締切カラムの左右位置はユーザー確認のうえ**左で確定**。⑦**双方向ホバーハイライト**: 締切のあるタスクは ボード(TaskCard) ⇄ 締切カラム(DeadlineCard) ⇄ カレンダー(締切表示＋該当日) が `task.id`／締切日で連動。各表示が hover で `highlightId`＋`highlightDate` をセットし、自分が一致したら点灯（warn-soft 地＋warn リングで3ビュー統一）。TaskCard・Agenda の締切タスクに pointer enter/leave を追加、DeadlineCard に `highlightId` consume を追加。⑧**締切カラムを案C化**: 見出しを「近日締切」→「**締切**」に変更（全件対象の実態に一致）。既定は直近 `VISIBLE_LIMIT=10` 件のみ表示し、超過分は末尾「他◯件を表示／閉じる」トグルで展開（`useState`・全件はデータ保持）。検証：`npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）／`tsc --noEmit` OK／`npm.cmd run build` 成功（CSS 57.49→55.92kB）／変更ファイル Prettier クリーン。⚠ **実機目視推奨**：締切左カラムでの DnD（完了ゾーン）・締切ホバー連動・狭い幅でのボード列数／カレンダー幅。⚠ 仕様 `task-board-spec-v1.md` §7 のレイアウト記述は旧（締切レーン上部）のままなので、必要なら 3カラムへ追従更新（ADR-0001 系の軽微追記で可）。

**（履歴）デザイン改修の比較スキャフォールド（本セッション 2026-06-18）**: 「配置はそのまま・各パーツの見た目/UI/UX を底上げ」要望に対し、方向性 A/B/D を実機比較できる切替トグルを実装（ユーザー選択：A 洗練フラット・B ソフトエアリー・D 高密度プロ＋現状ベースライン、進め方＝切替トグルで実機比較）。①`src/index.css` に `html[data-theme="refined|soft|dense"]` のプリセットを追加（コンポーネントはトークン駆動なので :root 実体を上書きするだけで配置を変えず丸ごと差し替え。`font-size` を html に置き rem 余白＝密度をレバー化：dense 15px 詰め／soft 16.5px 広げ／refined・現状は既定 16px）。②新規 `src/features/_shared/ThemeSwitcher.tsx`（DEV 専用・左下固定・localStorage 永続・`useLayoutEffect` で `document.documentElement.dataset.theme` を反映＝ちらつき防止）。③`AppShell.tsx` に `import.meta.env.DEV` ガードで `<ThemeSwitcher />` をマウント（本番は描画しない）。検証：`npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）／`tsc --noEmit` 通過／`npm.cmd run build` 成功／変更3ファイル Prettier 通過。**未確定**：これは比較用スキャフォールドであり正本ではない。採用テーマが決まったら、その値を `:root` へ昇格し `docs/design.md` を同期、`ThemeSwitcher.tsx` と CSS プリセット・AppShell の DEV 配線を撤去すること（過去の `ColorTuner` と同じ撤去フロー）。D の文字モノスペース化やパーツ別の細部（B の余白拡張など px 指定箇所）はトークンで届かないため、採用後に各コンポーネントで追い込む。⚠ ブラウザでの A/B/D 見比べ（desktop＋390px）は要ユーザー目視。

**予定追加カレンダーのドラッグ複数日選択（本セッション 2026-06-18）**: 予定追加パネルの日付ピッカー `src/features/calendar/MiniRangeCalendar.tsx` に**ドラッグでの範囲選択**を追加。従来の 2 クリック方式（起点→終点／月またぎ可）は維持しつつ、起点でポインタ押下→なぞった範囲をその場で確定できるようにした。実装要点: 各日セルに `data-dy` を付与し、`setPointerCapture` でカラム外まで追従、`document.elementFromPoint` で真下の日を解決（マウス・タッチ両対応）。`drag.moved` フラグで「動いた=ドラッグ確定」「動かない=単発クリック→従来 `pick()` の 2 クリックへ委譲」を区別。セルに `touch-none select-none` を付与しタッチスクロール/テキスト選択を抑止。`onClick` は撤去し `onPointerUp` 起点に統一。検証: `npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm.cmd run build` 成功 / 対象 Prettier check 成功。⚠ 実機（特にタッチ）でのドラッグ追従は要目視。

**不要ファイル/未使用依存の整理（本セッション 2026-06-17）**: フロントエンド8割確定後の保守整理として、参照なしの `src/assets/hero.png` / `src/assets/react.svg` / `src/assets/vite.svg` / `public/icons.svg` を削除。未使用依存 `@fontsource-variable/geist` と、現行 Vite Tailwind 構成では直接使っていない `@tailwindcss/postcss` / `autoprefixer` / `postcss` を削除。空ディレクトリ `design-explorations/` はローカルから削除。検証: `npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm.cmd run build` 成功 / package files Prettier check 成功。`npm.cmd run format` は既知の `.agents/*.md` EPERM で終了コード1。未追跡 `.agents/skills/session-*` はCodex用導線の可能性があるため今回削除せず、扱いは別途判断。

**②Google配色の正式採用・他候補廃止（本セッション 2026-06-17）**: 5 パターン検討のうち「② Google」を採用。`src/index.css` のセマンティックトークンを Google 系ニュートラル地（`#f8f9fa`）＋白面（`#ffffff`）＋ Google Blue（`#1a73e8`）へ固定し、分類色 `--cat-1..6` も Google 系スロットに差し替え。開発用の色味調節ポータル `src/features/devtools/ColorTuner.tsx` は削除し、`AppShell` の DEV 専用呼び出しも撤去。他候補プリセットは廃止。`docs/design.md` は Google 固定の正本説明へ同期。検証: `npm.cmd run lint` 0 error（既存 Fast Refresh warnings のみ）/ `npm.cmd run build` 成功 / 変更対象 Prettier check 成功。ブラウザで desktop と 390px 幅を確認し、CSS 変数反映・ポータル非表示・横 overflow なし。

**フロントエンド確定前の UI 共通化（本セッション 2026-06-17）**: プレビュー確認段階で「類似した操作は統一実装・見た目の統一感重視」の方針を受け、カテゴリ管理/勤務地管理を新規 `src/features/_shared/ManageListPanel.tsx` に統合。追加・名称編集・色選択・上下移動・削除・件数表示の UI と実装を 1 箇所へ集約した。タスク詳細/予定詳細は仕様差（タスク=自動保存、予定=保存ボタン式）を残しつつ、タイトル入力クラスとフッター配置（`PanelFooterRow`）を共通化し、削除/キャンセル/更新ボタン表現を `Button` に統一。検証: `npm run lint` 0 error（既存 Fast Refresh warnings のみ）、`npm run build` 成功、対象ファイル Prettier check 成功。`npm run format` は `.agents/state/locks.md` の EPERM で最後だけ失敗したが、コード対象は整形済み。ブラウザ確認: desktop と 390px 幅でカテゴリ/勤務地/タスク/予定 side-peek の横 overflow なし。

**分類色のパレットスロット化リファクタ＋ブランチ main 一本化（本セッション 2026-06-16）**: カテゴリ・勤務地の色を「テーマパレットのスロット参照」に統一＝色値の正本は `src/index.css` の `--cat-1..6`＋`--cat-uncat` 1 箇所、データ（`Category.color`/`ShiftType.color`）は `"cat-3"` か `null`(自動) のみ保持。現在は ②Google 配色へ固定済みで、過去の候補プリセット/ColorTuner は廃止済み。自由 hex は廃止（旧 hex データは `resolveColor` が後方互換で表示）。解決ロジックは新規 `src/lib/palette.ts`（`resolveColor`/`paletteVar`/`slotVar`/`tint`）。共通 UI は新規 `src/features/_shared/ColorPicker.tsx`（「自動」＋6スウォッチ）。`CategoryManager` に色設定 UI を新設（従来なし・`setCategoryColor` を `AppDataContext` に追加）、`ShiftManager` の自由カラー入力＆「標準色」サンプルを撤去し同ピッカーへ。α付き淡色は `${color}2e` 連結 → `color-mix`（`tint`）に統一。旧 `CAT_FALLBACK`/`SHIFT_FALLBACK`/`shiftColors.ts` は撤去。`mockData` の固定 hex はスロット参照へ（「休み」は `null` で自動の実例）。tsc/ESLint 0/Prettier 通過。③**Git**: すべての作業ブランチを `main` に集約。`main` を `claude/v1.4-consolidated` へ fast-forward して push、重複ブランチ（v1.4-consolidated / tampermonkey / task-board-layout-review / backup）を local+remote から削除。**現在 origin は `main` のみ**。⚠ 実 DB の既存カテゴリ/勤務地は次にピッカーで選び直すまで現状色のまま（後方互換で表示は崩れない）。⚠ 実機目視推奨。

**ボード/カレンダー UI 反復（本セッション 2026-06-16）**: ①カテゴリ列を**レスポンシブ列分配マソンリー**化（`Board.tsx`＋ResizeObserver で 1〜MAX_COLS 列・横スクロール廃止・4 つ目以降が 1 つ目の真下へ潜る・列は `w-full`）。②**DnD 挙動を統一**（`BoardDndProvider.tsx`：衝突判定 `pointerWithin` 優先で空ゾーンにも確実に落ちる／`dropAnimation=null` で「一度元位置へ戻る」解消／`Lane.tsx` のカテゴリ列 sortable transform 撤去で折りたたみ時の崩れ解消／`AppDataContext.tsx` の楽観更新を同期先行で「一瞬戻る」解消）。③**自動保存テキスト入力を IME セーフ化**（`_shared/panel.tsx` の `useAutoField`/`AutoInput`/`AutoTextarea`＝変換中に確定/誤送信しない。タスク・カテゴリ名・シフト名へ適用、各追加 Enter に `isComposing` ガード）。④予定登録は**保存ボタン式（option B）**で確定済み（カレンダーグリッド期間選択・既定終日・時間 2 プルダウン・終了<開始不可・時間設定時は必須）。⑤締切タスクをカレンダー該当日に表示＋近日締切ホバーで該当日ハイライト。`tsc`/ESLint 0 error/Prettier 通過。実機目視推奨。（注: かつて未コミット残置だった `ColorTuner`・`docs/design.md`・`docs/google_calendar_color_spec.md`・`AppShell` 配線は、2026-06-16 の集約で **すべて main にコミット済み**。）

**過去の配色検討（2026-06-16）**: 一時的に「案1 ウォーム・コントラスト強化」を採用していたが、2026-06-17 に ②Google へ正式切替済み。現在の正本は `src/index.css` と `docs/design.md` の Google 配色。

**過去の配色調整ポータル（2026-06-16）**: 実機プレビュー上で色味検討するため `ColorTuner` を一時導入していたが、2026-06-17 に役目を終えて削除済み。DEV でもポータルは表示しない。

**画面構成の見直し（v1.4 / ADR-0001）実装済み・実機目視チェック待ち（本セッション 2026-06-16）**: ユーザーと論点整理のうえ、4点を一括実装。型チェック・ESLint（0 error）・`npm run build`・prettier 通過。プレビュー（未ログイン）で目視可。

- **論点1（案B）ボード1列化**: 状態列（未着手/対応中）を撤去し**カテゴリ単位の単一リスト**に。「対応中」はカード上の**★フラグ**（内部 `status='doing'`）。`Board`/`Lane`/`BoardCell`/`TaskCard` を改修。`position` の基準が（カテゴリ×状態）→（カテゴリ）に変更。`WORKING_STATUSES` 撤去、`isFlagged()` 追加（`types.ts`）。
- **論点2 完了即アーカイブ＋30日物理削除**: 完了ゾーンへのドロップで `completed_at`・`archived_at` を即記録（`completeTask`）。`fetchTasks` はアーカイブ込み全件取得に変更し、`tasks`(active)/`archivedTasks` をメモ派生。**完了履歴 side-peek**（`CompletedHistory.tsx`）で新しい順表示＋未着手へ戻す（`uncompleteTask`）。**undo トースト**（`UndoToast.tsx`・5秒）。30日経過は起動時 sweep で `deleteTask`（物理削除）。旧 `archiveTask`/`moveTask`/7日自動アーカイブは撤去。
- **論点3 カレンダー無限スクロール**: 週/日トグル・`TimeGrid`・`WeekAgenda` を削除し、今日起点の**無限スクロール アジェンダ**（`Agenda.tsx`）に一本化。未来=IntersectionObserver で自動継ぎ足し、過去=「前を表示」＋スクロール補正。時間変更は予定詳細パネルへ。
- **シフト（勤務地）新設**: `shift_types`（マスタ）＋`shifts`（1日1件 `unique(owner_id,date)`）。マイグレーション `supabase/migrations/20260616000000_shifts.sql`（RLS 込み）。アジェンダ各日に色付き**シフトチップ**（`ShiftChip.tsx`）＋**勤務地管理 side-peek**（`ShiftManager.tsx`）。`AppDataContext` に shift CRUD・`setShift` 追加。`OverlayContext` に `history`/`shiftTypes` kind 追加、`AppShell` で出し分け。
- **未検証**: 新テーブル（shift_types/shifts）と完了即アーカイブ/30日削除の**実 DB 動作は未確認**（このリモート環境に Supabase 認証情報なし）。要ローカル目視＋migration 適用。`mockData.ts` に archived タスク2件・シフト6件・勤務地4種を追加済みでプレビュー確認可。
- **仕様反映済み**: `task-board-spec-v1.md` を v1.4 へ更新（§3.3/§3.5/§3.8/§5.2/§5.3/§7/§10）＋ `docs/adr/0001-board-and-calendar-layout-rework.md` 起票（Next Actions #7 をクローズ）。

---

Step 5〜10 を**メモリ内モックストア**で一気に実装し、`npm run dev` だけで全機能を目視チェックできる状態。

- データ層: `src/store/AppDataContext.tsx`（モック・DB と同じフィールド名）／オーバーレイ一元管理 `src/store/OverlayContext.tsx`（§3.7「常に1枚」）。
- 機能: タスクボード（dnd-kit で状態×カテゴリD&D・レーン折りたたみ・未分類レーン）／クイック追加（Enter）／タスク詳細 side-peek（自動保存・締切プログレッシブ・リンク複数）／近日締切レーン（緊急度色分け）／カレンダー（アジェンダ＋予定ポップ追加＋予定詳細）／カテゴリ管理 side-peek（追加・リネーム・並べ替え・削除）。
- プレビュー: DEV かつ Supabase 未設定 or `VITE_PREVIEW_MOCK=true` でログイン無しにシェル表示（本番無効）。`.env.example` 参照。
- UI 改修（要望反映済み）: 追加・編集を**同一の side-peek 詳細パネルに一本化**（＋ボタンは空の下書きを作って同じパネルを開く・空のまま閉じたら破棄）。共通枠は `src/features/_shared/panel.tsx`。タスク追加=ボード見出し／予定追加=カレンダー見出しに配置。カードはフラット（左色廃止・カテゴリ色はレーンのドット）、メモは2行クランプ表示＋「メモ表示」トグル。見出しのみ明朝（`font-display`／Zen Old Mincho はラテンのみ同梱・日本語は OS 明朝へ）。
- 補足: `src/components/overlay/AnchoredPopover.tsx` は現状未使用（ポップ採用時の再利用部品として温存）。

**プレビュー目視用モック復活 ＋ UI 改修（本セッション・2026-06-16）**: ログイン無しで全機能を触れるよう、プレビュー時のみメモリ内モックを復活。あわせてユーザー要望で UI を 3 点改修。

- **プレビューモック**: `src/lib/preview.ts` の `IS_PREVIEW`（DEV かつ Supabase 未設定 or `VITE_PREVIEW_MOCK=true`）を新設し `App.tsx` と共有。`src/store/mockData.ts`（カテゴリ3/タスク8/予定6）を `AppDataContext` の各 useQuery に `initialData` で注入し、プレビュー時は `enabled:false` でネットワーク停止。全 mutation 先頭に `if (IS_PREVIEW) return;` を置き **Supabase を呼ばずキャッシュ上だけで完結**（楽観更新がそのまま永続化代わり＝D&D・追加・編集・並べ替え・アーカイブが全部動く）。これで「追加モーダルが白紙」（ドラフト作成→保存失敗→楽観ロールバックで消滅）も解消。
- **カレンダー週表示をアジェンダ風リスト化**: `src/features/calendar/WeekAgenda.tsx`（新規）。日付セクションを縦に並べ各日の予定を時刻順リスト表示（`9:00～9:30` の1段・時刻枠とタイトル枠の文頭を固定幅 `5.5rem` で揃える）。`Calendar.tsx` で週=WeekAgenda／日=TimeGrid に分岐（日表示の時間グリッド＝DnD移動・リサイズは温存）。
- **タスクボードの状態列に薄い縦罫線**: 列テンプレートを `grid-cols-[1fr_10px_1fr]`（旧 `gap-2.5`=10px を罫線トラックに置換）にし、10px ガター中央に 1px の `--color-border` 線。見出し行（`Board.tsx`）とセル行（`Lane.tsx`）で同テンプレ＝上下で罫線が通る。
- **完了プール（共有ドロップゾーン）方式に変更**: 各レーンの `完了` 列を撤去し、ボードを **未着手/対応中の2列**に（`WORKING_STATUSES` を `types.ts` に追加）。ボード下部に固定の `CompleteZone.tsx`（droppable id=`complete-zone`）を新設。カードをドロップ＝`moveTask(id, categoryId, "done")` で完了（記録保持・N日後の自動アーカイブは従来どおり）。直近完了を取り消し線チップで最大8件＋件数＋↶（未着手へ戻す）。`DndContext` をスクロール領域＋固定フッターの両方に拡張。**本当の削除は詳細パネルのまま分離**。
- ⚠ **仕様逸脱**: 完了プールは仕様 §85/§289（3列ボード）からの UI 変更。採用確定なら `task-board-spec-v1.md` 更新＋ADR が必要（Next Actions #7）。

**Supabase 配線（データ層）実装済み・実 DB 検証待ち**: `src/store/AppDataContext.tsx` をメモリ内モックから **TanStack Query + Supabase CRUD** へ全面差し替え済み（インターフェース不変＝コンポーネント無改修）。`main.tsx` に `QueryClientProvider` を追加（`QueryClientProvider > AuthProvider > AppDataProvider` の順）。`@tanstack/react-query@5` を依存追加。

- 設計の要: ①`addTask`/`addEvent` は `crypto.randomUUID()` で **クライアント採番**し即 id を返す（DB の `default gen_random_uuid()` は使わず明示挿入）＋楽観的更新でドラフトを即パネル表示。②`owner_id` は認証ユーザーから付与（未認証は保存不可）。③表示順は `position` 昇順。`Lane` は配列順をそのまま描画するため、取得時も楽観更新時も `position` で再ソートしキャッシュと DB を一致させる。
- 並び順キー: `src/lib/order.ts` の `keyBetween`/`keyAfter`/`keyBefore`（字句的中点による fractional index）。挿入・並べ替えで永続化（旧モックの簡易連番を撤去）→ Next Actions #2 を実質前進。
- 未検証: このリモート環境に Supabase 認証情報が無く、**実 DB に対する CRUD 動作は未確認**。型チェック・ESLint・`npm run build` は通過済み。ローカル（`.env` 設定＋ログイン）での目視チェックが必要。
- 留意点: ①プレビュー（未ログイン）モードは本セッションで mock を復活（上記参照）＝データ入りで全機能を目視可。②`events.start_at/end_at` は timestamptz。楽観挿入は naive ローカル文字列、再取得後は tz 付き ISO に変わる。カレンダーの TZ 厳密化は #3 と併せて対応。③`src/lib/date.ts` の `APP_TODAY` は固定基準日のまま（実 today 化は #3 で）。

**カレンダー週/日グリッド（#3）および Supabase 配線（#1）の Codex Review 指摘（3件）修正完了・実機目視チェック待ち**:

- **P1: timestamptz タイムゾーン正規化 (`AppDataContext.tsx`)**: DB保存前に `.toISOString()` でUTC変換し、読み込み時に `toLocalIso` で naive ローカル ISO に戻すことで、ブラウザとDBのTZ乖離による表示ズレを解消。
- **P2: 日をまたぐドラッグ中のアンマウント防止 (`TimeGrid.tsx`)**: ドラッグ中要素を元の日のカラムでマウントし続け、ドラッグ先のカラム位置に合わせて `left` 位置を動的に計算することで、アンマウントによる PointerCapture 解除を防ぎ、正常に DnD 移動がコミットできるよう修正。
- **P2: ヘッダー「予定」追加時の基準日バグ (`Calendar.tsx`)**: 週表示のときも `anchor`（表示中の週の基準日）を基準に予定が作成されるように修正。

**カレンダー週/日グリッド（#3）実装済み**: アジェンダ表示を撤去し、自作の時間グリッドへ刷新。`src/features/calendar/Calendar.tsx`（コンテナ: 週/日切替・前後/今日ナビ・＋予定）＋ `src/features/calendar/TimeGrid.tsx`（描画＋操作）＋ `src/lib/calendar.ts`（時間計算・重なり配置の純粋関数）。

- 操作: 本体ドラッグで時間移動（週では横ドラッグで日移動）、下端ハンドルでリサイズ、15分スナップ、空き領域クリックで1時間の予定を新規作成（ドラフト→詳細パネル）、予定クリックで詳細、日見出しクリックで日表示へ。グリッドは 0–24時・1時間44px・初期スクロール7:00。
- ポインタ実装の要: ドラッグ状態は **`useRef` を真実の値**にしてハンドラの stale クロージャ問題を回避（高速クリックで詳細が開かない事象を防止）。`setPointerCapture` でカラム外までドラッグ追従。
- データ層は無改修（`addEvent`/`updateEvent`/`openEvent`/`openEventDraft` のみ使用）。`updateEvent` 経由で楽観的更新→Supabase 永続化に自動的に乗る。
- 未検証: ヘッドレス環境のためブラウザ実機でのドラッグ/リサイズ/作成の目視は未実施。型チェック・ESLint・`npm run build` は通過。狭い右カラム（約440px）での週7列の見やすさは要目視。
- 留意点: 終日予定は日見出し下の帯に最小表示（編集UIでの終日トグルは未実装）。

**完了タスクの自動アーカイブ（#5）実装済み・検証待ち**: `fetchTasks` を `archived_at is null` に絞り、ボード・締切レーンから自動除外。`AppDataContext` に `archiveTask`（`archived_at=now` 永続化＋楽観的にキャッシュ除去）を追加し公開。`ARCHIVE_AFTER_DAYS=7`（仕様未確定 N の既定値）。

- 自動 sweep: `tasks` 取得後の useEffect で「`done` かつ `completedAt` が7日以上前」を `archiveTask` でマーク（楽観除去で多重実行防止。`mutate` は v5 で安定参照）。
- 手動: `TaskDetailPanel` の done タスクに「アーカイブ」操作を追加（7日待たずローカル検証可能）。
- 残: 実 DB での検証、および仕様 §3.1 の「アーカイブ一覧から参照」UI（v1 では未実装＝アーカイブ後は UI から見えなくなる。DB には残る）。N=7 の最終確定も要相談（仕様 Open Question）。

- Tampermonkey クイック追加（`tampermonkey/ichimoku-quick-add.user.js`）: 全サイトで動く端タブ式の素早いタスク投入。Supabase REST に直接 INSERT（本体モックとは独立）。普段は端の細い帯、クリックで追加パネル、上下ドラッグ移動＋左右端スナップ（位置は `GM_setValue` 保持）。認証は**本体アプリのログイン済みセッションを連携**（第三者ページでパスワードを入力させない／`localStorage` の `sb-<ref>-auth-token` を読み GM 共有・自動リフレッシュ。PR #2 のセキュリティ指摘 P1 反映）。`position` は fractional index 本実装（#2）までタイムスタンプ文字列の暫定。利用には Supabase 稼働＋スクリプト冒頭の URL/anon key 設定が必要（`tampermonkey/README.md`）。

## Next Actions

| 優先 | タスク                                                                                                                                          | 状態 |
| :--: | ----------------------------------------------------------------------------------------------------------------------------------------------- | :--: |
|  1   | Supabase 配線: `AppDataContext` を TanStack Query + Supabase CRUD に差し替え。**コード実装済み・Codex指摘(P1)対応完了・実 DB 目視チェック待ち** |  ◐   |
|  2   | fractional index による並び順の永続化（カテゴリ・セル内タスク）。`src/lib/order.ts` 実装済み。残: 実 DB での並べ替え検証＋密集時の桁伸長確認    |  ◐   |
|  3   | Step 11. カレンダー。**無限スクロール アジェンダに刷新済み（v1.4）**・実機目視待ち。週/日グリッド・TimeGrid は撤去                              |  ◐   |
|  4   | Step 12-13. Google アカウント連携＋双方向同期（`docs/google-calendar-setup.md`）                                                                |  ☐   |
|  5   | Step 14. 完了タスク。**完了即アーカイブ＋30日物理削除＋完了履歴 UI に刷新済み（v1.4）**・実 DB 検証待ち（旧 7日自動 sweep は撤去）              |  ◐   |
|  6   | Step 16. Cloudflare Pages デプロイ                                                                                                              |  ☐   |
|  7   | 画面構成見直しの仕様反映＋ADR 起票（v1.4 / ADR-0001）。**完了**                                                                                 |  ✅  |
|  8   | シフト（勤務地）新設。マイグレーション・UI 実装済み。残: **実 DB で migration 適用＋ shift_types/shifts の CRUD 検証**                          |  ◐   |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了

※ モック実装済みの目視チェック観点: D&D で状態/カテゴリ変更 → 締切レーン/カウント反映、締切チェックで日付欄出現、side-peek の自動保存「保存済み✓」、オーバーレイが常に1枚（別を開くと前が閉じる）、Esc/外クリックで閉じる。

※ 並行タスク（人間）: `docs/google-calendar-setup.md` に沿って Google Cloud プロジェクト作成〜OAuth クライアント発行〜Supabase の Google プロバイダ登録を進める。完了したら AI 側でカレンダー連携コードを実装。

※ 詳細な全16ステップは `C:\Users\murak\.gemini\antigravity-ide\brain\5f2388c4-19ca-4350-b2a7-4da5cc780d19\task.md` にて追跡しています（カレンダーは Google アカウント連携＋双方向同期の方針に伴い Step 12-13 を追加し、全体を 14→16 に再採番）。

## 確定仕様・境界

- **リポジトリ**: `https://github.com/shida-product/Ichimoku.git`（メインブランチ: `main`）
- **仕様の正本**: `task-board-spec-v1.md` (v1.3 技術確定版)
- **操作モデルの正**: `prototype-overlay.html`
- **デザイン正本**: 配色・余白・角丸の実体は `src/index.css`（**②Google正式採用**＝Google 系ニュートラル地/白面/Google Blue 準拠の統一トークン。角丸 0.5rem、タスクカードは `--shadow-card` で軽い影＋左色ストライプなしのフラット）。配色候補と色味調節ポータルは廃止済み。使い方は `docs/design.md`。**コンポーネントに生の 16 進値や `zinc-*` 等を直書きせず、必ずセマンティックトークン経由**。中央モーダル封印・保存ボタン禁止（自動保存）・オーバーレイは常に 1 枚。
- **技術スタック**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4（Viteプラグイン `@tailwindcss/vite` 方式）
- **認証/セキュリティ**: Supabase Auth ＋ Postgres RLSポリシー (`using (auth.uid() = owner_id)`) による個人専用の隔離（新規ユーザー登録で自動適用）。
- **カレンダー方式**: 自作カレンダー UI を正とし、そこに **Google Calendar API（双方向・読み書き / scope `calendar.events`）** で取得した予定をマージする。iframe 埋め込みは却下。OAuth は既存 Supabase Auth に Google プロバイダを相乗り（ID/シークレットは Supabase 管理画面で保持、コード/.env に置かない）。設定手順は `docs/google-calendar-setup.md`。利用料無料・テストユーザー枠は審査不要。実装は自作カレンダー UI の器が立ってから。
- **ビルド時の注意**: `npm run build` が出力フェーズでサイレントに強制終了する場合、Windows のファイルシステムによる `dist` 内ファイルのロックが原因です。`Remove-Item -Path "dist" -Recurse -Force` を実行し、`dist` を一度綺麗にクリーンアップした上でビルドを走らせてください。

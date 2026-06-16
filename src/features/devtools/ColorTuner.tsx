import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ColorTuner — 開発専用の配色調整ポータル（実機版）。
 *
 * ねらい: 稼働中のアプリ上で `src/index.css` のセマンティックトークンを 1:1 で調整し、
 * 結果を `:root` ブロックとして出力（コピー）できる。機能開発と色味調整を同じ画面で並行する。
 *
 * 設計の要:
 * - 初期値は index.css 自身を真実とする（getComputedStyle で :root から読む）。
 *   → 値を二重管理しない。現在の採用色（案1）がそのまま基準になる。
 * - 変更は document.documentElement（= :root）の CSS 変数を上書きしてアプリ全体へ反映。
 *   派生トークン（--popover/--ring/--muted/--destructive 等）は連動して書き込む。
 * - 本番ビルドには出さない（呼び出し側 AppShell の import.meta.env.DEV ゲートで描画自体を抑止。
 *   import.meta.env.DEV は静的置換されるので prod ではこのモジュールごと tree-shake される）。
 * - このパネル自身は調整対象トークンに依存しないよう、内部 UI は独立配色（生値）で固定。
 *   ※ プロダクト UI のトークン直書き禁止ルールの対象外（編集中に自分が壊れないため）。
 */

type TokenDef = { k: string; label: string; link?: string[] };
type Row = { group: string } | TokenDef;

const ROWS: Row[] = [
  { group: "面（サーフェス）" },
  { k: "--background", label: "地（背景）" },
  { k: "--card", label: "パネル/カード面", link: ["--popover"] },
  { k: "--secondary", label: "くぼみ面", link: ["--muted"] },
  { group: "文字" },
  {
    k: "--foreground",
    label: "既定の文字",
    link: ["--card-foreground", "--popover-foreground", "--secondary-foreground"],
  },
  { k: "--muted-foreground", label: "副文字" },
  { k: "--ink-3", label: "補助文字（淡）" },
  { group: "線" },
  { k: "--border", label: "標準の線" },
  { k: "--input", label: "強い線・入力枠" },
  { group: "アクセント（テラコッタ）" },
  { k: "--primary", label: "アクセント（主）", link: ["--accent-foreground", "--ring"] },
  { k: "--accent", label: "アクセント淡色" },
  { group: "締切の緊急度" },
  { k: "--crit", label: "緊急・赤（3日以内）", link: ["--destructive"] },
  { k: "--crit-soft", label: "緊急 淡色" },
  { k: "--warn", label: "注意・橙（7日以内）" },
  { k: "--warn-soft", label: "注意 淡色" },
  { group: "分類色（カテゴリ/勤務地）" },
  // カテゴリ/勤務地が自前の色を持たないときのフォールバック。テーマで一括切替する。
  // 各データ固有の色（Category.color / ShiftType.color）はここでは扱わない（data が正）。
  { k: "--cat-1", label: "分類 1" },
  { k: "--cat-2", label: "分類 2" },
  { k: "--cat-3", label: "分類 3" },
  { k: "--cat-4", label: "分類 4" },
  { k: "--cat-5", label: "分類 5" },
  { k: "--cat-6", label: "分類 6" },
  { k: "--cat-uncat", label: "未分類・中立" },
];

const TOKEN_DEFS = ROWS.filter((r): r is TokenDef => "k" in r);
const LS_KEY = "ichimoku-color-tuner-v1";

/**
 * 配色プリセット（比較用の候補パターン）。
 * - ① 現状（案1 ウォーム）は index.css 自身が真実なので preset には持たず、
 *   「現状」ボタンは resetToCss（index.css の採用色へ戻す）に割り当てる。
 * - ②〜⑤ は候補。値はここに集約し、選ぶと全トークン＋角丸を一括適用する。
 *   採用したいものが決まったら ColorTuner の「コピー」で index.css に貼る。
 */
type Preset = { id: string; label: string; values: Record<string, string>; radiusPx: number };

const PRESETS: Preset[] = [
  {
    id: "google",
    label: "② Google",
    radiusPx: 8,
    values: {
      "--background": "#f8f9fa",
      "--card": "#ffffff",
      "--secondary": "#f1f3f4",
      "--foreground": "#202124",
      "--muted-foreground": "#5f6368",
      "--ink-3": "#80868b",
      "--border": "#dadce0",
      "--input": "#c0c4c9",
      "--primary": "#1a73e8",
      "--accent": "#e8f0fe",
      "--crit": "#d93025",
      "--crit-soft": "#fce8e6",
      "--warn": "#e37400",
      "--warn-soft": "#fef0c8",
      "--cat-1": "#039be5",
      "--cat-2": "#0b8043",
      "--cat-3": "#f4511e",
      "--cat-4": "#8e24aa",
      "--cat-5": "#f6bf26",
      "--cat-6": "#7986cb",
      "--cat-uncat": "#616161",
    },
  },
  {
    id: "google-soft",
    label: "③ Google 淡",
    radiusPx: 10,
    values: {
      "--background": "#ffffff",
      "--card": "#ffffff",
      "--secondary": "#f6f8fc",
      "--foreground": "#3c4043",
      "--muted-foreground": "#70757a",
      "--ink-3": "#9aa0a6",
      "--border": "#e8eaed",
      "--input": "#dadce0",
      "--primary": "#4285f4",
      "--accent": "#f0f5ff",
      "--crit": "#ea4335",
      "--crit-soft": "#fdeceb",
      "--warn": "#f9ab00",
      "--warn-soft": "#fef7e0",
      "--cat-1": "#4fc3f7",
      "--cat-2": "#66bb6a",
      "--cat-3": "#ff8a65",
      "--cat-4": "#ba68c8",
      "--cat-5": "#ffd54f",
      "--cat-6": "#9fa8da",
      "--cat-uncat": "#9e9e9e",
    },
  },
  {
    id: "slate",
    label: "④ スレート",
    radiusPx: 10,
    values: {
      "--background": "#f4f6f8",
      "--card": "#ffffff",
      "--secondary": "#eceff3",
      "--foreground": "#1f2733",
      "--muted-foreground": "#59616e",
      "--ink-3": "#8b94a1",
      "--border": "#dde2e8",
      "--input": "#c6cdd6",
      "--primary": "#2f7d8a",
      "--accent": "#e2f1f3",
      "--crit": "#d64545",
      "--crit-soft": "#fbe3e3",
      "--warn": "#b7791f",
      "--warn-soft": "#f6ecd5",
      "--cat-1": "#5b8aa6",
      "--cat-2": "#6b8f7a",
      "--cat-3": "#8a7aa6",
      "--cat-4": "#a6845b",
      "--cat-5": "#9c6b78",
      "--cat-6": "#6d7f8f",
      "--cat-uncat": "#94a0ab",
    },
  },
  {
    id: "sage",
    label: "⑤ セージ",
    radiusPx: 8,
    values: {
      "--background": "#f4f5f0",
      "--card": "#fcfcf8",
      "--secondary": "#eaece3",
      "--foreground": "#232a22",
      "--muted-foreground": "#565e51",
      "--ink-3": "#8a9183",
      "--border": "#d9ddd0",
      "--input": "#c3c9b8",
      "--primary": "#3f6f4e",
      "--accent": "#e3eee2",
      "--crit": "#b23a2e",
      "--crit-soft": "#f3dcd6",
      "--warn": "#8a6516",
      "--warn-soft": "#eee5cd",
      "--cat-1": "#5a8a5e",
      "--cat-2": "#8a7d3b",
      "--cat-3": "#7d6a8e",
      "--cat-4": "#3f8072",
      "--cat-5": "#9a6b5b",
      "--cat-6": "#6b8a6f",
      "--cat-uncat": "#97a08e",
    },
  },
];

function linksOf(def: TokenDef): string[] {
  return def.link ?? [];
}

function normHex(input: string): string | null {
  let v = input.trim().toLowerCase();
  if (!v) return null;
  if (v[0] !== "#") v = "#" + v;
  if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v.slice(1).replace(/./g, (c) => c + c);
  return /^#[0-9a-f]{6}$/.test(v) ? v : null;
}

/** :root の現在値（index.css 由来）を読む */
function readBaseValues(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const def of TOKEN_DEFS) {
    const raw = cs.getPropertyValue(def.k).trim();
    out[def.k] = normHex(raw) ?? raw ?? "#000000";
  }
  return out;
}

function readBaseRadiusPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--radius").trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return 8;
  return raw.includes("rem") ? Math.round(n * 16) : Math.round(n);
}

type Saved = { values?: Record<string, string>; radiusPx?: number };
function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

/** 1 トークン＋派生を :root に書き込む */
function applyVar(def: TokenDef, val: string) {
  const root = document.documentElement;
  root.style.setProperty(def.k, val);
  for (const l of linksOf(def)) root.style.setProperty(l, val);
}

function applyRadius(px: number) {
  const root = document.documentElement;
  root.style.setProperty("--radius", px / 16 + "rem");
}

export function ColorTuner() {
  const [open, setOpen] = useState(false);
  // 初期値は index.css（getComputedStyle）＋保存分のマージ。遅延初期化で effect 不要。
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...readBaseValues(),
    ...(loadSaved().values ?? {}),
  }));
  const [radiusPx, setRadiusPx] = useState<number>(
    () => loadSaved().radiusPx ?? readBaseRadiusPx()
  );
  const [copied, setCopied] = useState(false);
  // ユーザーが一度でも触れたか（未編集の基準値は永続化しない＝index.css 改訂に追従）
  const touched = useRef(false);
  // index.css 由来の基準値（個別リセット用）。遅延初期化でマウント時に1回だけ捕捉する。
  // applyVar は effect（commit 後）で走るため、この初期化時点の getComputedStyle は index.css の素の値。
  const [base] = useState<{ values: Record<string, string>; radiusPx: number }>(() => ({
    values: readBaseValues(),
    radiusPx: readBaseRadiusPx(),
  }));

  // values/radius を :root へ反映（外部システム＝DOM の同期。初回マウント時も走る）
  useEffect(() => {
    for (const def of TOKEN_DEFS) applyVar(def, values[def.k]);
    applyRadius(radiusPx);
  }, [values, radiusPx]);

  // 編集後だけ保存
  useEffect(() => {
    if (!touched.current) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ values, radiusPx }));
    } catch {
      /* localStorage 不可環境は無視 */
    }
  }, [values, radiusPx]);

  const setToken = useCallback((def: TokenDef, val: string) => {
    touched.current = true;
    setValues((prev) => ({ ...prev, [def.k]: val }));
  }, []);

  const onRadius = useCallback((px: number) => {
    touched.current = true;
    setRadiusPx(px);
  }, []);

  // 1 トークンだけ index.css の基準値へ戻す（他の編集は維持）
  const resetToken = useCallback(
    (def: TokenDef) => {
      touched.current = true;
      setValues((prev) => ({ ...prev, [def.k]: base.values[def.k] }));
    },
    [base]
  );

  const resetRadius = useCallback(() => {
    touched.current = true;
    setRadiusPx(base.radiusPx);
  }, [base]);

  const resetToCss = useCallback(() => {
    touched.current = false;
    localStorage.removeItem(LS_KEY);
    // インライン上書きを除去 → index.css の値を読み直して state 同期（apply 効果が再反映）
    const root = document.documentElement;
    for (const def of TOKEN_DEFS) {
      root.style.removeProperty(def.k);
      for (const l of linksOf(def)) root.style.removeProperty(l);
    }
    root.style.removeProperty("--radius");
    setValues(readBaseValues());
    setRadiusPx(readBaseRadiusPx());
  }, []);

  // プリセット（②〜⑤）を一括適用。未指定トークンは現状維持。
  const applyPreset = useCallback((p: Preset) => {
    touched.current = true;
    setValues((prev) => ({ ...prev, ...p.values }));
    setRadiusPx(p.radiusPx);
  }, []);

  const exportCss = useMemo(() => {
    const g = (k: string) => values[k] ?? "#000000";
    return `:root {
  --radius: ${radiusPx / 16}rem; /* ${radiusPx}px */

  /* 面 */
  --background: ${g("--background")};
  --foreground: ${g("--foreground")};
  --card: ${g("--card")};
  --card-foreground: ${g("--foreground")};
  --popover: ${g("--card")};
  --popover-foreground: ${g("--foreground")};

  /* アクセント */
  --primary: ${g("--primary")};
  --primary-foreground: #ffffff;
  --accent: ${g("--accent")};
  --accent-foreground: ${g("--primary")};

  /* 副次面 */
  --secondary: ${g("--secondary")};
  --secondary-foreground: ${g("--foreground")};
  --muted: ${g("--secondary")};
  --muted-foreground: ${g("--muted-foreground")};

  /* 破壊的/緊急 */
  --destructive: ${g("--crit")};
  --destructive-foreground: #ffffff;

  /* 線 */
  --border: ${g("--border")};
  --input: ${g("--input")};
  --ring: ${g("--primary")};

  /* ドメイン拡張トークン */
  --ink-3: ${g("--ink-3")};
  --crit: ${g("--crit")};
  --crit-soft: ${g("--crit-soft")};
  --warn: ${g("--warn")};
  --warn-soft: ${g("--warn-soft")};

  /* 分類色（カテゴリ/勤務地のフォールバック） */
  --cat-1: ${g("--cat-1")};
  --cat-2: ${g("--cat-2")};
  --cat-3: ${g("--cat-3")};
  --cat-4: ${g("--cat-4")};
  --cat-5: ${g("--cat-5")};
  --cat-6: ${g("--cat-6")};
  --cat-uncat: ${g("--cat-uncat")};
}`;
  }, [values, radiusPx]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportCss);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [exportCss]);

  // ── 内部 UI は独立配色（生値・トークン非依存） ──
  const PANEL_BG = "#201d17";
  const FIELD_BG = "#15120e";
  const LINE = "#3a3429";
  const TXT = "#e8dfcd";
  const SUBTXT = "#9a8e78";
  const ACCENT = "#c75a34";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="配色調整ポータル（開発用）"
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          zIndex: 9999,
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1px solid ${LINE}`,
          background: PANEL_BG,
          color: TXT,
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        }}
      >
        🎨
      </button>
    );
  }

  const btnStyle: React.CSSProperties = {
    font: "inherit",
    fontSize: 12,
    border: `1px solid #4a4338`,
    background: "#2c281f",
    color: TXT,
    borderRadius: 6,
    padding: "7px 10px",
    cursor: "pointer",
  };

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 320,
        zIndex: 9999,
        background: PANEL_BG,
        color: TXT,
        borderRight: "1px solid #000",
        overflowY: "auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#1a1712",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          borderBottom: "1px solid #322c22",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>配色調整ポータル</div>
          <div style={{ fontSize: 10, color: SUBTXT }}>開発用 ・ index.css と同名トークン</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="閉じる"
          style={{
            ...btnStyle,
            marginLeft: "auto",
            width: 30,
            height: 30,
            padding: 0,
            fontSize: 15,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: "12px 14px 40px" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            color: SUBTXT,
            margin: "4px 0 8px",
            paddingBottom: 4,
            borderBottom: "1px solid #322c22",
          }}
        >
          プリセット（候補パターン）
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <button
            type="button"
            onClick={resetToCss}
            title="① 現状（案1 ウォーム＝index.css の採用色）に戻す"
            style={{ ...btnStyle, fontSize: 11, padding: "6px 9px" }}
          >
            ① 現状
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              title={`${p.label} を適用`}
              style={{ ...btnStyle, fontSize: 11, padding: "6px 9px" }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 10, color: SUBTXT, margin: "0 0 4px", lineHeight: 1.6 }}>
          適用後も各トークンを個別に微調整できます。気に入ったら「コピー」で index.css へ。
        </p>

        {ROWS.map((row, i) =>
          "group" in row ? (
            <div
              key={`g${i}`}
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                color: SUBTXT,
                margin: "16px 0 6px",
                paddingBottom: 4,
                borderBottom: "1px solid #322c22",
              }}
            >
              {row.group}
            </div>
          ) : (
            <TokenRow
              key={row.k}
              def={row}
              value={values[row.k] ?? "#000000"}
              baseValue={base.values[row.k] ?? "#000000"}
              onChange={(v) => setToken(row, v)}
              onReset={() => resetToken(row)}
              colors={{ FIELD_BG, LINE, TXT, ACCENT, SUBTXT }}
            />
          )
        )}

        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            color: SUBTXT,
            margin: "16px 0 6px",
            paddingBottom: 4,
            borderBottom: "1px solid #322c22",
          }}
        >
          角丸
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
          <span style={{ flex: 1, fontSize: 12, color: "#cabfa8" }}>--radius</span>
          <input
            type="range"
            min={0}
            max={16}
            step={1}
            value={radiusPx}
            onChange={(e) => onRadius(Number(e.target.value))}
            style={{ flex: 1, accentColor: ACCENT }}
          />
          <span style={{ fontSize: 11, color: SUBTXT, minWidth: 36, textAlign: "right" }}>
            {radiusPx}px
          </span>
          <ResetButton
            modified={radiusPx !== base.radiusPx}
            onClick={resetRadius}
            subtxt={SUBTXT}
            accent={ACCENT}
            title="角丸を index.css の値に戻す"
          />
        </div>

        <div style={{ marginTop: 18, borderTop: "1px solid #322c22", paddingTop: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              onClick={copy}
              style={{
                ...btnStyle,
                flex: 1,
                background: ACCENT,
                borderColor: ACCENT,
                color: "#fff",
              }}
            >
              {copied ? "コピーしました ✓" : "index.css をコピー"}
            </button>
            <button
              type="button"
              onClick={resetToCss}
              title="全トークンを index.css の採用色へ一括で戻し、保存値もクリアします"
              style={{ ...btnStyle, flex: 1 }}
            >
              全部デフォルトに戻す
            </button>
          </div>
          <textarea
            readOnly
            value={exportCss}
            spellCheck={false}
            style={{
              width: "100%",
              height: 150,
              fontFamily: "ui-monospace, monospace",
              fontSize: 10.5,
              lineHeight: 1.5,
              background: FIELD_BG,
              border: `1px solid ${LINE}`,
              color: "#c8bda4",
              borderRadius: 6,
              padding: 8,
              resize: "vertical",
            }}
          />
          <p style={{ fontSize: 10, color: SUBTXT, marginTop: 8, lineHeight: 1.6 }}>
            調整値はこのブラウザに保存され、リロードしても残ります。確定したら「コピー」して{" "}
            <code style={{ color: "#cabfa8" }}>src/index.css</code> の{" "}
            <code style={{ color: "#cabfa8" }}>:root</code> に貼り替えてください。
          </p>
        </div>
      </div>
    </aside>
  );
}

function ResetButton({
  modified,
  onClick,
  subtxt,
  accent,
  title,
}: {
  modified: boolean;
  onClick: () => void;
  subtxt: string;
  accent: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!modified}
      title={modified ? title : "変更なし（index.css の値）"}
      aria-label={title}
      style={{
        width: 24,
        height: 24,
        flex: "0 0 auto",
        padding: 0,
        border: "none",
        background: "none",
        borderRadius: 5,
        fontSize: 13,
        lineHeight: 1,
        color: modified ? accent : subtxt,
        opacity: modified ? 1 : 0.3,
        cursor: modified ? "pointer" : "default",
      }}
    >
      ↺
    </button>
  );
}

function TokenRow({
  def,
  value,
  baseValue,
  onChange,
  onReset,
  colors,
}: {
  def: TokenDef;
  value: string;
  baseValue: string;
  onChange: (v: string) => void;
  onReset: () => void;
  colors: { FIELD_BG: string; LINE: string; TXT: string; ACCENT: string; SUBTXT: string };
}) {
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const [prev, setPrev] = useState(value);

  // 親（「index.css に戻す」等）からの value 変化を取り込む（レンダー中調整パターン）
  if (value !== prev) {
    setPrev(value);
    setText(value);
    setInvalid(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <span style={{ flex: 1, fontSize: 12, color: "#cabfa8" }}>{def.label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => {
          const v = e.target.value.toLowerCase();
          setText(v);
          setInvalid(false);
          onChange(v);
        }}
        style={{
          width: 30,
          height: 26,
          padding: 0,
          border: `1px solid #4a4338`,
          borderRadius: 5,
          background: "none",
          cursor: "pointer",
        }}
      />
      <input
        type="text"
        value={text}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const norm = normHex(raw);
          if (norm) {
            setInvalid(false);
            onChange(norm);
          } else {
            setInvalid(true);
          }
        }}
        style={{
          width: 82,
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          textTransform: "lowercase",
          background: colors.FIELD_BG,
          border: `1px solid ${invalid ? "#c0492a" : colors.LINE}`,
          color: invalid ? "#e7a78f" : "#d8cdb6",
          borderRadius: 5,
          padding: "5px 6px",
          outline: "none",
        }}
      />
      <ResetButton
        modified={value !== baseValue}
        onClick={onReset}
        subtxt={colors.SUBTXT}
        accent={colors.ACCENT}
        title={`${def.label} を index.css の値に戻す`}
      />
    </div>
  );
}

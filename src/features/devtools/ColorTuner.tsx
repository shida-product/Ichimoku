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
  { group: "カテゴリ標準色" },
  { k: "--cat-jimu", label: "事務" },
  { k: "--cat-keiei", label: "経営" },
  { k: "--cat-saiyo", label: "採用" },
  { k: "--cat-mibun", label: "未分類" },
];

const TOKEN_DEFS = ROWS.filter((r): r is TokenDef => "k" in r);
const LS_KEY = "ichimoku-color-tuner-v1";

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
  --cat-jimu: ${g("--cat-jimu")};
  --cat-keiei: ${g("--cat-keiei")};
  --cat-saiyo: ${g("--cat-saiyo")};
  --cat-mibun: ${g("--cat-mibun")};
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
              onChange={(v) => setToken(row, v)}
              colors={{ FIELD_BG, LINE, TXT, ACCENT }}
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
            <button type="button" onClick={resetToCss} style={{ ...btnStyle, flex: 1 }}>
              index.css に戻す
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

function TokenRow({
  def,
  value,
  onChange,
  colors,
}: {
  def: TokenDef;
  value: string;
  onChange: (v: string) => void;
  colors: { FIELD_BG: string; LINE: string; TXT: string; ACCENT: string };
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
    </div>
  );
}

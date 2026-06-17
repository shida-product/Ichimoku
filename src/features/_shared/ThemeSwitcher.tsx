import { useLayoutEffect, useState } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * デザイン改修の比較用テーマ切替（DEV 専用）。
 * html[data-theme] を差し替えるだけで、配置を変えずに見た目を丸ごと比較できる。
 * 実体（配色・角丸・影・密度）は src/index.css の html[data-theme="…"] プリセット。
 * 正式採用が決まったら、本コンポーネントと CSS プリセットは撤去し採用値を :root へ昇格させる。
 */
const STORAGE_KEY = "ichimoku-theme-preview";

const THEMES: { id: string; label: string; hint: string }[] = [
  { id: "", label: "現状", hint: "Google（ベースライン）" },
  { id: "refined", label: "A 洗練", hint: "影と質感を整理したフラット" },
  { id: "soft", label: "B ソフト", hint: "大きめ角丸・柔らかい影・広め余白" },
  { id: "dense", label: "D 高密度", hint: "Linear 風・罫線中心・詰め" },
];

function applyTheme(id: string) {
  const root = document.documentElement;
  if (id) root.dataset.theme = id;
  else delete root.dataset.theme;
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  // 描画前にテーマを反映（ちらつき防止）。
  useLayoutEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage 不可環境は無視 */
    }
  }, [theme]);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2 shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
        <Palette className="size-3.5" />
        デザイン比較（DEV）
      </div>
      <div className="flex flex-col gap-1">
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              title={t.hint}
              className={cn(
                "flex w-44 cursor-pointer items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[12px] transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              <span className="font-medium">{t.label}</span>
              {active ? <span className="text-[10px]">●</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

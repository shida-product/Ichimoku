import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Category, EventItem, Task, TaskStatus } from "@/lib/types";

/**
 * AppDataContext — アプリの全データソース（現段階はメモリ内モック）。
 *
 * 目的: Supabase 配線前に全機能を目視チェックできるようにする。
 * 後で TanStack Query + Supabase に差し替える際も、この Context の
 * インターフェース（配列＋ミューテータ）を保てばコンポーネントは無改修で済む。
 */

function nowIso(): string {
  return new Date().toISOString();
}

interface AppDataContextValue {
  categories: Category[];
  tasks: Task[];
  events: EventItem[];

  // タスク（addTask は作成した id を返す＝下書きを即パネルで開くため）
  addTask: (input: { title: string; categoryId?: string | null }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, categoryId: string | null, status: TaskStatus) => void;

  // カテゴリ
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (id: string, direction: "up" | "down") => void;

  // 予定（addEvent は作成した id を返す）
  addEvent: (input: { title: string; startAt: string; endAt: string }) => string;
  updateEvent: (id: string, patch: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

// ── モック初期データ（基準日 2026-06-15 / src/lib/date.ts APP_TODAY） ──
const SEED_CATEGORIES: Category[] = [
  { id: "cat-jimu", name: "事務", position: "a1", color: "#6b7c93" },
  { id: "cat-keiei", name: "経営", position: "a2", color: "#8a6d3b" },
  { id: "cat-saiyo", name: "採用", position: "a3", color: "#7a5c8e" },
];

const SEED_TASKS: Task[] = [
  task("t1", null, "領収書をまとめる（未分類のサンプル）", "todo", "2026-06-18"),
  task("t2", "cat-jimu", "レセプト点検（5月分）", "todo", null),
  task("t3", "cat-jimu", "社会保険料の納付", "todo", "2026-06-17", "口座振替の残高確認", [
    { title: "年金事務所", url: "https://www.nenkin.go.jp/" },
  ]),
  task("t4", "cat-jimu", "請求書の発行（5件）", "doing", null),
  task("t5", "cat-jimu", "経費精算の締め", "done", null),
  task("t6", "cat-keiei", "決算準備（資料一式）", "todo", "2026-06-30"),
  task("t7", "cat-keiei", "月次レポート提出", "doing", "2026-06-20"),
  task("t8", "cat-keiei", "銀行面談の資料づくり", "doing", null),
  task("t9", "cat-saiyo", "薬剤師 面接の日程調整", "doing", null),
  task("t10", "cat-saiyo", "求人票の更新", "todo", null),
];

const SEED_EVENTS: EventItem[] = [
  ev("e1", "MR面談（恵比寿）", "2026-06-15T14:00", "2026-06-15T15:00"),
  ev("e2", "商工会 講演", "2026-06-15T16:00", "2026-06-15T17:30"),
  ev("e3", "店舗ミーティング", "2026-06-16T10:00", "2026-06-16T11:00"),
  ev("e4", "税理士 打ち合わせ", "2026-06-18T15:00", "2026-06-18T16:00"),
  ev("e5", "取引先 会食", "2026-06-19T19:00", "2026-06-19T21:00"),
];

function task(
  id: string,
  categoryId: string | null,
  title: string,
  status: TaskStatus,
  dueDate: string | null,
  description = "",
  links: Task["links"] = []
): Task {
  const ts = "2026-06-14T09:00:00.000Z";
  return {
    id,
    categoryId,
    title,
    description,
    links,
    status,
    position: id,
    dueDate,
    completedAt: status === "done" ? ts : null,
    archivedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

function ev(id: string, title: string, startAt: string, endAt: string): EventItem {
  return {
    id,
    title,
    startAt: `${startAt}:00`,
    endAt: `${endAt}:00`,
    allDay: false,
    location: null,
    notes: null,
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [events, setEvents] = useState<EventItem[]>(SEED_EVENTS);
  const seq = useRef(1000);
  const nextId = (prefix: string) => `${prefix}-${++seq.current}`;

  // ── タスク ──
  const addTask = useCallback<AppDataContextValue["addTask"]>((input) => {
    const id = nextId("t");
    const ts = nowIso();
    setTasks((prev) => [
      {
        id,
        categoryId: input.categoryId ?? null,
        title: input.title,
        description: "",
        links: [],
        status: "todo",
        position: id,
        dueDate: null,
        completedAt: null,
        archivedAt: null,
        createdAt: ts,
        updatedAt: ts,
      },
      ...prev,
    ]);
    return id;
  }, []);

  const updateTask = useCallback<AppDataContextValue["updateTask"]>((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch, updatedAt: nowIso() };
        // 完了/未完了の completedAt を整合させる
        if (patch.status && patch.status !== t.status) {
          next.completedAt = patch.status === "done" ? nowIso() : null;
        }
        return next;
      })
    );
  }, []);

  const deleteTask = useCallback<AppDataContextValue["deleteTask"]>((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const moveTask = useCallback<AppDataContextValue["moveTask"]>((id, categoryId, status) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, categoryId, status, updatedAt: nowIso() };
        next.completedAt = status === "done" ? (t.completedAt ?? nowIso()) : null;
        return next;
      })
    );
  }, []);

  // ── カテゴリ ──
  const addCategory = useCallback<AppDataContextValue["addCategory"]>((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = nextId("cat");
    setCategories((prev) => [
      ...prev,
      { id, name: trimmed, position: `z${prev.length}`, color: null },
    ]);
  }, []);

  const renameCategory = useCallback<AppDataContextValue["renameCategory"]>((id, name) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const deleteCategory = useCallback<AppDataContextValue["deleteCategory"]>((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    // 紐づくタスクは未分類へ（DB の on delete set null と同じ挙動）
    setTasks((prev) => prev.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)));
  }, []);

  const reorderCategory = useCallback<AppDataContextValue["reorderCategory"]>((id, direction) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next.map((c, i) => ({ ...c, position: `a${i}` }));
    });
  }, []);

  // ── 予定 ──
  const addEvent = useCallback<AppDataContextValue["addEvent"]>((input) => {
    const id = nextId("e");
    setEvents((prev) => [
      ...prev,
      {
        id,
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: false,
        location: null,
        notes: null,
      },
    ]);
    return id;
  }, []);

  const updateEvent = useCallback<AppDataContextValue["updateEvent"]>((id, patch) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const deleteEvent = useCallback<AppDataContextValue["deleteEvent"]>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      categories,
      tasks,
      events,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      addCategory,
      renameCategory,
      deleteCategory,
      reorderCategory,
      addEvent,
      updateEvent,
      deleteEvent,
    }),
    [
      categories,
      tasks,
      events,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      addCategory,
      renameCategory,
      deleteCategory,
      reorderCategory,
      addEvent,
      updateEvent,
      deleteEvent,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData は AppDataProvider 内で使用してください");
  return ctx;
}

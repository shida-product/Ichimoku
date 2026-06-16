import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { keyAfter, keyBefore, keyBetween } from "@/lib/order";
import { toLocalIso } from "@/lib/calendar";
import { IS_PREVIEW } from "@/lib/preview";
import { MOCK_CATEGORIES, MOCK_EVENTS, MOCK_TASKS } from "@/store/mockData";
import type { Category, EventItem, Task, TaskLink, TaskStatus } from "@/lib/types";

/**
 * AppDataContext — アプリの全データソース（Supabase + TanStack Query）。
 *
 * 設計の要:
 * - 公開インターフェース（配列＋同期ミューテータ）はモック実装時から不変。
 *   コンポーネントは無改修で動く。
 * - 永続化は Supabase。RLS（owner_id = auth.uid()）で自分のデータだけが見える。
 * - 追加系（addTask / addEvent）は id を **クライアントで生成**して即座に返す。
 *   楽観的更新でドラフトをその場で開けるようにするため（DB の default gen_random_uuid()
 *   は使わず、こちらで採番した UUID を明示的に挿入する）。
 * - 表示順は `position`（fractional index）昇順。`Lane` 等は配列順をそのまま描画するため、
 *   取得時も楽観的更新時も position で並べ替えてキャッシュと DB の順序を一致させる。
 */

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 完了タスクの自動アーカイブまでの日数（仕様 §3.1 / §5.1 の N）。
 * `status = 'done'` かつ `completed_at` がこの日数より前 → `archived_at` を立ててボードから畳む。
 * 仕様の未確定事項（例: 7日）に対し v1 の既定値として 7 日を採用。
 */
const ARCHIVE_AFTER_DAYS = 7;
const ARCHIVE_AFTER_MS = ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

function newId(): string {
  return crypto.randomUUID();
}

// ── 並べ替え用ヘルパー ──
function byPosition<T extends { position: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
}

function byStartAt(arr: EventItem[]): EventItem[] {
  return [...arr].sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));
}

// ── DB 行（snake_case）→ ドメイン型（camelCase）マッピング ──
interface CategoryRow {
  id: string;
  name: string;
  position: string;
  color: string | null;
}
interface TaskRow {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  links: TaskLink[] | null;
  status: TaskStatus;
  position: string;
  due_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
interface EventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  notes: string | null;
}

function rowToCategory(r: CategoryRow): Category {
  return { id: r.id, name: r.name, position: r.position, color: r.color };
}
function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    categoryId: r.category_id,
    title: r.title,
    description: r.description ?? "",
    links: r.links ?? [],
    status: r.status,
    position: r.position,
    dueDate: r.due_date,
    completedAt: r.completed_at,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function rowToEvent(r: EventRow): EventItem {
  return {
    id: r.id,
    title: r.title,
    startAt: toLocalIso(new Date(r.start_at)),
    endAt: toLocalIso(new Date(r.end_at)),
    allDay: r.all_day,
    location: r.location,
    notes: r.notes,
  };
}

// ── ドメイン型 → DB 行（挿入・更新用） ──
function taskToInsertRow(t: Task, ownerId: string): Record<string, unknown> {
  return {
    id: t.id,
    owner_id: ownerId,
    category_id: t.categoryId,
    title: t.title,
    description: t.description,
    links: t.links,
    status: t.status,
    position: t.position,
    due_date: t.dueDate,
    completed_at: t.completedAt,
    archived_at: t.archivedAt,
  };
}

/** updated_at は DB トリガーで自動更新するため送らない。 */
function taskPatchToRow(patch: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.links !== undefined) row.links = patch.links;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  if (patch.archivedAt !== undefined) row.archived_at = patch.archivedAt;
  return row;
}

function categoryPatchToRow(patch: Partial<Category>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.color !== undefined) row.color = patch.color;
  return row;
}

function eventToInsertRow(e: EventItem, ownerId: string): Record<string, unknown> {
  return {
    id: e.id,
    owner_id: ownerId,
    title: e.title,
    start_at: new Date(e.startAt).toISOString(),
    end_at: new Date(e.endAt).toISOString(),
    all_day: e.allDay,
    location: e.location,
    notes: e.notes,
  };
}

function eventPatchToRow(patch: Partial<EventItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.startAt !== undefined) row.start_at = new Date(patch.startAt).toISOString();
  if (patch.endAt !== undefined) row.end_at = new Date(patch.endAt).toISOString();
  if (patch.allDay !== undefined) row.all_day = patch.allDay;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.notes !== undefined) row.notes = patch.notes;
  return row;
}

/**
 * updateTask 用にパッチを正規化する。
 * - updatedAt は楽観表示用に現在時刻を入れる（DB 側はトリガー）。
 * - status が変わるのに completedAt が未指定なら、完了/未完了に応じて補完する。
 *   呼び出し側が completedAt を明示している場合は尊重する（reorder/move で既存値を保つため）。
 */
function normalizeTaskPatch(patch: Partial<Task>): Partial<Task> {
  const next: Partial<Task> = { ...patch, updatedAt: nowIso() };
  if (patch.status !== undefined && patch.completedAt === undefined) {
    next.completedAt = patch.status === "done" ? nowIso() : null;
  }
  return next;
}

// ── クエリ関数（RLS により自分の行だけが返る） ──
async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("position");
  if (error) throw error;
  return byPosition((data as CategoryRow[]).map(rowToCategory));
}
async function fetchTasks(): Promise<Task[]> {
  // アーカイブ済みはボード・締切レーンから除外（仕様 §5.1: archived_at is null）。
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .is("archived_at", null)
    .order("position");
  if (error) throw error;
  return byPosition((data as TaskRow[]).map(rowToTask));
}
async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase.from("events").select("*").order("start_at");
  if (error) throw error;
  return byStartAt((data as EventRow[]).map(rowToEvent));
}

/**
 * 単一キャッシュ向けの楽観的更新ハンドラ束。
 * onMutate でキャッシュを先に書き換え、onError でロールバック、onSettled で再取得して整合させる。
 */
function buildOptimistic<T, V>(
  qc: QueryClient,
  key: readonly unknown[],
  updater: (prev: T[], vars: V) => T[]
) {
  return {
    onMutate: async (vars: V) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<T[]>(key) ?? [];
      qc.setQueryData<T[]>(key, updater(prev, vars));
      return { prev };
    },
    onError: (_err: unknown, _vars: V, ctx: { prev: T[] } | undefined) => {
      if (ctx) qc.setQueryData<T[]>(key, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  };
}

interface AppDataContextValue {
  categories: Category[];
  tasks: Task[];
  events: EventItem[];

  // タスク（addTask は作成した id を返す＝下書きを即パネルで開くため）
  addTask: (input: { title: string; categoryId?: string | null }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  /** 完了タスクをアーカイブ（ボードから畳む）。自動アーカイブ・手動アーカイブ共通。 */
  archiveTask: (id: string) => void;
  moveTask: (id: string, categoryId: string | null, status: TaskStatus) => void;
  /** 並べ替え＋セル移動。beforeId の直前に挿入（null なら末尾） */
  reorderTask: (
    id: string,
    categoryId: string | null,
    status: TaskStatus,
    beforeId: string | null
  ) => void;

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

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const categoriesKey = ["categories", userId] as const;
  const tasksKey = ["tasks", userId] as const;
  const eventsKey = ["events", userId] as const;

  // プレビュー時はネットワークを止め、モックを初期データとして注入する。
  // 以降のミューテーションは Supabase を呼ばずキャッシュ上だけで完結するため、
  // 楽観的更新がそのまま「永続化」として残り、ログイン無しで全機能を触れる。
  const { data: categories = [] } = useQuery({
    queryKey: categoriesKey,
    queryFn: fetchCategories,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_CATEGORIES : undefined,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: tasksKey,
    queryFn: fetchTasks,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_TASKS : undefined,
  });
  const { data: events = [] } = useQuery({
    queryKey: eventsKey,
    queryFn: fetchEvents,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_EVENTS : undefined,
  });

  function requireOwner(): string {
    if (!userId) throw new Error("未認証のため保存できません");
    return userId;
  }

  // ── タスク mutations ──
  const addTaskMut = useMutation({
    mutationFn: async (t: Task) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("tasks").insert(taskToInsertRow(t, requireOwner()));
      if (error) throw error;
    },
    ...buildOptimistic<Task, Task>(qc, tasksKey, (prev, t) => byPosition([t, ...prev])),
  });

  const updateTaskMut = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<Task> }) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase
        .from("tasks")
        .update(taskPatchToRow(vars.patch))
        .eq("id", vars.id);
      if (error) throw error;
    },
    ...buildOptimistic<Task, { id: string; patch: Partial<Task> }>(qc, tasksKey, (prev, vars) =>
      byPosition(prev.map((t) => (t.id === vars.id ? { ...t, ...vars.patch } : t)))
    ),
  });

  const deleteTaskMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    ...buildOptimistic<Task, string>(qc, tasksKey, (prev, id) => prev.filter((t) => t.id !== id)),
  });

  const archiveTaskMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("tasks").update({ archived_at: nowIso() }).eq("id", id);
      if (error) throw error;
    },
    // アーカイブ＝ボードから畳む。楽観的にはキャッシュから取り除く（取得時に除外されるため）。
    ...buildOptimistic<Task, string>(qc, tasksKey, (prev, id) => prev.filter((t) => t.id !== id)),
  });

  const addTask = useCallback<AppDataContextValue["addTask"]>(
    (input) => {
      const ts = nowIso();
      // 新規タスクはセル先頭に来るよう、対象セル（未分類×未着手）の先頭より前の position を採番。
      const cell = byPosition(
        tasks.filter(
          (t) => (t.categoryId ?? null) === (input.categoryId ?? null) && t.status === "todo"
        )
      );
      const task: Task = {
        id: newId(),
        categoryId: input.categoryId ?? null,
        title: input.title,
        description: "",
        links: [],
        status: "todo",
        position: keyBefore(cell.length ? cell[0].position : null),
        dueDate: null,
        completedAt: null,
        archivedAt: null,
        createdAt: ts,
        updatedAt: ts,
      };
      addTaskMut.mutate(task);
      return task.id;
    },
    [addTaskMut, tasks]
  );

  const updateTask = useCallback<AppDataContextValue["updateTask"]>(
    (id, patch) => {
      updateTaskMut.mutate({ id, patch: normalizeTaskPatch(patch) });
    },
    [updateTaskMut]
  );

  const deleteTask = useCallback<AppDataContextValue["deleteTask"]>(
    (id) => {
      deleteTaskMut.mutate(id);
    },
    [deleteTaskMut]
  );

  const archiveTask = useCallback<AppDataContextValue["archiveTask"]>(
    (id) => {
      archiveTaskMut.mutate(id);
    },
    [archiveTaskMut]
  );

  // 自動アーカイブ: 完了から ARCHIVE_AFTER_DAYS 日経過した done タスクを畳む。
  // 仕様 §5.1「アプリ起動時のフィルタで簡易実装」に倣い、データ取得後（tasks 変化時）に走査する。
  // 楽観的にキャッシュから除かれるため、同一タスクを多重にアーカイブしない。
  // mutate は TanStack Query v5 で安定参照のため依存に含めても毎レンダーで再実行されない。
  const archiveMutate = archiveTaskMut.mutate;
  useEffect(() => {
    if (!userId) return;
    const now = Date.now();
    for (const t of tasks) {
      if (
        t.status === "done" &&
        t.archivedAt === null &&
        t.completedAt !== null &&
        now - new Date(t.completedAt).getTime() >= ARCHIVE_AFTER_MS
      ) {
        archiveMutate(t.id);
      }
    }
  }, [tasks, userId, archiveMutate]);

  const moveTask = useCallback<AppDataContextValue["moveTask"]>(
    (id, categoryId, status) => {
      const current = tasks.find((t) => t.id === id);
      const completedAt = status === "done" ? (current?.completedAt ?? nowIso()) : null;
      updateTask(id, { categoryId, status, completedAt });
    },
    [tasks, updateTask]
  );

  const reorderTask = useCallback<AppDataContextValue["reorderTask"]>(
    (id, categoryId, status, beforeId) => {
      // 移動先セル（自分自身を除く）を position 昇順で取り出し、挿入位置の前後から新 position を採番。
      const cell = byPosition(
        tasks.filter(
          (t) =>
            (t.categoryId ?? null) === (categoryId ?? null) && t.status === status && t.id !== id
        )
      );
      let position: string;
      if (!beforeId) {
        position = keyAfter(cell.length ? cell[cell.length - 1].position : null);
      } else {
        const idx = cell.findIndex((t) => t.id === beforeId);
        if (idx < 0) {
          position = keyAfter(cell.length ? cell[cell.length - 1].position : null);
        } else {
          const prev = idx > 0 ? cell[idx - 1] : null;
          position = keyBetween(prev?.position ?? null, cell[idx].position);
        }
      }
      const current = tasks.find((t) => t.id === id);
      const completedAt = status === "done" ? (current?.completedAt ?? nowIso()) : null;
      updateTask(id, { categoryId, status, position, completedAt });
    },
    [tasks, updateTask]
  );

  // ── カテゴリ mutations ──
  const addCategoryMut = useMutation({
    mutationFn: async (c: Category) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("categories").insert({
        id: c.id,
        owner_id: requireOwner(),
        name: c.name,
        position: c.position,
        color: c.color,
      });
      if (error) throw error;
    },
    ...buildOptimistic<Category, Category>(qc, categoriesKey, (prev, c) =>
      byPosition([...prev, c])
    ),
  });

  const updateCategoryMut = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<Category> }) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase
        .from("categories")
        .update(categoryPatchToRow(vars.patch))
        .eq("id", vars.id);
      if (error) throw error;
    },
    ...buildOptimistic<Category, { id: string; patch: Partial<Category> }>(
      qc,
      categoriesKey,
      (prev, vars) => byPosition(prev.map((c) => (c.id === vars.id ? { ...c, ...vars.patch } : c)))
    ),
  });

  const deleteCategoryMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_PREVIEW) return;
      // DB は tasks.category_id を on delete set null で未分類化する。
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    // categories と tasks の両キャッシュを楽観更新（紐づくタスクを未分類へ）。
    onMutate: async (id: string) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: categoriesKey }),
        qc.cancelQueries({ queryKey: tasksKey }),
      ]);
      const prevCategories = qc.getQueryData<Category[]>(categoriesKey) ?? [];
      const prevTasks = qc.getQueryData<Task[]>(tasksKey) ?? [];
      qc.setQueryData<Category[]>(
        categoriesKey,
        prevCategories.filter((c) => c.id !== id)
      );
      qc.setQueryData<Task[]>(
        tasksKey,
        prevTasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t))
      );
      return { prevCategories, prevTasks };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) {
        qc.setQueryData(categoriesKey, ctx.prevCategories);
        qc.setQueryData(tasksKey, ctx.prevTasks);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: categoriesKey });
      void qc.invalidateQueries({ queryKey: tasksKey });
    },
  });

  const addCategory = useCallback<AppDataContextValue["addCategory"]>(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const sorted = byPosition(categories);
      const category: Category = {
        id: newId(),
        name: trimmed,
        position: keyAfter(sorted.length ? sorted[sorted.length - 1].position : null),
        color: null,
      };
      addCategoryMut.mutate(category);
    },
    [addCategoryMut, categories]
  );

  const renameCategory = useCallback<AppDataContextValue["renameCategory"]>(
    (id, name) => {
      updateCategoryMut.mutate({ id, patch: { name } });
    },
    [updateCategoryMut]
  );

  const deleteCategory = useCallback<AppDataContextValue["deleteCategory"]>(
    (id) => {
      deleteCategoryMut.mutate(id);
    },
    [deleteCategoryMut]
  );

  const reorderCategory = useCallback<AppDataContextValue["reorderCategory"]>(
    (id, direction) => {
      const sorted = byPosition(categories);
      const idx = sorted.findIndex((c) => c.id === id);
      if (idx < 0) return;
      let position: string;
      if (direction === "up") {
        if (idx === 0) return;
        const above = sorted[idx - 1];
        const aboveAbove = idx - 2 >= 0 ? sorted[idx - 2] : null;
        position = keyBetween(aboveAbove?.position ?? null, above.position);
      } else {
        if (idx === sorted.length - 1) return;
        const below = sorted[idx + 1];
        const belowBelow = idx + 2 < sorted.length ? sorted[idx + 2] : null;
        position = keyBetween(below.position, belowBelow?.position ?? null);
      }
      updateCategoryMut.mutate({ id, patch: { position } });
    },
    [updateCategoryMut, categories]
  );

  // ── 予定 mutations ──
  const addEventMut = useMutation({
    mutationFn: async (e: EventItem) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("events").insert(eventToInsertRow(e, requireOwner()));
      if (error) throw error;
    },
    ...buildOptimistic<EventItem, EventItem>(qc, eventsKey, (prev, e) => byStartAt([...prev, e])),
  });

  const updateEventMut = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<EventItem> }) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase
        .from("events")
        .update(eventPatchToRow(vars.patch))
        .eq("id", vars.id);
      if (error) throw error;
    },
    ...buildOptimistic<EventItem, { id: string; patch: Partial<EventItem> }>(
      qc,
      eventsKey,
      (prev, vars) => byStartAt(prev.map((e) => (e.id === vars.id ? { ...e, ...vars.patch } : e)))
    ),
  });

  const deleteEventMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    ...buildOptimistic<EventItem, string>(qc, eventsKey, (prev, id) =>
      prev.filter((e) => e.id !== id)
    ),
  });

  const addEvent = useCallback<AppDataContextValue["addEvent"]>(
    (input) => {
      const event: EventItem = {
        id: newId(),
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: false,
        location: null,
        notes: null,
      };
      addEventMut.mutate(event);
      return event.id;
    },
    [addEventMut]
  );

  const updateEvent = useCallback<AppDataContextValue["updateEvent"]>(
    (id, patch) => {
      updateEventMut.mutate({ id, patch });
    },
    [updateEventMut]
  );

  const deleteEvent = useCallback<AppDataContextValue["deleteEvent"]>(
    (id) => {
      deleteEventMut.mutate(id);
    },
    [deleteEventMut]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      categories,
      tasks,
      events,
      addTask,
      updateTask,
      deleteTask,
      archiveTask,
      moveTask,
      reorderTask,
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
      archiveTask,
      moveTask,
      reorderTask,
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

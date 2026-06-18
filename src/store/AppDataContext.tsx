import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { keyAfter, keyBefore, keyBetween } from "@/lib/order";
import { toLocalIso } from "@/lib/calendar";
import { IS_PREVIEW } from "@/lib/preview";
import {
  MOCK_CATEGORIES,
  MOCK_EVENTS,
  MOCK_SHIFTS,
  MOCK_SHIFT_TYPES,
  MOCK_TASKS,
} from "@/store/mockData";
import type {
  Category,
  EventItem,
  Shift,
  ShiftType,
  Task,
  TaskLink,
  TaskStatus,
} from "@/lib/types";

/**
 * AppDataContext — アプリの全データソース（Supabase + TanStack Query）。
 *
 * 設計の要:
 * - 永続化は Supabase。RLS（owner_id = auth.uid()）で自分のデータだけが見える。
 * - 追加系（addTask / addEvent）は id を **クライアントで生成**して即座に返す
 *   （楽観的更新でドラフトをその場で開くため）。
 * - 表示順は `position`（fractional index）昇順。`Lane` 等は配列順をそのまま描画する。
 *
 * 画面構成見直し（案B / 完了即アーカイブ）:
 * - tasks クエリは **アーカイブ済みも含む全件**を1キャッシュに保持し、active / archived を
 *   メモ化で派生させる。完了＝`archived_at` を即セットしてボードから外し、完了履歴へ移す。
 * - ボードは状態で列分割しない単一リスト。`doing` は「対応中フラグ」を表す（列ではない）。
 * - 完了から PURGE_AFTER_DAYS 日経過した行は物理削除（DBからも消す）。
 */

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 完了（アーカイブ）から物理削除までの日数。
 * 完了ドロップで即アーカイブ（`archived_at` を立ててボードから外す）し、
 * その後この日数を過ぎた行は完了履歴からも消えて DB からも DELETE される。
 */
const PURGE_AFTER_DAYS = 30;
const PURGE_AFTER_MS = PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000;

function newId(): string {
  return crypto.randomUUID();
}

// ── 並べ替え用ヘルパー ──
// position 昇順。旧モデル（カテゴリ×状態スコープ）由来で position が重複しても
// 並びが決定的になるよう、同値時は id で安定ソートする（Codex P2）。
function byPosition<T extends { position: string; id: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) =>
    a.position < b.position
      ? -1
      : a.position > b.position
        ? 1
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0
  );
}

function byStartAt(arr: EventItem[]): EventItem[] {
  return [...arr].sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));
}

/** 完了履歴の並び: 完了日時の降順（新しい完了が先頭）。 */
function byCompletedDesc(arr: Task[]): Task[] {
  return [...arr].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
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
  due_time: string | null;
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
interface ShiftTypeRow {
  id: string;
  name: string;
  color: string | null;
  position: string;
}
interface ShiftRow {
  id: string;
  date: string;
  shift_type_id: string;
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
    dueTime: r.due_time,
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
function rowToShiftType(r: ShiftTypeRow): ShiftType {
  return { id: r.id, name: r.name, color: r.color, position: r.position };
}
function rowToShift(r: ShiftRow): Shift {
  return { id: r.id, date: r.date, shiftTypeId: r.shift_type_id };
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
    due_time: t.dueTime,
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
  if (patch.dueTime !== undefined) row.due_time = patch.dueTime;
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

function shiftTypePatchToRow(patch: Partial<ShiftType>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.position !== undefined) row.position = patch.position;
  return row;
}

/**
 * updateTask 用にパッチを正規化する。
 * - updatedAt は楽観表示用に現在時刻を入れる（DB 側はトリガー）。
 * - status が変わるのに completedAt が未指定なら、完了/未完了に応じて補完する。
 *   呼び出し側が completedAt を明示している場合は尊重する。
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
  // アーカイブ済みも含む全件を取得し、active / archived は呼び出し側で派生する。
  // （完了は即アーカイブ＋30日で物理削除するため、アーカイブ件数は高々30日分に収まる）
  const { data, error } = await supabase.from("tasks").select("*").order("position");
  if (error) throw error;
  return byPosition((data as TaskRow[]).map(rowToTask));
}
async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase.from("events").select("*").order("start_at");
  if (error) throw error;
  return byStartAt((data as EventRow[]).map(rowToEvent));
}
async function fetchShiftTypes(): Promise<ShiftType[]> {
  const { data, error } = await supabase.from("shift_types").select("*").order("position");
  if (error) throw error;
  return byPosition((data as ShiftTypeRow[]).map(rowToShiftType));
}
async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await supabase.from("shifts").select("*").order("date");
  if (error) throw error;
  return (data as ShiftRow[]).map(rowToShift);
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
      // 楽観更新は同期で先に書く（cancelQueries の await より前）。
      // await を先に置くとキャッシュ反映が 1 マイクロタスク遅れ、イベントハンドラが
      // 古いデータで 1 フレーム描画する＝完了ドロップやカテゴリ D&D で「一瞬戻る」原因になる。
      const prev = qc.getQueryData<T[]>(key) ?? [];
      qc.setQueryData<T[]>(key, updater(prev, vars));
      // 反映後に in-flight の再取得を止めて楽観値の上書きを防ぐ（onSettled で最終整合）。
      await qc.cancelQueries({ queryKey: key });
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
  /** ボード・締切レーン向けの非アーカイブタスク。 */
  tasks: Task[];
  /** 完了履歴向け（アーカイブ済み）タスク。完了日時の降順。 */
  archivedTasks: Task[];
  events: EventItem[];
  shiftTypes: ShiftType[];
  shifts: Shift[];

  // タスク（addTask は作成した id を返す＝下書きを即パネルで開くため）
  addTask: (input: { title: string; categoryId?: string | null }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  /** 完了＝即アーカイブ（status=done / completed_at・archived_at を立ててボードから外す）。 */
  completeTask: (id: string) => void;
  /** 完了の取り消し（未着手へ戻す。完了履歴・undo トーストから呼ぶ）。 */
  uncompleteTask: (id: string) => void;
  /** 並べ替え＋カテゴリ移動。beforeId の直前に挿入（null なら末尾）。状態は保持。 */
  reorderTask: (id: string, categoryId: string | null, beforeId: string | null) => void;

  // カテゴリ
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (id: string, direction: "up" | "down") => void;
  /** カテゴリを beforeId の直前へ移動（末尾は beforeId=null）。ボードの列 D&D 用。 */
  moveCategoryBefore: (id: string, beforeId: string | null) => void;
  /** カテゴリ色（パレットのスロットキー "cat-N" or null=自動）を設定。 */
  setCategoryColor: (id: string, color: string | null) => void;

  // 予定（addEvent は作成した id を返す）
  addEvent: (input: {
    title: string;
    startAt: string;
    endAt: string;
    allDay?: boolean;
    location?: string | null;
    notes?: string | null;
  }) => string;
  updateEvent: (id: string, patch: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;

  // シフト（勤務地）
  addShiftType: (name: string) => void;
  updateShiftType: (id: string, patch: Partial<ShiftType>) => void;
  deleteShiftType: (id: string) => void;
  reorderShiftType: (id: string, direction: "up" | "down") => void;
  /** 指定日のシフトを設定（shiftTypeId=null で解除）。1日1件。 */
  setShift: (date: string, shiftTypeId: string | null) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const categoriesKey = ["categories", userId] as const;
  const tasksKey = ["tasks", userId] as const;
  const eventsKey = ["events", userId] as const;
  const shiftTypesKey = ["shiftTypes", userId] as const;
  const shiftsKey = ["shifts", userId] as const;

  // プレビュー時はネットワークを止め、モックを初期データとして注入する。
  const { data: allTasks = [] } = useQuery({
    queryKey: tasksKey,
    queryFn: fetchTasks,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_TASKS : undefined,
  });
  const { data: categories = [] } = useQuery({
    queryKey: categoriesKey,
    queryFn: fetchCategories,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_CATEGORIES : undefined,
  });
  const { data: events = [] } = useQuery({
    queryKey: eventsKey,
    queryFn: fetchEvents,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_EVENTS : undefined,
  });
  const { data: shiftTypes = [] } = useQuery({
    queryKey: shiftTypesKey,
    queryFn: fetchShiftTypes,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_SHIFT_TYPES : undefined,
  });
  const { data: shifts = [] } = useQuery({
    queryKey: shiftsKey,
    queryFn: fetchShifts,
    enabled: !IS_PREVIEW && !!userId,
    initialData: IS_PREVIEW ? MOCK_SHIFTS : undefined,
  });

  // active（ボード・締切レーン用）と archived（完了履歴用）を派生。
  // active = 未完了かつ未アーカイブ。旧データ（status='done' だが archived_at 未設定）が
  // 単一リストのボードに復活しないよう、done も明示的に除外する（Codex P1）。
  const tasks = useMemo(
    () => allTasks.filter((t) => t.status !== "done" && t.archivedAt === null),
    [allTasks]
  );
  // 完了履歴 = 完了（done）。旧データ含め done を完了として集約する。
  const archivedTasks = useMemo(
    () => byCompletedDesc(allTasks.filter((t) => t.status === "done")),
    [allTasks]
  );

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

  const addTask = useCallback<AppDataContextValue["addTask"]>(
    (input) => {
      const ts = nowIso();
      // 新規タスクはカテゴリ列の先頭に来るよう、その（active）リストの先頭より前の position を採番。
      const cell = byPosition(
        tasks.filter((t) => (t.categoryId ?? null) === (input.categoryId ?? null))
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
        dueTime: null,
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

  const completeTask = useCallback<AppDataContextValue["completeTask"]>(
    (id) => {
      const ts = nowIso();
      // 完了＝即アーカイブ。completedAt・archivedAt を明示して normalize の補完を抑止する。
      updateTaskMut.mutate({
        id,
        patch: { status: "done", completedAt: ts, archivedAt: ts, updatedAt: ts },
      });
    },
    [updateTaskMut]
  );

  const uncompleteTask = useCallback<AppDataContextValue["uncompleteTask"]>(
    (id) => {
      updateTaskMut.mutate({
        id,
        patch: { status: "todo", completedAt: null, archivedAt: null, updatedAt: nowIso() },
      });
    },
    [updateTaskMut]
  );

  // 物理削除 sweep: 完了（アーカイブ）から PURGE_AFTER_DAYS 日を過ぎた行を DB からも削除。
  // tasks 取得後（archivedTasks 変化時）に走査する。delete の楽観更新でキャッシュから除かれ多重実行を防ぐ。
  const purgeMutate = deleteTaskMut.mutate;
  useEffect(() => {
    if (!userId && !IS_PREVIEW) return;
    const now = Date.now();
    for (const t of archivedTasks) {
      // 旧 done 行（archived_at 未設定）は completed_at を基準に判定する。
      const since = t.archivedAt ?? t.completedAt;
      if (since && now - new Date(since).getTime() >= PURGE_AFTER_MS) {
        purgeMutate(t.id);
      }
    }
  }, [archivedTasks, userId, purgeMutate]);

  const reorderTask = useCallback<AppDataContextValue["reorderTask"]>(
    (id, categoryId, beforeId) => {
      // 移動先カテゴリの active タスク（自分を除く）を position 昇順で取り出し、挿入位置から新 position を採番。
      const cell = byPosition(
        tasks.filter((t) => (t.categoryId ?? null) === (categoryId ?? null) && t.id !== id)
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
      // 状態（未着手/対応中フラグ）は保持。カテゴリと並び順だけ更新する。
      updateTask(id, { categoryId, position });
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

  const setCategoryColor = useCallback<AppDataContextValue["setCategoryColor"]>(
    (id, color) => {
      updateCategoryMut.mutate({ id, patch: { color } });
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

  const moveCategoryBefore = useCallback<AppDataContextValue["moveCategoryBefore"]>(
    (id, beforeId) => {
      // 自分を除いた現在の並び（position 昇順）に対し、beforeId の直前へ挿入する position を採番。
      const rest = byPosition(categories.filter((c) => c.id !== id));
      let position: string;
      if (!beforeId) {
        position = keyAfter(rest.length ? rest[rest.length - 1].position : null);
      } else {
        const idx = rest.findIndex((c) => c.id === beforeId);
        if (idx < 0) {
          position = keyAfter(rest.length ? rest[rest.length - 1].position : null);
        } else {
          const prev = idx > 0 ? rest[idx - 1] : null;
          position = keyBetween(prev?.position ?? null, rest[idx].position);
        }
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
        allDay: input.allDay ?? false,
        location: input.location ?? null,
        notes: input.notes ?? null,
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

  // ── シフト種別（マスタ）mutations ──
  const addShiftTypeMut = useMutation({
    mutationFn: async (s: ShiftType) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("shift_types").insert({
        id: s.id,
        owner_id: requireOwner(),
        name: s.name,
        color: s.color,
        position: s.position,
      });
      if (error) throw error;
    },
    ...buildOptimistic<ShiftType, ShiftType>(qc, shiftTypesKey, (prev, s) =>
      byPosition([...prev, s])
    ),
  });

  const updateShiftTypeMut = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<ShiftType> }) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase
        .from("shift_types")
        .update(shiftTypePatchToRow(vars.patch))
        .eq("id", vars.id);
      if (error) throw error;
    },
    ...buildOptimistic<ShiftType, { id: string; patch: Partial<ShiftType> }>(
      qc,
      shiftTypesKey,
      (prev, vars) => byPosition(prev.map((s) => (s.id === vars.id ? { ...s, ...vars.patch } : s)))
    ),
  });

  const deleteShiftTypeMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_PREVIEW) return;
      // DB は shifts を on delete cascade で消す。
      const { error } = await supabase.from("shift_types").delete().eq("id", id);
      if (error) throw error;
    },
    // shift_types と shifts の両キャッシュを楽観更新（その種別の割当も消す）。
    onMutate: async (id: string) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: shiftTypesKey }),
        qc.cancelQueries({ queryKey: shiftsKey }),
      ]);
      const prevTypes = qc.getQueryData<ShiftType[]>(shiftTypesKey) ?? [];
      const prevShifts = qc.getQueryData<Shift[]>(shiftsKey) ?? [];
      qc.setQueryData<ShiftType[]>(
        shiftTypesKey,
        prevTypes.filter((s) => s.id !== id)
      );
      qc.setQueryData<Shift[]>(
        shiftsKey,
        prevShifts.filter((s) => s.shiftTypeId !== id)
      );
      return { prevTypes, prevShifts };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) {
        qc.setQueryData(shiftTypesKey, ctx.prevTypes);
        qc.setQueryData(shiftsKey, ctx.prevShifts);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: shiftTypesKey });
      void qc.invalidateQueries({ queryKey: shiftsKey });
    },
  });

  const addShiftType = useCallback<AppDataContextValue["addShiftType"]>(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const sorted = byPosition(shiftTypes);
      const shiftType: ShiftType = {
        id: newId(),
        name: trimmed,
        color: null,
        position: keyAfter(sorted.length ? sorted[sorted.length - 1].position : null),
      };
      addShiftTypeMut.mutate(shiftType);
    },
    [addShiftTypeMut, shiftTypes]
  );

  const updateShiftType = useCallback<AppDataContextValue["updateShiftType"]>(
    (id, patch) => {
      updateShiftTypeMut.mutate({ id, patch });
    },
    [updateShiftTypeMut]
  );

  const deleteShiftType = useCallback<AppDataContextValue["deleteShiftType"]>(
    (id) => {
      deleteShiftTypeMut.mutate(id);
    },
    [deleteShiftTypeMut]
  );

  const reorderShiftType = useCallback<AppDataContextValue["reorderShiftType"]>(
    (id, direction) => {
      const sorted = byPosition(shiftTypes);
      const idx = sorted.findIndex((s) => s.id === id);
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
      updateShiftTypeMut.mutate({ id, patch: { position } });
    },
    [updateShiftTypeMut, shiftTypes]
  );

  // ── シフト割当 mutations ──
  const addShiftMut = useMutation({
    mutationFn: async (s: Shift) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("shifts").insert({
        id: s.id,
        owner_id: requireOwner(),
        date: s.date,
        shift_type_id: s.shiftTypeId,
      });
      if (error) throw error;
    },
    ...buildOptimistic<Shift, Shift>(qc, shiftsKey, (prev, s) => [...prev, s]),
  });

  const updateShiftMut = useMutation({
    mutationFn: async (vars: { id: string; shiftTypeId: string }) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase
        .from("shifts")
        .update({ shift_type_id: vars.shiftTypeId })
        .eq("id", vars.id);
      if (error) throw error;
    },
    ...buildOptimistic<Shift, { id: string; shiftTypeId: string }>(qc, shiftsKey, (prev, vars) =>
      prev.map((s) => (s.id === vars.id ? { ...s, shiftTypeId: vars.shiftTypeId } : s))
    ),
  });

  const deleteShiftMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_PREVIEW) return;
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    ...buildOptimistic<Shift, string>(qc, shiftsKey, (prev, id) => prev.filter((s) => s.id !== id)),
  });

  const setShift = useCallback<AppDataContextValue["setShift"]>(
    (date, shiftTypeId) => {
      const existing = shifts.find((s) => s.date === date);
      if (shiftTypeId === null) {
        if (existing) deleteShiftMut.mutate(existing.id);
        return;
      }
      if (existing) {
        if (existing.shiftTypeId !== shiftTypeId)
          updateShiftMut.mutate({ id: existing.id, shiftTypeId });
      } else {
        addShiftMut.mutate({ id: newId(), date, shiftTypeId });
      }
    },
    [shifts, addShiftMut, updateShiftMut, deleteShiftMut]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      categories,
      tasks,
      archivedTasks,
      events,
      shiftTypes,
      shifts,
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      uncompleteTask,
      reorderTask,
      addCategory,
      renameCategory,
      deleteCategory,
      reorderCategory,
      moveCategoryBefore,
      setCategoryColor,
      addEvent,
      updateEvent,
      deleteEvent,
      addShiftType,
      updateShiftType,
      deleteShiftType,
      reorderShiftType,
      setShift,
    }),
    [
      categories,
      tasks,
      archivedTasks,
      events,
      shiftTypes,
      shifts,
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      uncompleteTask,
      reorderTask,
      addCategory,
      renameCategory,
      deleteCategory,
      reorderCategory,
      moveCategoryBefore,
      setCategoryColor,
      addEvent,
      updateEvent,
      deleteEvent,
      addShiftType,
      updateShiftType,
      deleteShiftType,
      reorderShiftType,
      setShift,
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

import { useAppData } from "@/store/AppDataContext";
import { ManageListPanel } from "@/features/_shared/ManageListPanel";

/** カテゴリ管理（side-peek・共通枠）。作成・リネーム・並べ替え・削除。 */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const {
    categories,
    tasks,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategory,
    setCategoryColor,
  } = useAppData();

  const countOf = (id: string) => tasks.filter((t) => t.categoryId === id).length;

  return (
    <ManageListPanel
      label="カテゴリ管理"
      addPlaceholder="新しいカテゴリ名"
      emptyMessage="カテゴリがありません。上から追加できます。"
      footer="削除したカテゴリのタスクは「未分類」へ移動します（破棄されません）。"
      items={categories}
      countOf={countOf}
      onAdd={addCategory}
      onRename={renameCategory}
      onColorChange={setCategoryColor}
      onDelete={deleteCategory}
      onReorder={reorderCategory}
      onClose={onClose}
    />
  );
}

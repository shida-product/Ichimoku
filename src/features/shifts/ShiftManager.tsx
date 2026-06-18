import { useAppData } from "@/store/AppDataContext";
import { ManageListPanel } from "@/features/_shared/ManageListPanel";

/** 勤務地（シフト種別）管理。作成・リネーム・色変更・並べ替え・削除。カテゴリ管理と同型。 */
export function ShiftManager({ onClose }: { onClose: () => void }) {
  const { shiftTypes, shifts, addShiftType, updateShiftType, deleteShiftType, reorderShiftType } =
    useAppData();

  const countOf = (id: string) => shifts.filter((s) => s.shiftTypeId === id).length;

  return (
    <ManageListPanel
      label="勤務地管理"
      addPlaceholder="新しい勤務地名（例: 渋谷店 / 休み）"
      emptyMessage="勤務地がありません。上から追加できます。"
      footer="削除すると、その勤務地が割り当てられていた日の設定も外れます。"
      items={shiftTypes}
      countOf={countOf}
      onAdd={addShiftType}
      onRename={(id, name) => updateShiftType(id, { name })}
      onColorChange={(id, color) => updateShiftType(id, { color })}
      onDelete={deleteShiftType}
      onReorder={reorderShiftType}
      onClose={onClose}
    />
  );
}

import type { PlayerAttributeGroup } from "@/modules/players/domain/player.types";
import { getAttributeGroupState } from "./player-detail-model";

type AttributeTableProps = {
  groups: PlayerAttributeGroup[];
};

export function AttributeTable({ groups }: AttributeTableProps) {
  const state = getAttributeGroupState(groups);

  if (state.isEmpty) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
        {state.message}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {state.visibleGroups.map((group) => (
        <div key={group.category} className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold text-white">{group.label}</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-2">Attribut</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Wert</th>
                </tr>
              </thead>
              <tbody>
                {group.attributes.map((attribute) => (
                  <tr key={attribute.code} className="border-t border-white/8">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-white">{attribute.name}</p>
                      {attribute.description ? (
                        <p className="mt-1 text-xs text-slate-500">{attribute.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">{attribute.code}</td>
                    <td className="px-3 py-2 text-lg font-semibold text-emerald-100">
                      {attribute.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type ChecklistState = Record<string, boolean>;

export const CHECKLIST_ITEMS = [
  { key: "pneus", label: "Pneus (calibragem e estado)" },
  { key: "luzes", label: "Luzes e faróis" },
  { key: "combustivel", label: "Nível de combustível" },
  { key: "oleo", label: "Nível de óleo" },
  { key: "agua", label: "Nível de água/arrefecimento" },
  { key: "freios", label: "Freios" },
  { key: "documentacao", label: "Documentação a bordo" },
  { key: "lataria", label: "Lataria sem avarias" },
] as const;

export function Checklist({
  value,
  onChange,
  title = "Check-list do veículo",
}: {
  value: ChecklistState;
  onChange: (v: ChecklistState) => void;
  title?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border p-3">
        {CHECKLIST_ITEMS.map((it) => (
          <label key={it.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={!!value[it.key]}
              onCheckedChange={(c) => onChange({ ...value, [it.key]: c === true })}
            />
            <Label className="cursor-pointer font-normal">{it.label}</Label>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ChecklistSummary({ value }: { value: ChecklistState | null | undefined }) {
  if (!value) return null;
  const done = CHECKLIST_ITEMS.filter((i) => value[i.key]);
  const missing = CHECKLIST_ITEMS.filter((i) => !value[i.key]);
  return (
    <div className="text-sm space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">Check-list</p>
      <p className="text-brand-green">✓ {done.map((d) => d.label.split(" ")[0]).join(", ") || "—"}</p>
      {missing.length > 0 && (
        <p className="text-brand-orange">
          ⚠ Pendentes: {missing.map((d) => d.label.split(" ")[0]).join(", ")}
        </p>
      )}
    </div>
  );
}
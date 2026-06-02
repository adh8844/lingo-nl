import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export function useSortable<T, K extends string>(rows: T[], initialKey: K, initialDir: SortDir = "asc") {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb), "nl", { sensitivity: "base" });
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [rows, sortKey, sortDir]);

  const toggle = (key: K) => {
    if (key === sortKey) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  return { sorted, sortKey, sortDir, toggle };
}

export function SortHeader<K extends string>({
  label, k, sortKey, sortDir, onToggle, className, align = "left",
}: {
  label: string; k: K; sortKey: K; sortDir: SortDir;
  onToggle: (k: K) => void; className?: string; align?: "left" | "right" | "center";
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn(
        "py-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground select-none cursor-pointer hover:text-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      onClick={() => onToggle(k)}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "justify-end w-full")}>
        {label}
        <Icon className={cn("w-3 h-3", active ? "text-primary" : "opacity-50")} />
      </span>
    </th>
  );
}

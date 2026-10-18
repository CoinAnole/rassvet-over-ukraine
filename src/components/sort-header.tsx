import { nextColumnSort, type ColumnSort } from "@/lib/catalog/table-sort";

export function SortHeader<K extends string>({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: K;
  sort: ColumnSort<K> | null;
  onSort: (next: ColumnSort<K>) => void;
}) {
  const active = sort?.key === column;
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort} className="px-3 py-2 font-medium">
      <button
        type="button"
        className="inline-flex items-center gap-1 bg-transparent p-0 text-left uppercase tracking-[0.12em] text-inherit hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        onClick={() => onSort(nextColumnSort(sort, column))}
      >
        {label}
        <span aria-hidden="true" className="inline-block w-3 text-[10px] text-fg">
          {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

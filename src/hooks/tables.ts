import { useEffect } from "react";

type Task = {
  id: string;
  title: string;
  type: string;
};

type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

export const usePaginationSelection = <T>(
  paginatedRows: T[][],
  selectAll: boolean,
  setSelectedRows: (rows: boolean[]) => void
) => {
  useEffect(() => {
    setSelectedRows(new Array(paginatedRows.length).fill(selectAll));
  }, [paginatedRows, selectAll, setSelectedRows]);
};

export const useClickOutside = (
  ref: React.RefObject<HTMLElement>,
  onOutsideClick: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, onOutsideClick]);
};

export const useAllRowsSelected = (
  columns: Column[],
  filterTasks: (column: Column) => Task[],
  selectedRows: Set<string>,
  setIsAllSelected: React.Dispatch<React.SetStateAction<boolean>>
) => {
  useEffect(() => {
    const allTaskIds = columns.flatMap((column) =>
      filterTasks(column).map((task) => task.id)
    );
    const allSelected = allTaskIds.every((id) => selectedRows.has(id));
    setIsAllSelected(allSelected);
  }, [columns, filterTasks, selectedRows, setIsAllSelected]);
};

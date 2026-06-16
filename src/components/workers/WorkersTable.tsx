import { useMemo, useState } from "react";
import { Check, LogIn01, LogOut01, Minus, X } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";

const PAGE_SIZE = 8;

type WorkerStatus = "active" | "inactive";
type WorkerDiscipline = "excellent" | "good" | "fair" | "poor" | "warning";
type AttendanceState = "checked_in" | "checked_out" | "not_checked_in";

export interface WorkerTableItem {
  id?: number;
  _id?: string;
  name: string;
  businessType?: string;
  phone?: string;
  email?: string;
  notes?: string;
  workerStatus?: WorkerStatus;
  discipline?: WorkerDiscipline;
  lastCheckIn?: string;
  lastCheckOut?: string;
}

interface WorkersTableProps {
  workers: WorkerTableItem[];
  labels: {
    name: string;
    role: string;
    status: string;
    discipline: string;
    attendance: string;
    actions: string;
    edit: string;
    delete: string;
    active: string;
    inactive: string;
    worker: string;
    checkIn: string;
    checkOut: string;
    attendanceCheckedIn: string;
    attendanceCheckedOut: string;
    attendanceNotCheckedIn: string;
    disciplineLabels: Record<WorkerDiscipline, string>;
  };
  deletingWorkerId: string | null;
  attendanceWorkerId: string | null;
  getWorkerId: (worker: WorkerTableItem) => string;
  getAttendanceState: (worker: WorkerTableItem) => AttendanceState;
  onEdit: (worker: WorkerTableItem) => void;
  onDelete: (worker: WorkerTableItem) => void;
  onAttendance: (worker: WorkerTableItem, type: "checkIn" | "checkOut") => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type WorkerRow = WorkerTableItem & { tableId: string };

export function WorkersTable({
  workers,
  labels,
  deletingWorkerId,
  attendanceWorkerId,
  getWorkerId,
  getAttendanceState,
  onEdit,
  onDelete,
  onAttendance,
}: WorkersTableProps) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [page, setPage] = useState(1);

  const rows = useMemo<WorkerRow[]>(
    () =>
      workers.map((worker) => ({
        ...worker,
        tableId: getWorkerId(worker) || worker.name,
      })),
    [workers, getWorkerId],
  );

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const column = String(sortDescriptor.column);
    const dir = sortDescriptor.direction === "descending" ? -1 : 1;

    list.sort((a, b) => {
      if (column === "name") {
        return dir * (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
      }
      if (column === "role") {
        return (
          dir *
          (a.businessType || labels.worker).localeCompare(b.businessType || labels.worker, undefined, {
            sensitivity: "base",
          })
        );
      }
      if (column === "status") {
        const aActive = a.workerStatus !== "inactive" ? 1 : 0;
        const bActive = b.workerStatus !== "inactive" ? 1 : 0;
        return dir * (aActive - bActive);
      }
      if (column === "discipline") {
        const order: WorkerDiscipline[] = ["excellent", "good", "fair", "poor", "warning"];
        return dir * (order.indexOf(a.discipline || "good") - order.indexOf(b.discipline || "good"));
      }
      if (column === "attendance") {
        const order: AttendanceState[] = ["checked_in", "checked_out", "not_checked_in"];
        return dir * (order.indexOf(getAttendanceState(a)) - order.indexOf(getAttendanceState(b)));
      }
      return 0;
    });

    return list;
  }, [rows, sortDescriptor, labels.worker, getAttendanceState]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <TableCard.Root>
      <Table
        aria-label={labels.worker}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
      >
        <Table.Header>
          <Table.Head id="name" label={labels.name} isRowHeader allowsSorting />
          <Table.Head id="role" label={labels.role} allowsSorting />
          <Table.Head id="status" label={labels.status} allowsSorting />
          <Table.Head id="attendance" label={labels.attendance} allowsSorting />
          <Table.Head id="discipline" label={labels.discipline} allowsSorting className="hidden xl:table-cell" />
          <Table.Head id="actions" />
        </Table.Header>
        <Table.Body items={pageRows}>
          {(item) => {
            const id = getWorkerId(item);
            const isDeleting = deletingWorkerId === id;
            const isActive = item.workerStatus !== "inactive";
            const discipline = item.discipline || "good";
            const attendanceState = getAttendanceState(item);
            const isCheckingIn = attendanceWorkerId === `${id}-checkIn`;
            const isCheckingOut = attendanceWorkerId === `${id}-checkOut`;
            const canCheckIn = attendanceState !== "checked_in";
            const canCheckOut = attendanceState === "checked_in";

            return (
              <Table.Row id={item.tableId}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <Avatar initials={getInitials(item.name)} alt={item.name} size="md" />
                    <div className="min-w-0 whitespace-nowrap">
                      <p className="text-sm font-medium text-primary">{item.name}</p>
                      <p className="text-sm text-tertiary truncate max-w-[220px]">
                        {item.email || item.phone || labels.worker}
                      </p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {item.businessType || labels.worker}
                </Table.Cell>
                <Table.Cell>
                  {isActive ? (
                    <BadgeWithIcon size="sm" color="success" iconLeading={Check} className="capitalize">
                      {labels.active}
                    </BadgeWithIcon>
                  ) : (
                    <BadgeWithIcon size="sm" color="gray" iconLeading={X} className="capitalize">
                      {labels.inactive}
                    </BadgeWithIcon>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {attendanceState === "checked_in" ? (
                      <BadgeWithIcon size="sm" color="success" iconLeading={Check}>
                        {labels.attendanceCheckedIn}
                      </BadgeWithIcon>
                    ) : attendanceState === "checked_out" ? (
                      <BadgeWithIcon size="sm" color="gray" iconLeading={Minus}>
                        {labels.attendanceCheckedOut}
                      </BadgeWithIcon>
                    ) : (
                      <BadgeWithIcon size="sm" color="warning" iconLeading={X}>
                        {labels.attendanceNotCheckedIn}
                      </BadgeWithIcon>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        color="secondary"
                        iconLeading={LogIn01}
                        isDisabled={!canCheckIn || isCheckingIn}
                        isLoading={isCheckingIn}
                        onPress={() => onAttendance(item, "checkIn")}
                      >
                        {labels.checkIn}
                      </Button>
                      <Button
                        size="sm"
                        color="secondary"
                        iconLeading={LogOut01}
                        isDisabled={!canCheckOut || isCheckingOut}
                        isLoading={isCheckingOut}
                        onPress={() => onAttendance(item, "checkOut")}
                      >
                        {labels.checkOut}
                      </Button>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="hidden xl:table-cell whitespace-nowrap">
                  <BadgeWithIcon size="sm" color="gray" className="capitalize">
                    {labels.disciplineLabels[discipline]}
                  </BadgeWithIcon>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      size="sm"
                      color="link-gray"
                      isDisabled={isDeleting}
                      isLoading={isDeleting}
                      onPress={() => void onDelete(item)}
                    >
                      {labels.delete}
                    </Button>
                    <Button size="sm" color="link-color" onPress={() => onEdit(item)}>
                      {labels.edit}
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            );
          }}
        </Table.Body>
      </Table>
      {totalPages > 1 ? (
        <PaginationPageMinimalCenter
          page={currentPage}
          total={totalPages}
          onPageChange={setPage}
          className="px-4 py-3 md:px-6 md:pt-3 md:pb-4"
        />
      ) : null}
    </TableCard.Root>
  );
}

"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, RefreshCw, ScanSearch, Trash2 } from "lucide-react";
import { librariesApi, scansApi } from "@/lib/api";
import type { LibraryRead } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { useRequirePermission } from "@/hooks/use-protected-route";
import { can } from "@/lib/permissions";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/brand/empty-state";
import { SectionHeader, Status, dateTime } from "@/components/admin/common";
import { LibraryDialog } from "@/components/admin/library-dialog";
import { ScanButtons } from "@/components/admin/scan-buttons";
import { announceJobsChanged } from "@/components/shell/jobs-indicator";
import { useConfirm } from "@/contexts/confirm-context";

export default function DashboardLibraries() {
  const confirm = useConfirm();
  const { user, loading } = useAuth();
  useRequirePermission(user, loading, "ACCESS_ADMIN");

  const libraries = useApi(() => librariesApi.getAll(), []);
  const [editing, setEditing] = useState<LibraryRead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Asked once per visit; the count stays on each library row until it is scanned.
  const [changesSeen, setChangesSeen] = useState(false);

  if (!can(user, "ACCESS_ADMIN")) {
    return null;
  }

  const openDialog = (library: LibraryRead | null) => {
    setEditing(library);
    setDialogOpen(true);
  };

  const toggle = async (library: LibraryRead, enabled: boolean) => {
    setBusyId(library.id);
    try {
      await librariesApi.update(library.id, { enabled });
      libraries.reload();
    } catch (error) {
      toastError(error, "Could not update the library");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (library: LibraryRead) => {
    if (!(await confirm({ title: `Remove ${library.name}?`, description: "Its games leave the catalogue; files on disk are not touched.", confirmLabel: "Remove library" }))) return;
    setBusyId(library.id);
    try {
      await librariesApi.remove(library.id);
      toastSuccess("Library removed");
      libraries.reload();
    } catch (error) {
      toastError(error, "Could not remove the library");
    } finally {
      setBusyId(null);
    }
  };

  const scan = async (library: LibraryRead, kind: "full" | "incremental") => {
    setBusyId(library.id);
    try {
      await (kind === "full" ? scansApi.runFull(library.id) : scansApi.runIncremental(library.id));
      if (library.edge_id && library.edge_status !== "ONLINE") {
        toastSuccess(`${library.edge_name} scans ${library.name} when it checks in again`);
      } else {
        toastSuccess(kind === "full" ? `Full scan of ${library.name} started` : `Scanning ${library.name} for changes`);
      }
      announceJobsChanged();
    } catch (error) {
      toastError(error, "Could not start the scan");
    } finally {
      setBusyId(null);
    }
  };

  const changed = (libraries.data ?? []).filter((library) => (library.pending_changes ?? 0) > 0);

  const checkChanges = async () => {
    setChangesSeen(true);
    for (const library of changed) {
      await scan(library, "incremental");
    }
  };

  const addButton = (
    <Button variant="outline" onClick={() => openDialog(null)}>
      <Plus />
      Add library
    </Button>
  );

  return (
    <div>
      <SectionHeader
        title="Libraries"
        description="Folders scanned for games, on the server or on an edge device. A drive that is disconnected shows as offline and is checked again at the next scan."
        actions={
          <>
            {addButton}
            {can(user, "RUN_SCANS") && <ScanButtons />}
          </>
        }
      />

      {libraries.error ? (
        <EmptyState
          title="Libraries could not be loaded"
          description="Check that the server is running, then try again."
          action={<Button onClick={libraries.reload}>Try again</Button>}
        />
      ) : libraries.loading && !libraries.data ? (
        <Card className="gap-3 px-5">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </Card>
      ) : libraries.data?.length === 0 ? (
        <EmptyState
          title="No library folders yet"
          description="Add the folder where your games live, then run a scan to fill the library."
          action={addButton}
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Library</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last scan</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {libraries.data?.map((library) => {
                const offline = library.status === "OFFLINE";
                return (
                  <TableRow key={library.id}>
                    <TableCell className="py-3 pl-5">
                      <p className="font-medium text-parchment">{library.name}</p>
                      <p className="max-w-[28rem] truncate font-mono text-xs text-ash" title={library.path}>
                        {library.path}
                      </p>
                    </TableCell>
                    <TableCell>
                      {library.edge_id ? (
                        <>
                          <Status tone={library.edge_status === "ONLINE" ? "ok" : "idle"}>{library.edge_name}</Status>
                          {library.drive_mount && (
                            <p className="mt-1 font-mono text-xs text-ash" title="Where its drive was last seen">
                              {library.drive_mount}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-ash">Server</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Status tone={offline ? "bad" : "ok"}>{offline ? "Offline" : "Online"}</Status>
                      {(library.pending_changes ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-violet-lit">{filesText(library.pending_changes ?? 0)} to check; press Scan to add them</p>
                      )}
                      {library.last_error && (
                        <p className="mt-1 max-w-64 truncate text-xs text-ash" title={library.last_error}>
                          {library.last_error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-ash">{dateTime(library.last_scan_at)}</TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`Scan ${library.name}`}
                        checked={library.enabled}
                        disabled={busyId === library.id}
                        onCheckedChange={(enabled) => toggle(library, enabled)}
                      />
                    </TableCell>
                    <TableCell className="pr-5 text-right whitespace-nowrap">
                      {can(user, "RUN_SCANS") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Scan ${library.name} for changes`}
                          disabled={busyId === library.id}
                          onClick={() => scan(library, "incremental")}
                        >
                          <ScanSearch />
                          Scan
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${library.name}`} disabled={busyId === library.id}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can(user, "RUN_SCANS") && (
                            <DropdownMenuItem onSelect={() => scan(library, "full")}>
                              <RefreshCw />
                              Full scan
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => openDialog(library)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => remove(library)}>
                            <Trash2 />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!changesSeen && changed.length > 0 && can(user, "RUN_SCANS")} onOpenChange={(open) => !open && setChangesSeen(true)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New games may have been added</DialogTitle>
            <DialogDescription>
              A drive came back with new or resized files. They were only counted, not read; check them to add new games to
              the catalogue.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">
            {changed.map((library) => (
              <li key={library.id} className="flex justify-between gap-4">
                <span className="text-parchment">{library.name}</span>
                <span className="tabular text-ash">{filesText(library.pending_changes ?? 0)}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesSeen(true)}>
              Later
            </Button>
            <Button onClick={checkChanges}>Check for changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} library={editing} onSaved={libraries.reload} />
    </div>
  );
}

function filesText(count: number) {
  return `${count} new or changed ${count === 1 ? "file" : "files"}`;
}

"use client";

import { useState } from "react";
import { Copy, Download, KeyRound, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { edgeApi } from "@/lib/api";
import type { EdgeDevice, EdgeDeviceCreated, EdgeOS } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { useRequirePermission } from "@/hooks/use-protected-route";
import { can } from "@/lib/permissions";
import { formatBytes } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/brand/empty-state";
import { SectionHeader, Status, dateTime, type Tone } from "@/components/admin/common";

const STATUS: Record<EdgeDevice["status"], [string, Tone]> = {
  ONLINE: ["Online", "ok"],
  OFFLINE: ["Offline", "idle"],
  PENDING: ["Not set up yet", "idle"],
};

const INSTALL: Record<EdgeOS, { label: string; steps: string[] }> = {
  linux: {
    label: "Linux",
    steps: ["unzip ludexis-edge-linux.zip && cd ludexis-edge", "sudo ./install.sh"],
  },
  windows: {
    label: "Windows",
    steps: ["Unzip ludexis-edge-windows.zip, open PowerShell in the ludexis-edge folder", "powershell -ExecutionPolicy Bypass -File install.ps1"],
  },
};

export default function DashboardEdge() {
  const { user, loading } = useAuth();
  useRequirePermission(user, loading, "ACCESS_ADMIN");

  const devices = useApi(() => edgeApi.getAll(), []);
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState<EdgeDeviceCreated | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!can(user, "ACCESS_ADMIN")) {
    return null;
  }

  const update = async (device: EdgeDevice, changes: Partial<Pick<EdgeDevice, "autoscan" | "match_metadata">>) => {
    setBusyId(device.id);
    try {
      await edgeApi.update(device.id, changes);
      devices.reload();
    } catch (error) {
      toastError(error, "Could not update the edge device");
    } finally {
      setBusyId(null);
    }
  };

  const rotate = async (device: EdgeDevice) => {
    if (!window.confirm(`Issue a new token for ${device.name}? The device stops working until it gets the new install files.`)) return;
    setBusyId(device.id);
    try {
      setIssued(await edgeApi.rotateToken(device.id));
      devices.reload();
    } catch (error) {
      toastError(error, "Could not issue a new token");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (device: EdgeDevice) => {
    if (!window.confirm(`Remove ${device.name}? Its libraries and games stay and show as offline until you move them.`)) return;
    setBusyId(device.id);
    try {
      await edgeApi.remove(device.id);
      toastSuccess(`${device.name} removed`);
      devices.reload();
    } catch (error) {
      toastError(error, "Could not remove the edge device");
    } finally {
      setBusyId(null);
    }
  };

  const addButton = (
    <Button variant="outline" onClick={() => setAdding(true)}>
      <Plus />
      Add edge
    </Button>
  );

  return (
    <div>
      <SectionHeader
        title="Edge"
        description="Machines that scan the drives attached to them, such as a laptop, and send what they find here. Add one, run its install files on that machine, then pick it as the location of a library."
        actions={addButton}
      />

      {devices.error ? (
        <EmptyState
          title="Edge devices could not be loaded"
          description="Check that the server is running, then try again."
          action={<Button onClick={devices.reload}>Try again</Button>}
        />
      ) : devices.loading && !devices.data ? (
        <Card className="gap-3 px-5">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </Card>
      ) : devices.data?.length === 0 ? (
        <EmptyState
          title="No edge devices"
          description="Everything is scanned by this server. Add an edge device to scan drives attached to another machine."
          action={addButton}
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Drives</TableHead>
                <TableHead>Libraries</TableHead>
                <TableHead>Scan on connect</TableHead>
                <TableHead>Metadata here</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.data?.map((device) => {
                const [label, tone] = STATUS[device.status];
                return (
                  <TableRow key={device.id}>
                    <TableCell className="py-3 pl-5">
                      <p className="font-medium text-parchment">{device.name}</p>
                      <p className="text-xs text-ash">
                        {[device.hostname, device.os && INSTALL[device.os].label, device.version && `v${device.version}`].filter(Boolean).join(" · ") ||
                          "Waiting for its first check-in"}
                      </p>
                      {device.update_available && <p className="text-xs text-ember">Runs another release than the server: update it</p>}
                    </TableCell>
                    <TableCell>
                      <Status tone={tone}>{label}</Status>
                      {device.last_seen_at && <p className="tabular text-xs text-ash">Seen {dateTime(device.last_seen_at)}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-ash">
                      {device.drives.length === 0
                        ? "None"
                        : device.drives.map((drive) => (
                            <p key={drive.id} title={drive.id}>
                              {drive.label || drive.mount}
                              {drive.free != null && <span className="tabular"> · {formatBytes(drive.free)} free</span>}
                            </p>
                          ))}
                    </TableCell>
                    <TableCell className="text-sm text-ash">
                      {device.libraries.length === 0 ? "None yet" : device.libraries.map((library) => <p key={library.id}>{library.name}</p>)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`Scan when a drive connects to ${device.name}`}
                        checked={device.autoscan}
                        disabled={busyId === device.id}
                        onCheckedChange={(autoscan) => update(device, { autoscan })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`Match metadata on ${device.name}`}
                        checked={device.match_metadata}
                        disabled={busyId === device.id}
                        onCheckedChange={(match_metadata) => update(device, { match_metadata })}
                      />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${device.name}`} disabled={busyId === device.id}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => rotate(device)}>
                            <KeyRound />
                            New token and install files
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => remove(device)}>
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

      <AddEdgeDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={(device) => {
          setIssued(device);
          devices.reload();
        }}
      />
      <InstallDialog device={issued} onClose={() => setIssued(null)} />
    </div>
  );
}

function AddEdgeDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (device: EdgeDeviceCreated) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const device = await edgeApi.create(name.trim());
      onOpenChange(false);
      setName("");
      onAdded(device);
    } catch (error) {
      toastError(error, "Could not add the edge device");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Add edge device</DialogTitle>
            <DialogDescription>A machine with drives of its own. Next you get the files that set it up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edge-name">Name</Label>
            <Input id="edge-name" placeholder="Laptop" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              Add edge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Shown once after adding a device or issuing a new token: the token cannot be read again later. */
function InstallDialog({ device, onClose }: { device: EdgeDeviceCreated | null; onClose: () => void }) {
  const [os, setOs] = useState<EdgeOS>("windows");
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!device) return;
    setDownloading(true);
    try {
      const blob = await edgeApi.bundle(device.id, os, device.token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ludexis-edge-${os}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastError(error, "Could not build the install files");
    } finally {
      setDownloading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(device?.token ?? "");
      toastSuccess("Token copied");
    } catch (error) {
      toastError(error, "Could not copy the token");
    }
  };

  return (
    <Dialog open={device !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up {device?.name}</DialogTitle>
          <DialogDescription>
            Download the install files now: they hold this device&apos;s token, which is not shown again. A new token can be issued later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>System</Label>
          <div className="flex gap-2" role="group" aria-label="System">
            {(Object.keys(INSTALL) as EdgeOS[]).map((key) => (
              <Button key={key} type="button" variant={os === key ? "default" : "outline"} aria-pressed={os === key} onClick={() => setOs(key)}>
                {INSTALL[key].label}
              </Button>
            ))}
          </div>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ash">
          <li>Download the install files and copy them to the machine.</li>
          {INSTALL[os].steps.map((step) => (
            <li key={step}>
              <code className="font-mono text-parchment">{step}</code>
            </li>
          ))}
          <li>Add a library under Libraries with {device?.name} as its location.</li>
        </ol>
        <div className="space-y-2">
          <Label htmlFor="edge-token">Token</Label>
          <div className="flex gap-2">
            <Input id="edge-token" readOnly className="font-mono" value={device?.token ?? ""} />
            <Button type="button" variant="outline" size="icon" aria-label="Copy token" onClick={copy}>
              <Copy />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button type="button" onClick={download} disabled={downloading}>
            <Download />
            Download for {INSTALL[os].label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

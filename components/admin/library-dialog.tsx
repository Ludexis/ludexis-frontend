"use client";

import { useEffect, useState } from "react";
import { edgeApi, librariesApi } from "@/lib/api";
import type { EdgeDevice, LibraryRead } from "@/lib/types";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/common";

const EDGE_STATUS: Record<EdgeDevice["status"], string> = { ONLINE: "online", OFFLINE: "offline", PENDING: "not set up yet" };

interface LibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this library; add a new one when absent. */
  library?: LibraryRead | null;
  onSaved: () => void;
}

export function LibraryDialog({ open, onOpenChange, library, onSaved }: LibraryDialogProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  // "" is the server itself.
  const [edgeId, setEdgeId] = useState("");
  const [edges, setEdges] = useState<EdgeDevice[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(library?.name ?? "");
      setPath(library?.path ?? "");
      setEdgeId(library?.edge_id ?? "");
      // Without edge devices the dialog simply offers the server.
      edgeApi.getAll().then(setEdges, () => setEdges([]));
    }
  }, [open, library]);

  const edge = edges.find((candidate) => candidate.id === edgeId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = { name: name.trim(), path: path.trim(), edge_id: edgeId || null };
      if (library) {
        await librariesApi.update(library.id, data);
      } else {
        await librariesApi.create(data);
      }
      toastSuccess(
        library ? "Library saved" : edge ? `Library added; ${edge.name} scans it at its next check-in` : "Library added",
      );
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toastError(error, "Could not save the library");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{library ? "Edit library" : "Add library"}</DialogTitle>
            <DialogDescription>
              A folder that holds game archives, on the server or on an edge device that scans its own drives.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="library-name">Name</Label>
            <Input id="library-name" placeholder="External drive" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="library-path">Folder path</Label>
            <Input
              id="library-path"
              className="font-mono"
              placeholder={edge?.os === "windows" ? "E:\\Games" : edge ? "/media/you/Games" : "/games"}
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <p className="text-xs text-ash">
              {edge
                ? `As ${edge.name} shows it. After the first scan the drive is recognised wherever it is mounted.`
                : "As the server's containers see it, for example /games or a folder inside it."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="library-location">Location</Label>
            <NativeSelect id="library-location" className="w-full" value={edgeId} onChange={(e) => setEdgeId(e.target.value)}>
              <option value="">Server (this host)</option>
              {edges.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({EDGE_STATUS[candidate.status]})
                </option>
              ))}
            </NativeSelect>
            {edge && edge.status !== "ONLINE" && <p className="text-xs text-ash">Scans wait until {edge.name} checks in again.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !path.trim()}>
              {library ? "Save changes" : "Add library"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

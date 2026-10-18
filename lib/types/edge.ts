export type EdgeStatus = "PENDING" | "ONLINE" | "OFFLINE";
export type EdgeOS = "linux" | "windows";

export interface EdgeDrive {
  /** Filesystem UUID (Linux) or volume serial (Windows). */
  id: string;
  mount: string;
  label?: string | null;
  total?: number | null;
  free?: number | null;
}

export interface EdgeDevice {
  id: string;
  name: string;
  status: EdgeStatus;
  autoscan: boolean;
  match_metadata: boolean;
  last_seen_at?: string | null;
  version?: string | null;
  /** The device runs another release than the server. */
  update_available: boolean;
  hostname?: string | null;
  os?: EdgeOS | null;
  drives: EdgeDrive[];
  libraries: { id: string; name: string }[];
  created_at: string;
}

/** Returned once when a device is added or its token rotated. */
export interface EdgeDeviceCreated extends EdgeDevice {
  token: string;
}

export interface EdgeDeviceUpdate {
  name?: string;
  autoscan?: boolean;
  match_metadata?: boolean;
}

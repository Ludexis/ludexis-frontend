export interface LibraryRead {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  status?: "ONLINE" | "OFFLINE";
  last_seen_at?: string | null;
  last_scan_at?: string | null;
  last_error?: string | null;
  /** Empty: on the server. Otherwise the edge device whose drive holds the library. */
  edge_id?: string | null;
  edge_name?: string | null;
  edge_status?: "PENDING" | "ONLINE" | "OFFLINE" | null;
  drive_id?: string | null;
  drive_mount?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LibraryCreate {
  name: string;
  path: string;
  enabled?: boolean;
  edge_id?: string | null;
}

export interface LibraryUpdate {
  name?: string | null;
  path?: string | null;
  enabled?: boolean | null;
  /** null moves the library to the server. */
  edge_id?: string | null;
}

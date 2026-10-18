import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { edgeApi, librariesApi, scansApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import DashboardLibraries from "./page";
import type { EdgeDevice, LibraryRead, User } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/libraries",
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  librariesApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  edgeApi: { getAll: vi.fn().mockResolvedValue([]) },
  scansApi: { runFull: vi.fn(), runIncremental: vi.fn() },
}));

const library: LibraryRead = { id: "lib-1", name: "Iron Tide Drive", path: "/games/iron", enabled: true, status: "ONLINE" };
const admin: User = { id: "admin-1", username: "admin", email: "a@example.com", is_active: true, is_superuser: true };

describe("DashboardLibraries", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("scans a single library for changes", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: admin, loading: false, login: vi.fn(), logout: vi.fn() } as any);
    vi.mocked(librariesApi.getAll).mockResolvedValue([library]);
    vi.mocked(scansApi.runIncremental).mockResolvedValue({});
    render(<DashboardLibraries />);

    fireEvent.click(await screen.findByRole("button", { name: "Scan Iron Tide Drive for changes" }));

    await waitFor(() => expect(scansApi.runIncremental).toHaveBeenCalledWith("lib-1"));
  });

  it("adds a library on an edge device chosen as its location", async () => {
    const laptop: EdgeDevice = {
      id: "edge-1", name: "Laptop", status: "OFFLINE", autoscan: true, match_metadata: false, update_available: false,
      os: "windows", drives: [], libraries: [], created_at: "2026-10-01T00:00:00Z",
    };
    vi.mocked(useAuth).mockReturnValue({ user: admin, loading: false, login: vi.fn(), logout: vi.fn() } as any);
    vi.mocked(librariesApi.getAll).mockResolvedValue([]);
    vi.mocked(librariesApi.create).mockResolvedValue(library);
    vi.mocked(edgeApi.getAll).mockResolvedValue([laptop]);
    render(<DashboardLibraries />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Add library" }))[0]);
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Travel drive" } });
    fireEvent.change(screen.getByLabelText("Folder path"), { target: { value: "E:\Games" } });
    await screen.findByRole("option", { name: "Laptop (offline)" });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "edge-1" } });
    expect(screen.getByText("Scans wait until Laptop checks in again.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Add library" }).at(-1)!);

    await waitFor(() =>
      expect(librariesApi.create).toHaveBeenCalledWith({ name: "Travel drive", path: "E:\Games", edge_id: "edge-1" }),
    );
  });

  it("shows where an edge library lives", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: admin, loading: false, login: vi.fn(), logout: vi.fn() } as any);
    vi.mocked(librariesApi.getAll).mockResolvedValue([
      { ...library, edge_id: "edge-1", edge_name: "Laptop", edge_status: "ONLINE", drive_mount: "F:\\", last_error: "Drive not connected" },
    ]);
    render(<DashboardLibraries />);

    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("F:\\")).toBeInTheDocument();
    expect(screen.getByText("Drive not connected")).toBeInTheDocument();
  });
});

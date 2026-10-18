import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { edgeApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import DashboardEdge from "./page";
import type { EdgeDevice, User } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/edge",
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  edgeApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), rotateToken: vi.fn(), bundle: vi.fn() },
}));

const admin: User = { id: "admin-1", username: "admin", email: "a@example.com", is_active: true, is_superuser: true };
const laptop: EdgeDevice = {
  id: "edge-1",
  name: "Laptop",
  status: "ONLINE",
  autoscan: true,
  match_metadata: false,
  update_available: true,
  hostname: "travel-pc",
  os: "windows",
  version: "1.0.0",
  drives: [{ id: "AC937FD6", mount: "E:\\", label: "Games", free: 2 * 1024 ** 3 }],
  libraries: [{ id: "lib-1", name: "Travel drive" }],
  created_at: "2026-10-01T00:00:00Z",
};

function setup(devices: EdgeDevice[] = [laptop]) {
  vi.mocked(useAuth).mockReturnValue({ user: admin, loading: false, login: vi.fn(), logout: vi.fn() } as any);
  vi.mocked(edgeApi.getAll).mockResolvedValue(devices);
  render(<DashboardEdge />);
}

describe("DashboardEdge", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lists devices with their status, drives and libraries", async () => {
    setup();
    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText(/travel-pc · Windows · v1.0.0/)).toBeInTheDocument();
    expect(screen.getByText("Travel drive")).toBeInTheDocument();
    expect(screen.getByText(/Games/)).toBeInTheDocument();
    expect(screen.getByText(/update it/)).toBeInTheDocument();
  });

  it("turns metadata matching on for a device", async () => {
    setup();
    vi.mocked(edgeApi.update).mockResolvedValue(laptop);
    fireEvent.click(await screen.findByRole("switch", { name: "Match metadata on Laptop" }));
    await waitFor(() => expect(edgeApi.update).toHaveBeenCalledWith("edge-1", { match_metadata: true }));
  });

  it("adds a device and shows its token once with the install files", async () => {
    setup([]);
    vi.mocked(edgeApi.create).mockResolvedValue({ ...laptop, status: "PENDING", token: "ldx_secret" });
    vi.mocked(edgeApi.bundle).mockResolvedValue(new Blob(["zip"]));
    URL.createObjectURL = vi.fn(() => "blob:edge");
    URL.revokeObjectURL = vi.fn();

    fireEvent.click((await screen.findAllByRole("button", { name: "Add edge" }))[0]);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Laptop" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add edge" }).at(-1)!);

    expect(await screen.findByDisplayValue("ldx_secret")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Linux" }));
    expect(screen.getByText("sudo ./install.sh")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download for Linux" }));
    await waitFor(() => expect(edgeApi.bundle).toHaveBeenCalledWith("edge-1", "linux", "ldx_secret"));
  });
});

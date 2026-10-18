import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Every confirmation is accepted.
vi.mock("@/contexts/confirm-context", () => ({ useConfirm: () => async () => true }));

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
  update_available: true,
  hostname: "travel-pc",
  os: "windows",
  version: "1.0.0",
  drives: [{ id: "AC937FD6", mount: "E:\\", label: "Games", free: 2 * 1024 ** 3 }],
  libraries: [
    { id: "lib-1", name: "Travel drive", path: "E:\\Games", status: "ONLINE" },
    { id: "lib-2", name: "Shooters", path: "I:\\Games\\Shooters", status: "OFFLINE" },
    { id: "lib-3", name: "Strategy", path: "I:\\Games\\Strategy", status: "OFFLINE" },
  ],
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

  it("lists devices with their status and each drive with the libraries on it", async () => {
    setup();
    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Windows · v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("travel-pc")).toBeInTheDocument();
    expect(screen.getByText(/update it/)).toBeInTheDocument();

    const connected = screen.getByRole("listitem", { name: "Drive E:\\" });
    expect(within(connected).getByText("Travel drive")).toBeInTheDocument();
    expect(within(connected).getByText(/GB free/)).toBeInTheDocument();
    // Libraries whose drive is away are grouped under it once, not repeated per library.
    const away = screen.getByRole("listitem", { name: "Drive I:\\" });
    expect(within(away).getByText("Not connected")).toBeInTheDocument();
    expect(within(away).getByText("Shooters")).toBeInTheDocument();
    expect(within(away).getByText("Strategy")).toBeInTheDocument();
  });

  it("turns autoscan off for a device", async () => {
    setup();
    vi.mocked(edgeApi.update).mockResolvedValue(laptop);
    fireEvent.click(await screen.findByRole("switch", { name: "Scan when a drive connects to Laptop" }));
    await waitFor(() => expect(edgeApi.update).toHaveBeenCalledWith("edge-1", { autoscan: false }));
  });

  it("renames a device from its menu", async () => {
    const user = userEvent.setup();
    setup();
    vi.mocked(edgeApi.update).mockResolvedValue({ ...laptop, name: "Predator" });
    await user.click(await screen.findByRole("button", { name: "Actions for Laptop" }));
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    const field = await screen.findByLabelText("Name");
    await user.clear(field);
    await user.type(field, "Predator");
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(edgeApi.update).toHaveBeenCalledWith("edge-1", { name: "Predator" }));
  });

  it("removes a device after confirming", async () => {
    const user = userEvent.setup();
    setup();
    vi.mocked(edgeApi.remove).mockResolvedValue(undefined);
    await user.click(await screen.findByRole("button", { name: "Actions for Laptop" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));
    await waitFor(() => expect(edgeApi.remove).toHaveBeenCalledWith("edge-1"));
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

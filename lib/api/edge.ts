import { apiClient } from "./client";
import type { EdgeDevice, EdgeDeviceCreated, EdgeDeviceUpdate, EdgeOS } from "@/lib/types";

export const edgeApi = {
  async getAll(): Promise<EdgeDevice[]> {
    return apiClient.get<EdgeDevice[]>("/edge-devices/");
  },

  async create(name: string): Promise<EdgeDeviceCreated> {
    return apiClient.post<EdgeDeviceCreated>("/edge-devices/", { name });
  },

  async update(id: string, data: EdgeDeviceUpdate): Promise<EdgeDevice> {
    return apiClient.patch<EdgeDevice>(`/edge-devices/${id}`, data);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/edge-devices/${id}`);
  },

  async rotateToken(id: string): Promise<EdgeDeviceCreated> {
    return apiClient.post<EdgeDeviceCreated>(`/edge-devices/${id}/token`);
  },

  /** The zip with the compose file, .env and installer; built only for the device's current token. */
  async bundle(id: string, os: EdgeOS, token: string): Promise<Blob> {
    return apiClient.postBlob(`/edge-devices/${id}/bundle`, { os, token });
  },
};

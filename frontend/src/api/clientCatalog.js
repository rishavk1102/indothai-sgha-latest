import api from "./axios";

export async function fetchAircraftTypes() {
  const response = await api.get("/api/client/catalog/aircraft-types");
  return response.data?.data || [];
}

export async function fetchServices() {
  const response = await api.get("/api/client/catalog/services");
  return response.data?.data || [];
}

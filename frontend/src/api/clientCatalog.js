import api from "./axios";

export async function fetchAircraftTypes() {
  const response = await api.get("/api/client/catalog/aircraft-types");
  return response.data?.data || [];
}

/** Employee Aircraft options (`/dashboard/CompanyAircraft`) — MOTW, region, limits. */
export async function fetchAircraftOptions(airportId) {
  const params =
    airportId != null && String(airportId).trim() !== ""
      ? { airport_id: airportId }
      : {};
  const response = await api.get("/api/client/catalog/aircraft-options", {
    params,
  });
  return response.data?.data || [];
}

/**
 * Prefer rows for the selected airport; if none, return the full catalog.
 */
export async function fetchAircraftOptionsWithFallback(airportId) {
  const scoped = await fetchAircraftOptions(airportId);
  if (Array.isArray(scoped) && scoped.length) return scoped;
  if (airportId == null) return Array.isArray(scoped) ? scoped : [];
  return fetchAircraftOptions();
}

/** Employee Aircraft Category sidebar (`/dashboard/AircraftCategory`) */
export async function fetchAircraftCategories() {
  const response = await api.get("/api/client/catalog/aircraft-categories");
  return response.data?.data || [];
}

/**
 * REST first; if empty or unavailable, load via socket (same table as AircraftCategory page).
 */
export function fetchAircraftCategoriesWithFallback(socket, roleId, pageName) {
  return fetchAircraftCategories()
    .then((rows) => (Array.isArray(rows) && rows.length ? rows : null))
    .catch(() => null)
    .then((fromRest) => {
      if (fromRest) return fromRest;
      if (!socket || !roleId || !pageName) return [];
      return new Promise((resolve) => {
        const finish = (rows) => {
          clearTimeout(timer);
          socket.off("get-aircraft-categories-success", onSuccess);
          socket.off("get-aircraft-categories-error", onError);
          resolve(Array.isArray(rows) ? rows : []);
        };
        const onSuccess = (data) => finish(data);
        const onError = () => finish([]);
        const timer = setTimeout(() => finish([]), 10000);
        socket.on("get-aircraft-categories-success", onSuccess);
        socket.on("get-aircraft-categories-error", onError);
        socket.emit("get-aircraft-categories", {
          role_id: roleId,
          page_name: pageName,
          searchTerm: "",
        });
      });
    });
}

export async function fetchServices() {
  const response = await api.get("/api/client/catalog/services");
  return response.data?.data || [];
}

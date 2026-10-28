import api from "./axios";

export async function fetchAircraftTypes() {
  const response = await api.get("/api/client/catalog/aircraft-types");
  return response.data?.data || [];
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

import { authApi } from "@/lib/api";

export function isAdminSession(): boolean {
  return (
    localStorage.getItem("profit-pilot-is-admin") === "true" &&
    localStorage.getItem("profit-pilot-authenticated") === "true" &&
    localStorage.getItem("profit-pilot-user-id") === "admin"
  );
}

export function applyAdminSession(user?: { name?: string }) {
  localStorage.setItem("profit-pilot-user-name", user?.name || "Admin");
  localStorage.setItem("profit-pilot-user-email", "admin");
  localStorage.setItem("profit-pilot-business-name", "System Administrator");
  localStorage.setItem("profit-pilot-is-admin", "true");
  localStorage.setItem("profit-pilot-user-id", "admin");
  localStorage.setItem("profit-pilot-authenticated", "true");
  window.dispatchEvent(new Event("pin-auth-changed"));
  window.dispatchEvent(new Event("user-data-changed"));
}

export async function loginAsAdmin(pin: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await authApi.login({
    pin,
    email: normalizedEmail,
  });

  if (!response.user || (!response.isAdmin && response.user.email !== "admin")) {
    throw new Error("Invalid admin credentials");
  }

  applyAdminSession(response.user);
  return response;
}

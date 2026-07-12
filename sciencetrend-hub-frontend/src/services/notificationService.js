import { apiRequest } from "./api";

export function getNotifications() {
  return apiRequest("/notifications", { method: "GET" });
}

export function getUnreadNotifications() {
  return apiRequest("/notifications/unread", { method: "GET" });
}

export function getUnreadCount() {
  return apiRequest("/notifications/unread-count", { method: "GET" });
}

export function markNotificationAsRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: "PUT" });
}

export function markAllNotificationsAsRead() {
  return apiRequest("/notifications/read-all", { method: "PUT" });
}

export function deleteNotification(id) {
  return apiRequest(`/notifications/${id}`, { method: "DELETE" });
}

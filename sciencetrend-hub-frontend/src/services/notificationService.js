// Backend NotificationController is currently an empty stub (not yet implemented)
// We return empty resolved promises to keep the UI clean without causing 404 network failures.

export function getNotifications() {
  return Promise.resolve([]);
}

export function markNotificationAsRead(id) {
  return Promise.resolve(null);
}

export function markAllNotificationsAsRead() {
  return Promise.resolve(null);
}

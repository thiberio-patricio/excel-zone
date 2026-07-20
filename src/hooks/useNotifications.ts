import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

const STORAGE_KEY = "unidos_notifications";

const defaultNotifications: Notification[] = [
  {
    id: "welcome",
    title: "Bem-vindo à Unidos Importados",
    description: "Plataforma inteligente de gestão de vendas à sua disposição.",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "ai-active",
    title: "IA ativa no sistema",
    description: "Aproveite as análises inteligentes nos relatórios executivos.",
    read: false,
    createdAt: new Date().toISOString(),
  },
];

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultNotifications;
    const parsed = JSON.parse(raw) as Notification[];
    // Ensure defaults exist if list was cleared
    const ids = new Set(parsed.map((n) => n.id));
    return [...defaultNotifications.filter((n) => !ids.has(n.id)), ...parsed];
  } catch {
    return defaultNotifications;
  }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // ignore storage errors
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNotifications(loadNotifications());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveNotifications(notifications);
  }, [notifications, mounted]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}

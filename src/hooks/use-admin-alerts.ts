import { useState, useEffect, useCallback } from "react";
import {
  subscribePending,
  handleOrderResolved,
  stopAlert,
  type OrderSummary,
} from "@/src/services/AdminNotificationService";
import { api } from "@/src/api";

export type { OrderSummary };

export function useAdminAlerts() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    const unsub = subscribePending((count, orders) => {
      setPendingCount(count);
      setPendingOrders(orders);
    });
    return unsub;
  }, []);

  const resolveOrder = useCallback(async (orderId: string, accept: boolean) => {
    try {
      const newStatus = accept ? "preparing" : "cancelled";
      await api.adminUpdateStatus(orderId, newStatus);
      await handleOrderResolved(orderId);
    } catch (e) {
      await stopAlert(orderId);
      throw e;
    }
  }, []);

  return { pendingCount, pendingOrders, resolveOrder };
}

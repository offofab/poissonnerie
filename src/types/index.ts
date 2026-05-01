import type {
  Role,
  ArrivalStatus,
  OrderStatus,
  PaymentType,
  PaymentMethod,
  CollectionStatus,
  NotifType,
  NotifStatus,
} from "@/generated/prisma";

export type { Role, ArrivalStatus, OrderStatus, PaymentType, PaymentMethod, CollectionStatus, NotifType, NotifStatus };

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export const FCFA = (amount: number): string =>
  `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;

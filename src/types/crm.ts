export type UserRole = "admin" | "staff";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  managerName: string;
  phone: string;
  flagship?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  whatsappNumber: string; // Stored cleanly e.g. "+91 98401 23456"
  dateOfBirth: string; // YYYY-MM-DD or ""
  anniversaryDate: string; // YYYY-MM-DD or ""
  branchId: string;
  createdAt: string; // YYYY-MM-DD
}

/**
 * Marketing consent is stored separately from customer identity records
 * for strict DPDP & WhatsApp Business opt-in/opt-out governance.
 */
export interface ConsentRecord {
  customerId: string;
  agreed: boolean;
  updatedAt: string; // ISO or YYYY-MM-DD HH:mm
  channel: "Showroom Tablet" | "Reception Desk" | "WhatsApp Opt-Out" | "Admin Override";
}

export type CouponCategory =
  | "birthday"
  | "anniversary"
  | "festival"
  | "exclusive"
  | "collection";

export type DiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  category: CouponCategory;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount: number;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  maxUses: number;
  usedCount: number;
  enabled: boolean;
  branchId: string; // "ALL" or specific branch ID
  assignedCustomerId?: string; // Optional exclusive 1-to-1 patron assignment
  lastRedeemedAt?: string;
  createdAt: string;
}

export type MessageTemplateType =
  | "birthday"
  | "anniversary"
  | "festival"
  | "coupon"
  | "collection";

export interface WhatsAppMessageLog {
  id: string;
  customerId: string;
  branchId: string;
  templateType: MessageTemplateType;
  messageText: string;
  couponCode?: string;
  sentAt: string;
  sentBy: string;
  deliveryStatus: "Delivered" | "Read";
}

export interface Campaign {
  id: string;
  name: string;
  category: CouponCategory;
  branchId: string; // "ALL" or branchId
  couponCode?: string;
  messageTemplate: string;
  sentCount: number;
  deliveredCount: number;
  redeemedCount: number;
  status: "Active" | "Completed" | "Scheduled";
  lastRunAt: string;
}

export type ActiveTab =
  | "dashboard"
  | "customers"
  | "coupons"
  | "campaigns"
  | "branches";

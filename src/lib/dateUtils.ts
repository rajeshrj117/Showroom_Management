import { Coupon } from "@/types/crm";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a Date object as local YYYY-MM-DD without UTC timezone shift.
 */
export function toLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Adds (or subtracts) days from a reference date and returns YYYY-MM-DD.
 */
export function addDaysISO(offsetDays: number, baseDate: Date = new Date()): string {
  const copy = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + offsetDays
  );
  return toLocalISODate(copy);
}

/**
 * Parses YYYY-MM-DD safely as local midnight Date.
 */
export function parseLocalDate(isoStr: string): Date | null {
  if (!isoStr) return null;
  const parts = isoStr.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

/**
 * Formats YYYY-MM-DD as "15 November 2026"
 */
export function formatLongDate(isoStr: string): string {
  const dt = parseLocalDate(isoStr);
  if (!dt) return "—";
  return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
}

/**
 * Formats YYYY-MM-DD as "15 Nov" (ideal for birthdays & anniversaries)
 */
export function formatDayMonth(isoStr: string): string {
  const dt = parseLocalDate(isoStr);
  if (!dt) return "Not provided";
  return `${dt.getDate()} ${SHORT_MONTH_NAMES[dt.getMonth()]}`;
}

/**
 * Formats YYYY-MM-DD as "15 Nov 1988"
 */
export function formatMediumDate(isoStr: string): string {
  const dt = parseLocalDate(isoStr);
  if (!dt) return "—";
  return `${dt.getDate()} ${SHORT_MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
}

/**
 * Extracts 1-indexed month ("1" to "12") from YYYY-MM-DD.
 */
export function getMonthNumber(isoStr: string): number | null {
  const dt = parseLocalDate(isoStr);
  if (!dt) return null;
  return dt.getMonth() + 1;
}

/**
 * Returns number of days from today until the next annual occurrence of a date (0 = Today!).
 * Returns null if dateStr is empty/invalid.
 */
export function getDaysUntilCelebration(
  dateStr: string,
  ref: Date = new Date()
): number | null {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return null;

  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let nextOccurrence = new Date(
    today.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );

  // Handle Feb 29 in non-leap year gracefully
  if (parsed.getMonth() === 1 && parsed.getDate() === 29 && nextOccurrence.getMonth() !== 1) {
    nextOccurrence = new Date(today.getFullYear(), 1, 28);
  }

  if (nextOccurrence < today) {
    nextOccurrence = new Date(
      today.getFullYear() + 1,
      parsed.getMonth(),
      parsed.getDate()
    );
    if (parsed.getMonth() === 1 && parsed.getDate() === 29 && nextOccurrence.getMonth() !== 1) {
      nextOccurrence = new Date(today.getFullYear() + 1, 1, 28);
    }
  }

  const diffMs = nextOccurrence.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface CouponEvaluation {
  status:
    | "active"
    | "expiring_today"
    | "expiring_soon"
    | "redeemed"
    | "expired"
    | "disabled"
    | "scheduled";
  label: string;
  daysRemaining: number;
  canRedeem: boolean;
  blockReason?: string;
}

/**
 * Evaluates full lifecycle & validation status for a coupon relative to today.
 */
export function evaluateCoupon(
  coupon: Coupon,
  ref: Date = new Date()
): CouponEvaluation {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const expiry = parseLocalDate(coupon.expiryDate) ?? today;
  const start = parseLocalDate(coupon.startDate) ?? today;

  const daysRemaining = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isFullyRedeemed = coupon.usedCount >= coupon.maxUses;

  if (!coupon.enabled) {
    return {
      status: "disabled",
      label: "Disabled",
      daysRemaining,
      canRedeem: false,
      blockReason: "This coupon is currently disabled by showroom management.",
    };
  }

  if (isFullyRedeemed) {
    return {
      status: "redeemed",
      label: coupon.maxUses === 1 ? "Redeemed" : "Max Uses Reached",
      daysRemaining,
      canRedeem: false,
      blockReason:
        coupon.maxUses === 1
          ? "Single-use coupon has already been redeemed."
          : `Maximum redemption limit (${coupon.maxUses}/${coupon.maxUses}) reached.`,
    };
  }

  if (daysRemaining < 0) {
    return {
      status: "expired",
      label: "Expired",
      daysRemaining,
      canRedeem: false,
      blockReason: `Coupon expired ${Math.abs(daysRemaining)} day${
        Math.abs(daysRemaining) === 1 ? "" : "s"
      } ago (${formatLongDate(coupon.expiryDate)}).`,
    };
  }

  if (start > today) {
    return {
      status: "scheduled",
      label: `Starts ${formatDayMonth(coupon.startDate)}`,
      daysRemaining,
      canRedeem: false,
      blockReason: `Offer becomes valid starting ${formatLongDate(coupon.startDate)}.`,
    };
  }

  if (daysRemaining === 0) {
    return {
      status: "expiring_today",
      label: "Expires Today",
      daysRemaining: 0,
      canRedeem: true,
    };
  }

  if (daysRemaining <= 7) {
    return {
      status: "expiring_soon",
      label: `Expires in ${daysRemaining}d`,
      daysRemaining,
      canRedeem: true,
    };
  }

  return {
    status: "active",
    label: "Active",
    daysRemaining,
    canRedeem: true,
  };
}

/**
 * Formats Indian Rupee amounts cleanly e.g. ₹500 or ₹12,500
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Formats coupon discount badge e.g. "15% OFF" or "₹500 OFF"
 */
export function formatDiscountLabel(
  discountType: "percentage" | "fixed",
  discountValue: number
): string {
  return discountType === "percentage"
    ? `${discountValue}% OFF`
    : `${formatINR(discountValue)} OFF`;
}

/**
 * Formats a mobile input into clean Indian WhatsApp format "+91 XXXXX XXXXX"
 */
export function formatIndianWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const tenDigits =
    digits.length > 10 && digits.startsWith("91")
      ? digits.slice(2, 12)
      : digits.slice(-10);
  if (tenDigits.length === 10) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  return raw.trim();
}

/**
 * Extracts pure digits with 91 prefix for wa.me URL
 */
export function toWhatsAppUrlNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

/**
 * Extracts 2-letter monogram initials from customer name
 */
export function getInitials(name: string): string {
  const cleaned = name
    .replace(/^(Smt\.|Sri\.|Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "RS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

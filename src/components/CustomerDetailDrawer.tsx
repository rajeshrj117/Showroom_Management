"use client";

import React from "react";
import {
  X,
  Phone,
  Cake,
  Heart,
  ShieldCheck,
  ShieldOff,
  Ticket,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  Edit3,
  CheckCheck,
  Plus,
} from "lucide-react";
import {
  Branch,
  ConsentRecord,
  Coupon,
  Customer,
  MessageTemplateType,
  WhatsAppMessageLog,
} from "@/types/crm";
import {
  evaluateCoupon,
  formatDiscountLabel,
  formatLongDate,
  formatMediumDate,
  getDaysUntilCelebration,
  getInitials,
} from "@/lib/dateUtils";

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  onClose: () => void;
  branch?: Branch;
  consent?: ConsentRecord;
  coupons: Coupon[];
  messages: WhatsAppMessageLog[];
  onToggleConsent: (customerId: string, nextAgreed: boolean) => void;
  onOpenWhatsApp: (
    customer: Customer,
    template?: MessageTemplateType,
    couponCode?: string
  ) => void;
  onRedeemCoupon: (couponId: string) => void;
  onEditCustomer: (customer: Customer) => void;
}

export default function CustomerDetailDrawer({
  customer,
  onClose,
  branch,
  consent,
  coupons,
  messages,
  onToggleConsent,
  onOpenWhatsApp,
  onRedeemCoupon,
  onEditCustomer,
}: CustomerDetailDrawerProps) {
  if (!customer) return null;

  const isOptedIn = consent?.agreed ?? false;
  const bdayDays = getDaysUntilCelebration(customer.dateOfBirth);
  const annivDays = getDaysUntilCelebration(customer.anniversaryDate);

  // Exclusive coupons assigned to this patron
  const assignedCoupons = coupons.filter(
    (c) => c.assignedCustomerId === customer.id
  );

  // Communication logs for this patron (newest first)
  const customerMessages = [...messages]
    .filter((m) => m.customerId === customer.id)
    .reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#252323]/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-[#FAF7F0] h-full shadow-2xl border-l border-[#C8A96B]/50 flex flex-col overflow-hidden animate-fade-in">
        {/* Royal Burgundy Profile Header */}
        <div className="bg-[#541326] px-6 py-6 text-[#FAF7F0] border-b border-[#C8A96B]/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#741F38] border border-[#C8A96B] flex items-center justify-center font-serif text-xl font-bold text-[#C8A96B] shadow-md shrink-0">
                {getInitials(customer.name)}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-[#C8A96B] uppercase tracking-widest font-medium">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{branch ? `${branch.name}, ${branch.city}` : "Showroom Patron"}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold mt-0.5">
                  {customer.name}
                </h2>
                <p className="font-mono text-sm text-[#FAF7F0]/85 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>{customer.whatsappNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEditCustomer(customer)}
                className="rounded-lg p-2 text-[#FAF7F0]/80 hover:text-white hover:bg-[#741F38] transition cursor-pointer"
                title="Edit Patron Details"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-[#FAF7F0]/80 hover:text-white hover:bg-[#741F38] transition cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick WhatsApp Bar */}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenWhatsApp(customer, "birthday")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF7F0] text-[#541326] px-3.5 py-2 text-xs font-semibold hover:bg-[#EFE7D6] transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#1F6E43]" />
              <span>Send Birthday Wish</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenWhatsApp(customer, "anniversary")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#741F38] text-[#FAF7F0] border border-[#C8A96B]/40 px-3.5 py-2 text-xs font-semibold hover:bg-[#872643] transition cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>Send Anniversary Wish</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenWhatsApp(customer, "coupon")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#741F38] text-[#FAF7F0] border border-[#C8A96B]/40 px-3.5 py-2 text-xs font-semibold hover:bg-[#872643] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>Generate & Send Coupon</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Celebrations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-xl bg-white border border-[#E6DEC8] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6E655F]">
                  Date of Birth
                </span>
                <Cake className="w-4 h-4 text-[#741F38]" />
              </div>
              <p className="font-serif text-lg font-semibold text-[#252323] mt-1">
                {customer.dateOfBirth
                  ? formatMediumDate(customer.dateOfBirth)
                  : "Not Provided"}
              </p>
              {bdayDays !== null && (
                <p
                  className={`text-xs font-medium mt-1 ${
                    bdayDays === 0
                      ? "text-[#741F38] font-bold"
                      : bdayDays <= 7
                      ? "text-[#B7791F]"
                      : "text-[#6E655F]"
                  }`}
                >
                  {bdayDays === 0
                    ? "🎂 Celebrating Birthday Today!"
                    : `In ${bdayDays} day${bdayDays === 1 ? "" : "s"}`}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white border border-[#E6DEC8] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6E655F]">
                  Wedding Anniversary
                </span>
                <Heart className="w-4 h-4 text-[#C8A96B]" />
              </div>
              <p className="font-serif text-lg font-semibold text-[#252323] mt-1">
                {customer.anniversaryDate
                  ? formatMediumDate(customer.anniversaryDate)
                  : "Not Provided"}
              </p>
              {annivDays !== null && (
                <p
                  className={`text-xs font-medium mt-1 ${
                    annivDays === 0
                      ? "text-[#741F38] font-bold"
                      : annivDays <= 7
                      ? "text-[#B7791F]"
                      : "text-[#6E655F]"
                  }`}
                >
                  {annivDays === 0
                    ? "❤️ Celebrating Anniversary Today!"
                    : `In ${annivDays} day${annivDays === 1 ? "" : "s"}`}
                </p>
              )}
            </div>
          </div>

          {/* Separate Marketing Consent & Easy Opt-Out Governance Card */}
          <div className="rounded-xl bg-white border border-[#E6DEC8] p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {isOptedIn ? (
                <div className="w-9 h-9 rounded-xl bg-[#1F6E43]/10 text-[#1F6E43] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#9B2C2C]/10 text-[#9B2C2C] flex items-center justify-center shrink-0">
                  <ShieldOff className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-[#252323]">
                  WhatsApp Marketing Consent:{" "}
                  <span className={isOptedIn ? "text-[#1F6E43]" : "text-[#9B2C2C]"}>
                    {isOptedIn ? "Opted-In (Active)" : "Opted-Out"}
                  </span>
                </p>
                <p className="text-xs text-[#6E655F] mt-0.5">
                  Recorded separately via {consent?.channel ?? "Showroom Desk"} • Updated{" "}
                  {consent?.updatedAt ?? customer.createdAt}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleConsent(customer.id, !isOptedIn)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold border transition cursor-pointer ${
                isOptedIn
                  ? "border-[#9B2C2C]/35 text-[#9B2C2C] hover:bg-[#9B2C2C]/10"
                  : "border-[#1F6E43] bg-[#1F6E43] text-white hover:bg-[#175534]"
              }`}
            >
              {isOptedIn ? "Opt Out Patron" : "Record Opt-In"}
            </button>
          </div>

          {/* Assigned Exclusive Coupons & Expiry Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-semibold text-[#541326] flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#C8A96B]" />
                <span>Assigned Patron Coupons ({assignedCoupons.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => onOpenWhatsApp(customer, "coupon")}
                className="text-xs font-semibold text-[#741F38] hover:underline cursor-pointer"
              >
                + Issue Exclusive Coupon
              </button>
            </div>

            {assignedCoupons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8CEBE] bg-white/60 p-5 text-center">
                <p className="text-sm text-[#6E655F]">
                  No exclusive 1-to-1 coupons assigned yet.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(customer, "birthday")}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#541326] underline underline-offset-4 cursor-pointer"
                >
                  Generate Personalized Coupon & Send via WhatsApp
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {assignedCoupons.map((cp) => {
                  const ev = evaluateCoupon(cp);
                  return (
                    <div
                      key={cp.id}
                      className="rounded-xl bg-white border border-[#E6DEC8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[#541326] bg-[#FAF7F0] border border-[#C8A96B]/60 px-2.5 py-0.5 rounded-md">
                            {cp.code}
                          </span>
                          <span className="text-xs font-semibold text-[#741F38]">
                            {formatDiscountLabel(cp.discountType, cp.discountValue)}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              ev.status === "active"
                                ? "bg-[#1F6E43]/10 text-[#1F6E43]"
                                : ev.status === "expiring_today" ||
                                  ev.status === "expiring_soon"
                                ? "bg-[#B7791F]/15 text-[#B7791F]"
                                : ev.status === "redeemed"
                                ? "bg-[#541326]/10 text-[#541326]"
                                : "bg-[#9B2C2C]/10 text-[#9B2C2C]"
                            }`}
                          >
                            {ev.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#6E655F] mt-1">
                          Valid until {formatLongDate(cp.expiryDate)} • Min purchase ₹
                          {cp.minPurchaseAmount.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ev.canRedeem && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenWhatsApp(customer, "coupon", cp.code)
                              }
                              className="rounded-lg border border-[#D8CEBE] px-2.5 py-1.5 text-xs font-semibold text-[#252323] hover:border-[#C8A96B] transition cursor-pointer"
                            >
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => onRedeemCoupon(cp.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#541326] text-[#FAF7F0] px-3 py-1.5 text-xs font-semibold hover:bg-[#741F38] transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#C8A96B]" />
                              <span>Mark Redeemed</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* WhatsApp Communication History */}
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#541326] flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#C8A96B]" />
              <span>WhatsApp Communication History ({customerMessages.length})</span>
            </h3>

            {customerMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8CEBE] bg-white/60 p-5 text-center text-sm text-[#6E655F]">
                No WhatsApp greetings or offers dispatched to this patron yet.
              </div>
            ) : (
              <div className="space-y-3">
                {customerMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-xl bg-white border border-[#E6DEC8] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-[#6E655F]">
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wider font-semibold text-[#541326]">
                          {msg.templateType}
                        </span>
                        {msg.couponCode && (
                          <span className="font-mono text-[11px] bg-[#FAF7F0] border border-[#C8A96B]/50 px-2 py-0.5 rounded text-[#541326]">
                            {msg.couponCode}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1">
                        <span>{msg.sentAt}</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#1F6E43]" />
                      </span>
                    </div>
                    <p className="text-xs text-[#252323] leading-relaxed bg-[#FAF7F0] p-3 rounded-lg border border-[#EFE9DC] whitespace-pre-wrap">
                      {msg.messageText}
                    </p>
                    <p className="text-[11px] text-[#8C827A]">
                      Dispatched by {msg.sentBy} • Status: {msg.deliveryStatus}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Download,
  LayoutGrid,
  List,
  Cake,
  Heart,
  Send,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Ticket,
  MessageSquare,
  X,
  Building2,
} from "lucide-react";
import {
  Branch,
  ConsentRecord,
  Coupon,
  Customer,
  MessageTemplateType,
  UserRole,
  WhatsAppMessageLog,
} from "@/types/crm";
import {
  evaluateCoupon,
  formatDayMonth,
  getDaysUntilCelebration,
  getInitials,
  getMonthNumber,
  MONTH_NAMES,
} from "@/lib/dateUtils";
import { exportCustomersToExcel } from "@/lib/excelExport";

interface CustomersViewProps {
  customers: Customer[];
  consents: Record<string, ConsentRecord>;
  coupons: Coupon[];
  messages: WhatsAppMessageLog[];
  branches: Branch[];
  activeBranchId: string;
  userRole: UserRole;
  onOpenRegister: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onToggleConsent: (customerId: string, nextAgreed: boolean) => void;
  onSelectCustomer: (customer: Customer) => void;
  onOpenWhatsApp: (
    customer: Customer,
    template?: MessageTemplateType,
    couponCode?: string
  ) => void;
}

export default function CustomersView({
  customers,
  consents,
  coupons,
  messages,
  branches,
  activeBranchId,
  userRole,
  onOpenRegister,
  onEditCustomer,
  onDeleteCustomer,
  onToggleConsent,
  onSelectCustomer,
  onOpenWhatsApp,
}: CustomersViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState<string>("ALL");
  const [anniversaryMonthFilter, setAnniversaryMonthFilter] =
    useState<string>("ALL");
  const [consentFilter, setConsentFilter] = useState<
    "ALL" | "OPTED_IN" | "OPTED_OUT"
  >("ALL");

  const branchMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches]
  );

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");

    return customers.filter((c) => {
      // Global showroom branch filter
      if (activeBranchId !== "ALL" && c.branchId !== activeBranchId) {
        return false;
      }

      // Search by name or mobile number
      if (q) {
        const nameMatch = c.name.toLowerCase().includes(q);
        const phoneNormalized = c.whatsappNumber.replace(/\D/g, "");
        const phoneMatch =
          c.whatsappNumber.toLowerCase().includes(q) ||
          (qDigits.length > 0 && phoneNormalized.includes(qDigits));
        if (!nameMatch && !phoneMatch) return false;
      }

      // Filter by Birthday Month
      if (birthdayMonthFilter !== "ALL") {
        const m = getMonthNumber(c.dateOfBirth);
        if (m !== Number(birthdayMonthFilter)) return false;
      }

      // Filter by Wedding Anniversary Month
      if (anniversaryMonthFilter !== "ALL") {
        const m = getMonthNumber(c.anniversaryDate);
        if (m !== Number(anniversaryMonthFilter)) return false;
      }

      // Filter by Marketing Consent
      const isAgreed = consents[c.id]?.agreed ?? false;
      if (consentFilter === "OPTED_IN" && !isAgreed) return false;
      if (consentFilter === "OPTED_OUT" && isAgreed) return false;

      return true;
    });
  }, [
    customers,
    activeBranchId,
    searchQuery,
    birthdayMonthFilter,
    anniversaryMonthFilter,
    consentFilter,
    consents,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    birthdayMonthFilter !== "ALL" ||
    anniversaryMonthFilter !== "ALL" ||
    consentFilter !== "ALL";

  const handleExportExcel = () => {
    const branchLabel =
      activeBranchId === "ALL"
        ? "All-Showrooms"
        : branchMap.get(activeBranchId)?.code ?? "Showroom";

    exportCustomersToExcel({
      customers: filteredCustomers,
      branches,
      consents,
      coupons,
      branchLabel,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#741F38] font-semibold">
            Centralized Patron Registry
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#252323]">
            Showroom Customer Directory
          </h1>
          <p className="text-sm text-[#6E655F] mt-0.5">
            Showing{" "}
            <strong className="text-[#252323]">{filteredCustomers.length}</strong>{" "}
            registered patrons • Click any patron to view assigned coupons &
            WhatsApp communication history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Table / Cards Toggle */}
          <div className="inline-flex rounded-xl bg-white border border-[#E6DEC8] p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#541326] text-[#FAF7F0]"
                  : "text-[#6E655F] hover:text-[#252323]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-[#541326] text-[#FAF7F0]"
                  : "text-[#6E655F] hover:text-[#252323]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Profile Cards</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#C8A96B] text-[#541326] px-4 py-2.5 text-xs font-semibold hover:bg-[#FAF3E3] transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#741F38]" />
            <span>Export to Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onOpenRegister}
            className="inline-flex items-center gap-2 rounded-xl bg-[#541326] text-[#FAF7F0] px-5 py-2.5 text-xs font-semibold hover:bg-[#741F38] shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#C8A96B]" />
            <span>Register Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Month Filters Bar */}
      <div className="rounded-2xl bg-white border border-[#E6DEC8] p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#8C827A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by patron name or WhatsApp number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] pl-10 pr-4 py-2.5 text-sm text-[#252323] placeholder:text-[#9A9087] focus:outline-none focus:border-[#541326]"
            />
          </div>

          {/* Filter by Birthday Month */}
          <div className="md:col-span-3">
            <select
              value={birthdayMonthFilter}
              onChange={(e) => setBirthdayMonthFilter(e.target.value)}
              aria-label="Filter by Birthday Month"
              className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-sm text-[#252323] focus:outline-none focus:border-[#541326]"
            >
              <option value="ALL">Birthday Month: All Months</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={`bm-${m}`} value={String(idx + 1)}>
                  🎂 Birthday in {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Anniversary Month */}
          <div className="md:col-span-3">
            <select
              value={anniversaryMonthFilter}
              onChange={(e) => setAnniversaryMonthFilter(e.target.value)}
              aria-label="Filter by Wedding Anniversary Month"
              className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-sm text-[#252323] focus:outline-none focus:border-[#541326]"
            >
              <option value="ALL">Anniversary Month: All Months</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={`am-${m}`} value={String(idx + 1)}>
                  ❤️ Anniversary in {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Consent */}
          <div className="md:col-span-2">
            <select
              value={consentFilter}
              onChange={(e) =>
                setConsentFilter(
                  e.target.value as "ALL" | "OPTED_IN" | "OPTED_OUT"
                )
              }
              aria-label="Filter by WhatsApp Consent"
              className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3 py-2.5 text-sm text-[#252323] focus:outline-none focus:border-[#541326]"
            >
              <option value="ALL">Consent: All</option>
              <option value="OPTED_IN">✓ Opted-In</option>
              <option value="OPTED_OUT">✕ Opted-Out</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-2.5 border-t border-[#EFE9DC] flex items-center justify-between text-xs">
            <span className="text-[#6E655F]">
              Active filters applied ({filteredCustomers.length} matching records)
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setBirthdayMonthFilter("ALL");
                setAnniversaryMonthFilter("ALL");
                setConsentFilter("ALL");
              }}
              className="inline-flex items-center gap-1 font-semibold text-[#741F38] hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#E6DEC8] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F0] border border-[#C8A96B]/40 mx-auto flex items-center justify-center text-[#541326] mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-[#252323]">
            No matching patron records found
          </h3>
          <p className="text-sm text-[#6E655F] mt-1 max-w-md mx-auto">
            Adjust your search query or month filters, or register a new walk-in
            showroom customer in under 30 seconds.
          </p>
          <button
            type="button"
            onClick={onOpenRegister}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#541326] text-[#FAF7F0] px-5 py-2.5 text-xs font-semibold hover:bg-[#741F38] transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#C8A96B]" />
            <span>Register New Customer</span>
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="rounded-2xl bg-white border border-[#E6DEC8] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#E6DEC8] text-[11px] font-semibold uppercase tracking-wider text-[#6E655F]">
                  <th className="py-3.5 px-5">Customer & Branch</th>
                  <th className="py-3.5 px-4">WhatsApp Mobile</th>
                  <th className="py-3.5 px-4">Birthday</th>
                  <th className="py-3.5 px-4">Anniversary</th>
                  <th className="py-3.5 px-4">Assigned Coupons</th>
                  <th className="py-3.5 px-4">Marketing Consent</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE9DC] text-sm">
                {filteredCustomers.map((customer) => {
                  const br = branchMap.get(customer.branchId);
                  const isAgreed = consents[customer.id]?.agreed ?? false;
                  const bDays = getDaysUntilCelebration(customer.dateOfBirth);
                  const aDays = getDaysUntilCelebration(customer.anniversaryDate);
                  const patronCoupons = coupons.filter(
                    (cp) => cp.assignedCustomerId === customer.id
                  );
                  const msgCount = messages.filter(
                    (m) => m.customerId === customer.id
                  ).length;

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-[#FAF7F0]/75 transition group"
                    >
                      {/* Customer & Branch */}
                      <td className="py-4 px-5">
                        <div
                          onClick={() => onSelectCustomer(customer)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#541326] text-[#C8A96B] border border-[#C8A96B]/40 flex items-center justify-center font-serif font-bold text-xs shrink-0">
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#252323] group-hover:text-[#541326]">
                              {customer.name}
                            </p>
                            <p className="text-xs text-[#6E655F] flex items-center gap-1.5">
                              <span>
                                {br ? `${br.name} (${br.city})` : customer.branchId}
                              </span>
                              {msgCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#741F38]">
                                  • <MessageSquare className="w-3 h-3" /> {msgCount}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp Mobile */}
                      <td className="py-4 px-4 font-mono text-xs text-[#252323] whitespace-nowrap">
                        {customer.whatsappNumber}
                      </td>

                      {/* Birthday */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {customer.dateOfBirth ? (
                          <div>
                            <span className="text-xs font-medium text-[#252323]">
                              {formatDayMonth(customer.dateOfBirth)}
                            </span>
                            {bDays !== null && bDays <= 7 && (
                              <span
                                className={`ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  bDays === 0
                                    ? "bg-[#541326] text-[#C8A96B]"
                                    : "bg-[#C8A96B]/25 text-[#541326]"
                                }`}
                              >
                                {bDays === 0 ? "Today!" : `${bDays}d`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#A39B93]">—</span>
                        )}
                      </td>

                      {/* Anniversary */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {customer.anniversaryDate ? (
                          <div>
                            <span className="text-xs font-medium text-[#252323]">
                              {formatDayMonth(customer.anniversaryDate)}
                            </span>
                            {aDays !== null && aDays <= 7 && (
                              <span
                                className={`ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  aDays === 0
                                    ? "bg-[#541326] text-[#C8A96B]"
                                    : "bg-[#C8A96B]/25 text-[#541326]"
                                }`}
                              >
                                {aDays === 0 ? "Today!" : `${aDays}d`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#A39B93]">—</span>
                        )}
                      </td>

                      {/* Assigned Coupons */}
                      <td className="py-4 px-4">
                        {patronCoupons.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(customer, "coupon")}
                            className="text-xs text-[#741F38] hover:underline cursor-pointer"
                          >
                            + Assign Coupon
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {patronCoupons.map((cp) => {
                              const ev = evaluateCoupon(cp);
                              return (
                                <span
                                  key={cp.id}
                                  onClick={() => onSelectCustomer(customer)}
                                  title={`${cp.name} — ${ev.label}`}
                                  className={`cursor-pointer inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                    ev.status === "expiring_today" ||
                                    ev.status === "expiring_soon"
                                      ? "bg-[#B7791F]/10 border-[#B7791F]/40 text-[#B7791F]"
                                      : ev.status === "active"
                                      ? "bg-[#FAF7F0] border-[#C8A96B] text-[#541326]"
                                      : "bg-[#F3EFE6] border-[#D8CEBE] text-[#6E655F]"
                                  }`}
                                >
                                  <span>{cp.code}</span>
                                  <span className="text-[10px] font-sans">
                                    • {ev.label}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Separate Marketing Consent + Quick Opt-Out */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isAgreed
                                ? "bg-[#1F6E43]/10 text-[#1F6E43]"
                                : "bg-[#9B2C2C]/10 text-[#9B2C2C]"
                            }`}
                          >
                            {isAgreed ? (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                <span>Opted-In</span>
                              </>
                            ) : (
                              <>
                                <ShieldOff className="w-3 h-3" />
                                <span>Opted-Out</span>
                              </>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleConsent(customer.id, !isAgreed)}
                            className="text-[11px] text-[#6E655F] hover:text-[#541326] underline cursor-pointer"
                            title={
                              isAgreed
                                ? "Record Patron Opt-Out"
                                : "Record Patron Opt-In"
                            }
                          >
                            {isAgreed ? "Opt out" : "Opt in"}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenWhatsApp(
                                customer,
                                bDays === 0
                                  ? "birthday"
                                  : aDays === 0
                                  ? "anniversary"
                                  : "festival"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#541326] text-[#FAF7F0] px-3 py-1.5 text-xs font-semibold hover:bg-[#741F38] transition cursor-pointer"
                            title="Send Personalized WhatsApp Greeting"
                          >
                            <Send className="w-3 h-3 text-[#C8A96B]" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditCustomer(customer)}
                            className="rounded-lg border border-[#E6DEC8] p-1.5 text-[#6E655F] hover:text-[#541326] hover:border-[#C8A96B] transition cursor-pointer"
                            title="Edit Customer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {userRole === "admin" && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomer(customer)}
                              className="rounded-lg border border-[#E6DEC8] p-1.5 text-[#6E655F] hover:text-[#9B2C2C] hover:border-[#9B2C2C]/40 transition cursor-pointer"
                              title="Delete Customer (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ELEGANT LUXURY PROFILE CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCustomers.map((customer) => {
            const br = branchMap.get(customer.branchId);
            const isAgreed = consents[customer.id]?.agreed ?? false;
            const patronCoupons = coupons.filter(
              (cp) => cp.assignedCustomerId === customer.id
            );
            const customerLogs = messages.filter(
              (m) => m.customerId === customer.id
            );

            return (
              <div
                key={customer.id}
                className="rounded-2xl bg-white border border-[#E6DEC8] hover:border-[#C8A96B] p-5 shadow-2xs flex flex-col justify-between transition"
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => onSelectCustomer(customer)}
                      className="flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#541326] text-[#C8A96B] border border-[#C8A96B]/50 flex items-center justify-center font-serif font-bold text-base shrink-0">
                        {getInitials(customer.name)}
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-semibold text-[#252323] hover:text-[#541326]">
                          {customer.name}
                        </h3>
                        <p className="font-mono text-xs text-[#6E655F]">
                          {customer.whatsappNumber}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                        isAgreed
                          ? "bg-[#1F6E43]/10 text-[#1F6E43]"
                          : "bg-[#9B2C2C]/10 text-[#9B2C2C]"
                      }`}
                    >
                      {isAgreed ? "Opted-In" : "Opted-Out"}
                    </span>
                  </div>

                  {/* Branch */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#6E655F]">
                    <Building2 className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>{br ? `${br.name}, ${br.city}` : customer.branchId}</span>
                  </div>

                  {/* Birthday & Anniversary */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-[#FAF7F0] border border-[#EFE9DC] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-[#6E655F] flex items-center gap-1">
                        <Cake className="w-3 h-3 text-[#741F38]" />
                        <span>Birthday</span>
                      </p>
                      <p className="text-xs font-semibold text-[#252323] mt-0.5">
                        {formatDayMonth(customer.dateOfBirth)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#FAF7F0] border border-[#EFE9DC] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-[#6E655F] flex items-center gap-1">
                        <Heart className="w-3 h-3 text-[#C8A96B]" />
                        <span>Anniversary</span>
                      </p>
                      <p className="text-xs font-semibold text-[#252323] mt-0.5">
                        {formatDayMonth(customer.anniversaryDate)}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Coupons & Expiry Status */}
                  <div className="mt-3.5">
                    <p className="text-[11px] font-semibold text-[#6E655F] flex items-center gap-1 mb-1.5">
                      <Ticket className="w-3.5 h-3.5 text-[#C8A96B]" />
                      <span>Assigned Coupons ({patronCoupons.length})</span>
                    </p>
                    {patronCoupons.length === 0 ? (
                      <p className="text-xs text-[#9A9087]">
                        No exclusive coupon assigned yet
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {patronCoupons.map((cp) => {
                          const ev = evaluateCoupon(cp);
                          return (
                            <span
                              key={cp.id}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold bg-[#FAF7F0] border border-[#C8A96B]/60 text-[#541326] px-2 py-0.5 rounded-md"
                            >
                              <span>{cp.code}</span>
                              <span className="font-sans text-[10px] text-[#741F38]">
                                ({ev.label})
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Communication History + Actions */}
                <div className="mt-4 pt-3.5 border-t border-[#EFE9DC] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer)}
                    className="text-xs font-semibold text-[#541326] hover:underline cursor-pointer"
                  >
                    History ({customerLogs.length} msgs) →
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditCustomer(customer)}
                      className="rounded-lg border border-[#E6DEC8] p-1.5 text-[#6E655F] hover:text-[#541326] cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(customer, "birthday")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#541326] text-[#FAF7F0] px-3 py-1.5 text-xs font-semibold hover:bg-[#741F38] cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-[#C8A96B]" />
                      <span>Send Wish</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

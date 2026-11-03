"use client";

import React, { useMemo, useState } from "react";
import {
  Ticket,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  Search,
  Sparkles,
  Power,
  X,
  Clock,
  Ban,
  User,
} from "lucide-react";
import {
  Branch,
  Coupon,
  CouponCategory,
  Customer,
  DiscountType,
  MessageTemplateType,
  UserRole,
} from "@/types/crm";
import {
  addDaysISO,
  evaluateCoupon,
  formatDiscountLabel,
  formatINR,
  formatLongDate,
  toLocalISODate,
} from "@/lib/dateUtils";

interface CouponsViewProps {
  coupons: Coupon[];
  customers: Customer[];
  branches: Branch[];
  activeBranchId: string;
  userRole: UserRole;
  onCreateCoupon: (
    data: Omit<Coupon, "id" | "createdAt" | "usedCount">
  ) => Coupon;
  onToggleCouponEnabled: (couponId: string) => void;
  onRedeemCoupon: (couponId: string) => void;
  onSendCouponWhatsApp: (
    customer: Customer | null,
    template: MessageTemplateType,
    couponCode: string
  ) => void;
}

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "EXPIRING_7D"
  | "REDEEMED"
  | "UNUSED"
  | "EXPIRED"
  | "DISABLED";

export default function CouponsView({
  coupons,
  customers,
  branches,
  activeBranchId,
  userRole,
  onCreateCoupon,
  onToggleCouponEnabled,
  onRedeemCoupon,
  onSendCouponWhatsApp,
}: CouponsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchCode, setSearchCode] = useState<string>("");

  // Showroom Coupon Validation Desk state
  const [validatorInput, setValidatorInput] = useState<string>("");
  const [validatorBillAmount, setValidatorBillAmount] = useState<string>("");

  // Create Offer Modal state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<CouponCategory>("birthday");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number>(5000);
  const [startDate, setStartDate] = useState<string>(toLocalISODate());
  const [expiryDate, setExpiryDate] = useState<string>(addDaysISO(15));
  const [maxUses, setMaxUses] = useState<number>(1);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [couponBranchId, setCouponBranchId] = useState<string>(
    activeBranchId !== "ALL" ? activeBranchId : "ALL"
  );
  const [assignedCustomerId, setAssignedCustomerId] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const branchMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches]
  );

  // Scoped coupons by branch
  const scopedCoupons = useMemo(
    () =>
      activeBranchId === "ALL"
        ? coupons
        : coupons.filter(
            (c) => c.branchId === "ALL" || c.branchId === activeBranchId
          ),
    [coupons, activeBranchId]
  );

  // 7 Requested Coupon Tracking Dashboard Metrics
  const trackingStats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let redeemed = 0;
    let unused = 0;
    let expiringToday = 0;
    let expiringWithin7Days = 0;

    scopedCoupons.forEach((cp) => {
      const ev = evaluateCoupon(cp);
      if (ev.canRedeem) active++;
      if (ev.status === "expired") expired++;
      if (cp.usedCount > 0) redeemed++;
      if (cp.usedCount === 0) unused++;
      if (ev.status === "expiring_today") expiringToday++;
      if (ev.status === "expiring_today" || ev.status === "expiring_soon") {
        expiringWithin7Days++;
      }
    });

    return {
      total: scopedCoupons.length,
      active,
      expired,
      redeemed,
      unused,
      expiringToday,
      expiringWithin7Days,
    };
  }, [scopedCoupons]);

  // Filtered Coupons List
  const filteredCoupons = useMemo(() => {
    const q = searchCode.trim().toLowerCase();

    return scopedCoupons.filter((cp) => {
      const ev = evaluateCoupon(cp);

      if (q) {
        const assignedPatron = cp.assignedCustomerId
          ? customerMap.get(cp.assignedCustomerId)?.name.toLowerCase() ?? ""
          : "";
        if (
          !cp.code.toLowerCase().includes(q) &&
          !cp.name.toLowerCase().includes(q) &&
          !assignedPatron.includes(q)
        ) {
          return false;
        }
      }

      if (categoryFilter !== "ALL" && cp.category !== categoryFilter) {
        return false;
      }

      if (statusFilter === "ACTIVE" && !ev.canRedeem) return false;
      if (
        statusFilter === "EXPIRING_7D" &&
        ev.status !== "expiring_today" &&
        ev.status !== "expiring_soon"
      )
        return false;
      if (statusFilter === "REDEEMED" && cp.usedCount === 0) return false;
      if (statusFilter === "UNUSED" && cp.usedCount > 0) return false;
      if (statusFilter === "EXPIRED" && ev.status !== "expired") return false;
      if (statusFilter === "DISABLED" && cp.enabled) return false;

      return true;
    });
  }, [scopedCoupons, searchCode, categoryFilter, statusFilter, customerMap]);

  // Real-time Validation Desk Result
  const validationResult = useMemo(() => {
    const clean = validatorInput.trim().toUpperCase();
    if (!clean) return null;

    const matched = coupons.find((c) => c.code.toUpperCase() === clean);
    if (!matched) {
      return {
        found: false as const,
        message: `No coupon found matching code "${clean}". Please verify spelling.`,
      };
    }

    const ev = evaluateCoupon(matched);
    const billNum = Number(validatorBillAmount);
    const hasBill = validatorBillAmount.trim() !== "" && !isNaN(billNum);
    const minBillFailed = hasBill && billNum < matched.minPurchaseAmount;

    const assignedPatron = matched.assignedCustomerId
      ? customerMap.get(matched.assignedCustomerId)
      : null;

    return {
      found: true as const,
      coupon: matched,
      evaluation: ev,
      assignedPatron,
      minBillFailed,
      canProceed: ev.canRedeem && !minBillFailed,
    };
  }, [validatorInput, validatorBillAmount, coupons, customerMap]);

  const openCreateModal = (presetCategory: CouponCategory = "birthday") => {
    setFormError("");
    setCategory(presetCategory);
    setStartDate(toLocalISODate());
    setExpiryDate(addDaysISO(15));
    setEnabled(true);
    setCouponBranchId(activeBranchId !== "ALL" ? activeBranchId : "ALL");
    setAssignedCustomerId("");

    if (presetCategory === "birthday") {
      setDiscountType("percentage");
      setDiscountValue(15);
      setMinPurchaseAmount(5000);
      setMaxUses(1);
      setCode(`BDAY15-${Math.floor(100 + Math.random() * 899)}`);
      setName("Personalized Birthday Silk Privilege");
      setDescription("Exclusive 15% birthday savings on heritage silk sarees.");
    } else if (presetCategory === "anniversary") {
      setDiscountType("fixed");
      setDiscountValue(500);
      setMinPurchaseAmount(4000);
      setMaxUses(1);
      setCode(`ANN500-${Math.floor(100 + Math.random() * 899)}`);
      setName("Wedding Anniversary Celebration Voucher");
      setDescription("Complimentary ₹500 anniversary privilege on silk purchases.");
    } else if (presetCategory === "festival") {
      setDiscountType("percentage");
      setDiscountValue(20);
      setMinPurchaseAmount(10000);
      setMaxUses(100);
      setCode(`FESTIVE20-${Math.floor(10 + Math.random() * 89)}`);
      setName("Festive Kanchipuram Zari Edit Offer");
      setDescription("Special festive privilege across showroom silk collections.");
    } else {
      setDiscountType("fixed");
      setDiscountValue(1000);
      setMinPurchaseAmount(7500);
      setMaxUses(1);
      setCode(`VIP1000-${Math.floor(100 + Math.random() * 899)}`);
      setName("Exclusive Showroom Patron Offer");
      setDescription("Bespoke single-use privilege curated for valued showroom patron.");
    }

    setIsCreateOpen(true);
  };

  const handleAutoGenerateCode = () => {
    const patron = assignedCustomerId ? customerMap.get(assignedCustomerId) : null;
    const patronTag = patron
      ? patron.name
          .replace(/^(Smt\.|Sri\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
          .split(/\s+/)[0]
          .replace(/[^a-zA-Z]/g, "")
          .toUpperCase()
          .slice(0, 6)
      : "";

    const prefix =
      category === "birthday"
        ? "BDAY"
        : category === "anniversary"
        ? "ANN"
        : category === "festival"
        ? "FEST"
        : "SILK";

    const rand = Math.floor(10 + Math.random() * 89);
    const generated = patronTag
      ? `${prefix}-${patronTag}${discountValue}`
      : `${prefix}${discountValue}-${rand}`;

    setCode(generated.toUpperCase());
  };

  const handleSaveOffer = (sendWhatsAppAfter: boolean) => {
    setFormError("");
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "-");
    if (!cleanCode) {
      setFormError("Please enter a unique coupon code.");
      return;
    }

    if (coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      setFormError(
        `Coupon code "${cleanCode}" already exists. Every coupon must have a unique code.`
      );
      return;
    }

    if (!name.trim()) {
      setFormError("Please enter an offer name.");
      return;
    }

    if (discountValue <= 0) {
      setFormError("Discount value must be greater than zero.");
      return;
    }

    if (discountType === "percentage" && discountValue > 90) {
      setFormError("Percentage discount cannot exceed 90%.");
      return;
    }

    if (expiryDate < startDate) {
      setFormError("Expiry date cannot be earlier than start date.");
      return;
    }

    const created = onCreateCoupon({
      code: cleanCode,
      name: name.trim(),
      description: description.trim() || name.trim(),
      category,
      discountType,
      discountValue,
      minPurchaseAmount: Math.max(0, minPurchaseAmount),
      startDate,
      expiryDate,
      maxUses: Math.max(1, maxUses),
      enabled,
      branchId: couponBranchId,
      assignedCustomerId: assignedCustomerId || undefined,
    });

    setIsCreateOpen(false);

    if (sendWhatsAppAfter) {
      const targetCustomer = assignedCustomerId
        ? customerMap.get(assignedCustomerId) ?? null
        : null;
      const tpl: MessageTemplateType =
        category === "birthday"
          ? "birthday"
          : category === "anniversary"
          ? "anniversary"
          : category === "festival"
          ? "festival"
          : "coupon";
      onSendCouponWhatsApp(targetCustomer, tpl, created.code);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Personalized Coupon Generators */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#741F38] font-semibold">
            Centralized Privilege & Redemption Governance
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#252323]">
            Coupon Codes & Special Offers Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openCreateModal("birthday")}
            className="rounded-xl bg-white border border-[#C8A96B] text-[#541326] px-3.5 py-2.5 text-xs font-semibold hover:bg-[#FAF3E3] transition cursor-pointer"
          >
            🎂 + Birthday Coupon
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("anniversary")}
            className="rounded-xl bg-white border border-[#C8A96B] text-[#541326] px-3.5 py-2.5 text-xs font-semibold hover:bg-[#FAF3E3] transition cursor-pointer"
          >
            ❤️ + Anniversary Coupon
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("festival")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#541326] text-[#FAF7F0] px-5 py-2.5 text-xs font-semibold hover:bg-[#741F38] shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C8A96B]" />
            <span>Create Custom Offer</span>
          </button>
        </div>
      </div>

      {/* 7-Metric Coupon Tracking Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          {
            id: "ALL" as StatusFilter,
            label: "Total Created",
            value: trackingStats.total,
            tone: "text-[#252323]",
          },
          {
            id: "ACTIVE" as StatusFilter,
            label: "Active Coupons",
            value: trackingStats.active,
            tone: "text-[#1F6E43]",
          },
          {
            id: "REDEEMED" as StatusFilter,
            label: "Redeemed",
            value: trackingStats.redeemed,
            tone: "text-[#541326]",
          },
          {
            id: "UNUSED" as StatusFilter,
            label: "Unused Coupons",
            value: trackingStats.unused,
            tone: "text-[#252323]",
          },
          {
            id: "EXPIRING_7D" as StatusFilter,
            label: "Expiring Today",
            value: trackingStats.expiringToday,
            tone: "text-[#B7791F]",
          },
          {
            id: "EXPIRING_7D" as StatusFilter,
            label: "Expiring ≤ 7 Days",
            value: trackingStats.expiringWithin7Days,
            tone: "text-[#B7791F]",
          },
          {
            id: "EXPIRED" as StatusFilter,
            label: "Expired Coupons",
            value: trackingStats.expired,
            tone: "text-[#9B2C2C]",
          },
        ].map((stat, idx) => (
          <button
            key={`${stat.label}-${idx}`}
            type="button"
            onClick={() => setStatusFilter(stat.id)}
            className={`text-left rounded-2xl bg-white border p-4 transition cursor-pointer ${
              statusFilter === stat.id
                ? "border-[#541326] ring-2 ring-[#541326]/10"
                : "border-[#E6DEC8] hover:border-[#C8A96B]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6E655F]">
              {stat.label}
            </p>
            <p className={`font-serif text-2xl font-bold mt-1 ${stat.tone}`}>
              {stat.value}
            </p>
          </button>
        ))}
      </div>

      {/* Interactive Showroom Coupon Validation & Redemption Desk */}
      <div className="rounded-2xl bg-[#541326] text-[#FAF7F0] p-5 sm:p-6 border border-[#C8A96B]/50 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#C8A96B] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Showroom Billing & Coupon Verification Desk</span>
            </div>
            <h2 className="font-serif text-xl font-semibold mt-1">
              Validate & Redeem Patron Coupon Code
            </h2>
            <p className="text-xs text-[#FAF7F0]/75 mt-0.5">
              Verifies unique code, expiry validity, enabled status, minimum bill
              threshold, and single-use redemption protection.
            </p>
          </div>

          <div className="flex-1 max-w-xl flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="Enter coupon code (e.g. BDAY-MEENA15 or SILK-MYTHILI750)"
              value={validatorInput}
              onChange={(e) => setValidatorInput(e.target.value)}
              className="flex-1 rounded-xl bg-white text-[#252323] px-4 py-3 text-sm font-mono font-semibold placeholder:font-sans placeholder:font-normal placeholder:text-[#9A9087] focus:outline-none"
            />
            <input
              type="number"
              placeholder="Bill ₹ (optional)"
              value={validatorBillAmount}
              onChange={(e) => setValidatorBillAmount(e.target.value)}
              className="sm:w-40 rounded-xl bg-white text-[#252323] px-3.5 py-3 text-sm font-mono placeholder:font-sans placeholder:text-[#9A9087] focus:outline-none"
            />
            {validatorInput && (
              <button
                type="button"
                onClick={() => {
                  setValidatorInput("");
                  setValidatorBillAmount("");
                }}
                className="rounded-xl bg-[#741F38] px-3 py-2 text-xs font-semibold text-[#FAF7F0] hover:bg-[#8A2644] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Validation Output Banner */}
        {validationResult && (
          <div className="mt-4 rounded-xl bg-[#FAF7F0] text-[#252323] p-4 border border-[#C8A96B]">
            {!validationResult.found ? (
              <div className="flex items-center gap-2.5 text-sm text-[#9B2C2C] font-semibold">
                <Ban className="w-5 h-5 shrink-0" />
                <span>{validationResult.message}</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold bg-[#541326] text-[#C8A96B] px-3 py-1 rounded-lg">
                      {validationResult.coupon.code}
                    </span>
                    <span className="font-semibold text-sm text-[#541326]">
                      {formatDiscountLabel(
                        validationResult.coupon.discountType,
                        validationResult.coupon.discountValue
                      )}
                    </span>
                    <span className="text-sm font-medium text-[#252323]">
                      — {validationResult.coupon.name}
                    </span>
                  </div>

                  <p className="text-xs text-[#6E655F]">
                    Min Purchase:{" "}
                    <strong>
                      {formatINR(validationResult.coupon.minPurchaseAmount)}
                    </strong>{" "}
                    • Uses:{" "}
                    <strong>
                      {validationResult.coupon.usedCount}/
                      {validationResult.coupon.maxUses}
                    </strong>{" "}
                    • Expires:{" "}
                    <strong>
                      {formatLongDate(validationResult.coupon.expiryDate)}
                    </strong>
                    {validationResult.assignedPatron && (
                      <>
                        {" "}
                        • Assigned Exclusively to{" "}
                        <strong className="text-[#541326]">
                          {validationResult.assignedPatron.name}
                        </strong>
                      </>
                    )}
                  </p>

                  {!validationResult.evaluation.canRedeem && (
                    <p className="text-xs font-semibold text-[#9B2C2C] flex items-center gap-1.5 pt-0.5">
                      <Ban className="w-4 h-4 shrink-0" />
                      <span>
                        Redemption Blocked:{" "}
                        {validationResult.evaluation.blockReason}
                      </span>
                    </p>
                  )}

                  {validationResult.evaluation.canRedeem &&
                    validationResult.minBillFailed && (
                      <p className="text-xs font-semibold text-[#B7791F] flex items-center gap-1.5 pt-0.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          Minimum purchase of{" "}
                          {formatINR(validationResult.coupon.minPurchaseAmount)}{" "}
                          required for this offer.
                        </span>
                      </p>
                    )}

                  {validationResult.canProceed && (
                    <p className="text-xs font-semibold text-[#1F6E43] flex items-center gap-1.5 pt-0.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Valid & Ready for Redemption!{" "}
                        {validationResult.evaluation.daysRemaining === 0
                          ? "⚠️ Urgent: Coupon expires at showroom close today."
                          : `${validationResult.evaluation.daysRemaining} day(s) remaining.`}
                      </span>
                    </p>
                  )}
                </div>

                {validationResult.canProceed && (
                  <button
                    type="button"
                    onClick={() => onRedeemCoupon(validationResult.coupon.id)}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#1F6E43] text-white px-5 py-3 text-xs font-bold hover:bg-[#175534] shadow-sm transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Coupon as Redeemed</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-white border border-[#E6DEC8] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C827A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search coupon code, offer title, or assigned patron..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] pl-10 pr-4 py-2.5 text-sm text-[#252323] focus:outline-none focus:border-[#541326]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-xs font-semibold text-[#252323] focus:outline-none focus:border-[#541326]"
          >
            <option value="ALL">All Occasion Categories</option>
            <option value="birthday">🎂 Birthday Coupons</option>
            <option value="anniversary">❤️ Anniversary Coupons</option>
            <option value="festival">✨ Festival Offers</option>
            <option value="exclusive">★ Exclusive Patron Coupons</option>
            <option value="collection">🧣 New Collection</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-xs font-semibold text-[#252323] focus:outline-none focus:border-[#541326]"
          >
            <option value="ALL">Status: All Coupons</option>
            <option value="ACTIVE">Active & Valid</option>
            <option value="EXPIRING_7D">Expiring Today / ≤ 7 Days</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="UNUSED">Unused</option>
            <option value="EXPIRED">Expired</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* Luxury Coupon Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredCoupons.map((cp) => {
          const ev = evaluateCoupon(cp);
          const assignedPatron = cp.assignedCustomerId
            ? customerMap.get(cp.assignedCustomerId) ?? null
            : null;
          const br =
            cp.branchId === "ALL" ? null : branchMap.get(cp.branchId);
          const usagePct = Math.min(
            100,
            Math.round((cp.usedCount / Math.max(1, cp.maxUses)) * 100)
          );

          return (
            <div
              key={cp.id}
              className={`rounded-2xl bg-white border p-5 shadow-2xs flex flex-col justify-between transition ${
                ev.status === "expiring_today"
                  ? "border-[#B7791F]"
                  : "border-[#E6DEC8] hover:border-[#C8A96B]"
              }`}
            >
              <div>
                {/* Ticket Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-2">
                      <span
                        onClick={() => setValidatorInput(cp.code)}
                        title="Click to load in Verification Desk"
                        className="cursor-pointer font-mono text-sm font-bold bg-[#FAF7F0] border border-dashed border-[#C8A96B] text-[#541326] px-3 py-1 rounded-lg hover:bg-[#541326] hover:text-[#C8A96B] transition"
                      >
                        {cp.code}
                      </span>
                      <span className="rounded-lg bg-[#541326] text-[#C8A96B] px-2.5 py-1 text-xs font-bold">
                        {formatDiscountLabel(cp.discountType, cp.discountValue)}
                      </span>
                    </div>
                  </div>

                  {/* Lifecycle Badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
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

                {/* Title & Description */}
                <h3 className="font-serif text-lg font-semibold text-[#252323] mt-3">
                  {cp.name}
                </h3>
                <p className="text-xs text-[#6E655F] mt-1 leading-relaxed">
                  {cp.description}
                </p>

                {/* Assigned Patron Pill (if exclusive 1-to-1) */}
                {assignedPatron && (
                  <div className="mt-3 rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3 py-2 flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-[#741F38] shrink-0" />
                    <span className="truncate">
                      Exclusive Patron:{" "}
                      <strong className="text-[#541326]">
                        {assignedPatron.name}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Validity & Expiry Warning */}
                <div className="mt-3.5 space-y-1.5 text-xs text-[#6E655F]">
                  <div className="flex items-center justify-between">
                    <span>Minimum Purchase:</span>
                    <strong className="text-[#252323]">
                      {formatINR(cp.minPurchaseAmount)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valid Until:</span>
                    <strong className="text-[#252323]">
                      {formatLongDate(cp.expiryDate)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Showroom Scope:</span>
                    <strong className="text-[#252323]">
                      {br ? `${br.city} (${br.code})` : "All 5 Showrooms"}
                    </strong>
                  </div>
                </div>

                {/* Expiry Warning Banner */}
                {(ev.status === "expiring_today" ||
                  ev.status === "expiring_soon") && (
                  <div className="mt-3 rounded-lg bg-[#B7791F]/10 border border-[#B7791F]/30 px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#B7791F]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {ev.status === "expiring_today"
                        ? "Expires today! Send reminder via WhatsApp."
                        : `Expiring soon — ${ev.daysRemaining} days of validity left.`}
                    </span>
                  </div>
                )}

                {/* Redemption Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-[#6E655F] mb-1">
                    <span>
                      Redemptions:{" "}
                      <strong className="text-[#252323]">
                        {cp.usedCount} / {cp.maxUses}
                      </strong>{" "}
                      {cp.maxUses === 1 ? "(Single-Use)" : ""}
                    </span>
                    <span>{usagePct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EFE9DC] overflow-hidden">
                    <div
                      style={{ width: `${usagePct}%` }}
                      className="h-full bg-[#541326] rounded-full transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Card Actions: Enable/Disable + Redeem + Send WhatsApp */}
              <div className="mt-4 pt-3.5 border-t border-[#EFE9DC] flex items-center justify-between gap-2">
                {userRole === "admin" ? (
                  <button
                    type="button"
                    onClick={() => onToggleCouponEnabled(cp.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                      cp.enabled
                        ? "border-[#E6DEC8] text-[#6E655F] hover:text-[#9B2C2C]"
                        : "border-[#1F6E43] text-[#1F6E43] bg-[#1F6E43]/5"
                    }`}
                    title={cp.enabled ? "Disable Coupon" : "Enable Coupon"}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{cp.enabled ? "Disable" : "Enable"}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#8C827A]">
                    {cp.enabled ? "Enabled" : "Disabled"}
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  {ev.canRedeem && (
                    <button
                      type="button"
                      onClick={() => onRedeemCoupon(cp.id)}
                      className="rounded-lg border border-[#1F6E43] text-[#1F6E43] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#1F6E43]/10 transition cursor-pointer"
                    >
                      Redeem
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!ev.canRedeem}
                    onClick={() => {
                      const tpl: MessageTemplateType =
                        cp.category === "birthday"
                          ? "birthday"
                          : cp.category === "anniversary"
                          ? "anniversary"
                          : cp.category === "festival"
                          ? "festival"
                          : "coupon";
                      onSendCouponWhatsApp(assignedPatron, tpl, cp.code);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#541326] text-[#FAF7F0] px-3 py-1.5 text-xs font-semibold hover:bg-[#741F38] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <Send className="w-3 h-3 text-[#C8A96B]" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE COUPON / SPECIAL OFFER MODAL */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#252323]/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#FAF7F0] border border-[#C8A96B]/50 shadow-2xl overflow-hidden animate-fade-in my-auto">
            <div className="bg-[#541326] px-6 py-4 text-[#FAF7F0] border-b border-[#C8A96B]/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#C8A96B] font-medium">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Showroom Offer Architect</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold">
                  Create Coupon Code & Special Offer
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-2 text-[#FAF7F0]/75 hover:text-white hover:bg-[#741F38] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl bg-[#9B2C2C]/10 border border-[#9B2C2C]/30 px-4 py-3 text-xs font-semibold text-[#9B2C2C]">
                  {formError}
                </div>
              )}

              {/* Occasion Category & Assign Individual Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Offer Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as CouponCategory)
                    }
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3.5 py-2.5 text-sm font-medium"
                  >
                    <option value="birthday">🎂 Birthday Coupon</option>
                    <option value="anniversary">❤️ Wedding Anniversary Coupon</option>
                    <option value="festival">✨ Special Festival Offer</option>
                    <option value="exclusive">★ Exclusive Individual Patron</option>
                    <option value="collection">🧣 New Collection Offer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Assign to Individual Customer (Optional)
                  </label>
                  <select
                    value={assignedCustomerId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setAssignedCustomerId(cid);
                      if (cid) setMaxUses(1);
                    }}
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3.5 py-2.5 text-sm font-medium"
                  >
                    <option value="">General Offer (Any Eligible Patron)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.whatsappNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unique Coupon Code + Auto-Generator */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Unique Coupon Code <span className="text-[#9B2C2C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BDAY15 or ANN500"
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-4 py-2.5 text-sm font-mono font-bold uppercase text-[#541326]"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="w-full rounded-xl border border-[#C8A96B] bg-white text-[#541326] py-2.5 px-3 text-xs font-semibold hover:bg-[#FAF3E3] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>Generate Unique Code</span>
                  </button>
                </div>
              </div>

              {/* Offer Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Offer Name <span className="text-[#9B2C2C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Birthday Silk Privilege"
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Showroom Branch Scope
                  </label>
                  <select
                    value={couponBranchId}
                    onChange={(e) => setCouponBranchId(e.target.value)}
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3.5 py-2.5 text-sm"
                  >
                    <option value="ALL">All Showroom Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                  Offer Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of silk collections & eligibility"
                  className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3.5 py-2.5 text-sm"
                />
              </div>

              {/* Discount Type, Value, Min Purchase, Max Uses */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => {
                      const next = e.target.value as DiscountType;
                      setDiscountType(next);
                      setDiscountValue(next === "percentage" ? 15 : 500);
                    }}
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3 py-2.5 text-sm font-medium"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Value ({discountType === "percentage" ? "%" : "₹"})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3 py-2.5 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Min Purchase (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={minPurchaseAmount}
                    onChange={(e) =>
                      setMinPurchaseAmount(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3 py-2.5 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value) || 1)}
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Start Date, Expiry Date & Enable Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl bg-white border border-[#D8CEBE] px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="pt-4">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#541326]"
                    />
                    <span className="text-sm font-semibold text-[#252323]">
                      Coupon Active / Enabled
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#E6DEC8] flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6E655F] hover:bg-[#EFE9DC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOffer(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#C8A96B] bg-white text-[#541326] px-4 py-2.5 text-sm font-semibold hover:bg-[#FAF3E3] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#1F6E43]" />
                  <span>Save & Send on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOffer(false)}
                  className="rounded-xl bg-[#541326] text-[#FAF7F0] px-6 py-2.5 text-sm font-semibold hover:bg-[#741F38] shadow-sm cursor-pointer"
                >
                  Create Coupon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

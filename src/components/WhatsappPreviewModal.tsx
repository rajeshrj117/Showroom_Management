"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Send,
  ExternalLink,
  Sparkles,
  Ticket,
  ShieldAlert,
  CheckCheck,
  Plus,
  Check,
} from "lucide-react";
import {
  Branch,
  ConsentRecord,
  Coupon,
  Customer,
  DiscountType,
  MessageTemplateType,
} from "@/types/crm";
import {
  addDaysISO,
  evaluateCoupon,
  formatDiscountLabel,
  formatINR,
  formatLongDate,
  toLocalISODate,
  toWhatsAppUrlNumber,
} from "@/lib/dateUtils";

interface WhatsappPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  allCustomers: Customer[];
  consents: Record<string, ConsentRecord>;
  coupons: Coupon[];
  branches: Branch[];
  initialTemplate?: MessageTemplateType;
  initialCouponCode?: string;
  onQuickCreateCoupon: (couponData: Omit<Coupon, "id" | "createdAt" | "usedCount">) => Coupon;
  onSendWhatsApp: (payload: {
    customerId: string;
    branchId: string;
    templateType: MessageTemplateType;
    messageText: string;
    couponCode?: string;
  }) => void;
}

const TEMPLATE_OPTIONS: {
  id: MessageTemplateType;
  label: string;
}[] = [
  { id: "birthday", label: "Birthday Wishes" },
  { id: "anniversary", label: "Wedding Anniversary" },
  { id: "festival", label: "Festival Offer" },
  { id: "coupon", label: "Special Discount Coupon" },
  { id: "collection", label: "New Collection" },
];

export default function WhatsappPreviewModal({
  isOpen,
  onClose,
  customer,
  allCustomers,
  consents,
  coupons,
  branches,
  initialTemplate = "birthday",
  initialCouponCode = "",
  onQuickCreateCoupon,
  onSendWhatsApp,
}: WhatsappPreviewModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [templateType, setTemplateType] = useState<MessageTemplateType>(initialTemplate);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>(initialCouponCode);
  const [includeOptOutFooter, setIncludeOptOutFooter] = useState<boolean>(true);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isEditedManually, setIsEditedManually] = useState<boolean>(false);

  // Inline 1-Click Personalized Coupon Generator state
  const [showQuickGen, setShowQuickGen] = useState<boolean>(false);
  const [genDiscountType, setGenDiscountType] = useState<DiscountType>("percentage");
  const [genDiscountValue, setGenDiscountValue] = useState<number>(15);
  const [genValidDays, setGenValidDays] = useState<number>(14);
  const [genMinPurchase, setGenMinPurchase] = useState<number>(5000);

  const activeCustomer = useMemo(() => {
    if (selectedCustomerId) {
      return allCustomers.find((c) => c.id === selectedCustomerId) ?? customer;
    }
    return customer ?? allCustomers[0] ?? null;
  }, [selectedCustomerId, allCustomers, customer]);

  const customerConsent = activeCustomer
    ? consents[activeCustomer.id]?.agreed ?? false
    : false;

  const customerBranch = useMemo(() => {
    if (!activeCustomer) return branches[0];
    return branches.find((b) => b.id === activeCustomer.branchId) ?? branches[0];
  }, [activeCustomer, branches]);

  // Eligible active coupons for this customer & branch
  const eligibleCoupons = useMemo(() => {
    if (!activeCustomer) return [];
    return coupons.filter((cp) => {
      const ev = evaluateCoupon(cp);
      if (!ev.canRedeem) return false;
      const branchOk = cp.branchId === "ALL" || cp.branchId === activeCustomer.branchId;
      const customerOk =
        !cp.assignedCustomerId || cp.assignedCustomerId === activeCustomer.id;
      return branchOk && customerOk;
    });
  }, [coupons, activeCustomer]);

  const selectedCoupon = useMemo(
    () => coupons.find((c) => c.code === selectedCouponCode) ?? null,
    [coupons, selectedCouponCode]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCustomerId(customer?.id ?? allCustomers[0]?.id ?? "");
    setTemplateType(initialTemplate);
    setIsEditedManually(false);
    setShowQuickGen(false);

    if (initialCouponCode) {
      setSelectedCouponCode(initialCouponCode);
    } else if (customer) {
      // Auto-select customer's assigned active coupon if available, else matching category coupon
      const personal = coupons.find(
        (c) =>
          c.assignedCustomerId === customer.id && evaluateCoupon(c).canRedeem
      );
      if (personal) {
        setSelectedCouponCode(personal.code);
      } else if (initialTemplate === "birthday") {
        const bday = coupons.find((c) => c.code === "BDAY15" && evaluateCoupon(c).canRedeem);
        setSelectedCouponCode(bday ? bday.code : "");
      } else if (initialTemplate === "anniversary") {
        const ann = coupons.find((c) => c.code === "ANN500" && evaluateCoupon(c).canRedeem);
        setSelectedCouponCode(ann ? ann.code : "");
      } else {
        setSelectedCouponCode("");
      }
    }
  }, [isOpen, customer, initialTemplate, initialCouponCode, allCustomers, coupons]);

  // Compose dynamic personalized WhatsApp message
  const generatedMessage = useMemo(() => {
    const patronName = activeCustomer?.name ?? "Valued Patron";
    const showroomName = customerBranch
      ? `${customerBranch.name}, ${customerBranch.city}`
      : "our showroom";

    const discountText = selectedCoupon
      ? selectedCoupon.discountType === "percentage"
        ? `${selectedCoupon.discountValue}% discount`
        : `${formatINR(selectedCoupon.discountValue)} discount`
      : "";

    const expiryText = selectedCoupon
      ? formatLongDate(selectedCoupon.expiryDate)
      : "";

    let body = "";

    if (templateType === "birthday") {
      if (selectedCoupon) {
        body = `Happy Birthday, ${patronName}! 🎂 Celebrate your special day with an exclusive ${discountText}. Your coupon code: ${selectedCoupon.code}. Valid until: ${expiryText}. Visit our showroom and enjoy shopping!`;
      } else {
        body = `Dear ${patronName}, Wishing you a very Happy Birthday! Celebrate your special day with an exclusive offer from our showroom.`;
      }
    } else if (templateType === "anniversary") {
      if (selectedCoupon) {
        body = `Happy Wedding Anniversary, ${patronName}! ❤️ Enjoy a special ${discountText} on your next purchase. Your coupon code: ${selectedCoupon.code}. Expires on: ${expiryText}.`;
      } else {
        body = `Dear ${patronName}, Happy Wedding Anniversary! Celebrate your special occasion with a special shopping offer from our showroom.`;
      }
    } else if (templateType === "festival") {
      if (selectedCoupon) {
        body = `Dear ${patronName}, Warm festive greetings from ${showroomName}! ✨ Celebrate in timeless pure silk heritage with an exclusive ${discountText}. Present coupon code: ${selectedCoupon.code} (Valid until: ${expiryText}).`;
      } else {
        body = `Dear ${patronName}, Warm festive greetings from ${showroomName}! ✨ Discover our festive Kanchipuram & Bridal Silk Saree showcase on your next visit.`;
      }
    } else if (templateType === "coupon") {
      if (selectedCoupon) {
        body = `Dear ${patronName}, As a cherished patron of ${showroomName}, enjoy an exclusive ${discountText} on purchases above ${formatINR(
          selectedCoupon.minPurchaseAmount
        )}. Your personal coupon code: ${selectedCoupon.code}. Valid until: ${expiryText}.`;
      } else {
        body = `Dear ${patronName}, Enjoy a special privilege offer curated exclusively for you at ${showroomName}. Visit us soon!`;
      }
    } else {
      // New Collection Announcement
      if (selectedCoupon) {
        body = `Dear ${patronName}, We are honoured to unveil our Royal Heritage Pure Zari Silk Collection at ${showroomName}. Enjoy a preview privilege of ${discountText} with code ${selectedCoupon.code} until ${expiryText}.`;
      } else {
        body = `Dear ${patronName}, We are honoured to unveil our newly woven Royal Heritage Pure Zari & Bridal Silk Collection at ${showroomName}. We look forward to welcoming you!`;
      }
    }

    if (includeOptOutFooter) {
      body += `\n\nReply STOP to opt out of promotional updates.`;
    }

    return body;
  }, [
    activeCustomer,
    customerBranch,
    selectedCoupon,
    templateType,
    includeOptOutFooter,
  ]);

  useEffect(() => {
    if (!isEditedManually) {
      setCustomMessage(generatedMessage);
    }
  }, [generatedMessage, isEditedManually]);

  if (!isOpen) return null;

  const handleGeneratePersonalizedCoupon = () => {
    if (!activeCustomer) return;
    const cleanFirst = activeCustomer.name
      .replace(/^(Smt\.|Sri\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
      .split(/\s+/)[0]
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 6);

    const prefix =
      templateType === "birthday"
        ? "BDAY"
        : templateType === "anniversary"
        ? "ANN"
        : templateType === "festival"
        ? "FEST"
        : "VIP";

    const randomSuffix = Math.floor(10 + Math.random() * 89);
    const uniqueCode = `${prefix}-${cleanFirst || "SILK"}${genDiscountValue}${randomSuffix}`;

    const categoryMap = {
      birthday: "birthday",
      anniversary: "anniversary",
      festival: "festival",
      coupon: "exclusive",
      collection: "collection",
    } as const;

    const created = onQuickCreateCoupon({
      code: uniqueCode,
      name: `Exclusive ${
        templateType === "birthday"
          ? "Birthday"
          : templateType === "anniversary"
          ? "Anniversary"
          : "Patron"
      } Offer — ${activeCustomer.name}`,
      description: `Personalized single-use coupon generated & dispatched via WhatsApp to ${activeCustomer.name}.`,
      category: categoryMap[templateType],
      discountType: genDiscountType,
      discountValue: genDiscountValue,
      minPurchaseAmount: genMinPurchase,
      startDate: toLocalISODate(),
      expiryDate: addDaysISO(genValidDays),
      maxUses: 1,
      enabled: true,
      branchId: activeCustomer.branchId,
      assignedCustomerId: activeCustomer.id,
    });

    setSelectedCouponCode(created.code);
    setIsEditedManually(false);
    setShowQuickGen(false);
  };

  const handleDispatch = (openExternalWa: boolean) => {
    if (!activeCustomer || !customerConsent) return;

    onSendWhatsApp({
      customerId: activeCustomer.id,
      branchId: activeCustomer.branchId,
      templateType,
      messageText: customMessage,
      couponCode: selectedCoupon?.code,
    });

    if (openExternalWa) {
      const phone = toWhatsAppUrlNumber(activeCustomer.whatsappNumber);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(customMessage)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252323]/65 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-[#FAF7F0] border border-[#C8A96B]/50 shadow-2xl overflow-hidden animate-fade-in my-auto">
        {/* Top Burgundy Bar */}
        <div className="bg-[#541326] px-6 py-4 text-[#FAF7F0] border-b border-[#C8A96B]/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#C8A96B] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized WhatsApp Concierge & Coupon Studio</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold">
              Compose Showroom Greeting & Privilege Offer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#FAF7F0]/75 hover:text-white hover:bg-[#741F38] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Configuration Column */}
          <div className="lg:col-span-7 p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-[#E6DEC8]">
            {/* Recipient Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                Recipient Patron
              </label>
              <select
                value={activeCustomer?.id ?? ""}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setIsEditedManually(false);
                }}
                className="w-full rounded-xl bg-white border border-[#D8CEBE] px-4 py-3 text-sm font-medium text-[#252323] focus:outline-none focus:border-[#541326]"
              >
                {allCustomers.map((c) => {
                  const agreed = consents[c.id]?.agreed;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.whatsappNumber}) —{" "}
                      {agreed ? "✓ Consent Agreed" : "✕ Opted Out"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Strict Consent Compliance Alert if Opted Out */}
            {!customerConsent && (
              <div className="rounded-xl bg-[#9B2C2C]/10 border border-[#9B2C2C]/35 p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#9B2C2C] shrink-0 mt-0.5" />
                <div className="text-xs text-[#9B2C2C] leading-relaxed">
                  <p className="font-semibold text-sm">
                    Promotional Messaging Blocked — Patron Opted Out
                  </p>
                  <p className="mt-0.5">
                    {activeCustomer?.name} has not consented to WhatsApp marketing promotions.
                    Per showroom privacy governance, promotional dispatches are disabled until
                    explicit opt-in is recorded.
                  </p>
                </div>
              </div>
            )}

            {/* Occasion / Message Template Pills */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-2">
                Greeting Occasion
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTemplateType(opt.id);
                      setIsEditedManually(false);
                    }}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold border transition cursor-pointer ${
                      templateType === opt.id
                        ? "bg-[#541326] text-[#FAF7F0] border-[#541326]"
                        : "bg-white text-[#252323] border-[#D8CEBE] hover:border-[#C8A96B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coupon Attachment + 1-Click Personalized Coupon Generator */}
            <div className="rounded-xl bg-white border border-[#E6DEC8] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#541326]">
                  <Ticket className="w-4 h-4 text-[#C8A96B]" />
                  <span>Attach Discount Coupon (Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickGen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#741F38] hover:text-[#541326] underline underline-offset-4 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {showQuickGen
                      ? "Cancel Generator"
                      : "Generate Personalized Coupon"}
                  </span>
                </button>
              </div>

              {!showQuickGen ? (
                <select
                  value={selectedCouponCode}
                  onChange={(e) => {
                    setSelectedCouponCode(e.target.value);
                    setIsEditedManually(false);
                  }}
                  className="w-full rounded-lg bg-[#FAF7F0] border border-[#D8CEBE] px-3.5 py-2.5 text-sm font-medium text-[#252323] focus:outline-none focus:border-[#541326]"
                >
                  <option value="">No Coupon — Send Pure Greeting Only</option>
                  {eligibleCoupons.map((cp) => (
                    <option key={cp.id} value={cp.code}>
                      {cp.code} — {formatDiscountLabel(cp.discountType, cp.discountValue)} (Valid
                      until {formatLongDate(cp.expiryDate)})
                      {cp.assignedCustomerId ? " ★ Exclusive" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl bg-[#FAF7F0] border border-[#C8A96B]/50 p-3.5 space-y-3">
                  <p className="text-xs font-semibold text-[#541326]">
                    Instant Single-Use Coupon for {activeCustomer?.name}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[#6E655F] mb-1">
                        Type
                      </label>
                      <select
                        value={genDiscountType}
                        onChange={(e) => {
                          const next = e.target.value as DiscountType;
                          setGenDiscountType(next);
                          setGenDiscountValue(next === "percentage" ? 15 : 500);
                        }}
                        className="w-full rounded-lg bg-white border border-[#D8CEBE] px-2.5 py-2 text-xs font-medium"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6E655F] mb-1">
                        Value ({genDiscountType === "percentage" ? "%" : "₹"})
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={genDiscountValue}
                        onChange={(e) => setGenDiscountValue(Number(e.target.value) || 0)}
                        className="w-full rounded-lg bg-white border border-[#D8CEBE] px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6E655F] mb-1">
                        Min Bill (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={genMinPurchase}
                        onChange={(e) => setGenMinPurchase(Number(e.target.value) || 0)}
                        className="w-full rounded-lg bg-white border border-[#D8CEBE] px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6E655F] mb-1">
                        Validity (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={genValidDays}
                        onChange={(e) => setGenValidDays(Number(e.target.value) || 7)}
                        className="w-full rounded-lg bg-white border border-[#D8CEBE] px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePersonalizedCoupon}
                    className="w-full rounded-lg bg-[#541326] text-[#FAF7F0] py-2 text-xs font-semibold hover:bg-[#741F38] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>Create & Attach Exclusive Coupon Code</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editable Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6E655F]">
                  Personalized Message Text
                </label>
                {isEditedManually && (
                  <button
                    type="button"
                    onClick={() => setIsEditedManually(false)}
                    className="text-xs text-[#741F38] hover:underline cursor-pointer"
                  >
                    Reset to Template
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  setIsEditedManually(true);
                }}
                className="w-full rounded-xl bg-white border border-[#D8CEBE] p-3.5 text-sm text-[#252323] leading-relaxed focus:outline-none focus:border-[#541326]"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#6E655F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOptOutFooter}
                  onChange={(e) => {
                    setIncludeOptOutFooter(e.target.checked);
                    setIsEditedManually(false);
                  }}
                  className="rounded border-[#D8CEBE] accent-[#541326]"
                />
                <span>Include polite WhatsApp opt-out instruction (&ldquo;Reply STOP to opt out&rdquo;)</span>
              </label>
            </div>

            {/* Send Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6E655F] hover:bg-[#EFE9DC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customerConsent}
                onClick={() => handleDispatch(true)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-[#1F6E43] text-[#1F6E43] bg-white hover:bg-[#1F6E43]/5 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open WhatsApp Web</span>
              </button>
              <button
                type="button"
                disabled={!customerConsent}
                onClick={() => handleDispatch(false)}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-[#1F6E43] text-white hover:bg-[#185835] shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send WhatsApp Message</span>
              </button>
            </div>
          </div>

          {/* Right Column: Realistic Smartphone WhatsApp Business Preview */}
          <div className="lg:col-span-5 bg-[#F2ECE1] p-6 flex flex-col items-center justify-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6E655F] font-semibold mb-3">
              Live Patron Smartphone Preview
            </p>

            {/* Phone Bezel */}
            <div className="w-full max-w-[330px] rounded-[32px] bg-[#252323] p-2.5 shadow-2xl border border-[#C8A96B]/40">
              <div className="rounded-[24px] overflow-hidden bg-[#EFEAE2] flex flex-col min-h-[410px]">
                {/* WhatsApp Business Verified Top Bar */}
                <div className="bg-[#075E54] px-4 py-3 text-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#541326] border border-[#C8A96B] flex items-center justify-center font-serif font-bold text-sm text-[#C8A96B] shrink-0">
                    KR
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">
                        Kanchipuram Royal Silks
                      </p>
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#25D366] text-[#075E54] text-[10px] font-bold shrink-0"
                        title="Verified Business Account"
                      >
                        ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 truncate">
                      Official Showroom Business Account
                    </p>
                  </div>
                </div>

                {/* Chat Canvas */}
                <div className="flex-1 p-3.5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="mx-auto w-fit rounded-md bg-[#E1F3FB] px-2.5 py-1 text-[10px] text-[#54656F] shadow-2xs">
                      Today • Verified Business Greeting
                    </div>

                    {/* Outgoing Showroom Message Bubble */}
                    <div className="rounded-xl rounded-tl-xs bg-white p-3 shadow-xs border border-black/5 text-[13px] text-[#111B21] leading-relaxed whitespace-pre-wrap">
                      {/* Luxury Header Card inside WhatsApp Template */}
                      <div className="mb-2 rounded-lg bg-[#541326] px-3 py-2 text-[#FAF7F0] border border-[#C8A96B]/40">
                        <p className="text-[10px] uppercase tracking-widest text-[#C8A96B]">
                          {customerBranch?.name ?? "Grand Flagship"}
                        </p>
                        <p className="font-serif text-sm font-semibold">
                          {templateType === "birthday"
                            ? "Royal Birthday Privilege"
                            : templateType === "anniversary"
                            ? "Anniversary Celebration Offer"
                            : templateType === "festival"
                            ? "Heritage Festive Silk Edit"
                            : templateType === "collection"
                            ? "New Pure Zari Collection"
                            : "Exclusive Patron Voucher"}
                        </p>
                      </div>

                      <div>{customMessage}</div>

                      {selectedCoupon && (
                        <div className="mt-2.5 rounded-lg bg-[#FAF7F0] border border-dashed border-[#C8A96B] px-2.5 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#6E655F]">
                              Coupon Code
                            </p>
                            <p className="font-mono text-xs font-bold text-[#541326]">
                              {selectedCoupon.code}
                            </p>
                          </div>
                          <span className="rounded-md bg-[#541326] text-[#C8A96B] px-2 py-0.5 text-[11px] font-semibold">
                            {formatDiscountLabel(
                              selectedCoupon.discountType,
                              selectedCoupon.discountValue
                            )}
                          </span>
                        </div>
                      )}

                      <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                        <span>Just now</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                      </div>
                    </div>
                  </div>

                  {/* Recipient Footer Pill */}
                  <div className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] text-[#54656F] flex items-center justify-between border border-black/5">
                    <span className="truncate">
                      To: <strong>{activeCustomer?.name}</strong>
                    </span>
                    <span className="font-mono text-[10px] shrink-0">
                      {activeCustomer?.whatsappNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

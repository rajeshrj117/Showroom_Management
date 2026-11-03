"use client";

import React, { useMemo, useState } from "react";
import {
  Send,
  Sparkles,
  Cake,
  Heart,
  Ticket,
  ShieldCheck,
  CheckCheck,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react";
import {
  Branch,
  Campaign,
  ConsentRecord,
  Coupon,
  CouponCategory,
  Customer,
  MessageTemplateType,
} from "@/types/crm";
import {
  evaluateCoupon,
  formatDiscountLabel,
  formatINR,
  formatLongDate,
  getDaysUntilCelebration,
} from "@/lib/dateUtils";

interface CampaignsViewProps {
  campaigns: Campaign[];
  customers: Customer[];
  consents: Record<string, ConsentRecord>;
  coupons: Coupon[];
  branches: Branch[];
  activeBranchId: string;
  onLaunchCampaign: (payload: {
    name: string;
    category: CouponCategory;
    branchId: string;
    couponCode?: string;
    messageTemplate: string;
    recipients: Customer[];
  }) => void;
  onOpenIndividualWhatsApp: (
    customer: Customer,
    template: MessageTemplateType,
    couponCode?: string
  ) => void;
}

const CAMPAIGN_PRESETS: {
  id: CouponCategory;
  title: string;
  defaultName: string;
  defaultCoupon: string;
  badge: string;
}[] = [
  {
    id: "birthday",
    title: "Birthday Wishes",
    defaultName: "Automated Birthday Silk Privilege",
    defaultCoupon: "BDAY15",
    badge: "🎂 Celebrations",
  },
  {
    id: "anniversary",
    title: "Wedding Anniversary",
    defaultName: "Wedding Anniversary Shagun Greeting",
    defaultCoupon: "ANN500",
    badge: "❤️ Celebrations",
  },
  {
    id: "festival",
    title: "Festival Offer",
    defaultName: "Grand Festive Kanchipuram Silk Utsav",
    defaultCoupon: "FESTIVESILK20",
    badge: "✨ Seasonal",
  },
  {
    id: "exclusive",
    title: "Special Discount Coupon",
    defaultName: "Exclusive Patron Privilege Invitation",
    defaultCoupon: "FESTIVESILK20",
    badge: "★ Exclusive",
  },
  {
    id: "collection",
    title: "New Collection Launch",
    defaultName: "Royal Pure Zari Bridal Collection Preview",
    defaultCoupon: "",
    badge: "🧣 New Arrivals",
  },
];

export default function CampaignsView({
  campaigns,
  customers,
  consents,
  coupons,
  branches,
  activeBranchId,
  onLaunchCampaign,
  onOpenIndividualWhatsApp,
}: CampaignsViewProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<CouponCategory>("birthday");
  const [campaignName, setCampaignName] = useState<string>(
    "Royal Birthday Wishes & 15% Privilege"
  );
  const [targetBranchId, setTargetBranchId] = useState<string>(activeBranchId);
  const [selectedCouponCode, setSelectedCouponCode] =
    useState<string>("BDAY15");
  const [previewPatronIdx, setPreviewPatronIdx] = useState<number>(0);

  const branchMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches]
  );

  // Active coupons available for attachment
  const activeCoupons = useMemo(
    () =>
      coupons.filter((cp) => {
        const ev = evaluateCoupon(cp);
        if (!ev.canRedeem) return false;
        if (cp.assignedCustomerId) return false; // Broadcast campaigns use general/branch coupons
        if (
          targetBranchId !== "ALL" &&
          cp.branchId !== "ALL" &&
          cp.branchId !== targetBranchId
        ) {
          return false;
        }
        return true;
      }),
    [coupons, targetBranchId]
  );

  const attachedCoupon = useMemo(
    () => coupons.find((c) => c.code === selectedCouponCode) ?? null,
    [coupons, selectedCouponCode]
  );

  // Compute Eligible Audience (STRICTLY consented patrons only!)
  const audienceStats = useMemo(() => {
    const branchCustomers =
      targetBranchId === "ALL"
        ? customers
        : customers.filter((c) => c.branchId === targetBranchId);

    let occasionMatched = branchCustomers;

    if (selectedCategory === "birthday") {
      // Celebrations today or within upcoming 7 days (or fallback to birthday month if none)
      const windowMatches = branchCustomers.filter((c) => {
        const d = getDaysUntilCelebration(c.dateOfBirth);
        return d !== null && d <= 7;
      });
      occasionMatched =
        windowMatches.length > 0
          ? windowMatches
          : branchCustomers.filter((c) => Boolean(c.dateOfBirth));
    } else if (selectedCategory === "anniversary") {
      const windowMatches = branchCustomers.filter((c) => {
        const d = getDaysUntilCelebration(c.anniversaryDate);
        return d !== null && d <= 7;
      });
      occasionMatched =
        windowMatches.length > 0
          ? windowMatches
          : branchCustomers.filter((c) => Boolean(c.anniversaryDate));
    }

    const consentedRecipients = occasionMatched.filter(
      (c) => consents[c.id]?.agreed
    );
    const excludedOptOutCount =
      occasionMatched.length - consentedRecipients.length;

    return {
      totalMatched: occasionMatched.length,
      consentedRecipients,
      excludedOptOutCount,
    };
  }, [customers, targetBranchId, selectedCategory, consents]);

  const sampleCustomer =
    audienceStats.consentedRecipients[
      previewPatronIdx % Math.max(1, audienceStats.consentedRecipients.length)
    ] ??
    customers[0] ??
    null;

  // Dynamic WhatsApp template with [Customer Name] placeholder + rendered preview
  const templateString = useMemo(() => {
    const discountStr = attachedCoupon
      ? attachedCoupon.discountType === "percentage"
        ? `${attachedCoupon.discountValue}% discount`
        : `${formatINR(attachedCoupon.discountValue)} discount`
      : "";
    const expiryStr = attachedCoupon
      ? formatLongDate(attachedCoupon.expiryDate)
      : "";

    if (selectedCategory === "birthday") {
      return attachedCoupon
        ? `Happy Birthday, [Customer Name]! 🎂 Celebrate your special day with an exclusive ${discountStr}. Your coupon code: ${attachedCoupon.code}. Valid until: ${expiryStr}. Visit our showroom and enjoy shopping!`
        : `Dear [Customer Name], Wishing you a very Happy Birthday! Celebrate your special day with an exclusive offer from our showroom.`;
    }
    if (selectedCategory === "anniversary") {
      return attachedCoupon
        ? `Happy Wedding Anniversary, [Customer Name]! ❤️ Enjoy a special ${discountStr} on your next purchase. Your coupon code: ${attachedCoupon.code}. Expires on: ${expiryStr}.`
        : `Dear [Customer Name], Happy Wedding Anniversary! Celebrate your special occasion with a special shopping offer from our showroom.`;
    }
    if (selectedCategory === "festival") {
      return attachedCoupon
        ? `Dear [Customer Name], Celebrate the festive season in timeless Kanchipuram Silk elegance! ✨ Enjoy an exclusive ${discountStr} with coupon code: ${attachedCoupon.code}. Valid until: ${expiryStr}.`
        : `Dear [Customer Name], Warm festive wishes! Visit our showroom to explore our festive Kanchipuram & Bridal Silk Saree collections.`;
    }
    if (selectedCategory === "collection") {
      return attachedCoupon
        ? `Dear [Customer Name], We are delighted to unveil our new Royal Pure Zari Silk Collection! Enjoy an exclusive preview ${discountStr} using code: ${attachedCoupon.code} until ${expiryStr}.`
        : `Dear [Customer Name], We are delighted to unveil our newly woven Royal Pure Zari & Bridal Silk Saree Collection at our showroom. We look forward to welcoming you!`;
    }
    return attachedCoupon
      ? `Dear [Customer Name], As a valued patron of our showroom, enjoy a special ${discountStr} on purchases above ${formatINR(
          attachedCoupon.minPurchaseAmount
        )}. Coupon code: ${attachedCoupon.code}. Valid until: ${expiryStr}.`
      : `Dear [Customer Name], Enjoy an exclusive shopping privilege on your next visit to our silk showroom!`;
  }, [selectedCategory, attachedCoupon]);

  const renderedPreviewText = useMemo(() => {
    const patronName = sampleCustomer?.name ?? "Smt. Meenakshi Sundaram";
    return `${templateString.replace(
      /\[Customer Name\]/g,
      patronName
    )}\n\nReply STOP to opt out of promotional updates.`;
  }, [templateString, sampleCustomer]);

  const handleSelectCategory = (cat: CouponCategory) => {
    setSelectedCategory(cat);
    const preset = CAMPAIGN_PRESETS.find((p) => p.id === cat);
    if (preset) {
      setCampaignName(preset.defaultName);
      const exists = coupons.find(
        (c) => c.code === preset.defaultCoupon && evaluateCoupon(c).canRedeem
      );
      setSelectedCouponCode(exists ? exists.code : "");
    }
    setPreviewPatronIdx(0);
  };

  const scopedCampaigns = useMemo(
    () =>
      activeBranchId === "ALL"
        ? campaigns
        : campaigns.filter(
            (c) => c.branchId === "ALL" || c.branchId === activeBranchId
          ),
    [campaigns, activeBranchId]
  );

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#741F38] font-semibold">
            WhatsApp Business Loyalty & Occasion Marketing
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#252323]">
            Coupon & WhatsApp Campaign Studio
          </h1>
          <p className="text-sm text-[#6E655F] mt-0.5">
            Design personalized Birthday, Wedding Anniversary, Festival, and New
            Collection WhatsApp broadcasts strictly for opted-in showroom patrons.
          </p>
        </div>
      </div>

      {/* Studio Builder Grid */}
      <div className="rounded-2xl bg-white border border-[#E6DEC8] shadow-2xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left 7 Cols: Campaign Builder */}
        <div className="lg:col-span-7 p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-[#EFE9DC]">
          {/* Step 1: Select Campaign Occasion */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-2">
              1. Select Campaign Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CAMPAIGN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCategory(preset.id)}
                  className={`text-left rounded-xl p-3 border transition cursor-pointer ${
                    selectedCategory === preset.id
                      ? "bg-[#541326] text-[#FAF7F0] border-[#541326] shadow-xs"
                      : "bg-[#FAF7F0] text-[#252323] border-[#E6DEC8] hover:border-[#C8A96B]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      selectedCategory === preset.id
                        ? "text-[#C8A96B]"
                        : "text-[#741F38]"
                    }`}
                  >
                    {preset.badge}
                  </p>
                  <p className="text-xs font-semibold mt-0.5">{preset.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Campaign Name & Branch Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                2. Campaign Title
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-sm font-medium text-[#252323] focus:outline-none focus:border-[#541326]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
                3. Target Showroom Branch
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-sm font-medium text-[#252323] focus:outline-none focus:border-[#541326]"
              >
                <option value="ALL">All 5 Showrooms (Enterprise Broadcast)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 4: Attach Active Coupon */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
              4. Attach Showroom Privilege Coupon
            </label>
            <select
              value={selectedCouponCode}
              onChange={(e) => setSelectedCouponCode(e.target.value)}
              className="w-full rounded-xl bg-[#FAF7F0] border border-[#E6DEC8] px-3.5 py-2.5 text-sm font-medium text-[#252323] focus:outline-none focus:border-[#541326]"
            >
              <option value="">No Coupon — Pure Occasion Greeting</option>
              {activeCoupons.map((cp) => (
                <option key={cp.id} value={cp.code}>
                  {cp.code} — {formatDiscountLabel(cp.discountType, cp.discountValue)}{" "}
                  (Expires {formatLongDate(cp.expiryDate)})
                </option>
              ))}
            </select>
          </div>

          {/* Audience & Consent Compliance Summary Box */}
          <div className="rounded-xl bg-[#FAF7F0] border border-[#C8A96B]/45 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1F6E43]/10 text-[#1F6E43] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#252323]">
                  Eligible Consented Audience:{" "}
                  <span className="text-[#541326] font-bold">
                    {audienceStats.consentedRecipients.length} Patrons
                  </span>
                </p>
                <p className="text-xs text-[#6E655F] mt-0.5">
                  {audienceStats.excludedOptOutCount > 0
                    ? `${audienceStats.excludedOptOutCount} opted-out customer(s) automatically protected & excluded.`
                    : "100% of matched patrons have verified WhatsApp marketing consent."}
                </p>
              </div>
            </div>

            {audienceStats.consentedRecipients.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewPatronIdx((i) => i + 1)}
                className="shrink-0 rounded-lg border border-[#D8CEBE] bg-white px-3 py-1.5 text-xs font-semibold text-[#541326] hover:border-[#C8A96B] cursor-pointer"
              >
                Cycle Sample Patron ↻
              </button>
            )}
          </div>

          {/* Launch Campaign CTA */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            {sampleCustomer && (
              <button
                type="button"
                onClick={() => {
                  const tpl: MessageTemplateType =
                    selectedCategory === "exclusive"
                      ? "coupon"
                      : selectedCategory;
                  onOpenIndividualWhatsApp(
                    sampleCustomer,
                    tpl,
                    attachedCoupon?.code
                  );
                }}
                className="text-xs font-semibold text-[#741F38] hover:underline cursor-pointer"
              >
                Send 1-to-1 Test Message to {sampleCustomer.name} →
              </button>
            )}

            <button
              type="button"
              disabled={audienceStats.consentedRecipients.length === 0}
              onClick={() =>
                onLaunchCampaign({
                  name: campaignName.trim() || "Showroom WhatsApp Campaign",
                  category: selectedCategory,
                  branchId: targetBranchId,
                  couponCode: attachedCoupon?.code,
                  messageTemplate: templateString,
                  recipients: audienceStats.consentedRecipients,
                })
              }
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#541326] text-[#FAF7F0] px-6 py-3.5 text-sm font-semibold hover:bg-[#741F38] shadow-md disabled:opacity-40 transition cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#C8A96B]" />
              <span>
                Dispatch WhatsApp Campaign (
                {audienceStats.consentedRecipients.length})
              </span>
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Realistic WhatsApp Smartphone Live Preview */}
        <div className="lg:col-span-5 bg-[#F2ECE1] p-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#6E655F] font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#741F38]" />
            <span>Personalized WhatsApp Preview</span>
          </div>

          <div className="w-full max-w-[330px] rounded-[32px] bg-[#252323] p-2.5 shadow-xl border border-[#C8A96B]/40">
            <div className="rounded-[24px] overflow-hidden bg-[#EFEAE2] flex flex-col min-h-[390px]">
              {/* WhatsApp Business Header */}
              <div className="bg-[#075E54] px-4 py-3 text-white flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#541326] border border-[#C8A96B] flex items-center justify-center font-serif font-bold text-xs text-[#C8A96B]">
                  KR
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">
                      Kanchipuram Royal Silks
                    </p>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#25D366] text-[#075E54] text-[10px] font-bold">
                      ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80">
                    Verified Silk Showroom
                  </p>
                </div>
              </div>

              {/* Message Area */}
              <div className="flex-1 p-3.5 flex flex-col justify-between space-y-3">
                <div className="rounded-xl rounded-tl-xs bg-white p-3 shadow-xs border border-black/5 text-[13px] text-[#111B21] leading-relaxed whitespace-pre-wrap">
                  <div className="mb-2 rounded-lg bg-[#541326] px-3 py-2 text-[#FAF7F0] border border-[#C8A96B]/40">
                    <p className="text-[10px] uppercase tracking-widest text-[#C8A96B]">
                      {targetBranchId === "ALL"
                        ? "All Flagship Showrooms"
                        : branchMap.get(targetBranchId)?.name}
                    </p>
                    <p className="font-serif text-sm font-semibold truncate">
                      {campaignName}
                    </p>
                  </div>

                  <div>{renderedPreviewText}</div>

                  {attachedCoupon && (
                    <div className="mt-2.5 rounded-lg bg-[#FAF7F0] border border-dashed border-[#C8A96B] px-2.5 py-1.5 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#541326]">
                        {attachedCoupon.code}
                      </span>
                      <span className="rounded bg-[#541326] text-[#C8A96B] px-2 py-0.5 text-[10px] font-bold">
                        {formatDiscountLabel(
                          attachedCoupon.discountType,
                          attachedCoupon.discountValue
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                    <span>09:30 AM</span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                  </div>
                </div>

                {sampleCustomer && (
                  <div className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] text-[#54656F] flex items-center justify-between">
                    <span className="truncate">
                      Previewing: <strong>{sampleCustomer.name}</strong>
                    </span>
                    <span className="font-mono text-[10px] shrink-0">
                      {sampleCustomer.whatsappNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Analytics Table */}
      <div className="rounded-2xl bg-white border border-[#E6DEC8] shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EFE9DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#741F38] font-semibold">
              Attribution & ROI Ledger
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#252323]">
              Campaign Performance Analytics
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#6E655F]">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#541326]" />
              <span>
                Total Dispatched:{" "}
                <strong className="text-[#252323]">
                  {scopedCampaigns.reduce((s, c) => s + c.sentCount, 0)}
                </strong>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#1F6E43]" />
              <span>
                Redemptions:{" "}
                <strong className="text-[#1F6E43]">
                  {scopedCampaigns.reduce((s, c) => s + c.redeemedCount, 0)}
                </strong>
              </span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-[#E6DEC8] text-[11px] font-semibold uppercase tracking-wider text-[#6E655F]">
                <th className="py-3.5 px-6">Campaign Name</th>
                <th className="py-3.5 px-4">Showroom Scope</th>
                <th className="py-3.5 px-4">Attached Coupon</th>
                <th className="py-3.5 px-4">Messages Sent</th>
                <th className="py-3.5 px-4">Delivery Rate</th>
                <th className="py-3.5 px-4">Coupons Redeemed</th>
                <th className="py-3.5 px-6 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9DC] text-sm">
              {scopedCampaigns.map((cmp) => {
                const br =
                  cmp.branchId === "ALL" ? null : branchMap.get(cmp.branchId);
                const deliveryPct =
                  cmp.sentCount > 0
                    ? Math.round((cmp.deliveredCount / cmp.sentCount) * 100)
                    : 100;
                const convPct =
                  cmp.sentCount > 0
                    ? ((cmp.redeemedCount / cmp.sentCount) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={cmp.id} className="hover:bg-[#FAF7F0]/70 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        {cmp.category === "birthday" ? (
                          <Cake className="w-4 h-4 text-[#741F38] shrink-0" />
                        ) : cmp.category === "anniversary" ? (
                          <Heart className="w-4 h-4 text-[#C8A96B] shrink-0" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[#541326] shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-[#252323]">
                            {cmp.name}
                          </p>
                          <p className="text-xs text-[#6E655F]">
                            Last run: {cmp.lastRunAt}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs text-[#6E655F]">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#C8A96B]" />
                        <span>
                          {br ? `${br.name} (${br.city})` : "All 5 Showrooms"}
                        </span>
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {cmp.couponCode ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-[#FAF7F0] border border-[#C8A96B]/60 text-[#541326] px-2.5 py-0.5 rounded-md">
                          <Ticket className="w-3 h-3 text-[#C8A96B]" />
                          <span>{cmp.couponCode}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[#9A9087]">Greeting Only</span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono text-xs font-semibold text-[#252323]">
                      {cmp.sentCount}
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-[#1F6E43]">
                      {deliveryPct}% ({cmp.deliveredCount})
                    </td>

                    <td className="py-4 px-4 font-mono text-xs font-semibold text-[#541326]">
                      {cmp.redeemedCount}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <span className="rounded-full bg-[#1F6E43]/10 text-[#1F6E43] px-3 py-1 text-xs font-bold">
                        {convPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

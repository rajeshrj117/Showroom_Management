"use client";

import React, { useMemo } from "react";
import {
  Building2,
  ShieldCheck,
  ShieldOff,
  Users,
  Ticket,
  Award,
  Check,
  Lock,
  Sparkles,
  Download,
  Phone,
} from "lucide-react";
import {
  Branch,
  Campaign,
  ConsentRecord,
  Coupon,
  Customer,
  UserRole,
  WhatsAppMessageLog,
} from "@/types/crm";
import { evaluateCoupon, getDaysUntilCelebration } from "@/lib/dateUtils";
import { exportCustomersToExcel } from "@/lib/excelExport";

interface BranchesViewProps {
  branches: Branch[];
  customers: Customer[];
  consents: Record<string, ConsentRecord>;
  coupons: Coupon[];
  campaigns: Campaign[];
  messages: WhatsAppMessageLog[];
  activeBranchId: string;
  userRole: UserRole;
  onSelectBranch: (branchId: string) => void;
  onChangeRole: (role: UserRole) => void;
  onToggleConsent: (customerId: string, nextAgreed: boolean) => void;
}

export default function BranchesView({
  branches,
  customers,
  consents,
  coupons,
  campaigns,
  messages,
  activeBranchId,
  userRole,
  onSelectBranch,
  onChangeRole,
  onToggleConsent,
}: BranchesViewProps) {
  const branchReports = useMemo(() => {
    return branches.map((b) => {
      const bCustomers = customers.filter((c) => c.branchId === b.id);
      const optedIn = bCustomers.filter((c) => consents[c.id]?.agreed).length;
      const consentPct =
        bCustomers.length > 0
          ? Math.round((optedIn / bCustomers.length) * 100)
          : 0;

      const upcomingCelebrations = bCustomers.filter((c) => {
        const bd = getDaysUntilCelebration(c.dateOfBirth);
        const ad = getDaysUntilCelebration(c.anniversaryDate);
        return (bd !== null && bd <= 30) || (ad !== null && ad <= 30);
      }).length;

      const bCoupons = coupons.filter(
        (cp) => cp.branchId === b.id || cp.branchId === "ALL"
      );
      const activeCouponsCount = bCoupons.filter(
        (cp) => evaluateCoupon(cp).canRedeem
      ).length;
      const branchExclusiveRedemptions = coupons
        .filter((cp) => cp.branchId === b.id)
        .reduce((s, cp) => s + cp.usedCount, 0);

      const branchMessagesCount = messages.filter(
        (m) => m.branchId === b.id
      ).length;

      const branchCampaignsCount = campaigns.filter(
        (cmp) => cmp.branchId === b.id || cmp.branchId === "ALL"
      ).length;

      return {
        branch: b,
        patronCount: bCustomers.length,
        optedIn,
        consentPct,
        upcomingCelebrations,
        activeCouponsCount,
        branchExclusiveRedemptions,
        branchMessagesCount,
        branchCampaignsCount,
      };
    });
  }, [branches, customers, consents, coupons, messages, campaigns]);

  const totalOptedIn = useMemo(
    () => customers.filter((c) => consents[c.id]?.agreed).length,
    [customers, consents]
  );
  const totalOptedOut = customers.length - totalOptedIn;

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#741F38] font-semibold">
            Multi-Branch Retail Governance & Reporting
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#252323]">
            Showroom Branches & Enterprise Architecture
          </h1>
          <p className="text-sm text-[#6E655F] mt-0.5">
            Centralized patron registry, branch-wise coupon attribution, role-based
            showroom access, and DPDP WhatsApp consent governance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeBranchId !== "ALL" && (
            <button
              type="button"
              onClick={() => onSelectBranch("ALL")}
              className="rounded-xl border border-[#C8A96B] bg-white text-[#541326] px-4 py-2.5 text-xs font-semibold hover:bg-[#FAF3E3] cursor-pointer"
            >
              Switch to All 5 Showrooms
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              exportCustomersToExcel({
                customers,
                branches,
                consents,
                coupons,
                branchLabel: "Enterprise-All-Branches",
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#541326] text-[#FAF7F0] px-4 py-2.5 text-xs font-semibold hover:bg-[#741F38] shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#C8A96B]" />
            <span>Export Consolidated Enterprise Excel</span>
          </button>
        </div>
      </div>

      {/* Showroom Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {branchReports.map((rep) => {
          const isFocused = activeBranchId === rep.branch.id;
          return (
            <div
              key={rep.branch.id}
              className={`rounded-2xl bg-white border p-5 shadow-2xs flex flex-col justify-between transition ${
                isFocused
                  ? "border-[#541326] ring-2 ring-[#541326]/15"
                  : "border-[#E6DEC8] hover:border-[#C8A96B]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-[#FAF7F0] border border-[#C8A96B]/60 text-[#541326] px-2.5 py-0.5 rounded-md">
                        {rep.branch.code}
                      </span>
                      {rep.branch.flagship && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#541326] text-[#C8A96B] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          <Award className="w-3 h-3" />
                          <span>Flagship</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[#252323] mt-2">
                      {rep.branch.name}
                    </h3>
                    <p className="text-xs text-[#6E655F]">
                      {rep.branch.city}, {rep.branch.state} • Manager:{" "}
                      <strong className="text-[#252323]">
                        {rep.branch.managerName}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Branch Metrics */}
                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl bg-[#FAF7F0] border border-[#EFE9DC] p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#6E655F]">
                      Patrons
                    </p>
                    <p className="font-serif text-xl font-bold text-[#252323]">
                      {rep.patronCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FAF7F0] border border-[#EFE9DC] p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#6E655F]">
                      Opt-In Rate
                    </p>
                    <p className="font-serif text-xl font-bold text-[#1F6E43]">
                      {rep.consentPct}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FAF7F0] border border-[#EFE9DC] p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#6E655F]">
                      30d Events
                    </p>
                    <p className="font-serif text-xl font-bold text-[#541326]">
                      {rep.upcomingCelebrations}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-[#6E655F]">
                  <div className="flex items-center justify-between">
                    <span>Active Showroom & Global Coupons:</span>
                    <strong className="text-[#252323]">
                      {rep.activeCouponsCount} offers
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branch-Exclusive Redemptions:</span>
                    <strong className="text-[#541326]">
                      {rep.branchExclusiveRedemptions} redeemed
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Showroom Desk Line:</span>
                    <span className="font-mono text-[#252323] inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#C8A96B]" />
                      {rep.branch.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#EFE9DC] flex items-center justify-between">
                <span className="text-xs text-[#6E655F]">
                  {rep.optedIn} / {rep.patronCount} WhatsApp consented
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSelectBranch(isFocused ? "ALL" : rep.branch.id)
                  }
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    isFocused
                      ? "bg-[#1F6E43] text-white"
                      : "bg-[#541326] text-[#FAF7F0] hover:bg-[#741F38]"
                  }`}
                >
                  {isFocused ? "✓ Active Showroom" : "Focus Branch →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Split: Role-Based Access Governance + Separate Consent Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Role-Based Access Control Matrix */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E6DEC8] p-6 shadow-2xs space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#741F38] font-semibold">
              <Lock className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>Enterprise Role-Based Access (RBAC)</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#252323] mt-1">
              Administrator vs. Showroom Staff
            </h2>
            <p className="text-xs text-[#6E655F] mt-1">
              Toggle active role below to preview how showroom floor associates
              experience streamlined guardrails compared to Head Office
              administrators.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChangeRole("admin")}
              className={`rounded-xl p-3.5 border text-left transition cursor-pointer ${
                userRole === "admin"
                  ? "bg-[#541326] text-[#FAF7F0] border-[#541326]"
                  : "bg-[#FAF7F0] text-[#252323] border-[#E6DEC8]"
              }`}
            >
              <p className="text-xs font-bold">Enterprise Admin</p>
              <p
                className={`text-[11px] mt-0.5 ${
                  userRole === "admin" ? "text-[#C8A96B]" : "text-[#6E655F]"
                }`}
              >
                Head Office & Directors
              </p>
            </button>

            <button
              type="button"
              onClick={() => onChangeRole("staff")}
              className={`rounded-xl p-3.5 border text-left transition cursor-pointer ${
                userRole === "staff"
                  ? "bg-[#541326] text-[#FAF7F0] border-[#541326]"
                  : "bg-[#FAF7F0] text-[#252323] border-[#E6DEC8]"
              }`}
            >
              <p className="text-xs font-bold">Showroom Executive</p>
              <p
                className={`text-[11px] mt-0.5 ${
                  userRole === "staff" ? "text-[#C8A96B]" : "text-[#6E655F]"
                }`}
              >
                Floor & Reception Desk
              </p>
            </button>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            {[
              {
                perm: "30-Second Customer Registration & Edit",
                admin: true,
                staff: true,
              },
              {
                perm: "Personalized Birthday & Anniversary WhatsApp Wishes",
                admin: true,
                staff: true,
              },
              {
                perm: "Generate Exclusive Coupons & Validate Redemptions",
                admin: true,
                staff: true,
              },
              {
                perm: "Instant Patron WhatsApp Opt-Out Recording",
                admin: true,
                staff: true,
              },
              {
                perm: "Enable / Disable Enterprise Coupons",
                admin: true,
                staff: false,
              },
              {
                perm: "Permanent Patron Record Deletion",
                admin: true,
                staff: false,
              },
            ].map((row) => (
              <div
                key={row.perm}
                className="flex items-center justify-between py-2 border-b border-[#EFE9DC] last:border-0"
              >
                <span className="text-[#252323] font-medium">{row.perm}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[#1F6E43] font-semibold">
                    <Check className="w-3.5 h-3.5" /> Admin
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      row.staff ? "text-[#1F6E43]" : "text-[#9B2C2C]"
                    }`}
                  >
                    {row.staff ? "✓ Staff" : "✕ Restricted"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Separate Marketing Consent Ledger & Instant Opt-Out Desk */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E6DEC8] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#1F6E43] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Separate Marketing Consent Store</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#252323] mt-0.5">
                  WhatsApp Consent & Easy Opt-Out Registry
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-[#1F6E43]/10 text-[#1F6E43] px-3 py-1 font-semibold">
                  {totalOptedIn} Opted-In
                </span>
                <span className="rounded-full bg-[#9B2C2C]/10 text-[#9B2C2C] px-3 py-1 font-semibold">
                  {totalOptedOut} Opted-Out
                </span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#EFE9DC] border border-[#EFE9DC] rounded-xl">
              {customers.slice(0, 12).map((c) => {
                const record = consents[c.id];
                const agreed = record?.agreed ?? false;
                return (
                  <div
                    key={`consent-${c.id}`}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAF7F0]"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#252323]">
                        {c.name}{" "}
                        <span className="font-mono font-normal text-[#6E655F]">
                          ({c.whatsappNumber})
                        </span>
                      </p>
                      <p className="text-[11px] text-[#8C827A]">
                        Channel: {record?.channel ?? "Showroom Tablet"} • Updated:{" "}
                        {record?.updatedAt ?? c.createdAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          agreed
                            ? "bg-[#1F6E43]/10 text-[#1F6E43]"
                            : "bg-[#9B2C2C]/10 text-[#9B2C2C]"
                        }`}
                      >
                        {agreed ? (
                          <>
                            <ShieldCheck className="w-3 h-3" /> Agreed
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-3 h-3" /> Opted Out
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleConsent(c.id, !agreed)}
                        className="rounded-lg border border-[#D8CEBE] px-2.5 py-1 text-[11px] font-semibold text-[#541326] hover:border-[#C8A96B] cursor-pointer"
                      >
                        {agreed ? "Opt Out" : "Opt In"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFE9DC] flex items-center gap-2 text-xs text-[#6E655F]">
            <Sparkles className="w-4 h-4 text-[#C8A96B] shrink-0" />
            <span>
              Marketing consent is stored independently of patron identity records.
              Opted-out customers are automatically shielded from promotional
              WhatsApp broadcasts across all branches.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

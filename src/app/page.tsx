"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Send,
  Building2,
  UserPlus,
  Menu,
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import {
  ActiveTab,
  Branch,
  Campaign,
  ConsentRecord,
  Coupon,
  CouponCategory,
  Customer,
  MessageTemplateType,
  UserRole,
  WhatsAppMessageLog,
} from "@/types/crm";
import { generateSeedData } from "@/data/seedData";
import {
  evaluateCoupon,
  getDaysUntilCelebration,
  toLocalISODate,
} from "@/lib/dateUtils";
import DashboardView from "@/components/DashboardView";
import CustomersView from "@/components/CustomersView";
import CouponsView from "@/components/CouponsView";
import CampaignsView from "@/components/CampaignsView";
import BranchesView from "@/components/BranchesView";
import QuickRegisterModal from "@/components/QuickRegisterModal";
import WhatsappPreviewModal from "@/components/WhatsappPreviewModal";
import CustomerDetailDrawer from "@/components/CustomerDetailDrawer";

const STORAGE_KEY = "zariya_enterprise_crm_demo_v1";

interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
}

export default function ZariyaEnterpriseCRMPage() {
  // Initialize synchronously from deterministic relative seed data, then hydrate localStorage if saved
  const initialSeed = useMemo(() => generateSeedData(), []);

  const [branches] = useState<Branch[]>(initialSeed.branches);
  const [customers, setCustomers] = useState<Customer[]>(initialSeed.customers);
  const [consents, setConsents] = useState<Record<string, ConsentRecord>>(
    initialSeed.consents
  );
  const [coupons, setCoupons] = useState<Coupon[]>(initialSeed.coupons);
  const [messages, setMessages] = useState<WhatsAppMessageLog[]>(
    initialSeed.messages
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialSeed.campaigns);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Navigation, Multi-Branch & RBAC state
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [activeBranchId, setActiveBranchId] = useState<string>("ALL");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals & Drawers state
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null);

  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean;
    customer: Customer | null;
    template: MessageTemplateType;
    couponCode: string;
  }>({
    isOpen: false,
    customer: null,
    template: "birthday",
    couponCode: "",
  });

  // Elegant Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Luxury Toast Queue
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (title: string, subtitle?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, subtitle }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  // Load saved demo session from localStorage on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed.customers) &&
          parsed.consents &&
          Array.isArray(parsed.coupons)
        ) {
          setCustomers(parsed.customers);
          setConsents(parsed.consents);
          setCoupons(parsed.coupons);
          if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
          if (Array.isArray(parsed.campaigns)) setCampaigns(parsed.campaigns);
        }
      }
    } catch {
      // Fallback cleanly to seed data
    }
    setIsHydrated(true);
  }, []);

  // Persist changes to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          customers,
          consents,
          coupons,
          messages,
          campaigns,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [isHydrated, customers, consents, coupons, messages, campaigns]);

  // Derived badge counts for sidebar
  const navCounts = useMemo(() => {
    const scopedCusts =
      activeBranchId === "ALL"
        ? customers
        : customers.filter((c) => c.branchId === activeBranchId);

    const celebrationsToday = scopedCusts.filter(
      (c) =>
        getDaysUntilCelebration(c.dateOfBirth) === 0 ||
        getDaysUntilCelebration(c.anniversaryDate) === 0
    ).length;

    const activeCoupons = coupons.filter((cp) => {
      const branchOk =
        activeBranchId === "ALL" ||
        cp.branchId === "ALL" ||
        cp.branchId === activeBranchId;
      return branchOk && evaluateCoupon(cp).canRedeem;
    }).length;

    return {
      customersCount: scopedCusts.length,
      celebrationsToday,
      activeCoupons,
    };
  }, [customers, coupons, activeBranchId]);

  const drawerCustomer = useMemo(
    () => customers.find((c) => c.id === drawerCustomerId) ?? null,
    [customers, drawerCustomerId]
  );

  // Handlers
  const handleRoleChange = (nextRole: UserRole) => {
    setUserRole(nextRole);
    if (nextRole === "staff" && activeBranchId === "ALL") {
      setActiveBranchId(branches[0].id);
      pushToast(
        "Switched to Showroom Executive Role",
        `Focused on ${branches[0].name} floor operations.`
      );
    } else {
      pushToast(
        nextRole === "admin"
          ? "Switched to Enterprise Administrator"
          : "Switched to Showroom Executive",
        nextRole === "admin"
          ? "Full multi-branch management & governance enabled."
          : "Streamlined showroom floor & reception permissions active."
      );
    }
  };

  const handleSaveCustomer = (
    data: {
      name: string;
      whatsappNumber: string;
      dateOfBirth: string;
      anniversaryDate: string;
      branchId: string;
      marketingConsent: boolean;
    },
    openWhatsAppAfter?: boolean
  ) => {
    const todayStr = toLocalISODate();

    if (editingCustomer) {
      const updatedCustomer: Customer = {
        ...editingCustomer,
        name: data.name,
        whatsappNumber: data.whatsappNumber,
        dateOfBirth: data.dateOfBirth,
        anniversaryDate: data.anniversaryDate,
        branchId: data.branchId,
      };

      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? updatedCustomer : c))
      );

      setConsents((prev) => ({
        ...prev,
        [editingCustomer.id]: {
          customerId: editingCustomer.id,
          agreed: data.marketingConsent,
          updatedAt: todayStr,
          channel: "Reception Desk",
        },
      }));

      setIsRegisterOpen(false);
      setEditingCustomer(null);
      pushToast(
        "Patron Profile Updated",
        `${data.name}'s details & separate marketing consent saved.`
      );
    } else {
      const newId = `cust-${Date.now()}`;
      const newCustomer: Customer = {
        id: newId,
        name: data.name,
        whatsappNumber: data.whatsappNumber,
        dateOfBirth: data.dateOfBirth,
        anniversaryDate: data.anniversaryDate,
        branchId: data.branchId,
        createdAt: todayStr,
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      setConsents((prev) => ({
        ...prev,
        [newId]: {
          customerId: newId,
          agreed: data.marketingConsent,
          updatedAt: todayStr,
          channel: "Showroom Tablet",
        },
      }));

      setIsRegisterOpen(false);
      pushToast(
        "Patron Registered in Showroom Directory",
        `${data.name} (${data.whatsappNumber}) added with ${
          data.marketingConsent ? "Opt-In" : "Opt-Out"
        } consent.`
      );

      if (openWhatsAppAfter) {
        const isBdayToday = getDaysUntilCelebration(data.dateOfBirth) === 0;
        const isAnnivToday =
          getDaysUntilCelebration(data.anniversaryDate) === 0;
        setWhatsAppModalState({
          isOpen: true,
          customer: newCustomer,
          template: isBdayToday
            ? "birthday"
            : isAnnivToday
            ? "anniversary"
            : "coupon",
          couponCode: "",
        });
      }
    }
  };

  const handleRequestDeleteCustomer = (customer: Customer) => {
    setConfirmDialog({
      title: `Remove ${customer.name}?`,
      description:
        "This will permanently remove the patron record and their separate marketing consent entry from this demo session.",
      confirmLabel: "Delete Patron Record",
      onConfirm: () => {
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        setConsents((prev) => {
          const copy = { ...prev };
          delete copy[customer.id];
          return copy;
        });
        if (drawerCustomerId === customer.id) setDrawerCustomerId(null);
        setConfirmDialog(null);
        pushToast("Patron Record Deleted", `${customer.name} has been removed.`);
      },
    });
  };

  const handleToggleConsent = (customerId: string, nextAgreed: boolean) => {
    const patron = customers.find((c) => c.id === customerId);
    setConsents((prev) => ({
      ...prev,
      [customerId]: {
        customerId,
        agreed: nextAgreed,
        updatedAt: toLocalISODate(),
        channel: nextAgreed ? "Reception Desk" : "WhatsApp Opt-Out",
      },
    }));

    pushToast(
      nextAgreed
        ? "WhatsApp Marketing Opt-In Recorded"
        : "Patron Opt-Out Recorded",
      nextAgreed
        ? `${patron?.name ?? "Customer"} is now eligible for celebration greetings.`
        : `${patron?.name ?? "Customer"} will no longer receive promotional WhatsApp messages.`
    );
  };

  const handleCreateCoupon = (
    data: Omit<Coupon, "id" | "createdAt" | "usedCount">
  ): Coupon => {
    const newCoupon: Coupon = {
      ...data,
      id: `cpn-${Date.now()}`,
      usedCount: 0,
      createdAt: toLocalISODate(),
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    pushToast(
      `Coupon ${newCoupon.code} Created`,
      `${newCoupon.name} is now active in the centralized coupon ledger.`
    );
    return newCoupon;
  };

  const handleToggleCouponEnabled = (couponId: string) => {
    const target = coupons.find((c) => c.id === couponId);
    if (!target) return;
    const nextState = !target.enabled;
    setCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, enabled: nextState } : c))
    );
    pushToast(
      nextState ? `Coupon ${target.code} Enabled` : `Coupon ${target.code} Disabled`,
      nextState
        ? "Offer is now valid for showroom redemptions."
        : "Redemptions for this code are now temporarily paused."
    );
  };

  const handleRedeemCoupon = (couponId: string) => {
    const target = coupons.find((c) => c.id === couponId);
    if (!target) return;

    const ev = evaluateCoupon(target);
    if (!ev.canRedeem) {
      pushToast("Redemption Blocked", ev.blockReason);
      return;
    }

    const todayStr = toLocalISODate();
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === couponId
          ? {
              ...c,
              usedCount: c.usedCount + 1,
              lastRedeemedAt: todayStr,
            }
          : c
      )
    );

    // Also increment campaign redemption attribution if matched
    setCampaigns((prev) =>
      prev.map((cmp) =>
        cmp.couponCode === target.code
          ? { ...cmp, redeemedCount: cmp.redeemedCount + 1 }
          : cmp
      )
    );

    pushToast(
      `Coupon ${target.code} Marked as Redeemed`,
      `Verified redemption (${target.usedCount + 1}/${target.maxUses}) recorded at showroom desk.`
    );
  };

  const handleSendWhatsApp = (payload: {
    customerId: string;
    branchId: string;
    templateType: MessageTemplateType;
    messageText: string;
    couponCode?: string;
  }) => {
    const patron = customers.find((c) => c.id === payload.customerId);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const newLog: WhatsAppMessageLog = {
      id: `msg-${Date.now()}`,
      customerId: payload.customerId,
      branchId: payload.branchId,
      templateType: payload.templateType,
      messageText: payload.messageText,
      couponCode: payload.couponCode,
      sentAt: `${toLocalISODate()} ${timeStr}`,
      sentBy:
        userRole === "admin"
          ? "Enterprise Concierge Desk"
          : "Showroom Relationship Executive",
      deliveryStatus: "Delivered",
    };

    setMessages((prev) => [...prev, newLog]);
    pushToast(
      "WhatsApp Greeting Dispatched",
      `Personalized ${payload.templateType} message sent to ${
        patron?.name ?? "patron"
      }.`
    );
  };

  const handleLaunchCampaign = (payload: {
    name: string;
    category: CouponCategory;
    branchId: string;
    couponCode?: string;
    messageTemplate: string;
    recipients: Customer[];
  }) => {
    const count = payload.recipients.length;
    if (count === 0) return;

    const todayStr = toLocalISODate();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const tplType: MessageTemplateType =
      payload.category === "exclusive" ? "coupon" : payload.category;

    const batchLogs: WhatsAppMessageLog[] = payload.recipients.map((rec, i) => ({
      id: `msg-cmp-${Date.now()}-${i}`,
      customerId: rec.id,
      branchId: rec.branchId,
      templateType: tplType,
      couponCode: payload.couponCode,
      messageText: payload.messageTemplate.replace(
        /\[Customer Name\]/g,
        rec.name
      ),
      sentAt: `${todayStr} ${timeStr}`,
      sentBy: `Campaign Studio (${payload.name})`,
      deliveryStatus: "Delivered",
    }));

    setMessages((prev) => [...prev, ...batchLogs]);

    const newCampaign: Campaign = {
      id: `cmp-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      branchId: payload.branchId,
      couponCode: payload.couponCode,
      messageTemplate: payload.messageTemplate,
      sentCount: count,
      deliveredCount: count,
      redeemedCount: 0,
      status: "Active",
      lastRunAt: todayStr,
    };

    setCampaigns((prev) => [newCampaign, ...prev]);

    pushToast(
      "WhatsApp Campaign Dispatched",
      `Delivered personalized messages to ${count} consented showroom patrons.`
    );
  };

  const handleResetDemo = () => {
    setConfirmDialog({
      title: "Restore Original Showroom Demo Data?",
      description:
        "This resets all customers, separate consent logs, coupons, and WhatsApp histories back to the curated 5-branch heritage silk showroom dataset.",
      confirmLabel: "Restore Demo Data",
      onConfirm: () => {
        const fresh = generateSeedData();
        setCustomers(fresh.customers);
        setConsents(fresh.consents);
        setCoupons(fresh.coupons);
        setMessages(fresh.messages);
        setCampaigns(fresh.campaigns);
        setActiveBranchId("ALL");
        setUserRole("admin");
        window.localStorage.removeItem(STORAGE_KEY);
        setConfirmDialog(null);
        pushToast(
          "Demo Dataset Restored",
          "All 5 flagship showroom branches & celebrations reset."
        );
      },
    });
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: "dashboard",
      label: "Executive Dashboard",
      icon: LayoutDashboard,
      badge: navCounts.celebrationsToday > 0 ? navCounts.celebrationsToday : undefined,
    },
    {
      id: "customers",
      label: "Customer Directory",
      icon: Users,
      badge: navCounts.customersCount,
    },
    {
      id: "coupons",
      label: "Coupons & Offers",
      icon: Ticket,
      badge: navCounts.activeCoupons,
    },
    {
      id: "campaigns",
      label: "Campaign Studio",
      icon: Send,
    },
    {
      id: "branches",
      label: "Showroom Branches",
      icon: Building2,
      badge: branches.length,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#FAF7F0] text-[#252323]">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-[#252323]/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Deep Royal Burgundy Luxury Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-[#541326] text-[#FAF7F0] border-r border-[#C8A96B]/30 flex flex-col justify-between transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Crest */}
          <div className="px-6 py-6 border-b border-[#C8A96B]/25 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#741F38] border border-[#C8A96B] flex items-center justify-center font-serif font-bold text-xl text-[#C8A96B] shadow-md">
                Z
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-2xl font-bold tracking-wider text-[#FAF7F0]">
                    ZARIYA
                  </span>
                  <span className="text-[9px] uppercase tracking-widest bg-[#C8A96B]/20 text-[#C8A96B] border border-[#C8A96B]/40 px-1.5 py-0.5 rounded">
                    Enterprise
                  </span>
                </div>
                <p className="text-[11px] text-[#C8A96B] tracking-wide">
                  Heritage Silk Clienteling Cloud
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden rounded-lg p-1.5 text-[#FAF7F0]/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Retail Chain Tenant Badge */}
          <div className="px-5 pt-5 pb-2">
            <div className="rounded-xl bg-[#741F38]/70 border border-[#C8A96B]/30 px-3.5 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#C8A96B] font-semibold">
                Enterprise Retail House
              </p>
              <p className="font-serif text-base font-semibold text-[#FAF7F0] mt-0.5">
                Kanchipuram Royal Silks
              </p>
              <p className="text-[11px] text-[#FAF7F0]/70">
                5 Flagship Showrooms • South India
              </p>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="px-4 py-3 space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? "bg-[#FAF7F0] text-[#541326] font-semibold shadow-sm"
                      : "text-[#FAF7F0]/80 hover:bg-[#741F38] hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-[#541326]" : "text-[#C8A96B]"
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-[#541326] text-[#C8A96B]"
                          : "bg-[#741F38] text-[#C8A96B]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: Quick Register + Reset Demo */}
        <div className="p-4 border-t border-[#C8A96B]/25 space-y-3">
          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsRegisterOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#C8A96B] text-[#252323] py-3 px-4 text-xs font-bold uppercase tracking-wider hover:bg-[#D5B87E] shadow-md transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Quick Register (30s)</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px] text-[#FAF7F0]/65">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#C8A96B]" />
              <span>Interactive SaaS Demo</span>
            </span>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1 text-[#C8A96B] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Executive Bar */}
        <header className="sticky top-0 z-30 bg-[#FAF7F0]/95 backdrop-blur-md border-b border-[#E6DEC8] px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Mobile Hamburger + Active Showroom Selector */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden rounded-xl border border-[#D8CEBE] bg-white p-2 text-[#541326]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#741F38] hidden sm:block" />
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  aria-label="Select Showroom Branch"
                  className="rounded-xl bg-white border border-[#D8CEBE] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#252323] focus:outline-none focus:border-[#541326] shadow-2xs"
                >
                  <option value="ALL">
                    All 5 Showroom Branches (Consolidated)
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.city} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Controls: Role Switcher + Quick Register */}
            <div className="flex items-center gap-2.5">
              {/* Role-Based Access Pill */}
              <div className="hidden sm:inline-flex items-center rounded-xl bg-white border border-[#E6DEC8] p-1">
                <button
                  type="button"
                  onClick={() => handleRoleChange("admin")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    userRole === "admin"
                      ? "bg-[#541326] text-[#FAF7F0]"
                      : "text-[#6E655F] hover:text-[#252323]"
                  }`}
                >
                  <Shield className="w-3 h-3 text-[#C8A96B]" />
                  <span>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange("staff")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    userRole === "staff"
                      ? "bg-[#541326] text-[#FAF7F0]"
                      : "text-[#6E655F] hover:text-[#252323]"
                  }`}
                >
                  Showroom Staff
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingCustomer(null);
                  setIsRegisterOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#541326] text-[#FAF7F0] px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-[#741F38] shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#C8A96B]" />
                <span className="hidden sm:inline">Quick Register</span>
                <span className="sm:hidden">Register</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <DashboardView
              customers={customers}
              consents={consents}
              coupons={coupons}
              campaigns={campaigns}
              branches={branches}
              activeBranchId={activeBranchId}
              onOpenRegister={() => {
                setEditingCustomer(null);
                setIsRegisterOpen(true);
              }}
              onOpenWhatsApp={(customer, template, couponCode = "") =>
                setWhatsAppModalState({
                  isOpen: true,
                  customer,
                  template,
                  couponCode,
                })
              }
              onSelectCustomer={(customer) => setDrawerCustomerId(customer.id)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "customers" && (
            <CustomersView
              customers={customers}
              consents={consents}
              coupons={coupons}
              messages={messages}
              branches={branches}
              activeBranchId={activeBranchId}
              userRole={userRole}
              onOpenRegister={() => {
                setEditingCustomer(null);
                setIsRegisterOpen(true);
              }}
              onEditCustomer={(customer) => {
                setEditingCustomer(customer);
                setIsRegisterOpen(true);
              }}
              onDeleteCustomer={handleRequestDeleteCustomer}
              onToggleConsent={handleToggleConsent}
              onSelectCustomer={(customer) => setDrawerCustomerId(customer.id)}
              onOpenWhatsApp={(customer, template = "birthday", couponCode = "") =>
                setWhatsAppModalState({
                  isOpen: true,
                  customer,
                  template,
                  couponCode,
                })
              }
            />
          )}

          {activeTab === "coupons" && (
            <CouponsView
              coupons={coupons}
              customers={customers}
              branches={branches}
              activeBranchId={activeBranchId}
              userRole={userRole}
              onCreateCoupon={handleCreateCoupon}
              onToggleCouponEnabled={handleToggleCouponEnabled}
              onRedeemCoupon={handleRedeemCoupon}
              onSendCouponWhatsApp={(customer, template, couponCode) =>
                setWhatsAppModalState({
                  isOpen: true,
                  customer,
                  template,
                  couponCode,
                })
              }
            />
          )}

          {activeTab === "campaigns" && (
            <CampaignsView
              campaigns={campaigns}
              customers={customers}
              consents={consents}
              coupons={coupons}
              branches={branches}
              activeBranchId={activeBranchId}
              onLaunchCampaign={handleLaunchCampaign}
              onOpenIndividualWhatsApp={(customer, template, couponCode = "") =>
                setWhatsAppModalState({
                  isOpen: true,
                  customer,
                  template,
                  couponCode,
                })
              }
            />
          )}

          {activeTab === "branches" && (
            <BranchesView
              branches={branches}
              customers={customers}
              consents={consents}
              coupons={coupons}
              campaigns={campaigns}
              messages={messages}
              activeBranchId={activeBranchId}
              userRole={userRole}
              onSelectBranch={(bid) => {
                setActiveBranchId(bid);
                pushToast(
                  bid === "ALL"
                    ? "Switched to Consolidated Enterprise View"
                    : `Focused on ${
                        branches.find((b) => b.id === bid)?.name ?? "Showroom"
                      }`
                );
              }}
              onChangeRole={handleRoleChange}
              onToggleConsent={handleToggleConsent}
            />
          )}
        </main>

        {/* Subtle Luxury SaaS Footer */}
        <footer className="px-4 sm:px-8 py-4 border-t border-[#E6DEC8] text-xs text-[#8C827A] max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong className="font-serif text-[#541326] text-sm">ZARIYA</strong>{" "}
            • Customer Engagement & Celebration Loyalty Platform for Heritage
            Textile Retailers
          </span>
          <span>
            DPDP Compliant Separate Marketing Consent • WhatsApp Business Ready
          </span>
        </footer>
      </div>

      {/* 1. Quick 30-Second Customer Registration & Edit Modal */}
      <QuickRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          setEditingCustomer(null);
        }}
        branches={branches}
        activeBranchId={activeBranchId}
        existingCustomers={customers}
        editingCustomer={editingCustomer}
        editingConsent={
          editingCustomer
            ? consents[editingCustomer.id]?.agreed ?? true
            : true
        }
        onSave={handleSaveCustomer}
      />

      {/* 2. Personalized WhatsApp Composer & Smartphone Live Preview Modal */}
      <WhatsappPreviewModal
        isOpen={whatsAppModalState.isOpen}
        onClose={() =>
          setWhatsAppModalState((prev) => ({ ...prev, isOpen: false }))
        }
        customer={whatsAppModalState.customer}
        allCustomers={customers}
        consents={consents}
        coupons={coupons}
        branches={branches}
        initialTemplate={whatsAppModalState.template}
        initialCouponCode={whatsAppModalState.couponCode}
        onQuickCreateCoupon={handleCreateCoupon}
        onSendWhatsApp={handleSendWhatsApp}
      />

      {/* 3. Patron Profile & Communication History Slide-Over Drawer */}
      <CustomerDetailDrawer
        customer={drawerCustomer}
        onClose={() => setDrawerCustomerId(null)}
        branch={
          drawerCustomer
            ? branches.find((b) => b.id === drawerCustomer.branchId)
            : undefined
        }
        consent={drawerCustomer ? consents[drawerCustomer.id] : undefined}
        coupons={coupons}
        messages={messages}
        onToggleConsent={handleToggleConsent}
        onOpenWhatsApp={(customer, template = "birthday", couponCode = "") =>
          setWhatsAppModalState({
            isOpen: true,
            customer,
            template,
            couponCode,
          })
        }
        onRedeemCoupon={handleRedeemCoupon}
        onEditCustomer={(customer) => {
          setEditingCustomer(customer);
          setIsRegisterOpen(true);
        }}
      />

      {/* 4. Elegant Luxury Confirmation Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#252323]/60 backdrop-blur-xs p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#FAF7F0] border border-[#C8A96B]/60 p-6 shadow-2xl animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#9B2C2C]/10 text-[#9B2C2C] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-[#252323]">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-[#6E655F] mt-1 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6E655F] hover:bg-[#EFE9DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="rounded-xl bg-[#9B2C2C] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#7F2323] shadow-xs cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Champagne-Bordered Executive Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-2xl bg-[#252323] text-[#FAF7F0] border border-[#C8A96B] px-4 py-3.5 shadow-xl flex items-start gap-3 animate-fade-in"
          >
            <CheckCircle2 className="w-5 h-5 text-[#C8A96B] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#FAF7F0]">{t.title}</p>
              {t.subtitle && (
                <p className="text-[11px] text-[#FAF7F0]/75 mt-0.5 leading-snug">
                  {t.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

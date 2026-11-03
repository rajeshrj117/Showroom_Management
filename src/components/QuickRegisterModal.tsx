"use client";

import React, { useEffect, useState } from "react";
import { X, Check, ShieldCheck, Sparkles, Phone, Calendar, User, Building2 } from "lucide-react";
import { Branch, Customer } from "@/types/crm";
import { formatIndianWhatsApp } from "@/lib/dateUtils";

interface QuickRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  activeBranchId: string; // "ALL" or branch ID
  existingCustomers: Customer[];
  editingCustomer?: Customer | null;
  editingConsent?: boolean;
  onSave: (
    data: {
      name: string;
      whatsappNumber: string;
      dateOfBirth: string;
      anniversaryDate: string;
      branchId: string;
      marketingConsent: boolean;
    },
    openWhatsAppAfter?: boolean
  ) => void;
}

export default function QuickRegisterModal({
  isOpen,
  onClose,
  branches,
  activeBranchId,
  existingCustomers,
  editingCustomer,
  editingConsent = true,
  onSave,
}: QuickRegisterModalProps) {
  const defaultBranchId =
    activeBranchId !== "ALL" ? activeBranchId : branches[0]?.id ?? "br-chn-tn";

  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [marketingConsent, setMarketingConsent] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (editingCustomer) {
      setName(editingCustomer.name);
      setWhatsappNumber(editingCustomer.whatsappNumber);
      setDateOfBirth(editingCustomer.dateOfBirth || "");
      setAnniversaryDate(editingCustomer.anniversaryDate || "");
      setBranchId(editingCustomer.branchId);
      setMarketingConsent(editingConsent);
    } else {
      setName("");
      setWhatsappNumber("+91 ");
      setDateOfBirth("");
      setAnniversaryDate("");
      setBranchId(
        activeBranchId !== "ALL" ? activeBranchId : branches[0]?.id ?? "br-chn-tn"
      );
      setMarketingConsent(true);
    }
  }, [isOpen, editingCustomer, editingConsent, activeBranchId, branches]);

  if (!isOpen) return null;

  const validateAndSubmit = (openWhatsAppAfter: boolean) => {
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter the customer's full name.");
      return;
    }

    const digits = whatsappNumber.replace(/\D/g, "");
    const tenDigits =
      digits.length > 10 && digits.startsWith("91") ? digits.slice(2) : digits;

    if (tenDigits.length !== 10) {
      setError("Please enter a valid 10-digit Indian WhatsApp mobile number.");
      return;
    }

    const formattedPhone = formatIndianWhatsApp(tenDigits);

    // Check duplicate mobile number
    const duplicate = existingCustomers.find((c) => {
      if (editingCustomer && c.id === editingCustomer.id) return false;
      const cDigits = c.whatsappNumber.replace(/\D/g, "").slice(-10);
      return cDigits === tenDigits;
    });

    if (duplicate) {
      setError(
        `This WhatsApp number is already registered to ${duplicate.name}.`
      );
      return;
    }

    onSave(
      {
        name: trimmedName,
        whatsappNumber: formattedPhone,
        dateOfBirth,
        anniversaryDate,
        branchId,
        marketingConsent,
      },
      openWhatsAppAfter && marketingConsent
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252323]/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#FAF7F0] border border-[#C8A96B]/45 shadow-2xl overflow-hidden animate-fade-in">
        {/* Luxury Burgundy Header */}
        <div className="bg-[#541326] px-6 py-5 text-[#FAF7F0] border-b border-[#C8A96B]/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#C8A96B] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>30-Second Showroom Desk</span>
            </div>
            <h2
              id="register-modal-title"
              className="font-serif text-2xl font-semibold tracking-wide mt-0.5"
            >
              {editingCustomer ? "Update Patron Profile" : "Quick Customer Registration"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#FAF7F0]/75 hover:text-white hover:bg-[#741F38] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            validateAndSubmit(false);
          }}
          className="p-6 space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-[#9B2C2C]/10 border border-[#9B2C2C]/30 px-4 py-3 text-sm text-[#9B2C2C] font-medium">
              {error}
            </div>
          )}

          {/* Branch attribution (clean pill / selector) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5">
              Showroom Branch
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#741F38] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={activeBranchId !== "ALL" && !editingCustomer}
                className="w-full rounded-xl bg-white border border-[#D8CEBE] pl-10 pr-4 py-3 text-sm font-medium text-[#252323] focus:outline-none focus:border-[#541326] focus:ring-2 focus:ring-[#541326]/15 disabled:bg-[#F3EFE6] transition"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.city} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1. Customer Name */}
          <div>
            <label
              htmlFor="cust-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5"
            >
              1. Customer Name <span className="text-[#9B2C2C]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#741F38] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="cust-name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Smt. Meenakshi Sundaram"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#D8CEBE] pl-10 pr-4 py-3.5 text-base text-[#252323] placeholder:text-[#A39B93] focus:outline-none focus:border-[#541326] focus:ring-2 focus:ring-[#541326]/15 transition"
              />
            </div>
          </div>

          {/* 2. WhatsApp Mobile Number (Mandatory) */}
          <div>
            <label
              htmlFor="cust-whatsapp"
              className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5"
            >
              2. WhatsApp Mobile Number <span className="text-[#9B2C2C]">* (Mandatory)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#1F6E43] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="cust-whatsapp"
                type="tel"
                required
                placeholder="+91 98401 23456"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#D8CEBE] pl-10 pr-4 py-3.5 text-base font-mono text-[#252323] placeholder:text-[#A39B93] focus:outline-none focus:border-[#541326] focus:ring-2 focus:ring-[#541326]/15 transition"
              />
            </div>
          </div>

          {/* 3 & 4. Date of Birth & Wedding Anniversary Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cust-dob"
                className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5"
              >
                3. Date of Birth
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#741F38] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="cust-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl bg-white border border-[#D8CEBE] pl-10 pr-3 py-3 text-sm text-[#252323] focus:outline-none focus:border-[#541326] focus:ring-2 focus:ring-[#541326]/15 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cust-anniversary"
                className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-1.5"
              >
                4. Wedding Anniversary Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#C8A96B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="cust-anniversary"
                  type="date"
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className="w-full rounded-xl bg-white border border-[#D8CEBE] pl-10 pr-3 py-3 text-sm text-[#252323] focus:outline-none focus:border-[#541326] focus:ring-2 focus:ring-[#541326]/15 transition"
                />
              </div>
            </div>
          </div>

          {/* 5. WhatsApp Marketing Consent (Yes / No) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E655F] mb-2">
              5. WhatsApp Marketing Consent (Stored Separately)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMarketingConsent(true)}
                className={`flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 border text-sm font-semibold transition cursor-pointer ${
                  marketingConsent
                    ? "bg-[#1F6E43]/10 border-[#1F6E43] text-[#1F6E43] shadow-xs"
                    : "bg-white border-[#D8CEBE] text-[#6E655F] hover:border-[#C8A96B]"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    marketingConsent
                      ? "bg-[#1F6E43] border-[#1F6E43] text-white"
                      : "border-[#C4B9A8]"
                  }`}
                >
                  {marketingConsent && <Check className="w-3.5 h-3.5" />}
                </span>
                <span>Yes — Agreed</span>
              </button>

              <button
                type="button"
                onClick={() => setMarketingConsent(false)}
                className={`flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 border text-sm font-semibold transition cursor-pointer ${
                  !marketingConsent
                    ? "bg-[#9B2C2C]/10 border-[#9B2C2C] text-[#9B2C2C] shadow-xs"
                    : "bg-white border-[#D8CEBE] text-[#6E655F] hover:border-[#C8A96B]"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    !marketingConsent
                      ? "bg-[#9B2C2C] border-[#9B2C2C] text-white"
                      : "border-[#C4B9A8]"
                  }`}
                >
                  {!marketingConsent && <X className="w-3.5 h-3.5" />}
                </span>
                <span>No — Opted Out</span>
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[#6E655F]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />
              <span>
                Promotional wishes & coupons are dispatched strictly to consented patrons. Easy 1-click opt-out anytime.
              </span>
            </p>
          </div>

          {/* Large Showroom Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-[#E6DEC8]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-3 text-sm font-semibold text-[#6E655F] hover:bg-[#EFE9DC] transition cursor-pointer"
            >
              Cancel
            </button>
            {!editingCustomer && marketingConsent && (
              <button
                type="button"
                onClick={() => validateAndSubmit(true)}
                className="rounded-xl px-5 py-3 text-sm font-semibold border border-[#C8A96B] bg-white text-[#541326] hover:bg-[#FAF3E3] transition cursor-pointer"
              >
                Save & Send WhatsApp Offer
              </button>
            )}
            <button
              type="submit"
              className="rounded-xl px-6 py-3.5 text-sm font-semibold bg-[#541326] text-[#FAF7F0] hover:bg-[#741F38] shadow-md transition cursor-pointer"
            >
              {editingCustomer ? "Save Changes" : "Register Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

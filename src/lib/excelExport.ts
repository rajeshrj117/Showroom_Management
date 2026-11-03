import * as XLSX from "xlsx";
import { Branch, ConsentRecord, Coupon, Customer } from "@/types/crm";
import { formatMediumDate, toLocalISODate } from "@/lib/dateUtils";

export function exportCustomersToExcel(params: {
  customers: Customer[];
  branches: Branch[];
  consents: Record<string, ConsentRecord>;
  coupons: Coupon[];
  branchLabel: string;
}) {
  const { customers, branches, consents, coupons, branchLabel } = params;

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const rows = customers.map((customer, index) => {
    const branch = branchMap.get(customer.branchId);
    const consent = consents[customer.id];
    const assignedCoupons = coupons
      .filter((cp) => cp.assignedCustomerId === customer.id)
      .map((cp) => cp.code)
      .join(", ");

    return {
      "Sr. No.": index + 1,
      "Customer Name": customer.name,
      "WhatsApp Mobile Number": customer.whatsappNumber,
      "Showroom Branch": branch ? `${branch.name} (${branch.city})` : customer.branchId,
      "Date of Birth": customer.dateOfBirth ? formatMediumDate(customer.dateOfBirth) : "Not Provided",
      "Wedding Anniversary": customer.anniversaryDate
        ? formatMediumDate(customer.anniversaryDate)
        : "Not Provided",
      "WhatsApp Marketing Consent": consent?.agreed ? "Yes (Opted-In)" : "No (Opted-Out)",
      "Consent Updated On": consent?.updatedAt ?? customer.createdAt,
      "Consent Channel": consent?.channel ?? "Showroom Tablet",
      "Assigned Coupon Codes": assignedCoupons || "—",
      "Registered On": formatMediumDate(customer.createdAt),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set polished column widths for immediate executive readability in Excel
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 20 },
    { wch: 32 },
    { wch: 18 },
    { wch: 20 },
    { wch: 26 },
    { wch: 18 },
    { wch: 20 },
    { wch: 26 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Showroom Patrons");

  const safeSlug = branchLabel.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fileName = `Zariya-Patrons-${safeSlug}-${toLocalISODate()}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

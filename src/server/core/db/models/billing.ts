import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import * as E from "../enums";
import { bool, currency, dateOnly, enumOf, fk, int, money, orgId, qty, str, text, ts, uuidPk } from "./columns";

// M11–M13 change orders, invoices, payment schedules, payments, refunds.

export const ChangeOrder = sequelize.define(
  "ChangeOrder",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    changeOrderNumber: str(40, false),
    title: str(180, false),
    description: text(false),
    status: enumOf(E.ChangeOrderStatus, "draft"),
    priceDelta: money(), // positive or negative
    scheduleDeltaDays: int(undefined, true),
    customerVisibleNotes: text(),
    issuedAt: ts(),
    approvedAt: ts(),
    declinedAt: ts(),
    approvedByCustomerName: str(160),
    approvedByCustomerEmail: str(254),
    signatureRequestId: fk(true),
    createdByUserId: fk(),
  },
  {
    tableName: "change_orders",
    indexes: [
      { unique: true, fields: ["organization_id", "change_order_number"] },
      { fields: ["organization_id", "status"] },
      { fields: ["project_id"] },
    ],
  },
);

export const ChangeOrderItem = sequelize.define(
  "ChangeOrderItem",
  {
    id: uuidPk(),
    organizationId: orgId(),
    changeOrderId: fk(),
    description: str(255, false),
    quantity: qty(),
    unit: str(30, false),
    unitPriceDelta: money(),
    lineTotalDelta: money(),
    taxable: bool(true),
    sortOrder: int(0),
  },
  { tableName: "change_order_items", timestamps: false, indexes: [{ fields: ["change_order_id"] }] },
);

export const Invoice = sequelize.define(
  "Invoice",
  {
    id: uuidPk(),
    organizationId: orgId(),
    invoiceNumber: str(40, false),
    customerId: fk(),
    projectId: fk(true),
    contractId: fk(true),
    status: enumOf(E.InvoiceStatus, "draft"),
    invoiceType: enumOf(E.InvoiceType, "standard"),
    currency: currency(),
    issueDate: dateOnly(false),
    dueDate: dateOnly(),
    subtotal: money(),
    discountTotal: money(false, 0),
    taxTotal: money(false, 0),
    total: money(),
    amountPaid: money(false, 0),
    balanceDue: money(),
    termsSnapshot: text(),
    issuedAt: ts(),
    paidAt: ts(),
    voidedAt: ts(),
    createdByUserId: fk(),
  },
  {
    tableName: "invoices",
    indexes: [
      { unique: true, fields: ["organization_id", "invoice_number"] },
      { fields: ["organization_id", "status"] },
      { fields: ["organization_id", "created_at"] },
      { fields: ["customer_id"] },
      { fields: ["project_id"] },
      { fields: ["due_date"] },
    ],
  },
);

export const InvoiceItem = sequelize.define(
  "InvoiceItem",
  {
    id: uuidPk(),
    organizationId: orgId(),
    invoiceId: fk(),
    description: str(255, false),
    quantity: qty(),
    unit: str(30, false),
    unitPrice: money(),
    lineSubtotal: money(),
    taxable: bool(true),
    taxAmount: money(false, 0),
    sortOrder: int(0),
  },
  { tableName: "invoice_items", timestamps: false, indexes: [{ fields: ["invoice_id"] }] },
);

export const PaymentSchedule = sequelize.define(
  "PaymentSchedule",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    contractId: fk(true),
    label: str(120, false),
    amount: money(),
    percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    dueDate: dateOnly(),
    status: enumOf(E.PaymentScheduleStatus, "planned"),
    invoiceId: fk(true),
    sortOrder: int(0),
  },
  {
    tableName: "payment_schedules",
    timestamps: false,
    indexes: [{ fields: ["project_id"] }, { fields: ["due_date"] }],
  },
);

export const Payment = sequelize.define(
  "Payment",
  {
    id: uuidPk(),
    organizationId: orgId(),
    invoiceId: fk(),
    customerId: fk(),
    provider: enumOf(E.PaymentProvider, "stripe"),
    providerPaymentIntentId: { ...str(160), unique: true },
    providerCheckoutSessionId: { ...str(160), unique: true },
    status: enumOf(E.PaymentStatus, "initiated"),
    amount: money(),
    currency: currency(),
    providerFee: money(true),
    failureCode: str(100),
    failureMessage: text(),
    succeededAt: ts(),
    idempotencyKey: str(160, false),
  },
  {
    tableName: "payments",
    indexes: [
      { unique: true, fields: ["organization_id", "provider", "idempotency_key"] },
      { fields: ["organization_id", "status"] },
      { fields: ["invoice_id"] },
      { fields: ["customer_id"] },
    ],
  },
);

export const Refund = sequelize.define(
  "Refund",
  {
    id: uuidPk(),
    organizationId: orgId(),
    paymentId: fk(),
    providerRefundId: { ...str(160), unique: true },
    amount: money(),
    reason: str(255),
    status: enumOf(E.RefundStatus, "requested"),
    requestedByUserId: fk(),
    succeededAt: ts(),
  },
  { tableName: "refunds", indexes: [{ fields: ["payment_id"] }] },
);

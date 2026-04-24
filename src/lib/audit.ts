import type { Prisma, PrismaClient } from "@prisma/client";
import type { Actor } from "./session";

type Tx =
  | PrismaClient
  | Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >;

export type AuditEntityType =
  | "Sale"
  | "Purchase"
  | "Payment"
  | "Customer"
  | "Supplier"
  | "SupplierPriceQuote"
  | "MarketPrice";

export type AuditActionType = "CREATE" | "UPDATE" | "DELETE" | "VOID";

export interface WriteAuditArgs {
  actor: Actor;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditActionType;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

/**
 * Write a row to the audit log. Always call from inside the same transaction
 * as the mutation it records, so either both succeed or both fail.
 *
 * `before` and `after` are stored as JSON snapshots of the entity.
 */
export async function writeAudit(tx: Tx, args: WriteAuditArgs) {
  await tx.auditLog.create({
    data: {
      actorId: args.actor.id,
      actorName: args.actor.name,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      before: (args.before ?? null) as Prisma.InputJsonValue,
      after: (args.after ?? null) as Prisma.InputJsonValue,
      reason: args.reason ?? null,
    },
  });
}

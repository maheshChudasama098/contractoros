import { randomUUID } from "node:crypto";
import { DataTypes, type ModelAttributeColumnOptions } from "sequelize";

// Shared column builders so every model follows spec §7 conventions.

export const uuidPk = (): ModelAttributeColumnOptions => ({
  type: DataTypes.UUID,
  // Function default, not DataTypes.UUIDV4: the sentinel breaks when Next bundles sequelize (ids became "{}").
  defaultValue: () => randomUUID(),
  primaryKey: true,
});

export const fk = (allowNull = false): ModelAttributeColumnOptions => ({ type: DataTypes.UUID, allowNull });

export const orgId = (): ModelAttributeColumnOptions => fk(false);

export const str = (len: number, allowNull = true): ModelAttributeColumnOptions => ({
  type: DataTypes.STRING(len),
  allowNull,
});

export const text = (allowNull = true): ModelAttributeColumnOptions => ({ type: DataTypes.TEXT, allowNull });

export const enumOf = (values: readonly string[], defaultValue?: string): ModelAttributeColumnOptions => ({
  type: DataTypes.STRING(24),
  allowNull: false,
  ...(defaultValue !== undefined && { defaultValue }),
  validate: { isIn: [values as string[]] },
});

// NUMERIC(12,2): never floats for money. Sequelize returns DECIMAL as string.
export const money = (allowNull = false, defaultValue?: number): ModelAttributeColumnOptions => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull,
  ...(defaultValue !== undefined && { defaultValue }),
});

export const qty = (): ModelAttributeColumnOptions => ({ type: DataTypes.DECIMAL(12, 3), allowNull: false });

export const currency = (): ModelAttributeColumnOptions => ({
  type: DataTypes.CHAR(3),
  allowNull: false,
  defaultValue: "USD",
});

export const ts = (allowNull = true): ModelAttributeColumnOptions => ({ type: DataTypes.DATE, allowNull });

export const dateOnly = (allowNull = true): ModelAttributeColumnOptions => ({ type: DataTypes.DATEONLY, allowNull });

export const bool = (defaultValue: boolean): ModelAttributeColumnOptions => ({
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue,
});

export const int = (defaultValue?: number, allowNull = false): ModelAttributeColumnOptions => ({
  type: DataTypes.INTEGER,
  allowNull,
  ...(defaultValue !== undefined && { defaultValue }),
});

export const json = (allowNull = false, defaultValue: object | undefined = {}): ModelAttributeColumnOptions => ({
  type: DataTypes.JSONB,
  allowNull,
  ...(defaultValue !== undefined && !allowNull && { defaultValue }),
});

export const inet = (): ModelAttributeColumnOptions => ({ type: DataTypes.INET, allowNull: true });

// Append-only / create-only tables: created_at but no updated_at.
export const createdOnly = { updatedAt: false } as const;

import { Sequelize } from "sequelize";
import pg from "pg";

// Single Sequelize instance across hot reloads in dev.
// Reads process.env directly (not core/config/env) so CLI scripts like db:sync can import it.
function createSequelize() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Invalid or missing environment variables: DATABASE_URL");

  return new Sequelize(url, {
    dialect: "postgres",
    dialectModule: pg,
    logging: process.env.NODE_ENV === "development" && process.env.LOG_LEVEL === "trace" ? console.log : false,
    define: {
      underscored: true, // snake_case columns, camelCase attributes
      freezeTableName: true,
      timestamps: true,
    },
    pool: { max: 10, min: 0, idle: 10_000 },
  });
}

const globalForSequelize = globalThis as unknown as { sequelize?: Sequelize };

export const sequelize = globalForSequelize.sequelize ?? createSequelize();

if (process.env.NODE_ENV !== "production") globalForSequelize.sequelize = sequelize;

export async function connectDatabase() {
  await sequelize.authenticate();
}

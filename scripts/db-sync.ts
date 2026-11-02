// Creates/updates all tables from Sequelize models. Dev only; use migrations for production.
// Usage: npm run db:sync            (create missing tables)
//        npm run db:sync -- --alter (alter existing tables to match models)
//        npm run db:sync -- --force (DROP and recreate all tables)
import { sequelize } from "../src/server/core/db/models";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("db:sync is disabled in production");
  const force = process.argv.includes("--force");
  const alter = process.argv.includes("--alter");

  await sequelize.authenticate();
  await sequelize.sync({ force, alter });
  console.log(`Synced ${Object.keys(sequelize.models).length} models (force=${force}, alter=${alter})`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});

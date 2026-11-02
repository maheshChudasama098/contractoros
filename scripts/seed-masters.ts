// TEMP seeder: starter master data (industries, company sizes, time zones, expense categories, payment methods).
// Super admins manage these afterwards under Admin → Master data (/admin/masters).
// Usage: npm run db:seed:masters   (idempotent; never overwrites edits made by a super admin)
import { sequelize, Industry, MasterItem } from "../src/server/core/db/models";

const INDUSTRIES = [
  "Remodeling",
  "Kitchen & bath",
  "Additions & ADUs",
  "Roofing",
  "Flooring",
  "Painting",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Outdoor & decks",
  "General contracting",
];

// Codes match what onboarding stored before these lists moved to the database.
const ITEMS: Record<string, [code: string, name: string][]> = {
  company_size: [
    ["just_me", "Just me"],
    ["2_5", "2–5 people"],
    ["6_10", "6–10 people"],
    ["11_25", "11–25 people"],
    ["26_50", "26–50 people"],
    ["51_plus", "51+ people"],
  ],
  time_zone: [
    ["America/New_York", "Eastern Time — America/New_York"],
    ["America/Chicago", "Central Time — America/Chicago"],
    ["America/Denver", "Mountain Time — America/Denver"],
    ["America/Phoenix", "Arizona Time — America/Phoenix"],
    ["America/Los_Angeles", "Pacific Time — America/Los_Angeles"],
    ["America/Anchorage", "Alaska Time — America/Anchorage"],
    ["Pacific/Honolulu", "Hawaii Time — Pacific/Honolulu"],
  ],
  expense_category: [
    ["materials", "Materials"],
    ["labor", "Labor"],
    ["subcontractor", "Subcontractor"],
    ["equipment", "Equipment rental"],
    ["permits", "Permits & fees"],
    ["disposal", "Dumpster & disposal"],
    ["travel", "Travel & fuel"],
    ["other", "Other"],
  ],
  payment_method: [
    ["cash", "Cash"],
    ["card", "Card"],
    ["check", "Check"],
    ["bank_transfer", "Bank transfer"],
    ["company_account", "Company account"],
  ],
};

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed production");
  let created = 0;
  for (const [i, name] of INDUSTRIES.entries()) {
    const [, isNew] = await Industry.findOrCreate({ where: { name }, defaults: { name, sortOrder: (i + 1) * 10 } });
    if (isNew) created++;
  }
  console.log(`industry: ${created} created`);
  for (const [type, rows] of Object.entries(ITEMS)) {
    created = 0;
    for (const [i, [code, name]] of rows.entries()) {
      const [, isNew] = await MasterItem.findOrCreate({
        where: { type, code },
        defaults: { type, code, name, sortOrder: (i + 1) * 10 },
      });
      if (isNew) created++;
    }
    console.log(`${type}: ${created} created`);
  }
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close();
  process.exit(1);
});

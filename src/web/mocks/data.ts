import type { Tone } from "@web/theme/tokens";

// Sample records from the design canvas. Pages read from here until each
// feature's API (src/web/features/*/api.ts) is wired in.

export type LeadStage = "New" | "Contacted" | "Qualified" | "Estimate" | "Won" | "Lost";
export const LEAD_STAGES: LeadStage[] = ["New", "Contacted", "Qualified", "Estimate", "Won", "Lost"];

export type Lead = {
  id: string;
  name: string;
  value: number;
  project: string;
  area: string;
  stage: LeadStage;
  owner: string;
  source: string;
  followUp?: { label: string; due?: boolean };
  note?: string;
  tag?: { label: string; tone: Tone };
  href?: string;
};

export const leads: Lead[] = [
  { id: "hannah-lowe", name: "Hannah Lowe", value: 45000, project: "Kitchen refresh", area: "Travis Heights", stage: "New", owner: "Sam Whitfield", source: "Website" },
  { id: "greg-tanaka", name: "Greg Tanaka", value: 70000, project: "Garage conversion", area: "Mueller", stage: "New", owner: "Sam Whitfield", source: "Referral", followUp: { label: "Mon, Nov 2" } },
  { id: "amara-diallo", name: "Amara Diallo", value: 28000, project: "Guest bath", area: "Cedar Park", stage: "Contacted", owner: "Lena Ortiz", source: "Google", followUp: { label: "Today 2:30 PM", due: true } },
  { id: "ben-foster", name: "Ben Foster", value: 12000, project: "Window replacement", area: "Hyde Park", stage: "Contacted", owner: "Sam Whitfield", source: "Home show" },
  { id: "will-chen", name: "Will Chen", value: 180000, project: "Backyard ADU", area: "Bouldin Creek", stage: "Qualified", owner: "Dana Ruiz", source: "Referral", followUp: { label: "Tue, Nov 3" } },
  { id: "sofia-marquez", name: "Sofia Marquez", value: 92000, project: "Kitchen remodel", area: "Zilker", stage: "Estimate", owner: "Lena Ortiz", source: "Referral", followUp: { label: "Today 10:00 AM", due: true }, note: "CT-0188 · awaiting signature", href: "/proposals/ct-0188" },
  { id: "ruth-adeyemi", name: "Ruth Adeyemi", value: 32000, project: "Basement finish", area: "Round Rock", stage: "Estimate", owner: "Lena Ortiz", source: "Google", followUp: { label: "Fri, Oct 30" }, note: "EST-2081 · Draft v1" },
  { id: "ellen-whitaker", name: "Ellen Whitaker", value: 64200, project: "Basement finish", area: "Pflugerville", stage: "Won", owner: "Dana Ruiz", source: "Website", tag: { label: "Converted · P-1045", tone: "success" }, href: "/customers/ellen-whitaker" },
  { id: "paul-novak", name: "Paul Novak", value: 19000, project: "Deck rebuild", area: "Lost: chose lower bid", stage: "Lost", owner: "Sam Whitfield", source: "Google" },
];

export const TEAM = ["Dana Ruiz", "Lena Ortiz", "Sam Whitfield", "Marcus Bell", "Tomás Reyes", "Alex Moreno"];
export const LEAD_SOURCES = ["Referral", "Website", "Google", "Home show", "Repeat customer", "Other"];

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  projects?: { label: string; tone: Tone };
  projectsNote?: string;
  contracted?: number;
  balance: number;
  lastActivity: string;
  status: "active" | "archived";
};

export const customers: Customer[] = [
  { id: "shah", name: "Priya & Morgan Shah", email: "priya.shah@gmail.com", phone: "(512) 555-0134", property: "1418 Larkspur Ln, Austin", projects: { label: "1 active", tone: "success" }, contracted: 89650, balance: 14170, lastActivity: "Today", status: "active" },
  { id: "okafor", name: "Daniel Okafor", email: "d.okafor@outlook.com", phone: "(512) 555-0178", property: "702 Ridgewood Dr, Round Rock", projects: { label: "1 active", tone: "success" }, contracted: 38900, balance: 0, lastActivity: "Yesterday", status: "active" },
  { id: "ellen-whitaker", name: "Ellen Whitaker", email: "ellen.whitaker@gmail.com", phone: "(512) 555-0121", property: "3305 Falcon Pointe Blvd, Pflugerville", projects: { label: "1 scheduled", tone: "info" }, contracted: 64200, balance: 0, lastActivity: "Oct 26", status: "active" },
  { id: "delgado", name: "Rosa Delgado", email: "rosa.delgado@yahoo.com", phone: "(512) 555-0156", property: "4418 Bee Cave Rd, Austin", projects: { label: "1 on hold", tone: "warning" }, contracted: 22750, balance: 6825, lastActivity: "Oct 24", status: "active" },
  { id: "castillo", name: "Carmen Castillo", email: "carmen.castillo@gmail.com", phone: "(512) 555-0193", property: "919 W 49th St, Austin", projects: { label: "1 planned", tone: "neutral" }, contracted: 47800, balance: 0, lastActivity: "Oct 22", status: "active" },
  { id: "marquez", name: "Sofia Marquez", email: "sofia.marquez@gmail.com", phone: "(512) 555-0117", property: "2504 Kinney Ave, Austin", projectsNote: "Contract pending", balance: 0, lastActivity: "Today", status: "active" },
  { id: "adeyemi", name: "Ruth Adeyemi", email: "ruth.adeyemi@yahoo.com", phone: "(512) 555-0109", property: "811 Oak Hollow Dr, Round Rock", projectsNote: "Estimate draft", balance: 0, lastActivity: "Today", status: "active" },
  { id: "brennan", name: "Kevin Brennan", email: "kbrennan@icloud.com", phone: "(512) 555-0140", property: "6012 Shoal Creek Blvd, Austin", projects: { label: "1 completed", tone: "neutral" }, contracted: 14300, balance: 0, lastActivity: "Oct 14", status: "active" },
];

export type ProjectStatus = "Active" | "Scheduled" | "On hold" | "Planned" | "Completed";
export type Project = {
  no: string;
  name: string;
  address: string;
  status: ProjectStatus;
  priority?: "High" | "Normal" | "Low";
  manager: string;
  schedule: string;
  progress?: number;
  contract: string;
  balance: string;
  portal: "Shared" | "Off" | "Revoked";
};

export const projects: Project[] = [
  { no: "P-1042", name: "Shah Kitchen Remodel", address: "1418 Larkspur Ln, Austin", status: "Active", priority: "High", manager: "Marcus Bell", schedule: "Sep 14 – Dec 18", progress: 58, contract: "$89,650.00", balance: "$14,170.00", portal: "Shared" },
  { no: "P-1039", name: "Okafor Primary Bath", address: "702 Ridgewood Dr, Round Rock", status: "Active", priority: "Normal", manager: "Marcus Bell", schedule: "Oct 5 – Dec 4", progress: 34, contract: "$38,900.00", balance: "$0.00", portal: "Shared" },
  { no: "P-1045", name: "Whitaker Basement Finish", address: "3305 Falcon Pointe Blvd, Pflugerville", status: "Scheduled", priority: "Normal", manager: "Marcus Bell", schedule: "Nov 9 – Jan 22", progress: 0, contract: "$64,200.00", balance: "$0.00", portal: "Off" },
  { no: "P-1036", name: "Delgado Deck & Patio", address: "4418 Bee Cave Rd, Austin", status: "On hold", priority: "Normal", manager: "Tomás Reyes", schedule: "Sep 21 – paused", progress: 45, contract: "$22,750.00", balance: "$6,825.00", portal: "Shared" },
  { no: "P-1047", name: "Castillo Laundry Addition", address: "919 W 49th St, Austin", status: "Planned", priority: "Low", manager: "Marcus Bell", schedule: "Jan 2027 · TBD", contract: "$47,800.00", balance: "$0.00", portal: "Off" },
  { no: "P-1031", name: "Brennan Whole-Home Paint", address: "Closed Oct 14", status: "Completed", manager: "Tomás Reyes", schedule: "Sep 8 – Oct 9", progress: 100, contract: "$14,300.00", balance: "$0.00", portal: "Revoked" },
];

export type SearchHit = { title: string; sub: string; kind: "Customer" | "Project" | "Estimate" | "Invoice" | "Lead"; href: string; badge: string };

export const searchIndex: SearchHit[] = [
  { title: "Priya & Morgan Shah", sub: "1418 Larkspur Ln · (512) 555-0134", kind: "Customer", href: "/customers/shah", badge: "PS" },
  { title: "Shah Kitchen Remodel", sub: "P-1042 · Active · 58%", kind: "Project", href: "/projects/p-1042", badge: "P" },
  { title: "INV-3108 · Shah Kitchen", sub: "Progress invoice · Paid $15,000", kind: "Invoice", href: "/invoices/inv-3108", badge: "$" },
  { title: "EST-2081 · Adeyemi Basement", sub: "Draft v1 · $30,949.23", kind: "Estimate", href: "/estimates/est-2081", badge: "E" },
  { title: "Amara Diallo", sub: "Guest bath · Contacted", kind: "Lead", href: "/leads/amara-diallo", badge: "AD" },
  { title: "Okafor Primary Bath", sub: "P-1039 · Active · 34%", kind: "Project", href: "/projects/p-1039", badge: "P" },
  { title: "INV-3099 · Delgado Deck", sub: "Overdue 12 days · $6,825.00", kind: "Invoice", href: "/invoices/inv-3099", badge: "$" },
  { title: "Rosa Delgado", sub: "4418 Bee Cave Rd · (512) 555-0156", kind: "Customer", href: "/customers/delgado", badge: "RD" },
  { title: "Sofia Marquez", sub: "Kitchen remodel · Estimate", kind: "Lead", href: "/leads/sofia-marquez", badge: "SM" },
];

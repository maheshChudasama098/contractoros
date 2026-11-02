import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import * as E from "../enums";
import { bool, createdOnly, currency, dateOnly, enumOf, fk, int, money, orgId, str, text, ts, uuidPk } from "./columns";

// M08–M10 projects, tasks, milestones, crews, scheduling.

export const Project = sequelize.define(
  "Project",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectNumber: str(40, false),
    name: str(180, false),
    customerId: fk(),
    propertyId: fk(),
    contractId: fk(true),
    sourceEstimateId: fk(true),
    status: enumOf(E.ProjectStatus, "planned"),
    priority: { ...enumOf(E.Priority, "normal"), type: DataTypes.STRING(16) },
    plannedStartDate: dateOnly(),
    plannedEndDate: dateOnly(),
    actualStartAt: ts(),
    actualEndAt: ts(),
    contractValue: money(false, 0), // base + approved change orders only
    currency: currency(),
    customerPortalEnabled: bool(false),
    createdByUserId: fk(),
  },
  {
    tableName: "projects",
    indexes: [
      { unique: true, fields: ["organization_id", "project_number"] },
      { fields: ["organization_id", "status"] },
      { fields: ["organization_id", "created_at"] },
      { fields: ["customer_id"] },
    ],
  },
);

export const ProjectMember = sequelize.define(
  "ProjectMember",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    membershipId: fk(),
    projectRole: { ...enumOf(E.ProjectRole), type: DataTypes.STRING(40) },
  },
  {
    tableName: "project_members",
    ...createdOnly,
    indexes: [{ unique: true, fields: ["project_id", "membership_id"] }],
  },
);

export const ProjectTask = sequelize.define(
  "ProjectTask",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    parentTaskId: fk(true),
    title: str(180, false),
    description: text(),
    status: enumOf(E.TaskStatus, "todo"),
    priority: { ...enumOf(E.Priority, "normal"), type: DataTypes.STRING(16) },
    assigneeMembershipId: fk(true),
    startAt: ts(),
    dueAt: ts(),
    completedAt: ts(),
    sortOrder: int(0),
    visibleToCustomer: bool(false),
    createdByUserId: fk(),
  },
  {
    tableName: "project_tasks",
    indexes: [
      { fields: ["project_id"] },
      { fields: ["organization_id", "status"] },
      { fields: ["assignee_membership_id"] },
      { fields: ["due_at"] },
    ],
  },
);

export const Milestone = sequelize.define(
  "Milestone",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    title: str(180, false),
    description: text(),
    status: enumOf(E.MilestoneStatus, "upcoming"),
    plannedDate: dateOnly(),
    completedAt: ts(),
    sortOrder: int(0),
    visibleToCustomer: bool(true),
  },
  { tableName: "milestones", indexes: [{ fields: ["project_id"] }] },
);

export const Crew = sequelize.define(
  "Crew",
  {
    id: uuidPk(),
    organizationId: orgId(),
    name: str(120, false),
    isActive: bool(true),
  },
  { tableName: "crews", indexes: [{ fields: ["organization_id"] }] },
);

export const CrewMember = sequelize.define(
  "CrewMember",
  {
    id: uuidPk(),
    crewId: fk(),
    membershipId: fk(),
  },
  { tableName: "crew_members", ...createdOnly, indexes: [{ unique: true, fields: ["crew_id", "membership_id"] }] },
);

export const ScheduleAssignment = sequelize.define(
  "ScheduleAssignment",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    taskId: fk(true),
    membershipId: fk(true),
    crewId: fk(true),
    startAt: ts(false),
    endAt: ts(false),
    status: enumOf(E.ScheduleAssignmentStatus, "scheduled"),
    notes: text(),
  },
  {
    tableName: "schedule_assignments",
    indexes: [{ fields: ["organization_id", "start_at"] }, { fields: ["project_id"] }, { fields: ["membership_id"] }],
    validate: {
      endAfterStart(this: { startAt: Date; endAt: Date }) {
        if (this.endAt <= this.startAt) throw new Error("end_at must be after start_at");
      },
    },
  },
);

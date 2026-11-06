"use client";

import { createContext, useContext } from "react";

/**
 * What the current viewer may change on the project page. Staff get everything;
 * a share-link viewer sees every tab read-only and may only add/update tasks.
 */
export type ProjectAccess = { edit: boolean; tasks: boolean; deleteTasks: boolean; shared: boolean };

export const STAFF_ACCESS: ProjectAccess = { edit: true, tasks: true, deleteTasks: true, shared: false };

export const ProjectAccessContext = createContext<ProjectAccess>(STAFF_ACCESS);
export const useProjectAccess = () => useContext(ProjectAccessContext);

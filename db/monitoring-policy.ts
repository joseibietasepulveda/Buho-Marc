import { getSql } from "./index";
import { organizationId } from "../lib/tenant-context";

export async function automaticMonitoringEnabled() {
  if (process.env.MONITORING_SCHEDULER_ENABLED !== "true") return false;
  const [org] = await getSql()`SELECT automatic_monitoring FROM organizations WHERE id = ${organizationId()}`;
  return org?.automatic_monitoring === true;
}

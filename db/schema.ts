import {
  boolean, date, index, integer, jsonb, pgTable, primaryKey, real, text,
  timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const clientContacts = pgTable("client_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicCode: varchar("public_code", { length: 30 }).notNull(),
  data: jsonb("data").notNull(), version: integer("version").default(1).notNull(),
  isMock: boolean("is_mock").default(true).notNull(), ...timestamps,
}, table => [uniqueIndex("client_contacts_org_code_uq").on(table.organizationId, table.publicCode)]);

// The replaceable source has its own records and never writes the monitored portfolio.
export const sourceRecords = pgTable("source_records", {
  id: uuid("id").defaultRandom().primaryKey(), applicationNumber: varchar("application_number", { length: 30 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 30 }), data: jsonb("data").notNull(),
  version: integer("version").default(1).notNull(), ...timestamps,
}, t => [uniqueIndex("source_application_uq").on(t.applicationNumber), uniqueIndex("source_registration_uq").on(t.registrationNumber)]);

export const registrationApplications = pgTable("registration_applications", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicCode: varchar("public_code", { length: 30 }).notNull(), data: jsonb("data").notNull(), ...timestamps,
}, t => [uniqueIndex("applications_org_code_uq").on(t.organizationId, t.publicCode)]);

export const sourceSnapshots = pgTable("source_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(), entityType: varchar("entity_type", { length: 30 }).notNull(), publicCode: varchar("public_code", { length: 30 }).notNull(),
  sourceId: uuid("source_id").notNull().references(() => sourceRecords.id), data: jsonb("data").notNull(), ...timestamps,
}, t => [uniqueIndex("snapshots_entity_uq").on(t.organizationId, t.entityType, t.entityId)]);

export const sourceSyncRuns = pgTable("source_sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  trigger: varchar("trigger", { length: 20 }).notNull(), scheduledDay: date("scheduled_day"), status: varchar("status", { length: 20 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(), completedAt: timestamp("completed_at", { withTimezone: true }),
  requested: integer("requested").default(0).notNull(), received: integer("received").default(0).notNull(), changed: integer("changed").default(0).notNull(),
  notifications: integer("notifications").default(0).notNull(), baseline: integer("baseline").default(0).notNull(), request: jsonb("request").notNull(),
  error: text("error"), detail: jsonb("detail").default([]).notNull(),
}, t => [index("sync_runs_org_date_idx").on(t.organizationId, t.startedAt)]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(), name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(), status: varchar("status", { length: 30 }).default("active").notNull(), ...timestamps,
}, (table) => [uniqueIndex("organizations_slug_uq").on(table.slug)]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), externalAuthId: varchar("external_auth_id", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(), name: varchar("name", { length: 180 }).notNull(),
  initials: varchar("initials", { length: 4 }).notNull(), ...timestamps,
}, (table) => [uniqueIndex("users_email_uq").on(table.email)]);

export const organizationMembers = pgTable("organization_members", {
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("member").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.organizationId, table.userId] })]);

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(), code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(), brandLimit: integer("brand_limit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("plans_code_uq").on(table.code)]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plans.id), status: varchar("status", { length: 30 }).default("active").notNull(),
  periodStart: date("period_start").notNull(), periodEnd: date("period_end").notNull(), ...timestamps,
}, (table) => [index("subscriptions_org_status_idx").on(table.organizationId, table.status)]);

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  storageKey: varchar("storage_key", { length: 500 }).notNull(), originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(), size: integer("size").notNull(), sha256: varchar("sha256", { length: 64 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id), scanStatus: varchar("scan_status", { length: 30 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("files_org_idx").on(table.organizationId)]);

export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicCode: varchar("public_code", { length: 30 }).notNull(), name: varchar("name", { length: 180 }).notNull(),
  wordMark: varchar("word_mark", { length: 180 }).notNull(), ownerName: varchar("owner_name", { length: 180 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 100 }), jurisdiction: varchar("jurisdiction", { length: 100 }).default("Chile").notNull(),
  registrationDate: date("registration_date"), description: text("description"), status: varchar("status", { length: 30 }).default("Procesando").notNull(),
  monitoringConfig: jsonb("monitoring_config").default({}).notNull(), createdBy: uuid("created_by").references(() => users.id),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }), archivedAt: timestamp("archived_at", { withTimezone: true }), ...timestamps,
}, (table) => [
  uniqueIndex("brands_org_code_uq").on(table.organizationId, table.publicCode), index("brands_org_status_idx").on(table.organizationId, table.status),
  index("brands_org_name_idx").on(table.organizationId, table.name),
]);

export const brandClasses = pgTable("brand_classes", {
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  niceClass: integer("nice_class").notNull(), description: text("description"),
}, (table) => [primaryKey({ columns: [table.brandId, table.niceClass] })]);

export const brandFiles = pgTable("brand_files", {
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").notNull().references(() => files.id, { onDelete: "cascade" }), role: varchar("role", { length: 40 }).default("attachment").notNull(),
}, (table) => [primaryKey({ columns: [table.brandId, table.fileId] })]);

export const monitoringJobs = pgTable("monitoring_jobs", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }), status: varchar("status", { length: 40 }).default("awaiting_engine").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(), engineVersion: varchar("engine_version", { length: 80 }),
  requestedBy: uuid("requested_by").references(() => users.id), startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }), lastCursor: varchar("last_cursor", { length: 255 }), errorCode: varchar("error_code", { length: 100 }), ...timestamps,
}, (table) => [
  uniqueIndex("monitoring_jobs_idempotency_uq").on(table.organizationId, table.idempotencyKey),
  index("monitoring_jobs_status_idx").on(table.organizationId, table.status, table.createdAt),
]);

export const monitoringJobAttempts = pgTable("monitoring_job_attempts", {
  id: uuid("id").defaultRandom().primaryKey(), monitoringJobId: uuid("monitoring_job_id").notNull().references(() => monitoringJobs.id, { onDelete: "cascade" }),
  attemptNo: integer("attempt_no").notNull(), status: varchar("status", { length: 40 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(), completedAt: timestamp("completed_at", { withTimezone: true }), errorPayload: jsonb("error_payload"),
}, (table) => [uniqueIndex("monitoring_job_attempt_uq").on(table.monitoringJobId, table.attemptNo)]);

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicCode: varchar("public_code", { length: 30 }).notNull(), brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  monitoringJobId: uuid("monitoring_job_id").references(() => monitoringJobs.id, { onDelete: "set null" }), source: varchar("source", { length: 100 }).notNull(),
  sourceRecordId: varchar("source_record_id", { length: 180 }).notNull(), officialUrl: text("official_url"), publishedAt: date("published_at").notNull(),
  foundName: varchar("found_name", { length: 180 }).notNull(), applicant: varchar("applicant", { length: 180 }).notNull(),
  applicationNumber: varchar("application_number", { length: 120 }).notNull(), level: varchar("level", { length: 20 }).notNull(),
  totalScore: integer("total_score").notNull(), explanation: text("explanation").notNull(), reviewStatus: varchar("review_status", { length: 50 }).default("Pendiente").notNull(),
  legalDeadline: date("legal_deadline"), ownerId: uuid("owner_id").references(() => users.id), caseId: uuid("case_id"), ...timestamps,
}, (table) => [
  uniqueIndex("matches_source_dedupe_uq").on(table.organizationId, table.brandId, table.source, table.sourceRecordId),
  uniqueIndex("matches_org_code_uq").on(table.organizationId, table.publicCode), index("matches_inbox_idx").on(table.organizationId, table.level, table.totalScore),
  index("matches_review_idx").on(table.organizationId, table.reviewStatus, table.publishedAt),
]);

export const matchScores = pgTable("match_scores", {
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }), scoreType: varchar("score_type", { length: 40 }).notNull(),
  score: real("score").notNull(), engineVersion: varchar("engine_version", { length: 80 }), evidence: jsonb("evidence").default({}).notNull(),
}, (table) => [primaryKey({ columns: [table.matchId, table.scoreType] })]);

export const matchReviews = pgTable("match_reviews", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }), reviewerId: uuid("reviewer_id").references(() => users.id),
  decision: varchar("decision", { length: 50 }).notNull(), reason: text("reason"), comment: text("comment"), comparisonSnapshot: jsonb("comparison_snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("match_reviews_match_idx").on(table.organizationId, table.matchId, table.createdAt)]);

export const cases = pgTable("cases", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicCode: varchar("public_code", { length: 30 }).notNull(), sourceMatchId: uuid("source_match_id").references(() => matches.id, { onDelete: "set null" }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }), clientName: varchar("client_name", { length: 180 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(), description: text("description"), status: varchar("status", { length: 40 }).default("active").notNull(),
  stage: varchar("stage", { length: 50 }).default("Evaluación").notNull(), priority: varchar("priority", { length: 20 }).default("Media").notNull(),
  createdBy: uuid("created_by").references(() => users.id), ownerId: uuid("owner_id").references(() => users.id), strategy: text("strategy"), result: text("result"),
  nextDeadline: date("next_deadline"), closedAt: timestamp("closed_at", { withTimezone: true }), closeReason: text("close_reason"), ...timestamps,
}, (table) => [
  uniqueIndex("cases_org_code_uq").on(table.organizationId, table.publicCode), uniqueIndex("cases_source_match_uq").on(table.organizationId, table.sourceMatchId),
  index("cases_board_idx").on(table.organizationId, table.stage, table.status), index("cases_deadline_idx").on(table.organizationId, table.nextDeadline),
]);

export const caseMembers = pgTable("case_members", {
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.caseId, table.userId] })]);

export const caseTasks = pgTable("case_tasks", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }), title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(), assigneeId: uuid("assignee_id").references(() => users.id),
  dueAt: timestamp("due_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), ...timestamps,
}, (table) => [index("case_tasks_case_status_idx").on(table.organizationId, table.caseId, table.status)]);

export const legalDeadlines = pgTable("legal_deadlines", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }), matchId: uuid("match_id").references(() => matches.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "cascade" }), legalDate: date("legal_date").notNull(), internalDate: date("internal_date"),
  source: varchar("source", { length: 180 }).notNull(), ruleCode: varchar("rule_code", { length: 100 }), verificationStatus: varchar("verification_status", { length: 40 }).default("pending").notNull(),
  status: varchar("status", { length: 30 }).default("upcoming").notNull(), ...timestamps,
}, (table) => [index("legal_deadlines_calendar_idx").on(table.organizationId, table.legalDate, table.status)]);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 40 }).notNull(), entityId: uuid("entity_id").notNull(), authorId: uuid("author_id").references(() => users.id),
  body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), editedAt: timestamp("edited_at", { withTimezone: true }),
}, (table) => [index("comments_entity_idx").on(table.organizationId, table.entityType, table.entityId, table.createdAt)]);

export const notifications = pgTable("notifications", {
  changeDetail: jsonb("change_detail"),
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicCode: varchar("public_code", { length: 30 }).notNull(), userId: uuid("user_id").references(() => users.id), entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: uuid("entity_id").notNull(), type: varchar("type", { length: 80 }).notNull(), title: varchar("title", { length: 220 }).notNull(),
  brandName: varchar("brand_name", { length: 180 }).notNull(), urgency: varchar("urgency", { length: 20 }).default("Media").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }), managedAt: timestamp("managed_at", { withTimezone: true }), ...timestamps,
}, (table) => [uniqueIndex("notifications_org_code_uq").on(table.organizationId, table.publicCode), index("notifications_inbox_idx").on(table.organizationId, table.managedAt, table.createdAt)]);

export const emailDrafts = pgTable("email_drafts", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }), templateVersion: varchar("template_version", { length: 50 }).default("v1").notNull(),
  recipient: varchar("recipient", { length: 255 }), subject: varchar("subject", { length: 500 }).notNull(), body: text("body").notNull(),
  generatedBy: uuid("generated_by").references(() => users.id), generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  copiedAt: timestamp("copied_at", { withTimezone: true }), markedSentAt: timestamp("marked_sent_at", { withTimezone: true }), ...timestamps,
}, (table) => [uniqueIndex("email_drafts_notification_uq").on(table.notificationId)]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id), action: varchar("action", { length: 120 }).notNull(), entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(), beforeData: jsonb("before_data"), afterData: jsonb("after_data"), requestId: varchar("request_id", { length: 120 }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("audit_events_entity_idx").on(table.organizationId, table.entityType, table.entityId, table.occurredAt)]);

export const savedViews = pgTable("saved_views", {
  id: uuid("id").defaultRandom().primaryKey(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), module: varchar("module", { length: 50 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(), filters: jsonb("filters").default({}).notNull(), sort: jsonb("sort").default({}).notNull(),
  isDefault: boolean("is_default").default(false).notNull(), ...timestamps,
}, (table) => [index("saved_views_user_module_idx").on(table.organizationId, table.userId, table.module)]);

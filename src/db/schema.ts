import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const regulationStandards = sqliteTable("regulation_standard", {
  id: integer("standard_id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  securityLevel: text("security_level"),
});

export const complianceRequirements = sqliteTable("compliance_requirement", {
  id: integer("requirement_id").primaryKey({ autoIncrement: true }),
  standardId: integer("standard_id").notNull().references(() => regulationStandards.id, { onDelete: "cascade" }),
  description: text("description"),
  question: text("question"),
});

export const evaluationAttributes = sqliteTable("evaluation_attribute", {
  id: integer("attribute_id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  targetScope: text("target_scope"),
  dataType: text("data_type").default("BooleanToggle"),
  options: text("options"),
  externalId: text("external_id"),
  category: text("category"),
  subcategory: text("subcategory"),
  furtherSpecification: text("further_specification"),
  annotationTemplate: text("annotation_template"),
});

export const complianceRequirementAttributes = sqliteTable("compliance_requirement_attribute", {
  requirementId: integer("requirement_id").notNull().references(() => complianceRequirements.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => evaluationAttributes.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.requirementId, table.attributeId] }),
}));

export const auditAssessments = sqliteTable("audit_assessment", {
  id: integer("assessment_id").primaryKey({ autoIncrement: true }),
  auditType: text("audit_type").notNull(),
  processId: integer("process_id").references(() => businessProcesses.id, { onDelete: "cascade" }),
});
export const businessProcesses = sqliteTable("business_process", {
  id: integer("process_id").primaryKey({ autoIncrement: true }),
  processName: text("process_name").notNull(),
  bpmnDefinition: text("bpmn_definition"),
});

export const processElements = sqliteTable("process_element", {
  id: integer("element_id").primaryKey({ autoIncrement: true }),
  processId: integer("process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  elementType: text("element_type").notNull(),
  bpmnElementId: text("bpmn_element_id"),
  displayName: text("display_name"),
});
export const assessmentValues = sqliteTable("assessment_value", {
  assessmentId: integer("assessment_id").notNull().references(() => auditAssessments.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => evaluationAttributes.id, { onDelete: "cascade" }),
  processElementId: integer("process_element_id").notNull().references(() => processElements.id, { onDelete: "cascade" }),
  recordedValue: text("recorded_value"),
}, (table) => ({
  pk: primaryKey({ columns: [table.assessmentId, table.attributeId, table.processElementId] }),
}));
export const regulationStandardsRelations = relations(regulationStandards, ({ many }) => ({
  complianceRequirements: many(complianceRequirements),
}));

export const complianceRequirementsRelations = relations(complianceRequirements, ({ one, many }) => ({
  regulationStandard: one(regulationStandards, { fields: [complianceRequirements.standardId], references: [regulationStandards.id] }),
  complianceRequirementAttributes: many(complianceRequirementAttributes),
}));

export const evaluationAttributesRelations = relations(evaluationAttributes, ({ many }) => ({
  complianceRequirementAttributes: many(complianceRequirementAttributes),
  assessmentValues: many(assessmentValues),
}));

export const complianceRequirementAttributesRelations = relations(complianceRequirementAttributes, ({ one }) => ({
  complianceRequirement: one(complianceRequirements, { fields: [complianceRequirementAttributes.requirementId], references: [complianceRequirements.id] }),
  evaluationAttribute: one(evaluationAttributes, { fields: [complianceRequirementAttributes.attributeId], references: [evaluationAttributes.id] }),
}));

export const auditAssessmentsRelations = relations(auditAssessments, ({ many }) => ({
  assessmentValues: many(assessmentValues),
}));

export const businessProcessesRelations = relations(businessProcesses, ({ many }) => ({
  processElements: many(processElements),
}));

export const processElementsRelations = relations(processElements, ({ one, many }) => ({
  businessProcess: one(businessProcesses, { fields: [processElements.processId], references: [businessProcesses.id] }),
  assessmentValues: many(assessmentValues),
}));

export const assessmentValuesRelations = relations(assessmentValues, ({ one }) => ({
  auditAssessment: one(auditAssessments, { fields: [assessmentValues.assessmentId], references: [auditAssessments.id] }),
  evaluationAttribute: one(evaluationAttributes, { fields: [assessmentValues.attributeId], references: [evaluationAttributes.id] }),
  processElement: one(processElements, { fields: [assessmentValues.processElementId], references: [processElements.id] }),
}));

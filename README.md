# SRA — Security-Aware BPMN Modeler

A web-based tool for embedding security requirements directly into BPMN 2.0 process diagrams. SRA maps standard-specific
compliance criteria (e.g., OWASP IoT Security Verification Standard — ISVS v1.0) onto BPMN element types, letting
auditors and process designers assess security posture in the same notation they use to model business processes.
Dual-session comparison (As-Is vs. To-Be) surfaces compliance gaps, while automatic visual annotation keeps the diagram
readable.

![SRA Screenshot](screenshot.png)

## Architecture

SRA models the relationship between security standards, process models, and audit evidence through a normalized
relational schema (SQLite / Drizzle ORM):

| Layer      | Table                              | Role |
|------------|------------------------------------|------|
| Standard   | `regulation_standard`              | A security framework (e.g., ISVS v1.0) |
| Requirement | `compliance_requirement`          | A single rule from the standard |
| Attribute  | `evaluation_attribute`            | Measurable property with input type, BPMN scope, and annotation template |
| M:N Link   | `compliance_requirement_attribute` | Associates requirements with the attributes that verify them |
| Process    | `business_process`                | A BPMN 2.0 XML definition |
| Element    | `process_element`                 | A BPMN shape (Task, Message Event, Pool, Lane) within a process |
| Assessment | `audit_assessment`                | A named audit session (As-Is / To-Be) tied to one process |
| Evidence   | `assessment_value`                | A recorded answer for one (assessment, attribute, element) triple |

Each evaluation attribute declares which BPMN element types it applies to (`Task`, `Message Event`, `Pool`, `Lane`).
When an auditor clicks a shape on the BPMN canvas, the sidebar shows only the requirements relevant to that element
type. Answers are stored at the (element, attribute) granularity and rendered as colored Data Object References + Text
Annotations directly on the diagram.

## Features

- **Interactive BPMN 2.0 editor** — Import, view, edit, and export BPMN XML via `bpmn-js`. Changes persist to the
  database.
- **Requirement-to-element mapping** — Each security attribute declares its applicable BPMN types; the UI filters
  requirements contextually.
- **Dual-session assessments** — Create As-Is and To-Be audit assessments for any business process. Switch between them
  to compare current vs. target security states.
- **Gap analysis** — The Comparison panel contrasts As-Is and To-Be values per element and requirement, computing gap
  status (`aligned`, `gap`, `over`, `unassessed`, `exempt`) and severity.
- **Progress matrix** — An interactive cross-tabulation of requirements against BPMN element categories, showing
  applicable cells and completion state.
- **Automatic visual annotation** — Colored Data Object References (grouped by security category) and Text Annotations
  are placed on the BPMN canvas with collision-avoidant layout. Container pools/lanes auto-expand to accommodate
  annotations.
- **External standard references** — Sidebar labels include external IDs (e.g., `ISVS-v1.0-1.1.2`) for traceable
  auditing.
- **Process navigator** — Sidebar element list with per-element progress indicators and keyboard navigation (arrow
  keys).
- **Fine-grained reactivity** — Jotai atomic state prevents global re-renders; only the affected annotation or row
  updates on answer change.

## Dataset

The seed script (`src/db/seed.ts`) populates the database with 11 ISVS v1.0 requirements covering:

- **IoT Ecosystem Requirements** — Application & Ecosystem Design (1.1.1–1.1.3), Device Security (1.2.1), Data
  Protection (1.2.2–1.2.3), Authentication (1.3.1), Authorization (1.3.2), Software Updates (1.4.1–1.4.2)
- **Use Control** — Access Control (2.2.1)

Each requirement carries an external ID, question text, input type (BooleanToggle / Dropdown / TextInput), BPMN element
mapping, and an annotation template. The mapping is defined in `src/lib/mapping.json` and can be extended with
additional standards.

The seed also creates a demo process ("Sensor Data Collection Demo") — a simple 4-step BPMN diagram (Sensor Trigger →
Collect Data → Transmit Securely → Data Received → Completed) with a default To-Be assessment.

## Quick Start

**Prerequisites:** Node.js ≥ 20

```bash
npm install
npm run dev:setup        # generates migrations, seeds DB, starts dev server
```

Open http://localhost:3000/modeler/

### Step-by-step setup

```bash
npm install
npm run db:generate      # generate SQL migration from Drizzle schema
npm run db:migrate       # apply migration to sra.db
npm run db:seed           # populate ISVS requirements and demo process
npm run dev               # start Vite dev server on port 3000
```

### Docker

```bash
docker build -t sra .
docker run -p 8080:80 sra
```

## Project Structure

```
src/
├── components/          # React components
│   ├── BpmnCanvas.tsx        # bpmn-js modeler wrapper with annotation rendering
│   ├── AppHeader.tsx         # Top bar: view toggle, import/export, process/assessment selectors
│   ├── ProcessNavigator.tsx  # Sidebar list of BPMN elements with progress bars
│   ├── RequirementSidebar.tsx # Per-element requirement checklist with input controls
│   ├── ComplianceMatrix.tsx  # Requirement × element-type progress matrix
│   ├── ComparisonView.tsx    # As-Is vs. To-Be gap analysis panel
│   ├── ResetConfirmDialog.tsx
│   └── ui/                   # Reusable UI primitives (select, switch, multi-select)
├── db/
│   ├── schema.ts         # Drizzle ORM table definitions (8 tables with relations)
│   ├── connection.ts     # better-sqlite3 + WAL
│   └── seed.ts           # ISVS requirement + demo process seeding
├── lib/
│   ├── store.ts          # Jotai atoms + Store class (CRUD, init, sync)
│   ├── bpmn-extensions.ts # Security annotation creation, layout, collision avoidance
│   ├── demos.ts          # Embedded demo BPMN XML (Sensor Data Collection)
│   ├── mapping.json      # ISVS requirements mapping (11 entries)
│   ├── types.ts          # Shared TypeScript interfaces
│   ├── constants.ts      # BPMN type definitions, subcategory colors
│   └── utils.ts          # cn() utility (clsx + tailwind-merge)
├── routes/
│   ├── __root.tsx        # Root route with HTML shell
│   ├── index.tsx         # Home page (delegates to HomeView)
│   └── api/              # REST API routes (business processes, assessments, values, standards)
├── styles.css            # Global styles (glassmorphism, animations, BPMN overrides)
├── router.tsx            # TanStack Router factory
└── routeTree.gen.ts      # Auto-generated route tree
```

## Extending with Additional Standards

1. Add entries to `src/lib/mapping.json` following the existing structure (id, requirement, question, category,
   subcategory, external_id, bpmn_mapping, further_specification, bpmn_annotation, bpmn_template).
2. Run `npm run db:seed` to re-populate the database.
3. Update `src/lib/bpmn-extensions.ts` `CATEGORY_COLORS` if new categories need distinct visual styling.
4. Add subcategory colors in `src/lib/constants.ts` `SUBCATEGORY_COLORS` for the matrix view.

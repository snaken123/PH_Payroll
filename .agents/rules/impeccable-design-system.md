# Impeccable Design System & Quality Guidelines — PH Payroll

## 🎨 Design System Philosophy & Color Palette
- **Application Shell**: Dark Navy Sidebar (`#0F172A`), Slate borders (`#1E293B`), Cool muted text (`#94A3B8`).
- **Primary Actions**: Professional Blue (`#2563EB`) with subtle hover transitions and focus rings.
- **Workspace Background**: Crisp Light Slate (`#F8FAFC`) with clean white card containers (`#FFFFFF`) and 1px border lines (`#E2E8F0`).
- **Typography**: Modern Sans-Serif system font stack (`Inter`, `-apple-system`, `sans-serif`) with strict 8px vertical rhythm.

---

## 🧩 Component Architecture Standards

### 1. Page Header (`components/ui/page-header.tsx`)
Every main page must start with a standardized `PageHeader` containing:
- Page title (`h1`, `text-2xl font-bold tracking-tight`)
- Contextual description paragraph (`text-xs text-slate-500`)
- Right-aligned action buttons slot (`actions={<Button />}`)

### 2. Metric KPI Cards (`components/ui/metric-card.tsx`)
Display summary analytics using `MetricCard`:
- Includes subtle icon container (`lucide-react`)
- Right-aligned or left-aligned currency formatting (`₱15,200.00`)
- Subtle subtitle trend description

### 3. Semantic Status Badges (`components/ui/status-badge.tsx`)
Always use standard semantic badge colors:
- **Emerald**: `ACTIVE`, `REGULAR`, `POSTED`, `APPROVED`, `COMPLETED`
- **Amber**: `PROBATIONARY`, `PENDING`, `DRAFT`, `ON_LEAVE`
- **Rose**: `INACTIVE`, `TERMINATED`, `VOID`, `REJECTED`
- **Blue**: `CONTRACTOR`, `INFORMATION`

---

## 🇵🇭 Philippine Statutory Rules & Business Logic Invariants
1. **Statutory Deduction Timing**: Support `SECOND_HALF` (default 100% on 2nd cutoff), `FIRST_HALF` (100% on 1st cutoff), and `SPLIT` (50% on 1st, 50% on 2nd).
2. **Per-Employee Statutory Toggles**: Respect individual employee `isDeductSss`, `isDeductPhilhealth`, and `isDeductPagibig` opt-in/opt-out boolean flags.
3. **Immutability of Posted Runs**: Posted payroll runs and generated statutory reports must remain 100% immutable once posted.

---

## ⚡ Accessibility & UX Quality Benchmarks
- **Base UI Primitives**: Built on `@base-ui/react` dialogs, dropdowns, and select primitives.
- **Micro-Interactions**: Hover scaling, smooth transitions, and feedback toasts via `sonner`.
- **Numeric Formatting**: Monospace font (`font-mono`) for monetary columns, right-aligned numbers in data tables.

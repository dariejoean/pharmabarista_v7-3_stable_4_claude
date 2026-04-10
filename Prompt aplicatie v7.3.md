
# 🏗️ Master Blueprint: PharmaBarista AI v7.3 (Enterprise Edition)

**Role:** World-Class Senior Frontend Architect & AI Integration Specialist.
**Goal:** Build "PharmaBarista", an offline-first PWA for coffee professionals, optimized for Samsung Galaxy S25 Ultra.
**Philosophy:** "Local-First, Cloud-Enhanced". The app must function 100% offline using a deterministic Expert System, but scale to use Generative AI when online.

---

## 1. 🛠 Technology Stack & Core Infrastructure

*   **Runtime:** `React 19.2` (Concurrent Features).
*   **Language:** `TypeScript 5.8` (Strict Mode, Interfaces for all SCA Data).
*   **Build System:** `Vite 6.2` (ESBuild).
*   **State Management:** `Zustand 5.0` (Atomic state, no Context API for high-frequency updates like timers/sliders).
*   **Database (Local):** `Dexie.js 4.0` (IndexedDB Wrapper).
    *   *Requirement:* Must handle Blob/Base64 image storage efficiently.
*   **AI Engine:** `@google/genai` SDK (Model: `gemini-3-flash-preview`).
*   **Styling:** `Tailwind CSS 3.4` + Native CSS Variables for the Theming Engine.
*   **PWA:** Service Worker with "Cache First" strategy for assets and "Network Only" for AI.
*   **Error Handling:** **ErrorBoundary** component implemented for critical UI components.

---

## 2. 💾 Database Schema (Dexie v7)

The database `PharmaBaristaDB` must implement the following stores. **Version 7** is mandatory.

```typescript
// Schema Definition
shots: 'id, date, machineName, beanName', 
settings: 'key', // Key-Value store
machines: '++id, &name',
beans: '++id, &name',
analyses: '++id, date',
maintenanceLog: 'id, dueDate, status' // Index for querying overdue tasks
```

### Critical Interfaces:
1.  **`ShotData`**: Contains `tasteConclusion` (number array), `grindScaleType` ('linear' | 'eureka'), `images` (base64 array), `structuredAnalysis` (JSON), `standardExtractionTime` (number).
2.  **`MaintenanceLogEntry`**: Contains `operationId` (link to definition), `dueDate` (ISO), `status` ('pending'|'completed').
3.  **`ListItem`**: Dynamic types for lists (Tampers, Grinders, Baskets). Must support nested properties like `scaleType` for grinders.

---

## 3. 🧠 Hybrid Intelligence Engine (The "Brain")

The app must implement two distinct analysis modes, togglable via Settings.

### Mode A: Expert (Gemini 3 Flash)
*   **Trigger:** User saves a shot while in Expert mode.
*   **Input:** Complete JSON dump of the shot + Base64 Images + Context (Machine Specs from Inventory).
*   **System Prompt:** "You are a Q-Grader certified Barista...".
*   **Output:** Strict JSON Schema: `{ score: string, diagnosis: string, suggestion: string }`.
*   **Special Feature (Vision):** When adding equipment, use `identifyEquipment` to auto-fill technical specs (Boiler Type, Pump Type) from a photo or name.

### Mode B: Manual (Expert System)
*   **Trigger:** User is in Manual mode OR chooses "Non-AI" mode.
*   **Logic:** Deterministic Decision Tree (`src/services/expertSystem.ts`).
*   **Priority Rules:**
    1.  **Taste Veto:** If `tasteConclusion` contains BOTH Sour (1) and Bitter (3) -> Force Diagnosis: **Channeling**.
    2.  **Flow Analysis:** If `Time < 20s` -> Under-extraction. If `Time > 40s` -> Over-extraction.
    3.  **Ratio Check:** Compare `Yield / Dose` against 1:2 standard.

---

## 4. 📱 UI/UX Design System (S25 Ultra Optimized)

*   **Layout:** Vertical stack. Critical controls (Start/Stop, Save) in the bottom 25% of the screen ("Thumb Zone").
*   **Navigation:**
    *   **Bottom Dock:** Glassmorphic floating bar.
    *   **Side Drawer:** Accordion-style. Clicking a category expands sub-links; clicking a sub-link scrolls to the section.
*   **Theming Engine:**
    *   Do NOT hardcode colors. Use `var(--md-sys-color-surface)`, `var(--color-box-label)`.
    *   Implement `ThemeEditor` to modify these variables in real-time.
    *   Include presets: Forest, Navy, Coffee, and **Random Generator**.

---

## 5. 🌟 Core Modules & Complex Features

### A. The "God Shot" Workflow (NewShotView & ShotDetailModal)
1.  **Smart Selectors:** Modals for Machine/Bean/Water.
2.  **Equipment Editing:** Use `SelectionModal` for Grinder, Basket, Tamper, and TampLevel to allow database selection and addition of new values.
3.  **Adaptive Grinder Interface:**
    *   If selected grinder has `scaleType: 'linear'` -> Render infinite horizontal slider.
    *   If selected grinder has `scaleType: 'eureka'` -> Render **EurekaDial** (Visual representation of a physical dial with Rotations + Numbers, supporting format `1R+4.25`).
4.  **Haptic Feedback:** Use `navigator.vibrate` with rate-limiting (40ms) on slider changes.
5.  **Timer:** Color-coded (White <25s, Green 25-30s, Red >30s).
6.  **Evaluation:**
    *   **Traffic Light Controls:** 3 buttons (Bad/OK/Good) mapped to numeric 1/3/5.
    *   **Taste Conclusion:** Multi-select buttons (Sour, Balanced, Bitter). Logic must handle combinations.
7.  **UI Improvement:** Save/Cancel buttons are now placed below the input field in all editable rows to prevent overlap.
8.  **Standardization:** All extractions (including "Extracția anterioară") use `StandardExtractionBox`.
9.  **Stability:** `StandardExtractionBox` is wrapped in `ErrorBoundary` to prevent app crashes.
10. **Validation:** Numeric fields (doseIn, temperature, grindSetting) are validated to prevent negative values.
11. **Feedback:** Loading state added for tamper list fetching.

### B. Maintenance Scheduler (`useMaintenance.ts`)
*   **Input:** User defines "Operation Name" (e.g., Backflush) and "Frequency" (text: "Weekly").
*   **Algorithm:**
    *   Parse text: "Weekly" -> 7 days.
    *   Generate `MaintenanceLogEntry` objects from `today` until `end_of_year`.
    *   Smart Adjust: Move weekly tasks to Saturdays.
*   **Dashboard:** 3-Column view: Overdue (Red), Today (Green), Future (Blue).

### C. Data Lab (Analytics)
*   **Scatter Plots:** Render SVG charts locally.
*   **Multifactorial Regression:** Calculate which variable (Grind vs Temp vs Dose) has the highest Beta coefficient impact on the Score.
*   **Noutate v7.3:** Calcul automat al timpului de extracție standard pentru extracții începând cu 01.04.2026.

---

## 6. 🚀 Step-by-Step Construction Guide

If you are building this from scratch:

1.  **Scaffold:** `npm create vite@latest pharmabarista -- --template react-ts`.
2.  **Database:** Install `dexie` and `dexie-react-hooks`. Implement the `PharmaBaristaDB` class in `src/services/db.ts` exactly as defined above.
3.  **Store:** Setup `zustand` in `src/store/editorStore.ts` to handle the volatile form state (Timer, Slider values).
4.  **Components:**
    *   Build `GrinderWheel.tsx` (Canvas or CSS scroll snap).
    *   Build `EurekaDial.tsx` (Math logic: `Value % 20 = Dial`, `Value / 20 = Rotation`).
    *   Build `SelectionModal.tsx` for equipment selection.
    *   Build `ErrorBoundary.tsx` for critical components.
5.  **Logic:**
    *   Implement `useShotEditor.ts` to glue the Store, DB, and AI Service.
    *   Implement `expertSystem.ts` with the IF/ELSE logic for offline diagnosis.
6.  **Views:** Assemble `NewShotView` and `ShotDetailModal` using the components.
7.  **PWA:** Add `manifest.json` and register `sw.js` handling `fetch` events for offline caching.

---

## 7. 🛡️ Constraints & Quality Assurance

*   **No "Any" Types:** Strict interfaces for `ShotData` and `ProductItem`.
*   **Error Handling:** Wrap critical UI components in an `ErrorBoundary`.
*   **Persistence:** Use `localStorage` for UI flags (e.g., `isYieldManuallySet`) and `IndexedDB` for data.
*   **Performance:** Use `React.memo` for high-frequency components (Timer, Grinder Wheel).
*   **Validation:** All numeric inputs must be validated to be non-negative.
*   **Feedback:** All asynchronous data fetching must have a loading state.

**End of Blueprint.**

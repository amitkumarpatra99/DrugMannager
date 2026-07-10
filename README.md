# 💊 MediQuick - Offline Pharmacy Pickup & Management Portal

MediQuick is a premium web application built with **React**, **TypeScript**, **Vite**, and **Vanilla CSS** to streamline offline medicine prescriptions, scheduling pickup slots, managing pharmacy inventory catalogs, and reviewing system activity audits.

The application leverages a responsive layout that adapts to mobile, tablet, and desktop viewports, with data synchronized in real time via **LocalStorage**.

---

## 🚀 Portals & Features

### 👤 1. Patient Portal
Allows customers to request prescription packing and schedule counter collection visits.
* **Prescription Upload**: Easy drag-and-drop or file upload (JPEG/PNG) of medical prescriptions under 2MB. Includes a canvas-based **Mock Rx Sheet Generator** for quick testing.
* **Scheduling Window**: Specify a planned Visiting Time Range for offline pick up.
* **Order Stepper Tracking**: Follow order progression through states: `Submitted (Awaiting Review)` → `Preparing` → `Ready for Pickup` → `Completed (Picked Up)` or `Cancelled`.
* **Invoice Receipts**: View compiled bills detailing items, prices, quantities, and GST computations. Prints clean, print-formatted paper invoices.

### ⚕️ 2. Pharmacy Shop Panel
Enables drugstore staff to manage order fulfillment and catalog supplies.
* **Order Queue**: View incoming prescriptions, download attached Rx sheets, and update processing states.
* **Interactive Invoice Compiler**: Compile prescription sheets into priced list items, automatically deduct stock balances, apply a 12% GST rate, and assign a unique Bill Number.
* **Refill Timeline**: View chronological slots of patient visits scheduled for the day.
* **Stock Manager**: Inspect drug inventories, trigger stock refills, update retail prices, and catalog new medical items.

### 🛡️ 3. Root Admin Console
A host control panel for managing overall system integrity.
* **Overview & Analytics**: Visualize total users (Patients, Shops, Admins), sales metrics (total completed revenue), low-stock warnings, and order funnel states.
* **Account Directory (Full CRUD)**: Search and filter user logs, provision new admin/staff/patient profiles, modify plain passwords, update addresses, and delete accounts.
* **Global Orders Monitor**: Log of all order records with lightbox prescription preview, invoice details, forced cancellation, or record purge actions.
* **Global Medicine Catalog**: Inventory refill control, pricing adjustments, drug catalog additions, and catalog deletes.
* **System Activity Audits**: Live audit timeline with level status indicators (`info`, `success`, `warning`, `danger`), text querying, and pagination.
* **Database Console**: Direct LocalStorage JSON text console editor, export file backup downloader, JSON loader parser, simulated events generator, and database wipes.

---

## 🛠️ Technology Stack
* **Vite + React 18** (Fast HMR development environment)
* **TypeScript** (Strong typing safety checks)
* **Lucide React** (Premium, uniform outline vector icons)
* **Vanilla CSS** (Premium modern layout design: glassmorphic blur panels, dark-mode gradients, smooth micro-animations, and full responsive queries)
* **LocalStorage API** (Persistent client-side data state sync)

---

## 🏃 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository and navigate into the folder:
   ```bash
   cd "Drug mannager"
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the hot-reloading development server:
   ```bash
   npm run dev
   ```
4. Access the portal in your browser at `http://localhost:5173/`.

### 🔑 Credentials for Testing
You can log in to different accounts using the database defaults:
* **Administrator Portal**:
  * **Email/Phone**: `admin@shop.com`
  * **Password**: `admin123`
* **Medicine Shop Portal**:
  * Register a new account under the "Medicine Shop" tab, or create one in the Admin Console.
* **Patient Portal**:
  * Register a new account under the "Patient" tab, or create one in the Admin Console.

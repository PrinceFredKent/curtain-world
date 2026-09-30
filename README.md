# Curtain World — Business Management System

> *For your curtain desires.*

A full-featured PWA for managing curtain business operations: customers, orders, payments, receipts, and sales reports.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Customer Records** | Full name + phone (WhatsApp-ready) |
| **Orders** | Items, quantities, prices with employee & cashier |
| **Payment Tracking** | Total, deposit, installments, balance |
| **Transaction History** | Date, amount, customer, employee, cashier |
| **PDF Receipts** | Branded A5 with Curtain World logo & slogan |
| **Sales Reports** | Day / Week / Month / Year with charts |
| **Staff Reports** | By employee and cashier breakdowns |
| **58mm Print** | `@media print` narrow thermal receipt layout |
| **PWA** | Installable, works offline (cached) |

---

## 🚀 Quick Start

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the full contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Copy your **Project URL** and **anon/public API key** from Settings → API

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Deploy to AI Studio / Vercel / Netlify

```bash
npm run build
```

Upload the `dist/` folder to your hosting service.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/        # Sidebar, Layout
│   └── ui/            # Button, Input, Select, Card, Modal, Toast, Badge
├── hooks/             # React Query data hooks
│   ├── useCustomers.js
│   ├── useOrders.js
│   ├── useTransactions.js
│   ├── useStaff.js
│   └── useReports.js
├── lib/
│   ├── supabase.js    # Supabase client
│   ├── pdf.js         # jsPDF receipt & report generation
│   └── utils.js       # Formatters, date ranges, helpers
└── pages/
    ├── Dashboard.jsx   # Stats + chart + recent orders
    ├── Customers.jsx   # CRUD customer records
    ├── Orders.jsx      # Order list + create order
    ├── OrderDetail.jsx # Order detail + payments + receipt download
    ├── Transactions.jsx # Full transaction history
    ├── Reports.jsx     # Sales reports with charts + PDF/print
    └── Staff.jsx       # Staff management

supabase/
└── schema.sql          # Full database schema (run in Supabase SQL Editor)
```

---

## 🖨 58mm Thermal Printing

On the **Reports** page, click **Print**. The browser's print dialog will use the CSS `@media print` rules that format content for a 58mm thermal receipt printer.

Set your printer to:
- Paper size: **58mm** (or "receipt")
- Margins: **Minimum**
- No headers/footers

---

## 🏗 Tech Stack

- **React 19** + **Vite 8** (PWA via `vite-plugin-pwa`)
- **Tailwind CSS v4** (utility-first styling)
- **Supabase** (PostgreSQL + Realtime + REST API)
- **TanStack Query** (data fetching, caching, mutations)
- **React Router v7** (client-side routing)
- **jsPDF + jspdf-autotable** (PDF generation)
- **Recharts** (bar + pie charts)
- **React Hook Form + Zod** (form validation)
- **Lucide React** (icons)

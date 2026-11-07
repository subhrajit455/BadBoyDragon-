# Refactor Plan: Mobile-responsive shop frontend

## Goal
Make frontend mobile-responsive (360px+), optimize rendering, add pagination wiring per spec. Frontend-only except backend pagination for ledger statements. No new libraries; no business logic changes; keep existing response shapes.

## Constraints (summary)
- viewport `width=device-width, initial-scale=1`; base font 15px phone / 14px lg; min text 12px
- inputs ≥16px font & 44px height; buttons min 44px tap; page padding 16px phone / 24px lg
- `min-h-dvh` not 100vh; safe-area insets; off-canvas drawer below lg with aria; mobile card lists; sticky action bar on New* pages; bottom-sheet modals on phones; debounced search 300ms; staleTime 30s; keepPreviousData; memoized rows; lazy routes; dynamic jspdf import; page size 20 (ledger 30); `?page=` in URL
- Already paginated backend: purchases, sales, quotations, customers, suppliers, inventory
- Backend pagination to add (allowed): `getCustomerLedger`, `getSupplierLedger`

## Parts
- Part 1: foundation — index.html viewport, index.css dvh/safe-area/font, Layout drawer + top bar + padding, Sidebar drawer variant, Button/Input/Select sizes
- Part 2: reusable UI — ResponsiveList (mobile card/table), Pagination, SearchableSelect, useDebounce hook, bottom-sheet Modal, Toast phone position, PageHeader text sizing
- Part 3: performance — queryClient staleTime 30s + keepPreviousData, lazy routes + Suspense, memoized rows, dynamic jspdf import
- Part 4: pages — Purchases, Billing, Quotations, Inventory, Products, Ledgers, NewPurchase, NewInvoice, NewQuotation, Dashboard, PurchaseDetail, InvoiceDetail, QuotationDetail, Settings, Login responsive + pagination
- Part 5: searchable pickers + debounce for customer/supplier/product selection
- Part 6: backend ledger pagination — customerService/supplierService getCustomerLedger/getSupplierLedger + controllers pass page/limit

## Status
- Part 1: complete (build passes)
- Part 2: complete (ResponsiveList, Pagination, Modal bottom-sheet, SearchableSelect, Select fix)
- Part 3: complete (React.lazy routes, staleTime 30s, dynamic jspdf, memoized rows)
- Part 4: in progress (Purchases, Billing, Quotations, Inventory, Ledgers, NewPurchase, InvoiceDetail, QuotationDetail, PurchaseDetail complete; NewInvoice, NewQuotation, Settings refinements)
- Part 5: in progress (SearchableSelect added, live search debouncing)
- Part 6: complete (customerService & supplierService ledger pagination)

# Manual Testing Checklist

**Purpose:** Systematic manual testing of all UI elements and user flows  
**Last Updated:** 2026-05-22

---

## Testing Instructions

### For Each Page:
1. ✅ Navigate to the page
2. ✅ Check page loads without errors
3. ✅ Test all buttons (click each one)
4. ✅ Test all forms (submit with valid/invalid data)
5. ✅ Test all links (click each one)
6. ✅ Test all dropdowns (open and select)
7. ✅ Test all modals (open and close)
8. ✅ Test all filters (apply and clear)
9. ✅ Test all search boxes (search and clear)
10. ✅ Check console for errors
11. ✅ Check network tab for failed requests

### Bug Reporting:
- Document any non-working button
- Note the exact steps to reproduce
- Capture screenshot if possible
- Check browser console for errors
- Note the expected vs actual behavior

---

## Finance Module

### Money Desk (`/core/finance/money-desk`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Transaction" button
  - [ ] "View History" button
  - [ ] "Export" button
  - [ ] "Refresh" button
- [ ] **Forms:**
  - [ ] Transaction creation form
  - [ ] Amount validation
  - [ ] Date picker
- [ ] **Filters:**
  - [ ] Date range filter
  - [ ] Transaction type filter
  - [ ] Status filter
- [ ] **Data Display:**
  - [ ] Transaction list loads
  - [ ] Balance displays correctly
  - [ ] Charts render
- [ ] **Issues Found:** _____________________

### General Ledger (`/core/finance/ledger`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Journal Entry" button
  - [ ] "Post" button
  - [ ] "Reverse" button
  - [ ] "Export" button
  - [ ] "Print" button
- [ ] **Forms:**
  - [ ] Journal entry form
  - [ ] Debit/Credit validation
  - [ ] Account selection
- [ ] **Filters:**
  - [ ] Period filter
  - [ ] Account filter
  - [ ] Status filter
- [ ] **Data Display:**
  - [ ] Journal entries load
  - [ ] Balance sheet displays
  - [ ] Trial balance displays
- [ ] **Issues Found:** _____________________

### AR Invoices (`/core/finance/ar-invoices`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Invoice" button
  - [ ] "Issue" button
  - [ ] "Record Payment" button
  - [ ] "Export" button
  - [ ] "Print" button
- [ ] **Forms:**
  - [ ] Invoice creation form
  - [ ] Line item addition
  - [ ] Customer selection
  - [ ] Payment recording form
- [ ] **Filters:**
  - [ ] Status filter
  - [ ] Customer filter
  - [ ] Date range filter
- [ ] **Data Display:**
  - [ ] Invoice list loads
  - [ ] Aging report displays
  - [ ] Payment history displays
- [ ] **Issues Found:** _____________________

### AP Bills (`/core/finance/ap-bills`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Bill" button
  - [ ] "Approve" button
  - [ ] "Record Payment" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Bill creation form
  - [ ] Supplier selection
  - [ ] Payment recording form
- [ ] **Filters:**
  - [ ] Status filter
  - [ ] Supplier filter
  - [ ] Due date filter
- [ ] **Data Display:**
  - [ ] Bill list loads
  - [ ] Aging report displays
  - [ ] Payment schedule displays
- [ ] **Issues Found:** _____________________

### Treasury Map (`/core/finance/treasury-map`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Transfer" button
  - [ ] "Reconcile" button
  - [ ] "Export" button
- [ ] **Data Display:**
  - [ ] Cash position chart
  - [ ] Bank accounts list
  - [ ] Transfer history
- [ ] **Issues Found:** _____________________

### Fixed Assets (`/core/finance/fixed-assets`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Asset" button
  - [ ] "Depreciate" button
  - [ ] "Dispose" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Asset creation form
  - [ ] Depreciation calculation
  - [ ] Disposal form
- [ ] **Data Display:**
  - [ ] Asset list loads
  - [ ] Depreciation schedule
  - [ ] Asset register
- [ ] **Issues Found:** _____________________

---

## Inventory Module

### Stock Controller (`/core/inventory/dashboard`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Run Scan" button
  - [ ] "New Adjustment" button
  - [ ] "Export" button
  - [ ] "Refresh" button
- [ ] **Data Display:**
  - [ ] Stock levels display
  - [ ] Low stock alerts
  - [ ] Expiry warnings
  - [ ] Stock value chart
- [ ] **Issues Found:** _____________________

### Receiving Dock (`/core/inventory/receiving`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Confirm Receipt" button
  - [ ] "Reject" button
  - [ ] "Print Label" button
- [ ] **Forms:**
  - [ ] Receipt confirmation form
  - [ ] PO matching
  - [ ] Quantity entry
- [ ] **Data Display:**
  - [ ] Pending receipts list
  - [ ] Receipt history
- [ ] **Issues Found:** _____________________

### Adjustment Desk (`/core/inventory/adjustments`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Create Adjustment" button
  - [ ] "Approve" button
  - [ ] "Reject" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Adjustment creation form
  - [ ] Reason selection
  - [ ] Quantity entry
- [ ] **Filters:**
  - [ ] Status filter
  - [ ] Location filter
  - [ ] Date range filter
- [ ] **Data Display:**
  - [ ] Adjustment list loads
  - [ ] Approval queue
- [ ] **Issues Found:** _____________________

### Transfer Hub (`/core/inventory/transfers`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Create Transfer" button
  - [ ] "Pick" button
  - [ ] "Ship" button
  - [ ] "Receive" button (⚠️ BUG-1 was here)
  - [ ] "Cancel" button
- [ ] **Forms:**
  - [ ] Transfer creation form
  - [ ] Location selection
  - [ ] Item selection
  - [ ] Quantity entry
- [ ] **Filters:**
  - [ ] Status filter
  - [ ] From location filter
  - [ ] To location filter
- [ ] **Data Display:**
  - [ ] Transfer list loads
  - [ ] Transfer status tracking
- [ ] **Issues Found:** _____________________

### Item Master (`/core/inventory/items`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Item" button
  - [ ] "Edit" button
  - [ ] "Upload Image" button
  - [ ] "Generate SKU" button
  - [ ] "Print Label" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Item creation form
  - [ ] Image upload
  - [ ] Category selection
  - [ ] Pricing entry
- [ ] **Search:**
  - [ ] Item search box
  - [ ] Barcode search
  - [ ] SKU search
- [ ] **Filters:**
  - [ ] Category filter
  - [ ] Status filter
  - [ ] Location filter
- [ ] **Data Display:**
  - [ ] Item list loads
  - [ ] Item images display
  - [ ] Stock levels display
- [ ] **Issues Found:** _____________________

---

## HR Module

### Employee Directory (`/core/hr/employees`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Employee" button
  - [ ] "Edit" button
  - [ ] "Deactivate" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Employee creation form
  - [ ] Personal information
  - [ ] Employment details
  - [ ] Document upload
- [ ] **Search:**
  - [ ] Employee search
  - [ ] Department filter
  - [ ] Status filter
- [ ] **Data Display:**
  - [ ] Employee list loads
  - [ ] Employee cards display
  - [ ] Org chart displays
- [ ] **Issues Found:** _____________________

### Attendance Tracking (`/core/hr/attendance`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Check In" button
  - [ ] "Check Out" button
  - [ ] "Manual Entry" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Manual attendance entry
  - [ ] Time correction form
- [ ] **Filters:**
  - [ ] Date range filter
  - [ ] Employee filter
  - [ ] Department filter
- [ ] **Data Display:**
  - [ ] Attendance records load
  - [ ] Attendance summary
  - [ ] Late arrivals report
- [ ] **Issues Found:** _____________________

### Payroll Management (`/core/hr/payroll`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Payroll Run" button
  - [ ] "Calculate" button
  - [ ] "Approve" button
  - [ ] "Disburse" button
  - [ ] "Export" button
- [ ] **Forms:**
  - [ ] Payroll run creation
  - [ ] Adjustment entry
  - [ ] Bonus entry
- [ ] **Data Display:**
  - [ ] Payroll runs list
  - [ ] Payslip preview
  - [ ] Payroll summary
- [ ] **Issues Found:** _____________________

### Recruitment Pipeline (`/core/hr/recruitment`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Requisition" button
  - [ ] "Post Job" button
  - [ ] "Add Candidate" button
  - [ ] "Schedule Interview" button
  - [ ] "Make Offer" button
- [ ] **Forms:**
  - [ ] Job requisition form
  - [ ] Candidate form
  - [ ] Interview scheduling
- [ ] **Data Display:**
  - [ ] Requisitions list
  - [ ] Candidates pipeline
  - [ ] Interview schedule
- [ ] **Issues Found:** _____________________

### Leave Management (`/core/hr/leave`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Request Leave" button
  - [ ] "Approve" button
  - [ ] "Reject" button
  - [ ] "Cancel" button
- [ ] **Forms:**
  - [ ] Leave request form
  - [ ] Leave type selection
  - [ ] Date range picker
- [ ] **Filters:**
  - [ ] Status filter
  - [ ] Employee filter
  - [ ] Leave type filter
- [ ] **Data Display:**
  - [ ] Leave requests list
  - [ ] Leave balance display
  - [ ] Leave calendar
- [ ] **Issues Found:** _____________________

---

## Retail Module

### Point of Sale (`/retail/pos`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Order" button
  - [ ] "Add Item" button
  - [ ] "Remove Item" button
  - [ ] "Apply Discount" button
  - [ ] "Payment" button
  - [ ] "Print Receipt" button
  - [ ] "Void Order" button
- [ ] **Forms:**
  - [ ] Item search/scan
  - [ ] Quantity entry
  - [ ] Discount entry
  - [ ] Payment entry
- [ ] **Payment Methods:**
  - [ ] Cash payment (online/offline)
  - [ ] Card payment (online only) (⚠️ BUG-11)
  - [ ] QRIS payment (online only) (⚠️ BUG-11)
  - [ ] E-Wallet payment (online only) (⚠️ BUG-11)
  - [ ] Voucher payment (online/offline)
- [ ] **Data Display:**
  - [ ] Order items display
  - [ ] Total calculation
  - [ ] Customer info display
- [ ] **Issues Found:** _____________________

### Shift Control (`/retail/shift-control`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Open Shift" button
  - [ ] "Close Shift" button
  - [ ] "Cash In" button
  - [ ] "Cash Out" button
  - [ ] "Reconcile" button
- [ ] **Forms:**
  - [ ] Shift opening form
  - [ ] Cash declaration
  - [ ] Reconciliation form
- [ ] **Data Display:**
  - [ ] Current shift status
  - [ ] Cash drawer balance
  - [ ] Shift summary
- [ ] **Shift Lifecycle Guard:** (⚠️ BUG-10)
  - [ ] Cannot create orders without open shift
  - [ ] Cannot process payments without open shift
- [ ] **Issues Found:** _____________________

### Retail Dashboard (`/retail/dashboard`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Refresh" button
  - [ ] "Export" button
  - [ ] "View Details" buttons
- [ ] **Data Display:**
  - [ ] Sales summary
  - [ ] Top products
  - [ ] Sales by channel
  - [ ] Sales trends chart
- [ ] **Issues Found:** _____________________

### Product Management (`/retail/products`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Product" button
  - [ ] "Edit" button
  - [ ] "Sync to Channel" button
  - [ ] "Set Price" button
  - [ ] "Upload Image" button
- [ ] **Forms:**
  - [ ] Product creation form
  - [ ] Pricing form
  - [ ] Channel mapping
- [ ] **Data Display:**
  - [ ] Product list loads
  - [ ] Channel sync status
  - [ ] Price history
- [ ] **Issues Found:** _____________________

### Channel Sync (`/retail/channels`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Add Channel" button
  - [ ] "Sync Now" button
  - [ ] "Configure" button
  - [ ] "Disconnect" button
- [ ] **Forms:**
  - [ ] Channel configuration
  - [ ] Sync settings
- [ ] **Data Display:**
  - [ ] Connected channels
  - [ ] Sync status
  - [ ] Sync logs
- [ ] **Issues Found:** _____________________

---

## Tools & Admin

### File Explorer (`/core/tools/explorer`)
- [ ] Page loads successfully (⚠️ BUG-2: JSX mismatch at line 1391)
- [ ] **Buttons:**
  - [ ] "New Folder" button
  - [ ] "Upload File" button
  - [ ] "Download" button
  - [ ] "Delete" button
  - [ ] "Share" button
  - [ ] "Move" button
- [ ] **Forms:**
  - [ ] Folder creation
  - [ ] File upload
  - [ ] File rename
- [ ] **Data Display:**
  - [ ] File tree displays
  - [ ] File preview
  - [ ] File details
- [ ] **Issues Found:** _____________________

### Workflow Management (`/core/tools/workflows`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "New Workflow" button
  - [ ] "Edit" button
  - [ ] "Activate" button
  - [ ] "Deactivate" button
- [ ] **Forms:**
  - [ ] Workflow creation
  - [ ] Step configuration
  - [ ] Approval routing
- [ ] **Data Display:**
  - [ ] Workflow list
  - [ ] Workflow diagram
  - [ ] Execution history
- [ ] **Issues Found:** _____________________

### Audit Trail (`/core/tools/audit`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Export" button
  - [ ] "Verify Chain" button
  - [ ] "Generate Report" button
- [ ] **Filters:**
  - [ ] Date range filter
  - [ ] Module filter
  - [ ] Action filter
  - [ ] User filter
- [ ] **Data Display:**
  - [ ] Audit logs load
  - [ ] Hash chain status
  - [ ] Audit timeline
- [ ] **Issues Found:** _____________________

### System Logs (`/core/tools/logs`)
- [ ] Page loads successfully
- [ ] **Buttons:**
  - [ ] "Refresh" button
  - [ ] "Export" button
  - [ ] "Clear" button
- [ ] **Filters:**
  - [ ] Log level filter
  - [ ] Module filter
  - [ ] Date range filter
- [ ] **Search:**
  - [ ] Log search box
  - [ ] Regex search
- [ ] **Data Display:**
  - [ ] Logs load
  - [ ] Log details
  - [ ] Error stack traces
- [ ] **Issues Found:** _____________________

---

## Common UI Elements

### Navigation
- [ ] **Top Navigation:**
  - [ ] Logo link works
  - [ ] Module switcher works
  - [ ] User menu works
  - [ ] Notifications work
  - [ ] Search works
- [ ] **Sidebar Navigation:**
  - [ ] All menu items clickable
  - [ ] Submenu expansion works
  - [ ] Active state displays
  - [ ] Collapse/expand works
- [ ] **Breadcrumbs:**
  - [ ] Display correctly
  - [ ] Links work
- [ ] **Issues Found:** _____________________

### Modals & Dialogs
- [ ] **Common Modals:**
  - [ ] Open correctly
  - [ ] Close button works
  - [ ] Overlay click closes
  - [ ] ESC key closes
  - [ ] Form submission works
  - [ ] Cancel button works
- [ ] **Issues Found:** _____________________

### Tables & Lists
- [ ] **Data Tables:**
  - [ ] Data loads
  - [ ] Sorting works
  - [ ] Pagination works
  - [ ] Row selection works
  - [ ] Bulk actions work
  - [ ] Export works
- [ ] **Issues Found:** _____________________

### Forms
- [ ] **Form Validation:**
  - [ ] Required fields enforced
  - [ ] Format validation works
  - [ ] Error messages display
  - [ ] Success messages display
- [ ] **Form Controls:**
  - [ ] Text inputs work
  - [ ] Dropdowns work
  - [ ] Date pickers work
  - [ ] File uploads work
  - [ ] Checkboxes work
  - [ ] Radio buttons work
- [ ] **Issues Found:** _____________________

---

## Cross-Browser Testing

### Chrome
- [ ] All pages tested
- [ ] All features work
- [ ] No console errors
- [ ] **Issues Found:** _____________________

### Firefox
- [ ] All pages tested
- [ ] All features work
- [ ] No console errors
- [ ] **Issues Found:** _____________________

### Safari
- [ ] All pages tested
- [ ] All features work
- [ ] No console errors
- [ ] **Issues Found:** _____________________

### Edge
- [ ] All pages tested
- [ ] All features work
- [ ] No console errors
- [ ] **Issues Found:** _____________________

---

## Mobile Responsiveness

### Mobile View (< 768px)
- [ ] Navigation works
- [ ] Forms usable
- [ ] Tables scroll
- [ ] Buttons accessible
- [ ] **Issues Found:** _____________________

### Tablet View (768px - 1024px)
- [ ] Layout adapts
- [ ] All features accessible
- [ ] **Issues Found:** _____________________

---

## Performance Testing

### Page Load Times
- [ ] Dashboard < 2s
- [ ] List pages < 3s
- [ ] Detail pages < 2s
- [ ] **Issues Found:** _____________________

### API Response Times
- [ ] GET requests < 500ms
- [ ] POST requests < 1s
- [ ] Complex queries < 2s
- [ ] **Issues Found:** _____________________

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab order logical
- [ ] All buttons accessible
- [ ] Forms navigable
- [ ] Modals accessible
- [ ] **Issues Found:** _____________________

### Screen Reader
- [ ] Labels present
- [ ] ARIA attributes correct
- [ ] Alt text on images
- [ ] **Issues Found:** _____________________

---

## Summary

### Total Issues Found: _____

### By Severity:
- 🔴 Critical: _____
- 🟠 High: _____
- 🟡 Medium: _____
- 🟢 Low: _____

### By Category:
- Non-working buttons: _____
- Broken links: _____
- Failed API calls: _____
- UI glitches: _____
- Validation errors: _____
- Performance issues: _____
- Accessibility issues: _____

---

**Tester Name:** _____________________  
**Date Completed:** _____________________  
**Time Spent:** _____________________

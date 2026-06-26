# Project Overview: Billing Suite

## Project Description
Billing Suite is a desktop-wrapped full-stack billing, stock management, and accounting solution. It provides local and network-ready business management capabilities, covering authentication, master data records, invoicing, payments, ledger tracking, inventory management, daily tally logs, and VAT reporting. The frontend runs as a desktop application powered by Electron, displaying a React interface, which communicates with a .NET Web API backend backed by a MySQL database.

## Tech Stack
### Backend
- .NET 10 Minimal APIs
- Entity Framework Core
- Pomelo Entity Framework Core Provider for MySQL
- MySQL Database
- JWT Bearer Authentication
- FluentValidation

### Frontend
- React 19
- TypeScript
- Vite
- React Router (HashRouter)
- Lucide React
- jsPDF
- React Toastify

### Desktop Shell
- Electron

## Features and Functions
### User Authentication and Security
- Role-based user authentication (Admin, Operator, User)
- JWT token-based authentication for secure API endpoints

### Master Data Management
- Product management (creation, barcode processing, categorization, stock levels)
- Brand and category master lists
- Distributor records
- Salesman profiles
- Gift tracking

### Transactions and Accounting
- Cash and Credit Invoicing: Creation, receipt generation, printing
- Whatsapp Billing & Receipts: Creation, receipt generation, printing via Whatsapp
- Payments: Tracking customer payment records
- Refunds: Handling invoice refunds
- Purchase Management: Recording purchase entries, purchase payments, and distributor orders
- Stock management and transfers

### Financial and VAT Reports
- Sales and Purchase VAT reports
- Daily tally tracking (cash, card, digital reconciliation)
- Cheque-issued tracking
- Customer ledgers

### System Maintenance
- Data backup operations
- Annual reset / financial year transition

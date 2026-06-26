import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CreateInvoice from "./pages/invoices/CreateInvoice.tsx";
import BankMasterPage from "./pages/masters/BankMasterPage.tsx";
import DistributorsPage from "./pages/distributors/DistributorsPage";
import ProductMaster from "./pages/products/ProductMaster.tsx";
import GiftsMaster from "./pages/products/GiftsMaster.tsx";
import SalesmanMaster from "./pages/Salesman/SalesmanMaster.tsx";
import CustomerMaster from "./pages/customers/CustomerMaster.tsx";
import BrandCategoryMaster from "./pages/products/BrandCategoryMaster.tsx";
import BarcodeMaster from "./pages/products/BarcodeMaster.tsx";
import PurchaseEntry from "./pages/Purchase/PurchaseEntry.tsx";
import OrderMaster from "./pages/Purchase/OrderMaster";
import { AuthProvider } from "./context/AuthContext.tsx";
import UserMaster from "./pages/UserMaster.tsx";
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";
import SalesReport from "./pages/Reports/SalesReport.tsx";
import PaymentsPage from "./pages/payments/PaymentsPage.tsx";
import PurchaseReport from "./pages/Reports/PurchaseReport.tsx";
import StockReport from "./pages/Reports/StockReport.tsx";
import CustomerReport from "./pages/Reports/CustomerReport.tsx";
import PaymentReport from "./pages/Reports/PaymentReport.tsx";
import ProductWiseReport from "./pages/Reports/ProductWiseReport.tsx";
import ProfitByProductReport from "./pages/Reports/ProfitByProductReport.tsx";
import SalesVatReport from "./pages/Reports/SalesVatReport.tsx";
import PurchaseVatReport from "./pages/Reports/PurchaseVatReport.tsx";
import BackupRestore from "./pages/BackupRestore.tsx";
import DailyTallyPage from "./pages/tally/DailyTallyPage.tsx";
import DailyTallyReport from "./pages/Reports/DailyTallyReport.tsx";
import AnnualTallyReport from "./pages/Reports/AnnualTallyReport.tsx";
import ChequeIssuedReport from "./pages/Reports/ChequeIssuedReport.tsx";
import PrinterSettings from "./pages/PrinterSettings";
import VoucherPaymentsPage from "./pages/payments/VoucherPaymentsPage.tsx";
import ChequeIssuedPage from "./pages/payments/ChequeIssuedPage.tsx";
import ShopMaster from "./pages/masters/ShopMaster.tsx";
import StockTransferPage from "./pages/masters/StockTransferPage.tsx";
import StockTransferReport from "./pages/Reports/StockTransferReport.tsx";


export default function App() {
    return (
        <div id="app-root">
            <AuthProvider>
                <ToastContainer position="top-right" autoClose={3000} />
                <Routes>
                    {/* Auth */}
                    <Route path="/" element={<Login />} />
                    <Route path="/home" element={<Home />} />


                    {/* Masters */}
                    <Route path="/products" element={<ProductMaster />} />
                    <Route path="/gifts-master" element={<GiftsMaster />} />
                    <Route path="/barcode-master" element={<BarcodeMaster />} />
                    <Route path="/distributors" element={<DistributorsPage />} />
                    <Route path="/salesman" element={<SalesmanMaster />} />
                    <Route path="/customer-master" element={<CustomerMaster />} />
                    <Route path="/brand-category" element={<BrandCategoryMaster />} />
                    <Route path="/banks" element={<BankMasterPage />} />
                    <Route path="/users" element={<UserMaster />} />
                    <Route path="/backup-restore" element={<BackupRestore />} />
                    <Route path="/daily-tally" element={<DailyTallyPage />} />
                    <Route path="/shop-master" element={<ShopMaster />} />
                    <Route path="/stock-transfer" element={<StockTransferPage />} />
                    
                    {/* Settings Routes */}
                    <Route path="/settings/printer" element={<PrinterSettings />} />

                    {/* Transactions */}
                    <Route path="/billing" element={<CreateInvoice />} />
                    <Route path="/purchase" element={<PurchaseEntry />} />
                    <Route path="/orders" element={<OrderMaster />} />
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/cheque-issued" element={<ChequeIssuedPage />} />
                    <Route path="/voucher-payments" element={<VoucherPaymentsPage />} />

                    {/* Reports */}
                    <Route path="/reports/sales" element={<SalesReport />} />
                    <Route path="/reports/sales-vat" element={<SalesVatReport />} />
                    <Route path="/reports/purchase" element={<PurchaseReport />} />
                    <Route path="/reports/purchase-vat" element={<PurchaseVatReport />} />
                    <Route path="/reports/stock" element={<StockReport />} />
                    <Route path="/reports/customers" element={<CustomerReport />} />
                    <Route path="/reports/payments" element={<PaymentReport />} />
                    <Route path="/reports/products" element={<ProductWiseReport />} />
                    <Route path="/reports/profit-by-product" element={<ProfitByProductReport />} />
                    <Route path="/reports/daily-tally" element={<DailyTallyReport />} />
                    <Route path="/reports/annual-tally" element={<AnnualTallyReport />} />
                    <Route path="/reports/cheque-issued" element={<ChequeIssuedReport />} />
                    <Route path="/reports/stock-transfer" element={<StockTransferReport />} />
                </Routes>
            </AuthProvider>
        </div>
    );
}

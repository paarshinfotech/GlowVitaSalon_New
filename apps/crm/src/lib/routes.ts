
import {
  FaTachometerAlt, FaUsers, FaCalendarAlt, FaCut,
  FaClipboardList, FaBoxOpen, FaFileAlt, FaBullhorn,
  FaBell, FaGift, FaHeart, FaUserFriends, FaUserCircle, FaStethoscope, FaDollarSign, FaClock, FaTruck, FaShoppingCart, FaShippingFast, FaMoneyCheckAlt, FaStore, FaReceipt, FaQuestionCircle, FaStar, FaPlusSquare, FaWarehouse, FaWallet
} from "react-icons/fa";
import { IconType } from "react-icons";

export interface NavItem {
  title: string;
  href: string;
  Icon: IconType;
  permission: string;
}

export const vendorNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", Icon: FaTachometerAlt, permission: 'dashboard_view' },
  { title: "Calendar", href: "/calendar", Icon: FaCalendarAlt, permission: 'calendar_view' },
  { title: "Appointments", href: "/appointments", Icon: FaClipboardList, permission: 'appointments_view' },
  { title: "Staff", href: "/staff", Icon: FaUsers, permission: 'staff_view' },
  { title: "Clients", href: "/clients", Icon: FaUsers, permission: 'clients_view' },
  // { title: "Customer Summary", href: "/customers/summary", Icon: FaUsers, permission: 'clients_view' },
  { title: "Services", href: "/services", Icon: FaCut, permission: 'services_view' },
  { title: "Add-ons", href: "/add-ons", Icon: FaPlusSquare, permission: 'services_view' },
  { title: "Wedding Packages", href: "/wedding-packages", Icon: FaHeart, permission: 'services_view' },
  { title: "Products", href: "/products", Icon: FaBoxOpen, permission: 'products_view' },
  { title: "Product Questions", href: "/product-questions", Icon: FaQuestionCircle, permission: 'product_questions_view' },
  { title: "Reviews", href: "/reviews", Icon: FaStar, permission: 'reviews_view' },
  { title: "Marketplace", href: "/marketplace", Icon: FaStore, permission: 'marketplace_view' },
  { title: "Sales", href: "/sales", Icon: FaDollarSign, permission: 'sales_view' },
  { title: "Invoice Management", href: "/invoice-management", Icon: FaReceipt, permission: 'invoice_management_view' },
  { title: "Orders", href: "/orders", Icon: FaShoppingCart, permission: 'orders_view' },
  { title: "Shipping Configurations", href: "/shipping", Icon: FaShippingFast, permission: 'shipping_view' },
  { title: "Settlements", href: "/settlements", Icon: FaMoneyCheckAlt, permission: 'settlements_view' },
  { title: "Expenses", href: "/expenses", Icon: FaReceipt, permission: 'expenses_view' },
  { title: "Offers & Coupons", href: "/offers-coupons", Icon: FaGift, permission: 'offers_view' },
  { title: "Referrals", href: "/referrals", Icon: FaUserFriends, permission: 'referrals_view' },
  { title: "Marketing", href: "/marketing", Icon: FaBullhorn, permission: 'marketing_view' },
  { title: "Notifications", href: "/push-notifications", Icon: FaBell, permission: 'notifications_view' },
  { title: "Reports", href: "/reports", Icon: FaFileAlt, permission: 'reports_view' },
  { title: "Wallet", href: "/profile/wallet", Icon: FaWallet, permission: 'all' },
];

export const doctorNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", Icon: FaTachometerAlt, permission: 'dashboard_view' },
  { title: "Calendar", href: "/calendar", Icon: FaCalendarAlt, permission: 'calendar_view' },
  { title: "Appointments", href: "/appointments", Icon: FaClipboardList, permission: 'appointments_view' },
  { title: "Patients", href: "/patients", Icon: FaUserCircle, permission: 'patients_view' },
  { title: "Services", href: "/services", Icon: FaCut, permission: 'services_view' },
  { title: "Consultations", href: "/consultations", Icon: FaStethoscope, permission: 'consultations_view' },
  { title: "Timetable", href: "/timetable", Icon: FaClock, permission: 'timetable_view' },
  { title: "Staff", href: "/doctor-staff", Icon: FaUsers, permission: 'doctor_staff_view' },
  { title: "Earnings", href: "/earnings", Icon: FaDollarSign, permission: 'earnings_view' },
  { title: "Expenses", href: "/expenses", Icon: FaReceipt, permission: 'expenses_view' },
  { title: "Reviews", href: "/doctor-reviews", Icon: FaStar, permission: 'reviews_view' },
  { title: "Offers & Coupons", href: "/offers-coupons", Icon: FaGift, permission: 'doctor_offers_view' },
  { title: "Notifications", href: "/push-notifications", Icon: FaBell, permission: 'notifications_view' },
  { title: "Referrals", href: "/doctor-referrals", Icon: FaUserFriends, permission: 'doctor_referrals_view' },
  { title: "Reports", href: "/doctor-reports", Icon: FaFileAlt, permission: 'doctor_reports_view' },
  { title: "Wallet", href: "/profile/wallet", Icon: FaWallet, permission: 'all' },
];

export const supplierNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", Icon: FaTachometerAlt, permission: 'dashboard_view' },
  { title: "Inventory", href: "/inventory", Icon: FaWarehouse, permission: 'products_view' },
  { title: "Products", href: "/supplier-products", Icon: FaBoxOpen, permission: 'products_view' },
  { title: "Clients", href: "/clients", Icon: FaUsers, permission: 'clients_view' },
  { title: "Product Questions", href: "/product-questions", Icon: FaQuestionCircle, permission: 'product_questions_view' },
  { title: "Reviews", href: "/reviews", Icon: FaStar, permission: 'reviews_view' },
  { title: "Orders", href: "/orders", Icon: FaShoppingCart, permission: 'orders_view' },
  { title: "Sales", href: "/sales", Icon: FaDollarSign, permission: 'sales_view' },
  { title: "Invoice Management", href: "/invoice-management", Icon: FaReceipt, permission: 'invoice_management_view' },
  { title: "Expenses", href: "/expenses", Icon: FaReceipt, permission: 'expenses_view' },
  { title: "Offers & Coupons", href: "/offers-coupons", Icon: FaGift, permission: 'offers_view' },
  { title: "Referrals", href: "/referrals", Icon: FaUserFriends, permission: 'referrals_view' },
  { title: "Marketing", href: "/marketing", Icon: FaBullhorn, permission: 'marketing_view' },
  { title: "Notifications", href: "/push-notifications", Icon: FaBell, permission: 'notifications_view' },
  { title: "Reports", href: "/reports", Icon: FaFileAlt, permission: 'reports_view' },
  { title: "Wallet", href: "/profile/wallet", Icon: FaWallet, permission: 'all' },
];

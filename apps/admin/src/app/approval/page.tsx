"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import { Pagination } from "@repo/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@repo/ui/dialog';
import {
  CheckCircle,
  Eye,
  XCircle,
  Users,
  ThumbsUp,
  Hourglass,
  ThumbsDown,
  Trash2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Hash,
  Briefcase,
  Info,
  User,
  Tags,
  Map as MapIcon,
  CreditCard,
  FileText,
  FileCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Search } from 'lucide-react';
import { Input } from "@repo/ui/input";
import { Badge } from '@repo/ui/badge';
import { Skeleton } from "@repo/ui/skeleton";
import { cn } from "@repo/ui/cn";
import { Textarea } from "@repo/ui/textarea";
import {
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
  useUpdateSupplierStatusMutation,
  useDeleteSupplierMutation,
  useGetDoctorsQuery,
  useUpdateDoctorMutation,
  useUpdateDoctorStatusMutation,
  useDeleteDoctorMutation,
  useGetVendorsQuery,
  useUpdateVendorStatusMutation,
  useGetVendorServicesForApprovalQuery,
  useUpdateServiceStatusMutation,
  useGetVendorProductApprovalsQuery,
  useUpdateVendorProductStatusMutation,
  useGetSupplierProductApprovalsQuery,
  useUpdateSupplierProductStatusMutation,
  useGetPendingWeddingPackagesQuery,
  useUpdateWeddingPackageStatusMutation
} from '@repo/store/api';
import { toast } from 'sonner';
import DocumentStatusManager from '../../components/DocumentStatusManager';
import RegionSelector from '../../components/RegionSelector';
import { useAppSelector } from "@repo/store/hooks";
import { selectSelectedRegion } from "@repo/store/slices/adminAuthSlice";

// Vendor type
type Vendor = {
  _id: string;
  businessName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  pincode: string;
  state: string;
  address: string;
  description: string;
  category: string;
  subCategories: string[];
  website?: string | null;
  profileImage?: string | null;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Disabled';
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: {
    plan: string | null;
    status: string;
    expires: string | null;
  };
  documents?: {
    [key: string]: any;
    aadharCard?: string | null;
    udhayamCert?: string | null;
    shopAct?: string | null;
    panCard?: string | null;
    otherDocs?: string[] | null;
    aadharCardStatus?: string;
    udhayamCertStatus?: string;
    shopActStatus?: string;
    panCardStatus?: string;
    aadharCardRejectionReason?: string | null;
    udhayamCertRejectionReason?: string | null;
    shopActRejectionReason?: string | null;
    panCardRejectionReason?: string | null;
    aadharCardAdminRejectionReason?: string | null;
    udhayamCertAdminRejectionReason?: string | null;
    shopActAdminRejectionReason?: string | null;
    panCardAdminRejectionReason?: string | null;
  };
};

type Service = {
  _id: string;
  name: string;
  vendorName: string;
  category: string;
  price: number;
  discountedPrice?: number;
  status: "pending" | "approved" | "disapproved";
  description: string;
  serviceImage?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
};

type WeddingPackage = {
  _id: string;
  name: string;
  vendorName: string;
  totalPrice: number;
  discountedPrice: number | null;
  status: "pending" | "approved" | "disapproved";
  description: string;
  services?: { serviceName: string; quantity: number }[];
  inclusions?: string; // Some data might use this
  createdAt?: string;
  updatedAt?: string;
};

type Product = {
  _id: string;
  productImages?: string[]; // Actual model field
  productImage?: string; // Fallback
  productName: string;
  price: number;
  salePrice: number;
  category: { _id: string; name: string };
  description: string;
  stock: number;
  status: 'pending' | 'approved' | 'disapproved';
  supplierName?: string;
  vendorName?: string;
  vendorId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Doctor = {
  _id: string;
  id: string;
  profileImage: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  clinicName: string;
  specialization: string;
  experience: string;
  qualification: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  rejectionReason?: string | null;
  registrationNumber: string;
  state: string;
  city: string;
  pincode: string;
  physicalConsultationStartTime: string;
  physicalConsultationEndTime: string;
  assistantName: string;
  assistantContact: string;
  doctorAvailability: string;
  documents?: {
    aadharCard?: string;
    panCard?: string;
    medicalRegCert?: string;
    medicalDegreeCert?: string;
    clinicDetails?: string;
    otherDocs?: string[];
    aadharCardStatus?: string;
    panCardStatus?: string;
    medicalRegCertStatus?: string;
    medicalDegreeCertStatus?: string;
    clinicDetailsStatus?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

interface Supplier {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  shopName: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  address: string;
  businessRegistrationNo?: string;
  supplierType: string;
  status: string;
  rejectionReason?: string | null;
  documents?: {
    [key: string]: any;
    aadharCard?: string | null;
    udhayamCert?: string | null;
    shopAct?: string | null;
    panCard?: string | null;
    otherDocs?: string[] | null;
    aadharCardStatus?: string;
    udhayamCertStatus?: string;
    shopActStatus?: string;
    panCardStatus?: string;
    aadharCardRejectionReason?: string | null;
    udhayamCertRejectionReason?: string | null;
    shopActRejectionReason?: string | null;
    panCardRejectionReason?: string | null;
    aadharCardAdminRejectionReason?: string | null;
    udhayamCertAdminRejectionReason?: string | null;
    shopActAdminRejectionReason?: string | null;
    panCardAdminRejectionReason?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

type ActionType = 'approve' | 'reject' | 'delete';
type ItemType = 'vendor' | 'service' | 'vendor-product' | 'supplier-product' | 'doctor' | 'supplier' | 'wedding-package';

export default function VendorApprovalPage() {
  const selectedRegion = useAppSelector(selectSelectedRegion);

  // RTK Query hooks
  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch: refetchVendors } = useGetVendorsQuery(selectedRegion);
  const [updateVendorStatus] = useUpdateVendorStatusMutation();
  const { data: suppliersData = [], isLoading: suppliersLoading, refetch: refetchSuppliers } = useGetSuppliersQuery(selectedRegion);
  const [updateSupplierStatus] = useUpdateSupplierStatusMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const { data: doctorsData = [], isLoading: doctorsLoading, refetch: refetchDoctors } = useGetDoctorsQuery(selectedRegion);
  const { data: pendingServices = [], isLoading: servicesLoading, refetch: refetchPendingServices } = useGetVendorServicesForApprovalQuery({ status: 'pending', regionId: selectedRegion });
  const [updateServiceStatus] = useUpdateServiceStatusMutation();

  // Vendor product approvals
  const { data: vendorProductData, isLoading: vendorProductsLoading, error: vendorProductsError, refetch: refetchVendorProducts } = useGetVendorProductApprovalsQuery(selectedRegion);
  const [updateVendorProductStatus] = useUpdateVendorProductStatusMutation();

  // Supplier product approvals
  const { data: supplierProductData, isLoading: supplierProductsLoading, error: supplierProductsError, refetch: refetchSupplierProducts } = useGetSupplierProductApprovalsQuery(selectedRegion);
  const [updateSupplierProductStatus] = useUpdateSupplierProductStatusMutation();

  // Wedding package approvals
  const { data: pendingWeddingPackages = [], isLoading: weddingPackagesLoading, refetch: refetchPendingWeddingPackages } = useGetPendingWeddingPackagesQuery(selectedRegion);
  const [updateWeddingPackageStatus] = useUpdateWeddingPackageStatusMutation();

  const [updateDoctor] = useUpdateDoctorMutation();
  const [updateDoctorStatus] = useUpdateDoctorStatusMutation();
  const [deleteDoctor] = useDeleteDoctorMutation();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<Vendor | Service | Product | Doctor | Supplier | WeddingPackage | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const pendingSuppliers = suppliersData.filter((s: Supplier) => {
    // Include suppliers with Pending status
    if (s.status === 'Pending') return true;

    // Also include suppliers who have documents with pending status
    const documents = s.documents;
    if (documents) {
      const docTypes = ['aadharCard', 'udyogAadhar', 'udhayamCert', 'shopLicense', 'panCard'] as const;
      const hasPendingDocuments = docTypes.some(docType => {
        const status = documents[`${docType}Status`] || 'pending';
        // Check if document exists (not null or undefined) and not empty string
        const isUploaded = documents[docType] && documents[docType] !== '';
        const isPending = status === 'pending' && isUploaded;

        // Debug logging
        if (isPending) {
        }

        return isPending;
      });

      return hasPendingDocuments;
    }

    return false;
  });
  const pendingDoctors = doctorsData.filter((d: Doctor) => d.status === 'Pending');
  const pendingVendors = vendors.filter((v: Vendor) => {
    // Include vendors with Pending or Disabled status
    if (v.status === 'Pending' || v.status === 'Disabled') return true;

    // Also include vendors who have documents with pending status
    const documents = v.documents;
    if (documents) {
      const docTypes = ['aadharCard', 'udyogAadhar', 'udhayamCert', 'shopLicense', 'panCard'] as const;
      const hasPendingDocuments = docTypes.some(docType => {
        const status = documents[`${docType}Status`] || 'pending';
        // Check if document exists (not null or undefined) and not empty string
        const isUploaded = documents[docType] && documents[docType] !== '';
        const isPending = status === 'pending' && isUploaded;

        // Debug logging
        if (isPending) {
        }

        return isPending;
      });

      return hasPendingDocuments;
    }

    return false;
  });

  const getUnapprovedDocuments = (entity: Vendor | Supplier | Doctor, entityType: 'doctor' | 'vendor' | 'supplier') => {
    const documents = entity.documents || {};

    if (entityType === 'doctor') {
      const doctorMandatoryDocs = [
        { key: 'aadharCard', label: 'Aadhar Card' },
        { key: 'panCard', label: 'PAN Card' },
        { key: 'medicalRegCert', label: 'Medical Registration Certificate' },
        { key: 'medicalDegreeCert', label: 'Medical Degree Certificate' },
        { key: 'clinicDetails', label: 'Clinic Details' },
      ];
      return doctorMandatoryDocs
        .filter((doc) => {
          const isUploaded = !!((documents as any)[doc.key] && (documents as any)[doc.key] !== '');
          const status = (documents as any)[`${doc.key}Status`];
          // All 5 mandatory doctor docs must be uploaded AND approved
          return !isUploaded || status !== 'approved';
        })
        .map((doc) => doc.label);
    }

    // Vendor / Supplier logic (unchanged)
    const mandatoryDocs = [
      { key: "aadharCard", label: "Aadhar Card" },
      { key: "panCard", label: "PAN Card" },
      { key: "udhayamCert", label: "Udhayam Certificate" },
      { key: "shopAct", label: "Shop Act" },
    ];

    return mandatoryDocs
      .filter((doc) => {
        const isUploaded = !!((documents as any)[doc.key] && (documents as any)[doc.key] !== "");
        const status = (documents as any)[`${doc.key}Status`];

        // Aadhaar and PAN are strictly mandatory
        if (doc.key === "aadharCard" || doc.key === "panCard") {
          return !isUploaded || status !== "approved";
        }

        // Other docs: if uploaded, must be approved
        return isUploaded && status !== "approved";
      })
      .map((doc) => doc.label);
  };

  // Pagination logic
  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const filteredPendingServices = useMemo(() => {
    return pendingServices
      .filter((service: any) =>
        vendorFilter === "all" || service.vendorId === vendorFilter || service.vendorName === vendorFilter
      )
      .slice()
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [pendingServices, vendorFilter]);

  const sortedPendingVendors = [...pendingVendors].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const sortedPendingDoctors = [...pendingDoctors].sort((a: Doctor, b: Doctor) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const sortedPendingSuppliers = [...pendingSuppliers].sort((a: Supplier, b: Supplier) => {
    const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
    const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const sortedPendingWeddingPackages = [...pendingWeddingPackages].sort((a: any, b: any) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    // If dates are valid and different, use them
    if (dateA !== dateB) return dateB - dateA;

    // Fallback to _id sorting (MongoDB _ids are generally chronological)
    return (b._id || "").localeCompare(a._id || "");
  });

  const currentVendors = sortedPendingVendors.slice(firstItemIndex, lastItemIndex);
  const currentServices = filteredPendingServices.slice(firstItemIndex, lastItemIndex);
  const currentWeddingPackages = sortedPendingWeddingPackages.slice(firstItemIndex, lastItemIndex);
  const currentDoctors = sortedPendingDoctors.slice(firstItemIndex, lastItemIndex);
  const currentSuppliers = sortedPendingSuppliers.slice(firstItemIndex, lastItemIndex);

  const totalVendorPages = Math.ceil(sortedPendingVendors.length / itemsPerPage);
  const totalServicePages = Math.ceil(filteredPendingServices.length / itemsPerPage);
  const totalWeddingPackagePages = Math.ceil(sortedPendingWeddingPackages.length / itemsPerPage);
  const totalDoctorPages = Math.ceil(sortedPendingDoctors.length / itemsPerPage);
  const totalSupplierPages = Math.ceil(sortedPendingSuppliers.length / itemsPerPage);

  const handleActionClick = (item: Vendor | Service | Product | Doctor | Supplier | WeddingPackage, type: ItemType, action: ActionType) => {
    setSelectedItem(item);
    setItemType(type);
    setActionType(action);
    setRejectionReason('');
    setIsActionModalOpen(true);
  };

  const handleViewClick = (item: Vendor | Service | Product | Doctor | Supplier | WeddingPackage, type: ItemType) => {
    setSelectedItem(item);
    setItemType(type);
    setIsViewModalOpen(true);
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsImageViewerOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedItem || !actionType || !itemType) return;

    const itemName = (selectedItem as any).businessName || (selectedItem as any).serviceName || (selectedItem as any).productName || (selectedItem as any).name || (selectedItem as any).shopName || `${(selectedItem as any).firstName} ${(selectedItem as any).lastName}`;

    try {
      if (
        actionType === 'reject' &&
        !rejectionReason.trim()
      ) {
        toast.error('Please provide a reason for rejection.');
        return;
      }

      if (itemType === 'vendor') {
        const vendor = selectedItem as Vendor;
        if (actionType === 'delete') {
          toast.error('Delete functionality for vendors is not yet implemented.');
        } else {
          const newStatus = actionType === 'approve' ? 'Approved' : 'Rejected';
          await updateVendorStatus({
            id: vendor._id,
            status: newStatus,
            rejectionReason: actionType === 'reject' ? rejectionReason : undefined
          }).unwrap();
          toast.success(`Vendor "${itemName}" status updated to ${newStatus}.`);
        }
      } else if (itemType === 'supplier') {
        const supplier = selectedItem as Supplier;
        if (actionType === 'delete') {
          await deleteSupplier(supplier._id).unwrap();
          toast.success(`Supplier "${itemName}" deleted.`);
        } else {
          const newStatus = actionType === 'approve' ? 'Approved' : 'Rejected';
          await updateSupplierStatus({
            id: supplier._id,
            status: newStatus,
            rejectionReason: actionType === 'reject' ? rejectionReason : undefined
          }).unwrap();
          toast.success(`Supplier "${itemName}" status updated to ${newStatus}.`);
        }
      } else if (itemType === 'doctor') {
        const doctor = selectedItem as Doctor;
        if (actionType === 'delete') {
          await deleteDoctor(doctor._id).unwrap();
          toast.success(`Doctor "${itemName}" deleted.`);
        } else {
          const newStatus = actionType === 'approve' ? 'Approved' : 'Rejected';
          await updateDoctorStatus({
            id: doctor._id,
            status: newStatus,
            rejectionReason: actionType === 'reject' ? rejectionReason : undefined
          }).unwrap();
          toast.success(`Doctor "${itemName}" status updated to ${newStatus}.`);
        }
      } else if (itemType === 'service') {
        const service = selectedItem as Service;
        const newStatus = actionType === 'approve' ? 'approved' : 'disapproved';

        await updateServiceStatus({
          serviceId: service._id,
          status: newStatus,
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined
        }).unwrap();
        toast.success(`Service "${service.name}" has been ${newStatus}.`);
        refetchPendingServices();
      } else if (itemType === 'vendor-product') {
        const product = selectedItem as Product;
        if (actionType === 'delete') {
          toast.error('Delete functionality for products is not yet implemented.');
        } else {
          const newStatus = actionType === 'approve' ? 'approved' : 'disapproved';

          await updateVendorProductStatus({
            productId: product._id,
            status: newStatus,
            rejectionReason: actionType === 'reject' ? rejectionReason : undefined
          }).unwrap();
          toast.success(`Product "${product.productName}" has been ${newStatus}.`);
          refetchVendorProducts();
        }
      } else if (itemType === 'supplier-product') {
        const product = selectedItem as Product;
        if (actionType === 'delete') {
          toast.error('Delete functionality for products is not yet implemented.');
        } else {
          const newStatus = actionType === 'approve' ? 'approved' : 'disapproved';

          await updateSupplierProductStatus({
            productId: product._id,
            status: newStatus,
            rejectionReason: actionType === 'reject' ? rejectionReason : undefined
          }).unwrap();
          toast.success(`Product "${product.productName}" has been ${newStatus}.`);
          refetchSupplierProducts();
        }
      } else if (itemType === 'wedding-package') {
        const pkg = selectedItem as WeddingPackage;
        const newStatus = actionType === 'approve' ? 'approved' : 'disapproved';

        await updateWeddingPackageStatus({
          packageId: pkg._id,
          status: newStatus,
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined
        }).unwrap();
        toast.success(`Wedding Package "${pkg.name}" has been ${newStatus}.`);
        refetchPendingWeddingPackages();
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Action failed. Please try again.';
      toast.error(errorMessage);
      console.error('Action failed:', error);
    }

    setIsActionModalOpen(false);
    setSelectedItem(null);
    setActionType(null);
    setItemType(null);
    setRejectionReason('');
  };

  const getModalContent = () => {
    if (!actionType || !selectedItem || !itemType) return { title: '', description: '', buttonText: '' };

    const itemName = (selectedItem as any).businessName ||
      (selectedItem as any).serviceName ||
      (selectedItem as any).productName ||
      (selectedItem as any).name ||
      (selectedItem as any).shopName ||
      `${(selectedItem as any).firstName || ''} ${(selectedItem as any).lastName || ''}`.trim() ||
      'N/A';

    switch (actionType) {
      case 'approve':
        return {
          title: `Approve ${itemType}?`,
          description: `Are you sure you want to approve the ${itemType} "${itemName}"?`,
          buttonText: 'Approve',
        };
      case 'reject':
        return {
          title: `Reject ${itemType}?`,
          description: `Are you sure you want to reject the ${itemType} "${itemName}"? This action cannot be undone.`,
          buttonText: 'Reject',
        };
      case 'delete':
        return {
          title: `Delete ${itemType}?`,
          description: `Are you sure you want to permanently delete the ${itemType} "${itemName}"? This action is irreversible.`,
          buttonText: 'Delete',
        };
      default:
        return { title: '', description: '', buttonText: '' };
    }
  };

  const { title, description, buttonText } = getModalContent();

  // Safely extract products arrays
  const vendorProducts = Array.isArray(vendorProductData?.products) ? vendorProductData.products : [];
  const supplierProducts = Array.isArray(supplierProductData?.products) ? supplierProductData.products : [];


  const pendingVendorProducts = vendorProducts
    .filter((p: Product) => p.status === 'pending')
    .slice()
    .sort((a: Product, b: Product) => {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    });
  const pendingSupplierProducts = supplierProducts
    .filter((p: Product) => p.status === 'pending')
    .slice()
    .sort((a: Product, b: Product) => {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const totalVendorProductPages = Math.ceil(pendingVendorProducts.length / itemsPerPage);
  const totalSupplierProductPages = Math.ceil(pendingSupplierProducts.length / itemsPerPage);

  // Check if any of the main data is still loading
  const isMainDataLoading = vendorsLoading || suppliersLoading || doctorsLoading || servicesLoading || weddingPackagesLoading || vendorProductsLoading || supplierProductsLoading;

  if (isMainDataLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(8)].map((_, i) => (
                      <TableHead key={i}>
                        <Skeleton className="h-5 w-full" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4">
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-headline">Approvals</h1>
          {selectedRegion && selectedRegion !== 'all' && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              Region Filtered
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground mr-1">Filter by Region:</span>
          {/* @ts-ignore */}
          <RegionSelector />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVendors.length}</div>
            <p className="text-xs text-muted-foreground">Vendors to review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Services</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingServices.length}</div>
            <p className="text-xs text-muted-foreground">Services to approve</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Doctors</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingDoctors.length}</div>
            <p className="text-xs text-muted-foreground">Doctors awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Suppliers</CardTitle>
            <ThumbsDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pendingSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">Suppliers awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Packages</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWeddingPackages.length}</div>
            <p className="text-xs text-muted-foreground">Packages to approve</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendor-approvals">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="vendor-approvals" className="text-xs md:text-sm">Vendors</TabsTrigger>
          <TabsTrigger value="service-approvals" className="text-xs md:text-sm">Services</TabsTrigger>
          <TabsTrigger value="wedding-package-approvals" className="text-xs md:text-sm">Wedding Packages</TabsTrigger>
          <TabsTrigger value="vendor-product-approvals" className="text-xs md:text-sm">Vendor Products</TabsTrigger>
          <TabsTrigger value="supplier-product-approvals" className="text-xs md:text-sm">Supplier Products</TabsTrigger>
          <TabsTrigger value="doctor-approvals" className="text-xs md:text-sm">Doctors</TabsTrigger>
          <TabsTrigger value="supplier-approvals" className="text-xs md:text-sm">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="vendor-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Vendor Approvals</CardTitle>
              <CardDescription>Vendors waiting for verification to join the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Vendor ID</TableHead>
                      <TableHead className="text-xs">Business Name</TableHead>
                      <TableHead className="text-xs">Owner</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">City</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(8)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : vendorsError ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">Error loading vendors.</TableCell>
                      </TableRow>
                    ) : currentVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No pending vendor approvals.</TableCell>
                      </TableRow>
                    ) : (
                      currentVendors.map((vendor: Vendor) => (
                        <TableRow key={vendor._id}>
                          <TableCell className="font-mono text-xs max-w-[80px] truncate">{vendor._id.substring(0, 8)}...</TableCell>
                          <TableCell className="font-medium text-xs max-w-[120px] truncate">{vendor.businessName || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{`${vendor.firstName} ${vendor.lastName}` || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{vendor.phone || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{vendor.city || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={vendor.status === 'Pending' || vendor.status === 'Disabled' ? 'default' : 'secondary'}
                              className={vendor.status === 'Pending' || vendor.status === 'Disabled' ? 'bg-yellow-100 text-yellow-800 text-xs' : 'text-xs'}
                            >
                              {vendor.status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(vendor, 'vendor')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleActionClick(vendor, 'vendor', 'approve')}
                              disabled={getUnapprovedDocuments(vendor, 'vendor').length > 0}
                              title={getUnapprovedDocuments(vendor, 'vendor').length > 0
                                ? `Approve documents first: ${getUnapprovedDocuments(vendor, 'vendor').join(', ')}`
                                : 'Approve Vendor'}
                            >
                              <CheckCircle className={cn("h-4 w-4", getUnapprovedDocuments(vendor, 'vendor').length > 0 ? "text-gray-400" : "text-green-600")} />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(vendor, 'vendor', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalVendorPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={pendingVendors.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="service-approvals">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle>Pending Service Approvals</CardTitle>
                <CardDescription>Services submitted by vendors waiting for approval.</CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={vendorFilter} onValueChange={(val) => { setVendorFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-lg border-border hover:border-primary">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border border-border/40 max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map((vendor: Vendor) => (
                      <SelectItem key={vendor._id} value={vendor._id}>
                        {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Service Name</TableHead>
                      <TableHead className="text-xs">Vendor</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(5)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : currentServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No pending service approvals.</TableCell>
                      </TableRow>
                    ) : (
                      currentServices.map((service: Service) => (
                        <TableRow key={service._id}>
                          <TableCell className="max-w-[150px]">
                            <div className="flex items-center gap-2">
                              <Image
                                src={service.serviceImage || service.image || 'https://placehold.co/400x400?text=No+Image'}
                                alt={service.name || 'Service'}
                                width={32}
                                height={32}
                                className="rounded-md cursor-pointer object-cover aspect-square bg-muted"
                                onClick={() => handleImageClick(service.serviceImage || service.image || 'https://placehold.co/400x400?text=No+Image')}
                              />
                              <span className="font-normal text-xs truncate max-w-[120px]">{service.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{service.vendorName || 'N/A'}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col">
                              {typeof service.discountedPrice === 'number' && service.discountedPrice < service.price ? (
                                <>
                                  <span className="font-medium text-primary">₹{service.discountedPrice.toFixed(2)}</span>
                                  <span className="line-through text-muted-foreground">₹{service.price.toFixed(2)}</span>
                                </>
                              ) : (
                                <span>{typeof service.price === 'number' ? `₹${service.price.toFixed(2)}` : 'N/A'}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                              {service.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(service, 'service')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(service, 'service', 'approve')}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(service, 'service', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalServicePages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredPendingServices.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="wedding-package-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Wedding Package Approvals</CardTitle>
              <CardDescription>Wedding packages submitted by vendors waiting for approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Package Name</TableHead>
                      <TableHead className="text-xs">Vendor</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weddingPackagesLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(5)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : currentWeddingPackages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No pending wedding package approvals.</TableCell>
                      </TableRow>
                    ) : (
                      currentWeddingPackages.map((pkg: WeddingPackage) => (
                        <TableRow key={pkg._id}>
                          <TableCell className="max-w-[150px]">
                            <div className="flex items-center gap-2">
                              <Image
                                src="/images/wedding%20package%20placeholder.png"
                                alt={pkg.name || 'Wedding Package'}
                                width={32}
                                height={32}
                                className="rounded-md cursor-pointer object-cover aspect-square bg-muted"
                                onClick={() => handleImageClick("/images/wedding%20package%20placeholder.png")}
                              />
                              <span className="font-normal text-xs truncate max-w-[120px]">{pkg.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{pkg.vendorName || 'N/A'}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col">
                              {pkg.discountedPrice && pkg.discountedPrice < pkg.totalPrice ? (
                                <>
                                  <span className="font-medium text-primary">₹{pkg.discountedPrice.toFixed(2)}</span>
                                  <span className="line-through text-muted-foreground">₹{pkg.totalPrice.toFixed(2)}</span>
                                </>
                              ) : (
                                <span>₹{typeof pkg.totalPrice === 'number' ? pkg.totalPrice.toFixed(2) : 'N/A'}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                              {pkg.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(pkg, 'wedding-package')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(pkg, 'wedding-package', 'approve')}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(pkg, 'wedding-package', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalWeddingPackagePages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={pendingWeddingPackages.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="vendor-product-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Product Approvals</CardTitle>
              <CardDescription>Products submitted by vendors waiting for approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Vendor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorProductsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : vendorProductsError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Error loading vendor products.</TableCell>
                      </TableRow>
                    ) : !Array.isArray(pendingVendorProducts) || pendingVendorProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No pending vendor product approvals.</TableCell>
                      </TableRow>
                    ) : (
                      pendingVendorProducts.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell className="max-w-[150px]">
                            <div className="flex items-center gap-2">
                              <Image
                                src={product.productImages?.[0] || product.productImage || 'https://placehold.co/400x400?text=No+Image'}
                                alt={product.productName || 'Product'}
                                width={32}
                                height={32}
                                className="rounded-md cursor-pointer object-cover aspect-square bg-muted"
                                onClick={() => handleImageClick(product.productImages?.[0] || product.productImage || 'https://placehold.co/400x400?text=No+Image')}
                              />
                              <span className="font-normal text-xs truncate">{product.productName || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>
                              {typeof product.salePrice === 'number' && product.salePrice >= 0 && product.salePrice < product.price && (
                                <div className="text-green-600 font-normal">
                                  ₹{product.salePrice.toFixed(2)}
                                </div>
                              )}
                              <span className={typeof product.salePrice === 'number' && product.salePrice >= 0 && product.salePrice < product.price ? "line-through text-muted-foreground" : ""}>
                                {typeof product.price === 'number' ? `₹${product.price.toFixed(2)}` : 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{product.category?.name || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">
                            {(product.vendorId as any)?.businessName ||
                              ((product.vendorId as any)?.firstName
                                ? `${(product.vendorId as any).firstName} ${(product.vendorId as any).lastName || ''}`.trim()
                                : product.vendorName || 'N/A')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                              {product.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(product, 'vendor-product')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(product, 'vendor-product', 'approve')}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(product, 'vendor-product', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalVendorProductPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={pendingVendorProducts.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="supplier-product-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Product Approvals</CardTitle>
              <CardDescription>Products submitted by suppliers waiting for approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Supplier</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierProductsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : supplierProductsError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Error loading supplier products.</TableCell>
                      </TableRow>
                    ) : !Array.isArray(pendingSupplierProducts) || pendingSupplierProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No pending supplier product approvals.</TableCell>
                      </TableRow>
                    ) : (
                      pendingSupplierProducts.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell className="max-w-[150px]">
                            <div className="flex items-center gap-2">
                              <Image
                                src={product.productImages?.[0] || product.productImage || 'https://placehold.co/400x400?text=No+Image'}
                                alt={product.productName || 'Product'}
                                width={32}
                                height={32}
                                className="rounded-md cursor-pointer object-cover aspect-square bg-muted"
                                onClick={() => handleImageClick(product.productImages?.[0] || product.productImage || 'https://placehold.co/400x400?text=No+Image')}
                              />
                              <span className="font-normal text-xs truncate">{product.productName || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>
                              {typeof product.salePrice === 'number' && product.salePrice >= 0 && product.salePrice < product.price && (
                                <div className="text-green-600 font-normal">
                                  ₹{product.salePrice.toFixed(2)}
                                </div>
                              )}
                              <span className={typeof product.salePrice === 'number' && product.salePrice >= 0 && product.salePrice < product.price ? "line-through text-muted-foreground" : ""}>
                                {typeof product.price === 'number' ? `₹${product.price.toFixed(2)}` : 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{product.category?.name || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{product.supplierName || product.vendorId || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                              {product.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(product, 'supplier-product')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(product, 'supplier-product', 'approve')}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(product, 'supplier-product', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalSupplierProductPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={pendingSupplierProducts.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="doctor-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Approvals</CardTitle>
              <CardDescription>Doctors waiting for verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Doctor</TableHead>
                      <TableHead className="text-xs">Clinic</TableHead>
                      <TableHead className="text-xs">Specialization</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(4)].map((_, j) => (
                            <TableCell key={j}>
                              {j === 0 ? (
                                <div className="flex items-center gap-3">
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <Skeleton className="h-5 w-32" />
                                </div>
                              ) : (
                                <Skeleton className="h-5 w-full" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : currentDoctors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No pending doctor approvals.</TableCell>
                      </TableRow>
                    ) : (
                      currentDoctors.map((doctor: Doctor) => (
                        <TableRow key={doctor._id}>
                          <TableCell className="max-w-[150px]">
                            <div className="flex items-center gap-2">
                              <Image
                                src={doctor.profileImage || "https://placehold.co/400x400.png"}
                                alt={doctor.name || 'Doctor'}
                                width={30}
                                height={30}
                                className="rounded-full cursor-pointer object-cover"
                                onClick={() => handleImageClick(doctor.profileImage || "https://placehold.co/400x400.png")}
                              />
                              <span className="font-medium text-xs truncate">{doctor.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{doctor.clinicName || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{doctor.specialization || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(doctor, 'doctor')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleActionClick(doctor, 'doctor', 'approve')}
                              disabled={getUnapprovedDocuments(doctor, 'doctor').length > 0}
                              title={getUnapprovedDocuments(doctor, 'doctor').length > 0
                                ? `Approve documents first: ${getUnapprovedDocuments(doctor, 'doctor').join(', ')}`
                                : 'Approve Doctor'}
                            >
                              <CheckCircle className={cn("h-4 w-4", getUnapprovedDocuments(doctor, 'doctor').length > 0 ? "text-gray-400" : "text-green-600")} />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(doctor, 'doctor', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalDoctorPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={pendingDoctors.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="supplier-approvals">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Approvals</CardTitle>
              <CardDescription>Suppliers waiting for verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Supplier</TableHead>
                      <TableHead className="text-xs">Reg. No</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliersLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : currentSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No pending supplier approvals.</TableCell>
                      </TableRow>
                    ) : (
                      currentSuppliers.map((supplier: Supplier) => (
                        <TableRow key={supplier._id}>
                          <TableCell className="font-medium text-xs max-w-[120px] truncate">{(supplier.firstName + " " + supplier.lastName) || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{supplier.businessRegistrationNo || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{supplier.supplierType || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={supplier.status === 'Pending' ? 'default' : 'secondary'} className={supplier.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 text-xs' : 'text-xs'}>
                              {supplier.status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(supplier, 'supplier')}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleActionClick(supplier, 'supplier', 'approve')}
                              disabled={getUnapprovedDocuments(supplier, 'supplier').length > 0}
                              title={getUnapprovedDocuments(supplier, 'supplier').length > 0
                                ? `Approve documents first: ${getUnapprovedDocuments(supplier, 'supplier').join(', ')}`
                                : 'Approve Supplier'}
                            >
                              <CheckCircle className={cn("h-4 w-4", getUnapprovedDocuments(supplier, 'supplier').length > 0 ? "text-gray-400" : "text-green-600")} />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(supplier, 'supplier', 'reject')}>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                currentPage={currentPage}
                totalPages={totalSupplierPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={pendingSuppliers.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {actionType === 'reject' && (
            <div className="py-4 space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Ex: Documents are unclear, required details are missing, or pricing needs correction."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'delete' || actionType === 'reject' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={actionType === 'reject' && !rejectionReason.trim()}
            >
              {buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle>View Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            {(() => {
              // Derive the current data from the vendors/suppliers/doctors lists to ensure
              // the modal updates reactively when data is refetched.
              let currentDetails = selectedItem;
              if (itemType === 'vendor' && selectedItem) {
                currentDetails = vendors.find((v: Vendor) => v._id === (selectedItem as Vendor)._id) || selectedItem;
              } else if (itemType === 'doctor' && selectedItem) {
                currentDetails = doctorsData.find((d: Doctor) => d._id === (selectedItem as Doctor)._id) || selectedItem;
              } else if (itemType === 'supplier' && selectedItem) {
                currentDetails = suppliersData.find((s: Supplier) => s._id === (selectedItem as Supplier)._id) || selectedItem;
              }

              if (!currentDetails) return null;

              const detailType = itemType;
              const detailData = currentDetails;

              if (itemType === 'vendor') {
                const vendor = currentDetails as Vendor;
                return (
                  <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b">
                      <div className="relative group">
                        <Image
                          src={vendor.profileImage || 'https://placehold.co/100x100.png'}
                          alt={vendor.businessName || 'Vendor'}
                          width={120}
                          height={120}
                          className="rounded-2xl object-cover shadow-md border-2 border-primary/10 transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                          onClick={() => handleImageClick(vendor.profileImage || 'https://placehold.co/100x100.png')}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none">
                          <Eye className="text-white h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                          <h3 className="text-2xl font-bold font-headline">{vendor.businessName || 'N/A'}</h3>
                          <Badge variant={vendor.status === 'Approved' ? 'secondary' : 'default'} className={cn(
                            "px-3 py-0.5 text-xs font-semibold",
                            vendor.status === 'Approved' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {vendor.status || 'Pending'}
                          </Badge>
                          {vendor.subscription?.status === 'Active' && (
                            <Badge className="bg-blue-100 text-blue-700 px-3 py-0.5 text-xs font-semibold">
                              <CreditCard className="mr-1.5 h-3 w-3" />
                              Active Subscription
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-foreground">{`${vendor.firstName} ${vendor.lastName}`}</span>
                          <span className="text-xs px-2 py-0.5 bg-secondary rounded-full font-mono">{vendor._id.substring(0, 10)}...</span>
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                            <Briefcase className="mr-1.5 h-3 w-3" />
                            {vendor.category || 'N/A'}
                          </Badge>
                          {vendor.subCategories?.map(sub => (
                            <Badge key={sub} variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] uppercase tracking-wider px-2 py-0">
                              {sub.replace(/-/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Info Group */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <Info className="h-4 w-4" /> Contact Details
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Email Address</span>
                              <span className="text-sm font-medium truncate max-w-[200px]">{vendor.email || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                              <Phone className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Phone Number</span>
                              <span className="text-sm font-medium">{vendor.phone || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                              <Globe className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Website</span>
                              <span className="text-sm font-medium">
                                {vendor.website ? (
                                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {vendor.website}
                                  </a>
                                ) : 'Not provided'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Location Group */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <MapIcon className="h-4 w-4" /> Location
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm mt-0.5">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Full Address</span>
                              <span className="text-sm font-medium leading-relaxed">{vendor.address || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">City / Pincode</span>
                              <span className="text-sm font-medium">{`${vendor.city || 'N/A'} - ${vendor.pincode || 'N/A'}`}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">State</span>
                              <span className="text-sm font-medium">{vendor.state || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description & Metadata Group */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div className="md:col-span-2 space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <FileText className="h-4 w-4" /> Business Description
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4">
                          <p className="text-sm text-muted-foreground italic leading-relaxed">
                            "{vendor.description || 'No description provided by the vendor.'}"
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <Calendar className="h-4 w-4" /> Timeline
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Registration Date</span>
                            <span className="text-xs font-medium">{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Management Section */}
                    <div className="pt-6 border-t mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold flex items-center gap-2">
                          <Tags className="h-5 w-5 text-primary" />
                          Business Documents
                        </h4>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                          Verification Required
                        </Badge>
                      </div>
                      {/* Document Management Section */}
                      {detailType === 'vendor' || detailType === 'supplier' ? (
                        <div className="bg-secondary/10 rounded-2xl p-4 mb-6">
                          <DocumentStatusManager
                            entity={detailData}
                            role={detailType === 'vendor' ? 'vendor' : 'supplier'}
                            onUpdate={() => {
                              if (detailType === 'vendor') refetchVendors();
                              else if (detailType === 'supplier') refetchSuppliers();
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (itemType === 'doctor') {
                const doctor = currentDetails as Doctor;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b">
                      <div className="relative group">
                        <Image
                          src={doctor.profileImage || "https://placehold.co/100x100.png"}
                          alt={doctor.name || 'Doctor'}
                          width={120}
                          height={120}
                          className="rounded-2xl object-cover shadow-md border-2 border-primary/10 transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                          onClick={() => handleImageClick(doctor.profileImage || "https://placehold.co/100x100.png")}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none">
                          <Eye className="text-white h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                          <h3 className="text-2xl font-bold font-headline">{doctor.name || 'N/A'}</h3>
                          <Badge variant={doctor.status === 'Approved' ? 'secondary' : 'default'} className={cn(
                            "px-3 py-0.5 text-xs font-semibold",
                            doctor.status === 'Approved' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {doctor.status || 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-medium text-foreground">{doctor.clinicName || 'N/A'}</span>
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] tracking-wider font-bold">
                            {doctor.specialization || 'N/A'}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-600 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-wider">
                            {doctor.experience || 'N/A'} Experience
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <Info className="h-4 w-4" /> Professional Info
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Reg. Number</span>
                              <span className="text-sm font-medium">{doctor.registrationNumber || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Qualification</span>
                              <span className="text-sm font-medium">{doctor.qualification || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Email</span>
                              <span className="text-sm font-medium">{doctor.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <MapPin className="h-4 w-4" /> Practice Location
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-primary/60 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Location</span>
                              <span className="text-sm font-medium leading-relaxed">{[doctor.city, doctor.state, doctor.pincode].filter(Boolean).join(', ') || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Phone</span>
                              <span className="text-sm font-medium">{doctor.phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Management Section */}
                    {doctor.documents ? (
                      <div className="pt-6 border-t mt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                            <FileCheck className="h-4 w-4" /> Document Verification
                          </h4>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase transition-colors">
                            {getUnapprovedDocuments(doctor).length > 0
                              ? `${getUnapprovedDocuments(doctor).length} Pending Docs`
                              : "All Documents Approved"}
                          </Badge>
                        </div>
                        <DocumentStatusManager
                          entity={doctor}
                          role="doctor"
                          onUpdate={() => {
                            refetchDoctors();
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (itemType === 'supplier') {
                const supplier = currentDetails as Supplier;
                return (
                  <div className="space-y-6">
                    <div className="pb-6 border-b">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold font-headline">{supplier.shopName || 'N/A'}</h3>
                          <p className="text-muted-foreground flex items-center gap-2 mt-1 lowercase">
                            <Hash className="h-3 w-3" /> {supplier._id}
                          </p>
                        </div>
                        <Badge className={cn(
                          "px-4 py-1.5 text-sm font-bold uppercase tracking-widest",
                          supplier.status === 'Approved' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {supplier.status || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <User className="h-4 w-4" /> Owner Information
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                              {supplier.firstName?.charAt(0)}{supplier.lastName?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Full Name</span>
                              <span className="text-sm font-medium">{[supplier.firstName, supplier.lastName].filter(Boolean).join(' ') || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Email</span>
                              <span className="text-sm font-medium text-xs lowercase">{supplier.email ? supplier.email.toLowerCase() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wide">
                          <Briefcase className="h-4 w-4" /> Business Info
                        </h4>
                        <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <Tags className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Supplier Type</span>
                              <Badge variant="outline" className="w-fit text-[10px] font-bold mt-0.5">{supplier.supplierType || 'N/A'}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-primary/60" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Reg. Number</span>
                              <span className="text-sm font-medium">{supplier.businessRegistrationNo || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Management Section */}
                    <div className="pt-6 border-t mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold flex items-center gap-2">
                          <Tags className="h-5 w-5 text-primary" />
                          Business Documents
                        </h4>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                          Verification Required
                        </Badge>
                      </div>
                      {/* Document Management Section */}
                      {detailType === 'vendor' || detailType === 'supplier' ? (
                        <div className="bg-secondary/10 rounded-2xl p-4 mb-6">
                          <DocumentStatusManager
                            entity={detailData}
                            role={detailType === 'vendor' ? 'vendor' : 'supplier'}
                            onUpdate={() => {
                              if (detailType === 'vendor') refetchVendors();
                              else if (detailType === 'supplier') refetchSuppliers();
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (itemType === 'service') {
                const service = currentDetails as Service;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-8 pb-6 border-b">
                      <div className="mx-auto md:mx-0">
                        <Card className="overflow-hidden border-none shadow-xl w-fit bg-muted cursor-pointer" onClick={() => handleImageClick(service.serviceImage || service.image || 'https://placehold.co/400x400?text=No+Image')}>
                          <Image
                            src={service.serviceImage || service.image || 'https://placehold.co/400x400?text=No+Image'}
                            alt={service.name || 'Service'}
                            width={150}
                            height={150}
                            className="object-cover rounded-2xl aspect-square"
                          />
                        </Card>
                      </div>
                      <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold font-headline text-primary">{service.name || 'N/A'}</h3>
                          <p className="text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                            By <span className="text-foreground font-bold underline decoration-primary/20">{service.vendorName || 'Independent Vendor'}</span>
                          </p>
                        </div>
                        <div className="flex items-end gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 w-fit">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Base Price</p>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">₹{typeof service.price === 'number' ? service.price.toFixed(2) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-secondary/20 rounded-2xl p-6 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Info className="h-4 w-4" /> Description
                      </h4>
                      <p className="text-muted-foreground leading-relaxed border-l-4 border-primary/20 pl-4 py-1">
                        {service.description || 'No description provided for this service.'}
                      </p>
                    </div>
                  </div>
                );
              }

              if (itemType === 'wedding-package') {
                const pkg = currentDetails as WeddingPackage;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-8 pb-6 border-b">
                      <div className="mx-auto md:mx-0">
                        <Card className="overflow-hidden border-none shadow-xl w-fit bg-muted cursor-pointer" onClick={() => handleImageClick("/images/wedding%20package%20placeholder.png")}>
                          <Image
                            src="/images/wedding%20package%20placeholder.png"
                            alt={pkg.name || 'Wedding Package'}
                            width={150}
                            height={150}
                            className="object-cover rounded-2xl aspect-square"
                          />
                        </Card>
                      </div>
                      <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold font-headline text-primary">{pkg.name || 'N/A'}</h3>
                          <p className="text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                            Created by <span className="text-foreground font-bold underline decoration-primary/20">{pkg.vendorName || 'N/A'}</span>
                          </p>
                        </div>

                        <div className="flex items-end gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 w-fit">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pricing</p>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">₹{pkg.discountedPrice?.toFixed(2)}</span>
                              {pkg.discountedPrice && pkg.discountedPrice < pkg.totalPrice && (
                                <span className="text-sm text-muted-foreground line-through opacity-50 font-normal">₹{pkg.totalPrice?.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                          {pkg.discountedPrice && pkg.discountedPrice < pkg.totalPrice && (
                            <div className="pl-4 border-l border-primary/20 space-y-1 flex items-center h-full">
                              <Badge className="bg-green-100 text-green-700 border-none font-black text-[10px] uppercase tracking-tighter">
                                Package Discount Applied
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                        <FileText className="h-4 w-4" /> Package Inclusions & Details
                      </h4>
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {pkg.description && pkg.description !== 'hi' && (
                          <div className="mb-4 pb-4 border-b border-primary/10 text-foreground font-medium">
                            {pkg.description}
                          </div>
                        )}
                        {pkg.services && pkg.services.length > 0 ? (
                          <div className="space-y-2">
                            {pkg.services.map((svc, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-background/50 p-2 rounded-lg border border-primary/5">
                                <span className="font-medium text-foreground">{svc.serviceName}</span>
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold">Qty: {svc.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="opacity-60">No specific inclusions listed for this package.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (itemType === 'vendor-product' || itemType === 'supplier-product') {
                const product = currentDetails as Product;
                return (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8 pb-6 border-b">
                      <div className="mx-auto md:mx-0">
                        <Card className="overflow-hidden border-none shadow-xl w-fit bg-muted">
                          <Image
                            src={product.productImages?.[0] || product.productImage || 'https://placehold.co/400x400?text=Product+Image'}
                            alt={product.productName || 'Product'}
                            width={300}
                            height={300}
                            className="object-cover rounded-2xl aspect-square"
                          />
                        </Card>
                      </div>
                      <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                          <Badge variant="outline" className="bg-secondary/50 text-xs font-bold px-3 py-1">
                            {product.category?.name || 'Uncategorized'}
                          </Badge>
                          <h3 className="text-xl font-semibold font-headline leading-tight">{product.productName || 'N/A'}</h3>
                        </div>

                        <div className="flex items-end gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 w-fit">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pricing</p>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">₹{product.salePrice > 0 && product.salePrice < product.price ? product.salePrice.toFixed(2) : product.price.toFixed(2)}</span>
                              {product.salePrice > 0 && product.salePrice < product.price && (
                                <span className="text-sm text-muted-foreground line-through opacity-50 font-normal">₹{product.price?.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                          <div className="pl-4 border-l border-primary/20 space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Availability</p>
                            <span className={cn(
                              "text-xs font-semibold px-3 py-1 rounded-full",
                              product.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {product.stock > 0 ? `${product.stock} IN STOCK` : 'OUT OF STOCK'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <Info className="h-4 w-4" /> Product Details
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            "{product.description || 'No description available.'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImageUrl && (
            <div className="flex justify-center items-center p-4">
              <Image src={selectedImageUrl} alt="Preview" width={500} height={500} className="rounded-lg max-h-[70vh] w-auto" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageViewerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

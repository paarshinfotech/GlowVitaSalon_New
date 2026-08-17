
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  Tag,
  Star,
  BarChart2,
  Eye,
} from "lucide-react";
import { Checkbox } from "@repo/ui/checkbox";
import { Switch } from "@repo/ui/switch";
import { useDispatch, useSelector } from 'react-redux';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Badge } from "@repo/ui/badge";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetVendorServicesQuery,
  useCreateVendorServicesMutation,
  useUpdateVendorServicesMutation,
  useDeleteVendorServicesMutation,
  useGetServicesQuery,
  useCreateServiceMutation,
  useGetStaffQuery,
  useGetAddOnsQuery,
  useGetSuperDataQuery,
  useCreateAddOnMutation
} from "@repo/store/api";
import Image from "next/image";
import { Skeleton } from "@repo/ui/skeleton";
import { Pagination } from "@repo/ui/pagination";
import { toast } from 'sonner';
import Link from "next/link";
import {
  setSearchTerm,
  setModalOpen,
  setDeleteModalOpen,
} from "@repo/store/slices/serviceSlice";
import { useAppSelector } from '@repo/store/hooks';
import { useCrmAuth } from "@/hooks/useCrmAuth";

// Import external components
import AddItemModal from './components/AddItemModal';
import AddOnQuickCreateModal from './components/AddOnQuickCreateModal';
import ServiceFormModal from './components/ServiceFormModal';
import ServicesStatsCards from './components/ServicesStatsCards';
import ServicesTable from './components/ServicesTable';
import ServicesPagination from './components/ServicesPagination';
import ServicesFiltersToolbar from './components/ServicesFiltersToolbar';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { Service } from './components/types';

export default function ServicesPage() {
  const { user, role } = useCrmAuth();
  const isDoctor = role === 'doctor';
  const dispatch = useDispatch();
  const serviceState = useAppSelector((state: any) => state.service || {
    searchTerm: '',
    isModalOpen: false,
    isDeleteModalOpen: false,
    selectedService: null,
    modalType: 'add',
  });

  const {
    searchTerm,
    isModalOpen,
    isDeleteModalOpen,
    selectedService,
    modalType,
  } = serviceState;

  const {
    data = {},
    isLoading,
    isError,
    error,
    refetch,
  } = useGetVendorServicesQuery({ vendorId: user?._id }, { skip: !user?._id });


  const services = useMemo(() => {
    const servicesList = data.services || [];
    return [...servicesList].sort((a: Service, b: Service) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [data.services]);


  const [deleteVendorServices] = useDeleteVendorServicesMutation();
  const [updateVendorServices] = useUpdateVendorServicesMutation();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
  const [selectedServiceForAddOn, setSelectedServiceForAddOn] = useState<Service | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredServices = useMemo(() => {
    return services.filter(
      (service: Service) =>
        (service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.categoryName &&
            service.categoryName.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (statusFilter === "all" || service.status === statusFilter)
    );
  }, [services, searchTerm, statusFilter]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentItems = filteredServices.slice(firstItemIndex, lastItemIndex);
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  const handleOpenModal = (type: string, service: Service | null = null) => {
    dispatch(setModalOpen({ isOpen: true, modalType: type, selectedService: service }));
  };

  const handleCloseModal = () => {
    dispatch(setModalOpen({ isOpen: false, modalType: 'add', selectedService: null }));
    refetch();
  };

  const handleDeleteClick = (service: Service) => {
    dispatch(setDeleteModalOpen({ isOpen: true, selectedService: service }));
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteVendorServices({
        vendorId: user?._id,
        serviceId: selectedService?._id,
      }).unwrap();
      refetch();
    } catch (error) {
      console.error("Failed to delete service", error);
    }
    dispatch(setDeleteModalOpen({ isOpen: false, selectedService: null }));
  };

  const handleAddOnClick = (service: Service) => {
    setSelectedServiceForAddOn(service);
    setIsAddOnModalOpen(true);
  };

  const handleAddOnModalClose = () => {
    setIsAddOnModalOpen(false);
    setSelectedServiceForAddOn(null);
    refetch();
  };

  const handleVisibilityToggle = async (service: Service) => {
    try {
      const updatedService = { ...service, onlineBooking: !service.onlineBooking };
      await updateVendorServices({
        vendor: user?._id,
        services: [updatedService],
      }).unwrap();
      refetch();
      toast.success(`Service visibility updated successfully!`);
    } catch (error) {
      console.error("Failed to toggle service visibility", error);
      toast.error("Failed to update service visibility.");
    }
  };

  const isNoServicesError = isError && (error as any)?.data?.message === "No services found for this vendor";

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-28" />
          </div>
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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Service", "Category", "Duration", "Price", "Discount Price", "Status", "Active", "Actions"].map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-5 w-full" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </TableCell>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header Section matching appointments design */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold font-headline mb-1 bg-gradient-to-r from-foreground via-primary to-primary/80 bg-clip-text text-transparent">
                Services
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                {isDoctor ? "Manage the consultation services and fees your clinic offers" : "Manage the services your salon offers"}
              </p>
            </div>
          </div>
        </div>

        {/* Services Stats Cards */}
        <ServicesStatsCards services={services} />

        {/* Filters Toolbar */}
        <ServicesFiltersToolbar
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onAddService={() => handleOpenModal("add")}
          onStatusChange={setStatusFilter}
          exportData={filteredServices}
          exportFilename="services_export"
          exportTitle="Services Report"
          exportColumns={[
            { header: 'Service', key: 'name' },
            { header: 'Category', key: 'categoryName' },
            { header: 'Duration', key: 'duration', transform: (val) => `${val} mins` },
            { header: isDoctor ? 'Fee' : 'Price', key: 'price', transform: (val) => `₹${val?.toFixed(2)}` },
            ...(!isDoctor ? [{ header: 'Discount Price', key: 'discountedPrice', transform: (val: any) => `₹${val?.toFixed(2) || '0.00'}` }] : []),
            { header: 'Status', key: 'status' },
            ...(!isDoctor ? [{ header: 'Online Booking', key: 'onlineBooking', transform: (val: any) => val ? 'Yes' : 'No' }] : [])
          ]}
        />

        {/* Services Table */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <ServicesTable
                services={services}
                onEdit={(service) => handleOpenModal('edit', service)}
                onView={(service) => handleOpenModal('view', service)}
                onDelete={handleDeleteClick}
                onAddOn={handleAddOnClick}
                onVisibilityToggle={handleVisibilityToggle}
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                isNoServicesError={isNoServicesError}
                isError={isError}
                refetch={refetch}
              />
            </CardContent>
          </Card>
        </div>

        {/* Pagination Controls */}
        <ServicesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1); // Reset to first page when changing items per page
          }}
          totalItems={filteredServices.length}
          services={services}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
        />

        {/* Modals */}
        <ServiceFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          service={selectedService}
          type={modalType}
        />

        <AddOnQuickCreateModal
          isOpen={isAddOnModalOpen}
          onClose={handleAddOnModalClose}
          serviceId={selectedServiceForAddOn?._id || ""}
          serviceName={selectedServiceForAddOn?.name || ""}
          allServices={services}
          vendorId={user?._id || ""}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => dispatch(setDeleteModalOpen({ isOpen: false, selectedService: null }))}
          onConfirm={handleConfirmDelete}
          selectedService={selectedService}
        />
      </div>
    </div>
  );
}


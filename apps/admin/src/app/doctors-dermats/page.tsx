
"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { Pagination } from "@repo/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/dialog";
import {
  Eye,
  Trash2,
  User,
  CheckCircle2,
  Hourglass,
  TrendingUp,
  Plus,
  FileDown,
  X,
  Pencil,
  XCircle,
  DollarSign,
} from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Input } from "@repo/ui/input";
import { Skeleton } from "@repo/ui/skeleton";
import { Tooltip } from "@repo/ui/tooltip";
import { DoctorForm, Doctor } from "@/components/DoctorForm";
import { DoctorEditForm } from "@/components/DoctorEditForm";
import {
  useGetDoctorsQuery,
  useCreateDoctorMutation,
  useUpdateDoctorMutation,
  useDeleteDoctorMutation,
} from "../../../../../packages/store/src/services/api";


type ActionType = "approve" | "reject" | "delete";

export default function DoctorsDermatsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNewDoctorModalOpen, setIsNewDoctorModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const areAllDocsApproved = (doctor: Doctor) => {
    const docs = doctor.documents || {};
    return (
      docs.aadharCardStatus === "approved" &&
      docs.panCardStatus === "approved" &&
      docs.medicalRegCertStatus === "approved" &&
      docs.medicalDegreeCertStatus === "approved" &&
      docs.clinicDetailsStatus === "approved"
    );
  };

  // Filter state
  const [filterName, setFilterName] = useState("");
  const [filterClinic, setFilterClinic] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAgent, setFilterAgent] = useState("");

  const searchParams = useSearchParams();
  const regionId = searchParams.get("regionId") || "";

  // Fetch doctors using RTK Query
  const {
    data: doctors = [],
    isLoading,
    error,
  } = useGetDoctorsQuery({ regionId });
  const [createDoctor] = useCreateDoctorMutation();
  const [updateDoctor] = useUpdateDoctorMutation();
  const [deleteDoctor] = useDeleteDoctorMutation();

  // Apply filters
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d: Doctor) => {
      const matchName = filterName === "" || d.name?.toLowerCase().includes(filterName.toLowerCase());
      const matchClinic = filterClinic === "" || (d.clinicName || "").toLowerCase().includes(filterClinic.toLowerCase());
      const matchCategory = filterCategory === "" || (d.specialties || []).join(", ").toLowerCase().includes(filterCategory.toLowerCase());
      // Agent filter – all are "Admin" for now, so filter by that string
      const matchAgent = filterAgent === "" || "admin".includes(filterAgent.toLowerCase());
      return matchName && matchClinic && matchCategory && matchAgent;
    });
  }, [doctors, filterName, filterClinic, filterCategory, filterAgent]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentItems = filteredDoctors.slice(firstItemIndex, lastItemIndex);
  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);

  const approvedCount = doctors.filter((d: Doctor) => d.status === "Approved").length;
  const pendingCount = doctors.filter((d: Doctor) => d.status === "Pending").length;

  const handleActionClick = (doctor: Doctor, action: ActionType) => {
    setSelectedDoctor(doctor);
    setActionType(action);
    setIsModalOpen(true);
  };

  const handleViewClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsViewModalOpen(true);
  };

  const handleAddDoctor = async (
    newDoctor: Omit<
      Doctor,
      "_id" | "createdAt" | "updatedAt"
    >
  ) => {
    try {
      await createDoctor({ ...newDoctor, regionId }).unwrap();
      setIsNewDoctorModalOpen(false);
    } catch (err) {
      console.error("Failed to add doctor:", err);
    }
  };

  const handleUpdateDoctor = async (
    updatedDoctor: Omit<Doctor, "createdAt" | "updatedAt">
  ) => {
    try {
      // Ensure we have the _id for the update
      if (!updatedDoctor._id) {
        console.error("Doctor ID is required for update");
        return;
      }
      const { _id, ...updateData } = updatedDoctor;
      await updateDoctor({ id: _id, ...updateData, regionId }).unwrap();
      setIsNewDoctorModalOpen(false);
      setSelectedDoctor(null);
    } catch (err) {
      console.error("Failed to update doctor:", err);
    }
  };

  const handleConfirmAction = async () => {
    if (selectedDoctor && actionType) {
      try {
        if (actionType === "delete") {
          await deleteDoctor(selectedDoctor._id).unwrap();
        } else {
          // This creates a new object with only the needed properties for the update
          const updatePayload = {
            id: selectedDoctor._id,
            status: actionType === "approve" ? "Approved" : "Rejected",
          };
          await updateDoctor(updatePayload).unwrap();
        }
      } catch (err: any) {
        console.error(`Failed to ${actionType} doctor:`, err);
      }
      setIsModalOpen(false);
      setSelectedDoctor(null);
      setActionType(null);
    }
  };

  const getModalContent = () => {
    if (!actionType || !selectedDoctor)
      return { title: "", description: "", buttonText: "" };
    switch (actionType) {
      case "approve":
        return {
          title: "Approve Doctor?",
          description: `Are you sure you want to approve the registration for "${selectedDoctor.name}"?`,
          buttonText: "Approve",
        };
      case "reject":
        return {
          title: "Reject Doctor?",
          description: `Are you sure you want to reject the registration for "${selectedDoctor.name}"? This action cannot be undone.`,
          buttonText: "Reject",
        };
      case "delete":
        return {
          title: "Delete Doctor?",
          description: `Are you sure you want to permanently delete the registration for "${selectedDoctor.name}"? This action is irreversible.`,
          buttonText: "Delete",
        };
      default:
        return { title: "", description: "", buttonText: "" };
    }
  };

  const { title, description, buttonText } = getModalContent();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading doctors: {(error as any).message}</div>;
  }

  if (isLoading) {
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
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 rounded-lg bg-secondary">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
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
      <h1 className="text-2xl font-bold font-headline mb-6">
        Doctors & Dermatologists
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors.length}</div>
            <p className="text-xs text-muted-foreground">Total registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Doctors
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for consultations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Verifications
            </CardTitle>
            <Hourglass className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Business
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground">
              Based on completed appointments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Manage Registrations</CardTitle>
              <CardDescription>
                Verify and manage doctor profiles.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedDoctor(null);
                  setIsNewDoctorModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Doctor
              </Button>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 rounded-lg bg-secondary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterName("");
                  setFilterClinic("");
                  setFilterCategory("");
                  setFilterAgent("");
                  setCurrentPage(1);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                type="text"
                placeholder="Filter by Doctor Name..."
                value={filterName}
                onChange={(e) => { setFilterName(e.target.value); setCurrentPage(1); }}
              />
              <Input
                type="text"
                placeholder="Filter by Clinic Name..."
                value={filterClinic}
                onChange={(e) => { setFilterClinic(e.target.value); setCurrentPage(1); }}
              />
              <Input
                type="text"
                placeholder="Filter by Category..."
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              />
              <Input
                type="text"
                placeholder="Filter by Agent..."
                value={filterAgent}
                onChange={(e) => { setFilterAgent(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No</TableHead>
                  <TableHead>Doctor's Name</TableHead>
                  <TableHead>Registration Time</TableHead>
                  <TableHead>Clinic Name</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((doctor: Doctor, index: number) => (
                  <TableRow key={doctor._id}>
                    <TableCell>{firstItemIndex + index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {doctor.name}
                    </TableCell>
                    <TableCell>
                      {doctor.createdAt ? new Date(doctor.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>{doctor.clinicName || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (doctor.subscription?.status === "Active" || doctor.status === "Approved")
                            ? "default"
                            : "secondary"
                        }
                      >
                        {doctor.subscription?.status === "Active"
                          ? "Active"
                          : doctor.status === "Approved"
                            ? "Active"
                            : doctor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{(doctor.specialties || []).join(', ')}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${doctor.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : doctor.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {doctor.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip content="View Details">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewClick(doctor)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit Doctor">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setIsNewDoctorModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={areAllDocsApproved(doctor) ? "Approve" : "All 5 mandatory documents must be approved first"}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActionClick(doctor, "approve")}
                          disabled={!areAllDocsApproved(doctor)}
                        >
                          <CheckCircle2 className={`h-4 w-4 ${areAllDocsApproved(doctor) ? 'text-green-600' : 'text-gray-300'}`} />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Reject">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActionClick(doctor, "reject")}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete Doctor">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActionClick(doctor, "delete")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            className="mt-4"
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredDoctors.length}
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={
                actionType === "delete" || actionType === "reject"
                  ? "destructive"
                  : "default"
              }
              onClick={handleConfirmAction}
            >
              {buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Doctor Details: {selectedDoctor?.name}</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Doctor ID
                </span>
                <span className="col-span-2">{selectedDoctor.id}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Clinic
                </span>
                <span className="col-span-2">
                  {selectedDoctor.clinicName || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Category
                </span>
                <span className="col-span-2">
                  {(selectedDoctor.specialties || []).join(', ')}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Registered At
                </span>
                <span className="col-span-2">
                  {selectedDoctor.createdAt ? new Date(selectedDoctor.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Registered By
                </span>
                <span className="col-span-2">Admin</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Subscription
                </span>
                <span className="col-span-2">
                  {selectedDoctor.subscription?.status === "Active"
                    ? "Active"
                    : selectedDoctor.status === "Approved"
                      ? "Active"
                      : selectedDoctor.status}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  Status
                </span>
                <span className="col-span-2">{selectedDoctor.status}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Doctor Modal */}
      {selectedDoctor ? (
        <DoctorEditForm
          isOpen={isNewDoctorModalOpen}
          onClose={() => {
            setIsNewDoctorModalOpen(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
          onSuccess={() => {
            // Success handler if needed
          }}
        />
      ) : (
        <DoctorForm
          isOpen={isNewDoctorModalOpen}
          onClose={() => {
            setIsNewDoctorModalOpen(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
          isEditMode={false}
          onSubmit={(data) => {
            handleAddDoctor(data as Omit<Doctor, '_id' | 'createdAt' | 'updatedAt'>);
          }}
        />
      )}
    </div>
  );
}

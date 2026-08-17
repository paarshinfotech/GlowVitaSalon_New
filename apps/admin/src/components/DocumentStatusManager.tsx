"use client";

import React, { useState } from 'react';
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { Textarea } from "@repo/ui/textarea";
import { Label } from "@repo/ui/label";
import { Badge } from "@repo/ui/badge";
import { CheckCircle2, X, Clock, Eye, FileText, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import {
  useUpdateVendorDocumentStatusMutation,
  useUpdateSupplierDocumentStatusMutation,
  useUpdateDoctorDocumentStatusMutation
} from '@repo/store/api';
import { toast } from 'sonner';

interface DocumentStatusManagerProps {
  entity: any;
  role: 'vendor' | 'supplier' | 'doctor';
  onUpdate: () => void;
}

const getAbsoluteUrl = (url: string) => {
  if (!url || typeof url !== 'string') return '';

  // Already absolute URL or data URL
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  // Handle relative paths
  if (url.startsWith('/')) {
    // Use CRM URL from env if available, fallback to localhost:3001
    const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:3001';
    // Remove trailing slash from CRM URL if present
    const baseUrl = crmUrl.endsWith('/') ? crmUrl.slice(0, -1) : crmUrl;
    return `${baseUrl}${url}`;
  }

  // If it doesn't start with /, assume it's a relative path that needs /uploads/ prefix
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:3001';
  const baseUrl = crmUrl.endsWith('/') ? crmUrl.slice(0, -1) : crmUrl;
  return `${baseUrl}/uploads/${url}`;
};

const DocumentStatusManager: React.FC<DocumentStatusManagerProps> = ({ entity, role, onUpdate }) => {
  const [updateVendorDocumentStatus] = useUpdateVendorDocumentStatusMutation();
  const [updateSupplierDocumentStatus] = useUpdateSupplierDocumentStatusMutation();
  const [updateDoctorDocumentStatus] = useUpdateDoctorDocumentStatusMutation();
  const [previewDocument, setPreviewDocument] = useState<{ src: string; type: string } | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const documentTypes = role === 'doctor'
    ? [
        { key: 'aadharCard', label: 'Aadhar Card' },
        { key: 'panCard', label: 'PAN Card' },
        { key: 'medicalRegCert', label: 'Medical Registration Certificate' },
        { key: 'medicalDegreeCert', label: 'Medical Degree Certificate' },
        { key: 'clinicDetails', label: 'Clinic Details' }
      ]
    : [
        { key: 'aadharCard', label: 'Aadhar Card' },
        { key: 'panCard', label: 'PAN Card' },
        { key: 'udhayamCert', label: 'Udhayam Certificate' },
        { key: 'shopAct', label: 'Shop Act' }
      ];

  const getDocumentStatus = (docType: string) => {
    if (entity?.documents && typeof entity.documents === 'object') {
      // Handle otherDoc_N index-based keys
      const otherDocMatch = docType.match(/^otherDoc_(\d+)$/);
      if (otherDocMatch) {
        const idx = parseInt(otherDocMatch[1], 10);
        return entity.documents.otherDocsStatus?.[idx] || 'pending';
      }
      const statusKey = `${docType}Status`;
      return entity.documents[statusKey] || 'pending';
    }
    return 'pending';
  };

  const getRejectionReason = (docType: string) => {
    if (entity?.documents && typeof entity.documents === 'object') {
      // Handle otherDoc_N index-based keys
      const otherDocMatch = docType.match(/^otherDoc_(\d+)$/);
      if (otherDocMatch) {
        const idx = parseInt(otherDocMatch[1], 10);
        return entity.documents.otherDocsAdminRejectionReason?.[idx] || '';
      }
      const reasonKey = `${docType}AdminRejectionReason`;
      return entity.documents[reasonKey] || '';
    }
    return '';
  };

  const getDocumentValue = (docType: string) => {
    if (entity?.documents && typeof entity.documents === 'object') {
      return entity.documents[docType] || null;
    }
    return null;
  };

  const openDocumentPreview = (src: string, type: string) => {

    const absoluteUrl = getAbsoluteUrl(src);
    setPreviewDocument({ src: absoluteUrl, type });
    setZoom(1);
    setRotation(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none shadow-none"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none shadow-none"><X className="mr-1 h-3 w-3" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none shadow-none"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
    }
  };

  const handleApproveDocument = async (docType: string) => {
    try {
      if (role === 'vendor') {
        await updateVendorDocumentStatus({
          vendorId: entity._id,
          documentType: docType,
          status: 'approved',
          rejectionReason: ''
        }).unwrap();
      } else if (role === 'supplier') {
        await updateSupplierDocumentStatus({
          supplierId: entity._id,
          documentType: docType,
          status: 'approved',
          rejectionReason: ''
        }).unwrap();
      } else if (role === 'doctor') {
        await updateDoctorDocumentStatus({
          doctorId: entity._id,
          documentType: docType,
          status: 'approved',
          rejectionReason: ''
        }).unwrap();
      }

      const documentLabel = documentTypes.find(d => d.key === docType)?.label || docType;
      toast.success(`${documentLabel} approved successfully`);
      onUpdate();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to approve document');
    }
  };

  const handleRejectDocument = (docType: string) => {
    setSelectedDocumentType(docType);
    setRejectionReason('');
    setIsRejectionModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedDocumentType) return;

    try {
      if (role === 'vendor') {
        await updateVendorDocumentStatus({
          vendorId: entity._id,
          documentType: selectedDocumentType,
          status: 'rejected',
          rejectionReason
        }).unwrap();
      } else if (role === 'supplier') {
        await updateSupplierDocumentStatus({
          supplierId: entity._id,
          documentType: selectedDocumentType,
          status: 'rejected',
          rejectionReason
        }).unwrap();
      } else if (role === 'doctor') {
        await updateDoctorDocumentStatus({
          doctorId: entity._id,
          documentType: selectedDocumentType,
          status: 'rejected',
          rejectionReason
        }).unwrap();
      }

      const documentLabel = documentTypes.find(d => d.key === selectedDocumentType)?.label || selectedDocumentType;
      toast.success(`${documentLabel} rejected successfully`);

      setIsRejectionModalOpen(false);
      setSelectedDocumentType(null);
      setRejectionReason('');
      onUpdate();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reject document');
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">Document Status Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        {(() => {
          const pendingCount = documentTypes.filter(({ key }) => {
            const isUploaded = !!getDocumentValue(key);
            const status = getDocumentStatus(key);
            return isUploaded && status === 'pending';
          }).length;

          if (pendingCount > 0) {
            return (
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                <h3 className="font-semibold text-yellow-800 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Documents Needing Approval
                </h3>
                <p className="text-xs text-yellow-700 mt-1">
                  {pendingCount} document{pendingCount > 1 ? 's are' : ' is'} pending your review.
                  Please select a document below to approve or reject.
                </p>
              </div>
            );
          }
          return null;
        })()}

        <div className="space-y-4">
          {documentTypes.map(({ key, label }) => {
            const docValue = getDocumentValue(key);
            const docStatus = getDocumentStatus(key);
            const rejectionReasonText = getRejectionReason(key);

            return (
              <div key={key} className={`border rounded-lg p-4 transition-all ${docStatus === 'pending' && docValue ? 'border-yellow-200 bg-yellow-50/20' : 'border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${docValue ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      {docValue ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center text-xs text-green-600 font-medium">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Uploaded
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-xs text-muted-foreground">
                          <X className="mr-1 h-3 w-3" />
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {docValue ? (
                      <>
                        {getStatusBadge(docStatus)}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => openDocumentPreview(docValue as string, key)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {docStatus === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                              onClick={() => handleApproveDocument(key)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => handleRejectDocument(key)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic font-medium">Waiting for upload</span>
                    )}
                  </div>
                </div>

                {docStatus === 'rejected' && rejectionReasonText && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 flex gap-2">
                    <div className="text-red-500 mt-0.5">
                      <X className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-800">Rejection Reason:</p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">{rejectionReasonText}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Other Documents section for Doctors — optional, not required for doctor approval */}
        {role === 'doctor' && (() => {
          const otherDocs: string[] = entity?.documents?.otherDocs || [];
          if (otherDocs.length === 0) return null;
          return (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Other Documents ({otherDocs.length})
                </p>
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">Optional</span>
              </div>
              <div className="space-y-3">
                {otherDocs.map((src: string, index: number) => {
                  const absoluteSrc = getAbsoluteUrl(src);
                  const docKey = `otherDoc_${index}`;
                  const docStatus = getDocumentStatus(docKey);
                  const rejectionReasonText = getRejectionReason(docKey);
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 transition-all ${docStatus === 'pending' ? 'border-yellow-200 bg-yellow-50/20' : 'border-gray-100'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">Document #{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                          {getStatusBadge(docStatus)}
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => openDocumentPreview(absoluteSrc, docKey)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {docStatus === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                onClick={() => handleApproveDocument(docKey)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => handleRejectDocument(docKey)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {docStatus === 'rejected' && rejectionReasonText && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 flex gap-2">
                          <div className="text-red-500 mt-0.5">
                            <X className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-red-800">Rejection Reason:</p>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">{rejectionReasonText}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </CardContent>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 overflow-hidden border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Document Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of uploaded document
          </DialogDescription>
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10">
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              {previewDocument?.src?.toLowerCase().includes('.pdf') || previewDocument?.src?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDocument?.src}
                  className="w-full h-full rounded-lg bg-white"
                  title="Document Preview"
                />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center overflow-auto">
                  <div className="absolute top-4 right-4 flex gap-2 z-10 bg-black/50 p-2 rounded-lg backdrop-blur-md">
                    <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => setRotation(r => r + 90)}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center flex-1 w-full h-full overflow-auto">
                    <img
                      src={previewDocument?.src}
                      alt="Document Preview"
                      style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease-in-out' }}
                      className="object-contain h-full w-full m-auto rounded-lg shadow-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <X className="h-5 w-5" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Provide a clear reason why this document is being rejected. The {role} will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="rejectionReason" className="font-semibold">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Image is blurry, Expired document, Mismatching name..."
              className="min-h-[120px] focus-visible:ring-red-500"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsRejectionModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejection}
              disabled={!rejectionReason.trim()}
              className="px-8"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DocumentStatusManager;
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { FileText, Eye, Trash2, Clock, Check, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useUpdateVendorProfileMutation, useUpdateSupplierProfileMutation, useUpdateDoctorProfileMutation } from '@repo/store/api';
import { useCrmAuth } from '@/hooks/useCrmAuth';
import { toast } from 'sonner';

interface DocumentsTabProps {
  documents: any;
  setVendor: any;
}

const documentTypes = [
  { key: 'aadharCard', label: 'Aadhar Card', required: true },
  { key: 'panCard', label: 'PAN Card', required: true },
  { key: 'udhayamCert', label: 'Udhayam Certificate', required: false },
  { key: 'shopAct', label: 'Shop Act', required: false }
];

export const DocumentsTab = ({ documents, setVendor }: DocumentsTabProps) => {
  const [updateVendorProfile] = useUpdateVendorProfileMutation();
  const [updateSupplierProfile] = useUpdateSupplierProfileMutation();
  const [updateDoctorProfile] = useUpdateDoctorProfileMutation();
  const { role } = useCrmAuth();
  const [previewDocument, setPreviewDocument] = useState<{ src: string; type: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const getDocumentTypes = () => {
    if (role === 'doctor') {
      return [
        { key: 'aadharCard', label: 'Aadhar Card', required: true },
        { key: 'panCard', label: 'PAN Card', required: true },
        { key: 'medicalRegCert', label: 'Medical Registration Certificate', required: true },
        { key: 'medicalDegreeCert', label: 'Medical Degree Certificate', required: true },
        { key: 'clinicDetails', label: 'Clinic Details', required: true }
      ];
    }
    return [
      { key: 'aadharCard', label: 'Aadhar Card', required: true },
      { key: 'panCard', label: 'PAN Card', required: true },
      { key: 'udhayamCert', label: 'Udhayam Certificate', required: false },
      { key: 'shopAct', label: 'Shop Act', required: false }
    ];
  };

  const documentTypes = getDocumentTypes();

  const handleSave = async () => {
    const missingDocs = documentTypes
      .filter(doc => doc.required && !documents?.[doc.key])
      .map(doc => doc.label);

    // Keep strict blocking validation for vendor and supplier roles
    if (role !== 'doctor' && missingDocs.length > 0) {
      toast.error(`Please upload mandatory documents: ${missingDocs.join(', ')}`);
      return;
    }

    try {
      const updateFn = role === 'vendor' ? updateVendorProfile : role === 'supplier' ? updateSupplierProfile : updateDoctorProfile;
      const result: any = await updateFn({
        _id: typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}')._id) : undefined,
        documents: documents
      }).unwrap();

      if (result.success) {
        if (role === 'doctor' && missingDocs.length > 0) {
          toast.warning(`Saved! Please upload the remaining mandatory documents later: ${missingDocs.join(', ')}`);
        } else {
          toast.success(result.message);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update documents');
    }
  };

  const handleDocumentUpload = async (docType: string, file: File | null) => {
    if (!file) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    // File type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF are allowed.`);
      return;
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size allowed is 5MB.`);
      return;
    }

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      setVendor((prev: any) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docType]: base64,
          // Reset status when a new document is uploaded
          [`${docType}Status`]: 'pending',
          [`${docType}RejectionReason`]: null,
          [`${docType}AdminRejectionReason`]: null
        }
      }));
    } catch (error) {
      console.error('Error reading document:', error);
      toast.error('Failed to read document file');
    }
  };

  const handleOtherDocsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const newDocs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only JPG, JPEG, PNG, WEBP, and PDF are allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}. Maximum size allowed is 5MB.`);
        continue;
      }

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        newDocs.push(base64);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error(`Failed to read file: ${file.name}`);
      }
    }

    if (newDocs.length > 0) {
      setVendor((prev: any) => ({
        ...prev,
        documents: {
          ...prev.documents,
          otherDocs: [...(prev.documents?.otherDocs || []), ...newDocs]
        }
      }));
    }
  };

  const handleRemoveOtherDoc = (index: number) => {
    setVendor((prev: any) => {
      const otherDocs = [...(prev.documents?.otherDocs || [])];
      otherDocs.splice(index, 1);
      return {
        ...prev,
        documents: {
          ...prev.documents,
          otherDocs
        }
      };
    });
  };

  const handleRemoveDocument = (docType: string) => {
    setVendor((prev: any) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docType]: null,
        [`${docType}Status`]: 'pending',
        [`${docType}RejectionReason`]: null,
        [`${docType}AdminRejectionReason`]: null
      }
    }));
  };

  const openDocumentPreview = (src: string, type: string) => {
    setPreviewDocument({ src, type });
    setZoom(1);
    setRotation(0);
  };

  const closeDocumentPreview = () => {
    setPreviewDocument(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <X className="h-5 w-5 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Documents</CardTitle>
        <CardDescription>
          Upload and manage your verification documents. Documents will be reviewed by our team.
          <div className="mt-4 p-3 bg-primary/5 border-l-4 border-primary rounded-r-md">
            <p className="text-xs font-bold text-primary uppercase mb-1">Upload Requirements:</p>
            <ul className="text-[11px] text-primary/80 list-disc list-inside space-y-0.5 font-medium">
              <li>File formats: <span className="font-bold">JPG, JPEG, PDF</span></li>
              <li>Maximum file size: <span className="font-bold text-primary underline">5MB</span></li>
            </ul>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {documentTypes.map(({ key, label, required }) => (
            <div key={key} className="border rounded-lg p-4">
              {/* Hidden file input for each document type */}
              <input
                id={`doc-upload-${key}`}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  handleDocumentUpload(key, file);
                  // Reset the input value to allow uploading the same file again
                  e.target.value = '';
                }}
              />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {label}
                      {required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {documents?.[key] ? (
                      <p className="text-sm text-green-600">Uploaded</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not uploaded</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {documents?.[key] ? (
                    <>
                      {getStatusBadge(documents[`${key}Status`] || 'pending')}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg"
                        onClick={() => openDocumentPreview(documents[key], key)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg"
                        onClick={() => handleRemoveDocument(key)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-10 px-4 rounded-lg" asChild>
                      <label htmlFor={`doc-upload-${key}`} className="cursor-pointer">
                        Upload
                      </label>
                    </Button>
                  )}
                </div>
              </div>

              {/* Display admin rejection reason if document is rejected */}
              {documents?.[`${key}Status`] === 'rejected' && documents[`${key}AdminRejectionReason`] && (
                <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{documents[`${key}AdminRejectionReason`]}</p>
                </div>
              )}
            </div>
          ))}
          
          {/* Multiple Other Documents upload for Doctors */}
          {role === 'doctor' && (
            <div className="border rounded-lg p-4 mt-6">
              <input
                id="doc-upload-otherDocs"
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleOtherDocsUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Other Documents (Optional)</p>
                    <p className="text-xs text-muted-foreground">Upload any other supporting certificates or documents.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-10 px-4 rounded-lg" asChild>
                  <label htmlFor="doc-upload-otherDocs" className="cursor-pointer">
                    Upload Multiple Files
                  </label>
                </Button>
              </div>

              {documents?.otherDocs && documents.otherDocs.length > 0 ? (
                <div className="space-y-3">
                  {documents.otherDocs.map((src: string, index: number) => {
                    const status = documents?.otherDocsStatus?.[index] || 'pending';
                    const rejectionReason = documents?.otherDocsAdminRejectionReason?.[index];
                    return (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium">Other Document {index + 1}</span>
                              <p className={`text-xs capitalize mt-0.5 ${status === 'approved' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                                {status}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {getStatusBadge(status)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => openDocumentPreview(src, 'otherDocs')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                              onClick={() => handleRemoveOtherDoc(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {status === 'rejected' && rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded-md border border-red-200">
                            <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
                            <p className="text-xs text-red-700">{rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-2 bg-muted/10 rounded-md">No additional documents uploaded</p>
              )}
            </div>
          )}
        </div>

        {/* Document Preview Modal */}
        {previewDocument && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeDocumentPreview}>
            <div className="relative max-w-4xl max-h-full w-full" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0 h-10 w-10 rounded-lg"
                onClick={closeDocumentPreview}
              >
                <X className="h-4 w-4" />
              </Button>
              {previewDocument.src?.startsWith('data:application/pdf') || previewDocument.src?.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={previewDocument.src}
                  className="w-full h-[80vh]"
                  title="Document Preview"
                />
              ) : (
                previewDocument.src?.startsWith('data:') || previewDocument.src?.startsWith('http') ? (
                  <div className="relative w-full h-[80vh] flex flex-col items-center justify-center overflow-auto bg-black/40 rounded-xl">
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
                        src={previewDocument.src || ''}
                        alt="Document Preview"
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease-in-out' }}
                        className="object-contain h-full w-full m-auto rounded-lg shadow-2xl"
                        onError={(e) => {
                          // Set a fallback image on error
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="h-12 px-6 rounded-lg bg-primary hover:bg-primary/90">
          Save Documents
        </Button>
      </CardFooter>
    </Card>
  );
};
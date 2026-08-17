export type Review = {
    _id: string;
    entityId: string;
    entityType: 'product' | 'service' | 'salon' | 'doctor';
    entityDetails?: {
        _id: string;
        productName?: string;
        serviceName?: string;
        salonName?: string;
        name?: string;
        price?: number;
    };
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    isApproved: boolean;
    createdAt: string;
};

export type Client = {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    birthdayDate: string;
    gender: 'Male' | 'Female' | 'Other';
    country: string;
    occupation: string;
    profilePicture?: string;
    address: string;
    preferences?: string;
    lastVisit: string;
    nextVisit?: string;
    totalBookings: number;
    totalSpent: number;
    status: 'Active' | 'Inactive' | 'New';
    source?: 'online' | 'offline';
    createdAt?: string;
    updatedAt?: string;
};

export type AppointmentFormData = {
    date: string;
    startTime: string;
    service: string;
    duration: string;
    staffMember: string;
    notes: string;
};

export type ClientFormData = {
    fullName: string;
    email: string;
    phone: string;
    birthdayDate: string;
    gender: 'Male' | 'Female' | 'Other' | '';
    country: string;
    occupation: string;
    profilePicture: string;
    address: string;
    preferences: string;
};
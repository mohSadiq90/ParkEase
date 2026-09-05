/**
 * Enum Constants
 * Mirror of backend enums for consistent data handling
 */

export const UserRole = {
    Admin: 0,
    Vendor: 1,
    Member: 2,
};

export const UserRoleLabels = {
    [UserRole.Admin]: 'Admin',
    [UserRole.Vendor]: 'Vendor',
    [UserRole.Member]: 'Member',
};

export const BookingStatus = {
    Pending: 0,
    Confirmed: 1,
    InProgress: 2,
    Completed: 3,
    Cancelled: 4,
    Expired: 5,
    AwaitingPayment: 6,
    Rejected: 7,
    PendingExtension: 8,
    AwaitingExtensionPayment: 9,
};

export const BookingStatusLabels = {
    [BookingStatus.Pending]: 'Pending',
    [BookingStatus.Confirmed]: 'Confirmed',
    [BookingStatus.InProgress]: 'In Progress',
    [BookingStatus.Completed]: 'Completed',
    [BookingStatus.Cancelled]: 'Cancelled',
    [BookingStatus.Expired]: 'Expired',
    [BookingStatus.AwaitingPayment]: 'Awaiting Payment',
    [BookingStatus.Rejected]: 'Rejected',
    [BookingStatus.PendingExtension]: 'Extension Pending',
    [BookingStatus.AwaitingExtensionPayment]: 'Extension Payment Due',
};

export const PaymentStatus = {
    Pending: 0,
    Completed: 1,
    Failed: 2,
    Refunded: 3,
    PartialRefund: 4,
};

export const PaymentStatusLabels = {
    [PaymentStatus.Pending]: 'Pending',
    [PaymentStatus.Completed]: 'Completed',
    [PaymentStatus.Failed]: 'Failed',
    [PaymentStatus.Refunded]: 'Refunded',
    [PaymentStatus.PartialRefund]: 'Partial Refund',
};

export const PricingType = {
    Hourly: 0,
    Daily: 1,
    Weekly: 2,
    Monthly: 3,
};

export const PricingTypeLabels = {
    [PricingType.Hourly]: 'Hourly',
    [PricingType.Daily]: 'Daily',
    [PricingType.Weekly]: 'Weekly',
    [PricingType.Monthly]: 'Monthly',
};

export const ParkingType = {
    Open: 0,
    Covered: 1,
    Garage: 2,
    Street: 3,
    Underground: 4,
};

export const ParkingTypeLabels = {
    [ParkingType.Open]: 'Open',
    [ParkingType.Covered]: 'Covered',
    [ParkingType.Garage]: 'Garage',
    [ParkingType.Street]: 'Street',
    [ParkingType.Underground]: 'Underground',
};

export const VehicleType = {
    Car: 0,
    Motorcycle: 1,
    SUV: 2,
    Truck: 3,
    Van: 4,
    Electric: 5,
};

export const VehicleTypeLabels = {
    [VehicleType.Car]: 'Car',
    [VehicleType.Motorcycle]: 'Motorcycle',
    [VehicleType.SUV]: 'SUV',
    [VehicleType.Truck]: 'Truck',
    [VehicleType.Van]: 'Van',
    [VehicleType.Electric]: 'Electric',
};

export const PaymentMethod = {
    CreditCard: 0,
    DebitCard: 1,
    UPI: 2,
    NetBanking: 3,
    Wallet: 4,
};

export const PaymentMethodLabels = {
    [PaymentMethod.CreditCard]: 'Credit Card',
    [PaymentMethod.DebitCard]: 'Debit Card',
    [PaymentMethod.UPI]: 'UPI',
    [PaymentMethod.NetBanking]: 'Net Banking',
    [PaymentMethod.Wallet]: 'Wallet',
};

export const AMENITIES = [
    'CCTV',
    'Security Guard',
    'EV Charging',
    'Covered Parking',
    'Wheelchair Accessible',
    'Restroom',
    'Lighting',
    'Valet',
    'Car Wash',
    'Air Pump',
];

export const ListingCategory = {
    Standard: 0,
    ResidentialDriveway: 1,
    GatedSociety: 2,
    DedicatedCommercial: 3,
    EventLot: 4,
};

export const ListingCategoryLabels = {
    [ListingCategory.Standard]: 'Standard Commercial',
    [ListingCategory.ResidentialDriveway]: 'Residential Driveway',
    [ListingCategory.GatedSociety]: 'Gated Society',
    [ListingCategory.DedicatedCommercial]: 'Dedicated Commercial',
    [ListingCategory.EventLot]: 'Event Lot',
};

export const ParkingSpaceOwnershipType = {
    Individual: 0,
    CorporateOwned: 1,
    CorporateLeased: 2,
};

export const CompanyRole = {
    Admin: 0,
    Employee: 1,
};

export const CompanyRoleLabels = {
    [CompanyRole.Admin]: 'Company Admin',
    [CompanyRole.Employee]: 'Employee',
};

export const BillingType = {
    Prepaid: 0,
    PostpaidMonthly: 1,
    PayPerUse: 2,
};

export const BillingTypeLabels = {
    [BillingType.Prepaid]: 'Prepaid',
    [BillingType.PostpaidMonthly]: 'Postpaid Monthly',
    [BillingType.PayPerUse]: 'Pay Per Use',
};

export const AllocationStatus = {
    Requested: 0,
    Active: 1,
    Rejected: 2,
    Terminated: 3,
};

export const AllocationStatusLabels = {
    [AllocationStatus.Requested]: 'Requested',
    [AllocationStatus.Active]: 'Active',
    [AllocationStatus.Rejected]: 'Rejected',
    [AllocationStatus.Terminated]: 'Terminated',
};

export const ParkingAllocationSource = {
    CorporateOwned: 0,
    VendorLeased: 1,
};

export const InvitationStatus = {
    Pending: 0,
    Accepted: 1,
    Expired: 2,
    Cancelled: 3,
};

export const CorporateSlotType = {
    Shared: 0,
    Dedicated: 1,
};

export const CorporateInvoiceStatus = {
    Draft: 0,
    Issued: 1,
    Paid: 2,
    Void: 3,
};

export const CorporateInvoiceStatusLabels = {
    [CorporateInvoiceStatus.Draft]: 'Draft',
    [CorporateInvoiceStatus.Issued]: 'Issued',
    [CorporateInvoiceStatus.Paid]: 'Paid',
    [CorporateInvoiceStatus.Void]: 'Void',
};

export const CorporateInvoiceLineType = {
    LeaseMonthlyFee: 0,
    EmployeeBookingFee: 1,
    VisitorBookingFee: 2,
    OverstayFee: 3,
    Adjustment: 4,
};

export const PassTypeKind = {
    Daily: 0,
    Weekly: 1,
    Monthly: 2,
    Custom: 3,
};

export const PassCoverageType = {
    SingleSpace: 0,
    ZoneWide: 1,
    CompanyWide: 2,
};

export const PassUsageMode = {
    Unlimited: 0,
    CappedDailyHours: 1,
    CappedSessionsPerDay: 2,
};

export const ValetStatus = {
    None: 0,
    Requested: 1,
    InProgress: 2,
    ReadyForPickup: 3,
    Completed: 4,
    Cancelled: 5,
};

export const ValetStatusLabels = {
    [ValetStatus.None]: 'None',
    [ValetStatus.Requested]: 'Requested',
    [ValetStatus.InProgress]: 'In Progress',
    [ValetStatus.ReadyForPickup]: 'Ready For Pickup',
    [ValetStatus.Completed]: 'Completed',
    [ValetStatus.Cancelled]: 'Cancelled',
};

export const EvPricingMode = {
    PerHourFlat: 0,
    PerKwhMetered: 1,
};

export const EvChargingSessionStatus = {
    Pending: 0,
    Active: 1,
    Completed: 2,
    Failed: 3,
};

export const LprDirection = {
    Entry: 1,
    Exit: 2,
};

export const LprPlateRuleType = {
    Allow: 1,
    Deny: 2,
};

export const NotificationType = {
    BookingCreated: 0,
    BookingConfirmed: 1,
    BookingCancelled: 2,
    BookingCompleted: 3,
    PaymentSuccess: 4,
    PaymentFailed: 5,
    Reminder: 6,
    ReviewReceived: 7,
    System: 8,
    ValetUpdate: 9,
    EvUpdate: 10,
};


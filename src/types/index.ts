// ==================== AUTH ====================
export interface LoginRequest {
  email: string;
  password: string;
  clinicId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// ==================== USER ====================
export interface User {
  id: string;
  roleId: string;
  roleName: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  licenseNumber: string | null;
  specialization: string | null;
  active: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  roleId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  active?: boolean;
}

export interface UpdateUserRequest {
  roleId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  active?: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  permissions?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: string;
}

// ==================== OWNER ====================
export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  personalId: string | null;
  note: string | null;
  clientCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnerRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  personalId?: string;
  note?: string;
  clientCode?: string;
}

export interface UpdateOwnerRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  personalId?: string;
  note?: string;
  clientCode?: string;
}

// ==================== PET ====================
export type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface Pet {
  id: string;
  ownerId: string;
  ownerName: string;
  patientCode: string | null;
  legacyCode: string | null;
  speciesId: string | null;
  speciesName: string | null;
  breedId: string | null;
  breedName: string | null;
  name: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  color: string | null;
  weightKg: number | null;
  microchipNumber: string | null;
  isNeutered: boolean | null;
  isDeceased: boolean | null;
  deceasedAt: string | null;
  allergies: string | null;
  note: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  hasActiveAlerts?: boolean;
}

export interface CreatePetRequest {
  ownerId: string;
  speciesId?: string;
  breedId?: string;
  name: string;
  dateOfBirth?: string;
  gender?: Gender;
  color?: string;
  weightKg?: number;
  microchipNumber?: string;
  isNeutered?: boolean;
  isDeceased?: boolean;
  deceasedAt?: string;
  allergies?: string;
  note?: string;
  photoUrl?: string;
  patientCode?: string;
  legacyCode?: string;
}

export interface UpdatePetRequest {
  ownerId?: string;
  speciesId?: string;
  breedId?: string;
  name?: string;
  dateOfBirth?: string;
  gender?: Gender;
  color?: string;
  weightKg?: number;
  microchipNumber?: string;
  isNeutered?: boolean;
  isDeceased?: boolean;
  deceasedAt?: string;
  allergies?: string;
  note?: string;
  photoUrl?: string;
  patientCode?: string;
  legacyCode?: string;
}

export interface Species {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpeciesRequest {
  name: string;
  active?: boolean;
}

export interface UpdateSpeciesRequest {
  name?: string;
  active?: boolean;
}

export interface Breed {
  id: string;
  speciesId: string;
  speciesName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBreedRequest {
  speciesId: string;
  name: string;
}

export interface UpdateBreedRequest {
  speciesId?: string;
  name?: string;
}

// ==================== PET HEALTH ALERT ====================
export type HealthAlertType = 'ALLERGY' | 'CHRONIC_CONDITION' | 'SPECIAL_HANDLING' | 'OTHER';

export interface PetHealthAlert {
  id: string;
  petId: string;
  petName: string | null;
  alertType: HealthAlertType;

  label: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetHealthAlertRequest {
  petId: string;
  alertType: HealthAlertType;

  label: string;
  description?: string | null;
  active?: boolean;
}

export interface UpdatePetHealthAlertRequest {
  alertType?: HealthAlertType;

  label?: string;
  description?: string | null;
  active?: boolean;
}

// ==================== APPOINTMENT ====================
export type AppointmentStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type AppointmentType =
  | 'CHECKUP'
  | 'VACCINATION'
  | 'SURGERY'
  | 'EMERGENCY'
  | 'FOLLOW_UP'
  | 'GROOMING';

export interface Appointment {
  id: string;
  locationId: string;
  locationName: string;
  petId: string;
  petName: string;
  ownerId: string;
  ownerName: string;
  vetId: string;
  vetName: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string | null;
  notes: string | null;
  followUpTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  locationId: string;
  petId: string;
  ownerId: string;
  vetId: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  type: AppointmentType;
  reason?: string;
  notes?: string;
  followUpTo?: string;
}

export interface UpdateAppointmentRequest {
  locationId?: string;
  petId?: string;
  ownerId?: string;
  vetId?: string;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  reason?: string;
  notes?: string;
  followUpTo?: string;
}

// ==================== CLINIC LOCATION ====================
export interface ClinicLocation {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  isMain: boolean;
  active: boolean;
  workingHours: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== MEDICAL RECORD ====================
export interface MedicalRecord {
  id: string;
  appointmentId: string | null;
  recordCode: string | null;
  petId: string;
  petName: string;
  ownerId: string;
  ownerName: string;
  vetId: string;
  vetName: string;
  symptoms: string | null;
  diagnoses: Diagnosis[];
  examinationNotes: string | null;
  weightKg: number | null;
  temperatureC: number | null;
  heartRate: number | null;
  followUpRecommended: boolean;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  hasActiveAlerts?: boolean;
}

export interface CreateMedicalRecordRequest {
  appointmentId?: string | null;
  petId: string;
  vetId: string;
  symptoms?: string;
  diagnosisIds?: string[];
  examinationNotes?: string;
  weightKg?: number;
  temperatureC?: number;
  heartRate?: number;
  followUpRecommended?: boolean;
  followUpDate?: string | null;
}

export interface UpdateMedicalRecordRequest {
  appointmentId?: string | null;
  petId?: string;
  vetId?: string;
  symptoms?: string;
  diagnosisIds?: string[];
  examinationNotes?: string;
  weightKg?: number;
  temperatureC?: number;
  heartRate?: number;
  followUpRecommended?: boolean;
  followUpDate?: string | null;
}

// ==================== VACCINATION ====================
export interface Vaccination {
  id: string;
  petId: string;
  petName: string;
  medicalRecordId: string | null;
  vetId: string;
  vetName: string;
  vaccineName: string;
  batchNumber: string | null;
  manufacturer: string | null;
  administeredAt: string;
  validUntil: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVaccinationRequest {
  petId: string;
  medicalRecordId?: string;
  vetId: string;
  vaccineName: string;
  batchNumber?: string;
  manufacturer?: string;
  administeredAt: string;
  validUntil?: string;
  nextDueDate?: string;
}

export interface UpdateVaccinationRequest {
  petId?: string;
  medicalRecordId?: string | null;
  vetId?: string;
  vaccineName?: string;
  batchNumber?: string;
  manufacturer?: string;
  administeredAt?: string;
  validUntil?: string;
  nextDueDate?: string;
}

export type BillableItemType = 'SERVICE' | 'ITEM';

export interface BillableItem {
  type: BillableItemType;
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  unitPrice: number | null; // sellPrice artikla može biti null
  taxRateId: string;
  taxRateLabel: string | null;
  taxRatePercent: number | null;
  quantityOnHand: number | null; // null za SERVICE
  trackBatches: boolean | null; // null za SERVICE
}

// ==================== INVOICE ====================
export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Invoice {
  id: string;
  appointmentId: string | null;
  medicalRecordId?: string | null;
  ownerId: string | null; // ← bio string, sad nullable (walk-in)
  ownerName: string | null; // ← bio string, sad nullable
  walkInCustomerName?: string | null; // ← NOVO
  locationId: string | null;
  locationName: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface CreateInvoiceRequest {
  appointmentId?: string;
  ownerId?: string;
  walkInCustomerName?: string;
  medicalRecordId?: string;
  locationId?: string;
  status?: InvoiceStatus;
  issuedAt?: string;
  dueDate?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total?: number;
  currency?: string;
  note?: string;
}

export interface CreateInvoiceFromMedicalRecordRequest {
  locationId?: string;
  issuedAt?: string; // ISO8601
  dueDate?: string; // YYYY-MM-DD
  currency?: string;
  note?: string;
}

export interface UpdateInvoiceRequest {
  appointmentId?: string | null;
  ownerId?: string;
  walkInCustomerName?: string;
  locationId?: string | null;
  status?: InvoiceStatus;
  issuedAt?: string;
  dueDate?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total?: number;
  currency?: string;
  note?: string;
}

export interface InvoiceWithItemsResponse {
  invoice: Invoice;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  serviceId: string | null;
  serviceName: string | null;
  inventoryItemId: string | null; // ← NOVO
  inventoryItemName: string | null; // ← NOVO
  treatmentId: string | null; // ← NOVO
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string;
  taxRateLabel: string;
  taxRatePercent: number;
  discountPercent: number;
  lineTotal: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceItemRequest {
  invoiceId: string;
  serviceId?: string | null;
  inventoryItemId?: string | null; // ← NOVO
  treatmentId?: string | null; // ← NOVO
  description: string;
  quantity?: number;
  unitPrice: number;
  taxRateId?: string;
  discountPercent?: number;
  lineTotal?: number; // backend @NotNull (preracunava se server-side, ali mora biti poslat)
  sortOrder?: number;
}

export interface UpdateInvoiceItemRequest {
  serviceId?: string | null;
  description?: string;
  inventoryItemId?: string | null;
  treatmentId?: string | null;
  quantity?: number;
  unitPrice?: number;
  taxRateId?: string;
  discountPercent?: number;
  lineTotal?: number;
  sortOrder?: number;
}

// ===================== Inventory =====================

export type InventoryCategory = 'MEDICATION' | 'SUPPLY' | 'EQUIPMENT';
export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'EXPIRED';
export type AdjustmentReason =
  | 'DAMAGED'
  | 'LOST'
  | 'STOLEN'
  | 'EXPIRED'
  | 'RECOUNT'
  | 'CORRECTION'
  | 'OPENING_BALANCE'
  | 'OTHER';

export interface InventoryItem {
  id: string;
  locationId: string;
  locationName: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  quantityOnHand: number;
  unit: string;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  expiryDate: string | null;
  active: boolean;
  trackBatches: boolean;
  taxRateId: string;
  taxRateLabel: string | null;
  taxRatePercent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemRequest {
  locationId?: string;
  name: string;
  sku?: string;
  category: InventoryCategory;
  quantityOnHand?: number;
  unit?: string;
  reorderLevel?: number;
  costPrice?: number;
  sellPrice?: number;
  expiryDate?: string | null;
  active?: boolean;
  trackBatches?: boolean;
  taxRateId: string; // ← NOVO obavezno
  initialQuantity?: number;
}

export interface UpdateInventoryItemRequest {
  locationId?: string | null;
  name?: string;
  sku?: string;
  category?: InventoryCategory;
  quantityOnHand?: number;
  unit?: string;
  reorderLevel?: number;
  costPrice?: number;
  sellPrice?: number;
  taxRateId?: string;
  expiryDate?: string | null;
  active?: boolean;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  type: InventoryTransactionType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  batchId: string | null;
  batchNumber: string | null;
  performedBy: string | null;
  performedByName: string | null;
  note: string | null;
  reason: AdjustmentReason | null;
  reversalOfTransactionId: string | null; // ← NOVO
  reversed: boolean; // ← NOVO
  batchDeleted: boolean; // ← NOVO
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryTransactionRequest {
  inventoryItemId: string;
  type: InventoryTransactionType;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  batchId?: string;
  performedBy?: string;
  note?: string;
  reason?: AdjustmentReason;
}

export interface UpdateInventoryTransactionRequest {
  inventoryItemId?: string;
  type?: InventoryTransactionType;
  quantity?: number;
  referenceType?: string;
  referenceId?: string;
  batchId?: string;
  performedBy?: string;
  note?: string;
  reason?: AdjustmentReason;
}

// ===================== Service Inventory Item =====================

export interface ServiceInventoryItem {
  id: string;
  serviceId: string;
  serviceName: string;
  inventoryItemId: string;
  inventoryItemName: string;
  quantityPerUse: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInventoryItemRequest {
  serviceId: string;
  inventoryItemId: string;
  quantityPerUse?: number;
}

export interface UpdateServiceInventoryItemRequest {
  quantityPerUse: number;
}
// ===================== Inventory Batch =====================

export type InventoryBatchStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string | null;
  inventoryItemUnit: string | null;
  batchNumber: string;
  expiryDate: string | null;
  quantityOnHand: number;
  receivedAt: string;
  supplier: string | null;
  costPrice: number | null;
  notes: string | null;
  daysUntilExpiry: number | null;
  status: InventoryBatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryBatchRequest {
  inventoryItemId: string;
  batchNumber: string;
  expiryDate?: string | null;
  quantityOnHand: number;
  receivedAt: string;
  supplier?: string;
  costPrice?: number;
  notes?: string;
}

export interface UpdateInventoryBatchRequest {
  batchNumber?: string;
  expiryDate?: string | null;
  receivedAt?: string;
  supplier?: string;
  costPrice?: number;
  notes?: string;
}

// ==================== API RESPONSE ====================
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
}

// ================= Klinika =============================
export type SubscriptionPlan = 'BASIC' | 'STANDARD' | 'PREMIUM';

export interface Clinic {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phoneCountryCode: string;
  registrationNumber: string | null;
  activityCode: string | null;
  bankAccount: string | null;
  vatPayer: boolean;
  veterinaryLicenseNumber: string | null;
  logoUrl: string | null;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt: string | null;
  active: boolean;
  settings: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicRequest {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  phoneCountryCode?: string;
  registrationNumber?: string;
  activityCode?: string;
  bankAccount?: string;
  vatPayer?: boolean;
  veterinaryLicenseNumber?: string;
  logoUrl?: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: string;
  active?: boolean;
  settings?: string;
}

export interface UpdateClinicRequest {
  name?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  phoneCountryCode?: string;
  registrationNumber?: string;
  activityCode?: string;
  bankAccount?: string;
  vatPayer?: boolean;
  veterinaryLicenseNumber?: string;
  logoUrl?: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: string;
  active?: boolean;
  settings?: string;
}

export interface TaxRate {
  id: string;
  countryCode: string;
  label: string;
  percent: number;
  description: string;
  active: boolean;
}

// ============== Services (Usluge) ==============

export type ServiceCategory =
  | 'EXAMINATION'
  | 'MEDICATION_APPLICATION'
  | 'ANESTHESIA'
  | 'LAB'
  | 'ULTRASOUND'
  | 'REPRODUCTION'
  | 'STERILIZATION'
  | 'SURGERY'
  | 'GROOMING'
  | 'PREVENTIVE'
  | 'VACCINATION'
  | 'DENTAL'
  | 'THERAPY'
  | 'EUTHANASIA'
  | 'OTHER';
export interface Service {
  id: string;
  category: ServiceCategory;
  name: string;
  sku?: string;
  unit?: string;
  description?: string;
  price: number;
  taxRateId: string;
  taxRateLabel: string | null;
  taxRatePercent: number | null;
  durationMinutes?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  category: ServiceCategory;
  name: string;
  sku?: string;
  unit?: string;
  description?: string;
  price: number;
  taxRateId?: string;
  durationMinutes?: number;
  active?: boolean;
}

export interface UpdateServiceRequest {
  category?: ServiceCategory;
  name?: string;
  sku?: string;
  unit?: string;
  description?: string;
  price?: number;
  taxRateId?: string;
  durationMinutes?: number;
  active?: boolean;
}

// ==================== LAB REPORT ====================
export type LabReportStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type TestCategory = 'LABORATORY' | 'RAPID_TEST';

export interface LabReport {
  id: string;
  reportNumber: string;
  analysisType: string;
  petId: string;
  petName: string;
  ownerName: string | null;
  vetId: string;
  vetName: string;
  medicalRecordId: string | null;
  testCategory: TestCategory;
  laboratoryName: string | null;
  status: LabReportStatus;
  requestedAt: string;
  completedAt: string | null;
  resultSummary: string | null;
  isAbnormal: boolean;
  notes: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  storagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabReportRequest {
  reportNumber: string;
  analysisType: string;
  petId: string;
  vetId: string;
  medicalRecordId?: string | null;
  testCategory?: TestCategory;
  laboratoryName?: string;
  status?: LabReportStatus;
  requestedAt: string;
  completedAt?: string;
  resultSummary?: string;
  isAbnormal?: boolean;
  notes?: string;
}

export interface UpdateLabReportRequest {
  reportNumber?: string;
  analysisType?: string;
  petId?: string;
  vetId?: string;
  medicalRecordId?: string | null;
  testCategory?: TestCategory;
  laboratoryName?: string;
  status?: LabReportStatus;
  requestedAt?: string;
  completedAt?: string;
  resultSummary?: string;
  isAbnormal?: boolean;
  notes?: string;
}

// ==================== LAB report PARSE ====================
export interface LabReportParseResult {
  reportNumber: string | null;
  petName: string | null;
  petId: string | null;
  vetName: string | null;
  vetId: string | null;
  ownerName: string | null;
  ownerId: string | null;
  microchipNumber: string | null;
  species: string | null;
  laboratoryName: string | null;
  analysisType: string | null;
  requestedAt: string | null;
  completedAt: string | null;
}

// ==================== TREATMENT ====================
export interface Treatment {
  id: string;
  medicalRecordId: string;
  serviceId: string | null;
  serviceName: string | null;
  vetId: string;
  vetName: string;
  name: string;
  description: string | null;
  result: string | null;
  quantity: number;
  unitPrice: number | null;
  discountPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTreatmentRequest {
  medicalRecordId: string;
  serviceId?: string;
  vetId: string;
  name: string;
  description?: string;
  result?: string;
  quantity?: number;
  unitPrice?: number | null;
  discountPercent?: number;
}

export interface UpdateTreatmentRequest {
  serviceId?: string | null;
  vetId?: string;
  name?: string;
  description?: string;
  result?: string;
  quantity?: number;
  unitPrice?: number | null;
  discountPercent?: number;
}

// ==================== PRESCRIPTION ====================
export interface Prescription {
  id: string;
  medicalRecordId: string;
  petId: string;
  petName: string;
  vetId: string;
  vetName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number | null;
  startDate: string;
  endDate: string | null;
  instructions: string | null;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionRequest {
  medicalRecordId: string;
  petId: string;
  vetId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
  startDate: string;
  endDate?: string;
  instructions?: string;
  inventoryItemId?: string;
}

export interface UpdatePrescriptionRequest {
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  instructions?: string;
  inventoryItemId?: string;
}

// ==================== MEDICATION ADMINISTRATION za lekove koji su primenjeni u ambulanti ====================
export type MedicationRoute = 'IV' | 'IM' | 'SC' | 'PO' | 'TOPICAL' | 'INHALATION';

export interface MedicationAdministration {
  id: string;
  medicalRecordId: string;
  petId: string;
  petName: string;
  vetId: string;
  vetName: string;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  medicationName: string;
  dosage: string | null;
  route: MedicationRoute | null;
  administeredDate: string;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicationAdministrationRequest {
  medicalRecordId: string;
  petId: string;
  vetId: string;
  inventoryItemId?: string | null;
  medicationName: string;
  dosage?: string | null;
  route?: MedicationRoute | null;
  administeredDate: string;
  instructions?: string | null;
}

export interface UpdateMedicationAdministrationRequest {
  inventoryItemId?: string | null;
  medicationName?: string;
  dosage?: string | null;
  route?: MedicationRoute | null;
  administeredDate?: string;
  instructions?: string | null;
}

export interface MedicationQuickPickItem {
  inventoryItemId: string;
  name: string;
  quantityOnHand: number;
  unit: string | null;
}

export interface MedicationQuickPicksResponse {
  recent: MedicationQuickPickItem[];
  frequent: MedicationQuickPickItem[];
}

// ===== Documents =====
export type FileType = 'IMAGE' | 'PDF' | 'LAB_RESULT' | 'XRAY' | 'OTHER';

export interface DocumentRecord {
  id: string;
  petId: string | null;
  petName: string | null;
  medicalRecordId: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  fileName: string | null;
  fileType: FileType;
  mimeType: string | null;
  fileSizeBytes: number | null;
  storagePath: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRequest {
  petId?: string | null;
  medicalRecordId?: string | null;
  uploadedBy: string;
  fileName?: string;
  fileType: FileType;
  mimeType?: string;
  fileSizeBytes?: number;
  storagePath?: string;
  description?: string;
}

export interface UpdateDocumentRequest {
  petId?: string | null;
  medicalRecordId?: string | null;
  fileName?: string;
  fileType?: FileType;
  description?: string;
}

// ==================== AUDIT LOG ====================
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export interface AuditLog {
  id: string;
  clinicId: string;
  userId: string;
  userName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Payments
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  referenceNumber?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  referenceNumber?: string;
  note?: string;
}

export interface UpdatePaymentRequest {
  invoiceId?: string;
  amount?: number;
  method?: PaymentMethod;
  paidAt?: string;
  referenceNumber?: string;
  note?: string;
}
export interface ProvisionClinicRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface ProvisionClinicResponse {
  clinicId: string;
  clinicName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface ImportPetData {
  name: string;
  species?: string;
  breed?: string;
  legacyCode?: string;
}

//================== IMPORT OWNERS =================
export interface ImportOwnerRequest {
  clientCode?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  pets?: ImportPetData[];
}

export interface ImportError {
  clientCode: string | null;
  ownerName: string;
  message: string;
}

export interface ImportResultResponse {
  totalProcessed: number;
  created: number;
  skipped: number;
  errors: ImportError[];
}
// ==================== Diagnosis ====================

export interface Diagnosis {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiagnosisRequest {
  name: string;
  code?: string;
  category?: string;
  description?: string;
  active?: boolean;
}

export interface UpdateDiagnosisRequest {
  name?: string;
  code?: string;
  category?: string;
  description?: string;
  active?: boolean;
}
export interface ImportDiagnosisRequest {
  name: string;
  code?: string;
  category?: string;
  description?: string;
}

// ==================== TreatmentProtocol ====================

export interface TreatmentProtocol {
  id: string;
  name: string;
  description: string | null;
  diagnosisId: string | null;
  diagnosisName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTreatmentProtocolRequest {
  name: string;
  description?: string;
  diagnosisId?: string;
  active?: boolean;
}

export interface UpdateTreatmentProtocolRequest {
  name?: string;
  description?: string;
  diagnosisId?: string;
  active?: boolean;
}

// ==================== TreatmentProtocolItem ====================

export interface TreatmentProtocolItem {
  id: string;
  protocolId: string;
  serviceId: string;
  serviceName: string;
  serviceSku: string | null;
  servicePrice: number;
  quantity: number;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTreatmentProtocolItemRequest {
  protocolId: string;
  serviceId: string;
  quantity?: number;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateTreatmentProtocolItemRequest {
  quantity?: number;
  notes?: string;
  sortOrder?: number;
}

// ==================== ApplyProtocol ====================

export interface ApplyProtocolRequest {
  protocolId: string;
  medicalRecordId: string;
  vetId: string;
}

// ===================== Quick Sale (POS) =====================

export interface QuickSaleLineRequest {
  serviceId?: string | null;
  inventoryItemId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice?: number | null;
  taxRateId?: string | null;
  discountPercent?: number | null;
}

export interface QuickSaleRequest {
  ownerId?: string | null;
  walkInCustomerName?: string | null;
  locationId?: string | null;
  vetId?: string | null;
  issuedAt?: string | null;
  currency?: string | null;
  note?: string | null;
  lines: QuickSaleLineRequest[];
  paymentMethod: PaymentMethod;
  tenderedAmount: number;
  paidAt?: string | null;
  paymentReferenceNumber?: string | null;
  paymentNote?: string | null;
}

export interface QuickSaleResponse {
  invoice: Invoice;
  items: InvoiceItem[];
  payment: Payment;
  changeAmount: number;
}

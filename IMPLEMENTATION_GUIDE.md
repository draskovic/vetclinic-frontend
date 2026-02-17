# VetClinic Frontend — Implementation Guide

## 1. Project Info

| | |
|---|---|
| **Frontend** | `C:\Users\ndraskovic\worksapceVetClinic\vetclinic-frontend` |
| **Backend** | `C:\Users\ndraskovic\worksapceVetClinic\vetclinic` |
| **Tech stack** | React 19, TypeScript, Vite, Ant Design, Zustand, TanStack Query, React Router |
| **Backend** | Spring Boot, Java 17, PostgreSQL, MapStruct, JWT auth |
| **Locale** | Serbian (`sr_RS`) |

## 2. Architecture & Conventions

### TypeScript
- **`verbatimModuleSyntax=true`** — always use `import type` for TypeScript types
- Central types in `src/types/index.ts`
- Path alias `@/` maps to `src/`

### Multi-tenant Architecture
- `clinicId` comes from login response, stored in `localStorage`
- Sent on every request via `X-Clinic-Id` header (configured in `src/api/client.ts`)
- PostgreSQL uses **Row-Level Security (RLS)** with `app.current_clinic_id`

### Soft Delete
- All entities have `deleted` flag — never physically deleted
- Backend returns only `deleted=false` records

### JWT Authentication
- Token contains: `userId`, `clinicId`, `email`, `role`, `permissions` claims
- Permissions are parsed from token in authStore
- Token expiration causes 403 — re-login fixes it

### Ant Design Forms
- Use **`initialValues`** on `<Form>` component (NOT `defaultValue` on inputs)
- For edit mode use `form.setFieldsValue()` inside `useEffect`
- `undefined` in JSON **omits** the field, `null` **sends null** — critical for nullable FKs

### MapStruct (Backend)
- `NullValuePropertyMappingStrategy.IGNORE` is default
- For nullable FK fields (e.g., `appointmentId`) need `SET_TO_NULL` in mapper when clearing on frontend
- Example fix in `MedicalRecordMapper.java`: `@Mapping(target = "appointmentId", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)`

### Dark/Light Theme
- **`src/store/themeStore.ts`** — Zustand store with `persist` middleware, saves to `localStorage` key `vetclinic-theme`
- **`App.tsx`** — `ConfigProvider` with `theme.darkAlgorithm` / `theme.defaultAlgorithm`
  - Custom tokens for both modes: `colorBgContainer`, `colorBgElevated`, `colorBgLayout`, `colorBorderSecondary`
  - Dark mode: soft dark blue-gray (`#1e2433`, `#252d3d`, `#161b26`)
  - Light mode: slightly darker than white (`#edf0f5`, `#f5f6fa`, `#e2e6ee`)
  - **Wrapper `<div className={darkMode ? 'dark-theme' : 'light-theme'}>`** around entire app — used by CSS for theme-specific styles (zebra rows, hover)
- **`MainLayout.tsx`** — toggle button (Sun/Moon icon) in header, grouped with user dropdown
  - **Colored menu icons** — each menu item has inline `style={{ color: '#hex' }}` on icon
  - Menu font: `fontSize: 16` on `<Menu>` + CSS override for 15px items, 18px icons, 48px height
- **`Dashboard.tsx`** — `getStatCards(dark)` function returns theme-aware gradients; text colors use `darkMode` ternary
- **`LoginPage.tsx`** — clinic card uses `token.colorSuccessBg` / `token.colorSuccessBorder` (theme-aware)
- **Convention**: Avoid hardcoded colors; use `theme.useToken()` for dynamic colors that adapt to both themes

### UI/Table Conventions (index.css)
- **Zebra redovi** — `.zebra-even td` class applied via `rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}` on every `<Table>`
  - Light theme: `#e8f0fa`, Dark theme: `#1e2a3a`
- **Hover redova** — Custom hover colors per theme (light: `#cdd8e8`, dark: `#2e3f55`)
- **Manja visina redova** — `padding: 8px 16px` on all table cells
- **Veći font u tabelama** — `.ant-table { font-size: 15px }`
- **Tagovi zamenjeni sa `<span>`** — umesto `<Tag color='green'>` koristi `<span style={{ color: '#52c41a', fontWeight: 600 }}>` na svim stranicama
  - Razlog: `<Tag>` ima svoju pozadinu koja se sukobljava sa zebra redovima
  - Sve boje u config objektima (`statusConfig`, `categoryConfig`, `genderLabels`, itd.) koriste **hex vrednosti**, ne Ant Design imena
- **Sidebar meni** — veći font (15px), veće ikone (18px), veća visina stavki (48px), ikone u boji

### API Service Pattern
- Axios instance: `src/api/client.ts` (imported as `apiClient`)
- Pagination type: `PageResponse<T>`, params as template string: `` `/endpoint?page=${page}&size=${size}` ``
- All API files export named objects (e.g., `ownersApi`, `petsApi`)

### AbstractCrudService (Backend)
- `create(T entity, UUID clinicId)` — sets clinicId, calls validateForCreate, saves
- `update(UUID id, UUID clinicId, Consumer<T> updater)` — uses Consumer pattern, NOT direct entity replacement
- `softDelete(UUID id, UUID clinicId)` — sets deleted=true
- `findById(UUID id, UUID clinicId)` — throws ResourceNotFoundException if not found
- `findAll(UUID clinicId, Pageable pageable)` — paginated, clinic-scoped

## 3. Implemented Modules

### 3.1 Dashboard
- `src/pages/Dashboard.tsx`
- Landing page, visible to all users
- **Dark gradient stat cards** (top row, 4 cards):
  - Ukupno vlasnika (TeamOutlined, blue) — `ownersApi.getAll(0,1)` → `totalElements`
  - Ukupno ljubimaca (HeartOutlined, pink) — `petsApi.getAll(0,1)` → `totalElements`
  - Termini danas (CalendarOutlined, green) — `appointmentsApi.getByDateRange(todayFrom, todayTo)`
  - Prihod ovog meseca (DollarOutlined, amber) — `invoicesApi.getByStatus('PAID')` filtered by current month
- **Današnji termini** table (bottom-left, ClockCircleOutlined):
  - Columns: Vreme (HH:mm), Ljubimac, Vlasnik, Tip, Status (colored Tag)
  - Sorted by startTime ascending
  - Empty state: "Nema zakazanih termina za danas"
- **Predstojeće vakcinacije** table (bottom-right, MedicineBoxOutlined):
  - Columns: Ljubimac, Vakcina, Sledeća doza (DD.MM.YYYY)
  - `vaccinationsApi.getDue(+7 days)` — vaccinations due in next 7 days
  - Color coding: red if past due, orange if upcoming
  - Empty state: "Nema vakcinacija u narednih 7 dana"
- **Date format for appointments**: Backend expects `OffsetDateTime`, so dates are sent as `YYYY-MM-DDTHH:mm:ssZ` with `encodeURIComponent()` to prevent `+` sign URL encoding issue
- **Date format for vaccinations**: Backend expects `LocalDate`, plain `YYYY-MM-DD` format works
- Monthly revenue: filters paid invoices by `dayjs(inv.issuedAt).isSame(dayjs(), 'month')`
- `statusConfig` maps `AppointmentStatus` enum to Serbian labels + Ant Design tag colors

### 3.2 Owners (Vlasnici)
- `src/pages/owners/OwnersPage.tsx` + `OwnerModal.tsx`
- `src/api/owners.ts`
- Permission: `manage_owners`

### 3.3 Pets (Ljubimci)
- `src/pages/pets/PetsPage.tsx` + `PetModal.tsx`
- `src/api/pets.ts`
- Permission: `manage_pets`
- Dependent dropdown: owner -> species -> breeds
- **PetModal 3-kolone layout** (width: 900px): Ime/Vlasnik/Vrsta → Rasa/Datum/Pol → Težina/Boja/Mikročip → Kastriran/Preminuo/Datum smrti → Alergije/Napomena
- **Breed (rasa) timing fix**: `breedId` se postavlja na `null` pri otvaranju forme, pa poseban `useEffect` sa `setTimeout(() => form.setFieldValue('breedId', pet.breedId), 0)` ga postavi tek kad se `breedsData` učita — rešava problem prikazivanja UUID-a umesto naziva rase
- Gender i Status kolone koriste `<span>` umesto `<Tag>` (providna pozadina)

### 3.4 Appointments (Termini)
- `src/pages/appointments/AppointmentsPage.tsx` + `AppointmentModal.tsx`
- `src/api/appointments.ts`, `src/api/clinic-locations.ts`
- Permission: `manage_appointments`
- Statuses: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- Types: CHECKUP, VACCINATION, SURGERY, EMERGENCY, FOLLOW_UP, GROOMING (NOT DENTAL — DENTAL exists only as ServiceCategory, NOT as AppointmentType)
- Dependent dropdown: owner -> pets in modal
- `initialValues={{ status: 'SCHEDULED' }}`
- DatePicker with `showTime` for OffsetDateTime fields
- **API sort**: `getAll()` sends `sort=startTime,desc` param — backend sorts by date (newest first)
- **Search fix**: Kad korisnik pretražuje, učitavaju se SVI termini (`size=1000`) da client-side filter radi na celom datasetu, ne samo na trenutnoj stranici. Bez pretrage paginira normalno (`size=10`). Koristi `useDeferredValue` za debounce.
- `queryKey: ['appointments', isSearching ? 'search' : page]` — React Query kešira posebno za search i paginaciju

### 3.5 Medical Records (Intervencije)
- `src/pages/medical-records/MedicalRecordsPage.tsx` + `MedicalRecordModal.tsx`
- `src/api/medical-records.ts`
- Permission: `manage_medical_records`
- Named "Intervencije" (not "Kartoni") — each record is a single intervention
- Vital parameters: weight, temperature, heartRate
- Optional appointment link (appointmentId) — dropdown with `allowClear`
- `appointmentId: values.appointmentId ?? null` in handleSubmit (sends null, not undefined)
- followUpDate: optional LocalDate field
- Search by: pet, vet, diagnosis, symptoms
- Backend fix: `MedicalRecordMapper.java` needs `SET_TO_NULL` for appointmentId

### 3.6 Vaccinations (Vakcinacije)
- `src/pages/vaccinations/VaccinationsPage.tsx` + `VaccinationModal.tsx`
- `src/api/vaccinations.ts`
- Permission: `manage_vaccinations`
- `getDueStatus` function — red/orange/green based on nextDueDate
- `administeredAt` with `showTime` (OffsetDateTime), `validUntil`/`nextDueDate` DatePicker only (LocalDate)

### 3.7 Invoices (Fakture) + Invoice Items (Stavke)
- `src/pages/invoices/InvoicesPage.tsx` + `InvoiceModal.tsx` + `InvoiceItemsTable.tsx`
- `src/api/invoices.ts` (exports `invoicesApi` and `invoiceItemsApi`)
- Permission: `manage_invoices`
- 7 statuses: DRAFT, ISSUED, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED, REFUNDED
- Compact form layout: owner/status/dates in row 1, amounts/currency in row 2, location/note in row 3
- "Iznos bez PDV-a" label for subtotal field (not just "Iznos")
- Modal width: 900px
- **InvoiceItemsTable** — inline row editing within table
  - New row added at top of table (id='new')
  - `isRowEditing` checks both `editingId` and `adding && record.id === 'new'`
  - Auto-calculates `lineTotal` (quantity x unitPrice - discount + tax)
  - `sortOrder: (items?.length ?? 0) + 1` for new items (NOT NULL column in DB)
  - Grand total in table summary row
  - **Service dropdown** — items are selected from clinic's service catalog (not free text)
    - Fetches active services via `servicesApi.getAll(0, 100)`
    - `handleServiceSelect` auto-fills: `description`, `unitPrice`, `taxRate` from selected service
    - `serviceId` sent to backend with `?? null` pattern (nullable FK)
    - Hidden `description` Form.Item — populated automatically from service name
    - User can still adjust `unitPrice`, `quantity`, `discountPercent` after selection
- **Auto-update invoice totals** — `onItemsChanged` callback from InvoiceItemsTable to InvoiceModal
  - `useEffect` on `items` triggers callback
  - Callback recalculates subtotal, taxAmount, discountAmount, total from items
  - Sets form values via `form.setFieldsValues()`

### 3.8 Inventory (Inventar)
- **Items**: `src/pages/inventory/InventoryPage.tsx` + `InventoryItemModal.tsx`
- **Transactions**: `src/pages/inventory/InventoryTransactionsPage.tsx` + `InventoryTransactionModal.tsx`
- `src/api/inventory.ts` (exports `inventoryItemsApi` and `inventoryTransactionsApi`)
- Permission: `manage_inventory`
- Categories: MEDICATION (Lek), SUPPLY (Potrosni materijal), EQUIPMENT (Oprema)
- Transaction types: IN (Ulaz), OUT (Izlaz), ADJUSTMENT (Korekcija), EXPIRED (Isteklo)
- Stock status: red (out of stock), orange (low level <= reorderLevel), green (in stock)
- Expiry date: red color if expired
- Navigation between items and transactions via buttons
- **Backend auto-updates `quantityOnHand`** on transaction create and update
  - Override `create()` and `update()` in `InventoryTransactionService.java`
  - `BigDecimal` operations: `.add()`, `.subtract()` (not + and -)
  - Update: saves old values before `super.update()`, reverses old then applies new transaction
  - `update()` signature: `update(UUID id, UUID clinicId, Consumer<InventoryTransaction> updater)`

### 3.9 Administration (Administracija)
- `src/pages/admin/AdminPage.tsx` — navigation cards
- **Species (Vrste)**: `SpeciesPage.tsx` + `SpeciesModal.tsx` — permission: `*`
- **Breeds (Rase)**: `BreedPage.tsx` + `BreedModal.tsx` — permission: `*`
- **Users (Korisnici)**: `UsersPage.tsx` + `UserModal.tsx` — permission: `*`
  - Password field only for creation (`{!isEditing && (...)}`)
  - Role dropdown from API
- **Roles (Role)**: `RolesPage.tsx` + `RoleModal.tsx` — permission: `*`
  - Permissions stored as JSON string in DB -> `Select mode='multiple'` + JSON.parse/stringify
- **Services (Usluge)**: `ServicesPage.tsx` + `ServiceModal.tsx` — permission: `*`
  - `src/api/services.ts` (exports `servicesApi`)
  - Clinic's service catalog / price list (cenovnik)
  - Categories (enum): EXAMINATION (Pregled), SURGERY (Hirurgija), VACCINATION (Vakcinacija), LAB (Laboratorija), DENTAL (Stomatologija), GROOMING, OTHER (Ostalo)
  - Fields: category, name, description, price, taxRate (default 20%), durationMinutes, active
  - `categoryConfig` maps enum values to Serbian labels + tag colors
  - Table with search by name + filter by category dropdown
  - Modal with Row/Col layout: name+category row, description, price+taxRate+duration row, active switch
  - Unique constraint: clinic_id + name (backend `DuplicateResourceException`)
  - Used by InvoiceItemsTable as dropdown for selecting services on invoice items
- **Clinics (Klinike)**: `ClinicsPage.tsx` + `ClinicModal.tsx` — permission: `*`, visible only for SUPER_ADMIN
  - SubscriptionPlan: BASIC, STANDARD, PREMIUM
  - `settings: values.settings ?? '{}'` in handleSubmit (NOT NULL column)
  - RLS policy: `super_admin_full_access` on clinic table

## 4. Permission System

### Flow: JWT -> Store -> Hook -> Sidebar + Route Guard

1. **`src/store/authStore.ts`** — parses permissions from JWT token:
   - `parsePermissionsFromToken()` — reads `permissions` claim (can be string or array)
   - Stores `permissions: string[]` in Zustand state

2. **`src/hooks/usePermissions.ts`** — permission check hook:
   - `hasPermission(perm)` — wildcard `*` passes all
   - `hasAnyPermission(perms)` — at least one of listed
   - `isSuperAdmin` — `user?.roleName === 'SUPER_ADMIN'`

3. **`src/layouts/MainLayout.tsx`** — filters sidebar menu:
   - `permission: null` -> everyone sees it
   - `permission: 'admin'` -> only users with `*`
   - `permission: 'manage_xxx'` -> specific permission

4. **`src/components/PermissionGuard.tsx`** — protects routes:
   - If no permission -> `<Navigate to='/' replace />`

## 5. Routes (App.tsx)

| Route | Component | Permission |
|---|---|---|
| `/` | Dashboard | - |
| `/owners` | OwnersPage | `manage_owners` |
| `/pets` | PetsPage | `manage_pets` |
| `/appointments` | AppointmentsPage | `manage_appointments` |
| `/medical-records` | MedicalRecordsPage | `manage_medical_records` |
| `/vaccinations` | VaccinationsPage | `manage_vaccinations` |
| `/invoices` | InvoicesPage | `manage_invoices` |
| `/inventory` | InventoryPage | `manage_inventory` |
| `/inventory-transactions` | InventoryTransactionsPage | `manage_inventory` |
| `/admin` | AdminPage | `*` |
| `/admin/species` | SpeciesPage | `*` |
| `/admin/breeds` | BreedPage | `*` |
| `/admin/users` | UsersPage | `*` |
| `/admin/roles` | RolesPage | `*` |
| `/admin/services` | ServicesPage | `*` |
| `/admin/clinics` | ClinicsPage | `*` |

## 6. API Services

| File | Export | Endpoint |
|---|---|---|
| `client.ts` | `apiClient` (default) | Axios instance with interceptors |
| `auth.ts` | `authApi` | `/api/auth` |
| `owners.ts` | `ownersApi` | `/api/owners` |
| `pets.ts` | `petsApi` | `/api/pets` |
| `species.ts` | `speciesApi` | `/api/species` |
| `breeds.ts` | `breedsApi` | `/api/breeds` |
| `appointments.ts` | `appointmentsApi` | `/api/appointments` |
| `clinic-locations.ts` | `clinicLocationsApi` | `/api/clinic-locations` |
| `medical-records.ts` | `medicalRecordsApi` | `/api/medical-records` |
| `vaccinations.ts` | `vaccinationsApi` | `/api/vaccinations` |
| `clinics.ts` | `clinicsApi` | `/api/clinics` |
| `users.ts` | `usersApi` | `/api/users` |
| `roles.ts` | `rolesApi` | `/api/roles` |
| `invoices.ts` | `invoicesApi` + `invoiceItemsApi` | `/api/invoices` + `/api/invoice-items` |
| `inventory.ts` | `inventoryItemsApi` + `inventoryTransactionsApi` | `/api/inventory-items` + `/api/inventory-transactions` |
| `services.ts` | `servicesApi` | `/api/services` |

## 7. Known Issues & Solutions

| Problem | Cause | Solution |
|---|---|---|
| Null in "status" column | `defaultValue` on Select doesn't set Form state | Use `initialValues` on `<Form>` |
| 403 Forbidden | Expired JWT token | Re-login |
| Clearing FK doesn't save null | `undefined` omitted in JSON, MapStruct IGNORE skips null | Send `null` (not undefined) + add `SET_TO_NULL` in mapper |
| RLS blocks SUPER_ADMIN | No RLS policy for cross-clinic access | Create `super_admin_full_access` policy |
| NOT NULL constraint | Field not in Form.Item so not sent | Add default in handleSubmit (e.g., `settings: '{}'`, `sortOrder: n`) |
| BigDecimal operators | Java doesn't support +/- for BigDecimal | Use `.add()`, `.subtract()` |
| TypeScript TS server | Doesn't recognize new files/imports | `Ctrl+Shift+P` -> `TypeScript: Restart TS Server` |
| `undefined` vs `null` for nullable FKs | Frontend sends undefined (field omitted), backend IGNORE skips it | Use `value ?? null` in handleSubmit to explicitly send null |
| Duplicate `/api/api/...` URL | `apiClient` baseURL is `/api`, service adds `/api` again | Use `/services` not `/api/services` in API service files |
| Disabled InputNumber barely visible | Ant Design default disabled style is too faint | CSS override: `.ant-input-number-disabled .ant-input-number-input { color: rgba(0,0,0,0.85); font-weight: 600; }` |
| OffsetDateTime `+` sign lost in URL | `+01:00` becomes ` 01:00` because `+` = space in URL params | Use `encodeURIComponent()` for date params in `appointments.ts` (`getByDateRange`, `getByVet`) |
| Vaccinations not showing on Dashboard | `getDue(before)` returns empty array | Check that `next_due_date` values in DB fall within the queried range (next 7 days) |
| PetModal shows UUID instead of breed name | Breeds not loaded yet when form populates `breedId` | Set `breedId: null` initially, then use separate `useEffect` with `setTimeout(() => form.setFieldValue('breedId', pet.breedId), 0)` triggered by `breedsData` |
| `DENTAL` not valid AppointmentType | Enum only has: CHECKUP, VACCINATION, SURGERY, EMERGENCY, FOLLOW_UP, GROOMING | Use `SURGERY` for dental procedures. DENTAL exists only as `ServiceCategory` |
| Inventory transactions 500 error (LazyInit) | `performedByUser` is LAZY in entity, not in `@EntityGraph` | Add `"performedByUser"` to all `@EntityGraph(attributePaths=...)` in `InventoryTransactionRepository.java` |
| Search only filters current page | Client-side search on paginated data (10 per page) misses items on other pages | When searching, load all data (`size=1000`); when not searching, paginate normally (`size=10`) |
| `<Tag>` background clashes with zebra rows | Ant Design Tag has its own background color | Replace `<Tag>` with `<span style={{ color, fontWeight: 600 }}>` on all table pages |
| `<span color='red'>` doesn't work | `<span>` HTML element doesn't have `color` prop | Use `<span style={{ color: '#ff4d4f' }}>` — always `style` object, never prop |
| Ant Design CSS-in-JS can't be overridden easily | Ant Design 5 uses Emotion, not class names | Use `rowClassName` prop + custom CSS class (`.zebra-even td {}`) instead of targeting Ant Design internal selectors |

## 8. File Structure

```
src/
  api/
    client.ts              # Axios instance with X-Clinic-Id header
    index.ts               # Re-exports all API services
    auth.ts                # Login/logout
    owners.ts              # CRUD + getAll paginated
    pets.ts                # CRUD + getByOwner
    species.ts             # CRUD
    breeds.ts              # CRUD + getBySpecies
    appointments.ts        # CRUD + getByDateRange, getByVet
    clinic-locations.ts    # getActive()
    medical-records.ts     # CRUD + getByPet, getByAppointment
    vaccinations.ts        # CRUD + getByPet, getDue
    clinics.ts             # CRUD + lookup
    users.ts               # CRUD + getMe
    roles.ts               # CRUD
    invoices.ts            # invoicesApi (CRUD + getByOwner, getByStatus) + invoiceItemsApi (CRUD + getByInvoice)
    inventory.ts           # inventoryItemsApi (CRUD + getByCategory) + inventoryTransactionsApi (CRUD + getByItem)
    services.ts            # servicesApi (CRUD + getByCategory)
  components/
    ProtectedRoute.tsx     # Redirects to /login if not authenticated
    PermissionGuard.tsx    # Redirects to / if no permission
  hooks/
    usePermissions.ts      # hasPermission, hasAnyPermission, isSuperAdmin
  layouts/
    MainLayout.tsx         # Sidebar with permission-filtered menu + header with user dropdown
  pages/
    Dashboard.tsx
    auth/LoginPage.tsx
    owners/OwnersPage.tsx + OwnerModal.tsx
    pets/PetsPage.tsx + PetModal.tsx
    appointments/AppointmentsPage.tsx + AppointmentModal.tsx
    medical-records/MedicalRecordsPage.tsx + MedicalRecordModal.tsx
    vaccinations/VaccinationsPage.tsx + VaccinationModal.tsx
    invoices/InvoicesPage.tsx + InvoiceModal.tsx + InvoiceItemsTable.tsx
    inventory/InventoryPage.tsx + InventoryItemModal.tsx + InventoryTransactionsPage.tsx + InventoryTransactionModal.tsx
    admin/AdminPage.tsx + SpeciesPage.tsx + SpeciesModal.tsx + BreedPage.tsx + BreedModal.tsx + ClinicsPage.tsx + ClinicModal.tsx + UsersPage.tsx + UserModal.tsx + RolesPage.tsx + RoleModal.tsx + ServicesPage.tsx + ServiceModal.tsx
  store/
    authStore.ts           # Zustand store: user, token, clinicId, permissions
    themeStore.ts          # Zustand store: darkMode toggle, persisted to localStorage
  types/
    index.ts               # All TypeScript interfaces and types
  index.css                # Global styles including form control contrast fix
  App.tsx                  # Router with all routes and permission guards
```

## 9. Global CSS (index.css)

```css
/* Form control contrast */
.ant-input, .ant-input-number-input, .ant-select-selector, .ant-picker { border-color: #b0b0b0; }
.ant-input:hover, ... { border-color: #666; }
.ant-input-number-disabled .ant-input-number-input { color: rgba(0,0,0,0.85); font-weight: 600; }

/* Sidebar menu - larger font */
.ant-menu-inline .ant-menu-item { font-size: 15px; height: 48px; line-height: 48px; }
.ant-menu-inline .ant-menu-item .anticon { font-size: 18px; }

/* Tables - larger font */
.ant-table { font-size: 15px; }

/* Tables - zebra rows (requires rowClassName prop on every <Table>) */
.light-theme .zebra-even td { background-color: #e8f0fa; }
.dark-theme .zebra-even td { background-color: #1e2a3a; }

/* Tables - smaller row height */
.ant-table-tbody > tr > td { padding: 8px 16px; }

/* Tables - hover per theme */
.light-theme .ant-table-tbody > tr:hover > td { background-color: #cdd8e8; }
.dark-theme .ant-table-tbody > tr:hover > td { background-color: #2e3f55; }
```

**IMPORTANT**: `App.tsx` wraps everything in `<div className={darkMode ? 'dark-theme' : 'light-theme'}>` — this is required for theme-specific CSS selectors to work.

## 10. Remaining Tasks

- [x] **Services (Usluge) CRUD** — admin page for clinic service catalog + integration with InvoiceItemsTable
- [x] **Dashboard** — dark gradient stat cards, today's appointments table, upcoming vaccinations table, monthly revenue
- [x] **Dark/Light tema** — korisnik bira temu (Ant Design `ConfigProvider` + `darkAlgorithm`, Zustand/localStorage za preferenciju, toggle u header-u)
- [x] **Seed demo data** — `seed-demo-data.sql` with realistic Serbian data for client demos (executed successfully)
- [x] **UI Polish** — zebra redovi, hover efekti, veći font, ikone u boji, `<Tag>` → `<span>`, PetModal 3 kolone
- [x] **Fix appointments search** — radi na svim podacima, ne samo trenutnoj stranici
- [x] **Fix PetModal breed display** — prikazuje ime rase umesto UUID
- [x] **Fix InventoryTransaction LazyInit** — dodato `performedByUser` u `@EntityGraph`
- [ ] **Backend @PreAuthorize** — server-side endpoint protection by permissions
- [ ] **Service type link to MedicalRecord** — discussed but deferred
- [ ] **Prescriptions (Recepti)** — frontend stranica za recepte (podaci postoje u bazi iz seed skripte)
- [ ] **Poboljšanje pretrage** — dodati server-side search na ostale stranice (owners, pets, etc.) umesto client-side filtriranja samo trenutne stranice
- [ ] **Responsive design** — prilagoditi za manje ekrane / tablet
- [ ] Potential improvements to existing modules

## 12. Backend Fixes Made (in this session)

### InventoryTransactionRepository.java
- **Problem**: `Could not initialize proxy [User#...] - no session` error
- **Cause**: `performedByUser` field is `@ManyToOne(fetch = FetchType.LAZY)` but NOT included in `@EntityGraph`
- **Fix**: Added `"performedByUser"` to all `@EntityGraph` declarations:
  ```java
  @EntityGraph(attributePaths = {"inventoryItem", "performedByUser"})
  ```
- Location: `vetclinic/src/main/java/com/softart/vetclinic/repository/InventoryTransactionRepository.java`

### seed-demo-data.sql
- **Problem**: Original script used wrong clinic ID and duplicate data
- **Fix**: Rewrote to use actual IDs from database:
  - Clinic: `b5434818-265f-4386-8ed5-e568a238a451` (Test Vet Clinic)
  - Location: `4d1233d9-415f-4946-98a3-ecd635f9a66f` (Centrala - Vračar)
  - Existing species, breeds, owners, pets referenced by actual UUIDs
  - `ON CONFLICT DO NOTHING` for idempotent execution
- **Problem**: `DENTAL` used as appointment type
- **Fix**: Changed to `SURGERY` — DENTAL only exists as `ServiceCategory`, not `AppointmentType`
- Location: `vetclinic/src/main/resources/seed-demo-data.sql`

### Enums Reference
| Enum | Values | Location |
|------|--------|----------|
| `AppointmentType` | CHECKUP, VACCINATION, SURGERY, EMERGENCY, FOLLOW_UP, GROOMING | `enums/AppointmentType.java` |
| `AppointmentStatus` | SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW | `enums/AppointmentStatus.java` |
| `ServiceCategory` | EXAMINATION, SURGERY, VACCINATION, LAB, DENTAL, GROOMING, OTHER | `enums/ServiceCategory.java` |
| `InvoiceStatus` | DRAFT, ISSUED, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED, REFUNDED | `enums/InvoiceStatus.java` |
| `InventoryCategory` | MEDICATION, SUPPLY, EQUIPMENT | `enums/InventoryCategory.java` |
| `TransactionType` | IN, OUT, ADJUSTMENT, EXPIRED | `enums/TransactionType.java` |

## 13. Hex Color Reference (used across all pages)

All `statusConfig`, `categoryConfig`, `genderLabels` objects use hex colors for `<span>` rendering:

| Color Name | Hex | Usage |
|-----------|-----|-------|
| Blue | `#1890ff` | Scheduled, Issued, Dashboard icon, Admin blue tags |
| Cyan/Tirkiz | `#13c2c2` | Confirmed, Interventions icon |
| Orange | `#fa8c16` | In Progress, Low stock, Follow-up, Appointments icon |
| Green | `#52c41a` | Completed, Paid, Active, In stock, Vaccinations icon |
| Red | `#ff4d4f` | Cancelled, Overdue, Inactive, Out of stock |
| Gray | `#8c8c8c` | No Show, Draft, Default, Admin icon |
| Gold | `#faad14` | Super Admin role, Invoices icon |
| Purple | `#722ed1` | Refunded, Lab, Owners icon |
| Pink | `#eb2f96` | Female gender, Pets icon |
| Dark Blue | `#2f54eb` | Inventory icon |

## 11. Working Mode

The user is **learning React and Spring Boot** — mentor proposes steps with complete code snippets, user implements through **VS Code** (frontend) and **Spring Tool Suite / STS** (backend). Mentor does not write files directly unless explicitly asked. Communication is in Serbian.

### Database
- **pgAdmin** for running SQL scripts and queries
- Database name: `vetapp`
- Demo data loaded via `seed-demo-data.sql`
- Clinic used for development: "Test Vet Clinic" (`b5434818-265f-4386-8ed5-e568a238a451`)
- Admin user: `8c0e4077-3478-4d6e-b6b5-c2b6ba0cca22`
- VET role: `f1e746f4-e14e-411e-bcda-5e0e993643b3`
- Location: `4d1233d9-415f-4946-98a3-ecd635f9a66f` (Centrala - Vračar)
- Demo vet accounts: `marko.petrovic@vetclinic.rs`, `ana.jovanovic@vetclinic.rs`, `nikola.ilic@vetclinic.rs` (password: `admin123`)

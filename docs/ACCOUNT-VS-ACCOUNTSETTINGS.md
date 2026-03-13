# Account vs AccountSettings — Unified Model

## Current Data Model (Unified)

### **Account** (keep)
- **Purpose**: The clinic/organization entity
- **Stores**: `ownerId`, `practiceName`, `website`, `phone`, `email`, `address`, `logoUrl`
- **Used for**: Branding, profile, company info
- **API**: GET/PATCH `/api/settings`, `/api/accounts/*`

### **Option** (single source for all application settings)
- **Purpose**: Per-account dropdown values AND graft buttons
- **Types**: `hairType`, `hairColor`, `fueDevice`, … and `graftButton`
- **graftButton** records: `label` (e.g. "1/1"), `intactHairs`, `totalHairs`, `isDefault`
- **API**: GET/PATCH `/api/settings/options`, `/api/options`

### **AccountSettings** (legacy — remove after migration)
- Previously stored `graftButtons` and option arrays. Both now live in **Option**.
- Run POST `/api/options/migrate` to move any remaining data to Option.
- Once migrated, AccountSettings can be removed.

---

## What to Remove

### From **Account** (if present)
- `graftButtons`, `hairTypes`, `hairColors`, etc. — all belong in Option table

### From **AccountSettings**
- Entire class can be removed after running migrate
- Or remove `graftButtons` and option columns — they're now in Option

---

## Migration

1. Log in as an account owner.
2. Call `POST /api/options/migrate` — moves AccountSettings data (option arrays + graftButtons) to Option.
3. After all accounts are migrated, delete the AccountSettings class in Parse Dashboard.

# Module 2: Address & Location

## 2.1 Features
- **Geocoding & Maps:** Integration with Mapbox for reverse geocoding and map rendering.
- **Multiple Addresses:** Users can save multiple addresses (Home, Work, Other).
- **Default Address:** Quick selection for checkout.
- **PostGIS Location:** Storing spatial coordinates to enable radius search, nearby shops, and delivery eligibility checks.
- **Validation:** Validating coordinate boundaries and address completeness.

## 2.2 Database Schema (Prisma)
We add an `Address` model. We store `latitude` and `longitude` as floats for standard Prisma querying, and we can utilize raw SQL queries for advanced PostGIS functions (e.g., `ST_DistanceSphere`).

```prisma
model Address {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title         String   // e.g., 'Home', 'Office'
  addressLine1  String
  addressLine2  String?
  landmark      String?
  city          String
  state         String
  pincode       String
  
  // GPS Location
  latitude      Float
  longitude     Float
  
  isDefault     Boolean  @default(false)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
}
```

*Note on PostGIS:* To enforce strict spatial indexing, we will use raw migrations to add a GiST index on a generated PostGIS `geometry` column computed from latitude/longitude, or simply run PostGIS functions in raw Prisma queries.

## 2.3 Module Structure (NestJS)
```
src/
├── addresses/
│   ├── addresses.module.ts
│   ├── addresses.controller.ts
│   ├── addresses.service.ts
│   ├── dto/
│   │   ├── create-address.dto.ts
│   │   ├── update-address.dto.ts
```

## 2.4 API Endpoints
- `POST /addresses` - Create a new address.
- `GET /addresses` - Get all addresses for the current user.
- `GET /addresses/:id` - Get a specific address.
- `PATCH /addresses/:id` - Update an address.
- `DELETE /addresses/:id` - Delete an address.
- `PATCH /addresses/:id/default` - Set an address as the default.

## 2.5 Validation & Error Handling
- Validate latitude (-90 to 90) and longitude (-180 to 180).
- Check that only one address per user is set as `isDefault` at a time.
- Standard Prisma error handling via the global `AllExceptionsFilter`.

## 2.6 Mapbox Integration & Scaling
- **Mapbox API:** The frontend uses Mapbox GL for picking locations. The backend can optionally use Mapbox Geocoding API if address verification is needed.
- **PostGIS Optimization:** For nearby shop calculations, we will use `ST_DWithin` paired with a GiST index to quickly find locations within a specific radius (e.g., 5km).

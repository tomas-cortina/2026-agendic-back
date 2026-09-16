-- Business model v2 (docs/specs/business-model-v2.md): Professional and Specialty are gone, an Employee
-- takes their place, and the Booking is reshaped around a Cliente with no account (ADR 0005).

-- DropTable
DROP TABLE "_ProfessionalToSpecialty";
DROP TABLE "_BranchToProfessional";
DROP TABLE "Specialty";

-- Booking is rebuilt rather than altered: adding 'UNVERIFIED' to the enum and using it as the new default
-- can't happen in one transaction, and no Turno endpoint exists yet, so there is nothing to preserve.
DROP TABLE "Booking";
DROP TYPE "BookingStatus";

DROP TABLE "Professional";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('UNVERIFIED', 'BOOKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "retiredAt" TIMESTAMPTZ(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationTokenHash" TEXT,
    "verificationTokenExpiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EmployeeToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EmployeeToService_B_index" ON "_EmployeeToService"("B");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToService" ADD CONSTRAINT "_EmployeeToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToService" ADD CONSTRAINT "_EmployeeToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: not expressible in schema.prisma (ADR 0004).

-- An Empleado can't have two overlapping BOOKED Turnos. Half-open: back-to-back is allowed.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("employeeId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" = 'BOOKED');

-- Only among Empleados not dados de baja, so a retired Empleado's email can be reused. Scoped per Negocio.
CREATE UNIQUE INDEX "Employee_businessId_email_ci_key" ON "Employee"("businessId", lower("email")) WHERE "retiredAt" IS NULL;

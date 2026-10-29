CREATE TABLE "Event" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "speakerBio" TEXT,
    "category" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "initialCount" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "agenda" JSONB,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("email")
);

CREATE TABLE "Enrollment" (
    "studentEmail" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("studentEmail", "eventId")
);

CREATE TABLE "Favorite" (
    "studentEmail" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("studentEmail", "eventId")
);

CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_studentEmail_eventId_key" ON "Review"("studentEmail", "eventId");
CREATE INDEX "Enrollment_eventId_idx" ON "Enrollment"("eventId");
CREATE INDEX "Favorite_eventId_idx" ON "Favorite"("eventId");
CREATE INDEX "Review_eventId_idx" ON "Review"("eventId");

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);

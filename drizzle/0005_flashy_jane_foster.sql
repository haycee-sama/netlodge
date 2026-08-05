ALTER TABLE "landlords" ADD COLUMN "lease_config" jsonb DEFAULT '{
    "enabled": { "fullYear": true, "perSemester": false, "halfYear": false },
    "reminderDays": "30",
    "minStay": "fullYear"
  }'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "landlords" ADD COLUMN "notification_preferences" jsonb DEFAULT '{
    "newBookingRequests": true,
    "paymentReleased": true,
    "disputesFiled": true,
    "leaseExpiryReminders": true,
    "platformUpdates": false
  }'::jsonb NOT NULL;
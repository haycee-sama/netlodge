// ─── NetLodge translation dictionaries ───────────────────────────────
// Keys are grouped by domain (nav, footer, hero, home, search, properties,
// propertyDetail, roomDetail, universities, howItWorks, safety, help,
// contact, auth, booking, common).
//
// Translation rules:
//   1. Translate meaning, not words. Use natural idioms in each language.
//   2. Keep brand names (NetLodge, Paystack, UNILAG, UNN) untranslated.
//   3. Keep common Nigerian tech terms (Wi-Fi, CCTV, Dashboard, Email)
//      either untranslated or in their widely-used local form.
//   4. Placeholders like {n}, {shortName}, {x}, {y} must be preserved.

export type Locale = "en" | "ig" | "yo" | "ha";

export const LOCALES: { value: Locale; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "ig", label: "Igbo", nativeLabel: "Igbo" },
  { value: "yo", label: "Yoruba", nativeLabel: "Yorùbá" },
  { value: "ha", label: "Hausa", nativeLabel: "Hausa" },
];

export type TranslationKey =
  // Navigation
  | "nav.search"
  | "nav.universities"
  | "nav.properties"
  | "nav.howItWorks"
  | "nav.safety"
  | "nav.help"
  | "nav.signIn"
  | "nav.getStarted"
  | "nav.dashboard"
  | "nav.signOut"
  | "nav.viewSite"
  | "nav.goToDashboard"
  | "nav.signedInAs"
  | "nav.settings"
  | "nav.signingOut"
  | "nav.openMenu"
  | "nav.closeMenu"
  | "nav.navigationMenu"
  | "nav.primaryNav"
  | "hero.search.advancedFilters"
  | "hero.search.searchButton"
  | "legal.eyebrow"
  | "legal.cookies.title"
  | "legal.cookies.description"
  | "legal.privacy.title"
  | "legal.privacy.description"
  | "legal.terms.title"
  | "legal.terms.description"
  | "propertyDetail.floors"
  | "propertyDetail.totalUnits"
  | "propertyDetail.availableUnits"
  | "propertyDetail.breadcrumb"
  | "propertyDetail.home"
  | "propertyDetail.eachUnitBookable"
  | "propertyDetail.buildingWideFacilities"
  | "propertyDetail.addressSharedAfterBooking"
  | "roomDetail.bookingTerms"
  | "roomDetail.unitCurrently"
  | "roomDetail.furnishing"
  | "roomDetail.noPhotos.title"
  | "roomDetail.noPhotos.desc"
  | "roomDetail.capacity"
  | "roomDetail.size"
  | "roomDetail.person"
  | "roomDetail.people"
  | "roomDetail.previous"
  | "roomDetail.next"
  | "error.title"
  | "error.description"
  | "error.retry"
  | "hero.search.ariaLabel"
  | "hero.search.placeholder"
  | "hero.search.budget"
  | "common.unit"
  | "nav.agent.assignments"
  | "nav.agent.dashboard"
  | "nav.agent.enquiries"
  | "nav.agent.notifications"
  | "nav.agent.profile"
  | "nav.agent.properties"
  | "nav.agent.referrals"
  | "nav.agent.settings"
  | "nav.financeAdmin.auditTrail"
  | "nav.financeAdmin.commissions"
  | "nav.financeAdmin.disputes"
  | "nav.financeAdmin.payments"
  | "nav.financeAdmin.payouts"
  | "nav.financeAdmin.reconciliation"
  | "nav.financeAdmin.refunds"
  | "nav.financeAdmin.reports"
  | "nav.financeAdmin.transactions"
  | "nav.group.account"
  | "nav.group.configuration"
  | "nav.group.marketplaceOversight"
  | "nav.group.operations"
  | "nav.group.platform"
  | "nav.group.submissions"
  | "nav.group.trustSystem"
  | "nav.group.workspace"
  | "nav.landlord.availability"
  | "nav.landlord.bookings"
  | "nav.landlord.dashboard"
  | "nav.landlord.getStarted"
  | "nav.landlord.notifications"
  | "nav.landlord.payouts"
  | "nav.landlord.pricing"
  | "nav.landlord.profile"
  | "nav.landlord.properties"
  | "nav.landlord.reports"
  | "nav.landlord.settings"
  | "nav.landlord.staff"
  | "nav.landlord.transactions"
  | "nav.landlord.verification"
  | "nav.manager.availability"
  | "nav.manager.bookings"
  | "nav.manager.dashboard"
  | "nav.manager.inspections"
  | "nav.manager.notifications"
  | "nav.manager.profile"
  | "nav.manager.properties"
  | "nav.manager.rooms"
  | "nav.manager.settings"
  | "nav.student.bookings"
  | "nav.student.dashboard"
  | "nav.student.findAccommodation"
  | "nav.student.notifications"
  | "nav.student.payments"
  | "nav.student.profile"
  | "nav.student.saved"
  | "nav.student.security"
  | "nav.student.settings"
  | "nav.student.support"
  | "nav.superAdmin.announcements"
  | "nav.superAdmin.auditLogs"
  | "nav.superAdmin.commissions"
  | "nav.superAdmin.facilities"
  | "nav.superAdmin.finance"
  | "nav.superAdmin.integrations"
  | "nav.superAdmin.locations"
  | "nav.superAdmin.overview"
  | "nav.superAdmin.rolesPermissions"
  | "nav.superAdmin.security"
  | "nav.superAdmin.staff"
  | "nav.superAdmin.support"
  | "nav.superAdmin.systemHealth"
  | "nav.superAdmin.testimonials"
  | "nav.superAdmin.universities"
  | "nav.superAdmin.users"
  | "nav.superAdmin.verifications"
  | "nav.supportStaff.conversations"
  | "nav.supportStaff.customers"
  | "nav.supportStaff.escalations"
  | "nav.supportStaff.knowledgeBase"
  | "nav.supportStaff.reports"
  | "nav.supportStaff.tickets"
  | "nav.verificationOfficer.decisionHistory"
  | "nav.verificationOfficer.escalations"
  | "nav.verificationOfficer.landlords"
  | "nav.verificationOfficer.properties"
  | "nav.verificationOfficer.reviewQueue"
  | "nav.verificationOfficer.roomEvidence"
  | "nav.verificationOfficer.studentKyc"
  | "shell.dashboard"
  | "shell.mainNav"
  | "shell.openMenu"
  | "shell.profile"
  | "shell.settings"
  | "shell.signOut"
  | "shell.signingOut"
  | "shell.viewSite"
  | "common.maintenance.booking"
  | "common.maintenance.cat.appliance"
  | "common.maintenance.cat.cleanliness"
  | "common.maintenance.cat.electrical"
  | "common.maintenance.cat.other"
  | "common.maintenance.cat.pestControl"
  | "common.maintenance.cat.plumbing"
  | "common.maintenance.cat.security"
  | "common.maintenance.cat.structural"
  | "common.maintenance.category"
  | "common.maintenance.couldNotLoad"
  | "common.maintenance.couldNotSubmit"
  | "common.maintenance.couldNotUpdate"
  | "common.maintenance.descLandlord"
  | "common.maintenance.descStudent"
  | "common.maintenance.descriptionLabel"
  | "common.maintenance.descriptionPlaceholder"
  | "common.maintenance.eyebrowLandlord"
  | "common.maintenance.eyebrowStudent"
  | "common.maintenance.fillRequired"
  | "common.maintenance.markResolved"
  | "common.maintenance.markedAs"
  | "common.maintenance.newRequest"
  | "common.maintenance.noRequests.descLandlord"
  | "common.maintenance.noRequests.descStudentHasBooking"
  | "common.maintenance.noRequests.descStudentNoBooking"
  | "common.maintenance.noRequests.title"
  | "common.maintenance.prio.high"
  | "common.maintenance.prio.low"
  | "common.maintenance.prio.medium"
  | "common.maintenance.prio.urgent"
  | "common.maintenance.priority"
  | "common.maintenance.reportIssueDesc"
  | "common.maintenance.reportIssueTitle"
  | "common.maintenance.requestSubmittedDesc"
  | "common.maintenance.requestSubmittedTitle"
  | "common.maintenance.resolution"
  | "common.maintenance.resolutionNotesPrompt"
  | "common.maintenance.resolvedAt"
  | "common.maintenance.selectBooking"
  | "common.maintenance.selectValidBooking"
  | "common.maintenance.startWorking"
  | "common.maintenance.submitRequest"
  | "common.maintenance.title"
  | "common.maintenance.titleLabel"
  | "common.maintenance.titlePlaceholder"
  | "common.maintenance.urgent"
  | "common.messaging.conversations"
  | "common.messaging.couldNotLoadConversations"
  | "common.messaging.couldNotLoadMessages"
  | "common.messaging.couldNotSend"
  | "common.messaging.descLandlord"
  | "common.messaging.descStudent"
  | "common.messaging.eyebrow"
  | "common.messaging.noConversations"
  | "common.messaging.noMessagesYet"
  | "common.messaging.selectConversation.desc"
  | "common.messaging.selectConversation.title"
  | "common.messaging.signInPrompt"
  | "common.messaging.title"
  | "common.messaging.typePlaceholder"
  | "common.notifications.allCaughtUp"
  | "common.notifications.allMarkedRead"
  | "common.notifications.couldNotMarkAll"
  | "common.notifications.couldNotMarkRead"
  | "common.notifications.eyebrow"
  | "common.notifications.markAllRead"
  | "common.notifications.markAsRead"
  | "common.notifications.new"
  | "common.notifications.noNotifications.desc"
  | "common.notifications.noNotifications.title"
  | "common.notifications.signInPrompt"
  | "common.notifications.title"
  | "common.notifications.unreadDesc.plural"
  | "common.notifications.unreadDesc.singular"
  | "common.notifications.view"
  | "common.profile.bio"
  | "common.profile.bioPlaceholder"
  | "common.profile.couldNotLoad"
  | "common.profile.couldNotSave"
  | "common.profile.description"
  | "common.profile.email"
  | "common.profile.emailHelp"
  | "common.profile.eyebrow"
  | "common.profile.firstName"
  | "common.profile.lastName"
  | "common.profile.phone"
  | "common.profile.saveChanges"
  | "common.profile.saved"
  | "common.profile.saving"
  | "common.profile.signInPrompt"
  | "common.profile.title"
  | "common.settings.account"
  | "common.settings.appearance"
  | "common.settings.colourTheme"
  | "common.settings.colourThemeDesc"
  | "common.settings.couldNotLoadPrefs"
  | "common.settings.currency"
  | "common.settings.currencyNgn"
  | "common.settings.description"
  | "common.settings.eyebrow"
  | "common.settings.language"
  | "common.settings.locale"
  | "common.settings.notif.digestDesc"
  | "common.settings.notif.digestLabel"
  | "common.settings.notif.emailDesc"
  | "common.settings.notif.emailLabel"
  | "common.settings.notif.pushDesc"
  | "common.settings.notif.pushLabel"
  | "common.settings.notif.smsDesc"
  | "common.settings.notif.smsLabel"
  | "common.settings.notif.urgentDesc"
  | "common.settings.notif.urgentLabel"
  | "common.settings.notifications"
  | "common.settings.role"
  | "common.settings.title"
  | "landlord.bookings.description"
  | "landlord.bookings.eyebrow"
  | "landlord.bookings.noBookings.desc"
  | "landlord.bookings.noBookings.title"
  | "landlord.bookings.signInPrompt"
  | "landlord.bookings.title"
  | "landlord.dashboard.activity"
  | "landlord.dashboard.addProperty"
  | "landlord.dashboard.addPropertyDesc"
  | "landlord.dashboard.allProperties"
  | "landlord.dashboard.available"
  | "landlord.dashboard.checkVerification"
  | "landlord.dashboard.couldNotLoad"
  | "landlord.dashboard.description"
  | "landlord.dashboard.due"
  | "landlord.dashboard.eyebrow"
  | "landlord.dashboard.manageRooms"
  | "landlord.dashboard.needsAttention"
  | "landlord.dashboard.noBookings.desc"
  | "landlord.dashboard.noBookings.title"
  | "landlord.dashboard.noPendingPayments"
  | "landlord.dashboard.noProperties.desc"
  | "landlord.dashboard.noProperties.title"
  | "landlord.dashboard.occupancy"
  | "landlord.dashboard.occupancyHint"
  | "landlord.dashboard.occupancyLabel"
  | "landlord.dashboard.occupied"
  | "landlord.dashboard.payoutsDesc"
  | "landlord.dashboard.pendingBooking.plural"
  | "landlord.dashboard.pendingBooking.singular"
  | "landlord.dashboard.pendingRevenue"
  | "landlord.dashboard.pendingRevenueHint"
  | "landlord.dashboard.pendingVerification.plural"
  | "landlord.dashboard.pendingVerification.singular"
  | "landlord.dashboard.portfolio"
  | "landlord.dashboard.quickActions"
  | "landlord.dashboard.recentBookings"
  | "landlord.dashboard.revenueHint.plural"
  | "landlord.dashboard.revenueHint.singular"
  | "landlord.dashboard.signInPrompt"
  | "landlord.dashboard.title"
  | "landlord.dashboard.total"
  | "landlord.dashboard.totalRevenue"
  | "landlord.dashboard.totalUnits"
  | "landlord.dashboard.transactionsDesc"
  | "landlord.dashboard.unitsHint.plural"
  | "landlord.dashboard.unitsHint.singular"
  | "landlord.dashboard.verificationDescAllVerified"
  | "landlord.dashboard.verificationDescPending"
  | "landlord.dashboard.viewAll"
  | "landlord.dashboard.viewBookings"
  | "landlord.dashboard.yourProperties"
  | "landlord.payouts.bank"
  | "landlord.payouts.description"
  | "landlord.payouts.eyebrow"
  | "landlord.payouts.fee"
  | "landlord.payouts.gross"
  | "landlord.payouts.grossVolume"
  | "landlord.payouts.inProgress"
  | "landlord.payouts.noPayouts.desc"
  | "landlord.payouts.noPayouts.title"
  | "landlord.payouts.pending"
  | "landlord.payouts.platformFees"
  | "landlord.payouts.scheduled"
  | "landlord.payouts.settled"
  | "landlord.payouts.settledAt"
  | "landlord.payouts.settledCount.plural"
  | "landlord.payouts.settledCount.singular"
  | "landlord.payouts.signInPrompt"
  | "landlord.payouts.title"
  | "landlord.profile.businessDetails"
  | "landlord.profile.businessName"
  | "landlord.profile.businessNamePlaceholder"
  | "landlord.profile.description"
  | "landlord.profile.displayName"
  | "landlord.profile.landlordBadge"
  | "landlord.profile.officeAddress"
  | "landlord.profile.officeAddressPlaceholder"
  | "landlord.profile.rcNumber"
  | "landlord.profile.rcNumberPlaceholder"
  | "landlord.profile.saveProfile"
  | "landlord.profile.title"
  | "landlord.properties.available"
  | "landlord.properties.couldNotLoad"
  | "landlord.properties.description"
  | "landlord.properties.eyebrow"
  | "landlord.properties.floors"
  | "landlord.properties.noProperties.desc"
  | "landlord.properties.noProperties.title"
  | "landlord.properties.searchPlaceholder"
  | "landlord.properties.signInPrompt"
  | "landlord.properties.title"
  | "landlord.properties.units"
  | "landlord.settings.dark"
  | "landlord.settings.description"
  | "landlord.settings.light"
  | "landlord.settings.notif.digestDesc"
  | "landlord.settings.notif.emailDesc"
  | "landlord.settings.notif.pushDesc"
  | "landlord.settings.system"
  | "landlord.transactions.couldNotLoad"
  | "landlord.transactions.description"
  | "landlord.transactions.exportCsv"
  | "landlord.transactions.eyebrow"
  | "landlord.transactions.grossReceived"
  | "landlord.transactions.netBeforeFee"
  | "landlord.transactions.noTransactions.desc"
  | "landlord.transactions.noTransactions.title"
  | "landlord.transactions.paymentFees"
  | "landlord.transactions.receipt"
  | "landlord.transactions.receiptPdf"
  | "landlord.transactions.signInPrompt"
  | "landlord.transactions.title"
  | "shell.couldNotSignOut"
  | "shell.couldNotSignOutDesc"
  | "student.bookings.bookedAt"
  | "student.bookings.checkIn"
  | "student.bookings.checkOut"
  | "student.bookings.couldNotLoad"
  | "student.bookings.description"
  | "student.bookings.eyebrow"
  | "student.bookings.noBookings.desc"
  | "student.bookings.paidInFull"
  | "student.bookings.signInPrompt"
  | "student.bookings.title"
  | "student.dashboard.activeBookings"
  | "student.dashboard.allSettled"
  | "student.dashboard.awaitingPayment"
  | "student.dashboard.bookingAwaiting.plural"
  | "student.dashboard.bookingAwaiting.singular"
  | "student.dashboard.bookingAwaitingDesc.plural"
  | "student.dashboard.bookingAwaitingDesc.singular"
  | "student.dashboard.browseProperties"
  | "student.dashboard.completeProfile"
  | "student.dashboard.completeProfileAction"
  | "student.dashboard.completeProfileDesc"
  | "student.dashboard.couldNotLoad"
  | "student.dashboard.eyebrow"
  | "student.dashboard.getSupport"
  | "student.dashboard.holdExpired"
  | "student.dashboard.new"
  | "student.dashboard.noBookings.desc"
  | "student.dashboard.noBookings.title"
  | "student.dashboard.outstanding"
  | "student.dashboard.paid"
  | "student.dashboard.payNow"
  | "student.dashboard.paymentHistory"
  | "student.dashboard.recentBookings"
  | "student.dashboard.recentNotifications"
  | "student.dashboard.recentPayments"
  | "student.dashboard.savedProperties"
  | "student.dashboard.searchAccommodation"
  | "student.dashboard.signInPrompt"
  | "student.dashboard.title"
  | "student.dashboard.totalPaid"
  | "student.dashboard.viewAll"
  | "student.dashboard.welcome"
  | "student.dashboard.welcomeDesc"
  | "student.payments.awaiting"
  | "student.payments.backendVerified"
  | "student.payments.bookingRef"
  | "student.payments.couldNotLoad"
  | "student.payments.description"
  | "student.payments.downloadReceipt"
  | "student.payments.fee"
  | "student.payments.gateway"
  | "student.payments.noPayments.desc"
  | "student.payments.noPayments.title"
  | "student.payments.paidThisYear"
  | "student.payments.pendingPayments"
  | "student.payments.reason"
  | "student.payments.signInPrompt"
  | "student.payments.successfulPayments.plural"
  | "student.payments.successfulPayments.singular"
  | "student.payments.title"
  | "student.saved.couldNotRemove"
  | "student.saved.description"
  | "student.saved.eyebrow"
  | "student.saved.noSaved.desc"
  | "student.saved.noSaved.title"
  | "student.saved.priceOnRequest"
  | "student.saved.remove"
  | "student.saved.removedToast"
  | "student.saved.savedAt"
  | "student.saved.signInPrompt"
  | "student.saved.title"
  // Footer
  | "footer.discover"
  | "footer.trustSafety"
  | "footer.forLandlords"
  | "footer.support"
  | "footer.searchAccommodation"
  | "footer.verification"
  | "footer.bookingSafety"
  | "footer.reportListing"
  | "footer.privacyPolicy"
  | "footer.listAProperty"
  | "footer.landlordGuide"
  | "footer.termsOfService"
  | "footer.helpCentre"
  | "footer.contactUs"
  | "footer.cookiePolicy"
  | "footer.description"
  | "footer.copyright"
  | "footer.verificationNote"
  // Hero
  | "hero.titlePrefix"
  | "hero.titleHighlight"
  | "hero.titleSuffix"
  | "hero.findYourKind"
  | "hero.popularUniversities"
  | "hero.howItWorks"
  | "hero.browseAll"
  | "hero.viewAll"
  | "hero.title"
  | "hero.subtitle"
  | "hero.browse"
  | "hero.listProperty"
  | "hero.stats.verifiedProperties"
  | "hero.stats.availableRooms"
  | "hero.stats.universities"
  // Homepage sections
  | "home.whereWeAre.eyebrow"
  | "home.whereWeAre.title"
  | "home.whereWeAre.viewAll"
  | "home.whereWeAre.verified"
  | "home.whereWeAre.pending"
  | "home.categories.eyebrow"
  | "home.categories.title"
  | "home.categories.subtitle"
  | "home.categories.selfContain"
  | "home.categories.singleRoom"
  | "home.categories.sharedRoom"
  | "home.categories.bedSpace"
  | "home.categories.apartment"
  | "home.categories.studio"
  | "home.benefits.eyebrow"
  | "home.benefits.title"
  | "home.benefits.subtitle"
  | "home.benefits.verifiedListing.title"
  | "home.benefits.verifiedListing.desc"
  | "home.benefits.bookActualRoom.title"
  | "home.benefits.bookActualRoom.desc"
  | "home.benefits.holdBeforePay.title"
  | "home.benefits.holdBeforePay.desc"
  | "home.benefits.transparentPricing.title"
  | "home.benefits.transparentPricing.desc"
  | "home.faqs.eyebrow"
  | "home.faqs.title"
  | "home.faqs.subtitle"
  | "home.faqs.q1"
  | "home.faqs.a1"
  | "home.faqs.q2"
  | "home.faqs.a2"
  | "home.faqs.q3"
  | "home.faqs.a3"
  | "home.faqs.q4"
  | "home.faqs.a4"
  | "home.faqs.q5"
  | "home.faqs.a5"
  | "home.faqs.q6"
  | "home.faqs.a6"
  | "home.trust.eyebrow"
  | "home.trust.title"
  | "home.trust.subtitle"
  | "home.trust.step1.title"
  | "home.trust.step1.desc"
  | "home.trust.step2.title"
  | "home.trust.step2.desc"
  | "home.trust.step3.title"
  | "home.trust.step3.desc"
  | "home.trust.step4.title"
  | "home.trust.step4.desc"
  | "home.featuredProperty.view"
  | "home.featured.eyebrow"
  | "home.featured.title"
  | "home.featured.description"
  | "home.featured.viewAll"
  | "home.featured.emptyState"
  | "home.fresh.eyebrow"
  | "home.fresh.title"
  | "home.fresh.description"
  | "home.fresh.ariaLabel"
  | "home.studentBenefits.eyebrow"
  | "home.studentBenefits.title"
  | "home.studentBenefits.description"
  | "home.studentBenefits.builtForCampus.title"
  | "home.studentBenefits.builtForCampus.desc"
  | "home.studentBenefits.safeHolds.title"
  | "home.studentBenefits.safeHolds.desc"
  | "home.studentBenefits.honestListings.title"
  | "home.studentBenefits.honestListings.desc"
  | "home.studentBenefits.realSupport.title"
  | "home.studentBenefits.realSupport.desc"
  | "home.studentBenefits.createAccount"
  | "home.landlordCta.eyebrow"
  | "home.landlordCta.title"
  | "home.landlordCta.description"
  | "home.landlordCta.feature1"
  | "home.landlordCta.feature2"
  | "home.landlordCta.feature3"
  | "home.landlordCta.feature4"
  | "home.landlordCta.startListing"
  | "home.landlordCta.guide"
  | "home.howItWorksCta.title"
  | "home.howItWorksCta.description"
  | "home.howItWorksCta.browse"
  | "home.howItWorksCta.howItWorks"
  | "home.testimonials.eyebrow"
  | "home.testimonials.title"
  | "home.testimonials.description"
  // Search page
  | "search.eyebrow"
  | "search.title"
  | "search.description"
  | "search.placeholder"
  | "search.sortBy"
  | "search.sortRelevance"
  | "search.sortPriceAsc"
  | "search.sortPriceDesc"
  | "search.sortNewest"
  | "search.university"
  | "search.anyUniversity"
  | "search.neighbourhood"
  | "search.anyNeighbourhood"
  | "search.annualRent"
  | "search.min"
  | "search.max"
  | "search.unitType"
  | "search.facilities"
  | "search.resetAll"
  | "search.filters"
  | "search.activeCount"
  | "search.searching"
  | "search.resultsCount"
  | "search.resultSingular"
  | "search.clearFilters"
  | "search.listView"
  | "search.mapView"
  | "search.noMatches.title"
  | "search.noMatches.description"
  // Properties list page
  | "properties.eyebrow"
  | "properties.title"
  | "properties.description"
  | "properties.placeholder"
  | "properties.allUniversities"
  | "properties.error.title"
  | "properties.retry"
  | "properties.empty.title"
  | "properties.empty.description"
  | "properties.showing"
  | "properties.previous"
  | "properties.next"
  | "properties.pageOf"
  | "properties.landlordCta.prefix"
  | "properties.landlordCta.action"
  // Property detail page
  | "propertyDetail.notFound.title"
  | "propertyDetail.notFound.description"
  | "propertyDetail.aboutProperty"
  | "propertyDetail.facilities"
  | "propertyDetail.floorsAndRooms"
  | "propertyDetail.location"
  | "propertyDetail.reviews"
  | "propertyDetail.availableRooms"
  | "propertyDetail.fromPrice"
  | "propertyDetail.viewRooms"
  | "propertyDetail.viewRoom"
  | "propertyDetail.browseRooms"
  | "propertyDetail.noRooms.title"
  | "propertyDetail.noRooms.description"
  | "propertyDetail.similarProperties"
  | "propertyDetail.save"
  | "propertyDetail.saved"
  | "propertyDetail.verified"
  | "propertyDetail.pending"
  | "propertyDetail.priceFrom"
  | "propertyDetail.listingsCount"
  | "propertyDetail.contactLandlord"
  | "propertyDetail.viewProperty"
  // Room detail page
  | "roomDetail.notFound.title"
  | "roomDetail.notFound.description"
  | "roomDetail.aboutRoom"
  | "roomDetail.facilities"
  | "roomDetail.pricingBreakdown"
  | "roomDetail.baseRent"
  | "roomDetail.serviceFee"
  | "roomDetail.cautionDeposit"
  | "roomDetail.additionalCharges"
  | "roomDetail.total"
  | "roomDetail.rentalPeriod"
  | "roomDetail.checkInDate"
  | "roomDetail.selectCheckIn"
  | "roomDetail.acceptTerms"
  | "roomDetail.placeHold"
  | "roomDetail.confirmHold"
  | "roomDetail.holdPlaced.title"
  | "roomDetail.holdPlaced.description"
  | "roomDetail.signUpToBook"
  | "roomDetail.pricingUnavailable"
  | "roomDetail.gallery"
  | "roomDetail.roomType"
  | "roomDetail.status"
  | "roomDetail.available"
  | "roomDetail.booked"
  | "roomDetail.held"
  | "roomDetail.landlord"
  | "roomDetail.viewProperty"
  | "roomDetail.bedrooms"
  | "roomDetail.bathrooms"
  | "roomDetail.area"
  | "roomDetail.backToProperty"
  // Universities list page
  | "universities.eyebrow"
  | "universities.title"
  | "universities.description"
  | "universities.error"
  | "universities.empty"
  | "universities.listingsCount"
  | "universities.comingSoon.eyebrow"
  | "universities.comingSoon.title"
  | "universities.comingSoon.description"
  | "universities.comingSoon.soon"
  | "universities.requestCampus.prefix"
  | "universities.requestCampus.action"
  | "universities.requestCampus.suffix"
  // University detail page
  | "universityDetail.listingsCount"
  | "universityDetail.neighbourhoods.eyebrow"
  | "universityDetail.neighbourhoods.description"
  | "universityDetail.neighbourhoods.empty"
  | "universityDetail.neighbourhoods.priceVaries"
  | "universityDetail.neighbourhoods.typicalPerYear"
  | "universityDetail.properties.eyebrow"
  | "universityDetail.properties.viewAll"
  | "universityDetail.properties.empty.title"
  | "universityDetail.properties.empty.action"
  | "universityDetail.related.eyebrow"
  | "universityDetail.related.title"
  // How it works page
  | "howItWorks.eyebrow"
  | "howItWorks.title"
  | "howItWorks.description"
  | "howItWorks.students.eyebrow"
  | "howItWorks.students.title"
  | "howItWorks.students.description"
  | "howItWorks.students.search.title"
  | "howItWorks.students.search.desc"
  | "howItWorks.students.inspect.title"
  | "howItWorks.students.inspect.desc"
  | "howItWorks.students.hold.title"
  | "howItWorks.students.hold.desc"
  | "howItWorks.students.pay.title"
  | "howItWorks.students.pay.desc"
  | "howItWorks.students.moveIn.title"
  | "howItWorks.students.moveIn.desc"
  | "howItWorks.students.startSearch"
  | "howItWorks.landlords.eyebrow"
  | "howItWorks.landlords.title"
  | "howItWorks.landlords.description"
  | "howItWorks.landlords.verified.title"
  | "howItWorks.landlords.verified.desc"
  | "howItWorks.landlords.listProperty.title"
  | "howItWorks.landlords.listProperty.desc"
  | "howItWorks.landlords.organiseRooms.title"
  | "howItWorks.landlords.organiseRooms.desc"
  | "howItWorks.landlords.assignStaff.title"
  | "howItWorks.landlords.assignStaff.desc"
  | "howItWorks.landlords.getPaid.title"
  | "howItWorks.landlords.getPaid.desc"
  | "howItWorks.landlords.startListing"
  | "howItWorks.booking.eyebrow"
  | "howItWorks.booking.title"
  | "howItWorks.booking.description"
  | "howItWorks.booking.step1"
  | "howItWorks.booking.step2"
  | "howItWorks.booking.step3"
  | "howItWorks.booking.step4"
  | "howItWorks.booking.step5"
  | "howItWorks.booking.step6"
  | "howItWorks.booking.step7"
  | "howItWorks.booking.step8"
  | "howItWorks.booking.disclaimer"
  // Safety page
  | "safety.eyebrow"
  | "safety.title"
  | "safety.description"
  | "safety.landlordVerification.eyebrow"
  | "safety.landlordVerification.title"
  | "safety.landlordVerification.description"
  | "safety.verification.identity.title"
  | "safety.verification.identity.desc"
  | "safety.verification.address.title"
  | "safety.verification.address.desc"
  | "safety.verification.ownership.title"
  | "safety.verification.ownership.desc"
  | "safety.verification.inspection.title"
  | "safety.verification.inspection.desc"
  | "safety.bookingSafety.eyebrow"
  | "safety.bookingSafety.title"
  | "safety.bookingSafety.description"
  | "safety.bookingSafety.fundsHeld"
  | "safety.bookingSafety.backendVerifies"
  | "safety.bookingSafety.cautionTracked"
  | "safety.bookingSafety.payoutsAfterConfirm"
  | "safety.bookingSafety.refundsProcessed"
  | "safety.bookingSafety.auditTrail"
  | "safety.tips.eyebrow"
  | "safety.tips.title"
  | "safety.tips.description"
  | "safety.tips.tip1"
  | "safety.tips.tip2"
  | "safety.tips.tip3"
  | "safety.tips.tip4"
  | "safety.tips.tip5"
  | "safety.report.eyebrow"
  | "safety.report.title"
  | "safety.report.description"
  | "safety.report.action"
  | "safety.refund.title"
  | "safety.refund.description"
  | "safety.refund.viewTerms"
  // Help centre page
  | "help.eyebrow"
  | "help.title"
  | "help.description"
  | "help.searchPlaceholder"
  | "help.searchLabel"
  | "help.categories.eyebrow"
  | "help.categories.title"
  | "help.categories.findingAccommodation.title"
  | "help.categories.findingAccommodation.desc"
  | "help.categories.bookings.title"
  | "help.categories.bookings.desc"
  | "help.categories.payments.title"
  | "help.categories.payments.desc"
  | "help.categories.verification.title"
  | "help.categories.verification.desc"
  | "help.categories.listing.title"
  | "help.categories.listing.desc"
  | "help.categories.account.title"
  | "help.categories.account.desc"
  | "help.faqs.eyebrow"
  | "help.faqs.title"
  | "help.faqs.finding.q1" | "help.faqs.finding.a1"
  | "help.faqs.finding.q2" | "help.faqs.finding.a2"
  | "help.faqs.finding.q3" | "help.faqs.finding.a3"
  | "help.faqs.bookings.q1" | "help.faqs.bookings.a1"
  | "help.faqs.bookings.q2" | "help.faqs.bookings.a2"
  | "help.faqs.bookings.q3" | "help.faqs.bookings.a3"
  | "help.faqs.payments.q1" | "help.faqs.payments.a1"
  | "help.faqs.payments.q2" | "help.faqs.payments.a2"
  | "help.faqs.payments.q3" | "help.faqs.payments.a3"
  | "help.faqs.listing.q1" | "help.faqs.listing.a1"
  | "help.faqs.listing.q2" | "help.faqs.listing.a2"
  | "help.faqs.listing.q3" | "help.faqs.listing.a3"
  | "help.contactCta.title"
  | "help.contactCta.description"
  | "help.contactCta.action"
  // Contact page
  | "contact.eyebrow"
  | "contact.title"
  | "contact.description"
  | "contact.form.yourName"
  | "contact.form.email"
  | "contact.form.category"
  | "contact.form.subject"
  | "contact.form.message"
  | "contact.form.messagePlaceholder"
  | "contact.form.send"
  | "contact.form.sending"
  | "contact.form.categoryGeneral"
  | "contact.form.categoryPress"
  | "contact.form.categoryPartnership"
  | "contact.form.categorySupport"
  | "contact.form.categorySafety"
  | "contact.success.title"
  | "contact.success.description"
  | "contact.success.sendAnother"
  | "contact.sidebar.otherWays"
  | "contact.sidebar.responseTimes"
  | "contact.sidebar.generalEnquiries"
  | "contact.sidebar.supportTickets"
  | "contact.sidebar.safetyReports"
  | "contact.sidebar.contactDetailsPending"
  | "contact.toast.success.title"
  | "contact.toast.success.description"
  | "contact.toast.error.title"
  // Common UI
  | "common.loading"
  | "common.save"
  | "common.cancel"
  | "common.retry"
  | "common.back"
  | "common.viewAll"
  | "common.signIn"
  | "common.signUp"
  // Booking
  | "booking.placeHold"
  | "booking.checkIn"
  | "booking.rentalPeriod"
  | "booking.acceptTerms"
  | "booking.confirmHold"
  | "booking.holdPlaced"
  | "booking.signUpToBook"
  // Auth
  | "auth.welcomeBack"
  | "auth.signInToContinue"
  | "auth.createAccount"
  | "auth.forgotPassword"
  | "auth.email"
  | "auth.password"
  | "auth.signIn"
  | "auth.register"
  | "auth.rememberMe"
  | "auth.noAccount"
  | "auth.createOne"
  | "auth.signingIn"
  | "auth.invalidCredentials";

export type Translations = Record<TranslationKey, string>;

// ─── English ──────────────────────────────────────────────────────────
const en: Translations = {
  "nav.search": "Search",
  "nav.universities": "Universities",
  "nav.properties": "Properties",
  "nav.howItWorks": "How it works",
  "nav.safety": "Safety",
  "nav.help": "Help",
  "nav.signIn": "Sign in",
  "nav.getStarted": "Get started",
  "nav.dashboard": "Dashboard",
  "nav.signOut": "Sign out",
  "nav.viewSite": "View site",
  "nav.goToDashboard": "Go to dashboard",
  "nav.signedInAs": "Signed in as",
  "nav.settings": "Settings",
  "nav.signingOut": "Signing out…",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.navigationMenu": "Navigation menu",
  "nav.primaryNav": "Primary",
  "footer.discover": "Discover",
  "footer.trustSafety": "Trust & safety",
  "footer.forLandlords": "For landlords",
  "footer.support": "Support",
  "footer.searchAccommodation": "Search accommodation",
  "footer.verification": "Verification",
  "footer.bookingSafety": "Booking safety",
  "footer.reportListing": "Report a listing",
  "footer.privacyPolicy": "Privacy policy",
  "footer.listAProperty": "List a property",
  "footer.landlordGuide": "Landlord guide",
  "footer.termsOfService": "Terms of service",
  "footer.helpCentre": "Help centre",
  "footer.contactUs": "Contact us",
  "footer.cookiePolicy": "Cookie policy",
  "footer.description": "NetLodge is the verified marketplace for student accommodation around Nigerian universities — book rooms, not just buildings.",
  "footer.copyright": "Built for Nigerian students.",
  "footer.verificationNote": "All listings go through identity and ownership verification.",
  "hero.titlePrefix": "Find your",
  "hero.titleHighlight": "verified",
  "hero.titleSuffix": "student home in Nigeria.",
  "hero.findYourKind": "Find your kind of space",
  "hero.popularUniversities": "Popular universities",
  "hero.howItWorks": "How it works",
  "hero.browseAll": "Browse all",
  "hero.viewAll": "View all",
  "hero.title": "Find your verified student home in Nigeria.",
  "hero.subtitle": "NetLodge is the marketplace for student accommodation around Nigerian universities. Browse individual rooms, inspect facilities, and book the actual unit you'll live in — not just the building it sits in.",
  "hero.browse": "Browse accommodation",
  "hero.listProperty": "List your property",
  "hero.stats.verifiedProperties": "Verified properties",
  "hero.stats.availableRooms": "Available rooms",
  "hero.stats.universities": "Universities",
  "home.whereWeAre.eyebrow": "Where you'll find us",
  "home.whereWeAre.title": "Campuses we serve",
  "home.whereWeAre.viewAll": "All campuses",
  "home.whereWeAre.verified": "Verified",
  "home.whereWeAre.pending": "Pending verification",
  "home.categories.eyebrow": "Browse by room type",
  "home.categories.title": "Pick a space that fits your life",
  "home.categories.subtitle": "From self-contain to shared rooms, every option is a real unit you can inspect and book.",
  "home.categories.selfContain": "Self-contain",
  "home.categories.singleRoom": "Single room",
  "home.categories.sharedRoom": "Shared room",
  "home.categories.bedSpace": "Bed space",
  "home.categories.apartment": "Apartment",
  "home.categories.studio": "Studio",
  "home.benefits.eyebrow": "Why NetLodge",
  "home.benefits.title": "Built for verified student housing",
  "home.benefits.subtitle": "Every listing is verified, every unit is real, and every payment is backend-confirmed.",
  "home.benefits.verifiedListing.title": "Verified listings only",
  "home.benefits.verifiedListing.desc": "Every landlord on NetLodge passes identity, address and ownership verification before listings go live. No more guesswork.",
  "home.benefits.bookActualRoom.title": "Book the actual room",
  "home.benefits.bookActualRoom.desc": "We treat each rentable unit — room, self-contain, or apartment — as its own bookable entity. Inspect the unit, not just the building.",
  "home.benefits.holdBeforePay.title": "Hold before you pay",
  "home.benefits.holdBeforePay.desc": "Place a temporary hold on a room while you arrange payment. Holds are server-controlled — no risk of double-booking.",
  "home.benefits.transparentPricing.title": "Transparent pricing",
  "home.benefits.transparentPricing.desc": "See rent, service charges, caution deposit and platform fees upfront. No hidden agent fees, no surprise levies.",
  "home.faqs.eyebrow": "Frequently asked",
  "home.faqs.title": "Questions, answered",
  "home.faqs.subtitle": "Everything students and landlords ask before they book or list.",
  "home.faqs.q1": "How do I know a listing is real?",
  "home.faqs.a1": "Every landlord on NetLodge must complete identity, address and ownership verification. Properties are inspected before they can be booked. The verification badge on each listing tells you exactly where the landlord is in the process.",
  "home.faqs.q2": "Am I booking a room or a building?",
  "home.faqs.a2": "You book a specific rentable unit — that might be a self-contain, a single room, a bed space, or an entire apartment. Each unit has its own identifier, photos, facilities, price and availability.",
  "home.faqs.q3": "How does payment work?",
  "home.faqs.a3": "Once you initiate a booking, you receive a temporary hold and a Paystack payment link. Your booking is only confirmed after the backend confirms payment. We never declare a payment successful from the browser.",
  "home.faqs.q4": "What if I'm a landlord with 200 rooms?",
  "home.faqs.a4": "The landlord dashboard lets you organise rooms by floor, apply default prices per floor, override individual prices, and bulk-create rooms. The interface scales to hundreds of units per property.",
  "home.faqs.q5": "Which universities are supported?",
  "home.faqs.a5": "We've launched with UNILAG, Akoka, Yaba, Bariga and Somolu. Additional universities are being added — you can request your campus via the contact form.",
  "home.faqs.q6": "Can I list a property I manage for someone else?",
  "home.faqs.a6": "Yes. Property managers can be assigned to a landlord's properties with scoped permissions. Agents can manage enquiries and referrals without gaining access to landlord finances or verification controls.",
  "home.trust.eyebrow": "Trust & safety",
  "home.trust.title": "How verification works",
  "home.trust.subtitle": "Four layers stand between a landlord and a public listing. Each one is documented and reviewable.",
  "home.trust.step1.title": "Identity verification",
  "home.trust.step1.desc": "Landlords submit government-issued ID (NIN, driver's licence, or international passport).",
  "home.trust.step2.title": "Address & ownership",
  "home.trust.step2.desc": "Utility bills and ownership documents are reviewed. Inspections are scheduled where required.",
  "home.trust.step3.title": "Property inspection",
  "home.trust.step3.desc": "On-site inspection confirms the property exists as described, with the facilities claimed.",
  "home.trust.step4.title": "Verified badge",
  "home.trust.step4.desc": "Only after all checks pass does a listing earn the verified badge and become publicly bookable.",
  "home.featuredProperty.view": "View",
  "home.featured.eyebrow": "Featured properties",
  "home.featured.title": "Hand-picked verified listings",
  "home.featured.description": "A selection of recently verified properties around UNILAG. Each property contains individual bookable rooms.",
  "home.featured.viewAll": "All properties",
  "home.featured.emptyState": "We're onboarding landlords now. Verified rooms will appear here soon.",
  "home.fresh.eyebrow": "Fresh on NetLodge",
  "home.fresh.title": "Recently added rooms",
  "home.fresh.description": "Swipe through the latest verified listings.",
  "home.fresh.ariaLabel": "Recently added properties",
  "home.studentBenefits.eyebrow": "For students",
  "home.studentBenefits.title": "Why students choose NetLodge",
  "home.studentBenefits.description": "A marketplace built around how Nigerian students actually search for and secure accommodation.",
  "home.studentBenefits.builtForCampus.title": "Built for your campus",
  "home.studentBenefits.builtForCampus.desc": "Filter by university, neighbourhood and walking distance to class.",
  "home.studentBenefits.safeHolds.title": "Safe holds",
  "home.studentBenefits.safeHolds.desc": "A server-controlled hold reserves a room while you arrange payment.",
  "home.studentBenefits.honestListings.title": "Honest listings",
  "home.studentBenefits.honestListings.desc": "Room-level photos mean you see the actual unit, not just a pretty exterior.",
  "home.studentBenefits.realSupport.title": "Real support",
  "home.studentBenefits.realSupport.desc": "Open a ticket from your dashboard and a human gets back to you.",
  "home.studentBenefits.createAccount": "Create your student account",
  "home.landlordCta.eyebrow": "For landlords",
  "home.landlordCta.title": "List once. Manage hundreds of rooms.",
  "home.landlordCta.description": "The landlord dashboard handles the realities of Nigerian student housing — floor-by-floor inventory, per-room pricing, bulk operations, booking workflows, payouts and verification. Built for portfolios of 1 to 1,000 rooms.",
  "home.landlordCta.feature1": "Multi-step property wizard with draft saving",
  "home.landlordCta.feature2": "Floor-level default prices with per-room overrides",
  "home.landlordCta.feature3": "Bulk-create 200 rooms in a single action",
  "home.landlordCta.feature4": "Booking, payment and payout reconciliation in one place",
  "home.landlordCta.startListing": "Start listing",
  "home.landlordCta.guide": "Landlord guide",
  "home.howItWorksCta.title": "Ready to find your student home?",
  "home.howItWorksCta.description": "Browse verified rooms around your campus, inspect facilities online, and book the actual unit you'll live in — not just the building.",
  "home.howItWorksCta.browse": "Browse accommodation",
  "home.howItWorksCta.howItWorks": "How it works",
  "home.testimonials.eyebrow": "From the NetLodge community",
  "home.testimonials.title": "What students and landlords say",
  "home.testimonials.description": "Real reviews from verified NetLodge users. Every testimonial is reviewed by our team before publication.",
  "search.eyebrow": "Search",
  "search.title": "Find your accommodation",
  "search.description": "Filter by university, neighbourhood, budget, unit type and facilities.",
  "search.placeholder": "Property name, area, or keyword",
  "search.sortBy": "Sort by",
  "search.sortRelevance": "Relevance",
  "search.sortPriceAsc": "Price: low to high",
  "search.sortPriceDesc": "Price: high to low",
  "search.sortNewest": "Newest",
  "search.university": "University",
  "search.anyUniversity": "Any university",
  "search.neighbourhood": "Neighbourhood",
  "search.anyNeighbourhood": "Any neighbourhood",
  "search.annualRent": "Annual rent (NGN)",
  "search.min": "Min",
  "search.max": "Max",
  "search.unitType": "Unit type",
  "search.facilities": "Facilities",
  "search.resetAll": "Reset all filters",
  "search.filters": "Filters",
  "search.activeCount": "{n} active",
  "search.searching": "Searching…",
  "search.resultsCount": "{n} results",
  "search.resultSingular": "{n} result",
  "search.clearFilters": "Clear filters",
  "search.listView": "List view",
  "search.mapView": "Map view",
  "search.noMatches.title": "No matches found",
  "search.noMatches.description": "Try widening your filters — remove a budget cap, expand your neighbourhood, or change your unit type.",
  "properties.eyebrow": "Property directory",
  "properties.title": "All verified properties",
  "properties.description": "Every property below has passed identity, address and ownership verification. Each one contains individual bookable rooms, self-contain units or apartments.",
  "properties.placeholder": "Search by name, area, or keyword…",
  "properties.allUniversities": "All universities",
  "properties.error.title": "Could not load properties",
  "properties.retry": "Retry",
  "properties.empty.title": "No properties found",
  "properties.empty.description": "Try adjusting your search or check back soon as landlords list new properties.",
  "properties.showing": "Showing {x} of {y} properties",
  "properties.previous": "Previous",
  "properties.next": "Next",
  "properties.pageOf": "Page {x} of {y}",
  "properties.landlordCta.prefix": "Are you a landlord with rooms to fill?",
  "properties.landlordCta.action": "List your property",
  "propertyDetail.notFound.title": "Property not found",
  "propertyDetail.notFound.description": "This property may have been removed or is not publicly listed.",
  "propertyDetail.aboutProperty": "About this property",
  "propertyDetail.facilities": "Facilities",
  "propertyDetail.floorsAndRooms": "Floors & rooms",
  "propertyDetail.location": "Location",
  "propertyDetail.reviews": "Reviews",
  "propertyDetail.availableRooms": "Available rooms",
  "propertyDetail.fromPrice": "From",
  "propertyDetail.viewRooms": "View rooms",
  "propertyDetail.viewRoom": "View room",
  "propertyDetail.browseRooms": "Browse rooms",
  "propertyDetail.noRooms.title": "No rooms available",
  "propertyDetail.noRooms.description": "All rooms in this property are currently booked or held. Check back soon.",
  "propertyDetail.similarProperties": "Similar properties",
  "propertyDetail.save": "Save",
  "propertyDetail.saved": "Saved",
  "propertyDetail.verified": "Verified",
  "propertyDetail.pending": "Pending verification",
  "propertyDetail.priceFrom": "Price from",
  "propertyDetail.listingsCount": "{n} listings",
  "propertyDetail.contactLandlord": "Contact landlord",
  "propertyDetail.viewProperty": "View property",
  "roomDetail.notFound.title": "Room not found",
  "roomDetail.notFound.description": "This room may have been removed or is not publicly listed.",
  "roomDetail.aboutRoom": "About this room",
  "roomDetail.facilities": "Facilities",
  "roomDetail.pricingBreakdown": "Pricing breakdown",
  "roomDetail.baseRent": "Base rent",
  "roomDetail.serviceFee": "Service fee",
  "roomDetail.cautionDeposit": "Caution deposit",
  "roomDetail.additionalCharges": "Additional charges",
  "roomDetail.total": "Total",
  "roomDetail.rentalPeriod": "Rental period",
  "roomDetail.checkInDate": "Check-in date",
  "roomDetail.selectCheckIn": "Select a check-in date",
  "roomDetail.acceptTerms": "I accept the booking terms and understand a hold is reserved for 24 hours pending payment.",
  "roomDetail.placeHold": "Place hold & continue",
  "roomDetail.confirmHold": "Confirm hold",
  "roomDetail.holdPlaced.title": "Hold placed",
  "roomDetail.holdPlaced.description": "Your room is reserved for 24 hours. Complete payment from your dashboard to confirm the booking.",
  "roomDetail.signUpToBook": "Only students can book accommodation",
  "roomDetail.pricingUnavailable": "Pricing unavailable",
  "roomDetail.gallery": "Gallery",
  "roomDetail.roomType": "Room type",
  "roomDetail.status": "Status",
  "roomDetail.available": "Available",
  "roomDetail.booked": "Booked",
  "roomDetail.held": "Held",
  "roomDetail.landlord": "Landlord",
  "roomDetail.viewProperty": "View property",
  "roomDetail.bedrooms": "Bedrooms",
  "roomDetail.bathrooms": "Bathrooms",
  "roomDetail.area": "Area",
  "roomDetail.backToProperty": "Back to property",
  "universities.eyebrow": "Browse by campus",
  "universities.title": "Universities on NetLodge",
  "universities.description": "Find verified student accommodation around Nigeria's leading universities. Tap a campus to see neighbourhoods and listings.",
  "universities.error": "Could not load universities. Please try again later.",
  "universities.empty": "No universities are listed yet. Check back soon.",
  "universities.listingsCount": "{n} listings",
  "universities.comingSoon.eyebrow": "Coming soon",
  "universities.comingSoon.title": "More campuses, every term",
  "universities.comingSoon.description": "NetLodge launches with UNILAG and surrounding areas. These universities are next on our roadmap — request yours via the contact form.",
  "universities.comingSoon.soon": "soon",
  "universities.requestCampus.prefix": "Don't see your campus?",
  "universities.requestCampus.action": "Request it",
  "universities.requestCampus.suffix": "— we prioritise campuses with the most requests.",
  "universityDetail.listingsCount": "{n} listings",
  "universityDetail.neighbourhoods.eyebrow": "Popular neighbourhoods",
  "universityDetail.neighbourhoods.description": "Each neighbourhood has its own character, price range and walking distance to campus.",
  "universityDetail.neighbourhoods.empty": "No neighbourhoods listed yet.",
  "universityDetail.neighbourhoods.priceVaries": "Price varies",
  "universityDetail.neighbourhoods.typicalPerYear": "/yr typical",
  "universityDetail.properties.eyebrow": "Verified listings",
  "universityDetail.properties.viewAll": "View all",
  "universityDetail.properties.empty.title": "No verified listings yet",
  "universityDetail.properties.empty.action": "Get notified",
  "universityDetail.related.eyebrow": "Explore",
  "universityDetail.related.title": "Other universities",
  "howItWorks.eyebrow": "How it works",
  "howItWorks.title": "From search to move-in, in five steps",
  "howItWorks.description": "NetLodge makes verified student accommodation findable, inspectable and bookable — for students and landlords alike.",
  "howItWorks.students.eyebrow": "For students",
  "howItWorks.students.title": "Find and book your room",
  "howItWorks.students.description": "You book the actual rentable unit, not just the building. Each unit has its own photos, facilities and price.",
  "howItWorks.students.search.title": "Search",
  "howItWorks.students.search.desc": "Filter by university, neighbourhood, budget, unit type and facilities.",
  "howItWorks.students.inspect.title": "Inspect the unit",
  "howItWorks.students.inspect.desc": "Each room has its own photos, facilities and booking terms — not just the building.",
  "howItWorks.students.hold.title": "Place a hold",
  "howItWorks.students.hold.desc": "Reserve a room for 24 hours while you arrange payment. Holds are server-controlled.",
  "howItWorks.students.pay.title": "Pay securely",
  "howItWorks.students.pay.desc": "Pay through Paystack. Your booking is only confirmed after the backend confirms payment.",
  "howItWorks.students.moveIn.title": "Move in",
  "howItWorks.students.moveIn.desc": "Receive your landlord's contact and the exact address once your booking is confirmed.",
  "howItWorks.students.startSearch": "Start your search",
  "howItWorks.landlords.eyebrow": "For landlords",
  "howItWorks.landlords.title": "List, organise, and earn",
  "howItWorks.landlords.description": "A purpose-built dashboard for portfolios of one room to a thousand. Floor-level pricing, bulk operations, payouts.",
  "howItWorks.landlords.verified.title": "Get verified",
  "howItWorks.landlords.verified.desc": "Submit ID, address and ownership evidence. NetLodge inspects the property on-site.",
  "howItWorks.landlords.listProperty.title": "List your property",
  "howItWorks.landlords.listProperty.desc": "Use the multi-step wizard to describe the building, location, facilities and rules.",
  "howItWorks.landlords.organiseRooms.title": "Organise rooms",
  "howItWorks.landlords.organiseRooms.desc": "Create floors and rooms, set default prices per floor, override individual prices.",
  "howItWorks.landlords.assignStaff.title": "Assign staff",
  "howItWorks.landlords.assignStaff.desc": "Add managers and agents with scoped permissions — they only see what you let them.",
  "howItWorks.landlords.getPaid.title": "Get paid",
  "howItWorks.landlords.getPaid.desc": "Payouts land in your bank account after each booking is confirmed and reconciled.",
  "howItWorks.landlords.startListing": "Start listing",
  "howItWorks.booking.eyebrow": "Booking & payment integrity",
  "howItWorks.booking.title": "Why the backend — not the browser — decides.",
  "howItWorks.booking.description": "A secure booking flow has eight steps. The frontend renders each step, but only the backend can transition between them. Here's what happens behind the scenes when you book a room.",
  "howItWorks.booking.step1": "Room availability check (server-side, atomic)",
  "howItWorks.booking.step2": "Temporary hold with expiry (server-controlled)",
  "howItWorks.booking.step3": "Booking creation (server-issued reference)",
  "howItWorks.booking.step4": "Payment initiation (Paystack link)",
  "howItWorks.booking.step5": "Trusted payment confirmation (Paystack webhook → backend)",
  "howItWorks.booking.step6": "Booking confirmation (server flips status)",
  "howItWorks.booking.step7": "Payment reconciliation (fees, refunds, ledger)",
  "howItWorks.booking.step8": "Refund and payout tracking (server-settled)",
  "howItWorks.booking.disclaimer": "The frontend may display a payment as \"initiated\" but never as \"successful\" without a backend-confirmed status.",
  "safety.eyebrow": "Trust & safety",
  "safety.title": "How NetLodge keeps students safe",
  "safety.description": "Every landlord passes identity, address and ownership verification. Every property is inspected on-site. Every payment flows through Paystack with backend confirmation.",
  "safety.landlordVerification.eyebrow": "Landlord verification",
  "safety.landlordVerification.title": "Four layers of verification",
  "safety.landlordVerification.description": "A landlord earns the verified badge only after all four layers pass.",
  "safety.verification.identity.title": "Identity verification",
  "safety.verification.identity.desc": "Government-issued ID — NIN, driver's licence, or international passport.",
  "safety.verification.address.title": "Address verification",
  "safety.verification.address.desc": "Utility bill (electricity, water, or waste) dated within the last 90 days.",
  "safety.verification.ownership.title": "Ownership or management authority",
  "safety.verification.ownership.desc": "Certificate of occupancy, deed of assignment, or notarised management contract.",
  "safety.verification.inspection.title": "On-site inspection",
  "safety.verification.inspection.desc": "A NetLodge team member visits the property and confirms facilities, safety, and condition.",
  "safety.bookingSafety.eyebrow": "Booking safety",
  "safety.bookingSafety.title": "Payment protection, end-to-end",
  "safety.bookingSafety.description": "When you book a room on NetLodge, your money is handled by Paystack and reconciled by our backend. Landlords do not receive funds directly — they receive payouts after the booking is confirmed and reconciled.",
  "safety.bookingSafety.fundsHeld": "Funds held by Paystack until confirmation",
  "safety.bookingSafety.backendVerifies": "Backend verifies every payment via Paystack webhook",
  "safety.bookingSafety.cautionTracked": "Refundable caution deposit tracked separately",
  "safety.bookingSafety.payoutsAfterConfirm": "Payouts only released after booking is confirmed",
  "safety.bookingSafety.refundsProcessed": "Refunds processed for failed or cancelled bookings",
  "safety.bookingSafety.auditTrail": "Full audit trail of every transaction",
  "safety.tips.eyebrow": "Stay sharp",
  "safety.tips.title": "Safety tips for students",
  "safety.tips.description": "Even with verification, common-sense checks protect you further.",
  "safety.tips.tip1": "Always inspect the individual room before paying — not just the building.",
  "safety.tips.tip2": "Never pay outside NetLodge. Off-platform payments forfeit our protections.",
  "safety.tips.tip3": "Use the in-app messaging system to keep a written record of every agreement.",
  "safety.tips.tip4": "Take photos of the room on move-in day and share them with your landlord.",
  "safety.tips.tip5": "Report any listing that asks for off-platform payment immediately.",
  "safety.report.eyebrow": "Report a listing",
  "safety.report.title": "Spot something off?",
  "safety.report.description": "If a listing asks for off-platform payment, misrepresents the unit, or behaves suspiciously, report it via our contact form. We investigate every report within 48 hours.",
  "safety.report.action": "Report a listing",
  "safety.refund.title": "Refund policy (summary)",
  "safety.refund.description": "Full refunds are available if a booking is cancelled within 24 hours of placement or if the landlord fails to confirm. Refunds of caution deposits are issued at the end of the tenancy, less any documented damages. See our {terms} for the full policy.",
  "safety.refund.viewTerms": "terms of service",
  "help.eyebrow": "Help centre",
  "help.title": "How can we help?",
  "help.description": "Browse by category, search our FAQs, or contact our team. Most questions are answered below.",
  "help.searchPlaceholder": "Search for help articles…",
  "help.searchLabel": "Search help articles",
  "help.categories.eyebrow": "Browse by category",
  "help.categories.title": "Popular topics",
  "help.categories.findingAccommodation.title": "Finding accommodation",
  "help.categories.findingAccommodation.desc": "Search, filters, and saved properties.",
  "help.categories.bookings.title": "Bookings",
  "help.categories.bookings.desc": "Holds, confirmations, cancellations.",
  "help.categories.payments.title": "Payments & refunds",
  "help.categories.payments.desc": "Paystack, refunds, caution deposits.",
  "help.categories.verification.title": "Verification & safety",
  "help.categories.verification.desc": "How we verify, how to stay safe.",
  "help.categories.listing.title": "Listing a property",
  "help.categories.listing.desc": "Wizard, floors, rooms, pricing.",
  "help.categories.account.title": "Account & profile",
  "help.categories.account.desc": "Profile, security, roles.",
  "help.faqs.eyebrow": "Frequently asked",
  "help.faqs.title": "Browse all FAQs",
  "help.faqs.finding.q1": "How do I search for accommodation near my university?",
  "help.faqs.finding.a1": "Use the homepage search or the /search page. Filter by university, neighbourhood, budget, unit type and facilities. Results synchronise to the URL so you can bookmark or share a search.",
  "help.faqs.finding.q2": "Can I save properties to view later?",
  "help.faqs.finding.a2": "Yes. Sign in as a student, open any property, and tap the heart icon. Saved properties appear in /student/saved.",
  "help.faqs.finding.q3": "Are the photos of the actual room?",
  "help.faqs.finding.a3": "Where possible, yes. If a photo is representative rather than of the specific unit, it is labelled clearly on the room page.",
  "help.faqs.bookings.q1": "What is a temporary hold?",
  "help.faqs.bookings.a1": "A hold reserves a specific room for 24 hours while you arrange payment. Holds are server-controlled — no other student can book the same room during your hold.",
  "help.faqs.bookings.q2": "When is my booking confirmed?",
  "help.faqs.bookings.a2": "Your booking is confirmed only after our backend confirms payment from Paystack. The frontend may show 'payment initiated' but never 'successful' without backend confirmation.",
  "help.faqs.bookings.q3": "Can I cancel a booking?",
  "help.faqs.bookings.a3": "Yes. Full refunds apply within 24 hours of placing a booking, or if the landlord fails to confirm. After that, refund eligibility depends on the cancellation window in your lease terms.",
  "help.faqs.payments.q1": "How do I pay?",
  "help.faqs.payments.a1": "All payments go through Paystack. After initiating a booking you'll see a Paystack link in your dashboard. We do not accept payments outside the platform.",
  "help.faqs.payments.q2": "When is my caution deposit refunded?",
  "help.faqs.payments.a2": "At the end of your tenancy, less any documented damages. Refunds are issued to your original payment method and typically arrive within 5–7 business days.",
  "help.faqs.payments.q3": "What if a payment fails?",
  "help.faqs.payments.a3": "If Paystack reports a failure, your hold remains active until it expires. You can retry payment from your booking page. No money leaves your account on a failed attempt.",
  "help.faqs.listing.q1": "How long does verification take?",
  "help.faqs.listing.a1": "Typically 3–5 business days after you submit all evidence. On-site inspections are scheduled within that window.",
  "help.faqs.listing.q2": "Can I list 200 rooms?",
  "help.faqs.listing.a2": "Yes. The landlord dashboard supports bulk room creation, floor-level default prices, and per-room overrides. The interface is designed for portfolios of all sizes.",
  "help.faqs.listing.q3": "Can I assign a manager?",
  "help.faqs.listing.a3": "Yes. Add managers from /landlord/staff and assign them to specific properties. Managers see only their assigned properties and permitted operations.",
  "help.contactCta.title": "Still need help?",
  "help.contactCta.description": "Our support team responds within one business day.",
  "help.contactCta.action": "Contact support",
  "contact.eyebrow": "Contact us",
  "contact.title": "Get in touch",
  "contact.description": "Questions, partnership enquiries, safety reports — we read every message. Expect a response within one business day.",
  "contact.form.yourName": "Your name",
  "contact.form.email": "Email",
  "contact.form.category": "Category",
  "contact.form.subject": "Subject",
  "contact.form.message": "Message",
  "contact.form.messagePlaceholder": "Tell us how we can help…",
  "contact.form.send": "Send message",
  "contact.form.sending": "Sending…",
  "contact.form.categoryGeneral": "General enquiry",
  "contact.form.categoryPress": "Press",
  "contact.form.categoryPartnership": "Partnership",
  "contact.form.categorySupport": "Support",
  "contact.form.categorySafety": "Safety report",
  "contact.success.title": "Message sent",
  "contact.success.description": "Thanks for reaching out. We'll reply to your email within one business day.",
  "contact.success.sendAnother": "Send another message",
  "contact.sidebar.otherWays": "Other ways to reach us",
  "contact.sidebar.responseTimes": "Response times",
  "contact.sidebar.generalEnquiries": "General enquiries: 1 business day",
  "contact.sidebar.supportTickets": "Support tickets: 4 hours",
  "contact.sidebar.safetyReports": "Safety reports: 2 hours",
  "contact.sidebar.contactDetailsPending": "Contact details will be displayed here once configured. For now, use the form above — we respond within one business day.",
  "contact.toast.success.title": "Message sent",
  "contact.toast.success.description": "Our team will respond within one business day.",
  "contact.toast.error.title": "Could not send message",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.retry": "Retry",
  "common.back": "Back",
  "common.viewAll": "View all",
  "common.signIn": "Sign in",
  "common.signUp": "Sign up",
  "booking.placeHold": "Place hold & continue",
  "booking.checkIn": "Check-in date",
  "booking.rentalPeriod": "Rental period",
  "booking.acceptTerms": "I accept the booking terms and understand a hold is reserved for 24 hours pending payment.",
  "booking.confirmHold": "Confirm hold",
  "booking.holdPlaced": "Hold placed",
  "booking.signUpToBook": "Only students can book accommodation",
  "auth.welcomeBack": "Welcome back",
  "auth.signInToContinue": "Sign in to your NetLodge account to continue.",
  "auth.createAccount": "Create your account",
  "auth.forgotPassword": "Forgot password?",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign in",
  "auth.register": "Create account",
  "auth.rememberMe": "Remember me on this device",
  "auth.noAccount": "Don't have an account?",
  "auth.createOne": "Create one",
  "auth.signingIn": "Signing in…",
  "auth.invalidCredentials": "Invalid email or password.",
  "common.maintenance.booking": "Related booking",
  "common.maintenance.cat.appliance": "Appliance",
  "common.maintenance.cat.cleanliness": "Cleanliness",
  "common.maintenance.cat.electrical": "Electrical",
  "common.maintenance.cat.other": "Other",
  "common.maintenance.cat.pestControl": "Pest control",
  "common.maintenance.cat.plumbing": "Plumbing",
  "common.maintenance.cat.security": "Security",
  "common.maintenance.cat.structural": "Structural",
  "common.maintenance.category": "Category",
  "common.maintenance.couldNotLoad": "Could not load maintenance requests",
  "common.maintenance.couldNotSubmit": "Could not submit request",
  "common.maintenance.couldNotUpdate": "Could not update request",
  "common.maintenance.descLandlord": "Track and resolve maintenance requests from your tenants.",
  "common.maintenance.descStudent": "Report issues with your room and track their resolution.",
  "common.maintenance.descriptionLabel": "Description",
  "common.maintenance.descriptionPlaceholder": "Describe the issue in detail…",
  "common.maintenance.eyebrowLandlord": "Maintenance requests",
  "common.maintenance.eyebrowStudent": "Maintenance",
  "common.maintenance.fillRequired": "Please fill in all required fields",
  "common.maintenance.markResolved": "Mark as resolved",
  "common.maintenance.markedAs": "Marked as {status}",
  "common.maintenance.newRequest": "New request",
  "common.maintenance.noRequests.descLandlord": "No maintenance requests from your tenants yet.",
  "common.maintenance.noRequests.descStudentHasBooking": "No maintenance requests yet. Report an issue if something needs fixing.",
  "common.maintenance.noRequests.descStudentNoBooking": "You need an active booking to report a maintenance issue.",
  "common.maintenance.noRequests.title": "No maintenance requests",
  "common.maintenance.prio.high": "High",
  "common.maintenance.prio.low": "Low",
  "common.maintenance.prio.medium": "Medium",
  "common.maintenance.prio.urgent": "Urgent",
  "common.maintenance.priority": "Priority",
  "common.maintenance.reportIssueDesc": "Tell us what's wrong and we'll get it sorted.",
  "common.maintenance.reportIssueTitle": "Report an issue",
  "common.maintenance.requestSubmittedDesc": "Your maintenance request has been submitted. We'll be in touch soon.",
  "common.maintenance.requestSubmittedTitle": "Request submitted",
  "common.maintenance.resolution": "Resolution",
  "common.maintenance.resolutionNotesPrompt": "Add resolution notes (visible to the student)",
  "common.maintenance.resolvedAt": "Resolved on",
  "common.maintenance.selectBooking": "Select a booking",
  "common.maintenance.selectValidBooking": "Please select a valid booking",
  "common.maintenance.startWorking": "Start working on it",
  "common.maintenance.submitRequest": "Submit request",
  "common.maintenance.title": "Maintenance requests",
  "common.maintenance.titleLabel": "Title",
  "common.maintenance.titlePlaceholder": "e.g. Leaking tap in bathroom",
  "common.maintenance.urgent": "Urgent",
  "common.messaging.conversations": "Conversations",
  "common.messaging.couldNotLoadConversations": "Could not load conversations",
  "common.messaging.couldNotLoadMessages": "Could not load messages",
  "common.messaging.couldNotSend": "Could not send message",
  "common.messaging.descLandlord": "Chat with your tenants about bookings and maintenance.",
  "common.messaging.descStudent": "Chat with your landlord about your booking or room.",
  "common.messaging.eyebrow": "Messages",
  "common.messaging.noConversations": "No conversations yet",
  "common.messaging.noMessagesYet": "No messages yet",
  "common.messaging.selectConversation.desc": "Choose a conversation from the list to view messages.",
  "common.messaging.selectConversation.title": "Select a conversation",
  "common.messaging.signInPrompt": "Sign in to view your messages.",
  "common.messaging.title": "Messages",
  "common.messaging.typePlaceholder": "Type a message…",
  "common.notifications.allCaughtUp": "You're all caught up",
  "common.notifications.allMarkedRead": "All notifications marked as read",
  "common.notifications.couldNotMarkAll": "Could not mark all as read",
  "common.notifications.couldNotMarkRead": "Could not mark as read",
  "common.notifications.eyebrow": "Notifications",
  "common.notifications.markAllRead": "Mark all as read",
  "common.notifications.markAsRead": "Mark as read",
  "common.notifications.new": "New",
  "common.notifications.noNotifications.desc": "You'll see notifications here when there's activity on your account.",
  "common.notifications.noNotifications.title": "No notifications",
  "common.notifications.signInPrompt": "Sign in to view your notifications.",
  "common.notifications.title": "Notifications",
  "common.notifications.unreadDesc.plural": "You have {n} unread notifications",
  "common.notifications.unreadDesc.singular": "You have {n} unread notification",
  "common.notifications.view": "View",
  "common.profile.bio": "Bio",
  "common.profile.bioPlaceholder": "Tell us a bit about yourself…",
  "common.profile.couldNotLoad": "Could not load profile",
  "common.profile.couldNotSave": "Could not save profile",
  "common.profile.description": "Manage your personal information.",
  "common.profile.email": "Email",
  "common.profile.emailHelp": "Used for notifications and account recovery.",
  "common.profile.eyebrow": "Profile",
  "common.profile.firstName": "First name",
  "common.profile.lastName": "Last name",
  "common.profile.phone": "Phone",
  "common.profile.saveChanges": "Save changes",
  "common.profile.saved": "Profile saved",
  "common.profile.saving": "Saving…",
  "common.profile.signInPrompt": "Sign in to view your profile.",
  "common.profile.title": "Profile",
  "common.settings.account": "Account",
  "common.settings.appearance": "Appearance",
  "common.settings.colourTheme": "Colour theme",
  "common.settings.colourThemeDesc": "Choose light or dark mode, or follow your system.",
  "common.settings.couldNotLoadPrefs": "Could not load preferences",
  "common.settings.currency": "Currency",
  "common.settings.currencyNgn": "Nigerian Naira (₦)",
  "common.settings.description": "Manage your account settings and preferences.",
  "common.settings.eyebrow": "Settings",
  "common.settings.language": "Language",
  "common.settings.locale": "Display language",
  "common.settings.notif.digestDesc": "Receive a weekly summary.",
  "common.settings.notif.digestLabel": "Weekly digest",
  "common.settings.notif.emailDesc": "Receive notifications by email.",
  "common.settings.notif.emailLabel": "Email notifications",
  "common.settings.notif.pushDesc": "Receive push notifications.",
  "common.settings.notif.pushLabel": "Push notifications",
  "common.settings.notif.smsDesc": "Receive notifications by SMS.",
  "common.settings.notif.smsLabel": "SMS notifications",
  "common.settings.notif.urgentDesc": "Only receive urgent notifications.",
  "common.settings.notif.urgentLabel": "Urgent only",
  "common.settings.notifications": "Notifications",
  "common.settings.role": "Role",
  "common.settings.title": "Settings",
  "landlord.bookings.description": "Track all bookings across your properties.",
  "landlord.bookings.eyebrow": "Bookings",
  "landlord.bookings.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.bookings.noBookings.title": "No bookings yet",
  "landlord.bookings.signInPrompt": "Sign in to view your bookings.",
  "landlord.bookings.title": "Bookings",
  "landlord.dashboard.activity": "Recent activity",
  "landlord.dashboard.addProperty": "Add property",
  "landlord.dashboard.addPropertyDesc": "List a new property with rooms and floors.",
  "landlord.dashboard.allProperties": "All properties",
  "landlord.dashboard.available": "Available",
  "landlord.dashboard.checkVerification": "Check verification",
  "landlord.dashboard.couldNotLoad": "Could not load dashboard data",
  "landlord.dashboard.description": "Monitor your portfolio, bookings, revenue, and verification status.",
  "landlord.dashboard.due": "Due",
  "landlord.dashboard.eyebrow": "Dashboard",
  "landlord.dashboard.manageRooms": "Manage rooms",
  "landlord.dashboard.needsAttention": "Needs attention",
  "landlord.dashboard.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.dashboard.noBookings.title": "No bookings yet",
  "landlord.dashboard.noPendingPayments": "No pending payments",
  "landlord.dashboard.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.dashboard.noProperties.title": "No properties yet",
  "landlord.dashboard.occupancy": "Occupancy",
  "landlord.dashboard.occupancyHint": "{x} of {y} units occupied",
  "landlord.dashboard.occupancyLabel": "Occupied",
  "landlord.dashboard.occupied": "Occupied",
  "landlord.dashboard.payoutsDesc": "Track your payouts",
  "landlord.dashboard.pendingBooking.plural": "{n} pending bookings",
  "landlord.dashboard.pendingBooking.singular": "{n} pending booking",
  "landlord.dashboard.pendingRevenue": "Pending revenue",
  "landlord.dashboard.pendingRevenueHint": "From bookings awaiting payment",
  "landlord.dashboard.pendingVerification.plural": "{n} properties pending verification",
  "landlord.dashboard.pendingVerification.singular": "{n} property pending verification",
  "landlord.dashboard.portfolio": "Portfolio",
  "landlord.dashboard.quickActions": "Quick actions",
  "landlord.dashboard.recentBookings": "Recent bookings",
  "landlord.dashboard.revenueHint.plural": "From {n} bookings",
  "landlord.dashboard.revenueHint.singular": "From {n} booking",
  "landlord.dashboard.signInPrompt": "Sign in to view your landlord dashboard.",
  "landlord.dashboard.title": "Landlord dashboard",
  "landlord.dashboard.total": "Total",
  "landlord.dashboard.totalRevenue": "Total revenue",
  "landlord.dashboard.totalUnits": "Total units",
  "landlord.dashboard.transactionsDesc": "View all your transactions",
  "landlord.dashboard.unitsHint.plural": "{n} units",
  "landlord.dashboard.unitsHint.singular": "{n} unit",
  "landlord.dashboard.verificationDescAllVerified": "All your properties are verified.",
  "landlord.dashboard.verificationDescPending": "Some properties are still pending verification.",
  "landlord.dashboard.viewAll": "View all",
  "landlord.dashboard.viewBookings": "View bookings",
  "landlord.dashboard.yourProperties": "Your properties",
  "landlord.payouts.bank": "Bank",
  "landlord.payouts.description": "Track your payouts and settlement history.",
  "landlord.payouts.eyebrow": "Payouts",
  "landlord.payouts.fee": "Platform fee",
  "landlord.payouts.gross": "Gross",
  "landlord.payouts.grossVolume": "Gross volume",
  "landlord.payouts.inProgress": "In progress",
  "landlord.payouts.noPayouts.desc": "Your payouts will appear here once bookings are confirmed and settled.",
  "landlord.payouts.noPayouts.title": "No payouts yet",
  "landlord.payouts.pending": "Pending",
  "landlord.payouts.platformFees": "Platform fees",
  "landlord.payouts.scheduled": "Scheduled",
  "landlord.payouts.settled": "Settled",
  "landlord.payouts.settledAt": "Settled on",
  "landlord.payouts.settledCount.plural": "{n} settled payouts",
  "landlord.payouts.settledCount.singular": "{n} settled payout",
  "landlord.payouts.signInPrompt": "Sign in to view your payouts.",
  "landlord.payouts.title": "Payouts",
  "landlord.profile.businessDetails": "Business details",
  "landlord.profile.businessName": "Business name",
  "landlord.profile.businessNamePlaceholder": "e.g. Akoka Properties Ltd.",
  "landlord.profile.description": "Manage your landlord profile and business details.",
  "landlord.profile.displayName": "Display name",
  "landlord.profile.landlordBadge": "Landlord",
  "landlord.profile.officeAddress": "Office address",
  "landlord.profile.officeAddressPlaceholder": "e.g. 12 Allen Avenue, Ikeja",
  "landlord.profile.rcNumber": "RC number",
  "landlord.profile.rcNumberPlaceholder": "e.g. RC1234567",
  "landlord.profile.saveProfile": "Save profile",
  "landlord.profile.title": "Landlord profile",
  "landlord.properties.available": "Available",
  "landlord.properties.couldNotLoad": "Could not load properties",
  "landlord.properties.description": "Manage your property portfolio, floors, and rooms.",
  "landlord.properties.eyebrow": "Properties",
  "landlord.properties.floors": "Floors",
  "landlord.properties.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.properties.noProperties.title": "No properties yet",
  "landlord.properties.searchPlaceholder": "Search by name or area…",
  "landlord.properties.signInPrompt": "Sign in to view your properties.",
  "landlord.properties.title": "Your properties",
  "landlord.properties.units": "Units",
  "landlord.settings.dark": "Dark",
  "landlord.settings.description": "Manage your landlord preferences.",
  "landlord.settings.light": "Light",
  "landlord.settings.notif.digestDesc": "Receive a weekly summary of activity.",
  "landlord.settings.notif.emailDesc": "Receive booking and payment notifications by email.",
  "landlord.settings.notif.pushDesc": "Receive push notifications in your browser.",
  "landlord.settings.system": "System",
  "landlord.transactions.couldNotLoad": "Could not load transactions",
  "landlord.transactions.description": "Every transaction across your properties, with receipts.",
  "landlord.transactions.exportCsv": "Export CSV",
  "landlord.transactions.eyebrow": "Transactions",
  "landlord.transactions.grossReceived": "Gross received",
  "landlord.transactions.netBeforeFee": "Net before platform fee",
  "landlord.transactions.noTransactions.desc": "Transactions will appear here once you start receiving bookings.",
  "landlord.transactions.noTransactions.title": "No transactions yet",
  "landlord.transactions.paymentFees": "Payment fees",
  "landlord.transactions.receipt": "Receipt",
  "landlord.transactions.receiptPdf": "Receipt (PDF)",
  "landlord.transactions.signInPrompt": "Sign in to view your transactions.",
  "landlord.transactions.title": "Transactions",
  "shell.couldNotSignOut": "Could not sign out",
  "shell.couldNotSignOutDesc": "Please check your connection and try again.",
  "student.bookings.bookedAt": "Booked on",
  "student.bookings.checkIn": "Check-in",
  "student.bookings.checkOut": "Check-out",
  "student.bookings.couldNotLoad": "Could not load bookings",
  "student.bookings.description": "Track your active bookings, holds, and payment status.",
  "student.bookings.eyebrow": "Bookings",
  "student.bookings.noBookings.desc": "You haven't booked any rooms yet. Browse properties to get started.",
  "student.bookings.paidInFull": "Paid in full",
  "student.bookings.signInPrompt": "Sign in to view your bookings.",
  "student.bookings.title": "Your bookings",
  "student.dashboard.activeBookings": "Active bookings",
  "student.dashboard.allSettled": "All settled",
  "student.dashboard.awaitingPayment": "Awaiting payment",
  "student.dashboard.bookingAwaiting.plural": "{n} bookings awaiting payment",
  "student.dashboard.bookingAwaiting.singular": "{n} booking awaiting payment",
  "student.dashboard.bookingAwaitingDesc.plural": "Complete payment to confirm your holds before they expire.",
  "student.dashboard.bookingAwaitingDesc.singular": "Complete payment to confirm your hold before it expires.",
  "student.dashboard.browseProperties": "Browse properties",
  "student.dashboard.completeProfile": "Complete your student profile to start booking",
  "student.dashboard.completeProfileAction": "Complete profile",
  "student.dashboard.completeProfileDesc": "Add your university, matric number, and emergency contact. This takes 2 minutes.",
  "student.dashboard.couldNotLoad": "Could not load: {items}. Please refresh.",
  "student.dashboard.eyebrow": "Dashboard",
  "student.dashboard.getSupport": "Get support",
  "student.dashboard.holdExpired": "Hold expired",
  "student.dashboard.new": "New",
  "student.dashboard.noBookings.desc": "Browse properties and place a hold to start your first booking.",
  "student.dashboard.noBookings.title": "No bookings yet",
  "student.dashboard.outstanding": "Outstanding",
  "student.dashboard.paid": "Paid",
  "student.dashboard.payNow": "Pay now",
  "student.dashboard.paymentHistory": "Payment history",
  "student.dashboard.recentBookings": "Recent bookings",
  "student.dashboard.recentNotifications": "Recent notifications",
  "student.dashboard.recentPayments": "Recent payments",
  "student.dashboard.savedProperties": "Saved properties",
  "student.dashboard.searchAccommodation": "Search accommodation",
  "student.dashboard.signInPrompt": "Sign in with a real account to view your dashboard.",
  "student.dashboard.title": "Student dashboard",
  "student.dashboard.totalPaid": "Total paid",
  "student.dashboard.viewAll": "View all",
  "student.dashboard.welcome": "Welcome, {name}",
  "student.dashboard.welcomeDesc": "Manage your bookings, payments, saved properties, and support tickets.",
  "student.payments.awaiting": "Awaiting confirmation",
  "student.payments.backendVerified": "Backend verified",
  "student.payments.bookingRef": "Booking ref",
  "student.payments.couldNotLoad": "Could not load payments",
  "student.payments.description": "Every payment you've made through NetLodge, with downloadable receipts.",
  "student.payments.downloadReceipt": "Download receipt",
  "student.payments.fee": "Fee",
  "student.payments.gateway": "Gateway",
  "student.payments.noPayments.desc": "Your payments will appear here once you start booking rooms.",
  "student.payments.noPayments.title": "No payments yet",
  "student.payments.paidThisYear": "Paid this year",
  "student.payments.pendingPayments": "Pending payments",
  "student.payments.reason": "Reason",
  "student.payments.signInPrompt": "Sign in to view your payment history.",
  "student.payments.successfulPayments.plural": "{n} successful payments",
  "student.payments.successfulPayments.singular": "{n} successful payment",
  "student.payments.title": "Payment history",
  "student.saved.couldNotRemove": "Could not remove",
  "student.saved.description": "Properties you've saved to revisit later.",
  "student.saved.eyebrow": "Saved",
  "student.saved.noSaved.desc": "Tap the heart icon on any property to save it here.",
  "student.saved.noSaved.title": "No saved properties",
  "student.saved.priceOnRequest": "Price on request",
  "student.saved.remove": "Remove",
  "student.saved.removedToast": "Removed from saved",
  "student.saved.savedAt": "Saved on",
  "student.saved.signInPrompt": "Sign in to view your saved properties.",
  "student.saved.title": "Saved properties",

  "common.unit": "Unit",
  "nav.agent.assignments": "Assignments",
  "nav.agent.dashboard": "Dashboard",
  "nav.agent.enquiries": "Enquiries",
  "nav.agent.notifications": "Notifications",
  "nav.agent.profile": "Profile",
  "nav.agent.properties": "Properties",
  "nav.agent.referrals": "Referrals",
  "nav.agent.settings": "Settings",
  "nav.financeAdmin.auditTrail": "Audit trail",
  "nav.financeAdmin.commissions": "Commissions",
  "nav.financeAdmin.disputes": "Disputes",
  "nav.financeAdmin.payments": "Payments",
  "nav.financeAdmin.payouts": "Payouts",
  "nav.financeAdmin.reconciliation": "Reconciliation",
  "nav.financeAdmin.refunds": "Refunds",
  "nav.financeAdmin.reports": "Reports",
  "nav.financeAdmin.transactions": "Transactions",
  "nav.group.account": "Account",
  "nav.group.configuration": "Configuration",
  "nav.group.marketplaceOversight": "Marketplace oversight",
  "nav.group.operations": "Operations",
  "nav.group.platform": "Platform",
  "nav.group.submissions": "Submissions",
  "nav.group.trustSystem": "Trust & system",
  "nav.group.workspace": "Workspace",
  "nav.landlord.availability": "Availability",
  "nav.landlord.bookings": "Bookings",
  "nav.landlord.dashboard": "Dashboard",
  "nav.landlord.getStarted": "Get started",
  "nav.landlord.notifications": "Notifications",
  "nav.landlord.payouts": "Payouts",
  "nav.landlord.pricing": "Pricing",
  "nav.landlord.profile": "Profile",
  "nav.landlord.properties": "Properties",
  "nav.landlord.reports": "Reports",
  "nav.landlord.settings": "Settings",
  "nav.landlord.staff": "Staff",
  "nav.landlord.transactions": "Transactions",
  "nav.landlord.verification": "Verification",
  "nav.manager.availability": "Availability",
  "nav.manager.bookings": "Bookings",
  "nav.manager.dashboard": "Dashboard",
  "nav.manager.inspections": "Inspections",
  "nav.manager.notifications": "Notifications",
  "nav.manager.profile": "Profile",
  "nav.manager.properties": "Properties",
  "nav.manager.rooms": "Rooms",
  "nav.manager.settings": "Settings",
  "nav.student.bookings": "Bookings",
  "nav.student.dashboard": "Dashboard",
  "nav.student.findAccommodation": "Find accommodation",
  "nav.student.notifications": "Notifications",
  "nav.student.payments": "Payments",
  "nav.student.profile": "Profile",
  "nav.student.saved": "Saved",
  "nav.student.security": "Security",
  "nav.student.settings": "Settings",
  "nav.student.support": "Support",
  "nav.superAdmin.announcements": "Announcements",
  "nav.superAdmin.auditLogs": "Audit logs",
  "nav.superAdmin.commissions": "Commissions",
  "nav.superAdmin.facilities": "Facilities",
  "nav.superAdmin.finance": "Finance",
  "nav.superAdmin.integrations": "Integrations",
  "nav.superAdmin.locations": "Locations",
  "nav.superAdmin.overview": "Overview",
  "nav.superAdmin.rolesPermissions": "Roles & permissions",
  "nav.superAdmin.security": "Security",
  "nav.superAdmin.staff": "Staff",
  "nav.superAdmin.support": "Support",
  "nav.superAdmin.systemHealth": "System health",
  "nav.superAdmin.testimonials": "Testimonials",
  "nav.superAdmin.universities": "Universities",
  "nav.superAdmin.users": "Users",
  "nav.superAdmin.verifications": "Verifications",
  "nav.supportStaff.conversations": "Conversations",
  "nav.supportStaff.customers": "Customers",
  "nav.supportStaff.escalations": "Escalations",
  "nav.supportStaff.knowledgeBase": "Knowledge base",
  "nav.supportStaff.reports": "Reports",
  "nav.supportStaff.tickets": "Tickets",
  "nav.verificationOfficer.decisionHistory": "Decision history",
  "nav.verificationOfficer.escalations": "Escalations",
  "nav.verificationOfficer.landlords": "Landlords",
  "nav.verificationOfficer.properties": "Properties",
  "nav.verificationOfficer.reviewQueue": "Review queue",
  "nav.verificationOfficer.roomEvidence": "Room evidence",
  "nav.verificationOfficer.studentKyc": "Student KYC",
  "shell.dashboard": "Dashboard",
  "shell.mainNav": "Main navigation",
  "shell.openMenu": "Open menu",
  "shell.profile": "Profile",
  "shell.settings": "Settings",
  "shell.signOut": "Sign out",
  "shell.signingOut": "Signing out…",
  "shell.viewSite": "View site",

  "legal.eyebrow": "Legal",
  "legal.cookies.title": "Cookie Policy",
  "legal.cookies.description": "How and why NetLodge uses cookies and similar technologies.",
  "legal.privacy.title": "Privacy Policy",
  "legal.privacy.description": "How NetLodge collects, uses, and protects your personal data.",
  "legal.terms.title": "Terms of Service",
  "legal.terms.description": "The terms and conditions for using NetLodge.",
  "propertyDetail.floors": "Floors",
  "propertyDetail.totalUnits": "Total units",
  "propertyDetail.availableUnits": "Available",
  "propertyDetail.breadcrumb": "Breadcrumb",
  "propertyDetail.home": "Home",
  "propertyDetail.eachUnitBookable": "Each unit below is its own bookable entity with its own photos, facilities, and price. Click a unit to see its full image gallery and booking terms.",
  "propertyDetail.buildingWideFacilities": "These are building-wide facilities shared across all units. In-unit facilities are listed on each individual room page.",
  "propertyDetail.addressSharedAfterBooking": "The exact address is shared with you only after a booking is confirmed.",
  "roomDetail.bookingTerms": "Booking terms",
  "roomDetail.unitCurrently": "This unit is currently",
  "roomDetail.furnishing": "Furnishing",
  "roomDetail.noPhotos.title": "No photos available for this unit yet",
  "roomDetail.noPhotos.desc": "Ask the landlord to upload photos, or schedule a visit.",
  "roomDetail.capacity": "Capacity",
  "roomDetail.size": "Size",
  "roomDetail.person": "person",
  "roomDetail.people": "people",
  "roomDetail.previous": "Previous",
  "roomDetail.next": "Next",
  "error.title": "Something went wrong",
  "error.description": "An unexpected error occurred. Please try again.",
  "error.retry": "Try again",
  "hero.search.ariaLabel": "Search accommodation",
  "hero.search.placeholder": "Property name, area, or keyword",
  "hero.search.budget": "Budget",

  "hero.search.advancedFilters": "Advanced filters",
  "hero.search.searchButton": "Search",

};

// ─── Igbo ─────────────────────────────────────────────────────────────
const ig: Translations = {
  "nav.search": "Chọọ",
  "nav.universities": "Mahadum",
  "nav.properties": "Ụlọ",
  "nav.howItWorks": "Otu ọ na-arụ ọrụ",
  "nav.safety": "Nchebe",
  "nav.help": "Enyemaka",
  "nav.signIn": "Banye",
  "nav.getStarted": "Malite",
  "nav.dashboard": "Dashbọọdụ",
  "nav.signOut": "Pụọ",
  "nav.viewSite": "Lee saịtị",
  "nav.goToDashboard": "Gaa na dashbọọdụ",
  "nav.signedInAs": "Banyere dị ka",
  "nav.settings": "Ntọala",
  "nav.signingOut": "Na-apụ…",
  "nav.openMenu": "Mepee menu",
  "nav.closeMenu": "Mechie menu",
  "nav.navigationMenu": "Menu njem",
  "nav.primaryNav": "Isi",
  "footer.discover": "Chọpụta",
  "footer.trustSafety": "Ndịnwe na nchebe",
  "footer.forLandlords": "Maka ndị nwe ụlọ",
  "footer.support": "Nkwado",
  "footer.searchAccommodation": "Chọọ ebe obibi",
  "footer.verification": "Nyocha",
  "footer.bookingSafety": "Nchebe ntinye akwụkwọ",
  "footer.reportListing": "Bido akụkọ ụlọ",
  "footer.privacyPolicy": "Iwu nzuzo",
  "footer.listAProperty": "Tinye ụlọ",
  "footer.landlordGuide": "Nduzi ndị nwe ụlọ",
  "footer.termsOfService": "Usoro ọrụ",
  "footer.helpCentre": "Ebe enyemaka",
  "footer.contactUs": "Kpọtụrụ anyị",
  "footer.cookiePolicy": "Iwu cookie",
  "footer.description": "NetLodge bụ ebe a na-enyocha ma na-egosipụta ebe obibi ụmụ akwụkwọ n'akụkụ mahadum Naịjirịa — ị na-edebe ọnụ ụlọ, ọ bụghị naanị ụlọ.",
  "footer.copyright": "E mepụtara ya maka ụmụ akwụkwọ Naịjirịa.",
  "footer.verificationNote": "A na-enyocha njirimara na akụnụba onye ọ bụla nwere ụlọ tupu a gosipụta ya.",
  "hero.titlePrefix": "Chọta ebe obibi",
  "hero.titleHighlight": "a nyochara",
  "hero.titleSuffix": "ụmụ akwụkwọ na Naịjirịa.",
  "hero.findYourKind": "Chọta ụdị ohere ị chọrọ",
  "hero.popularUniversities": "Mahadum a ma ama",
  "hero.howItWorks": "Otu ọ na-arụ ọrụ",
  "hero.browseAll": "Chọọ niile",
  "hero.viewAll": "Hụ niile",
  "hero.title": "Chọta ebe obibi ụmụ akwụkwọ a nyochara na Naịjirịa.",
  "hero.subtitle": "NetLodge na-enyere ụmụ akwụkwọ aka ịchọta ebe obibi n'akụkụ mahadum Naịjirịa. Lee ọnụ ụlọ dị iche iche, nyochaa ha, ma tinye akwụkwọ maka ọnụ ụlọ ịchọrọ ibi.",
  "hero.browse": "Chọọ ebe obibi",
  "hero.listProperty": "Tinye ụlọ gị",
  "hero.stats.verifiedProperties": "Ụlọ a nyochara",
  "hero.stats.availableRooms": "Ọnụ ụlọ dị",
  "hero.stats.universities": "Mahadum",
  "home.whereWeAre.eyebrow": "Ebe ị ga-ahụ anyị",
  "home.whereWeAre.title": "Mahadum anyị na-enye ọrụ",
  "home.whereWeAre.viewAll": "Mahadum niile",
  "home.whereWeAre.verified": "A nyochara",
  "home.whereWeAre.pending": "Ka a na-enyocha",
  "home.categories.eyebrow": "Họrọ site na ụdị ọnụ ụlọ",
  "home.categories.title": "Họrọ ebe dabara ndụ gị",
  "home.categories.subtitle": "Site na self-contain ruo ọnụ ụlọ e kewara, nhọrọ ọ bụla bụ ọnụ ụlọ dị adị ị nwere ike ile ma debe.",
  "home.categories.selfContain": "Self-contain",
  "home.categories.singleRoom": "Ọnụ ụlọ nkeonwe",
  "home.categories.sharedRoom": "Ọnụ ụlọ e kewara",
  "home.categories.bedSpace": "Ohere akwa",
  "home.categories.apartment": "Apatiment",
  "home.categories.studio": "Studio",
  "home.benefits.eyebrow": "Gịnị mere NetLodge",
  "home.benefits.title": "E mepụtara maka ebe obibi ụmụ akwụkwọ a nyochara",
  "home.benefits.subtitle": "Ụlọ ọ bụla a nyochara, ọnụ ụlọ ọ bụla dị adị, na ịkwụ ụgwọ ọ bụla ka backend kwadoro.",
  "home.benefits.verifiedListing.title": "Naanị ụlọ a nyochara",
  "home.benefits.verifiedListing.desc": "Onye nwe ụlọ ọ bụla na NetLodge ga-agafe nyocha njirimara, adreesị na akụnụba tupu edepụta ụlọ ahụ. Ọ dịghị mkpa ịchọ agbụrụ ọzọ.",
  "home.benefits.bookActualRoom.title": "Debe ọnụ ụlọ ahụ kpọmkwem",
  "home.benefits.bookActualRoom.desc": "Anyị na-ewere otu ọnụ ụlọ a nwere ike idebe — ọnụ ụlọ, self-contain, ma ọ bụ apatiment — dị ka ihe dị iche onwe ya. Lee ọnụ ụlọ ahụ, ọ bụghị naanị ụlọ ahụ.",
  "home.benefits.holdBeforePay.title": "Jide tupu ị kwụọ ụgwọ",
  "home.benefits.holdBeforePay.desc": "Jide ọnụ ụlọ nwa oge ka ị na-ahazi ịkwụ ụgwọ. Njide a na-achịkwa site na sava — ọ dịghị onye ọzọ ga-edo ọnụ ụlọ ahụ.",
  "home.benefits.transparentPricing.title": "Ọnụ ahịa doro anya",
  "home.benefits.transparentPricing.desc": "Hụ ụgwọ ụlọ, ụgwọ ọrụ, ego njide na ụgwọ saịtị ozugbo. Ọ dịghị ego nzuzo nke agwa, ọ dịghị ụtụ ihe na-amaghị ama.",
  "home.faqs.eyebrow": "Ajụjụ a na-ajụkarị",
  "home.faqs.title": "Ajụjụ anyị zara",
  "home.faqs.subtitle": "Ihe ụmụ akwụkwọ na ndị nwe ụlọ na-ajụ tupu ha edobe ma ọ bụ depụta ụlọ.",
  "home.faqs.q1": "Olee otu m ga-esi mara na edepụtara ụlọ dị adị?",
  "home.faqs.a1": "Onye nwe ụlọ ọ bụla na NetLodge ga-agafe nyocha njirimara, adreesị na akụnụba. A na-enyocha ụlọ tupu e nwee ike idebe ya. Akara nyocha dị na edemede ọ bụla na-egosi gị ebe onye nwe ụlọ nọ na usoro ahụ.",
  "home.faqs.q2": "M na-edeba ọnụ ụlọ ma ọ bụ ụlọ?",
  "home.faqs.a2": "Ị na-edeba otu ọnụ ụlọ a nwere ike idebe — nke nwere ike ịbụ self-contain, ọnụ ụlọ nkeonwe, ohere akwa, ma ọ bụ apatiment dum. Ọnụ ụlọ ọ bụla nwere njirimara ya, foto, ụlọ ọrụ, ọnụahịa na ịdị adị ya.",
  "home.faqs.q3": "Olee otu ịkwụ ụgwọ si arụ ọrụ?",
  "home.faqs.a3": "Ozugbo ị malitere idebe akwụkwọ, ị ga-enweta njide nwa oge na njikọ ịkwụ ụgwọ Paystack. A na-akwado idebe akwụkwọ gị naanị mgbe backend kwadoro ịkwụ ụgwọ. Anyị anaghị ewepụta ịkwụ ụgwọ dị ka nke gara nke ọma site na bọsa.",
  "home.faqs.q4": "Gịnị ma ọ bụrụ na m bụ onye nwe ụlọ nwere ọnụ ụlọ 200?",
  "home.faqs.a4": "Dashbọọdụ onye nwe ụlọ na-ekwe ka ịhazie ọnụ ụlọ site na ala, tinye ọnụahịa ndabara kwa ala, gbanwee ọnụahịa nkeonwe, ma mepụta ọnụ ụlọ n'otu oge. Interface ahụ na-arụ ọrụ maka ọtụtụ narị ọnụ ụlọ kwa ụlọ.",
  "home.faqs.q5": "Kedu mahadum ndị a na-akwado?",
  "home.faqs.a5": "Anyị malitere na UNILAG, Akoka, Yaba, Bariga na Somolu. A na-ewelite mahadum ndị ọzọ — ị nwere ike ịrịọ mahadum gị site na fọmị mpịakọta.",
  "home.faqs.q6": "M nwere ike idepụta ụlọ m na-elekọta maka onye ọzọ?",
  "home.faqs.a6": "Ee. Enwere ike kenye ndị na-elekọta ụlọ na ụlọ onye nwe ụlọ site na ikike pụrụ iche. Ndị nnọchianye nwere ike ijikwa ajụjụ na ndụmọdụ na-enweghị ike ịnwata ego onye nwe ụlọ ma ọ bụ nyocha njirimara.",
  "home.trust.eyebrow": "Ndịnwe na nchebe",
  "home.trust.title": "Olee otu nyocha si arụ ọrụ",
  "home.trust.subtitle": "Àkwà anọ dị n'etiti onye nwe ụlọ na edemede ọha. A na-edekọ ma lee nke ọ bụla.",
  "home.trust.step1.title": "Nyocha njirimara",
  "home.trust.step1.desc": "Ndị nwe ụlọ na-ebufe ID gọọmentị (NIN, ikike ịnya ụgbọala, ma ọ bụ paspọtụ mba ụwa).",
  "home.trust.step2.title": "Adreesị na akụnụba",
  "home.trust.step2.desc": "A na-enyocha akwụkwọ ego ọkụ na akwụkwọ akụnụba. A na-ahazi nyocha ebe ọ dị mkpa.",
  "home.trust.step3.title": "Nyocha ụlọ",
  "home.trust.step3.desc": "Nyocha n'ebe ahụ na-ekwenye na ụlọ ahụ dị dịka a kọwara ya, na ụlọ ọrụ ndị a kwuru.",
  "home.trust.step4.title": "Akara nyocha",
  "home.trust.step4.desc": "Naanị mgbe nyocha niile gafere ka edemede ga-enweta akara nyocha ma bụrụ nke a pụrụ idebe n'ihu ọha.",
  "home.featuredProperty.view": "Lee",
  "home.featured.eyebrow": "Ụlọ pụrụ iche",
  "home.featured.title": "Ụlọ a nyochara nke aka họpụtara",
  "home.featured.description": "Nchịkọta nke ụlọ a nyochara nso nso a gburugburu UNILAG. Ụlọ ọ bụla nwere ọnụ ụlọ a pụrụ idebe n'ime ya.",
  "home.featured.viewAll": "Ụlọ niile",
  "home.featured.emptyState": "Anyị na-enye ndị nwe ụlọ ọrụ ugbu a. Ọnụ ụlọ a nyochara ga-apụta ebe a n'oge na-adịghị anya.",
  "home.fresh.eyebrow": "Ọhụrụ na NetLodge",
  "home.fresh.title": "Ọnụ ụlọ e depụtara nso nso a",
  "home.fresh.description": "Pịa site na edemede a nyochara kachasị ọhụrụ.",
  "home.fresh.ariaLabel": "Ụlọ e depụtara nso nso a",
  "home.studentBenefits.eyebrow": "Maka ụmụ akwụkwọ",
  "home.studentBenefits.title": "Gịnị mere ụmụ akwụkwọ ji ahọrọ NetLodge",
  "home.studentBenefits.description": "Ahịa e mepụtara gburugburu otu ụmụ akwụkwọ Naịjirịa si achọ ma nweta ebe obibi.",
  "home.studentBenefits.builtForCampus.title": "E mepụtara maka mahadum gị",
  "home.studentBenefits.builtForCampus.desc": "Họrọ site na mahadum, mpaghara na anya ịga klas.",
  "home.studentBenefits.safeHolds.title": "Njide dị nchebe",
  "home.studentBenefits.safeHolds.desc": "Njide nke sava na-achịkwa na-edobe ọnụ ụlọ ka ị na-ahazi ịkwụ ụgwọ.",
  "home.studentBenefits.honestListings.title": "Edemede eziokwu",
  "home.studentBenefits.honestListings.desc": "Foto nke ọkwa ọnụ ụlọ pụtara na ị na-ahụ ọnụ ụlọ ahụ, ọ bụghị naanị ihu ụlọ mara mma.",
  "home.studentBenefits.realSupport.title": "Nkwado dị adị",
  "home.studentBenefits.realSupport.desc": "Mepee tiketi site na dashbọọdụ gị ma mmadụ ga-azaghachi gị.",
  "home.studentBenefits.createAccount": "Mepụta akaụntụ ụmụ akwụkwọ gị",
  "home.landlordCta.eyebrow": "Maka ndị nwe ụlọ",
  "home.landlordCta.title": "Depụta otu ugboro. Jikwaa ọtụtụ narị ọnụ ụlọ.",
  "home.landlordCta.description": "Dashbọọdụ onye nwe ụlọ na-ahụ eziokwu nke ebe obibi ụmụ akwụkwọ Naịjirịa — ndepụta kwa ala, ọnụahịa kwa ọnụ ụlọ, ọrụ ọtụtụ, usoro ntinye akwụkwọ, ịkwụ ụgwọ na nyocha. E mepụtara ya maka pọtfolio nke 1 ruo 1,000 ọnụ ụlọ.",
  "home.landlordCta.feature1": "Wijadọtị ụlọ nwere ọtụtụ nzọụkwụ nke na-edobe akwụkwọ edepụtara",
  "home.landlordCta.feature2": "Ọnụahịa ndabara kwa ala nwere mgbanwe kwa ọnụ ụlọ",
  "home.landlordCta.feature3": "Mepụta ọnụ ụlọ 200 n'otu ọrụ",
  "home.landlordCta.feature4": "Ntinye akwụkwọ, ịkwụ ụgwọ na nhazi ịkwụ ụgwọ n'otu ebe",
  "home.landlordCta.startListing": "Malite idepụta",
  "home.landlordCta.guide": "Nduzi onye nwe ụlọ",
  "home.howItWorksCta.title": "Ijí chọta ebe obibi ụmụ akwụkwọ?",
  "home.howItWorksCta.description": "Chọọ ọnụ ụlọ a nyochara gburugburu mahadum gị, nyochaa ụlọ ọrụ n'ịntanetị, ma debe ọnụ ụlọ ahụ ịchọrọ ibi — ọ bụghị naanị ụlọ.",
  "home.howItWorksCta.browse": "Chọọ ebe obibi",
  "home.howItWorksCta.howItWorks": "Otu ọ na-arụ ọrụ",
  "home.testimonials.eyebrow": "Site n'obodo NetLodge",
  "home.testimonials.title": "Ihe ụmụ akwụkwọ na ndị nwe ụlọ na-ekwu",
  "home.testimonials.description": "Nnyocha dị adị site na ndị NetLodge nyochasịrị. A na-enyocha akụkọ ọ bụla site n'aka ndị anyị tupu ebipụta ya.",
  "search.eyebrow": "Chọọ",
  "search.title": "Chọta ebe obibi gị",
  "search.description": "Họrọ site na mahadum, mpaghara, mmefu ego, ụdị ọnụ ụlọ na ụlọ ọrụ.",
  "search.placeholder": "Aha ụlọ, mpaghara, ma ọ bụ okwu",
  "search.sortBy": "Hazị site na",
  "search.sortRelevance": "Ihe dị mkpa",
  "search.sortPriceAsc": "Ọnụahịa: ala ruo elu",
  "search.sortPriceDesc": "Ọnụahịa: elu ruo ala",
  "search.sortNewest": "Ọhụrụ",
  "search.university": "Mahadum",
  "search.anyUniversity": "Mahadum ọ bụla",
  "search.neighbourhood": "Mpaghara",
  "search.anyNeighbourhood": "Mpaghara ọ bụla",
  "search.annualRent": "Ụgwọ ụlọ kwa afọ (NGN)",
  "search.min": "Ala",
  "search.max": "Elu",
  "search.unitType": "Ụdị ọnụ ụlọ",
  "search.facilities": "Ụlọ ọrụ",
  "search.resetAll": "Wepụ nhọrọ niile",
  "search.filters": "Nhọrọ",
  "search.activeCount": "{n} arụ ọrụ",
  "search.searching": "Na-achọ…",
  "search.resultsCount": "{n} nke achọtara",
  "search.resultSingular": "{n} nke achọtara",
  "search.clearFilters": "Wepụ nhọrọ",
  "search.listView": "Ndepụta",
  "search.mapView": "Maapụ",
  "search.noMatches.title": "Ọ dịghị ihe a chọtara",
  "search.noMatches.description": "Gbalịa ịgbasa nhọrọ gị — wepụ oke ego, gbasaa mpaghara gị, ma ọ bụ gbanwee ụdị ọnụ ụlọ.",
  "properties.eyebrow": "Ndepụta ụlọ",
  "properties.title": "Ụlọ niile a nyochara",
  "properties.description": "Ụlọ ọ bụla dị n'okpuru ebe a gafere nyocha njimarị, adreesị na akụnụba. Nke ọ bụla nwere ọnụ ụlọ, self-contain, ma ọ bụ apatiment a pụrụ idebe.",
  "properties.placeholder": "Chọọ site na aha, mpaghara, ma ọ bụ okwu…",
  "properties.allUniversities": "Mahadum niile",
  "properties.error.title": "Enweghị ike ibu ụlọ",
  "properties.retry": "Nwaa ọzọ",
  "properties.empty.title": "Ọ dịghị ụlọ a chọtara",
  "properties.empty.description": "Gbalịa ịgbanwe chọọchọ gị ma ọ bụ leeghachi anya ka ndị nwe ụlọ na-edepụta ụlọ ọhụrụ.",
  "properties.showing": "Na-egosi {x} nke {y} ụlọ",
  "properties.previous": "Tupu",
  "properties.next": "Na-esote",
  "properties.pageOf": "Peeji {x} nke {y}",
  "properties.landlordCta.prefix": "Ị bụ onye nwe ụlọ nwere ọnụ ụlọ iji tinye?",
  "properties.landlordCta.action": "Depụta ụlọ gị",
  "propertyDetail.notFound.title": "Ụlọ a na-ahụtaghi",
  "propertyDetail.notFound.description": "Ụlọ a nwere ike ịbụ ebe ewepụrụ ma ọ bụ na-edepụta n'ihu ọha.",
  "propertyDetail.aboutProperty": "Maka ụlọ a",
  "propertyDetail.facilities": "Ụlọ ọrụ",
  "propertyDetail.floorsAndRooms": "Ala na ọnụ ụlọ",
  "propertyDetail.location": "Ebe",
  "propertyDetail.reviews": "Nnyocha",
  "propertyDetail.availableRooms": "Ọnụ ụlọ dị",
  "propertyDetail.fromPrice": "Site na",
  "propertyDetail.viewRooms": "Lee ọnụ ụlọ",
  "propertyDetail.viewRoom": "Lee ọnụ ụlọ",
  "propertyDetail.browseRooms": "Pịa ọnụ ụlọ",
  "propertyDetail.noRooms.title": "Ọ dịghị ọnụ ụlọ dị",
  "propertyDetail.noRooms.description": "Ọnụ ụlọ niile dị na ụlọ a edebela ma ọ bụ jidee. Leeghachi anya n'oge na-adịghị anya.",
  "propertyDetail.similarProperties": "Ụlọ yiri ya",
  "propertyDetail.save": "Chekwaa",
  "propertyDetail.saved": "E chekwala",
  "propertyDetail.verified": "A nyochara",
  "propertyDetail.pending": "Ka a na-enyocha",
  "propertyDetail.priceFrom": "Ọnụahịa site na",
  "propertyDetail.listingsCount": "{n} edemede",
  "propertyDetail.contactLandlord": "Kpọtụrụ onye nwe ụlọ",
  "propertyDetail.viewProperty": "Lee ụlọ",
  "roomDetail.notFound.title": "Ọnụ ụlọ a na-ahụtaghi",
  "roomDetail.notFound.description": "Ọnụ ụlọ a nwere ike ịbụ ebe ewepụrụ ma ọ bụ na-edepụta n'ihu ọha.",
  "roomDetail.aboutRoom": "Maka ọnụ ụlọ a",
  "roomDetail.facilities": "Ụlọ ọrụ",
  "roomDetail.pricingBreakdown": "Nkewa ọnụahịa",
  "roomDetail.baseRent": "Ụgwọ ụlọ ndabara",
  "roomDetail.serviceFee": "Ụgwọ ọrụ",
  "roomDetail.cautionDeposit": "Ego njide",
  "roomDetail.additionalCharges": "Ụgwọ ndị ọzọ",
  "roomDetail.total": "Mkpokọta",
  "roomDetail.rentalPeriod": "Oge mgbazitere",
  "roomDetail.checkInDate": "Ụbọchị nbata",
  "roomDetail.selectCheckIn": "Họrọ ụbọchị nbata",
  "roomDetail.acceptTerms": "Anabatara m usoro ntinye akwụkwọ ma ghọta na a na-ejide ebe ahụ awa 24 na-atụ anyị ịkwụ ụgwọ.",
  "roomDetail.placeHold": "Jide ebe ma gaa n'ihu",
  "roomDetail.confirmHold": "Kwenye ijide",
  "roomDetail.holdPlaced.title": "E jidela ebe ahụ",
  "roomDetail.holdPlaced.description": "A na-ejide ọnụ ụlọ gị awa 24. Mecha ịkwụ ụgwọ site na dashbọọdụ gị iji kwado idebe akwụkwọ.",
  "roomDetail.signUpToBook": "Naanị ụmụ akwụkwọ nwere ike itinye akwụkwọ maka ebe obibi",
  "roomDetail.pricingUnavailable": "Ọnụahịa adịghị",
  "roomDetail.gallery": "Foto",
  "roomDetail.roomType": "Ụdị ọnụ ụlọ",
  "roomDetail.status": "Ọnọdụ",
  "roomDetail.available": "Dị",
  "roomDetail.booked": "Edewela",
  "roomDetail.held": "A jidela",
  "roomDetail.landlord": "Onye nwe ụlọ",
  "roomDetail.viewProperty": "Lee ụlọ",
  "roomDetail.bedrooms": "Ọnụ ụlọ ihi ụra",
  "roomDetail.bathrooms": "Ọnụ ụlọ ịsa ahụ",
  "roomDetail.area": "Ebe",
  "roomDetail.backToProperty": "Laghachi na ụlọ",
  "universities.eyebrow": "Họrọ site na mahadum",
  "universities.title": "Mahadum dị na NetLodge",
  "universities.description": "Chọta ebe obibi ụmụ akwụkwọ a nyochara n'akụkụ mahadum ndị na-edu na Naịjirịa. Pịa mahadum iji hụ mpaghara na edemede.",
  "universities.error": "Enweghị ike ibu mahadum. Biko nwaa ọzọ ma emechaa.",
  "universities.empty": "Ọ dịghị mahadum edepụtara. Leeghachi anya n'oge na-adịghị anya.",
  "universities.listingsCount": "{n} edemede",
  "universities.comingSoon.eyebrow": "Na-abịa n'oge na-adịghị anya",
  "universities.comingSoon.title": "Mahadum ọzọ kwa oge",
  "universities.comingSoon.description": "NetLodge malitere na UNILAG na mpaghara gbara ya gburugburu. Mahadum ndị a sochiri na atụmatụ anyị — rịọ nke gị site na fọmị mpịakọta.",
  "universities.comingSoon.soon": "n'oge na-adịghị anya",
  "universities.requestCampus.prefix": "Ị hụghị mahadum gị?",
  "universities.requestCampus.action": "Rịọ ya",
  "universities.requestCampus.suffix": "— anyị na-ebute mahadum ndị nwere ọtụtụ arịrịọ ụzọ.",
  "universityDetail.listingsCount": "{n} edemede",
  "universityDetail.neighbourhoods.eyebrow": "Mpaghara a ma ama",
  "universityDetail.neighbourhoods.description": "Mpaghara ọ bụla nwere àgwà ya, ọnụahịa ya na anya ịga mahadum.",
  "universityDetail.neighbourhoods.empty": "Ọ dịghị mpaghara edepụtara.",
  "universityDetail.neighbourhoods.priceVaries": "Ọnụahịa dị iche iche",
  "universityDetail.neighbourhoods.typicalPerYear": "/afọ ihe atụ",
  "universityDetail.properties.eyebrow": "Edemede a nyochara",
  "universityDetail.properties.viewAll": "Hụ niile",
  "universityDetail.properties.empty.title": "Ọ dịghị edemede a nyochara",
  "universityDetail.properties.empty.action": "Jee ozi",
  "universityDetail.related.eyebrow": "Chọpụta",
  "universityDetail.related.title": "Mahadum ndị ọzọ",
  "howItWorks.eyebrow": "Otu ọ na-arụ ọrụ",
  "howItWorks.title": "Site na chọọchọ ruo nbata, n'ime awa ise",
  "howItWorks.description": "NetLodge na-eme ka ebe obibi ụmụ akwụkwọ a nyochara dịrịfe ịchọta, ile, na idebe — maka ụmụ akwụkwọ na ndị nwe ụlọ.",
  "howItWorks.students.eyebrow": "Maka ụmụ akwụkwọ",
  "howItWorks.students.title": "Chọta ma debe ọnụ ụlọ gị",
  "howItWorks.students.description": "Ị na-edeba ọnụ ụlọ ahụ kpọmkwem, ọ bụghị naanị ụlọ. Ọnụ ụlọ ọ bụla nwere foto, ụlọ ọrụ na ọnụahịa ya.",
  "howItWorks.students.search.title": "Chọọ",
  "howItWorks.students.search.desc": "Họrọ site na mahadum, mpaghara, mmefu ego, ụdị ọnụ ụlọ na ụlọ ọrụ.",
  "howItWorks.students.inspect.title": "Lee ọnụ ụlọ ahụ",
  "howItWorks.students.inspect.desc": "Ọnụ ụlọ ọ bụla nwere foto, ụlọ ọrụ na usoro ntinye akwụkwọ ya — ọ bụghị naanị ụlọ.",
  "howItWorks.students.hold.title": "Jide ebe",
  "howItWorks.students.hold.desc": "Debe ọnụ ụlọ awa 24 ka ị na-ahazi ịkwụ ụgwọ. Njide a na-achịkwa site na sava.",
  "howItWorks.students.pay.title": "Kwụọ ụgwọ n'ụzọ dị nchebe",
  "howItWorks.students.pay.desc": "Kwụọ site na Paystack. A na-akwado idebe akwụkwọ gị naanị mgbe backend kwadoro ịkwụ ụgwọ.",
  "howItWorks.students.moveIn.title": "Bata n'ụlọ",
  "howItWorks.students.moveIn.desc": "Nata kọntaktị onye nwe ụlọ na adreesị kpọmkwem ozugbo a kwadoro idebe akwụkwọ gị.",
  "howItWorks.students.startSearch": "Malite chọọchọ gị",
  "howItWorks.landlords.eyebrow": "Maka ndị nwe ụlọ",
  "howItWorks.landlords.title": "Depụta, hazie, ma nweta ego",
  "howItWorks.landlords.description": "Dashbọọdụ a raara onwe ya nye maka pọtfolio nke otu ọnụ ụlọ ruo puku. Ọnụahịa kwa ala, ọrụ ọtụtụ, ịkwụ ụgwọ.",
  "howItWorks.landlords.verified.title": "Gafee nyocha",
  "howItWorks.landlords.verified.desc": "Bufe ID, adreesị na ihe akaebe akụnụba. NetLodge na-enyocha ụlọ n'ebe ahụ.",
  "howItWorks.landlords.listProperty.title": "Depụta ụlọ gị",
  "howItWorks.landlords.listProperty.desc": "Jiri wijadọtị nhazigharị dị iche iche kọwaa ụlọ, ebe, ụlọ ọrụ na iwu.",
  "howItWorks.landlords.organiseRooms.title": "Hazie ọnụ ụlọ",
  "howItWorks.landlords.organiseRooms.desc": "Mepụta ala na ọnụ ụlọ, tinye ọnụahịa ndabara kwa ala, gbanwee ọnụahịa nkeonwe.",
  "howItWorks.landlords.assignStaff.title": "Kenye ndị ọrụ",
  "howItWorks.landlords.assignStaff.desc": "Tinye ndị njikwa na ndị nnọchianye nwere ikike pụrụ iche — ha na-ahụ naanị ihe ị hapụrụ.",
  "howItWorks.landlords.getPaid.title": "Nweta ego",
  "howItWorks.landlords.getPaid.desc": "Ịkwụ ụgwọ na-abata na akaụntụ ụlọ akụ gị mgbe idebe akwụkwọ ọ bụla kwadoro ma mee nhazi.",
  "howItWorks.landlords.startListing": "Malite idepụta",
  "howItWorks.booking.eyebrow": "Njikwa idebe akwụkwọ na ịkwụ ụgwọ",
  "howItWorks.booking.title": "Gịnị mere backend ji kpebie — ọ bụghị bọsa.",
  "howItWorks.booking.description": "Usoro idebe akwụkwọ nwere awa asatọ. Frontend na-egosi awa ọ bụla, mana naanị backend nwere ike ịgafe n'etiti ha. Nke a ka na-eme n'azụ ihe mgbe ị na-edeba ọnụ ụlọ.",
  "howItWorks.booking.step1": "Nyocha ịdị adị ọnụ ụlọ (n'akụkụ sava, atomic)",
  "howItWorks.booking.step2": "Njide nwa oge nwere ịkwụsị (nke sava na-achịkwa)",
  "howItWorks.booking.step3": "Mepụta idebe akwụkwọ (nhụta sava nyere)",
  "howItWorks.booking.step4": "Malite ịkwụ ụgwọ (njikọ Paystack)",
  "howItWorks.booking.step5": "Nkwado ịkwụ ụgwọ a pụrụ ịdabere na ya (Paystack webhook → backend)",
  "howItWorks.booking.step6": "Nkwado idebe akwụkwọ (sava na-atụgharị ọnọdụ)",
  "howItWorks.booking.step7": "Nhazi ịkwụ ụgwọ (ụgwọ, ndị a lọghachiri, akwụkwọ ego)",
  "howItWorks.booking.step8": "Ịdekọ ndị a lọghachiri na ịkwụ ụgwọ (sava mezuru)",
  "howItWorks.booking.disclaimer": "Frontend nwere ike igosi ịkwụ ụgwọ dị ka \"malitere\" mana ọ nweghị mgbe ọ ga-egosi ya dị ka \"nke gara nke ọma\" na-enweghị ọnọdụ backend kwadoro.",
  "safety.eyebrow": "Ndịnwe na nchebe",
  "safety.title": "Olee otu NetLodge si na-echebe ụmụ akwụkwọ",
  "safety.description": "Onye nwe ụlọ ọ bụla na-agafe nyocha njimarị, adreesị na akụnụba. A na-enyocha ụlọ ọ bụla n'ebe ahụ. Ịkwụ ụgwọ ọ bụla na-agafe Paystack na nkwado backend.",
  "safety.landlordVerification.eyebrow": "Nyocha onye nwe ụlọ",
  "safety.landlordVerification.title": "Àkwà anọ nke nyocha",
  "safety.landlordVerification.description": "Onye nwe ụlọ na-enweta akara nyocha naanị mgbe àkwà anọ ahụ niile gafere.",
  "safety.verification.identity.title": "Nyocha njimarị",
  "safety.verification.identity.desc": "ID gọọmentị — NIN, ikike ịnya ụgbọala, ma ọ bụ paspọtụ mba ụwa.",
  "safety.verification.address.title": "Nyocha adreesị",
  "safety.verification.address.desc": "Akwụkwọ ọkụ (ọkụ, mmiri, ma ọ bụ ihe mkpofu) nke mere n'ime ụbọchị 90 gara aga.",
  "safety.verification.ownership.title": "Akụnụba ma ọ bụ ikike njikwa",
  "safety.verification.ownership.desc": "Asambodo nwe, akwụkwọ nyefe, ma ọ bụ nkwekọrịta njikwa nke a bịanyere aka.",
  "safety.verification.inspection.title": "Nyocha n'ebe ahụ",
  "safety.verification.inspection.desc": "Onye ọrụ NetLodge na-eleta ụlọ ahụ ma kwado ụlọ ọrụ, nchebe na ọnọdụ ya.",
  "safety.bookingSafety.eyebrow": "Nchebe ntinye akwụkwọ",
  "safety.bookingSafety.title": "Nchedo ịkwụ ụgwọ, site na mmalite ruo njedebe",
  "safety.bookingSafety.description": "Mgbe ị na-edeba ọnụ ụlọ na NetLodge, ego gị bụ Paystack na-ahụ ma backend anyị na-ahazi. Ndị nwe ụlọ anaghị enweta ego ozugbo — ha na-enweta ịkwụ ụgwọ mgbe a kwadoro ma mee nhazi idebe akwụkwọ.",
  "safety.bookingSafety.fundsHeld": "Paystack na-ejide ego ruo mgbe a kwadoro",
  "safety.bookingSafety.backendVerifies": "Backend na-enyocha ịkwụ ụgwọ ọ bụla site na Paystack webhook",
  "safety.bookingSafety.cautionTracked": "Ego njide a pụrụ ịlọghachi na-edozi n'ọzọ",
  "safety.bookingSafety.payoutsAfterConfirm": "A na-ewepụta ịkwụ ụgwọ naanị mgbe a kwadoro idebe akwụkwọ",
  "safety.bookingSafety.refundsProcessed": "A na-ahazi ndị a lọghachiri maka idebe akwụkwọ ndị dara ma ọ bụ kagbuo",
  "safety.bookingSafety.auditTrail": "Akụkọ nyocha zuru ezu maka azụmahịa ọ bụla",
  "safety.tips.eyebrow": "Nọrọ ma chee echiche",
  "safety.tips.title": "Ndụmọdụ nchebe maka ụmụ akwụkwọ",
  "safety.tips.description": "Ọbụna na nyocha, nyocha uche dị mma na-echebe gị karịa.",
  "safety.tips.tip1": "Lee ọnụ ụlọ ahụ tupu ị kwụọ ụgwọ — ọ bụghị naanị ụlọ.",
  "safety.tips.tip2": "Ekwela ịkwụ ụgwọ na mpụga NetLodge. Ịkwụ ụgwọ na mpụga na-efunahụ gị nchedo anyị.",
  "safety.tips.tip3": "Jiri usoro ozi dị na app mee ka ederede nke nkwekọrịta ọ bụla dị.",
  "safety.tips.tip4": "Were foto nke ọnụ ụlọ n'ụbọchị nbata ma kesaa ha na onye nwe ụlọ.",
  "safety.tips.tip5": "Bido edemede ọ bụla na-arịọ ịkwụ ụgwọ na mpụga ozugbo.",
  "safety.report.eyebrow": "Bido edemede",
  "safety.report.title": "Hụrụ ihe na-adịghị mma?",
  "safety.report.description": "Ọ bụrụ na edemede na-arịọ ịkwụ ụgwọ na mpụga, na-egosi ọnụ ụlọ n'ụzọ na-ezighị ezi, ma ọ bụ na-akpa àgwà n'amaghị ama, bido ya site na fọmị mpịakọta anyị. Anyị na-enyocha akụkọ ọ bụla n'ime awa 48.",
  "safety.report.action": "Bido edemede",
  "safety.refund.title": "Iwu ndị a lọghachiri (nchịkọta)",
  "safety.refund.description": "A na-enye ndị a lọghachiri zuru ezu ọ bụrụ na a kagbuo idebe akwụkwọ n'ime awa 24 nke itinye ya ma ọ bụ ọ bụrụ na onye nwe ụlọ enweghị ike ikwado. A na-ewepụta ndị a lọghachiri nke ego njide na njedebe nke oge ịnọ n'ụlọ, na ewezuga mmebi ọ bụla edere. Lee {terms} anyị maka iwu zuru ezu.",
  "safety.refund.viewTerms": "usoro ọrụ",
  "help.eyebrow": "Ebe enyemaka",
  "help.title": "Kedu otu anyị ga-esi nyere gị aka?",
  "help.description": "Pịa site na ụdị, chọọ FAQs anyị, ma ọ bụ kpọtụrụ ndị ọrụ anyị. A zaro ajụjụ ọtụtụ n'okpuru.",
  "help.searchPlaceholder": "Chọọ maka edemede enyemaka…",
  "help.searchLabel": "Chọọ edemede enyemaka",
  "help.categories.eyebrow": "Pịa site na ụdị",
  "help.categories.title": "Isiokwu a ma ama",
  "help.categories.findingAccommodation.title": "Ịchọta ebe obibi",
  "help.categories.findingAccommodation.desc": "Chọọchọ, nhọrọ, na ụlọ echekwara.",
  "help.categories.bookings.title": "Idebe akwụkwọ",
  "help.categories.bookings.desc": "Njide, nkwado, ikagbu.",
  "help.categories.payments.title": "Ịkwụ ụgwọ na ndị a lọghachiri",
  "help.categories.payments.desc": "Paystack, ndị a lọghachiri, ego njide.",
  "help.categories.verification.title": "Nyocha na nchebe",
  "help.categories.verification.desc": "Olee otu anyị si enyocha, otu ị ga-esi nọrọ na nchebe.",
  "help.categories.listing.title": "Ịdepụta ụlọ",
  "help.categories.listing.desc": "Wijadọtị, ala, ọnụ ụlọ, ọnụahịa.",
  "help.categories.account.title": "Akaụntụ na profaịlụ",
  "help.categories.account.desc": "Profaịlụ, nchebe, ọrụ.",
  "help.faqs.eyebrow": "Ajụjụ a na-ajụkarị",
  "help.faqs.title": "Pịa FAQs niile",
  "help.faqs.finding.q1": "Olee otu m ga-esi chọọ ebe obibi nso mahadum m?",
  "help.faqs.finding.a1": "Jiri chọọchọ peeji mbụ ma ọ bụ peeji /search. Họrọ site na mahadum, mpaghara, mmefu ego, ụdị ọnụ ụlọ na ụlọ ọrụ. Nsonaazụ na-adaba na URL ka ị nwee ike ịbanye ma ọ bụ kesaa chọọchọ.",
  "help.faqs.finding.q2": "M nwere ike ichekwaa ụlọ iji lee ma emechaa?",
  "help.faqs.finding.a2": "Ee. Banye dị ka nwa akwụkwọ, mepee ụlọ ọ bụla, ma pịa akara obi. Ụlọ echekwara na-apụta na /student/saved.",
  "help.faqs.finding.q3": "Foto ndị ahụ bụ nke ọnụ ụlọ ahụ kpọmkwem?",
  "help.faqs.finding.a3": "Ebe o kwere omume, ee. Ọ bụrụ na foto bụ nke a na-anọchite anya kama nke ọnụ ụlọ ahụ, a na-akara ya nke ọma na peeji ọnụ ụlọ.",
  "help.faqs.bookings.q1": "Gịnị bụ njide nwa oge?",
  "help.faqs.bookings.a1": "Njide na-edobe ọnụ ụlọ pụrụ iche awa 24 ka ị na-ahazi ịkwụ ụgwọ. Njide a na-achịkwa site na sava — ọ dịghị nwa akwụkwọ ọzọ nwere ike idebe ọnụ ụlọ ahụ n'oge njide gị.",
  "help.faqs.bookings.q2": "Mgbe a ga-akwado idebe akwụkwọ m?",
  "help.faqs.bookings.a2": "A na-akwado idebe akwụkwọ gị naanị mgbe backend anyị kwadoro ịkwụ ụgwọ site na Paystack. Frontend nwere ike igosi 'malitere ịkwụ ụgwọ' mana ọ nweghị mgbe ọ ga-egosi 'nke gara nke ọma' na-enweghị nkwado backend.",
  "help.faqs.bookings.q3": "M nwere ike ikagbu idebe akwụkwọ?",
  "help.faqs.bookings.a3": "Ee. Ndị a lọghachiri zuru ezu na-emetụta n'ime awa 24 nke itinye idebe akwụkwọ, ma ọ bụ ọ bụrụ na onye nwe ụlọ enweghị ike ikwado. Na mgbe ahụ, iru eru ndị a lọghachiri dabere na oge ikagbu na usoro mgbazitere gị.",
  "help.faqs.payments.q1": "Olee otu m ga-esi kwụọ ụgwọ?",
  "help.faqs.payments.a1": "Ịkwụ ụgwọ niile na-agafe Paystack. Mgbe ị malitesịrị idebe akwụkwọ ị ga-ahụ njikọ Paystack na dashbọọdụ gị. Anyị anaghị anabata ịkwụ ụgwọ na mpụga saịtị.",
  "help.faqs.payments.q2": "Mgbe a ga-alọghachi ego njide m?",
  "help.faqs.payments.a2": "Na njedebe nke oge ịnọ n'ụlọ, na ewezuga mmebi ọ bụla edere. A na-ewepụta ndị a lọghachiri na usoro ịkwụ ụgwọ mbụ gị ma na-abịa n'ime ụbọchị 5–7 ọrụ.",
  "help.faqs.payments.q3": "Gịnị ma ọ bụrụ na ịkwụ ụgwọ daa?",
  "help.faqs.payments.a3": "Ọ bụrụ na Paystack kọọ ọdịda, njide gị na-anọgide na-arụ ọrụ ruo mgbe ọ gwụchara. Ị nwere ike ịnwaa ịkwụ ụgwọ ọzọ site na peeji idebe akwụkwọ gị. Ọ dịghị ego na-apụ n'akaụntụ gị na mgbalị ndị dara.",
  "help.faqs.listing.q1": "Olee ogologo oge nyocha na-ewe?",
  "help.faqs.listing.a1": "Ọtụtụ mgbe ụbọchị 3–5 ọrụ mgbe ị bufesịrị ihe akaebe niile. A na-ahazi nyocha n'ebe ahụ n'ime oge ahụ.",
  "help.faqs.listing.q2": "M nwere ike idepụta ọnụ ụlọ 200?",
  "help.faqs.listing.a2": "Ee. Dashbọọdụ onye nwe ụlọ na-akwado mepụta ọnụ ụlọ nke ọtụtụ, ọnụahịa ndabera kwa ala, na mgbanwe kwa ọnụ ụlọ. Interface ahụ edepụtara maka pọtfolio nke ụdị niile.",
  "help.faqs.listing.q3": "M nwere ike ịkenye onye njikwa?",
  "help.faqs.listing.a3": "Ee. Tinye ndị njikwa site na /landlord/staff ma kenye ha na ụlọ pụrụ iche. Ndị njikwa na-ahụ naanị ụlọ ha kenyesịrị na ọrụ ha kwadoro.",
  "help.contactCta.title": "Ọ ka mkpa enyemaka?",
  "help.contactCta.description": "Ndị ọrụ nkwado anyị na-azaghachi n'ime ụbọchị ọrụ otu.",
  "help.contactCta.action": "Kpọtụrụ nkwado",
  "contact.eyebrow": "Kpọtụrụ anyị",
  "contact.title": "Kpọtụrụ anyị",
  "contact.description": "Ajụjụ, ajụjụ njikọ aka, akụkọ nchebe — anyị na-agụ ozi ọ bụla. Chere nloghachi n'ime ụbọchị ọrụ otu.",
  "contact.form.yourName": "Aha gị",
  "contact.form.email": "Email",
  "contact.form.category": "Ụdị",
  "contact.form.subject": "Isiokwu",
  "contact.form.message": "Ozi",
  "contact.form.messagePlaceholder": "Gwa anyị otu anyị ga-esi nyere gị aka…",
  "contact.form.send": "Zipu ozi",
  "contact.form.sending": "Na-eziga…",
  "contact.form.categoryGeneral": "Ajụjụ izugbe",
  "contact.form.categoryPress": "Mgbasa ozi",
  "contact.form.categoryPartnership": "Njikọ aka",
  "contact.form.categorySupport": "Nkwado",
  "contact.form.categorySafety": "Akụkọ nchebe",
  "contact.success.title": "E zipula ozi",
  "contact.success.description": "Daalụ maka ịkpọtụrụ anyị. Anyị ga-azaghachi email gị n'ime ụbọchị ọrụ otu.",
  "contact.success.sendAnother": "Zipu ozi ọzọ",
  "contact.sidebar.otherWays": "Ụzọ ndị ọzọ iji ruo anyị",
  "contact.sidebar.responseTimes": "Oge nloghachi",
  "contact.sidebar.generalEnquiries": "Ajụjụ izugbe: ụbọchị ọrụ 1",
  "contact.sidebar.supportTickets": "Tiket nkwado: awa 4",
  "contact.sidebar.safetyReports": "Akụkọ nchebe: awa 2",
  "contact.sidebar.contactDetailsPending": "Ebe a ga-egosipụta nkọwa kọntaktị ozugbo ahaziri ya. Ugbua, jiri fọmị dị n'elu — anyị na-azaghachi n'ime ụbọchị ọrụ otu.",
  "contact.toast.success.title": "E zipula ozi",
  "contact.toast.success.description": "Ndị ọrụ anyị ga-azaghachi n'ime ụbọchị ọrụ otu.",
  "contact.toast.error.title": "Enweghị ike zipu ozi",
  "common.loading": "Na-ebu…",
  "common.save": "Chekwaa",
  "common.cancel": "Kagbuo",
  "common.retry": "Nwaa ọzọ",
  "common.back": "Laghachi",
  "common.viewAll": "Hụ niile",
  "common.signIn": "Banye",
  "common.signUp": "Debanye aha",
  "booking.placeHold": "Jide ebe ma gaa n'ihu",
  "booking.checkIn": "Ụbọchị nbata",
  "booking.rentalPeriod": "Oge mgbazitere",
  "booking.acceptTerms": "Anabatara m usoro ntinye akwụkwọ ma ghọta na a na-ejide ebe ahụ awa 24 na-atụ anyị ịkwụ ụgwọ.",
  "booking.confirmHold": "Kwenye ijide",
  "booking.holdPlaced": "E jidela ebe ahụ",
  "booking.signUpToBook": "Naanị ụmụ akwụkwọ nwere ike itinye akwụkwọ",
  "auth.welcomeBack": "Nnọọ ọzọ",
  "auth.signInToContinue": "Banye n'akaụntụ NetLodge gị ka ịga n'ihu.",
  "auth.createAccount": "Mepụta akaụntụ gị",
  "auth.forgotPassword": "Chefuo okwuntughe?",
  "auth.email": "Email",
  "auth.password": "Okwuntughe",
  "auth.signIn": "Banye",
  "auth.register": "Mepụta akaụntụ",
  "auth.rememberMe": "Cheta m na ngwaọrụ a",
  "auth.noAccount": "Ị nweghị akaụntụ?",
  "auth.createOne": "Mepụta otu",
  "auth.signingIn": "Na-abanye…",
  "auth.invalidCredentials": "Email ma ọ bụ okwuntughe na-ezighị ezi.",
  "common.maintenance.booking": "Related booking",
  "common.maintenance.cat.appliance": "Appliance",
  "common.maintenance.cat.cleanliness": "Cleanliness",
  "common.maintenance.cat.electrical": "Electrical",
  "common.maintenance.cat.other": "Other",
  "common.maintenance.cat.pestControl": "Pest control",
  "common.maintenance.cat.plumbing": "Plumbing",
  "common.maintenance.cat.security": "Security",
  "common.maintenance.cat.structural": "Structural",
  "common.maintenance.category": "Category",
  "common.maintenance.couldNotLoad": "Could not load maintenance requests",
  "common.maintenance.couldNotSubmit": "Could not submit request",
  "common.maintenance.couldNotUpdate": "Could not update request",
  "common.maintenance.descLandlord": "Track and resolve maintenance requests from your tenants.",
  "common.maintenance.descStudent": "Report issues with your room and track their resolution.",
  "common.maintenance.descriptionLabel": "Description",
  "common.maintenance.descriptionPlaceholder": "Describe the issue in detail…",
  "common.maintenance.eyebrowLandlord": "Maintenance requests",
  "common.maintenance.eyebrowStudent": "Maintenance",
  "common.maintenance.fillRequired": "Please fill in all required fields",
  "common.maintenance.markResolved": "Mark as resolved",
  "common.maintenance.markedAs": "Marked as {status}",
  "common.maintenance.newRequest": "New request",
  "common.maintenance.noRequests.descLandlord": "No maintenance requests from your tenants yet.",
  "common.maintenance.noRequests.descStudentHasBooking": "No maintenance requests yet. Report an issue if something needs fixing.",
  "common.maintenance.noRequests.descStudentNoBooking": "You need an active booking to report a maintenance issue.",
  "common.maintenance.noRequests.title": "No maintenance requests",
  "common.maintenance.prio.high": "High",
  "common.maintenance.prio.low": "Low",
  "common.maintenance.prio.medium": "Medium",
  "common.maintenance.prio.urgent": "Urgent",
  "common.maintenance.priority": "Priority",
  "common.maintenance.reportIssueDesc": "Tell us what's wrong and we'll get it sorted.",
  "common.maintenance.reportIssueTitle": "Report an issue",
  "common.maintenance.requestSubmittedDesc": "Your maintenance request has been submitted. We'll be in touch soon.",
  "common.maintenance.requestSubmittedTitle": "Request submitted",
  "common.maintenance.resolution": "Resolution",
  "common.maintenance.resolutionNotesPrompt": "Add resolution notes (visible to the student)",
  "common.maintenance.resolvedAt": "Resolved on",
  "common.maintenance.selectBooking": "Select a booking",
  "common.maintenance.selectValidBooking": "Please select a valid booking",
  "common.maintenance.startWorking": "Start working on it",
  "common.maintenance.submitRequest": "Submit request",
  "common.maintenance.title": "Maintenance requests",
  "common.maintenance.titleLabel": "Title",
  "common.maintenance.titlePlaceholder": "e.g. Leaking tap in bathroom",
  "common.maintenance.urgent": "Urgent",
  "common.messaging.conversations": "Conversations",
  "common.messaging.couldNotLoadConversations": "Could not load conversations",
  "common.messaging.couldNotLoadMessages": "Could not load messages",
  "common.messaging.couldNotSend": "Could not send message",
  "common.messaging.descLandlord": "Chat with your tenants about bookings and maintenance.",
  "common.messaging.descStudent": "Chat with your landlord about your booking or room.",
  "common.messaging.eyebrow": "Messages",
  "common.messaging.noConversations": "No conversations yet",
  "common.messaging.noMessagesYet": "No messages yet",
  "common.messaging.selectConversation.desc": "Choose a conversation from the list to view messages.",
  "common.messaging.selectConversation.title": "Select a conversation",
  "common.messaging.signInPrompt": "Sign in to view your messages.",
  "common.messaging.title": "Messages",
  "common.messaging.typePlaceholder": "Type a message…",
  "common.notifications.allCaughtUp": "You're all caught up",
  "common.notifications.allMarkedRead": "All notifications marked as read",
  "common.notifications.couldNotMarkAll": "Could not mark all as read",
  "common.notifications.couldNotMarkRead": "Could not mark as read",
  "common.notifications.eyebrow": "Notifications",
  "common.notifications.markAllRead": "Mark all as read",
  "common.notifications.markAsRead": "Mark as read",
  "common.notifications.new": "New",
  "common.notifications.noNotifications.desc": "You'll see notifications here when there's activity on your account.",
  "common.notifications.noNotifications.title": "No notifications",
  "common.notifications.signInPrompt": "Sign in to view your notifications.",
  "common.notifications.title": "Notifications",
  "common.notifications.unreadDesc.plural": "You have {n} unread notifications",
  "common.notifications.unreadDesc.singular": "You have {n} unread notification",
  "common.notifications.view": "View",
  "common.profile.bio": "Bio",
  "common.profile.bioPlaceholder": "Tell us a bit about yourself…",
  "common.profile.couldNotLoad": "Could not load profile",
  "common.profile.couldNotSave": "Could not save profile",
  "common.profile.description": "Manage your personal information.",
  "common.profile.email": "Email",
  "common.profile.emailHelp": "Used for notifications and account recovery.",
  "common.profile.eyebrow": "Profile",
  "common.profile.firstName": "First name",
  "common.profile.lastName": "Last name",
  "common.profile.phone": "Phone",
  "common.profile.saveChanges": "Save changes",
  "common.profile.saved": "Profile saved",
  "common.profile.saving": "Saving…",
  "common.profile.signInPrompt": "Sign in to view your profile.",
  "common.profile.title": "Profile",
  "common.settings.account": "Account",
  "common.settings.appearance": "Appearance",
  "common.settings.colourTheme": "Colour theme",
  "common.settings.colourThemeDesc": "Choose light or dark mode, or follow your system.",
  "common.settings.couldNotLoadPrefs": "Could not load preferences",
  "common.settings.currency": "Currency",
  "common.settings.currencyNgn": "Nigerian Naira (₦)",
  "common.settings.description": "Manage your account settings and preferences.",
  "common.settings.eyebrow": "Settings",
  "common.settings.language": "Language",
  "common.settings.locale": "Display language",
  "common.settings.notif.digestDesc": "Receive a weekly summary.",
  "common.settings.notif.digestLabel": "Weekly digest",
  "common.settings.notif.emailDesc": "Receive notifications by email.",
  "common.settings.notif.emailLabel": "Email notifications",
  "common.settings.notif.pushDesc": "Receive push notifications.",
  "common.settings.notif.pushLabel": "Push notifications",
  "common.settings.notif.smsDesc": "Receive notifications by SMS.",
  "common.settings.notif.smsLabel": "SMS notifications",
  "common.settings.notif.urgentDesc": "Only receive urgent notifications.",
  "common.settings.notif.urgentLabel": "Urgent only",
  "common.settings.notifications": "Notifications",
  "common.settings.role": "Role",
  "common.settings.title": "Settings",
  "landlord.bookings.description": "Track all bookings across your properties.",
  "landlord.bookings.eyebrow": "Bookings",
  "landlord.bookings.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.bookings.noBookings.title": "No bookings yet",
  "landlord.bookings.signInPrompt": "Sign in to view your bookings.",
  "landlord.bookings.title": "Bookings",
  "landlord.dashboard.activity": "Recent activity",
  "landlord.dashboard.addProperty": "Add property",
  "landlord.dashboard.addPropertyDesc": "List a new property with rooms and floors.",
  "landlord.dashboard.allProperties": "All properties",
  "landlord.dashboard.available": "Available",
  "landlord.dashboard.checkVerification": "Check verification",
  "landlord.dashboard.couldNotLoad": "Could not load dashboard data",
  "landlord.dashboard.description": "Monitor your portfolio, bookings, revenue, and verification status.",
  "landlord.dashboard.due": "Due",
  "landlord.dashboard.eyebrow": "Dashboard",
  "landlord.dashboard.manageRooms": "Manage rooms",
  "landlord.dashboard.needsAttention": "Needs attention",
  "landlord.dashboard.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.dashboard.noBookings.title": "No bookings yet",
  "landlord.dashboard.noPendingPayments": "No pending payments",
  "landlord.dashboard.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.dashboard.noProperties.title": "No properties yet",
  "landlord.dashboard.occupancy": "Occupancy",
  "landlord.dashboard.occupancyHint": "{x} of {y} units occupied",
  "landlord.dashboard.occupancyLabel": "Occupied",
  "landlord.dashboard.occupied": "Occupied",
  "landlord.dashboard.payoutsDesc": "Track your payouts",
  "landlord.dashboard.pendingBooking.plural": "{n} pending bookings",
  "landlord.dashboard.pendingBooking.singular": "{n} pending booking",
  "landlord.dashboard.pendingRevenue": "Pending revenue",
  "landlord.dashboard.pendingRevenueHint": "From bookings awaiting payment",
  "landlord.dashboard.pendingVerification.plural": "{n} properties pending verification",
  "landlord.dashboard.pendingVerification.singular": "{n} property pending verification",
  "landlord.dashboard.portfolio": "Portfolio",
  "landlord.dashboard.quickActions": "Quick actions",
  "landlord.dashboard.recentBookings": "Recent bookings",
  "landlord.dashboard.revenueHint.plural": "From {n} bookings",
  "landlord.dashboard.revenueHint.singular": "From {n} booking",
  "landlord.dashboard.signInPrompt": "Sign in to view your landlord dashboard.",
  "landlord.dashboard.title": "Landlord dashboard",
  "landlord.dashboard.total": "Total",
  "landlord.dashboard.totalRevenue": "Total revenue",
  "landlord.dashboard.totalUnits": "Total units",
  "landlord.dashboard.transactionsDesc": "View all your transactions",
  "landlord.dashboard.unitsHint.plural": "{n} units",
  "landlord.dashboard.unitsHint.singular": "{n} unit",
  "landlord.dashboard.verificationDescAllVerified": "All your properties are verified.",
  "landlord.dashboard.verificationDescPending": "Some properties are still pending verification.",
  "landlord.dashboard.viewAll": "View all",
  "landlord.dashboard.viewBookings": "View bookings",
  "landlord.dashboard.yourProperties": "Your properties",
  "landlord.payouts.bank": "Bank",
  "landlord.payouts.description": "Track your payouts and settlement history.",
  "landlord.payouts.eyebrow": "Payouts",
  "landlord.payouts.fee": "Platform fee",
  "landlord.payouts.gross": "Gross",
  "landlord.payouts.grossVolume": "Gross volume",
  "landlord.payouts.inProgress": "In progress",
  "landlord.payouts.noPayouts.desc": "Your payouts will appear here once bookings are confirmed and settled.",
  "landlord.payouts.noPayouts.title": "No payouts yet",
  "landlord.payouts.pending": "Pending",
  "landlord.payouts.platformFees": "Platform fees",
  "landlord.payouts.scheduled": "Scheduled",
  "landlord.payouts.settled": "Settled",
  "landlord.payouts.settledAt": "Settled on",
  "landlord.payouts.settledCount.plural": "{n} settled payouts",
  "landlord.payouts.settledCount.singular": "{n} settled payout",
  "landlord.payouts.signInPrompt": "Sign in to view your payouts.",
  "landlord.payouts.title": "Payouts",
  "landlord.profile.businessDetails": "Business details",
  "landlord.profile.businessName": "Business name",
  "landlord.profile.businessNamePlaceholder": "e.g. Akoka Properties Ltd.",
  "landlord.profile.description": "Manage your landlord profile and business details.",
  "landlord.profile.displayName": "Display name",
  "landlord.profile.landlordBadge": "Landlord",
  "landlord.profile.officeAddress": "Office address",
  "landlord.profile.officeAddressPlaceholder": "e.g. 12 Allen Avenue, Ikeja",
  "landlord.profile.rcNumber": "RC number",
  "landlord.profile.rcNumberPlaceholder": "e.g. RC1234567",
  "landlord.profile.saveProfile": "Save profile",
  "landlord.profile.title": "Landlord profile",
  "landlord.properties.available": "Available",
  "landlord.properties.couldNotLoad": "Could not load properties",
  "landlord.properties.description": "Manage your property portfolio, floors, and rooms.",
  "landlord.properties.eyebrow": "Properties",
  "landlord.properties.floors": "Floors",
  "landlord.properties.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.properties.noProperties.title": "No properties yet",
  "landlord.properties.searchPlaceholder": "Search by name or area…",
  "landlord.properties.signInPrompt": "Sign in to view your properties.",
  "landlord.properties.title": "Your properties",
  "landlord.properties.units": "Units",
  "landlord.settings.dark": "Dark",
  "landlord.settings.description": "Manage your landlord preferences.",
  "landlord.settings.light": "Light",
  "landlord.settings.notif.digestDesc": "Receive a weekly summary of activity.",
  "landlord.settings.notif.emailDesc": "Receive booking and payment notifications by email.",
  "landlord.settings.notif.pushDesc": "Receive push notifications in your browser.",
  "landlord.settings.system": "System",
  "landlord.transactions.couldNotLoad": "Could not load transactions",
  "landlord.transactions.description": "Every transaction across your properties, with receipts.",
  "landlord.transactions.exportCsv": "Export CSV",
  "landlord.transactions.eyebrow": "Transactions",
  "landlord.transactions.grossReceived": "Gross received",
  "landlord.transactions.netBeforeFee": "Net before platform fee",
  "landlord.transactions.noTransactions.desc": "Transactions will appear here once you start receiving bookings.",
  "landlord.transactions.noTransactions.title": "No transactions yet",
  "landlord.transactions.paymentFees": "Payment fees",
  "landlord.transactions.receipt": "Receipt",
  "landlord.transactions.receiptPdf": "Receipt (PDF)",
  "landlord.transactions.signInPrompt": "Sign in to view your transactions.",
  "landlord.transactions.title": "Transactions",
  "shell.couldNotSignOut": "Could not sign out",
  "shell.couldNotSignOutDesc": "Please check your connection and try again.",
  "student.bookings.bookedAt": "Booked on",
  "student.bookings.checkIn": "Check-in",
  "student.bookings.checkOut": "Check-out",
  "student.bookings.couldNotLoad": "Could not load bookings",
  "student.bookings.description": "Track your active bookings, holds, and payment status.",
  "student.bookings.eyebrow": "Bookings",
  "student.bookings.noBookings.desc": "You haven't booked any rooms yet. Browse properties to get started.",
  "student.bookings.paidInFull": "Paid in full",
  "student.bookings.signInPrompt": "Sign in to view your bookings.",
  "student.bookings.title": "Your bookings",
  "student.dashboard.activeBookings": "Active bookings",
  "student.dashboard.allSettled": "All settled",
  "student.dashboard.awaitingPayment": "Awaiting payment",
  "student.dashboard.bookingAwaiting.plural": "{n} bookings awaiting payment",
  "student.dashboard.bookingAwaiting.singular": "{n} booking awaiting payment",
  "student.dashboard.bookingAwaitingDesc.plural": "Complete payment to confirm your holds before they expire.",
  "student.dashboard.bookingAwaitingDesc.singular": "Complete payment to confirm your hold before it expires.",
  "student.dashboard.browseProperties": "Browse properties",
  "student.dashboard.completeProfile": "Complete your student profile to start booking",
  "student.dashboard.completeProfileAction": "Complete profile",
  "student.dashboard.completeProfileDesc": "Add your university, matric number, and emergency contact. This takes 2 minutes.",
  "student.dashboard.couldNotLoad": "Could not load: {items}. Please refresh.",
  "student.dashboard.eyebrow": "Dashboard",
  "student.dashboard.getSupport": "Get support",
  "student.dashboard.holdExpired": "Hold expired",
  "student.dashboard.new": "New",
  "student.dashboard.noBookings.desc": "Browse properties and place a hold to start your first booking.",
  "student.dashboard.noBookings.title": "No bookings yet",
  "student.dashboard.outstanding": "Outstanding",
  "student.dashboard.paid": "Paid",
  "student.dashboard.payNow": "Pay now",
  "student.dashboard.paymentHistory": "Payment history",
  "student.dashboard.recentBookings": "Recent bookings",
  "student.dashboard.recentNotifications": "Recent notifications",
  "student.dashboard.recentPayments": "Recent payments",
  "student.dashboard.savedProperties": "Saved properties",
  "student.dashboard.searchAccommodation": "Search accommodation",
  "student.dashboard.signInPrompt": "Sign in with a real account to view your dashboard.",
  "student.dashboard.title": "Student dashboard",
  "student.dashboard.totalPaid": "Total paid",
  "student.dashboard.viewAll": "View all",
  "student.dashboard.welcome": "Welcome, {name}",
  "student.dashboard.welcomeDesc": "Manage your bookings, payments, saved properties, and support tickets.",
  "student.payments.awaiting": "Awaiting confirmation",
  "student.payments.backendVerified": "Backend verified",
  "student.payments.bookingRef": "Booking ref",
  "student.payments.couldNotLoad": "Could not load payments",
  "student.payments.description": "Every payment you've made through NetLodge, with downloadable receipts.",
  "student.payments.downloadReceipt": "Download receipt",
  "student.payments.fee": "Fee",
  "student.payments.gateway": "Gateway",
  "student.payments.noPayments.desc": "Your payments will appear here once you start booking rooms.",
  "student.payments.noPayments.title": "No payments yet",
  "student.payments.paidThisYear": "Paid this year",
  "student.payments.pendingPayments": "Pending payments",
  "student.payments.reason": "Reason",
  "student.payments.signInPrompt": "Sign in to view your payment history.",
  "student.payments.successfulPayments.plural": "{n} successful payments",
  "student.payments.successfulPayments.singular": "{n} successful payment",
  "student.payments.title": "Payment history",
  "student.saved.couldNotRemove": "Could not remove",
  "student.saved.description": "Properties you've saved to revisit later.",
  "student.saved.eyebrow": "Saved",
  "student.saved.noSaved.desc": "Tap the heart icon on any property to save it here.",
  "student.saved.noSaved.title": "No saved properties",
  "student.saved.priceOnRequest": "Price on request",
  "student.saved.remove": "Remove",
  "student.saved.removedToast": "Removed from saved",
  "student.saved.savedAt": "Saved on",
  "student.saved.signInPrompt": "Sign in to view your saved properties.",
  "student.saved.title": "Saved properties",

  "common.unit": "Unit",
  "nav.agent.assignments": "Assignments",
  "nav.agent.dashboard": "Dashboard",
  "nav.agent.enquiries": "Enquiries",
  "nav.agent.notifications": "Notifications",
  "nav.agent.profile": "Profile",
  "nav.agent.properties": "Properties",
  "nav.agent.referrals": "Referrals",
  "nav.agent.settings": "Settings",
  "nav.financeAdmin.auditTrail": "Audit trail",
  "nav.financeAdmin.commissions": "Commissions",
  "nav.financeAdmin.disputes": "Disputes",
  "nav.financeAdmin.payments": "Payments",
  "nav.financeAdmin.payouts": "Payouts",
  "nav.financeAdmin.reconciliation": "Reconciliation",
  "nav.financeAdmin.refunds": "Refunds",
  "nav.financeAdmin.reports": "Reports",
  "nav.financeAdmin.transactions": "Transactions",
  "nav.group.account": "Account",
  "nav.group.configuration": "Configuration",
  "nav.group.marketplaceOversight": "Marketplace oversight",
  "nav.group.operations": "Operations",
  "nav.group.platform": "Platform",
  "nav.group.submissions": "Submissions",
  "nav.group.trustSystem": "Trust & system",
  "nav.group.workspace": "Workspace",
  "nav.landlord.availability": "Availability",
  "nav.landlord.bookings": "Bookings",
  "nav.landlord.dashboard": "Dashboard",
  "nav.landlord.getStarted": "Get started",
  "nav.landlord.notifications": "Notifications",
  "nav.landlord.payouts": "Payouts",
  "nav.landlord.pricing": "Pricing",
  "nav.landlord.profile": "Profile",
  "nav.landlord.properties": "Properties",
  "nav.landlord.reports": "Reports",
  "nav.landlord.settings": "Settings",
  "nav.landlord.staff": "Staff",
  "nav.landlord.transactions": "Transactions",
  "nav.landlord.verification": "Verification",
  "nav.manager.availability": "Availability",
  "nav.manager.bookings": "Bookings",
  "nav.manager.dashboard": "Dashboard",
  "nav.manager.inspections": "Inspections",
  "nav.manager.notifications": "Notifications",
  "nav.manager.profile": "Profile",
  "nav.manager.properties": "Properties",
  "nav.manager.rooms": "Rooms",
  "nav.manager.settings": "Settings",
  "nav.student.bookings": "Bookings",
  "nav.student.dashboard": "Dashboard",
  "nav.student.findAccommodation": "Find accommodation",
  "nav.student.notifications": "Notifications",
  "nav.student.payments": "Payments",
  "nav.student.profile": "Profile",
  "nav.student.saved": "Saved",
  "nav.student.security": "Security",
  "nav.student.settings": "Settings",
  "nav.student.support": "Support",
  "nav.superAdmin.announcements": "Announcements",
  "nav.superAdmin.auditLogs": "Audit logs",
  "nav.superAdmin.commissions": "Commissions",
  "nav.superAdmin.facilities": "Facilities",
  "nav.superAdmin.finance": "Finance",
  "nav.superAdmin.integrations": "Integrations",
  "nav.superAdmin.locations": "Locations",
  "nav.superAdmin.overview": "Overview",
  "nav.superAdmin.rolesPermissions": "Roles & permissions",
  "nav.superAdmin.security": "Security",
  "nav.superAdmin.staff": "Staff",
  "nav.superAdmin.support": "Support",
  "nav.superAdmin.systemHealth": "System health",
  "nav.superAdmin.testimonials": "Testimonials",
  "nav.superAdmin.universities": "Universities",
  "nav.superAdmin.users": "Users",
  "nav.superAdmin.verifications": "Verifications",
  "nav.supportStaff.conversations": "Conversations",
  "nav.supportStaff.customers": "Customers",
  "nav.supportStaff.escalations": "Escalations",
  "nav.supportStaff.knowledgeBase": "Knowledge base",
  "nav.supportStaff.reports": "Reports",
  "nav.supportStaff.tickets": "Tickets",
  "nav.verificationOfficer.decisionHistory": "Decision history",
  "nav.verificationOfficer.escalations": "Escalations",
  "nav.verificationOfficer.landlords": "Landlords",
  "nav.verificationOfficer.properties": "Properties",
  "nav.verificationOfficer.reviewQueue": "Review queue",
  "nav.verificationOfficer.roomEvidence": "Room evidence",
  "nav.verificationOfficer.studentKyc": "Student KYC",
  "shell.dashboard": "Dashboard",
  "shell.mainNav": "Main navigation",
  "shell.openMenu": "Open menu",
  "shell.profile": "Profile",
  "shell.settings": "Settings",
  "shell.signOut": "Sign out",
  "shell.signingOut": "Signing out…",
  "shell.viewSite": "View site",

  "legal.eyebrow": "Iwu",
  "legal.cookies.title": "Iwu Cookie",
  "legal.cookies.description": "Otu NetLodge si eji cookie na teknụzụ yiri ya.",
  "legal.privacy.title": "Iwu Nzuzo",
  "legal.privacy.description": "Otu NetLodge si anakọta, jiri ma chekwaa data gị.",
  "legal.terms.title": "Usoro Ọrụ",
  "legal.terms.description": "Usoro na ọnọdụ iji NetLodge.",
  "propertyDetail.floors": "Ala",
  "propertyDetail.totalUnits": "Mkpokọta nkeji",
  "propertyDetail.availableUnits": "Dị",
  "propertyDetail.breadcrumb": "Njem",
  "propertyDetail.home": "Ụlọ",
  "propertyDetail.eachUnitBookable": "Nkeji ọ bụla dị n'okpuru bụ ihe dị iche nke nwere ike idebe, nwere foto, ụlọ ọrụ, na ọnụahịa nke ya. Pịa nkeji iji hụ foto niile na usoro ntinye akwụkwọ.",
  "propertyDetail.buildingWideFacilities": "Ndị a bụ ụlọ ọrụ ụlọ niile a na-kekọrịta n'ofe nkeji niile. A depụtara ụlọ ọrụ nkeji n'otu ọnụ ụlọ ọ bụla.",
  "propertyDetail.addressSharedAfterBooking": "A na-ekerịta adreesị kpọmkwem na gị naanị mgbe a kwadoro ntinye akwụkwọ.",
  "roomDetail.bookingTerms": "Usoro ntinye akwụkwọ",
  "roomDetail.unitCurrently": "Nkeji a dị ugbua",
  "roomDetail.furnishing": "Ihe e ji mee",
  "roomDetail.noPhotos.title": "Ọ dịghị foto maka nkeji a ugbua",
  "roomDetail.noPhotos.desc": "Rịọ onye nwe ụlọ ka ọ budata foto, ma ọ bụ hazie nlele.",
  "roomDetail.capacity": "Ikike",
  "roomDetail.size": "Nha",
  "roomDetail.person": "mmadụ",
  "roomDetail.people": "ndị mmadụ",
  "roomDetail.previous": "Tupu",
  "roomDetail.next": "Na-esote",
  "error.title": "Ihe ezighị ezi mere",
  "error.description": "Nsogbu amaghị ama mere. Biko nwaa ọzọ.",
  "error.retry": "Nwaa ọzọ",
  "hero.search.ariaLabel": "Chọọ ebe obibi",
  "hero.search.placeholder": "Aha ụlọ, mpaghara, ma ọ bụ okwu",
  "hero.search.budget": "Mmefu ego",

  "hero.search.advancedFilters": "Nhọrọọzọ",
  "hero.search.searchButton": "Chọọ",

};

// ─── Yoruba ───────────────────────────────────────────────────────────
const yo: Translations = {
  "nav.search": "Wáwá",
  "nav.universities": "Yunifásítì",
  "nav.properties": "Ilé",
  "nav.howItWorks": "Bí ó ṣe ń ṣiṣẹ́",
  "nav.safety": "Ààbọ̀",
  "nav.help": "Ìrànwọ́",
  "nav.signIn": "Wọlé",
  "nav.getStarted": "Bẹ̀rẹ̀",
  "nav.dashboard": "Dashbọọdù",
  "nav.signOut": "Jáde",
  "nav.viewSite": "Wo wẹ́bùsáìtì",
  "nav.goToDashboard": "Lọ sí dashbọọdù",
  "nav.signedInAs": "Wọlé gẹ́gẹ́ bí",
  "nav.settings": "Ètò",
  "nav.signingOut": "Ń jáde…",
  "nav.openMenu": "Sí menu",
  "nav.closeMenu": "Tí menu",
  "nav.navigationMenu": "Menu ìtọ́sọ́nà",
  "nav.primaryNav": "Àkọ́kọ́",
  "footer.discover": "Kọ́kọ́rọ́",
  "footer.trustSafety": "Ìgbẹ́kẹ̀lé àti ààbọ̀",
  "footer.forLandlords": "Fún àwọn oní ilé",
  "footer.support": "Ìtìlẹ́yìn",
  "footer.searchAccommodation": "Wá ibùgbé",
  "footer.verification": "Ìfìmọ́lẹ̀",
  "footer.bookingSafety": "Ààbọ̀ ìdásílẹ̀",
  "footer.reportListing": "Fìtẹ́ ìpolówọ́ ilé",
  "footer.privacyPolicy": "Ìlànà ìkọ́kọ́",
  "footer.listAProperty": "Foríṣọ́ ilé",
  "footer.landlordGuide": "Ìmọ̀ràn fún oní ilé",
  "footer.termsOfService": "Ìlànà iṣẹ́",
  "footer.helpCentre": "Ibi ìrànwọ́",
  "footer.contactUs": "Kàn sí wa",
  "footer.cookiePolicy": "Ìlànà cookie",
  "footer.description": "NetLodge jẹ́ ìpèsè fún ibùgbé akẹ́kọ̀ọ́ ní àyíka yunifásítì Nàìjíríà. A ń ṣàwárí yálà ilé kọ̀ọ̀kan, kì í ṣe ilé pàtàkì nìkan.",
  "footer.copyright": "A ṣẹ̀dá rẹ̀ fún àwọn akẹ́kọ̀ọ́ Nàìjíríà.",
  "footer.verificationNote": "A ń yẹ ìdánimọ̀ àti ìjẹ́ní-ilé gbogbo ènìyàn kí a tó ṣàfihàn ilé wọn.",
  "hero.titlePrefix": "Rí ibùgbé",
  "hero.titleHighlight": "tí a fìmọ̀lẹ̀",
  "hero.titleSuffix": "akẹ́kọ̀ọ́ ní Nàìjíríà.",
  "hero.findYourKind": "Rí irúfẹ́ ohere tí o fẹ́",
  "hero.popularUniversities": "Àwọn yunifásítì tí wọ́n gbajúmọ̀",
  "hero.howItWorks": "Bí ó ṣe ń ṣiṣẹ́",
  "hero.browseAll": "Wá gbogbo rẹ̀",
  "hero.viewAll": "Gbogbo rẹ̀",
  "hero.title": "Rí ibùgbé akẹ́kọ̀ọ́ tí a fìmọ̀lẹ̀ ní Nàìjíríà.",
  "hero.subtitle": "NetLodge ni ibi tí àwọn akẹ́kọ̀ọ́ ti lè rí ibùgbé ní àyíka àwọn yunifásítì Nàìjíríà. Wo yálà ilé kọ̀ọ̀kan, yẹ àwọn ohun èlò wọ́n wo, kí o sì gbé yálà ilé tí o fẹ́.",
  "hero.browse": "Wá ibùgbé",
  "hero.listProperty": "Foríṣọ́ ilé rẹ",
  "hero.stats.verifiedProperties": "Àwọn ilé tí a fìmọ̀lẹ̀",
  "hero.stats.availableRooms": "Àwọn yálà tó wà",
  "hero.stats.universities": "Yunifásítì",
  "home.whereWeAre.eyebrow": "Ibi tí o máa rí wa",
  "home.whereWeAre.title": "Àwọn yunifásítì tí a ń ṣiṣẹ́",
  "home.whereWeAre.viewAll": "Gbogbo yunifásítì",
  "home.whereWeAre.verified": "A fìmọ̀lẹ̀",
  "home.whereWeAre.pending": "A ń yẹ̀wò",
  "home.categories.eyebrow": "Yan gẹ́gẹ́ bí irúfẹ́ yálà",
  "home.categories.title": "Yan ibi tí ó bá ìgbésí ayé rẹ mu",
  "home.categories.subtitle": "Láti self-contain títí dé àwọn yálà tí a pín, gbogbo àṣàyàn jẹ́ yálà òótọ́ tí o lè wo àti gbé.",
  "home.categories.selfContain": "Self-contain",
  "home.categories.singleRoom": "Yálà ìkan",
  "home.categories.sharedRoom": "Yálà tí a pín",
  "home.categories.bedSpace": "Ohun-ifihan ibùsun",
  "home.categories.apartment": "Apatimenti",
  "home.categories.studio": "Stúdíò",
  "home.benefits.eyebrow": "Èyíkéjì NetLodge",
  "home.benefits.title": "A ṣẹ̀dá rẹ̀ fún ibùgbé akẹ́kọ̀ọ́ tí a fìmọ̀lẹ̀",
  "home.benefits.subtitle": "Gbogbo ìpolówọ́ tí a fìmọ̀lẹ̀, gbogbo yálà òótọ́, gbogbo owó tí backend fìmọ̀lẹ̀.",
  "home.benefits.verifiedListing.title": "Àwọn ìpolówọ́ tí a fìmọ̀lẹ̀ nìkan",
  "home.benefits.verifiedListing.desc": "Gbogbo oní ilé lórí NetLodge gbọ́dọ̀ kojú ìdánimọ̀, adírẹ́ẹ̀sì àti ìfàmọ̀lẹ̀ ìjẹ́ní kí a tó ṣàfihàn ìpolówọ́. Kò sí ìdájọ́ àdánwò mọ́.",
  "home.benefits.bookActualRoom.title": "Gbé yálà òótọ́ náà",
  "home.benefits.bookActualRoom.desc": "A ń wo gbogbo yálà tí a lè gbé — yálà, self-contain, tàbí apatimenti — gẹ́gẹ́ bí ohun ìṣọ̀kan. Wo yálà náà, kì í ṣe ilé pàtàkì nìkan.",
  "home.benefits.holdBeforePay.title": "Di kí o tó san",
  "home.benefits.holdBeforePay.desc": "Di yálà fún ìgbà díẹ̀ nígbà tí o ń ṣètò owó. Ìdínà̀ náà ń ṣiṣẹ́ láti inú sẹ́fà — kò sí èmì ìdábàá gbé.",
  "home.benefits.transparentPricing.title": "Ọ̀nà owó tótò",
  "home.benefits.transparentPricing.desc": "Rí owó iyà, owó iṣẹ́, owó ìdínà̀ àti owó pẹpọ̀ ní sára. Kò sí owó ìkọ̀kọ́ aja, kò sí owó ìdájọ́ òjì.",
  "home.faqs.eyebrow": "Àwọn ìbéèrè wọ́n máa ń pè",
  "home.faqs.title": "Àwọn ìbéèrè, a dá lọ́rọ̀",
  "home.faqs.subtitle": "Gbogbo ohun tí akẹ́kọ̀ọ́ àti oní ilé ń pè kí wọ́n tó gbé tàbí foríṣọ́.",
  "home.faqs.q1": "Báwo ni mo ṣe mọ̀ pé ìpolówọ́ náà jẹ́ òótọ́?",
  "home.faqs.a1": "Gbogbo oní ilé lórí NetLodge gbọ́dọ̀ parí ìdánimọ̀, adírẹ́ẹ̀sì àti ìfàmọ̀lẹ̀ ìjẹ́ní. A ń yẹ àwọn ilé wọ́n wò kí a tó gbà wọ́n láàyè gbé wọ́n. Àmì ìfìmọ́lẹ̀ lórí gbogbo ìpolówọ́ sọ fún ọ irú ẹni tí oní ilé náà jẹ́ nínú ìlànà náà.",
  "home.faqs.q2": "Ṣe mo ń gbé yálà tàbí ilé?",
  "home.faqs.a2": "O ń gbé yálà kan pàtó — ó lè jẹ́ self-contain, yálà ìkan, ohun-ifihan ibùsun, tàbí apatimenti pátá. Yálà kọ̀ọ̀kan ní ìdánimọ̀ rẹ̀, àwòrán, ohun èlò, owó àti ìbáḿpàdé rẹ̀.",
  "home.faqs.q3": "Báwo ni owó ṣe ń ṣiṣẹ́?",
  "home.faqs.a3": "Lẹ́yìn tí o bá ti bẹ̀rẹ̀ ìdásílẹ̀ ìforíṣọ́, ó máa rí ìdínà̀ ìgbà díẹ̀ àti ọ̀nà ìjápọ̀ Paystack. A ń fìmọ̀ ìdásílẹ̀ rẹ lẹ́yìn tí backend bá ti fìmọ̀ owó rẹ. A kì í sọ pé owó ti yẹ gẹ́gẹ́ bí èyí tí à ń fojú wò.",
  "home.faqs.q4": "Kí n ṣe tí mo jẹ́ oní ilé pẹ̀lú àwọn yálà 200?",
  "home.faqs.a4": "Dashbọọdù oní ilé ṣètò àwọn yálà gẹ́gẹ́ bí òkè, owó ìfilọ́lẹ̀ kọ̀ọ̀kan, yípadà owó kọ̀ọ̀kan, àti ṣíṣẹ̀dá àwọn yálà lọ́pọ̀lọpọ̀. Pẹpọ̀ yìí gbà ágbájá ọgọ́rún àwọn yálà kọ̀ọ̀kan.",
  "home.faqs.q5": "Àwọn yunifásítì wo ni a ń ṣàkíyèsí?",
  "home.faqs.a5": "A ti bẹ̀rẹ̀ pẹ̀lú UNILAG, Akoka, Yaba, Bariga àti Somolu. A ń ṣàfikún àwọn yunifásítì míràn — o lè béèrè fún yunifásítì rẹ lórí fọ́ọ̀mù ìkànṣe.",
  "home.faqs.q6": "Ṣe mo lè foríṣọ́ ilé tí mo ń ṣàkóso fún ènìyàn míràn?",
  "home.faqs.a6": "Bẹ́ẹ̀ni. A lè yàn àwọn alásòso ilé fún àwọn ilé oní ilé pẹ̀lú àwọn ìyípadà pàtó. Àwọn agbéga le ṣàkóso àwọn ìbéèrè àti ìtọ́ka láì gba ìwọ̀sí owó oní ilé tàbí ìmọ̀ràn ìdánimọ̀.",
  "home.trust.eyebrow": "Ìgbẹ́kẹ̀lé àti ààbọ̀",
  "home.trust.title": "Báwo ìfìmọ̀lẹ̀ ṣe ń ṣiṣẹ́",
  "home.trust.subtitle": "Awọ̀n ìpele mẹ́rin wà láàrín oní ilé àti ìpolówọ́ gbogbo gbòò. A ń kọ àti yẹ gbogbo èyíkéjì wò.",
  "home.trust.step1.title": "Ìdánimọ̀",
  "home.trust.step1.desc": "Àwọn oní ilé ń fi ìwé ìdánimọ̀ Ìjọba (NIN, ìwé ìjábọ̀ ọkọ̀, tàbí pásípọ́̀tì òkè-èkó).",
  "home.trust.step2.title": "Adírẹ́ẹ̀sì àti ìjẹ́ní",
  "home.trust.step2.desc": "A ń yẹ àwọn ìwé owó ìná àti àwọn ìwé ìjẹ́ní wò. A ń ṣètò ìyẹ̀wò níbí tó bá yẹ.",
  "home.trust.step3.title": "Ìyẹ̀wò ilé",
  "home.trust.step3.desc": "Ìyẹ̀wò níbi ìkọ̀kọ̀ fìmọ̀lẹ̀ pé ilé náà wà gẹ́gẹ́ bí a ti ṣàpèjúwe rẹ̀, pẹ̀lú àwọn ohun èlò tí a ti sọ.",
  "home.trust.step4.title": "Àmì ìfìmọ̀lẹ̀",
  "home.trust.step4.desc": "Lẹ́yìn tí gbogbo ìyẹ̀wò bá parí ni ìpolówọ́ máa gba àmì ìfìmọ̀lẹ̀ àti wà ní ìmọ̀ gbogbo gbòò fún ìdásílẹ̀.",
  "home.featuredProperty.view": "Wo",
  "home.featured.eyebrow": "Àwọn ilé pàtàkì",
  "home.featured.title": "Àwọn ìpolówọ́ tí a yàn",
  "home.featured.description": "Ìyànwó àwọn ilé tí a tún fìmọ̀lẹ̀ nísálàyé ní àyíka UNILAG. Ọ̀kọ̀ọ̀kan wọn ní àwọn yálà tì a lè gbé.",
  "home.featured.viewAll": "Gbogbo àwọn ilé",
  "home.featured.emptyState": "A ń ṣàkóso àwọn oní ilé báyìí. Àwọn yálà tí a fìmọ̀lẹ̀ máa hàn níbí láìpẹ́.",
  "home.fresh.eyebrow": "Tuntun lórí NetLodge",
  "home.fresh.title": "Àwọn yálà tuntun",
  "home.fresh.description": "Wá ká àwọn ìpolówọ́ tuntun tí a fìmọ̀lẹ̀.",
  "home.fresh.ariaLabel": "Àwọn ilé tuntun",
  "home.studentBenefits.eyebrow": "Fún àwọn akẹ́kọ̀ọ́",
  "home.studentBenefits.title": "Èyíkéjì àwọn akẹ́kọ̀ọ́ fi yan NetLodge",
  "home.studentBenefits.description": "Ọjà tí a ṣẹ̀dá nípa bí àwọn akẹ́kọ̀ọ́ Nàìjíríà ṣe ń wá àti gba ibùgbé.",
  "home.studentBenefits.builtForCampus.title": "A ṣẹ̀dá rẹ̀ fún yunifásítì rẹ",
  "home.studentBenefits.builtForCampus.desc": "Yan gẹ́gẹ́ bí yunifásítì, agbègbè àti ìgèékò láti gun sí klásì.",
  "home.studentBenefits.safeHolds.title": "Ìdínà̀ ààbọ̀",
  "home.studentBenefits.safeHolds.desc": "Ìdínà̀ tí sẹ́fà ń ṣàkóso ń pa yálà mọ́ nígbà tí o ń ṣètò owó.",
  "home.studentBenefits.honestListings.title": "Àwọn ìpolówọ́ òótọ́",
  "home.studentBenefits.honestListings.desc": "Àwọn àwòrán ìpele yálà túmọ̀ sí pé o rí yálà òótọ́ náà, kì í ṣe ìta ilé tó rẹwà nìkan.",
  "home.studentBenefits.realSupport.title": "Ìtìlẹ́yìn òótọ́",
  "home.studentBenefits.realSupport.desc": "Ṣí tíkẹ̀ẹ̀tì láti inú dashbọọdù rẹ kí ènìyàn ó dáhùn ọ́.",
  "home.studentBenefits.createAccount": "Ṣẹ̀dá àkáǹtì akẹ́kọ̀ọ́ rẹ",
  "home.landlordCta.eyebrow": "Fún àwọn oní ilé",
  "home.landlordCta.title": "Foríṣọ́ lẹ́ẹ̀kan. Ṣàkóso ọgọ́rún àwọn yálà.",
  "home.landlordCta.description": "Dashbọọdù oní ilé ń ṣàkóso ìgboyà ìbùgbé akẹ́kọ̀ọ́ Nàìjíríà — ìdámọ̀ràn ìpele òkè, owó ìpele yálà, àwọn iṣẹ́ pọ̀, àwọn ìlànà ìdásílẹ̀, àtúnṣe owó àti ìfìmọ̀lẹ̀. A ṣẹ̀dá rẹ̀ fún àwọn ìjáde láti 1 sí 1,000 yálà.",
  "home.landlordCta.feature1": "Wizard ilé mẹ́rin-mẹ́rin pẹ̀lú ìpamọ́ àkọṣe",
  "home.landlordCta.feature2": "Owó ìfilọ́lẹ̀ ìpele òkè pẹ̀lú àwọn àtúnṣe ìpele yálà",
  "home.landlordCta.feature3": "Ṣẹ̀dá àwọn yálà 200 nínú iṣẹ́ kan",
  "home.landlordCta.feature4": "Ìdásílẹ̀, owó àti àtúnṣe owó nínú ibi kan",
  "home.landlordCta.startListing": "Bẹ̀rẹ̀ ìforíṣọ́",
  "home.landlordCta.guide": "Ìmọ̀ràn oní ilé",
  "home.howItWorksCta.title": "Ṣé o ti ṣetán láti rí ibùgbé akẹ́kọ̀ọ́ rẹ?",
  "home.howItWorksCta.description": "Wá àwọn yálà tí a fìmọ̀lẹ̀ ní àyíka yunifásítì rẹ, yẹ àwọn ohun èlò wò lórí ẹ̀rọ ayélujára, kí o sì gbé yálà tí o fẹ́ — kì í ṣe ilé nìkan.",
  "home.howItWorksCta.browse": "Wá ibùgbé",
  "home.howItWorksCta.howItWorks": "Bí ó ṣe ń ṣiṣẹ́",
  "home.testimonials.eyebrow": "Láti inú ìdájọ́ NetLodge",
  "home.testimonials.title": "Ìrò àwọn akẹ́kọ̀ọ́ àti àwọn oní ilé",
  "home.testimonials.description": "Àwọn àyèwò òótọ́ láti ọ̀dọ̀ àwọn olùlo NetLodge tí a fìmọ̀lẹ̀. A ń yẹ kìtìnni kìtìnni wò kí a tó gbé jáde.",
  "search.eyebrow": "Wáwá",
  "search.title": "Rí ibùgbé rẹ",
  "search.description": "Yan gẹ́gẹ́ bí yunifásítì, agbègbè, owó, irúfẹ́ yálà àti àwọn ohun èlò.",
  "search.placeholder": "Orúkọ ilé, agbègbè, tàbí ọ̀rọ̀-ọ̀ṣùwọ̀n",
  "search.sortBy": "Pò pẹ̀lú",
  "search.sortRelevance": "Pàtàkì",
  "search.sortPriceAsc": "Owó: kékeré sí tòótò",
  "search.sortPriceDesc": "Owó: tòótò sí kékeré",
  "search.sortNewest": "Tuntun",
  "search.university": "Yunifásítì",
  "search.anyUniversity": "Yunifásítì kọ̀ọ̀kan",
  "search.neighbourhood": "Agbègbè",
  "search.anyNeighbourhood": "Agbègbè kọ̀ọ̀kan",
  "search.annualRent": "Owó ọdún (NGN)",
  "search.min": "Kékeré",
  "search.max": "Tòótò",
  "search.unitType": "Irúfẹ́ yálà",
  "search.facilities": "Àwọn ohun èlò",
  "search.resetAll": "Pàárẹ̀ àwọn ìyàn gbogbo",
  "search.filters": "Àwọn ìyàn",
  "search.activeCount": "{n} ń ṣiṣẹ́",
  "search.searching": "Ń wá…",
  "search.resultsCount": "{n} àwọn èyí tí a rí",
  "search.resultSingular": "{n} èyí tí a rí",
  "search.clearFilters": "Pàárẹ̀ àwọn ìyàn",
  "search.listView": "Àkójọpọ̀",
  "search.mapView": "Máàpù",
  "search.noMatches.title": "Kò sí ohun tí a rí",
  "search.noMatches.description": "Gbiyànjú láti fẹ̀ àwọn ìyàn rẹ — yọ owó ìpín, fẹ̀ agbègbè rẹ, tàbí yípadà irúfẹ́ yálà rẹ.",
  "properties.eyebrow": "Àkójọpọ̀ ilé",
  "properties.title": "Gbogbo àwọn ilé tí a fìmọ̀lẹ̀",
  "properties.description": "Gbogbo ilé tí ó wà ní ìsàlẹ̀ ti kojú ìdánimọ̀, adírẹ́ẹ̀sì àti ìfàmọ̀lẹ̀ ìjẹ́ní. Ọ̀kọ̀ọ̀kan wọn ní àwọn yálà, self-contain, tàbí apatimenti tì a lè gbé.",
  "properties.placeholder": "Wá pẹ̀lú orúkọ, agbègbè, tàbí ọ̀rọ̀-ọ̀ṣùwọ̀n…",
  "properties.allUniversities": "Gbogbo yunifásítì",
  "properties.error.title": "Kò lè gbé àwọn ilé",
  "properties.retry": "Gbiyànjú lẹ́ẹ̀kansi",
  "properties.empty.title": "Kò sí àwọn ilé tí a rí",
  "properties.empty.description": "Gbiyànjú láti yí ìwádìí rẹ padà tàbí yẹ àwọn ilé tuntun tí àwọn oní ilé ti foríṣọ́ wò.",
  "properties.showing": "Ń ṣàfihàn {x} nínú {y} ilé",
  "properties.previous": "Ẹ̀yìn",
  "properties.next": "Èyí tó ń bọ̀",
  "properties.pageOf": "Ojúewé {x} nínú {y}",
  "properties.landlordCta.prefix": "Ṣe o jẹ́ oní ilé pẹ̀lú àwọn yálà láti foríṣọ́?",
  "properties.landlordCta.action": "Foríṣọ́ ilé rẹ",
  "propertyDetail.notFound.title": "A kò rí ilé",
  "propertyDetail.notFound.description": "Ilé yìí lè jẹ́ ti a ti yọ tàbí kò wà fún gbogbo gbòò.",
  "propertyDetail.aboutProperty": "Npa ilé yìí",
  "propertyDetail.facilities": "Àwọn ohun èlò",
  "propertyDetail.floorsAndRooms": "Ìkùńti àti àwọn yálà",
  "propertyDetail.location": "Ibi",
  "propertyDetail.reviews": "Àwọn àyèwò",
  "propertyDetail.availableRooms": "Àwọn yálà tó wà",
  "propertyDetail.fromPrice": "Láti",
  "propertyDetail.viewRooms": "Wo àwọn yálà",
  "propertyDetail.viewRoom": "Wo yálà",
  "propertyDetail.browseRooms": "Wo àwọn yálà",
  "propertyDetail.noRooms.title": "Kò sí àwọn yálà tó wà",
  "propertyDetail.noRooms.description": "Gbogbo àwọn yálà nínú ilé yìí ti wà nínú ìdásílẹ̀ tàbí a ti di wọ́n. Yẹ àwọn èyí tuntun wò lẹ́ẹ̀kansi.",
  "propertyDetail.similarProperties": "Àwọn ilé míràn bí i",
  "propertyDetail.save": "Fi pamọ́",
  "propertyDetail.saved": "A ti fi pamọ́",
  "propertyDetail.verified": "A fìmọ̀lẹ̀",
  "propertyDetail.pending": "A ń yẹ̀wò",
  "propertyDetail.priceFrom": "Owó láti",
  "propertyDetail.listingsCount": "{n} ìpolówọ́",
  "propertyDetail.contactLandlord": "Kàn sí oní ilé",
  "propertyDetail.viewProperty": "Wo ilé",
  "roomDetail.notFound.title": "A kò rí yálà",
  "roomDetail.notFound.description": "Yálà yìí lè jẹ́ ti a ti yọ tàbí kò wà fún gbogbo gbòò.",
  "roomDetail.aboutRoom": "Npa yálà yìí",
  "roomDetail.facilities": "Àwọn ohun èlò",
  "roomDetail.pricingBreakdown": "Ìpín owó",
  "roomDetail.baseRent": "Owó ìfilọ́lẹ̀",
  "roomDetail.serviceFee": "Owó iṣẹ́",
  "roomDetail.cautionDeposit": "Owó ìdínà̀",
  "roomDetail.additionalCharges": "Àwọn owó àfikún",
  "roomDetail.total": "Gbogbo rẹ̀",
  "roomDetail.rentalPeriod": "Àkókò yíyà",
  "roomDetail.checkInDate": "Déètí ìwọlé",
  "roomDetail.selectCheckIn": "Yan déètí ìwọlé",
  "roomDetail.acceptTerms": "Mo gbà àdéhùn ìdásílẹ̀ àti pé mo mọ̀ pé wọ́n máa ń di ibùgbé fún wákàtí méjìlélógún kí wọ́n tó san owó.",
  "roomDetail.placeHold": "Di ibùgbé kí o tèwọ́",
  "roomDetail.confirmHold": "Fọwọ́sí ìdídì",
  "roomDetail.holdPlaced.title": "A ti di ibùgbé rẹ",
  "roomDetail.holdPlaced.description": "A di yálà rẹ fún wákàtí méjìlélógún. Pàrí owó láti inú dashbọọdù rẹ láti fìmọ́ ìdásílẹ̀ náà.",
  "roomDetail.signUpToBook": "Àwọn akẹ́kọ̀ọ́ nìkan ni wọ́n le gbé ibùgbé",
  "roomDetail.pricingUnavailable": "Owó kò sí",
  "roomDetail.gallery": "Àwọn àwòrán",
  "roomDetail.roomType": "Irúfẹ́ yálà",
  "roomDetail.status": "Ipo",
  "roomDetail.available": "Wà",
  "roomDetail.booked": "A ti gbé",
  "roomDetail.held": "A ti di",
  "roomDetail.landlord": "Oní ilé",
  "roomDetail.viewProperty": "Wo ilé",
  "roomDetail.bedrooms": "Àwọn yálà ìsun",
  "roomDetail.bathrooms": "Àwọn yálà ìwọ̀",
  "roomDetail.area": "Agbègbè",
  "roomDetail.backToProperty": "Padà sí ilé",
  "universities.eyebrow": "Yan gẹ́gẹ́ bí yunifásítì",
  "universities.title": "Àwọn yunifásítì lórí NetLodge",
  "universities.description": "Rí àwọn ibùgbé akẹ́kọ̀ọ́ tí a fìmọ̀lẹ̀ ní àyíka àwọn yunifásítì Nàìjíríà. Tẹ yunifásítì kan láti rí àwọn agbègbè àti ìpolówọ́.",
  "universities.error": "Kò lè gbé àwọn yunifásítì. Jọ̀wọ́ gbiyànjú lẹ́ẹ̀kansi lẹ́yìn ìgbà díẹ̀.",
  "universities.empty": "Kò sí àwọn yunifásítì tì a tò. Yẹ àwọn èyí tuntun wò lẹ́ẹ̀kansi.",
  "universities.listingsCount": "{n} ìpolówọ́",
  "universities.comingSoon.eyebrow": "Ń bọ̀ láìpẹ́",
  "universities.comingSoon.title": "Àwọn yunifásítì míràn, lóríṣiríṣi",
  "universities.comingSoon.description": "NetLodge bẹ̀rẹ̀ pẹ̀lú UNILAG àti àwọn agbègbè rẹ̀. Àwọn yunifásítì wọ̀nyí jẹ́ èyí tó ń bọ̀ nínú ìlànà wa — béèrè fún ti rẹ lórí fọ́ọ̀mù ìkànṣe.",
  "universities.comingSoon.soon": "láìpẹ́",
  "universities.requestCampus.prefix": "Ṣe o rí i yunifásítì rẹ?",
  "universities.requestCampus.action": "Béèrè fún rẹ̀",
  "universities.requestCampus.suffix": "— a ń gbé àwọn yunifásítì pẹ̀lú ìbèèrè pọ̀ọ̀pọ̀ọ̀ sí iwájú.",
  "universityDetail.listingsCount": "{n} ìpolówọ́",
  "universityDetail.neighbourhoods.eyebrow": "Àwọn agbègbè tí wọ́n gbajúmọ̀",
  "universityDetail.neighbourhoods.description": "Agbègbè kọ̀ọ̀kan ní ìhùuwọn rẹ̀, owó rẹ̀ àti ìgèékò láti gun yunifásítì.",
  "universityDetail.neighbourhoods.empty": "Kò sí àwọn agbègbè tì a tò.",
  "universityDetail.neighbourhoods.priceVaries": "Owó yípadà",
  "universityDetail.neighbourhoods.typicalPerYear": "/ọdún ìpele",
  "universityDetail.properties.eyebrow": "Àwọn ìpolówọ́ tí a fìmọ̀lẹ̀",
  "universityDetail.properties.viewAll": "Gbogbo rẹ̀",
  "universityDetail.properties.empty.title": "Kò sí ìpolówọ́ tí a fìmọ̀lẹ̀",
  "universityDetail.properties.empty.action": "Sọ fún wa",
  "universityDetail.related.eyebrow": "Ṣàwáwá",
  "universityDetail.related.title": "Àwọn yunifásítì míràn",
  "howItWorks.eyebrow": "Bí ó ṣe ń ṣiṣẹ́",
  "howItWorks.title": "Láti ìwádìí títí dé ìwọlé, nínú ìgbà márùn-ún",
  "howItWorks.description": "NetLodge ṣàfihàn àwọn ibùgbé akẹ́kọ̀ọ́ tí a fìmọ̀lẹ̀, àwọn èyí tí a lè wá, yẹ̀ wò àti gbé — fún àwọn akẹ́kọ̀ọ́ àti àwọn oní ilé.",
  "howItWorks.students.eyebrow": "Fún àwọn akẹ́kọ̀ọ́",
  "howItWorks.students.title": "Rí àti gbé yálà rẹ",
  "howItWorks.students.description": "O ń gbé yálà òótọ́ náà, kì í ṣe ilé pàtàkì nìkan. Yálà kọ̀ọ̀kan ní àwọn àwòrán, ohun èlò àti owó rẹ̀.",
  "howItWorks.students.search.title": "Wáwá",
  "howItWorks.students.search.desc": "Yan gẹ́gẹ́ bí yunifásítì, agbègbè, owó, irúfẹ́ yálà àti àwọn ohun èlò.",
  "howItWorks.students.inspect.title": "Yẹ̀ wò yálà náà",
  "howItWorks.students.inspect.desc": "Yálà kọ̀ọ̀kan ní àwọn àwòrán, ohun èlò àti àdéhùn ìdásílẹ̀ rẹ̀ — kì í ṣe ilé pàtàkì nìkan.",
  "howItWorks.students.hold.title": "Di ibùgbé",
  "howItWorks.students.hold.desc": "Di yálà fún wákàtí méjìlélógún nígbà tí o ń ṣètò owó. Ìdínà̀ náà ń ṣiṣẹ́ láti inú sẹ́fà.",
  "howItWorks.students.pay.title": "San owó ní ọ̀nà ààbọ̀",
  "howItWorks.students.pay.desc": "San owó pẹ̀lú Paystack. A ń fìmọ́ ìdásílẹ̀ rẹ lẹ́yìn tí backend bá fìmọ́ owó rẹ.",
  "howItWorks.students.moveIn.title": "Wọ inú",
  "howItWorks.students.moveIn.desc": "Gba àwọn àkọlé oní ilé àti adírẹ́ẹ̀sì òótọ́ lẹ́yìn tí a bá ti fìmọ́ ìdásílẹ̀ rẹ.",
  "howItWorks.students.startSearch": "Bẹ̀rẹ̀ ìwádìí rẹ",
  "howItWorks.landlords.eyebrow": "Fún àwọn oní ilé",
  "howItWorks.landlords.title": "Foríṣọ́, ṣètò, kí o sì gba owó",
  "howItWorks.landlords.description": "Dashbọọdù pàtó fún àwọn ìjáde ilé láti yálà kan títí dé ẹgbẹ̀rún. Owó òkè, iṣẹ́ ọ̀pọ̀lọpọ̀, àtúnṣe owó.",
  "howItWorks.landlords.verified.title": "Gba ìfìmọ̀lẹ̀",
  "howItWorks.landlords.verified.desc": "Fi ìdánimọ̀, adírẹ́ẹ̀sì àti ẹ̀rí ìjẹ́ní. NetLodge ń yẹ ilé wò níbi ìkọ̀kọ̀.",
  "howItWorks.landlords.listProperty.title": "Foríṣọ́ ilé rẹ",
  "howItWorks.landlords.listProperty.desc": "Lo ìdárígbópe mẹ́rin-mẹ́rin láti sàpèjúwe ilé, ibi, àwọn ohun èlò àti àwọn òfin.",
  "howItWorks.landlords.organiseRooms.title": "Ṣètò àwọn yálà",
  "howItWorks.landlords.organiseRooms.desc": "Ṣẹ̀dá àwọn òkè àti àwọn yálà, ṣètò owó ìfilọ́lẹ̀ kọ̀ọ̀kan, yí àwọn owó padà lóríṣiríṣi.",
  "howItWorks.landlords.assignStaff.title": "Yàn àwọn ohun èlò",
  "howItWorks.landlords.assignStaff.desc": "Fi àwọn alásòso àti agbéga kun pẹ̀lú àwọn ìyípadà pàtó — wọ́n máa rí àwọn ohun tí o fún wọn nìkan.",
  "howItWorks.landlords.getPaid.title": "Gba owó",
  "howItWorks.landlords.getPaid.desc": "Àtúnṣe owó máa wá sínú àkántì báǹkì rẹ lẹ́yìn tí a bá fìmọ́ ìdásílẹ̀ kọ̀ọ̀kan.",
  "howItWorks.landlords.startListing": "Bẹ̀rẹ̀ ìforíṣọ́",
  "howItWorks.booking.eyebrow": "Ìdásílẹ̀ àti ìmúdójú owó",
  "howItWorks.booking.title": "Èyíkéjì backend — kì í ṣe birausa — ló ń pinnu.",
  "howItWorks.booking.description": "Ìlànà ìdásílẹ̀ ààbọ̀ ní ìgbà mẹ́jọ. Frontend ń ṣàfihàn ìgbà kọ̀ọ̀kan, ṣùgbọ́n backend nìkan ló lè padà láàrín wọn. Èyí ní ó ń ṣẹlẹ̀ lẹ́yìn ìrànwọ́ nígbà tí o ń gbé yálà.",
  "howItWorks.booking.step1": "Ìyẹ̀wò ìbáḿpàdé yálà (láti inú sẹ́fà, atomic)",
  "howItWorks.booking.step2": "Ìdínà̀ ìgbà díẹ̀ pẹ̀lú ìparí (sẹ́fà ló ń ṣàkóso)",
  "howItWorks.booking.step3": "Ṣíṣẹ̀dá ìdásílẹ̀ (sẹ́fà ló fún ìtọ́kasí)",
  "howItWorks.booking.step4": "Bẹ̀rẹ̀ ìjápọ̀ owó (Paystack link)",
  "howItWorks.booking.step5": "Ìfìmọ̀ owó òótọ́ (Paystack webhook → backend)",
  "howItWorks.booking.step6": "Ìfìmọ́ ìdásílẹ̀ (sẹ́fà ló yípo ipo padà)",
  "howItWorks.booking.step7": "Àtúnṣe owó (àwọn owó, àtúnṣe, ìdámọ̀rà)",
  "howItWorks.booking.step8": "Ìtọ́ka àtúnṣe owó àti ìdásílẹ̀ owó (sẹ́fà parí)",
  "howItWorks.booking.disclaimer": "Frontend lè ṣàfihàn owó gẹ́gẹ́ bí \"a ti bẹ̀rẹ̀\" ṣùgbọ́n kò lè ríi gẹ́gẹ́ bí \"ti yẹ\" láìsí ipo backend tó fìmọ̀.",
  "safety.eyebrow": "Ìgbẹ́kẹ̀lé àti ààbọ̀",
  "safety.title": "Báwo NetLodge ṣe ń dáàbọ̀ àwọn akẹ́kọ̀ọ́",
  "safety.description": "Gbogbo oní ilé kojú ìdánimọ̀, adírẹ́ẹ̀sì àti ìfàmọ̀lẹ̀ ìjẹ́ní. A ń yẹ àwọn ilé wọ́n wò níbi. Gbogbo owó ń ṣàwọlé Paystack pẹ̀lú ìfìmọ̀lẹ̀ backend.",
  "safety.landlordVerification.eyebrow": "Ìyẹ̀wò oní ilé",
  "safety.landlordVerification.title": "Awọ̀n ìpele mẹ́rin ìyẹ̀wò",
  "safety.landlordVerification.description": "Oní ilé ń gba àmì ìfìmọ̀lẹ̀ lẹ́yìn tí àwọn ìpele mẹ́rin gbogbo wọn bá ti parí.",
  "safety.verification.identity.title": "Ìdánimọ̀",
  "safety.verification.identity.desc": "Ìwé ìdánimọ̀ Ìjọba — NIN, ìwé ìjábọ̀ ọkọ̀, tàbí pásípọ́̀tì òkè-èkó.",
  "safety.verification.address.title": "Ìyẹ̀wò adírẹ́ẹ̀sì",
  "safety.verification.address.desc": "Ìwé owó ìná (iná, omi, tàbí ìdájọ́ òòrì) tó wà nínú ọjọ́ 90 tó ṣẹ́.",
  "safety.verification.ownership.title": "Ìjẹ́ní tàbí àṣẹ ìṣàkóso",
  "safety.verification.ownership.desc": "Iwé ẹ̀rí ìjẹ́ní, ìwé ìgboyà, tàbí àdéhùn ìṣàkóso tì a ti kọwé ifọwọ́sí.",
  "safety.verification.inspection.title": "Ìyẹ̀wò níbi",
  "safety.verification.inspection.desc": "Ọmọ ẹgbẹ́ NetLodge ń ṣàbẹ̀wò sí ilé náà kí ó sì fìmọ́ àwọn ohun èlò, ààbọ̀ àti ipo rẹ.",
  "safety.bookingSafety.eyebrow": "Ààbọ̀ ìdásílẹ̀",
  "safety.bookingSafety.title": "Ìdààbọ̀ owó, láti ìbẹ̀rẹ̀ títí dé ìparí",
  "safety.bookingSafety.description": "Nígbà tí o ń gbé yálà lórí NetLodge, owó rẹ ni Paystack ń mú, backend wa sì ń ṣàtúnṣe rẹ̀. Àwọn oní ilé kò gba owó lọ́dọ̀ — wọ́n ń gba àtúnṣe owó lẹ́yìn tí a bá ti fìmọ́ àti ṣàtúnṣe ìdásílẹ̀.",
  "safety.bookingSafety.fundsHeld": "Paystack ń mú owó títí dé ìfìmọ̀",
  "safety.bookingSafety.backendVerifies": "Backend ń yẹ gbogbo owó wò pẹ̀lú Paystack webhook",
  "safety.bookingSafety.cautionTracked": "A ń tọ̀ owó ìdínà̀ tì a lè da pada tọ̀ka ìyàtọ̀",
  "safety.bookingSafety.payoutsAfterConfirm": "A ń ṣàfikún àtúnṣe owó lẹ́yìn ìfìmọ́ ìdásílẹ̀ nìkan",
  "safety.bookingSafety.refundsProcessed": "A ń ṣàtúnṣe àwọn owó tì a padá fún àwọn ìdásílẹ̀ tí ó kùtù tàbí tí a fagìlẹ̀",
  "safety.bookingSafety.auditTrail": "Ìtàn àyẹ̀wò àkójọpọ̀ fún gbogbo ìdásílẹ̀",
  "safety.tips.eyebrow": "Sọ ara rẹ mọ́",
  "safety.tips.title": "Àwọn ìmọ̀ràn ààbọ̀ fún àwọn akẹ́kọ̀ọ́",
  "safety.tips.description": "Bí ó tilẹ̀ jẹ́ pé a ti fìmọ̀lẹ̀, àwọn ìdájọ́ òye ń ṣàfẹ̀yìn rẹ síwájú.",
  "safety.tips.tip1": "Yẹ̀ wò yálà náà kí o tó san owó — kì í ṣe ilé pàtàkì nìkan.",
  "safety.tips.tip2": "Má ṣe san owó kíkàn níta NetLodge. Owó níta pẹpọ̀ mú àwọn ààbọ̀ wa nínú iṣẹ́.",
  "safety.tips.tip3": "Lo ìlànà ìfíránṣẹ́ láti inú app láti fi ìwé ìgboyà gbogbo àdéhùn sílẹ̀.",
  "safety.tips.tip4": "Mú àwọn àwòrán yálà ní ọjọ́ ìwọlé kí o sì pín wọn pẹ̀lú oní ilé rẹ.",
  "safety.tips.tip5": "Fìtẹ́ ìpolówọ́ kọ̀ọ̀kan tí ó ń béèrè fún owó níta pẹpọ̀ lásìkò.",
  "safety.report.eyebrow": "Fìtẹ́ ìpolówọ́",
  "safety.report.title": "Rí ohun míràn?",
  "safety.report.description": "Tí ìpolówọ́ bá ń béèrè fún owó níta pẹpọ̀, tàbí kò sàpèjúwe yálà dáradára, tàbí ń ṣe àwọn ohun ìyọlẹ́nu, fìtẹ́ rẹ̀ lórí fọ́ọ̀mù ìkànṣe wa. A ń yẹ gbogbo ìfitẹ́ wò nínú wákàtí 48.",
  "safety.report.action": "Fìtẹ́ ìpolówọ́",
  "safety.refund.title": "Ìlànà àtúnṣe owó (àkójọpọ̀)",
  "safety.refund.description": "A ń ṣe àtúnṣe owó tótò tí a bá fagìlẹ̀ ìdásílẹ̀ nínú wákàtí 24 tàbí tí oní ilé bá kùtù. A ń ṣe àtúnṣe àwọn owó ìdínà̀ ní ìparí àkókò yíyà, lẹ́yìn gbogbo ìdàmú tì a ti kọ̀sílẹ̀. Wo {terms} wa fún ìlànà àkójọpọ̀.",
  "safety.refund.viewTerms": "ìlànà iṣẹ́",
  "help.eyebrow": "Ibi ìrànwọ́",
  "help.title": "Báwo ni a ṣe lè ran ọ́ lọ́wọ́?",
  "help.description": "Yan gẹ́gẹ́ bí ẹ̀ka, wá àwọn FAQs wa, tàbí kàn sí àwọn ọmọ ẹgbẹ́ wa. Gbogbo àwọn ìbéèrè ni a ti dá wọ́n lọ́rọ̀ ní ìsàlẹ̀.",
  "help.searchPlaceholder": "Wá fún àwọn ìwé ìrànwọ́…",
  "help.searchLabel": "Wá àwọn ìwé ìrànwọ́",
  "help.categories.eyebrow": "Yan gẹ́gẹ́ bí ẹ̀ka",
  "help.categories.title": "Àwọn akóle gbajúmọ̀",
  "help.categories.findingAccommodation.title": "Ìrí ibùgbé",
  "help.categories.findingAccommodation.desc": "Wáwá, àwọn ìyàn, àti àwọn ilé tí a fi pamọ́.",
  "help.categories.bookings.title": "Àwọn ìdásílẹ̀",
  "help.categories.bookings.desc": "Ìdínà̀, ìfìmọ̀, ìfagìyì.",
  "help.categories.payments.title": "Àwọn owó àti àtúnṣe",
  "help.categories.payments.desc": "Paystack, àtúnṣe, àwọn owó ìdínà̀.",
  "help.categories.verification.title": "Ìfìmọ̀lẹ̀ àti ààbọ̀",
  "help.categories.verification.desc": "Báwo a ṣe ń fìmọ̀, báwo o ṣe lè wà ní ààbọ̀.",
  "help.categories.listing.title": "Ìforíṣọ́ ilé",
  "help.categories.listing.desc": "Wizard, òkè, àwọn yálà, owó.",
  "help.categories.account.title": "Àkántì àti profáìlì",
  "help.categories.account.desc": "Profáìlì, ààbọ̀, àwọn ipò.",
  "help.faqs.eyebrow": "Àwọn ìbéèrè wọ́n máa ń pè",
  "help.faqs.title": "Wo gbogbo àwọn FAQs",
  "help.faqs.finding.q1": "Báwo ni mo ṣe ń wá ibùgbé ní ibi yunifásítì mi?",
  "help.faqs.finding.a1": "Lo ìwádìí ojúewé àkọ́kọ́ tàbí ojúewé /search. Yan gẹ́gẹ́ bí yunifásítì, agbègbè, owó, irúfẹ́ yálà àti àwọn ohun èlò. Àwọn èsì wà ní ìbámu pẹ̀lú URL kí o lè fi pamọ́ tàbí pín ìwádìí.",
  "help.faqs.finding.q2": "Ṣe mo lè fi àwọn ilé pamọ́ láti yẹ̀ wò lẹ́yìn ìgbà díẹ̀?",
  "help.faqs.finding.a2": "Bẹ́ẹ̀ni. Wọlé gẹ́gẹ́ bí akẹ́kọ̀ọ́, wo ilé kọ̀ọ̀kan, kí o tẹ àmì ọkàn. Àwọn ilé tí a fi pamọ́ wà ní /student/saved.",
  "help.faqs.finding.q3": "Ṣe àwọn àwòrán jẹ́ ti yálà òótọ́ náà?",
  "help.faqs.finding.a3": "Níbi tí ó bá yẹ, bẹ́ẹ̀ni. Tí àwòrán bá jẹ́ èyí tí a ń lo gẹ́gẹ́ bí àpejúwe kì í ṣe ti yálà pàtó, a máa kọ bí ó ti rí ní ojúewé yálà.",
  "help.faqs.bookings.q1": "Kí ni ìdínà̀ ìgbà díẹ̀?",
  "help.faqs.bookings.a1": "Ìdínà̀ ń pa yálà pàtó mọ́ fún wákàtí méjìlélógún nígbà tí o ń ṣètò owó. Sẹ́fà ló ń ṣàkóso ìdínà̀ — akẹ́kọ̀ọ́ míràn kò lè gbé yálà kan náà nínú ìgbà ìdínà̀ rẹ.",
  "help.faqs.bookings.q2": "Nígbà wo ni a ń fìmọ́ ìdásílẹ̀ mi?",
  "help.faqs.bookings.a2": "A ń fìmọ́ ìdásílẹ̀ rẹ lẹ́yìn tí backend wa bá ti fìmọ́ owó láti Paystack. Frontend lè ṣàfihàn 'a ti bẹ̀rẹ̀ owó' ṣùgbọ́n kò lè rí 'ti yẹ' láìsí ìfìmọ̀ backend.",
  "help.faqs.bookings.q3": "Ṣe mo lè fagìlẹ̀ ìdásílẹ̀?",
  "help.faqs.bookings.a3": "Bẹ́ẹ̀ni. Àtúnṣe owó tótò wà nínú wákàtí 24 tí a bá ti bẹ̀rẹ̀ ìdásílẹ̀, tàbí tí oní ilé bá kùtù. Lẹ́yìn èyí, ìróyìn àtúnṣe owó dá lórí àkókò ìfagìyì nínú àdéhùn yíyà rẹ.",
  "help.faqs.payments.q1": "Báwo ni mo ṣe ń san owó?",
  "help.faqs.payments.a1": "Gbogbo owó ń ṣàwọlé Paystack. Lẹ́yìn tí o bá ti bẹ̀rẹ̀ ìdásílẹ̀, ó máa rí ọ̀nà ìjápọ̀ Paystack nínú dashbọọdù rẹ. A kò gbà owó níta pẹpọ̀.",
  "help.faqs.payments.q2": "Nígbà wo ni a ń ṣe àtúnṣe owó ìdínà̀ mi?",
  "help.faqs.payments.a2": "Ní ìparí àkókò yíyà, lẹ́yìn gbogbo ìdàmú tì a ti kọ̀sílẹ̀. A ń ṣe àtúnṣe sínú ọ̀nà ìjápọ̀ owó àkọ́kọ́ rẹ, ó sì máa dé nínú àwọn ọjọ́ iṣẹ́ 5–7.",
  "help.faqs.payments.q3": "Kí ni ó máa ṣélè tí owó bá kùtù?",
  "help.faqs.payments.a3": "Tí Paystack bá sọ pé ó kùtù, ìdínà̀ rẹ máa wà títí dé ìparí rẹ̀. O lè gbiyànjú owó lẹ́ẹ̀kansi láti ojúewé ìdásílẹ̀ rẹ. Kò sí owó tó ń jáde nínú àkántì rẹ̀ nígbà ìgbìyànjú àkùtù.",
  "help.faqs.listing.q1": "Báwo ni ìyẹ̀wò ṣe ń gba ìgbà?",
  "help.faqs.listing.a1": "Lórusùn ọjọ́ iṣẹ́ 3–5 lẹ́yìn tí o bá ti fi gbogbo ẹ̀rí. A ń ṣètò àwọn ìyẹ̀wò níbi nínú ìgbà náà.",
  "help.faqs.listing.q2": "Ṣe mo lè foríṣọ́ àwọn yálà 200?",
  "help.faqs.listing.a2": "Bẹ́ẹ̀ni. Dashbọọdù oní ilé ṣàkíyèsí ṣíṣẹ̀dá àwọn yálà lọ́pọ̀lọpọ̀, owó ìfilọ́lẹ̀ òkè, àti àwọn àtúnṣe kọ̀ọ̀kan. Pẹpọ̀ yìí jẹ́ fún gbogbo ìjáde.",
  "help.faqs.listing.q3": "Ṣe mo lè yàn alásòso?",
  "help.faqs.listing.a3": "Bẹ́ẹ̀ni. Fi àwọn alásòso kun láti /landlord/staff kí o sì yàn wọn fún àwọn ilé pàtó. Àwọn alásòso rí àwọn ilé tí a ti yàn wọ́n nìkan àti àwọn iṣẹ́ tí a fún wọn.",
  "help.contactCta.title": "Ṣe o tì nílò ìrànwọ́?",
  "help.contactCta.description": "Àwọn ọmọ ẹgbẹ́ ìtìlẹ́yìn wa máa dáhùn nínú ọjọ́ iṣẹ́ kan.",
  "help.contactCta.action": "Kàn sí ìtìlẹ́yìn",
  "contact.eyebrow": "Kàn sí wa",
  "contact.title": "Kàn sí wa",
  "contact.description": "Àwọn ìbéèrè, àwọn ìbèèrè ìdásílẹ̀ ìbámu, àwọn ìfitẹ́ ààbọ̀ — a ń kà gbogbo ìfíránṣẹ́. Retí ìdáhùn nínú ọjọ́ iṣẹ́ kan.",
  "contact.form.yourName": "Orúkọ rẹ",
  "contact.form.email": "Ímeèlì",
  "contact.form.category": "Ẹ̀ka",
  "contact.form.subject": "Akóle",
  "contact.form.message": "Ìfíránṣẹ́",
  "contact.form.messagePlaceholder": "Sọ fún wa báwo a ṣe lè ran ọ́ lọ́wọ́…",
  "contact.form.send": "Fìrànṣẹ́",
  "contact.form.sending": "Ń fìrànṣẹ́…",
  "contact.form.categoryGeneral": "Ìbéèrè gbogbo",
  "contact.form.categoryPress": "Ìròyìn",
  "contact.form.categoryPartnership": "Ìdásílẹ̀ ìbámu",
  "contact.form.categorySupport": "Ìtìlẹ́yìn",
  "contact.form.categorySafety": "Ìfitẹ́ ààbọ̀",
  "contact.success.title": "A ti fìrànṣẹ́",
  "contact.success.description": "Ọ̀ṣẹ́ fún ìkéde. A máa dáhùn ímeèlì rẹ nínú ọjọ́ iṣẹ́ kan.",
  "contact.success.sendAnother": "Fìrànṣẹ́ òmíràn",
  "contact.sidebar.otherWays": "Àwọn ọ̀nà míràn láti kàn sí wa",
  "contact.sidebar.responseTimes": "Àwọn àkókò ìdáhùn",
  "contact.sidebar.generalEnquiries": "Àwọn ìbéèrè gbogbo: ọjọ́ iṣẹ́ 1",
  "contact.sidebar.supportTickets": "Àwọn tíkẹ̀ẹ̀tì ìtìlẹ́yìn: wákàtí 4",
  "contact.sidebar.safetyReports": "Àwọn ìfitẹ́ ààbọ̀: wákàtí 2",
  "contact.sidebar.contactDetailsPending": "A máa ṣàfihàn àwọn ìmọ̀ràn ìkànṣe níbí látigba tí a bá ti ṣètò. Fún èyí́ tòò, lo fọ́ọ̀mù tó wà lókù — a ń dáhùn nínú ọjọ́ iṣẹ́ kan.",
  "contact.toast.success.title": "A ti fìrànṣẹ́",
  "contact.toast.success.description": "Àwọn ọmọ ẹgbẹ́ wa máa dáhùn nínú ọjọ́ iṣẹ́ kan.",
  "contact.toast.error.title": "Kò lè fìrànṣẹ́",
  "common.loading": "Ń ròyìn…",
  "common.save": "Fi pamọ́",
  "common.cancel": "Parẹ́",
  "common.retry": "Gbiyẹnu",
  "common.back": "Padà sẹ́yìn",
  "common.viewAll": "Gbogbo rẹ̀",
  "common.signIn": "Wọlé",
  "common.signUp": "Forúkọ sílẹ̀",
  "booking.placeHold": "Di ibùgbé kí o tèwọ́",
  "booking.checkIn": "Déètí ìwọlé",
  "booking.rentalPeriod": "Àkókò yíyà",
  "booking.acceptTerms": "Mo gbà àdéhùn ìdásílẹ̀ àti pé mo mọ̀ pé wọ́n máa ń di ibùgbé fún wákàtí méjìlélógún kí wọ́n tó san owó.",
  "booking.confirmHold": "Fọwọ́sí ìdídì",
  "booking.holdPlaced": "A ti di ibùgbé rẹ",
  "booking.signUpToBook": "Àwọn akẹ́kọ̀ọ́ nìkan ni wọ́n le gbé ibùgbé",
  "auth.welcomeBack": "Káàbọ̀",
  "auth.signInToContinue": "Wọlé sínú àkáǹtì NetLodge rẹ láti tẹ̀síwájú.",
  "auth.createAccount": "Ṣẹ̀dá àkáǹtì rẹ",
  "auth.forgotPassword": "Gbagbe ọ̀rọ̀-ìpamọ́?",
  "auth.email": "Ímeèlì",
  "auth.password": "Ọ̀rọ̀-ìpamọ́",
  "auth.signIn": "Wọlé",
  "auth.register": "Ṣẹ̀dá àkáǹtì",
  "auth.rememberMe": "Rántí mi lórí èrò yìí",
  "auth.noAccount": "Ṣé o ní àkáǹtì?",
  "auth.createOne": "Ṣẹ̀dá ọ̀kan",
  "auth.signingIn": "Ń wọlé…",
  "auth.invalidCredentials": "Ímeèlì tàbí ọ̀rọ̀-ìpamọ́ àìtó.",
  "common.maintenance.booking": "Related booking",
  "common.maintenance.cat.appliance": "Appliance",
  "common.maintenance.cat.cleanliness": "Cleanliness",
  "common.maintenance.cat.electrical": "Electrical",
  "common.maintenance.cat.other": "Other",
  "common.maintenance.cat.pestControl": "Pest control",
  "common.maintenance.cat.plumbing": "Plumbing",
  "common.maintenance.cat.security": "Security",
  "common.maintenance.cat.structural": "Structural",
  "common.maintenance.category": "Category",
  "common.maintenance.couldNotLoad": "Could not load maintenance requests",
  "common.maintenance.couldNotSubmit": "Could not submit request",
  "common.maintenance.couldNotUpdate": "Could not update request",
  "common.maintenance.descLandlord": "Track and resolve maintenance requests from your tenants.",
  "common.maintenance.descStudent": "Report issues with your room and track their resolution.",
  "common.maintenance.descriptionLabel": "Description",
  "common.maintenance.descriptionPlaceholder": "Describe the issue in detail…",
  "common.maintenance.eyebrowLandlord": "Maintenance requests",
  "common.maintenance.eyebrowStudent": "Maintenance",
  "common.maintenance.fillRequired": "Please fill in all required fields",
  "common.maintenance.markResolved": "Mark as resolved",
  "common.maintenance.markedAs": "Marked as {status}",
  "common.maintenance.newRequest": "New request",
  "common.maintenance.noRequests.descLandlord": "No maintenance requests from your tenants yet.",
  "common.maintenance.noRequests.descStudentHasBooking": "No maintenance requests yet. Report an issue if something needs fixing.",
  "common.maintenance.noRequests.descStudentNoBooking": "You need an active booking to report a maintenance issue.",
  "common.maintenance.noRequests.title": "No maintenance requests",
  "common.maintenance.prio.high": "High",
  "common.maintenance.prio.low": "Low",
  "common.maintenance.prio.medium": "Medium",
  "common.maintenance.prio.urgent": "Urgent",
  "common.maintenance.priority": "Priority",
  "common.maintenance.reportIssueDesc": "Tell us what's wrong and we'll get it sorted.",
  "common.maintenance.reportIssueTitle": "Report an issue",
  "common.maintenance.requestSubmittedDesc": "Your maintenance request has been submitted. We'll be in touch soon.",
  "common.maintenance.requestSubmittedTitle": "Request submitted",
  "common.maintenance.resolution": "Resolution",
  "common.maintenance.resolutionNotesPrompt": "Add resolution notes (visible to the student)",
  "common.maintenance.resolvedAt": "Resolved on",
  "common.maintenance.selectBooking": "Select a booking",
  "common.maintenance.selectValidBooking": "Please select a valid booking",
  "common.maintenance.startWorking": "Start working on it",
  "common.maintenance.submitRequest": "Submit request",
  "common.maintenance.title": "Maintenance requests",
  "common.maintenance.titleLabel": "Title",
  "common.maintenance.titlePlaceholder": "e.g. Leaking tap in bathroom",
  "common.maintenance.urgent": "Urgent",
  "common.messaging.conversations": "Conversations",
  "common.messaging.couldNotLoadConversations": "Could not load conversations",
  "common.messaging.couldNotLoadMessages": "Could not load messages",
  "common.messaging.couldNotSend": "Could not send message",
  "common.messaging.descLandlord": "Chat with your tenants about bookings and maintenance.",
  "common.messaging.descStudent": "Chat with your landlord about your booking or room.",
  "common.messaging.eyebrow": "Messages",
  "common.messaging.noConversations": "No conversations yet",
  "common.messaging.noMessagesYet": "No messages yet",
  "common.messaging.selectConversation.desc": "Choose a conversation from the list to view messages.",
  "common.messaging.selectConversation.title": "Select a conversation",
  "common.messaging.signInPrompt": "Sign in to view your messages.",
  "common.messaging.title": "Messages",
  "common.messaging.typePlaceholder": "Type a message…",
  "common.notifications.allCaughtUp": "You're all caught up",
  "common.notifications.allMarkedRead": "All notifications marked as read",
  "common.notifications.couldNotMarkAll": "Could not mark all as read",
  "common.notifications.couldNotMarkRead": "Could not mark as read",
  "common.notifications.eyebrow": "Notifications",
  "common.notifications.markAllRead": "Mark all as read",
  "common.notifications.markAsRead": "Mark as read",
  "common.notifications.new": "New",
  "common.notifications.noNotifications.desc": "You'll see notifications here when there's activity on your account.",
  "common.notifications.noNotifications.title": "No notifications",
  "common.notifications.signInPrompt": "Sign in to view your notifications.",
  "common.notifications.title": "Notifications",
  "common.notifications.unreadDesc.plural": "You have {n} unread notifications",
  "common.notifications.unreadDesc.singular": "You have {n} unread notification",
  "common.notifications.view": "View",
  "common.profile.bio": "Bio",
  "common.profile.bioPlaceholder": "Tell us a bit about yourself…",
  "common.profile.couldNotLoad": "Could not load profile",
  "common.profile.couldNotSave": "Could not save profile",
  "common.profile.description": "Manage your personal information.",
  "common.profile.email": "Email",
  "common.profile.emailHelp": "Used for notifications and account recovery.",
  "common.profile.eyebrow": "Profile",
  "common.profile.firstName": "First name",
  "common.profile.lastName": "Last name",
  "common.profile.phone": "Phone",
  "common.profile.saveChanges": "Save changes",
  "common.profile.saved": "Profile saved",
  "common.profile.saving": "Saving…",
  "common.profile.signInPrompt": "Sign in to view your profile.",
  "common.profile.title": "Profile",
  "common.settings.account": "Account",
  "common.settings.appearance": "Appearance",
  "common.settings.colourTheme": "Colour theme",
  "common.settings.colourThemeDesc": "Choose light or dark mode, or follow your system.",
  "common.settings.couldNotLoadPrefs": "Could not load preferences",
  "common.settings.currency": "Currency",
  "common.settings.currencyNgn": "Nigerian Naira (₦)",
  "common.settings.description": "Manage your account settings and preferences.",
  "common.settings.eyebrow": "Settings",
  "common.settings.language": "Language",
  "common.settings.locale": "Display language",
  "common.settings.notif.digestDesc": "Receive a weekly summary.",
  "common.settings.notif.digestLabel": "Weekly digest",
  "common.settings.notif.emailDesc": "Receive notifications by email.",
  "common.settings.notif.emailLabel": "Email notifications",
  "common.settings.notif.pushDesc": "Receive push notifications.",
  "common.settings.notif.pushLabel": "Push notifications",
  "common.settings.notif.smsDesc": "Receive notifications by SMS.",
  "common.settings.notif.smsLabel": "SMS notifications",
  "common.settings.notif.urgentDesc": "Only receive urgent notifications.",
  "common.settings.notif.urgentLabel": "Urgent only",
  "common.settings.notifications": "Notifications",
  "common.settings.role": "Role",
  "common.settings.title": "Settings",
  "landlord.bookings.description": "Track all bookings across your properties.",
  "landlord.bookings.eyebrow": "Bookings",
  "landlord.bookings.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.bookings.noBookings.title": "No bookings yet",
  "landlord.bookings.signInPrompt": "Sign in to view your bookings.",
  "landlord.bookings.title": "Bookings",
  "landlord.dashboard.activity": "Recent activity",
  "landlord.dashboard.addProperty": "Add property",
  "landlord.dashboard.addPropertyDesc": "List a new property with rooms and floors.",
  "landlord.dashboard.allProperties": "All properties",
  "landlord.dashboard.available": "Available",
  "landlord.dashboard.checkVerification": "Check verification",
  "landlord.dashboard.couldNotLoad": "Could not load dashboard data",
  "landlord.dashboard.description": "Monitor your portfolio, bookings, revenue, and verification status.",
  "landlord.dashboard.due": "Due",
  "landlord.dashboard.eyebrow": "Dashboard",
  "landlord.dashboard.manageRooms": "Manage rooms",
  "landlord.dashboard.needsAttention": "Needs attention",
  "landlord.dashboard.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.dashboard.noBookings.title": "No bookings yet",
  "landlord.dashboard.noPendingPayments": "No pending payments",
  "landlord.dashboard.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.dashboard.noProperties.title": "No properties yet",
  "landlord.dashboard.occupancy": "Occupancy",
  "landlord.dashboard.occupancyHint": "{x} of {y} units occupied",
  "landlord.dashboard.occupancyLabel": "Occupied",
  "landlord.dashboard.occupied": "Occupied",
  "landlord.dashboard.payoutsDesc": "Track your payouts",
  "landlord.dashboard.pendingBooking.plural": "{n} pending bookings",
  "landlord.dashboard.pendingBooking.singular": "{n} pending booking",
  "landlord.dashboard.pendingRevenue": "Pending revenue",
  "landlord.dashboard.pendingRevenueHint": "From bookings awaiting payment",
  "landlord.dashboard.pendingVerification.plural": "{n} properties pending verification",
  "landlord.dashboard.pendingVerification.singular": "{n} property pending verification",
  "landlord.dashboard.portfolio": "Portfolio",
  "landlord.dashboard.quickActions": "Quick actions",
  "landlord.dashboard.recentBookings": "Recent bookings",
  "landlord.dashboard.revenueHint.plural": "From {n} bookings",
  "landlord.dashboard.revenueHint.singular": "From {n} booking",
  "landlord.dashboard.signInPrompt": "Sign in to view your landlord dashboard.",
  "landlord.dashboard.title": "Landlord dashboard",
  "landlord.dashboard.total": "Total",
  "landlord.dashboard.totalRevenue": "Total revenue",
  "landlord.dashboard.totalUnits": "Total units",
  "landlord.dashboard.transactionsDesc": "View all your transactions",
  "landlord.dashboard.unitsHint.plural": "{n} units",
  "landlord.dashboard.unitsHint.singular": "{n} unit",
  "landlord.dashboard.verificationDescAllVerified": "All your properties are verified.",
  "landlord.dashboard.verificationDescPending": "Some properties are still pending verification.",
  "landlord.dashboard.viewAll": "View all",
  "landlord.dashboard.viewBookings": "View bookings",
  "landlord.dashboard.yourProperties": "Your properties",
  "landlord.payouts.bank": "Bank",
  "landlord.payouts.description": "Track your payouts and settlement history.",
  "landlord.payouts.eyebrow": "Payouts",
  "landlord.payouts.fee": "Platform fee",
  "landlord.payouts.gross": "Gross",
  "landlord.payouts.grossVolume": "Gross volume",
  "landlord.payouts.inProgress": "In progress",
  "landlord.payouts.noPayouts.desc": "Your payouts will appear here once bookings are confirmed and settled.",
  "landlord.payouts.noPayouts.title": "No payouts yet",
  "landlord.payouts.pending": "Pending",
  "landlord.payouts.platformFees": "Platform fees",
  "landlord.payouts.scheduled": "Scheduled",
  "landlord.payouts.settled": "Settled",
  "landlord.payouts.settledAt": "Settled on",
  "landlord.payouts.settledCount.plural": "{n} settled payouts",
  "landlord.payouts.settledCount.singular": "{n} settled payout",
  "landlord.payouts.signInPrompt": "Sign in to view your payouts.",
  "landlord.payouts.title": "Payouts",
  "landlord.profile.businessDetails": "Business details",
  "landlord.profile.businessName": "Business name",
  "landlord.profile.businessNamePlaceholder": "e.g. Akoka Properties Ltd.",
  "landlord.profile.description": "Manage your landlord profile and business details.",
  "landlord.profile.displayName": "Display name",
  "landlord.profile.landlordBadge": "Landlord",
  "landlord.profile.officeAddress": "Office address",
  "landlord.profile.officeAddressPlaceholder": "e.g. 12 Allen Avenue, Ikeja",
  "landlord.profile.rcNumber": "RC number",
  "landlord.profile.rcNumberPlaceholder": "e.g. RC1234567",
  "landlord.profile.saveProfile": "Save profile",
  "landlord.profile.title": "Landlord profile",
  "landlord.properties.available": "Available",
  "landlord.properties.couldNotLoad": "Could not load properties",
  "landlord.properties.description": "Manage your property portfolio, floors, and rooms.",
  "landlord.properties.eyebrow": "Properties",
  "landlord.properties.floors": "Floors",
  "landlord.properties.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.properties.noProperties.title": "No properties yet",
  "landlord.properties.searchPlaceholder": "Search by name or area…",
  "landlord.properties.signInPrompt": "Sign in to view your properties.",
  "landlord.properties.title": "Your properties",
  "landlord.properties.units": "Units",
  "landlord.settings.dark": "Dark",
  "landlord.settings.description": "Manage your landlord preferences.",
  "landlord.settings.light": "Light",
  "landlord.settings.notif.digestDesc": "Receive a weekly summary of activity.",
  "landlord.settings.notif.emailDesc": "Receive booking and payment notifications by email.",
  "landlord.settings.notif.pushDesc": "Receive push notifications in your browser.",
  "landlord.settings.system": "System",
  "landlord.transactions.couldNotLoad": "Could not load transactions",
  "landlord.transactions.description": "Every transaction across your properties, with receipts.",
  "landlord.transactions.exportCsv": "Export CSV",
  "landlord.transactions.eyebrow": "Transactions",
  "landlord.transactions.grossReceived": "Gross received",
  "landlord.transactions.netBeforeFee": "Net before platform fee",
  "landlord.transactions.noTransactions.desc": "Transactions will appear here once you start receiving bookings.",
  "landlord.transactions.noTransactions.title": "No transactions yet",
  "landlord.transactions.paymentFees": "Payment fees",
  "landlord.transactions.receipt": "Receipt",
  "landlord.transactions.receiptPdf": "Receipt (PDF)",
  "landlord.transactions.signInPrompt": "Sign in to view your transactions.",
  "landlord.transactions.title": "Transactions",
  "shell.couldNotSignOut": "Could not sign out",
  "shell.couldNotSignOutDesc": "Please check your connection and try again.",
  "student.bookings.bookedAt": "Booked on",
  "student.bookings.checkIn": "Check-in",
  "student.bookings.checkOut": "Check-out",
  "student.bookings.couldNotLoad": "Could not load bookings",
  "student.bookings.description": "Track your active bookings, holds, and payment status.",
  "student.bookings.eyebrow": "Bookings",
  "student.bookings.noBookings.desc": "You haven't booked any rooms yet. Browse properties to get started.",
  "student.bookings.paidInFull": "Paid in full",
  "student.bookings.signInPrompt": "Sign in to view your bookings.",
  "student.bookings.title": "Your bookings",
  "student.dashboard.activeBookings": "Active bookings",
  "student.dashboard.allSettled": "All settled",
  "student.dashboard.awaitingPayment": "Awaiting payment",
  "student.dashboard.bookingAwaiting.plural": "{n} bookings awaiting payment",
  "student.dashboard.bookingAwaiting.singular": "{n} booking awaiting payment",
  "student.dashboard.bookingAwaitingDesc.plural": "Complete payment to confirm your holds before they expire.",
  "student.dashboard.bookingAwaitingDesc.singular": "Complete payment to confirm your hold before it expires.",
  "student.dashboard.browseProperties": "Browse properties",
  "student.dashboard.completeProfile": "Complete your student profile to start booking",
  "student.dashboard.completeProfileAction": "Complete profile",
  "student.dashboard.completeProfileDesc": "Add your university, matric number, and emergency contact. This takes 2 minutes.",
  "student.dashboard.couldNotLoad": "Could not load: {items}. Please refresh.",
  "student.dashboard.eyebrow": "Dashboard",
  "student.dashboard.getSupport": "Get support",
  "student.dashboard.holdExpired": "Hold expired",
  "student.dashboard.new": "New",
  "student.dashboard.noBookings.desc": "Browse properties and place a hold to start your first booking.",
  "student.dashboard.noBookings.title": "No bookings yet",
  "student.dashboard.outstanding": "Outstanding",
  "student.dashboard.paid": "Paid",
  "student.dashboard.payNow": "Pay now",
  "student.dashboard.paymentHistory": "Payment history",
  "student.dashboard.recentBookings": "Recent bookings",
  "student.dashboard.recentNotifications": "Recent notifications",
  "student.dashboard.recentPayments": "Recent payments",
  "student.dashboard.savedProperties": "Saved properties",
  "student.dashboard.searchAccommodation": "Search accommodation",
  "student.dashboard.signInPrompt": "Sign in with a real account to view your dashboard.",
  "student.dashboard.title": "Student dashboard",
  "student.dashboard.totalPaid": "Total paid",
  "student.dashboard.viewAll": "View all",
  "student.dashboard.welcome": "Welcome, {name}",
  "student.dashboard.welcomeDesc": "Manage your bookings, payments, saved properties, and support tickets.",
  "student.payments.awaiting": "Awaiting confirmation",
  "student.payments.backendVerified": "Backend verified",
  "student.payments.bookingRef": "Booking ref",
  "student.payments.couldNotLoad": "Could not load payments",
  "student.payments.description": "Every payment you've made through NetLodge, with downloadable receipts.",
  "student.payments.downloadReceipt": "Download receipt",
  "student.payments.fee": "Fee",
  "student.payments.gateway": "Gateway",
  "student.payments.noPayments.desc": "Your payments will appear here once you start booking rooms.",
  "student.payments.noPayments.title": "No payments yet",
  "student.payments.paidThisYear": "Paid this year",
  "student.payments.pendingPayments": "Pending payments",
  "student.payments.reason": "Reason",
  "student.payments.signInPrompt": "Sign in to view your payment history.",
  "student.payments.successfulPayments.plural": "{n} successful payments",
  "student.payments.successfulPayments.singular": "{n} successful payment",
  "student.payments.title": "Payment history",
  "student.saved.couldNotRemove": "Could not remove",
  "student.saved.description": "Properties you've saved to revisit later.",
  "student.saved.eyebrow": "Saved",
  "student.saved.noSaved.desc": "Tap the heart icon on any property to save it here.",
  "student.saved.noSaved.title": "No saved properties",
  "student.saved.priceOnRequest": "Price on request",
  "student.saved.remove": "Remove",
  "student.saved.removedToast": "Removed from saved",
  "student.saved.savedAt": "Saved on",
  "student.saved.signInPrompt": "Sign in to view your saved properties.",
  "student.saved.title": "Saved properties",

  "common.unit": "Unit",
  "nav.agent.assignments": "Assignments",
  "nav.agent.dashboard": "Dashboard",
  "nav.agent.enquiries": "Enquiries",
  "nav.agent.notifications": "Notifications",
  "nav.agent.profile": "Profile",
  "nav.agent.properties": "Properties",
  "nav.agent.referrals": "Referrals",
  "nav.agent.settings": "Settings",
  "nav.financeAdmin.auditTrail": "Audit trail",
  "nav.financeAdmin.commissions": "Commissions",
  "nav.financeAdmin.disputes": "Disputes",
  "nav.financeAdmin.payments": "Payments",
  "nav.financeAdmin.payouts": "Payouts",
  "nav.financeAdmin.reconciliation": "Reconciliation",
  "nav.financeAdmin.refunds": "Refunds",
  "nav.financeAdmin.reports": "Reports",
  "nav.financeAdmin.transactions": "Transactions",
  "nav.group.account": "Account",
  "nav.group.configuration": "Configuration",
  "nav.group.marketplaceOversight": "Marketplace oversight",
  "nav.group.operations": "Operations",
  "nav.group.platform": "Platform",
  "nav.group.submissions": "Submissions",
  "nav.group.trustSystem": "Trust & system",
  "nav.group.workspace": "Workspace",
  "nav.landlord.availability": "Availability",
  "nav.landlord.bookings": "Bookings",
  "nav.landlord.dashboard": "Dashboard",
  "nav.landlord.getStarted": "Get started",
  "nav.landlord.notifications": "Notifications",
  "nav.landlord.payouts": "Payouts",
  "nav.landlord.pricing": "Pricing",
  "nav.landlord.profile": "Profile",
  "nav.landlord.properties": "Properties",
  "nav.landlord.reports": "Reports",
  "nav.landlord.settings": "Settings",
  "nav.landlord.staff": "Staff",
  "nav.landlord.transactions": "Transactions",
  "nav.landlord.verification": "Verification",
  "nav.manager.availability": "Availability",
  "nav.manager.bookings": "Bookings",
  "nav.manager.dashboard": "Dashboard",
  "nav.manager.inspections": "Inspections",
  "nav.manager.notifications": "Notifications",
  "nav.manager.profile": "Profile",
  "nav.manager.properties": "Properties",
  "nav.manager.rooms": "Rooms",
  "nav.manager.settings": "Settings",
  "nav.student.bookings": "Bookings",
  "nav.student.dashboard": "Dashboard",
  "nav.student.findAccommodation": "Find accommodation",
  "nav.student.notifications": "Notifications",
  "nav.student.payments": "Payments",
  "nav.student.profile": "Profile",
  "nav.student.saved": "Saved",
  "nav.student.security": "Security",
  "nav.student.settings": "Settings",
  "nav.student.support": "Support",
  "nav.superAdmin.announcements": "Announcements",
  "nav.superAdmin.auditLogs": "Audit logs",
  "nav.superAdmin.commissions": "Commissions",
  "nav.superAdmin.facilities": "Facilities",
  "nav.superAdmin.finance": "Finance",
  "nav.superAdmin.integrations": "Integrations",
  "nav.superAdmin.locations": "Locations",
  "nav.superAdmin.overview": "Overview",
  "nav.superAdmin.rolesPermissions": "Roles & permissions",
  "nav.superAdmin.security": "Security",
  "nav.superAdmin.staff": "Staff",
  "nav.superAdmin.support": "Support",
  "nav.superAdmin.systemHealth": "System health",
  "nav.superAdmin.testimonials": "Testimonials",
  "nav.superAdmin.universities": "Universities",
  "nav.superAdmin.users": "Users",
  "nav.superAdmin.verifications": "Verifications",
  "nav.supportStaff.conversations": "Conversations",
  "nav.supportStaff.customers": "Customers",
  "nav.supportStaff.escalations": "Escalations",
  "nav.supportStaff.knowledgeBase": "Knowledge base",
  "nav.supportStaff.reports": "Reports",
  "nav.supportStaff.tickets": "Tickets",
  "nav.verificationOfficer.decisionHistory": "Decision history",
  "nav.verificationOfficer.escalations": "Escalations",
  "nav.verificationOfficer.landlords": "Landlords",
  "nav.verificationOfficer.properties": "Properties",
  "nav.verificationOfficer.reviewQueue": "Review queue",
  "nav.verificationOfficer.roomEvidence": "Room evidence",
  "nav.verificationOfficer.studentKyc": "Student KYC",
  "shell.dashboard": "Dashboard",
  "shell.mainNav": "Main navigation",
  "shell.openMenu": "Open menu",
  "shell.profile": "Profile",
  "shell.settings": "Settings",
  "shell.signOut": "Sign out",
  "shell.signingOut": "Signing out…",
  "shell.viewSite": "View site",

  "legal.eyebrow": "Ìlànà òfin",
  "legal.cookies.title": "Ìlànà Cookie",
  "legal.cookies.description": "Bí NetLodge ṣe ń lo cookie àti àwọn ohun èlò tó jọ mọ́.",
  "legal.privacy.title": "Ìlànà Ìkọ́kọ́",
  "legal.privacy.description": "Bí NetLodge ṣe ń kó, ń lo, àti ń dáàbọ̀ àwọn dátà rẹ.",
  "legal.terms.title": "Ìlànà Iṣẹ́",
  "legal.terms.description": "Àwọn ìlànà àti àwọn ọ̀rọ̀ fún ìlò NetLodge.",
  "propertyDetail.floors": "Àwọn òkè",
  "propertyDetail.totalUnits": "Gbogbo àwọn nkeji",
  "propertyDetail.availableUnits": "Wà",
  "propertyDetail.breadcrumb": "Ìtọ́sọ́nà",
  "propertyDetail.home": "Ilé",
  "propertyDetail.eachUnitBookable": "Nkeji kọ̀ọ̀kan ní ìsàlẹ̀ jẹ́ ohun ìṣọ̀kan tì a lè gbé, pẹ̀lú àwọn àwòrán, ohun èlò, àti owó rẹ̀. Tẹ nkeji kan láti wo gbogbo àwọn àwòrán àti àdéhùn ìdásílẹ̀.",
  "propertyDetail.buildingWideFacilities": "Àwọn wọ̀nyí jẹ́ ohun èlò ilé gbogbo tì a ń pín káàkiri gbogbo àwọn nkeji. A ṣàfihàn àwọn ohun èlò inú nkeji lórí ojúewé yálà kọ̀ọ̀kan.",
  "propertyDetail.addressSharedAfterBooking": "A ń pín adírẹ́ẹ̀sì òótọ́ pẹ̀lú rẹ lẹ́yìn tí a bá ti fìmọ́ ìdásílẹ̀.",
  "roomDetail.bookingTerms": "Àdéhùn ìdásílẹ̀",
  "roomDetail.unitCurrently": "Nkeji yìí wà báyìí",
  "roomDetail.furnishing": "Ohun èlò",
  "roomDetail.noPhotos.title": "Kò sí àwọn àwòrán fún nkeji yìí báyìí",
  "roomDetail.noPhotos.desc": "Bẹ́ oní ilé kí ó gbé àwọn àwòrán, tàbí ṣètò ìyẹ̀wò.",
  "roomDetail.capacity": "Agbára",
  "roomDetail.size": "Iwọn",
  "roomDetail.person": "ènìyàn",
  "roomDetail.people": "àwọn ènìyàn",
  "roomDetail.previous": "Ẹ̀yìn",
  "roomDetail.next": "Èyí tó ń bọ̀",
  "error.title": "Nkan ṣẹlẹ̀ tó kò tọ́",
  "error.description": "Àṣìṣe kan ṣẹlẹ̀. Jọ̀wọ́ gbiyànjú lẹ́ẹ̀kansi.",
  "error.retry": "Gbiyànjú lẹ́ẹ̀kansi",
  "hero.search.ariaLabel": "Wá ibùgbé",
  "hero.search.placeholder": "Orúkọ ilé, agbègbè, tàbí ọ̀rọ̀-ọ̀ṣùwọ̀n",
  "hero.search.budget": "Owó ìpín",

  "hero.search.advancedFilters": "Àwọn ìyàn tó wúlò",
  "hero.search.searchButton": "Wáwá",

};

// ─── Hausa ────────────────────────────────────────────────────────────
const ha: Translations = {
  "nav.search": "Nema",
  "nav.universities": "Jami'o'i",
  "nav.properties": "Gidaje",
  "nav.howItWorks": "Yadda ake aiki",
  "nav.safety": "Tsaro",
  "nav.help": "Taimako",
  "nav.signIn": "Shiga",
  "nav.getStarted": "Fara",
  "nav.dashboard": "Dashboard",
  "nav.signOut": "Fita",
  "nav.viewSite": "Duba shafin",
  "nav.goToDashboard": "Tafi dashboard",
  "nav.signedInAs": "An shiga a matsayin",
  "nav.settings": "Saituna",
  "nav.signingOut": "Ana fita…",
  "nav.openMenu": "Bude menu",
  "nav.closeMenu": "Rufe menu",
  "nav.navigationMenu": "Menu din kewayawa",
  "nav.primaryNav": "Babban",
  "footer.discover": "Gano",
  "footer.trustSafety": "Amincewa da tsaro",
  "footer.forLandlords": "Don masu gida",
  "footer.support": "Taimako",
  "footer.searchAccommodation": "Nemo masauki",
  "footer.verification": "Tabbatarwa",
  "footer.bookingSafety": "Tsaron booking",
  "footer.reportListing": "Bayar da rahoton gida",
  "footer.privacyPolicy": "Manufar keɓantawa",
  "footer.listAProperty": "Saka gida",
  "footer.landlordGuide": "Jagorar mai gida",
  "footer.termsOfService": "Sharuɗɗan sabis",
  "footer.helpCentre": "Cibiyar taimako",
  "footer.contactUs": "Tuntuɓe mu",
  "footer.cookiePolicy": "Manufar cookie",
  "footer.description": "NetLodge wuri ne da ake neman masaukin dalibai a kusa da jami'o'in Najeriya. Ana yin booking na daki, ba gini kawai.",
  "footer.copyright": "An gina shi don daliban Najeriya.",
  "footer.verificationNote": "Ana tabbatar da asali da mallakar kowane mutum kafin a nuna shi.",
  "hero.titlePrefix": "Nemo gidan",
  "hero.titleHighlight": "da aka tabbatar",
  "hero.titleSuffix": "dalibi a Najeriya.",
  "hero.findYourKind": "Nemo irin wurin da kake so",
  "hero.popularUniversities": "Jami'o'i masu shahara",
  "hero.howItWorks": "Yadda ake aiki",
  "hero.browseAll": "Bincika duka",
  "hero.viewAll": "Duba duka",
  "hero.title": "Nemo gidan dalibi da aka tabbatar a Najeriya.",
  "hero.subtitle": "NetLodge taimaka dalibai su samu masauki a kusa da jami'o'in Najeriya. Duba dakuna daban-daban, duba kayan aikin, kuma ka yi booking na dakin da za ka zauna.",
  "hero.browse": "Nemo masauki",
  "hero.listProperty": "Saka dukiyarka",
  "hero.stats.verifiedProperties": "Gidajen da aka tabbatar",
  "hero.stats.availableRooms": "Dakuna da ke akwai",
  "hero.stats.universities": "Jami'o'i",
  "home.whereWeAre.eyebrow": "Inda za ka same mu",
  "home.whereWeAre.title": "Jami'o'in da muke aiki",
  "home.whereWeAre.viewAll": "Dukkan jami'o'i",
  "home.whereWeAre.verified": "An tabbatar",
  "home.whereWeAre.pending": "Ana tabbatarwa",
  "home.categories.eyebrow": "Zaɓa ta nau'in daki",
  "home.categories.title": "Zaɓa wuri mai daidai da rayuwar ka",
  "home.categories.subtitle": "Daga self-contain zuwa dakuna masu rabuwa, kowane zaɓi daki ne na gaske da za ka iya dubawa da booking.",
  "home.categories.selfContain": "Self-contain",
  "home.categories.singleRoom": "Daki guda",
  "home.categories.sharedRoom": "Dakin rabuwa",
  "home.categories.bedSpace": "Wurin kwana",
  "home.categories.apartment": "Apartment",
  "home.categories.studio": "Studio",
  "home.benefits.eyebrow": "Me ya sa NetLodge",
  "home.benefits.title": "An gina shi don masaukin dalibi da aka tabbatar",
  "home.benefits.subtitle": "Kowane listing an tabbatar, kowane daki na gaske, kuma kowane biya ana tabbatarwa daga backend.",
  "home.benefits.verifiedListing.title": "Listings da aka tabbatar kawai",
  "home.benefits.verifiedListing.desc": "Kowane mai gida akan NetLodge dole ya wuce tabbatarwa akan asali, adireshin, da mallaka kafin listings su fita. Ba a buƙatar sake hasashe.",
  "home.benefits.bookActualRoom.title": "Booking na dakin da kansa",
  "home.benefits.bookActualRoom.desc": "Muna ɗaukar kowane daki da za a iya booking — daki, self-contain, ko apartment — a matsayin abu daban. Duba dakin, ba gini kawai.",
  "home.benefits.holdBeforePay.title": "Rike kafin ka biya",
  "home.benefits.holdBeforePay.desc": "Rike daki na ɗan lokaci yayin da kake shirya biya. Server ne ke kula da rike — ba zai yiwu a yi booking biyu ba.",
  "home.benefits.transparentPricing.title": "Farar da ake gani",
  "home.benefits.transparentPricing.desc": "Duba haya, kudin sabis, kudin tsaro, da kudin dandalin gaba ɗaya. Ba a boye kudin wakili, ba a yi ɗaukar hoto ba.",
  "home.faqs.eyebrow": "Tambayoyin da ake yawan yi",
  "home.faqs.title": "Tambayoyi, mun amsa",
  "home.faqs.subtitle": "Duk abin da dalibai da masu gida ke tambaya kafin su booking ko listing.",
  "home.faqs.q1": "Ta yaya zan san cewa listing na gaske ne?",
  "home.faqs.a1": "Kowane mai gida akan NetLodge dole ya kammala tabbatarwa akan asali, adireshin, da mallaka. Ana duba gidaje kafin a iya yin booking. Alamar tabbatarwa akan kowane listing tana nuna maku ayyana inda mai gida yake cikin tsari.",
  "home.faqs.q2": "Ina yin booking na daki ko na gini?",
  "home.faqs.a2": "Kana yin booking na wani daki na musamman — wanda zai iya zama self-contain, daki guda, wurin kwana, ko apartment gaba ɗaya. Kowane daki yana da ID nasa, hotuna, kayan aiki, fara, da samunwa.",
  "home.faqs.q3": "Ta yaya biya ke aiki?",
  "home.faqs.a3": "Da zarar ka fara booking, zaka sami rike na ɗan lokaci da hanyar biya ta Paystack. Ana tabbatar da booking ka ne kawai bayan backend ta tabbatar da biya. Ba mu taɓa furta cewa biya ta yi nasara daga birausa ba.",
  "home.faqs.q4": "Me idan ni mai gida ne da dakuna 200?",
  "home.faqs.a4": "Dashboard na mai gida yana baka damar tsara dakuna ta hanyar bene, sanya farar musamman ta kowane bene, canza farar daki daya, kuma ƙirƙiri dakuna da yawa a lokaci guda. Interface din na iya ɗaukar daruruwan dakuna kowane gida.",
  "home.faqs.q5": "Wanne jami'o'i ne ake tallafawa?",
  "home.faqs.a5": "Mun fara da UNILAG, Akoka, Yaba, Bariga da Somolu. Ana ƙara wasu jami'o'i — zaka iya neman jami'ar ka ta hanyar fom ɗin tuntuɓar.",
  "home.faqs.q6": "Zan iya listing gida da nake kula da shi don wani?",
  "home.faqs.a6": "Ee. Ana iya naɗa manajoji zuwa gidajen mai gida da izini na musamman. Wakilai na iya kula da tambayoyi da bayanreferral ba tare da samun damar kuɗin mai gida ko sarrafa tabbatarwa ba.",
  "home.trust.eyebrow": "Amincewa da tsaro",
  "home.trust.title": "Yadda tabbatarwa ke aiki",
  "home.trust.subtitle": "Matakan tsari huɗu suna tsakanin mai gida da listing na jama'a. Kowanne yana da takardu kuma ana iya duba shi.",
  "home.trust.step1.title": "Tabbatar da asali",
  "home.trust.step1.desc": "Masu gida suna gabatar da ID na gwamnati (NIN, lasisin tuki, ko fasport na duniya).",
  "home.trust.step2.title": "Adireshin da mallaka",
  "home.trust.step2.desc": "Ana duba takardun kuɗi na gida da takardun mallaka. Ana tsara dubawa idan ana buƙata.",
  "home.trust.step3.title": "Dubawa na gida",
  "home.trust.step3.desc": "Dubawa akan wurin tana tabbatar da cewa gida yana daidai yadda aka faɗa, tare da kayan aikin da aka faɗa.",
  "home.trust.step4.title": "Alamar tabbatarwa",
  "home.trust.step4.desc": "Sai bayan duk dubawa ta wuce ne listing ke samun alamar tabbatarwa kuma ya zama ana iya booking da shi a bainar jama'a.",
  "home.featuredProperty.view": "Duba",
  "home.featured.eyebrow": "Gidajen da aka fi so",
  "home.featured.title": "Listings da aka zaɓa da hannu",
  "home.featured.description": "Zaɓi na gidajen da aka tabbatar kwanan nan a kusa da UNILAG. Kowane gida yana ɗauke da dakuna waɗanda za a iya booking.",
  "home.featured.viewAll": "Dukkan gidaje",
  "home.featured.emptyState": "Muna karɓar masu gida yanzu. Dakuna da aka tabbatar za su bayyana nan ba da daɗe ba.",
  "home.fresh.eyebrow": "Sababi akan NetLodge",
  "home.fresh.title": "Dakuna da aka ƙara kwanan nan",
  "home.fresh.description": "Kalar da aka tabbatar na baya-bayan nan.",
  "home.fresh.ariaLabel": "Gidajen da aka ƙara kwanan nan",
  "home.studentBenefits.eyebrow": "Don dalibai",
  "home.studentBenefits.title": "Me ya sa dalibai suka zaɓi NetLodge",
  "home.studentBenefits.description": "Kasuwa da aka gina bisa yadda daliban Najeriya ke neman da kuma samun masauki.",
  "home.studentBenefits.builtForCampus.title": "An gina shi don jami'ar ka",
  "home.studentBenefits.builtForCampus.desc": "Zaɓa ta jami'a, unguwa, da nisan tafiya zuwa aji.",
  "home.studentBenefits.safeHolds.title": "Rike mai tsaro",
  "home.studentBenefits.safeHolds.desc": "Rike da server ke kula da shi yana ajiye daki yayin da kake shirya biya.",
  "home.studentBenefits.honestListings.title": "Listings na gaskiya",
  "home.studentBenefits.honestListings.desc": "Hotunan matakin daki suna nufin kana ganin dakin da kansa, ba waje mai kyau kawai ba.",
  "home.studentBenefits.realSupport.title": "Taimako na gaske",
  "home.studentBenefits.realSupport.desc": "Bude tikiti daga dashboard ɗinka kuma mutum zai mayar maka martani.",
  "home.studentBenefits.createAccount": "Ƙirƙiri asusun dalibin ka",
  "home.landlordCta.eyebrow": "Don masu gida",
  "home.landlordCta.title": "Listing ɗaya. Kula da daruruwan dakuna.",
  "home.landlordCta.description": "Dashboard na mai gida yana kula da gaskiyar masaukin daliban Najeriya — lissafin bene-bene, farar daki, ayyuka da yawa, tsarin booking, payouts da tabbatarwa. An gina shi don foda daga 1 zuwa 1,000 dakuna.",
  "home.landlordCta.feature1": "Wizard na gida mai matakai da adana daftarin",
  "home.landlordCta.feature2": "Farar musamman ta bene tare da canje-canje na kowane daki",
  "home.landlordCta.feature3": "Ƙirƙiri dakuna 200 cikin aiki ɗaya",
  "home.landlordCta.feature4": "Booking, biya, da reconciliation na payout a wuri ɗaya",
  "home.landlordCta.startListing": "Fara listing",
  "home.landlordCta.guide": "Jagorar mai gida",
  "home.howItWorksCta.title": "Shin ka shirya don neman gidan dalibin ka?",
  "home.howItWorksCta.description": "Nemo dakuna da aka tabbatar a kusa da jami'ar ka, duba kayan aikin akan layi, kuma ka book dakin da za ka zauna — ba gini kawai.",
  "home.howItWorksCta.browse": "Nemo masauki",
  "home.howItWorksCta.howItWorks": "Yadda ake aiki",
  "home.testimonials.eyebrow": "Daga al'ummar NetLodge",
  "home.testimonials.title": "Abin da dalibai da masu gida ke faɗa",
  "home.testimonials.description": "Bitoci na gaske daga masu amfani da NetLodge da aka tabbatar. Muna duba kowane taƙaitaccen magana kafin mu buga shi.",
  "search.eyebrow": "Nema",
  "search.title": "Nemi masaukin ka",
  "search.description": "Zaɓa ta jami'a, unguwa, kasafin kuɗi, nau'in daki, da kayan aiki.",
  "search.placeholder": "Sunan gida, unguwa, ko kalma",
  "search.sortBy": "Tsara ta",
  "search.sortRelevance": "Muhimmanci",
  "search.sortPriceAsc": "Fara: ƙasa zuwa sama",
  "search.sortPriceDesc": "Fara: sama zuwa ƙasa",
  "search.sortNewest": "Sababi",
  "search.university": "Jami'a",
  "search.anyUniversity": "Kowane jami'a",
  "search.neighbourhood": "Unguwa",
  "search.anyNeighbourhood": "Kowane unguwa",
  "search.annualRent": "Hajan shekara (NGN)",
  "search.min": "Ƙasa",
  "search.max": "Sama",
  "search.unitType": "Nau'in daki",
  "search.facilities": "Kayan aiki",
  "search.resetAll": "Sake saita dukkan zaɓuɓɓuka",
  "search.filters": "Zaɓuɓɓuka",
  "search.activeCount": "{n} suna aiki",
  "search.searching": "Ana neman…",
  "search.resultsCount": "{n} sakamako",
  "search.resultSingular": "{n} sakamako",
  "search.clearFilters": "Share zaɓuɓɓuka",
  "search.listView": "Jeri",
  "search.mapView": "Taswira",
  "search.noMatches.title": "Ba a same wani ba",
  "search.noMatches.description": "Gwada fadada zaɓuɓɓuka — cire iyaka kan kasafin, faɗaɗa unguwar ka, ko canza nau'in dakinka.",
  "properties.eyebrow": "Jerin gidaje",
  "properties.title": "Dukkan gidajen da aka tabbatar",
  "properties.description": "Kowane gida da ke ƙasa an wuce tabbatarwa akan asali, adireshin, da mallaka. Kowanne yana ɗauke da dakuna, self-contain, ko apartments waɗanda za a iya booking.",
  "properties.placeholder": "Nema ta suna, unguwa, ko kalma…",
  "properties.allUniversities": "Dukkan jami'o'i",
  "properties.error.title": "Ba za a iya loda gidaje ba",
  "properties.retry": "Sake gwadawa",
  "properties.empty.title": "Ba a samu wani gida ba",
  "properties.empty.description": "Gwada daidaita neman ka ko sake dubawa yayin da masu gida ke saka sababbin gidaje.",
  "properties.showing": "Ana nuna {x} daga cikin {y} gidaje",
  "properties.previous": "Da gab",
  "properties.next": "Na gaba",
  "properties.pageOf": "Shafi {x} na {y}",
  "properties.landlordCta.prefix": "Shin mai gida ne kana da dakuna don saka?",
  "properties.landlordCta.action": "Saka dukiyar ka",
  "propertyDetail.notFound.title": "Ba a samu gida ba",
  "propertyDetail.notFound.description": "Wannan gidan ana iya cewa an cire shi ko ba ya cikin jerin jama'a.",
  "propertyDetail.aboutProperty": "Game da wannan gida",
  "propertyDetail.facilities": "Kayan aiki",
  "propertyDetail.floorsAndRooms": "Benaye da dakuna",
  "propertyDetail.location": "Wuri",
  "propertyDetail.reviews": "Bitoci",
  "propertyDetail.availableRooms": "Dakuna da ke akwai",
  "propertyDetail.fromPrice": "Daga",
  "propertyDetail.viewRooms": "Duba dakuna",
  "propertyDetail.viewRoom": "Duba daki",
  "propertyDetail.browseRooms": "Dubba dakuna",
  "propertyDetail.noRooms.title": "Ba sa dakuna akwai",
  "propertyDetail.noRooms.description": "Dukkan dakuna a wannan gidan an booking su ko an rike su. Sake dubawa baya kaɗan.",
  "propertyDetail.similarProperties": "Wasu gidaje irin wannan",
  "propertyDetail.save": "Ajiye",
  "propertyDetail.saved": "An ajiye",
  "propertyDetail.verified": "An tabbatar",
  "propertyDetail.pending": "Ana tabbatarwa",
  "propertyDetail.priceFrom": "Fara daga",
  "propertyDetail.listingsCount": "{n} listings",
  "propertyDetail.contactLandlord": "Tuntuɓi mai gida",
  "propertyDetail.viewProperty": "Duba gida",
  "roomDetail.notFound.title": "Ba a samu daki ba",
  "roomDetail.notFound.description": "Wannan dakin ana iya cewa an cire shi ko ba ya cikin jerin jama'a.",
  "roomDetail.aboutRoom": "Game da wannan daki",
  "roomDetail.facilities": "Kayan aiki",
  "roomDetail.pricingBreakdown": "Rabe na farar",
  "roomDetail.baseRent": "Hajan asali",
  "roomDetail.serviceFee": "Kudin sabis",
  "roomDetail.cautionDeposit": "Kudin tsaro",
  "roomDetail.additionalCharges": "Ƙarin kuɗi",
  "roomDetail.total": "Jimillar",
  "roomDetail.rentalPeriod": "Tsawon lokacin haya",
  "roomDetail.checkInDate": "Kwanan shiga",
  "roomDetail.selectCheckIn": "Zaɓi kwanan shiga",
  "roomDetail.acceptTerms": "Na karɓi sharuɗɗan booking kuma na fahimci cewa za a rike masauki na awanni 24 don biya.",
  "roomDetail.placeHold": "Rike masauki kuma ci gaba",
  "roomDetail.confirmHold": "Tabbatar da rike",
  "roomDetail.holdPlaced.title": "An rike masauki",
  "roomDetail.holdPlaced.description": "An rike dakinka na awanni 24. Kammala biya daga dashboard ɗinka don tabbatar da booking.",
  "roomDetail.signUpToBook": "Dalibai kawai za su iya yin booking",
  "roomDetail.pricingUnavailable": "Ba za a iya samun fara ba",
  "roomDetail.gallery": "Hotuna",
  "roomDetail.roomType": "Nau'in daki",
  "roomDetail.status": "Matsayi",
  "roomDetail.available": "Akwai",
  "roomDetail.booked": "An booking",
  "roomDetail.held": "An rike",
  "roomDetail.landlord": "Mai gida",
  "roomDetail.viewProperty": "Duba gida",
  "roomDetail.bedrooms": "Dakuna",
  "roomDetail.bathrooms": "Dakin wanka",
  "roomDetail.area": "Wuri",
  "roomDetail.backToProperty": "Koma ga gida",
  "universities.eyebrow": "Zaɓa ta jami'a",
  "universities.title": "Jami'o'i akan NetLodge",
  "universities.description": "Nemi masaukin dalibi da aka tabbatar a kusa da manyan jami'o'in Najeriya. Danna jami'a don duba unguwanni da listings.",
  "universities.error": "Ba za a iya loda jami'o'i ba. Da fatan sake gwadawa daga baya.",
  "universities.empty": "Babu jami'o'i da aka jera a yanzu. sake dubawa baya kaɗan.",
  "universities.listingsCount": "{n} listings",
  "universities.comingSoon.eyebrow": "Zo baya kaɗan",
  "universities.comingSoon.title": "Karawa jami'o'i kowane lokaci",
  "universities.comingSoon.description": "NetLodge ya fara da UNILAG da yankunan da ke kewaye. Wadannan jami'o'i suna gaba a tsarinmu — nemi naka ta hanyar fom ɗin tuntuɓar.",
  "universities.comingSoon.soon": "ba daɗe ba",
  "universities.requestCampus.prefix": "Ba ka ga jami'ar ka ba?",
  "universities.requestCampus.action": "Nemi ta",
  "universities.requestCampus.suffix": "— muna fifita jami'o'i masu yawan buƙatun.",
  "universityDetail.listingsCount": "{n} listings",
  "universityDetail.neighbourhoods.eyebrow": "Unguwanni masu shahara",
  "universityDetail.neighbourhoods.description": "Kowane unguwa tana da yanayinta, fararta, da nisan tafiya zuwa jami'a.",
  "universityDetail.neighbourhoods.empty": "Babu unguwanni da aka jera.",
  "universityDetail.neighbourhoods.priceVaries": "Fara ta bambanta",
  "universityDetail.neighbourhoods.typicalPerYear": "/shekara ta yau da kullun",
  "universityDetail.properties.eyebrow": "Listings da aka tabbatar",
  "universityDetail.properties.viewAll": "Duba duka",
  "universityDetail.properties.empty.title": "Babu listings da aka tabbatar",
  "universityDetail.properties.empty.action": "Faɗa mana",
  "universityDetail.related.eyebrow": "Binciko",
  "universityDetail.related.title": "Wasu jami'o'i",
  "howItWorks.eyebrow": "Yadda ake aiki",
  "howItWorks.title": "Daga nema zuwa shiga, cikin matakai biyar",
  "howItWorks.description": "NetLodge yana sa masaukin dalibi da aka tabbatar ya kasance ana iya nema, dubawa, da booking — ga dalibai da masu gida.",
  "howItWorks.students.eyebrow": "Don dalibai",
  "howItWorks.students.title": "Nemo kuma book dakinka",
  "howItWorks.students.description": "Kana yin booking na dakin da kansa, ba gini kawai. Kowane daki yana da hotunansa, kayan aikin sa, da fararsa.",
  "howItWorks.students.search.title": "Nema",
  "howItWorks.students.search.desc": "Zaɓa ta jami'a, unguwa, kasafin kuɗi, nau'in daki, da kayan aiki.",
  "howItWorks.students.inspect.title": "Duba dakin",
  "howItWorks.students.inspect.desc": "Kowane daki yana da hotunansa, kayan aikin sa, da sharuɗɗan booking — ba gini kawai.",
  "howItWorks.students.hold.title": "Rike masauki",
  "howItWorks.students.hold.desc": "Rike daki na awanni 24 yayin da kake shirya biya. Server ne ke kula da rike.",
  "howItWorks.students.pay.title": "Biya cikin tsaro",
  "howItWorks.students.pay.desc": "Biya ta Paystack. Ana tabbatar da booking ka ne kawai bayan backend ta tabbatar da biya.",
  "howItWorks.students.moveIn.title": "Shiga cikin gida",
  "howItWorks.students.moveIn.desc": "Karɓi lambar mai gida da adireshin da ya dace da zarar an tabbatar da booking ka.",
  "howItWorks.students.startSearch": "Fara neman ka",
  "howItWorks.landlords.eyebrow": "Don masu gida",
  "howItWorks.landlords.title": "Listing, tsara, kuma samu kuɗi",
  "howItWorks.landlords.description": "Dashboard na musamman don foda ɗaya zuwa dubu. Farar bene, ayyuka da yawa, payouts.",
  "howItWorks.landlords.verified.title": "Sami tabbatarwa",
  "howItWorks.landlords.verified.desc": "Gabatar da ID, adireshin, da shaidar mallaka. NetLodge yana duba gida akan wuri.",
  "howItWorks.landlords.listProperty.title": "Saka dukiyar ka",
  "howItWorks.landlords.listProperty.desc": "Yi amfani da wizard mai matakai don kwatanta gini, wuri, kayan aiki, da ƙa'idoji.",
  "howItWorks.landlords.organiseRooms.title": "Tsara dakuna",
  "howItWorks.landlords.organiseRooms.desc": "Ƙirƙiri benaye da dakuna, sanya farar musamman ta bene, canza farar daki daya.",
  "howItWorks.landlords.assignStaff.title": "Naɗa ma'aikata",
  "howItWorks.landlords.assignStaff.desc": "Ƙara manajoji da wakilai da izini na musamman — suna ganin abin da ka bari kawai.",
  "howItWorks.landlords.getPaid.title": "Sami kuɗi",
  "howItWorks.landlords.getPaid.desc": "Payouts suna shiga asusun bankin ka bayan kowane booking aka tabbatar da aka yi reconciliation.",
  "howItWorks.landlords.startListing": "Fara listing",
  "howItWorks.booking.eyebrow": "Tsaron booking da biya",
  "howItWorks.booking.title": "Me ya sa backend — ba birausa — ke yanke hukunci.",
  "howItWorks.booking.description": "Tsari na booking mai amintacce yana da matakai takwas. Frontend yana nuna kowanne mataki, amma backend kawai zai iya canzawa tsakanin su. Ga abin da ke faruwa a baya lokacin da kake book daki.",
  "howItWorks.booking.step1": "Dubawa na samun daki (server-side, atomic)",
  "howItWorks.booking.step2": "Rike na ɗan lokaci tare da ƙarewa (server-controlled)",
  "howItWorks.booking.step3": "Ƙirƙirar booking (server-issued reference)",
  "howItWorks.booking.step4": "Fara biya (Paystack link)",
  "howItWorks.booking.step5": "Tabbatar da biya mai aminci (Paystack webhook → backend)",
  "howItWorks.booking.step6": "Tabbatar da booking (server yana canza matsayi)",
  "howItWorks.booking.step7": "Reconciliation na biya (kuɗi, refunds, ledger)",
  "howItWorks.booking.step8": "Tabbatar da refunds da payouts (server-settled)",
  "howItWorks.booking.disclaimer": "Frontend na iya nuna biya a matsayin \"an fara\" amma ba zai taɓa nuna shi a matsayin \"mai nasara\" ba tare da tabbatarwa daga backend ba.",
  "safety.eyebrow": "Amincewa da tsaro",
  "safety.title": "Yadda NetLodge ke kare dalibai",
  "safety.description": "Kowane mai gida yana wuce tabbatarwa akan asali, adireshin, da mallaka. Ana duba kowane gida akan wuri. Kowane biya yana wucewa ta Paystack tare da tabbatarwa daga backend.",
  "safety.landlordVerification.eyebrow": "Tabbatar da mai gida",
  "safety.landlordVerification.title": "Matakan tabbatarwa huɗu",
  "safety.landlordVerification.description": "Mai gida yana samun alamar tabbatarwa ne kawai bayan dukkan matakan huɗu su wuce.",
  "safety.verification.identity.title": "Tabbatar da asali",
  "safety.verification.identity.desc": "ID na gwamnati — NIN, lasisin tuki, ko fasport na duniya.",
  "safety.verification.address.title": "Tabbatar da adireshin",
  "safety.verification.address.desc": "Kudin wutar lantarki, ruwa, ko sharar gida wanda ya wuce kwanaki 90.",
  "safety.verification.ownership.title": "Mallaka ko ikon kulawa",
  "safety.verification.ownership.desc": "Takardar shaidar mallaka, takardar canja wuri, ko kwangilar kulawa da aka yiwa notarization.",
  "safety.verification.inspection.title": "Dubawa akan wuri",
  "safety.verification.inspection.desc": "Memba na NetLodge yana ziyartar gidan kuma yana tabbatar da kayan aiki, tsaro, da yanayin.",
  "safety.bookingSafety.eyebrow": "Tsaron booking",
  "safety.bookingSafety.title": "Kariyar biya, daga farko zuwa ƙarshe",
  "safety.bookingSafety.description": "Lokacin da kake book daki akan NetLodge, kuɗin ka Paystack ne ke kula da shi kuma backend mu ke reconciliation. Masu gida ba sa karɓar kuɗi kai tsaye — suna samun payouts bayan an tabbatar da booking kuma an yi reconciliation.",
  "safety.bookingSafety.fundsHeld": "Paystack na rike kuɗi har sai an tabbatar",
  "safety.bookingSafety.backendVerifies": "Backend tana tabbatar da kowane biya ta hanyar Paystack webhook",
  "safety.bookingSafety.cautionTracked": "Ana bin diddigin kudin tsaro wanda ake mayarwa daban",
  "safety.bookingSafety.payoutsAfterConfirm": "Ana fitar da payouts kawai bayan an tabbatar da booking",
  "safety.bookingSafety.refundsProcessed": "Ana sarrafa refunds don bookings da suka gaza ko aka soke",
  "safety.bookingSafety.auditTrail": "Cikakken tarihin audit na kowane ma'amala",
  "safety.tips.eyebrow": "Kasance cikin wayi",
  "safety.tips.title": "Shawarwarin tsaro don dalibai",
  "safety.tips.description": "Ko da tare da tabbatarwa, binciken gabaɗaya na kare ka ƙari.",
  "safety.tips.tip1": "Kullum duba dakin kafin ka biya — ba gini kawai.",
  "safety.tips.tip2": "Kar ka biya ta wajen NetLodge. Biya a wajen platform tana rasa kariyon mu.",
  "safety.tips.tip3": "Yi amfani da tsarin saƙon da ke app don rubuta duk wata yarjejeniya.",
  "safety.tips.tip4": "Ɗauki hotunan daki a ranar shiga ka kuma ka raba su da mai gidinga.",
  "safety.tips.tip5": "Ba da rahoton kowane listing da ke neman biya a wajen platform nan da nan.",
  "safety.report.eyebrow": "Bayar da rahoton listing",
  "safety.report.title": "Ga wani abu ba daidai ba?",
  "safety.report.description": "Idan listing na neman biya a wajen platform, ko baya nuna dakin daidai, ko yana ɗaukar hoto mai tuhuma, ba da rahoto ta hanyar fom din tuntuɓarmu. Muna binciken kowane rahoto cikin awanni 48.",
  "safety.report.action": "Bayar da rahoton listing",
  "safety.refund.title": "Manufar refund (taƙaitaccen)",
  "safety.refund.description": "Cikakken refunds suna samuwa idan an soke booking cikin awanni 24 na saka ko idan mai gida ya kasa tabbatarwa. Ana mayar da refunds na kudin tsaro a ƙarshen lokacin haya, kaɗan daga duk wani lalacewar da aka rubuta. Duba {terms} mu don cikakken manufa.",
  "safety.refund.viewTerms": "sharuɗɗan sabis",
  "help.eyebrow": "Cibiyar taimako",
  "help.title": "Ta yaya za mu taimake ka?",
  "help.description": "Zaɓa ta sashe, nemi FAQs mu, ko tuntuɓi tawagar mu. Yawancin tambayoyin an amsa su a ƙasa.",
  "help.searchPlaceholder": "Nemi labaran taimako…",
  "help.searchLabel": "Nemi labaran taimako",
  "help.categories.eyebrow": "Zaɓa ta sashe",
  "help.categories.title": "Mashahuran batutuwa",
  "help.categories.findingAccommodation.title": "Neman masauki",
  "help.categories.findingAccommodation.desc": "Nema, filters, da gidajen da aka adana.",
  "help.categories.bookings.title": "Bookings",
  "help.categories.bookings.desc": "Rike, tabbatarwa, soke.",
  "help.categories.payments.title": "Biya da refunds",
  "help.categories.payments.desc": "Paystack, refunds, kudin tsaro.",
  "help.categories.verification.title": "Tabbatarwa da tsaro",
  "help.categories.verification.desc": "Yadda muke tabbatarwa, yadda za ka kasance cikin tsaro.",
  "help.categories.listing.title": "Listing gida",
  "help.categories.listing.desc": "Wizard, benaye, dakuna, fara.",
  "help.categories.account.title": "Asusu da bayanin martaba",
  "help.categories.account.desc": "Bayanin martaba, tsaro, ayyuka.",
  "help.faqs.eyebrow": "Tambayoyin da ake yawan yi",
  "help.faqs.title": "Duba dukkan FAQs",
  "help.faqs.finding.q1": "Ta yaya zan nemi masauki kusa da jami'ata ta?",
  "help.faqs.finding.a1": "Yi amfani da neman shafi na farko ko shafin /search. Zaɓa ta jami'a, unguwa, kasafin kuɗi, nau'in daki, da kayan aiki. Sakamako yana aiki da URL don ka iya adana ko raba neman.",
  "help.faqs.finding.q2": "Zan iya adana gidaje don dubawa daga baya?",
  "help.faqs.finding.a2": "Ee. Shiga a matsayin dalibi, buɗe kowane gida, ka kuma danna alamar zuciya. Adana gidaje suna fitowa a /student/saved.",
  "help.faqs.finding.q3": "Hotunan na dakin da kansa ne?",
  "help.faqs.finding.a3": "Idan zai yiwu, ee. Idan hoton mai wakiltar ne maimakon dakin, ana bayyana hakan a bayyane a shafin daki.",
  "help.faqs.bookings.q1": "Me ne rike na ɗan lokaci?",
  "help.faqs.bookings.a1": "Rike yana ajiye wani daki na musamman na awanni 24 yayin da kake shirya biya. Server ne ke kula da rike — ba wani dalibi da zai iya book daki guda a lokacin rike ka.",
  "help.faqs.bookings.q2": "Lokacin da ake tabbatar da booking ta?",
  "help.faqs.bookings.a2": "Ana tabbatar da booking ka bayan backend mu ta tabbatar da biya daga Paystack. Frontend na iya nuna 'an fara biya' amma ba zai taɓa nuna 'mai nasara' ba tare da tabbatarwa daga backend ba.",
  "help.faqs.bookings.q3": "Zan iya soke booking?",
  "help.faqs.bookings.a3": "Ee. Cikakken refunds suna aiki cikin awanni 24 na saka booking, ko idan mai gida ya kasa tabbatarwa. Bayan haka, cancantar refund ta dogara da lokacin soke a cikin sharuɗɗan haya ka.",
  "help.faqs.payments.q1": "Ta yaya zan biya?",
  "help.faqs.payments.a1": "Dukkan biya suna wucewa ta Paystack. Bayan ka fara booking zaka ga link na Paystack a dashboard ɗinka. Ba mu karɓi biya a wajen platform ba.",
  "help.faqs.payments.q2": "Lokacin da ake mayar da kudin tsaro na?",
  "help.faqs.payments.a2": "A ƙarshen lokacin haya ka, kaɗan daga duk wani lalacegar da aka rubuta. Ana mayar da refunds zuwa hanyar biya ta asali kuma yawanci suna zuwa cikin kwanakin aiki 5–7.",
  "help.faqs.payments.q3": "Me idan biya ta gaza?",
  "help.faqs.payments.a3": "Idan Paystack ta ruwaito gazawar, rike ka ya kasance yana aiki har sai ya ƙare. Zaka iya sake gwadawa biya daga shafin booking ka. Ba kuɗi ke fita daga asusunka a lokacin ƙoƙari da ya gaza.",
  "help.faqs.listing.q1": "Lokacin da tabbatarwa ke ɗauka?",
  "help.faqs.listing.a1": "Yawanci kwanakin aiki 3–5 bayan ka gabatar da dukkan shaidar. Ana tsara dubawa akan wuri a cikin wannan lokacin.",
  "help.faqs.listing.q2": "Zan iya listing dakuna 200?",
  "help.faqs.listing.a2": "Ee. Dashboard na mai gida yana tallafawa ƙirƙirar dakuna da yawa, farar musamman ta bene, da canje-canje na kowane daki. An tsara interface ɗin don duk foda.",
  "help.faqs.listing.q3": "Zan iya naɗa manaja?",
  "help.faqs.listing.a3": "Ee. Ƙara manajoji daga /landlord/staff kuma ka naɗa su zuwa wasu gidaje. Manajoji suna ganin gidajen da aka naɗa su kacqan da ayyukan da aka yarda.",
  "help.contactCta.title": "Har yanzu kana buƙatar taimako?",
  "help.contactCta.description": "Tawagar taimakon mu tana amsawa cikin kwana na aiki ɗaya.",
  "help.contactCta.action": "Tuntuɓi taimako",
  "contact.eyebrow": "Tuntuɓe mu",
  "contact.title": "Tuntuɓe mu",
  "contact.description": "Tambayoyi, buƙatun haɗin gwiwa, rahotannin tsaro — muna karanta kowane saƙo. Yi tsammanin amsa cikin kwana na aiki ɗaya.",
  "contact.form.yourName": "Sunan ka",
  "contact.form.email": "Imel",
  "contact.form.category": "Rukuni",
  "contact.form.subject": "Batun",
  "contact.form.message": "Saƙo",
  "contact.form.messagePlaceholder": "Faɗa mu yadda za mu taimake ka…",
  "contact.form.send": "Aika saƙo",
  "contact.form.sending": "Ana aika…",
  "contact.form.categoryGeneral": "Janar tambaya",
  "contact.form.categoryPress": "Labarai",
  "contact.form.categoryPartnership": "Haɗin gwiwa",
  "contact.form.categorySupport": "Taimako",
  "contact.form.categorySafety": "Rahoton tsaro",
  "contact.success.title": "An aika saƙon",
  "contact.success.description": "Godiyar da ka tuntuɓe mu. Za mu amsa imel ɗinka cikin kwana na aiki ɗaya.",
  "contact.success.sendAnother": "Aika wani saƙo",
  "contact.sidebar.otherWays": "Sauran hanyoyin tuntuɓar mu",
  "contact.sidebar.responseTimes": "Lokutan amsawa",
  "contact.sidebar.generalEnquiries": "Janar tambayoyi: kwana na aiki 1",
  "contact.sidebar.supportTickets": "Tikitocin taimako: awanni 4",
  "contact.sidebar.safetyReports": "Rahotannin tsaro: awanni 2",
  "contact.sidebar.contactDetailsPending": "Za a nuna cikakkun bayanan tuntuɓar nan da lokacin da ake saita su. A yanzu, yi amfani da fom ɗin da ke sama — muna amsawa cikin kwana na aiki ɗaya.",
  "contact.toast.success.title": "An aika saƙon",
  "contact.toast.success.description": "Tawagar mu za ta amsa cikin kwana na aiki ɗaya.",
  "contact.toast.error.title": "Ba za a iya aikawa saƙo ba",
  "common.loading": "Ana loda…",
  "common.save": "Ajiye",
  "common.cancel": "Soke",
  "common.retry": "Sake gwadawa",
  "common.back": "Koma baya",
  "common.viewAll": "Duba duka",
  "common.signIn": "Shiga",
  "common.signUp": "Yi rajista",
  "booking.placeHold": "Rike masauki kuma ci gaba",
  "booking.checkIn": "Kwanan shiga",
  "booking.rentalPeriod": "Tsawon lokacin haya",
  "booking.acceptTerms": "Na amince da sharuddan booking kuma na fahimci cewa za a rike masauki na awanni 24 don biya.",
  "booking.confirmHold": "Tabbatar da rike",
  "booking.holdPlaced": "An rike masauki",
  "booking.signUpToBook": "Dalibai kawai za su iya yin booking",
  "auth.welcomeBack": "Sannu da dawowa",
  "auth.signInToContinue": "Shiga asusun NetLodge din ka don ci gaba.",
  "auth.createAccount": "Ƙirƙiri asusunka",
  "auth.forgotPassword": "Ka manta kalmar sirri?",
  "auth.email": "Imel",
  "auth.password": "Kalmar sirri",
  "auth.signIn": "Shiga",
  "auth.register": "Ƙirƙiri asusun",
  "auth.rememberMe": "Ka tuna ni a wannan na'urar",
  "auth.noAccount": "Babu asusunka?",
  "auth.createOne": "Ƙirƙiri ɗaya",
  "auth.signingIn": "Ana shiga…",
  "auth.invalidCredentials": "Imel ko kalmar sirri ba daidai ba.",
  "common.maintenance.booking": "Related booking",
  "common.maintenance.cat.appliance": "Appliance",
  "common.maintenance.cat.cleanliness": "Cleanliness",
  "common.maintenance.cat.electrical": "Electrical",
  "common.maintenance.cat.other": "Other",
  "common.maintenance.cat.pestControl": "Pest control",
  "common.maintenance.cat.plumbing": "Plumbing",
  "common.maintenance.cat.security": "Security",
  "common.maintenance.cat.structural": "Structural",
  "common.maintenance.category": "Category",
  "common.maintenance.couldNotLoad": "Could not load maintenance requests",
  "common.maintenance.couldNotSubmit": "Could not submit request",
  "common.maintenance.couldNotUpdate": "Could not update request",
  "common.maintenance.descLandlord": "Track and resolve maintenance requests from your tenants.",
  "common.maintenance.descStudent": "Report issues with your room and track their resolution.",
  "common.maintenance.descriptionLabel": "Description",
  "common.maintenance.descriptionPlaceholder": "Describe the issue in detail…",
  "common.maintenance.eyebrowLandlord": "Maintenance requests",
  "common.maintenance.eyebrowStudent": "Maintenance",
  "common.maintenance.fillRequired": "Please fill in all required fields",
  "common.maintenance.markResolved": "Mark as resolved",
  "common.maintenance.markedAs": "Marked as {status}",
  "common.maintenance.newRequest": "New request",
  "common.maintenance.noRequests.descLandlord": "No maintenance requests from your tenants yet.",
  "common.maintenance.noRequests.descStudentHasBooking": "No maintenance requests yet. Report an issue if something needs fixing.",
  "common.maintenance.noRequests.descStudentNoBooking": "You need an active booking to report a maintenance issue.",
  "common.maintenance.noRequests.title": "No maintenance requests",
  "common.maintenance.prio.high": "High",
  "common.maintenance.prio.low": "Low",
  "common.maintenance.prio.medium": "Medium",
  "common.maintenance.prio.urgent": "Urgent",
  "common.maintenance.priority": "Priority",
  "common.maintenance.reportIssueDesc": "Tell us what's wrong and we'll get it sorted.",
  "common.maintenance.reportIssueTitle": "Report an issue",
  "common.maintenance.requestSubmittedDesc": "Your maintenance request has been submitted. We'll be in touch soon.",
  "common.maintenance.requestSubmittedTitle": "Request submitted",
  "common.maintenance.resolution": "Resolution",
  "common.maintenance.resolutionNotesPrompt": "Add resolution notes (visible to the student)",
  "common.maintenance.resolvedAt": "Resolved on",
  "common.maintenance.selectBooking": "Select a booking",
  "common.maintenance.selectValidBooking": "Please select a valid booking",
  "common.maintenance.startWorking": "Start working on it",
  "common.maintenance.submitRequest": "Submit request",
  "common.maintenance.title": "Maintenance requests",
  "common.maintenance.titleLabel": "Title",
  "common.maintenance.titlePlaceholder": "e.g. Leaking tap in bathroom",
  "common.maintenance.urgent": "Urgent",
  "common.messaging.conversations": "Conversations",
  "common.messaging.couldNotLoadConversations": "Could not load conversations",
  "common.messaging.couldNotLoadMessages": "Could not load messages",
  "common.messaging.couldNotSend": "Could not send message",
  "common.messaging.descLandlord": "Chat with your tenants about bookings and maintenance.",
  "common.messaging.descStudent": "Chat with your landlord about your booking or room.",
  "common.messaging.eyebrow": "Messages",
  "common.messaging.noConversations": "No conversations yet",
  "common.messaging.noMessagesYet": "No messages yet",
  "common.messaging.selectConversation.desc": "Choose a conversation from the list to view messages.",
  "common.messaging.selectConversation.title": "Select a conversation",
  "common.messaging.signInPrompt": "Sign in to view your messages.",
  "common.messaging.title": "Messages",
  "common.messaging.typePlaceholder": "Type a message…",
  "common.notifications.allCaughtUp": "You're all caught up",
  "common.notifications.allMarkedRead": "All notifications marked as read",
  "common.notifications.couldNotMarkAll": "Could not mark all as read",
  "common.notifications.couldNotMarkRead": "Could not mark as read",
  "common.notifications.eyebrow": "Notifications",
  "common.notifications.markAllRead": "Mark all as read",
  "common.notifications.markAsRead": "Mark as read",
  "common.notifications.new": "New",
  "common.notifications.noNotifications.desc": "You'll see notifications here when there's activity on your account.",
  "common.notifications.noNotifications.title": "No notifications",
  "common.notifications.signInPrompt": "Sign in to view your notifications.",
  "common.notifications.title": "Notifications",
  "common.notifications.unreadDesc.plural": "You have {n} unread notifications",
  "common.notifications.unreadDesc.singular": "You have {n} unread notification",
  "common.notifications.view": "View",
  "common.profile.bio": "Bio",
  "common.profile.bioPlaceholder": "Tell us a bit about yourself…",
  "common.profile.couldNotLoad": "Could not load profile",
  "common.profile.couldNotSave": "Could not save profile",
  "common.profile.description": "Manage your personal information.",
  "common.profile.email": "Email",
  "common.profile.emailHelp": "Used for notifications and account recovery.",
  "common.profile.eyebrow": "Profile",
  "common.profile.firstName": "First name",
  "common.profile.lastName": "Last name",
  "common.profile.phone": "Phone",
  "common.profile.saveChanges": "Save changes",
  "common.profile.saved": "Profile saved",
  "common.profile.saving": "Saving…",
  "common.profile.signInPrompt": "Sign in to view your profile.",
  "common.profile.title": "Profile",
  "common.settings.account": "Account",
  "common.settings.appearance": "Appearance",
  "common.settings.colourTheme": "Colour theme",
  "common.settings.colourThemeDesc": "Choose light or dark mode, or follow your system.",
  "common.settings.couldNotLoadPrefs": "Could not load preferences",
  "common.settings.currency": "Currency",
  "common.settings.currencyNgn": "Nigerian Naira (₦)",
  "common.settings.description": "Manage your account settings and preferences.",
  "common.settings.eyebrow": "Settings",
  "common.settings.language": "Language",
  "common.settings.locale": "Display language",
  "common.settings.notif.digestDesc": "Receive a weekly summary.",
  "common.settings.notif.digestLabel": "Weekly digest",
  "common.settings.notif.emailDesc": "Receive notifications by email.",
  "common.settings.notif.emailLabel": "Email notifications",
  "common.settings.notif.pushDesc": "Receive push notifications.",
  "common.settings.notif.pushLabel": "Push notifications",
  "common.settings.notif.smsDesc": "Receive notifications by SMS.",
  "common.settings.notif.smsLabel": "SMS notifications",
  "common.settings.notif.urgentDesc": "Only receive urgent notifications.",
  "common.settings.notif.urgentLabel": "Urgent only",
  "common.settings.notifications": "Notifications",
  "common.settings.role": "Role",
  "common.settings.title": "Settings",
  "landlord.bookings.description": "Track all bookings across your properties.",
  "landlord.bookings.eyebrow": "Bookings",
  "landlord.bookings.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.bookings.noBookings.title": "No bookings yet",
  "landlord.bookings.signInPrompt": "Sign in to view your bookings.",
  "landlord.bookings.title": "Bookings",
  "landlord.dashboard.activity": "Recent activity",
  "landlord.dashboard.addProperty": "Add property",
  "landlord.dashboard.addPropertyDesc": "List a new property with rooms and floors.",
  "landlord.dashboard.allProperties": "All properties",
  "landlord.dashboard.available": "Available",
  "landlord.dashboard.checkVerification": "Check verification",
  "landlord.dashboard.couldNotLoad": "Could not load dashboard data",
  "landlord.dashboard.description": "Monitor your portfolio, bookings, revenue, and verification status.",
  "landlord.dashboard.due": "Due",
  "landlord.dashboard.eyebrow": "Dashboard",
  "landlord.dashboard.manageRooms": "Manage rooms",
  "landlord.dashboard.needsAttention": "Needs attention",
  "landlord.dashboard.noBookings.desc": "Bookings will appear here once students start booking your rooms.",
  "landlord.dashboard.noBookings.title": "No bookings yet",
  "landlord.dashboard.noPendingPayments": "No pending payments",
  "landlord.dashboard.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.dashboard.noProperties.title": "No properties yet",
  "landlord.dashboard.occupancy": "Occupancy",
  "landlord.dashboard.occupancyHint": "{x} of {y} units occupied",
  "landlord.dashboard.occupancyLabel": "Occupied",
  "landlord.dashboard.occupied": "Occupied",
  "landlord.dashboard.payoutsDesc": "Track your payouts",
  "landlord.dashboard.pendingBooking.plural": "{n} pending bookings",
  "landlord.dashboard.pendingBooking.singular": "{n} pending booking",
  "landlord.dashboard.pendingRevenue": "Pending revenue",
  "landlord.dashboard.pendingRevenueHint": "From bookings awaiting payment",
  "landlord.dashboard.pendingVerification.plural": "{n} properties pending verification",
  "landlord.dashboard.pendingVerification.singular": "{n} property pending verification",
  "landlord.dashboard.portfolio": "Portfolio",
  "landlord.dashboard.quickActions": "Quick actions",
  "landlord.dashboard.recentBookings": "Recent bookings",
  "landlord.dashboard.revenueHint.plural": "From {n} bookings",
  "landlord.dashboard.revenueHint.singular": "From {n} booking",
  "landlord.dashboard.signInPrompt": "Sign in to view your landlord dashboard.",
  "landlord.dashboard.title": "Landlord dashboard",
  "landlord.dashboard.total": "Total",
  "landlord.dashboard.totalRevenue": "Total revenue",
  "landlord.dashboard.totalUnits": "Total units",
  "landlord.dashboard.transactionsDesc": "View all your transactions",
  "landlord.dashboard.unitsHint.plural": "{n} units",
  "landlord.dashboard.unitsHint.singular": "{n} unit",
  "landlord.dashboard.verificationDescAllVerified": "All your properties are verified.",
  "landlord.dashboard.verificationDescPending": "Some properties are still pending verification.",
  "landlord.dashboard.viewAll": "View all",
  "landlord.dashboard.viewBookings": "View bookings",
  "landlord.dashboard.yourProperties": "Your properties",
  "landlord.payouts.bank": "Bank",
  "landlord.payouts.description": "Track your payouts and settlement history.",
  "landlord.payouts.eyebrow": "Payouts",
  "landlord.payouts.fee": "Platform fee",
  "landlord.payouts.gross": "Gross",
  "landlord.payouts.grossVolume": "Gross volume",
  "landlord.payouts.inProgress": "In progress",
  "landlord.payouts.noPayouts.desc": "Your payouts will appear here once bookings are confirmed and settled.",
  "landlord.payouts.noPayouts.title": "No payouts yet",
  "landlord.payouts.pending": "Pending",
  "landlord.payouts.platformFees": "Platform fees",
  "landlord.payouts.scheduled": "Scheduled",
  "landlord.payouts.settled": "Settled",
  "landlord.payouts.settledAt": "Settled on",
  "landlord.payouts.settledCount.plural": "{n} settled payouts",
  "landlord.payouts.settledCount.singular": "{n} settled payout",
  "landlord.payouts.signInPrompt": "Sign in to view your payouts.",
  "landlord.payouts.title": "Payouts",
  "landlord.profile.businessDetails": "Business details",
  "landlord.profile.businessName": "Business name",
  "landlord.profile.businessNamePlaceholder": "e.g. Akoka Properties Ltd.",
  "landlord.profile.description": "Manage your landlord profile and business details.",
  "landlord.profile.displayName": "Display name",
  "landlord.profile.landlordBadge": "Landlord",
  "landlord.profile.officeAddress": "Office address",
  "landlord.profile.officeAddressPlaceholder": "e.g. 12 Allen Avenue, Ikeja",
  "landlord.profile.rcNumber": "RC number",
  "landlord.profile.rcNumberPlaceholder": "e.g. RC1234567",
  "landlord.profile.saveProfile": "Save profile",
  "landlord.profile.title": "Landlord profile",
  "landlord.properties.available": "Available",
  "landlord.properties.couldNotLoad": "Could not load properties",
  "landlord.properties.description": "Manage your property portfolio, floors, and rooms.",
  "landlord.properties.eyebrow": "Properties",
  "landlord.properties.floors": "Floors",
  "landlord.properties.noProperties.desc": "Add your first property to start receiving bookings.",
  "landlord.properties.noProperties.title": "No properties yet",
  "landlord.properties.searchPlaceholder": "Search by name or area…",
  "landlord.properties.signInPrompt": "Sign in to view your properties.",
  "landlord.properties.title": "Your properties",
  "landlord.properties.units": "Units",
  "landlord.settings.dark": "Dark",
  "landlord.settings.description": "Manage your landlord preferences.",
  "landlord.settings.light": "Light",
  "landlord.settings.notif.digestDesc": "Receive a weekly summary of activity.",
  "landlord.settings.notif.emailDesc": "Receive booking and payment notifications by email.",
  "landlord.settings.notif.pushDesc": "Receive push notifications in your browser.",
  "landlord.settings.system": "System",
  "landlord.transactions.couldNotLoad": "Could not load transactions",
  "landlord.transactions.description": "Every transaction across your properties, with receipts.",
  "landlord.transactions.exportCsv": "Export CSV",
  "landlord.transactions.eyebrow": "Transactions",
  "landlord.transactions.grossReceived": "Gross received",
  "landlord.transactions.netBeforeFee": "Net before platform fee",
  "landlord.transactions.noTransactions.desc": "Transactions will appear here once you start receiving bookings.",
  "landlord.transactions.noTransactions.title": "No transactions yet",
  "landlord.transactions.paymentFees": "Payment fees",
  "landlord.transactions.receipt": "Receipt",
  "landlord.transactions.receiptPdf": "Receipt (PDF)",
  "landlord.transactions.signInPrompt": "Sign in to view your transactions.",
  "landlord.transactions.title": "Transactions",
  "shell.couldNotSignOut": "Could not sign out",
  "shell.couldNotSignOutDesc": "Please check your connection and try again.",
  "student.bookings.bookedAt": "Booked on",
  "student.bookings.checkIn": "Check-in",
  "student.bookings.checkOut": "Check-out",
  "student.bookings.couldNotLoad": "Could not load bookings",
  "student.bookings.description": "Track your active bookings, holds, and payment status.",
  "student.bookings.eyebrow": "Bookings",
  "student.bookings.noBookings.desc": "You haven't booked any rooms yet. Browse properties to get started.",
  "student.bookings.paidInFull": "Paid in full",
  "student.bookings.signInPrompt": "Sign in to view your bookings.",
  "student.bookings.title": "Your bookings",
  "student.dashboard.activeBookings": "Active bookings",
  "student.dashboard.allSettled": "All settled",
  "student.dashboard.awaitingPayment": "Awaiting payment",
  "student.dashboard.bookingAwaiting.plural": "{n} bookings awaiting payment",
  "student.dashboard.bookingAwaiting.singular": "{n} booking awaiting payment",
  "student.dashboard.bookingAwaitingDesc.plural": "Complete payment to confirm your holds before they expire.",
  "student.dashboard.bookingAwaitingDesc.singular": "Complete payment to confirm your hold before it expires.",
  "student.dashboard.browseProperties": "Browse properties",
  "student.dashboard.completeProfile": "Complete your student profile to start booking",
  "student.dashboard.completeProfileAction": "Complete profile",
  "student.dashboard.completeProfileDesc": "Add your university, matric number, and emergency contact. This takes 2 minutes.",
  "student.dashboard.couldNotLoad": "Could not load: {items}. Please refresh.",
  "student.dashboard.eyebrow": "Dashboard",
  "student.dashboard.getSupport": "Get support",
  "student.dashboard.holdExpired": "Hold expired",
  "student.dashboard.new": "New",
  "student.dashboard.noBookings.desc": "Browse properties and place a hold to start your first booking.",
  "student.dashboard.noBookings.title": "No bookings yet",
  "student.dashboard.outstanding": "Outstanding",
  "student.dashboard.paid": "Paid",
  "student.dashboard.payNow": "Pay now",
  "student.dashboard.paymentHistory": "Payment history",
  "student.dashboard.recentBookings": "Recent bookings",
  "student.dashboard.recentNotifications": "Recent notifications",
  "student.dashboard.recentPayments": "Recent payments",
  "student.dashboard.savedProperties": "Saved properties",
  "student.dashboard.searchAccommodation": "Search accommodation",
  "student.dashboard.signInPrompt": "Sign in with a real account to view your dashboard.",
  "student.dashboard.title": "Student dashboard",
  "student.dashboard.totalPaid": "Total paid",
  "student.dashboard.viewAll": "View all",
  "student.dashboard.welcome": "Welcome, {name}",
  "student.dashboard.welcomeDesc": "Manage your bookings, payments, saved properties, and support tickets.",
  "student.payments.awaiting": "Awaiting confirmation",
  "student.payments.backendVerified": "Backend verified",
  "student.payments.bookingRef": "Booking ref",
  "student.payments.couldNotLoad": "Could not load payments",
  "student.payments.description": "Every payment you've made through NetLodge, with downloadable receipts.",
  "student.payments.downloadReceipt": "Download receipt",
  "student.payments.fee": "Fee",
  "student.payments.gateway": "Gateway",
  "student.payments.noPayments.desc": "Your payments will appear here once you start booking rooms.",
  "student.payments.noPayments.title": "No payments yet",
  "student.payments.paidThisYear": "Paid this year",
  "student.payments.pendingPayments": "Pending payments",
  "student.payments.reason": "Reason",
  "student.payments.signInPrompt": "Sign in to view your payment history.",
  "student.payments.successfulPayments.plural": "{n} successful payments",
  "student.payments.successfulPayments.singular": "{n} successful payment",
  "student.payments.title": "Payment history",
  "student.saved.couldNotRemove": "Could not remove",
  "student.saved.description": "Properties you've saved to revisit later.",
  "student.saved.eyebrow": "Saved",
  "student.saved.noSaved.desc": "Tap the heart icon on any property to save it here.",
  "student.saved.noSaved.title": "No saved properties",
  "student.saved.priceOnRequest": "Price on request",
  "student.saved.remove": "Remove",
  "student.saved.removedToast": "Removed from saved",
  "student.saved.savedAt": "Saved on",
  "student.saved.signInPrompt": "Sign in to view your saved properties.",
  "student.saved.title": "Saved properties",

  "common.unit": "Unit",
  "nav.agent.assignments": "Assignments",
  "nav.agent.dashboard": "Dashboard",
  "nav.agent.enquiries": "Enquiries",
  "nav.agent.notifications": "Notifications",
  "nav.agent.profile": "Profile",
  "nav.agent.properties": "Properties",
  "nav.agent.referrals": "Referrals",
  "nav.agent.settings": "Settings",
  "nav.financeAdmin.auditTrail": "Audit trail",
  "nav.financeAdmin.commissions": "Commissions",
  "nav.financeAdmin.disputes": "Disputes",
  "nav.financeAdmin.payments": "Payments",
  "nav.financeAdmin.payouts": "Payouts",
  "nav.financeAdmin.reconciliation": "Reconciliation",
  "nav.financeAdmin.refunds": "Refunds",
  "nav.financeAdmin.reports": "Reports",
  "nav.financeAdmin.transactions": "Transactions",
  "nav.group.account": "Account",
  "nav.group.configuration": "Configuration",
  "nav.group.marketplaceOversight": "Marketplace oversight",
  "nav.group.operations": "Operations",
  "nav.group.platform": "Platform",
  "nav.group.submissions": "Submissions",
  "nav.group.trustSystem": "Trust & system",
  "nav.group.workspace": "Workspace",
  "nav.landlord.availability": "Availability",
  "nav.landlord.bookings": "Bookings",
  "nav.landlord.dashboard": "Dashboard",
  "nav.landlord.getStarted": "Get started",
  "nav.landlord.notifications": "Notifications",
  "nav.landlord.payouts": "Payouts",
  "nav.landlord.pricing": "Pricing",
  "nav.landlord.profile": "Profile",
  "nav.landlord.properties": "Properties",
  "nav.landlord.reports": "Reports",
  "nav.landlord.settings": "Settings",
  "nav.landlord.staff": "Staff",
  "nav.landlord.transactions": "Transactions",
  "nav.landlord.verification": "Verification",
  "nav.manager.availability": "Availability",
  "nav.manager.bookings": "Bookings",
  "nav.manager.dashboard": "Dashboard",
  "nav.manager.inspections": "Inspections",
  "nav.manager.notifications": "Notifications",
  "nav.manager.profile": "Profile",
  "nav.manager.properties": "Properties",
  "nav.manager.rooms": "Rooms",
  "nav.manager.settings": "Settings",
  "nav.student.bookings": "Bookings",
  "nav.student.dashboard": "Dashboard",
  "nav.student.findAccommodation": "Find accommodation",
  "nav.student.notifications": "Notifications",
  "nav.student.payments": "Payments",
  "nav.student.profile": "Profile",
  "nav.student.saved": "Saved",
  "nav.student.security": "Security",
  "nav.student.settings": "Settings",
  "nav.student.support": "Support",
  "nav.superAdmin.announcements": "Announcements",
  "nav.superAdmin.auditLogs": "Audit logs",
  "nav.superAdmin.commissions": "Commissions",
  "nav.superAdmin.facilities": "Facilities",
  "nav.superAdmin.finance": "Finance",
  "nav.superAdmin.integrations": "Integrations",
  "nav.superAdmin.locations": "Locations",
  "nav.superAdmin.overview": "Overview",
  "nav.superAdmin.rolesPermissions": "Roles & permissions",
  "nav.superAdmin.security": "Security",
  "nav.superAdmin.staff": "Staff",
  "nav.superAdmin.support": "Support",
  "nav.superAdmin.systemHealth": "System health",
  "nav.superAdmin.testimonials": "Testimonials",
  "nav.superAdmin.universities": "Universities",
  "nav.superAdmin.users": "Users",
  "nav.superAdmin.verifications": "Verifications",
  "nav.supportStaff.conversations": "Conversations",
  "nav.supportStaff.customers": "Customers",
  "nav.supportStaff.escalations": "Escalations",
  "nav.supportStaff.knowledgeBase": "Knowledge base",
  "nav.supportStaff.reports": "Reports",
  "nav.supportStaff.tickets": "Tickets",
  "nav.verificationOfficer.decisionHistory": "Decision history",
  "nav.verificationOfficer.escalations": "Escalations",
  "nav.verificationOfficer.landlords": "Landlords",
  "nav.verificationOfficer.properties": "Properties",
  "nav.verificationOfficer.reviewQueue": "Review queue",
  "nav.verificationOfficer.roomEvidence": "Room evidence",
  "nav.verificationOfficer.studentKyc": "Student KYC",
  "shell.dashboard": "Dashboard",
  "shell.mainNav": "Main navigation",
  "shell.openMenu": "Open menu",
  "shell.profile": "Profile",
  "shell.settings": "Settings",
  "shell.signOut": "Sign out",
  "shell.signingOut": "Signing out…",
  "shell.viewSite": "View site",

  "legal.eyebrow": "Doka",
  "legal.cookies.title": "Manufar Cookie",
  "legal.cookies.description": "Yadda NetLodge ke amfani da cookie da irin fasahohin.",
  "legal.privacy.title": "Manufar Keɓantawa",
  "legal.privacy.description": "Yadda NetLodge ke tattara, amfani, da kare bayanan ka.",
  "legal.terms.title": "Sharuɗɗan Sabis",
  "legal.terms.description": "Sharuɗɗa da ƙa'idojin amfani da NetLodge.",
  "propertyDetail.floors": "Benaye",
  "propertyDetail.totalUnits": "Jimillar nkeji",
  "propertyDetail.availableUnits": "Samarwa",
  "propertyDetail.breadcrumb": "Kewayawa",
  "propertyDetail.home": "Gida",
  "propertyDetail.eachUnitBookable": "Kowane nkeji da ke ƙasa abu ne na musamman da za a iya booking, tare da hotunansa, kayan aikin sa, da fararsa. Danna nkeji don duba duk hotuna da sharuɗɗan booking.",
  "propertyDetail.buildingWideFacilities": "Waɗannan kayan aikin gida ne waɗanda ake raba waɗanda ke cikin dukkan nkeji. An jera kayan aikin cikin nkeji akan kowane shafin daki.",
  "propertyDetail.addressSharedAfterBooking": "Ana raba ainihin adireshin da ka kawai bayan an tabbatar da booking.",
  "roomDetail.bookingTerms": "Sharuɗɗan booking",
  "roomDetail.unitCurrently": "Wannan nkeji yanzu",
  "roomDetail.furnishing": "Kayan daki",
  "roomDetail.noPhotos.title": "Babu hotuna don wannan nkeji yanzu",
  "roomDetail.noPhotos.desc": "Nemi mai gida ya sauke hotuna, ko tsara ziyara.",
  "roomDetail.capacity": "Karɓa",
  "roomDetail.size": "Girman",
  "roomDetail.person": "mutum",
  "roomDetail.people": "mutane",
  "roomDetail.previous": "Da gab",
  "roomDetail.next": "Na gaba",
  "error.title": "Wani abu ya same ba daidai ba",
  "error.description": "Kuskure ya same. Da fatan sake gwadawa.",
  "error.retry": "Sake gwadawa",
  "hero.search.ariaLabel": "Nemo masauki",
  "hero.search.placeholder": "Sunan gida, unguwa, ko kalma",
  "hero.search.budget": "Kasafin",

  "hero.search.advancedFilters": "Zaɓuɓɓuka na musamman",
  "hero.search.searchButton": "Nema",

};

export const dictionaries: Record<Locale, Translations> = { en, ig, yo, ha };
export { en, ig, yo, ha };

import { frMissing } from "./translationsFrMissing";
import { extendedTranslations } from "./translationsExtended";

export type Language = "en" | "rw" | "fr";

export interface Translations {
  // Navigation
  dashboard: string;
  products: string;
  services: string;
  inventories: string;
  workers: string;
  worker: string;
  expenses: string;
  billing: string;
  sales: string;
  reports: string;
  settings: string;
  bookings: string;
  logout: string;
  sidebarSectionOverview: string;
  sidebarSectionOperations: string;
  sidebarSectionFinance: string;
  sidebarSectionInsights: string;
  sidebarSectionAccount: string;
  
  // Common
  save: string;
  update: string;
  updating: string;
  saving: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  name: string;
  price: string;
  search: string;
  filter: string;
  loading: string;
  signIn: string;
  getStarted: string;
  
  // Settings
  businessInfo: string;
  security: string;
  language: string;
  businessName: string;
  ownerName: string;
  emailAddress: string;
  saveChanges: string;
  changePin: string;
  setPin: string;
  currentPin: string;
  newPin: string;
  confirmPin: string;
  
  // Products
  productName: string;
  category: string;
  cost: string;
  costPrice: string;
  selling: string;
  sellingPrice: string;
  stock: string;
  addProduct: string;
  productsAvailable: string;
  noProductsYet: string;
  editProduct: string;
  deleteProduct: string;
  stockQuantity: string;
  initialStock: string;
  minimumStock: string;
  
  // Sales
  recordSale: string;
  recordSales: string;
  quantity: string;
  enterQuantity: string;
  paymentMethod: string;
  saleDate: string;
  cash: string;
  momoPay: string;
  card: string;
  airtelPay: string;
  bankTransfer: string;
  
  // Reports
  totalRevenue: string;
  totalProfit: string;
  totalSales: string;
  export: string;
  
  // Home
  runBusinessSmarter: string;
  features: string;
  pricing: string;
  testimonials: string;
  whatOurUsersSay: string;
  productManagement: string;
  salesTracking: string;
  reportsAnalytics: string;
  offlineSupport: string;
  addEditManageInventory: string;
  trackStockLevels: string;
  recordSalesTransactions: string;
  trackRevenueProfits: string;
  viewDetailedReports: string;
  generateComprehensiveAnalytics: string;
  workOfflineAutoSync: string;
  dataAlwaysSafeAccessible: string;
  basicPlan: string;
  proPlan: string;
  enterprisePlan: string;
  customPlan: string;
  perMonth: string;
  everythingInBasic: string;
  unlimitedProducts: string;
  advancedAnalyticsInsights: string;
  exportReports: string;
  prioritySupport: string;
  everythingInPro: string;
  multiUserAccess: string;
  advancedSecurityFeatures: string;
  apiAccessIntegrations: string;
  dedicatedAccountManager: string;
  everythingInEnterprise: string;
  customFeatureDevelopment: string;
  whiteLabelSolution: string;
  onPremiseDeployment: string;
  prioritySupport247: string;
  subscribe: string;
  trippoTransformedInventory: string;
  mostUsefulInventoryTool: string;
  bestInventoryManagementFlexibility: string;
  storeManagerRetailCo: string;
  businessOwnerChenTrading: string;
  operationsDirectorWilliamsSupply: string;
  productColumn: string;
  resourcesColumn: string;
  companyColumn: string;
  legalColumn: string;
  connectColumn: string;
  featuresLink: string;
  pricingLink: string;
  enterpriseLink: string;
  reportsLink: string;
  analyticsLink: string;
  documentationLink: string;
  supportLink: string;
  blogLink: string;
  guidesLink: string;
  apiLink: string;
  aboutLink: string;
  careersLink: string;
  contactLink: string;
  pressLink: string;
  termsOfServiceLink: string;
  privacyPolicyLink: string;
  dataUseLink: string;
  securityLink: string;
  twitterLink: string;
  linkedinLink: string;
  youtubeLink: string;
  copyright: string;
  allRightsReserved: string;
  productInventoryManagement: string;
  salesTrackingRecording: string;
  basicReportsAnalytics: string;
  offlineSupportSync: string;
  upTo100Products: string;
  
  // Dashboard
  todaysRevenue: string;
  todaysProfit: string;
  weekRevenue: string;
  weekProfit: string;
  monthRevenue: string;
  monthProfit: string;
  yearRevenue: string;
  yearProfit: string;
  periodToday: string;
  periodWeek: string;
  periodMonth: string;
  periodYear: string;
  vsYesterday: string;
  vsLastWeek: string;
  vsLastMonth: string;
  vsLastYear: string;
  todaysItems: string;
  currentStockValue: string;
  items: string;
  recordNewSale: string;
  bulkAdd: string;
  singleSale: string;
  selectProduct: string;
  suggestedPrice: string;
  youCanChangeThis: string;
  availableStock: string;
  addRow: string;
  spreadsheetMode: string;
  spreadsheetHint: string;
  saveAll: string;
  hello: string;
  greetingFallback: string;
  quickActions: string;
  quickActionsHint: string;
  servicesToday: string;
  servicesRecorded: string;
  activeServices: string;
  servicesInSystem: string;
  recentActivity: string;
  salesAndExpenses: string;
  recentSalesAndExpenses: string;
  recentSales: string;
  salesExpenseBalance: string;
  netFlow: string;
  latestActivity: string;
  noActivity: string;
  noRecentActivity: string;
  details: string;
  amountRwf: string;
  searchProductsAndServices: string;
  packageLabel: string;
  productOrService: string;
  saleMode: string;
  sellByQuantity: string;
  sellWholePackage: string;
  cost: string;
  revenueMinusCost: string;
  expenseExamplePlaceholder: string;
  expenseCategoryPlaceholder: string;
  expenseNotePlaceholder: string;
  presets: string;
  mostUsed: string;
  savePreset: string;
  addMultipleSalesHint: string;
  serviceBadge: string;
  typeLabel: string;

  // Bookings
  todaysBookings: string;
  bookingsSubtitle: string;
  addBooking: string;
  noBookingsToday: string;
  bookingClientName: string;
  bookingPhone: string;
  bookingService: string;
  bookingWorker: string;
  bookingDate: string;
  bookingTime: string;
  bookingDuration: string;
  bookingNotes: string;
  bookingStatusPending: string;
  bookingStatusConfirmed: string;
  bookingStatusInProgress: string;
  bookingStatusCompleted: string;
  bookingStatusCancelled: string;
  bookingStatusNoShow: string;
  bookingConfirm: string;
  bookingStart: string;
  bookingComplete: string;
  bookingCancel: string;
  bookingCreated: string;
  bookingUpdated: string;
  bookingFailed: string;
  
  // Products Page
  allProducts: string;
  addNewProduct: string;
  backToProducts: string;
  productType: string;
  packageQuantity: string;
  minStockAlert: string;
  status: string;
  actions: string;
  noProducts: string;
  sortBy: string;
  newest: string;
  oldest: string;
  nameAsc: string;
  nameDesc: string;
  priceAsc: string;
  priceDesc: string;
  allCategories: string;
  allStatus: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
  bulkAddProducts: string;
  productTypeVariant: string;
  enterProductName: string;
  enterCategory: string;
  enterPrice: string;
  enterStock: string;
  addMultipleProducts: string;
  selectProductFirst: string;
  item: string;
  allPrices: string;
  filterPriceUnder5k: string;
  filterPrice5kTo20k: string;
  filterPriceOver20k: string;
  allRoles: string;
  allDisciplines: string;
  allAttendance: string;
  allPaymentMethods: string;
  allSaleTypes: string;
  saleTypeProduct: string;
  saleTypeService: string;
  allBusinessTypes: string;
  allClientTypes: string;
  filterHasSchedules: string;
  filterHasActiveSchedules: string;
  filterHasOverdueSchedules: string;
  stockAsc: string;
  stockDesc: string;
  filterLast30Days: string;
  allWorkers: string;
  
  // Sales Page
  allSales: string;
  filterSales: string;
  startDate: string;
  endDate: string;
  noSales: string;
  product: string;
  revenue: string;
  profit: string;
  date: string;
  payment: string;
  bulkSaleMode: string;
  addMultipleSales: string;
  recording: string;
  
  // Reports Page
  salesReport: string;
  dateRange: string;
  last7Days: string;
  last30Days: string;
  last90Days: string;
  thisMonth: string;
  lastMonth: string;
  thisYear: string;
  custom: string;
  exportPdf: string;
  exportExcel: string;
  salesTrend: string;
  salesTrendLast7Days: string;
  topProducts: string;
  salesByCategory: string;
  paymentMethods: string;
  
  // Common Messages
  confirmDelete: string;
  areYouSure: string;
  thisActionCannotBeUndone: string;
  yesDelete: string;
  noCancel: string;
  success: string;
  error: string;
  saved: string;
  updated: string;
  deleted: string;
  failed: string;
  pleaseTryAgain: string;

  // Expenses
  oneTimeExpense: string;
  recurringExpenses: string;
  expenseTitle: string;
  amount: string;
  note: string;
  noteOptional: string;
  saveExpense: string;
  addMultipleExpenses: string;
  addExpensesBtn: string;
  recentExpenses: string;

  // Modals — services & products
  addService: string;
  addMultipleServices: string;
  addServicesBtn: string;
  editService: string;
  serviceName: string;
  noServicesFound: string;
  noServicesAddFirst: string;
  recordService: string;
  selectService: string;
  selectWorker: string;
  invalidInput: string;
  validServiceRequired: string;
  serviceUpdated: string;
  serviceAdded: string;
  serviceDeleted: string;
  deleteServiceConfirm: string;
  nameRequired: string;
  enterProductNameMsg: string;
  duplicateProduct: string;
  duplicateProductDesc: string;
  productUpdated: string;
  productAdded: string;
  changesSaved: string;
  productSaved: string;

  // Modals — workers
  addWorker: string;
  addMultipleWorkers: string;
  addWorkersBtn: string;
  editWorker: string;
  noWorkersFound: string;
  noWorkersAddFirst: string;
  workerStatus: string;
  workerStatusActive: string;
  workerStatusInactive: string;
  workerCheckIn: string;
  workerCheckOut: string;
  workerDiscipline: string;
  disciplineExcellent: string;
  disciplineGood: string;
  disciplineFair: string;
  disciplinePoor: string;
  disciplineWarning: string;
  workerRole: string;
  workerContact: string;
  checkInNow: string;
  checkOutNow: string;
  workerCheckedInTitle: string;
  workerCheckedInDesc: string;
  workerCheckedOutTitle: string;
  workerCheckedOutDesc: string;
  notCheckedInYet: string;
  notCheckedOutYet: string;
  attendanceStatusCheckedIn: string;
  attendanceStatusCheckedOut: string;
  attendanceStatusNotCheckedIn: string;
  workerAttendance: string;
  alreadyCheckedInDesc: string;
  mustCheckInFirstDesc: string;
  workerNotes: string;
  editSale: string;

  // Modals — stock
  updateStock: string;
  updateStockFor: string;
  enterStockQuantity: string;
  minimumStockLabel: string;
  stockUpdated: string;
  invalidStock: string;
  invalidStockDesc: string;
  updateFailed: string;
  recordExpense: string;
  record: string;

  // Auth modal
  welcomeToTrippo: string;
  createAccount: string;
  enterYourPin: string;
  forgotPin: string;
  sendVerificationCode: string;
  verificationCode: string;
  resendCode: string;
  sendingCode: string;
  creatingAccount: string;
  resetYourPin: string;
  phoneNumber: string;
  fullName: string;

  // Dashboard toasts & validation
  expensePresetSavedDesc: string;
  productOutOfStock: string;
  productOutOfStockRemovedSuffix: string;
  productOutOfStockCannotSellSuffix: string;
  workerRequired: string;
  invalidPriceShort: string;
  insufficientStock: string;
  insufficientStockBulkDesc: string;
  salesRecorded: string;
  salesRecordedBulkDesc: string;
  noSalesRecorded: string;
  noSalesRecordedDesc: string;
  missingInformation: string;
  fillAllRequired: string;
  selectServiceWorker: string;
  invalidAmount: string;
  serviceAmountMustBePositive: string;
  workerNotFound: string;
  selectValidWorker: string;
  serviceRecorded: string;
  serviceRecordedDesc: string;
  enterQuantityDesc: string;
  invalidQuantity: string;
  invalidQuantityDesc: string;
  invalidPriceDesc: string;
  needWholePackageStock: string;
  onlyItemsInStock: string;
  itemSingular: string;
  itemsPlural: string;
  saleRecorded: string;
  saleRecordedDesc: string;
  saleRecordedOffline: string;
  saleRecordedOfflineWithProduct: string;
  saleRecordedOfflineGeneric: string;
  recordFailed: string;
  recordFailedDesc: string;
  expenseNameAmountRequired: string;
  expenseRecorded: string;
  expenseRecordedDesc: string;
  saveFailed: string;
  saveExpenseFailed: string;
  activitySaleLabel: string;
  activityExpenseLabel: string;
  activityEmptyHint: string;
  viewMoreInSales: string;
  invalidQuantityShort: string;
  onlyItemsAvailable: string;
  chartSalesLabel: string;
  daySun: string;
  dayMon: string;
  dayTue: string;
  dayWed: string;
  dayThu: string;
  dayFri: string;
  daySat: string;
  pricePerItem: string;
  priceForWholePackageLabel: string;
  priceWholePackageCalc: string;
  priceFromPackageCalc: string;
  maximumQuantity: string;
  stockLabel: string;
  boxOf: string;
  noProductsSearchHint: string;

  // Extended UI
  close: string;
  confirm: string;
  back: string;
  next: string;
  yes: string;
  no: string;
  all: string;
  none: string;
  subtotal: string;
  warning: string;

  // NotFound
  pageNotFoundMessage: string;
  returnToHome: string;

  // Billing
  billingSummary: string;
  billingSummarySubtitle: string;
  billingPackage: string;
  billingStarts: string;
  billingEnds: string;
  billingPay: string;
  billingTapMethod: string;
  billingPhone: string;
  billingPinHint: string;
  billingNoPromptMtn: string;
  billingNoPromptAirtel: string;
  billingProcessing: string;
  billingTrialEndedBanner: string;
  billingPayAmount: string;
  billingCancelPlan: string;
  billingCancelTitle: string;
  billingCancelTrialDesc: string;
  billingCancelPaidDesc: string;
  billingCancelConfirm: string;
  billingCancelledTitle: string;
  billingCancelledUntil: string;
  billingPaymentSuccess: string;
  billingPaymentSuccessDesc: string;
  billingPaymentIssue: string;
  billingPaymentFailed: string;
  billingStillConfirming: string;
  billingSelectNetwork: string;
  billingSelectNetworkDesc: string;
  billingPhoneRequired: string;
  billingPhoneRequiredDesc: string;
  billingInvalidMtn: string;
  billingInvalidAirtel: string;
  billingPaymentInProgress: string;
  billingApproveOnPhone: string;
  billingPaymentError: string;
  billingPaymentRequired: string;
  billingSendNewPrompt: string;
  billingSubscriptionActive: string;
  billingPlusActiveUntil: string;
  billingLastPaid: string;
  billingPaymentsUnavailable: string;
  billingRetry: string;
  billingKeepPlan: string;
  billingCancelling: string;
  billingNotBilledMonthly: string;
  plusPack: string;

  // Delete account
  deleteAccount: string;
  deleteAccountDesc: string;
  deleteAccountWarningDesc: string;
  deleteMyAccount: string;
  deleteAccountConfirmDesc: string;
  deleteAccountDataWarning: string;
  accountDeleted: string;
  accountDeletedDesc: string;
  deleteAccountFailed: string;
  deleting: string;
  yesDeleteAccount: string;

  // Offline sync
  offlineTitle: string;
  offlineCannotSync: string;
  syncComplete: string;
  syncCompleteDesc: string;
  syncPartial: string;
  syncPartialDesc: string;
  syncFailed: string;
  syncFailedDesc: string;
  pendingSync: string;
  syncNow: string;
  offlineModeMessage: string;

  // Plus banner
  plusTrial: string;
  plusTrialDaysLeft: string;
  plusTrialEnds: string;
  plusThenPrice: string;
  payNow: string;
  subscribeToPlus: string;
  trialEndedPay: string;
  payWithMomo: string;
  plusActive: string;
  daySingular: string;
  daysPlural: string;

  // Reports extras
  total: string;
  period: string;
  day: string;
  week: string;
  month: string;
  year: string;
  salesExpensesSummary: string;
  net: string;
  profitExpensesChart: string;
  noSalesData: string;
  servicePerformance: string;
  topServices: string;
  exportComplete: string;
  exportFailed: string;

  // Sales extras
  filterByDate: string;
  searchByProduct: string;
  inventory: string;

  // AddProduct
  singleProduct: string;
  costPerQuantity: string;
  costPerPackage: string;
  pricePerQuantity: string;
  pricePerPackage: string;
  numberOfIndividualProducts: string;
  minStockAlertWhen: string;
  unassigned: string;
  addProductsBtn: string;
  productRestocked: string;
  pinRequired: string;
  incorrectPin: string;
  productDeletedMsg: string;
  duplicateProductsFound: string;
  failedToAddProduct: string;
  productsProcessed: string;
  processingFailed: string;
  productsAddedMsg: string;
  noProductsAddedMsg: string;
  updatePin: string;
  optional: string;

  // Settings pages
  languagePageDesc: string;
  languageAutoUpdateNote: string;
  businessInfoPageDesc: string;
  businessNameRequiredMsg: string;
  businessNameExample: string;
  businessNameOnReceipts: string;
  businessPhoneLabel: string;
  settingsSavedTitle: string;
  settingsSavedBusinessDesc: string;
  sessionNotFoundDesc: string;
  securityPageDesc: string;
  financialPinTitle: string;
  financialPinActiveDesc: string;
  financialPinInactiveDesc: string;
  setNewPinBtn: string;
  invalidPinTitle: string;
  pinFourDigitsRequired: string;
  pinMismatchTitle: string;
  pinMismatchBody: string;
  pinSetTitle: string;
  pinSetBody: string;
  pinChangedTitle: string;
  pinChangedBody: string;
  pinSetupFailedTitle: string;
  pinChangeFailedTitle: string;
  pinSyncFailedDesc: string;
  invalidCurrentPinTitle: string;
  wrongCurrentPinDesc: string;
  newPinMismatchBody: string;
  notificationsPageTitle: string;
  notificationsPageDesc: string;
  browserNotificationsTitle: string;
  browserNotificationsBody: string;
  notificationStatusLabel: string;
  notifStatusGranted: string;
  notifStatusDenied: string;
  notifStatusDefault: string;
  statusEnabled: string;
  statusBlocked: string;
  statusNotSet: string;
  notifBlockedTitle: string;
  notifBlockedBrowserDesc: string;
  notifEnabledTitle: string;
  notifEnabledBody: string;
  notifDeniedBody: string;
  notifRequestFailed: string;
  openBrowserSettingsBtn: string;
  enableNotificationsBtn: string;

  // Workers / expenses extras
  workerUpdatedTitle: string;
  workerUpdatedDesc: string;
  workerAddedTitle: string;
  workerAddedDesc: string;
  workerRemovedDesc: string;
  saveWorkerFailed: string;
  deleteWorkerFailed: string;
  invalidSaleTitle: string;
  invalidSaleDesc: string;
  saleUpdatedTitle: string;
  saleHistorySaved: string;
  updateSaleFailedTitle: string;
  updateSaleFailedDesc: string;
  saleDeletedTitle: string;
  saleHistoryRemoved: string;
  deleteSaleFailedTitle: string;
  deleteSaleFailedDesc: string;
  recordSingleExpenseHint: string;
  recurringExpenseHint: string;
  repeatEveryLabel: string;
  freqEveryWeek: string;
  freqEveryMonth: string;
  freqEveryYear: string;
  freqCustomDays: string;
  intervalDaysLabel: string;
  nextDueDateLabel: string;
  emailReminderDaysLabel: string;
  emailWhenPendingLabel: string;
  autoRecordDueLabel: string;
  saveRecurringBtn: string;
  updateRecurringBtn: string;
  cancelEditBtn: string;
  noRecurringYet: string;
  scheduleCol: string;
  nextDueCol: string;
  remindersCol: string;
  markPaidAction: string;
  pendingSuffix: string;
  duePrefix: string;
  remindersOffLabel: string;
  autoRecordLabel: string;
  offLabel: string;
  noExpensesYet: string;
  expenseRemovedDesc: string;
  deleteExpenseFailed: string;
  recurringLoadFailed: string;
  recurringSaveFailed: string;
  recurringDeleteFailed: string;
  recurringRemovedDesc: string;
  recurringUpdatedDesc: string;
  recurringSavedTitle: string;
  recurringEmailRemindDesc: string;
  recurringCreatedDesc: string;
  missingDueDateTitle: string;
  chooseDueDateDesc: string;
  recurringValidationDesc: string;
  paymentRecordedTitle: string;
  paymentRecordedDesc: string;
  recordPaymentFailed: string;
  recordPaymentFailedDesc: string;
  everyNDays: string;
  emailReminderSummary: string;
  outOfStockProductTitle: string;
  enterPinToConfirm: string;

  // Billing (extra)
  billingStillConfirmingDesc: string;
  billingMoMoDeclined: string;
  billingCheckPhoneApprove: string;
  billingCancelNoPlusAccess: string;
  billingPayInProgressDesc: string;
  billingApproveOnPhoneDesc: string;
  billingHaveMoMoBalance: string;
  billingPayFailHint: string;
  billingBackendError: string;
  billingPaypackHint: string;
  billingInvalidNumber: string;
  notifications: string;
  allSettings: string;
  defaultSortOrder: string;

  // Profile / logout / market analysis
  fillServiceWorkerAmount: string;
  errorRecordingService: string;
  recordServiceFailedDesc: string;
  profileSavedTitle: string;
  profileSavedDesc: string;
  loggedOutTitle: string;
  loggedOutDesc: string;
  loggedOutDescWithData: string;
  logoutConfirmDesc: string;
  profileSectionTitle: string;
  editProfileDesc: string;
  validationErrorTitle: string;
  invalidEmailTitle: string;
  invalidEmailDescMsg: string;
  sessionErrorTitle: string;
  profileUpdateFailedDesc: string;
  marketAnalysisTitle: string;
  marketAnalysisSubtitle: string;
  noSalesDataAnalysis: string;
  weekComparisonTitle: string;
  lastWeekThisWeekTitle: string;
  lastWeekLabel: string;
  thisWeekLabel: string;
  topProductsByRevenue: string;
  revenueDistribution: string;
  profitMarginByProduct: string;
  profitMarginLabel: string;
  profitMarginPercentLabel: string;
  weeklyTrendsTitle: string;
  weekNumberLabel: string;
  dailyTrendsTitle: string;
  monthlyTrendsTitle: string;

  // Clients page
  clientsPageTitle: string;
  manageClients: string;
  goToSchedules: string;
  searchClientsPlaceholder: string;
  showingClientsCount: string;
  quickCreateWorkerHint: string;
  quickCreateClientHint: string;
  clientTypeDebtor: string;
  clientTypeWorker: string;
  clientTypeOther: string;
  addScheduleForClient: string;
  editClientTooltip: string;
  deleteClientTooltip: string;
  noClientsSearch: string;
  noClientsYet: string;
  tryAdjustSearch: string;
  addFirstClient: string;
  editClientModal: string;
  addNewWorkerModal: string;
  addNewClientModal: string;
  clientNameLabel: string;
  clientTypeRelationship: string;
  clientTypeDebtorOption: string;
  clientTypeWorkerOption: string;
  clientTypeOtherOption: string;
  clientTypeSelectHint: string;
  businessTypeWhatTheyDo: string;
  businessTypeWorkerPh: string;
  businessTypeClientPh: string;
  businessTypeDescribeHint: string;
  notesAboutClient: string;
  updateClientBtn: string;
  addClientBtn: string;
  clientCreatedSuccess: string;
  clientCreatedSchedulePrompt: string;
  clientCreatedScheduleHint: string;
  notNow: string;
  addScheduleBtn: string;
  clientAddedSuccess: string;
  clientAddedDesc: string;
  clientUpdatedSuccess: string;
  clientUpdatedDesc: string;
  clientDeletedSuccess: string;
  clientDeletedDesc: string;
  deleteClientModal: string;
  deleteClientConfirmFull: string;
  deleteClientFailed: string;
  updateClientFailed: string;
  addClientFailed: string;
  clientNameRequired: string;
  clientEmailRequired: string;
  businessTypeRequired: string;
  validEmailRequired: string;
  failedLoadClients: string;
  schedulesLinkedLabel: string;
  schedulesCountLabel: string;
  viewAll: string;
  loadingSchedules: string;
  noSchedulesForClient: string;
  showLess: string;
  showMoreSchedules: string;
  statusOverdue: string;
  statusActive: string;
  statusCompleted: string;
  statusCancelled: string;

  // Schedules / email automations
  emailAutomationsTitle: string;
  emailAutomationsSubtitle: string;
  newAutomation: string;
  searchAutomationsPlaceholder: string;
  clearFilters: string;
  allDates: string;
  allFrequency: string;
  allClientsFilter: string;
  filterToday: string;
  filterThisWeek: string;
  filterThisMonth: string;
  filterOverdue: string;
  filterUpcoming: string;
  freqOnce: string;
  freqDaily: string;
  freqWeekly: string;
  freqMonthly: string;
  freqYearly: string;
  freqOnceLong: string;
  freqDailyLong: string;
  freqWeeklyLong: string;
  freqMonthlyLong: string;
  freqYearlyLong: string;
  freqOnceHint: string;
  freqDailyHint: string;
  freqWeeklyHint: string;
  freqMonthlyHint: string;
  freqYearlyHint: string;
  notifyYou: string;
  notifyClientBadge: string;
  dueToday: string;
  dueTomorrow: string;
  daysOverdue: string;
  daysRemaining: string;
  lastSent: string;
  noAutomationsFound: string;
  noAutomationsYet: string;
  tryAdjustFilters: string;
  createAutomation: string;
  createFirstAutomationHint: string;
  editScheduleModal: string;
  createScheduleModal: string;
  editScheduleDesc: string;
  createScheduleDesc: string;
  stepBasic: string;
  stepClient: string;
  stepFreq: string;
  stepNotify: string;
  basicInformation: string;
  scheduleTitleLabel: string;
  scheduleTitlePh: string;
  scheduleTitleHint: string;
  dueDateTimeLabel: string;
  dueDateHint: string;
  descriptionOptionalHint: string;
  clientPaymentDetails: string;
  enterClientName: string;
  businessTypePhShort: string;
  clientTypeDebtorShort: string;
  clientTypeWorkerShort: string;
  amountOptionalHint: string;
  scheduleFrequencySection: string;
  repeatUntilLabel: string;
  repeatUntilHint: string;
  notificationSettings: string;
  notifyMeUser: string;
  notifyMeUserDesc: string;
  notifyClientLabel: string;
  notifyClientSelectFirst: string;
  notifyClientEnabledDesc: string;
  advanceNotificationLabel: string;
  daysBeforeDue: string;
  advanceNotificationHint: string;
  customUserNotificationMsg: string;
  customUserNotificationPh: string;
  customUserNotificationHint: string;
  customClientNotificationMsg: string;
  customClientNotificationPh: string;
  customClientNotificationHint: string;
  previous: string;
  updateScheduleBtn: string;
  createScheduleBtn: string;
  createClientModal: string;
  editClientFromSchedules: string;
  createClientFromSchedulesDesc: string;
  editClientFromSchedulesDesc: string;
  businessTypePhSchedule: string;
  optionalNotesClient: string;
  creating: string;
  completeScheduleTitle: string;
  completeScheduleDesc: string;
  completeScheduleRecurringNote: string;
  sendCompletionNotification: string;
  completionMessageOptional: string;
  completionMessagePh: string;
  completionMessageHint: string;
  markComplete: string;
  deleteScheduleTitle: string;
  deleteScheduleConfirm: string;
  deleteScheduleBtn: string;
  scheduleUpdatedTitle: string;
  scheduleUpdatedDesc: string;
  scheduleCreatedTitle: string;
  scheduleCreatedDesc: string;
  scheduleCompletedTitle: string;
  scheduleCompletedWithEmail: string;
  scheduleCompletedNoEmail: string;
  completeScheduleFailed: string;
  scheduleDeletedTitle: string;
  scheduleDeletedDesc: string;
  invalidScheduleTitle: string;
  invalidScheduleNoClient: string;
  scheduleTitleRequired: string;
  dueDateRequired: string;
  clientCreationFailed: string;
  cannotDeleteClientTitle: string;
  cannotDeleteClientSchedules: string;
  clientCreatedAndSelected: string;
  createClientFailedTitle: string;
  updateClientFailedTitle: string;
  failedLoadSchedules: string;
  failedLoadClientsFromDb: string;
  createFailedTitle: string;
  noClientLabel: string;
  unknownClient: string;
  completeAction: string;
  editAction: string;
  deleteAction: string;
  clientLabel: string;
  deleteClientFromSchedulesConfirm: string;
}

export const translations: Partial<Record<Language, Partial<Translations>>> = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    products: "Products",
    services: "Services",
    inventories: "Inventories",
    workers: "Workers",
    worker: "Worker",
    expenses: "Expenses",
    billing: "Billing",
    sales: "Sales",
    reports: "Reports",
    settings: "Settings",
    bookings: "Bookings",
    logout: "Logout",
    sidebarSectionOverview: "Overview",
    sidebarSectionOperations: "Operations",
    sidebarSectionFinance: "Finance",
    sidebarSectionInsights: "Insights",
    sidebarSectionAccount: "Account",
    
    // Common
    save: "Save",
    update: "Update",
    updating: "Updating...",
    saving: "Saving...",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    name: "Name",
    price: "Price",
    search: "Search",
    filter: "Filter",
    loading: "Loading...",
    signIn: "Sign in",
    getStarted: "Get Started",
    
    // Settings
    businessInfo: "Business Information",
    security: "Security",
    language: "Language",
    businessName: "Business Name",
    ownerName: "Owner Name",
    emailAddress: "Email Address",
    saveChanges: "Save Changes",
    changePin: "Change PIN",
    setPin: "Set PIN",
    currentPin: "Current PIN",
    newPin: "New PIN",
    confirmPin: "Confirm PIN",
    
    // Products
    productName: "Product Name",
    category: "Category",
    cost: "Cost",
    costPrice: "Cost Price",
    selling: "Selling",
    sellingPrice: "Selling Price",
    stock: "Stock",
    addProduct: "Add Product",
    productsAvailable: "Products available",
    noProductsYet: "No products available yet. Click Add product to get started.",
    editProduct: "Edit Product",
    deleteProduct: "Delete Product",
    stockQuantity: "Stock Quantity",
    initialStock: "Initial Stock",
    minimumStock: "Minimum Stock",
    
    // Sales
    recordSale: "Record Sale",
    recordSales: "Record Sales",
    quantity: "Quantity",
    enterQuantity: "Enter quantity",
    paymentMethod: "Payment Method",
    saleDate: "Sale Date",
    cash: "Cash",
    momoPay: "Momo Pay",
    card: "Card",
    airtelPay: "Airtel Pay",
    bankTransfer: "Bank Transfer",
    
    // Reports
    totalRevenue: "Total Revenue",
    totalProfit: "Total Profit",
    totalSales: "Total Sales",
    export: "Export",
    
    // Home
    runBusinessSmarter: "Run your business smarter with Trippo",
    features: "Features",
    pricing: "Pricing",
    testimonials: "Testimonials",
    whatOurUsersSay: "What our users say",
    productManagement: "Products",
    salesTracking: "Sales",
    reportsAnalytics: "Reports",
    offlineSupport: "Offline",
    addEditManageInventory: "Add, edit, and manage your product inventory with ease. Track stock levels and control your inventory efficiently.",
    trackStockLevels: "Track stock levels",
    recordSalesTransactions: "Record sales transactions and track revenue and profits in real-time. Monitor your business performance effortlessly.",
    trackRevenueProfits: "Track revenue and profits",
    viewDetailedReports: "View detailed reports and sales trends. Generate comprehensive analytics to make data-driven business decisions.",
    generateComprehensiveAnalytics: "Generate comprehensive analytics",
    workOfflineAutoSync: "Work offline with automatic sync when connection is restored. Your data is always safe and accessible.",
    dataAlwaysSafeAccessible: "Your data is always safe and accessible",
    basicPlan: "Basic",
    proPlan: "Pro",
    enterprisePlan: "Enterprise",
    customPlan: "Custom",
    perMonth: "/month",
    everythingInBasic: "Everything in Basic",
    unlimitedProducts: "Unlimited products",
    advancedAnalyticsInsights: "Advanced analytics & insights",
    exportReports: "Export reports (PDF, Excel)",
    prioritySupport: "Priority support",
    everythingInPro: "Everything in Pro",
    multiUserAccess: "Multi-user access",
    advancedSecurityFeatures: "Advanced security features",
    apiAccessIntegrations: "API access & integrations",
    dedicatedAccountManager: "Dedicated account manager",
    everythingInEnterprise: "Everything in Enterprise",
    customFeatureDevelopment: "Custom feature development",
    whiteLabelSolution: "White-label solution",
    onPremiseDeployment: "On-premise deployment",
    prioritySupport247: "24/7 priority support",
    subscribe: "Subscribe",
    trippoTransformedInventory: "Trippo transformed how we manage inventory. Adoption went from struggling to track products to over 90% of our team using it daily. It just spread like wildfire in our business.",
    mostUsefulInventoryTool: "The most useful inventory management tool I've used. It's fast, handles stock levels properly, sensible interface, works offline... everything is well put together for small businesses.",
    bestInventoryManagementFlexibility: "The best inventory management has flexibility: you control how much detail to track. In Trippo, you can do basic product management, detailed analytics, or full comprehensive reporting - all in one tool.",
    storeManagerRetailCo: "Store Manager, Retail Co.",
    businessOwnerChenTrading: "Business Owner, Chen Trading",
    operationsDirectorWilliamsSupply: "Operations Director, Williams Supply",
    productColumn: "Product",
    resourcesColumn: "Resources",
    companyColumn: "Company",
    legalColumn: "Legal",
    connectColumn: "Connect",
    featuresLink: "Features",
    pricingLink: "Pricing",
    enterpriseLink: "Enterprise",
    reportsLink: "Reports",
    analyticsLink: "Analytics",
    documentationLink: "Documentation",
    supportLink: "Support",
    blogLink: "Blog",
    guidesLink: "Guides",
    apiLink: "API",
    aboutLink: "About",
    careersLink: "Careers",
    contactLink: "Contact",
    pressLink: "Press",
    termsOfServiceLink: "Terms of Service",
    privacyPolicyLink: "Privacy Policy",
    dataUseLink: "Data Use",
    securityLink: "Security",
    twitterLink: "X (Twitter)",
    linkedinLink: "LinkedIn",
    youtubeLink: "YouTube",
    copyright: "© 2025 Trippo.",
    allRightsReserved: "All rights reserved.",
    productInventoryManagement: "Product inventory management",
    salesTrackingRecording: "Sales tracking and recording",
    basicReportsAnalytics: "Basic reports and analytics",
    offlineSupportSync: "Offline support with sync",
    upTo100Products: "Up to 100 products",
    
    // Dashboard
    todaysRevenue: "Today's Revenue",
    todaysProfit: "Today's Profit",
    weekRevenue: "This Week's Revenue",
    weekProfit: "This Week's Profit",
    monthRevenue: "This Month's Revenue",
    monthProfit: "This Month's Profit",
    yearRevenue: "This Year's Revenue",
    yearProfit: "This Year's Profit",
    periodToday: "Today",
    periodWeek: "Week",
    periodMonth: "Month",
    periodYear: "Year",
    vsYesterday: "vs yesterday",
    vsLastWeek: "vs last week",
    vsLastMonth: "vs last month",
    vsLastYear: "vs last year",
    todaysItems: "Today's Items",
    currentStockValue: "Current Stock Value",
    items: "items",
    recordNewSale: "Record New Sale",
    bulkAdd: "Bulk Add",
    singleSale: "Single Sale",
    selectProduct: "Select Product",
    suggestedPrice: "Suggested price",
    youCanChangeThis: "You can change this",
    availableStock: "Available stock",
    addRow: "Add Row",
    spreadsheetMode: "Spreadsheet",
    spreadsheetHint: "Type in any row — changes save automatically. New rows stay where you enter them.",
    saveAll: "Save all",
    hello: "Hello",
    greetingFallback: "User",
    quickActions: "Quick Actions",
    quickActionsHint: "Click to perform quick actions",
    servicesToday: "Services Today",
    servicesRecorded: "services recorded",
    activeServices: "Active Services",
    servicesInSystem: "services in system",
    recentActivity: "Recent",
    salesAndExpenses: "Sales & expenses",
    recentSalesAndExpenses: "Recent Sales & Expenses",
    recentSales: "Recent Sales",
    salesExpenseBalance: "Sales vs Expenses",
    netFlow: "Net flow",
    latestActivity: "Recent Activities",
    noActivity: "No activity",
    noRecentActivity: "No recent activity",
    details: "Details",
    amountRwf: "Amount (Rwf)",
    searchProductsAndServices: "Search products and services...",
    packageLabel: "Package",
    productOrService: "Product / Service",
    saleMode: "Sale Mode",
    sellByQuantity: "Sell by Quantity",
    sellWholePackage: "Sell Whole Package",
    cost: "Cost",
    revenueMinusCost: "(Revenue − cost)",
    expenseExamplePlaceholder: "e.g. Utilities, Rent...",
    expenseCategoryPlaceholder: "e.g. Supplies",
    expenseNotePlaceholder: "Add extra details...",
    presets: "Presets",
    mostUsed: "Most used",
    savePreset: "Save preset",
    addMultipleSalesHint: "Add multiple sales at once",
    serviceBadge: "Service",
    typeLabel: "Type",
    todaysBookings: "Today's Bookings",
    bookingsSubtitle: "Appointments scheduled for today",
    addBooking: "Add booking",
    noBookingsToday: "No bookings for today yet",
    bookingClientName: "Client name",
    bookingPhone: "Phone",
    bookingService: "Service",
    bookingWorker: "Worker",
    bookingDate: "Date",
    bookingTime: "Time",
    bookingDuration: "Duration",
    bookingNotes: "Notes",
    bookingStatusPending: "Pending",
    bookingStatusConfirmed: "Confirmed",
    bookingStatusInProgress: "In progress",
    bookingStatusCompleted: "Completed",
    bookingStatusCancelled: "Cancelled",
    bookingStatusNoShow: "No show",
    bookingConfirm: "Done",
    bookingStart: "Start",
    bookingComplete: "Complete",
    bookingCancel: "Cancel",
    bookingCreated: "Booking created",
    bookingUpdated: "Booking updated",
    bookingFailed: "Could not save booking",
    
    // Products Page
    allProducts: "All Products",
    addNewProduct: "Add New Product",
    backToProducts: "Back to Products",
    productType: "Product Type",
    packageQuantity: "Package Quantity",
    minStockAlert: "Minimum Stock Alert",
    status: "Status",
    actions: "Actions",
    noProducts: "No products found",
    sortBy: "Sort By",
    newest: "Newest",
    oldest: "Oldest",
    nameAsc: "Name (A-Z)",
    nameDesc: "Name (Z-A)",
    priceAsc: "Price (Low-High)",
    priceDesc: "Price (High-Low)",
    allCategories: "All Categories",
    allStatus: "All Status",
    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    bulkAddProducts: "Bulk Add Products",
    productTypeVariant: "Product Type/Variant (Optional)",
    enterProductName: "Enter product name",
    enterCategory: "Enter category",
    enterPrice: "Enter price",
    enterStock: "Enter stock",
    addMultipleProducts: "Add multiple products at once",
    selectProductFirst: "Select product first",
    item: "item",
    allPrices: "All Prices",
    filterPriceUnder5k: "Under 5,000 RWF",
    filterPrice5kTo20k: "5,000 – 20,000 RWF",
    filterPriceOver20k: "Over 20,000 RWF",
    allRoles: "All Roles",
    allDisciplines: "All Discipline",
    allAttendance: "All Attendance",
    allPaymentMethods: "All Payments",
    allSaleTypes: "All Types",
    saleTypeProduct: "Products",
    saleTypeService: "Services",
    allBusinessTypes: "All Business Types",
    allClientTypes: "All Client Types",
    filterHasSchedules: "With Schedules",
    filterHasActiveSchedules: "Active Schedules",
    filterHasOverdueSchedules: "Overdue Schedules",
    stockAsc: "Stock (Low-High)",
    stockDesc: "Stock (High-Low)",
    filterLast30Days: "Last 30 Days",
    allWorkers: "All Workers",
    
    // Sales Page
    allSales: "All Sales",
    filterSales: "Filter Sales",
    startDate: "Start Date",
    endDate: "End Date",
    noSales: "No sales found",
    product: "Product",
    revenue: "Revenue",
    profit: "Profit",
    date: "Date",
    payment: "Payment",
    bulkSaleMode: "Bulk Sale Mode",
    addMultipleSales: "Add multiple sales at once",
    recording: "Recording...",
    
    // Reports Page
    salesReport: "Sales Report",
    dateRange: "Date Range",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    last90Days: "Last 90 Days",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    thisYear: "This Year",
    custom: "Custom",
    exportPdf: "Export PDF",
    exportExcel: "Export Excel",
    salesTrend: "Sales Trend",
    salesTrendLast7Days: "Sales Trend (Last 7 Days)",
    topProducts: "Top Products",
    salesByCategory: "Sales by Category",
    paymentMethods: "Payment Methods",
    
    // Common Messages
    confirmDelete: "Confirm Delete",
    areYouSure: "Are you sure?",
    thisActionCannotBeUndone: "This action cannot be undone.",
    yesDelete: "Yes, Delete",
    noCancel: "No, Cancel",
    success: "Success",
    error: "Error",
    saved: "Saved",
    updated: "Updated",
    deleted: "Deleted",
    failed: "Failed",
    pleaseTryAgain: "Please try again",

    // Expenses
    oneTimeExpense: "One-time expense",
    recurringExpenses: "Recurring expenses",
    expenseTitle: "Expense Title",
    amount: "Amount",
    note: "Note",
    noteOptional: "Note (Optional)",
    saveExpense: "Save Expense",
    addMultipleExpenses: "Add multiple expenses at once",
    addExpensesBtn: "Add Expenses",
    recentExpenses: "Recent Expenses",

    addService: "Add Service",
    addMultipleServices: "Add multiple services at once",
    addServicesBtn: "Add Services",
    editService: "Edit Service",
    serviceName: "Service Name",
    noServicesFound: "No services found.",
    noServicesAddFirst: "No services found. Add a service first.",
    recordService: "Record Service",
    selectService: "Select service",
    selectWorker: "Select worker",
    invalidInput: "Invalid Input",
    validServiceRequired: "Enter a valid service name and price.",
    serviceUpdated: "Service Updated",
    serviceAdded: "Service Added",
    serviceDeleted: "Service Deleted",
    deleteServiceConfirm: "Delete service",
    nameRequired: "Name required",
    enterProductNameMsg: "Enter a product name.",
    duplicateProduct: "Duplicate product",
    duplicateProductDesc: "A product with this name and category already exists.",
    productUpdated: "Product updated",
    productAdded: "Product added",
    changesSaved: "Changes saved successfully.",
    productSaved: "Product saved successfully.",
    addWorker: "Add Worker",
    addMultipleWorkers: "Add multiple workers at once",
    addWorkersBtn: "Add Workers",
    editWorker: "Edit Worker",
    noWorkersFound: "No workers found.",
    noWorkersAddFirst: "No workers found. Click Add Worker to create one.",
    editSale: "Edit sale",
    updateStock: "Update Stock",
    updateStockFor: "Update stock quantity for",
    enterStockQuantity: "Enter stock quantity",
    minimumStockLabel: "Minimum stock",
    stockUpdated: "Stock Updated",
    invalidStock: "Invalid Stock",
    invalidStockDesc: "Please enter a valid stock quantity.",
    updateFailed: "Update Failed",
    recordExpense: "Record Expense",
    record: "Record",
    welcomeToTrippo: "Welcome to Trippo",
    createAccount: "Create Account",
    enterYourPin: "Enter your PIN",
    forgotPin: "Forgot PIN?",
    sendVerificationCode: "Send verification code",
    verificationCode: "Email verification code",
    resendCode: "Resend code",
    sendingCode: "Sending code...",
    creatingAccount: "Creating account...",
    resetYourPin: "Reset Your PIN",
    phoneNumber: "Phone Number",
    fullName: "Full Name",

    expensePresetSavedDesc: "Expense saved as a quick preset.",
    productOutOfStock: "Product Out of Stock",
    productOutOfStockRemovedSuffix: "is now out of stock and has been removed from selection.",
    productOutOfStockCannotSellSuffix: "is currently out of stock and cannot be sold.",
    workerRequired: "Worker required",
    invalidPriceShort: "Invalid price",
    insufficientStock: "Insufficient Stock",
    insufficientStockBulkDesc: "Cannot record sales for: {list}. You cannot sell more than available quantity.",
    salesRecorded: "Sales Recorded",
    salesRecordedBulkDesc: "Successfully recorded {count} sale(s).",
    noSalesRecorded: "No Sales Recorded",
    noSalesRecordedDesc: "Please fill in at least one complete sale entry.",
    missingInformation: "Missing Information",
    fillAllRequired: "Please fill in all required fields.",
    selectServiceWorker: "Please select who offered the service.",
    invalidAmount: "Invalid Amount",
    serviceAmountMustBePositive: "Service amount must be greater than 0.",
    workerNotFound: "Worker Not Found",
    selectValidWorker: "Please select a valid worker.",
    serviceRecorded: "Service Recorded",
    serviceRecordedDesc: "{product} by {worker} for RWF {amount}",
    enterQuantityDesc: "Please enter quantity.",
    invalidQuantity: "Invalid Quantity",
    invalidQuantityDesc: "Please enter a valid quantity greater than 0.",
    invalidPriceDesc: "Enter a valid selling price (a number, zero or greater).",
    needWholePackageStock: "You need at least {need} in stock to sell a whole package ({stock} available).",
    onlyItemsInStock: "Only {stock} {items} available in stock.",
    itemSingular: "item",
    itemsPlural: "items",
    saleRecorded: "Sale Recorded",
    saleRecordedDesc: "Successfully recorded sale of {qty}x {product}",
    saleRecordedOffline: "Sale Recorded (Offline Mode)",
    saleRecordedOfflineWithProduct: "Successfully recorded sale of {qty}x {product}. Changes will sync when you're back online.",
    saleRecordedOfflineGeneric: "Sale recorded offline. Changes will sync when you're back online.",
    recordFailed: "Record Failed",
    recordFailedDesc: "Failed to record sale. Please check your connection and try again.",
    expenseNameAmountRequired: "Please provide expense name and valid amount.",
    expenseRecorded: "Expense Recorded",
    expenseRecordedDesc: "Expense saved successfully.",
    saveFailed: "Save Failed",
    saveExpenseFailed: "Failed to save expense.",
    activitySaleLabel: "Sale",
    activityExpenseLabel: "Expense",
    activityEmptyHint: "Recent sales and expenses will appear here",
    viewMoreInSales: "View more in Sales",
    invalidQuantityShort: "Invalid quantity",
    onlyItemsAvailable: "Only {stock} {items} available",
    chartSalesLabel: "Sales",
    daySun: "Sun",
    dayMon: "Mon",
    dayTue: "Tue",
    dayWed: "Wed",
    dayThu: "Thu",
    dayFri: "Fri",
    daySat: "Sat",
    pricePerItem: "Price per item",
    priceForWholePackageLabel: "Price for whole package",
    priceWholePackageCalc: "Price per item: {base} rwf × {qty} = {total} rwf (whole package)",
    priceFromPackageCalc: "Price per item: {perItem} rwf (from {base} rwf ÷ {qty})",
    maximumQuantity: "Maximum Quantity",
    stockLabel: "Stock",
    boxOf: "Box of {qty}",
    noProductsSearchHint: "No items found. Try a different search.",
  },
  rw: {
    // Navigation
    dashboard: "Ahabanza",
    products: "Ibicuruzwa",
    services: "Serivisi",
    inventories: "Ibicuruzwa",
    workers: "Abakozi",
    worker: "Umukozi",
    expenses: "Ibyasohotse",
    billing: "Kwishyura",
    sales: "Ibyakozwe",
    reports: "Raporo",
    settings: "Igenamiterere",
    bookings: "Gahunda",
    logout: "Sohoka",
    sidebarSectionOverview: "Incamake",
    sidebarSectionOperations: "Ibikorwa",
    sidebarSectionFinance: "Imari",
    sidebarSectionInsights: "Isesengura",
    sidebarSectionAccount: "Konti",
    
    // Common
    save: "Bika",
    update: "Hindura",
    updating: "Birimo guhindura...",
    saving: "Birimo kubika...",
    cancel: "Kureka",
    delete: "Siba",
    edit: "Hindura",
    add: "Ongeraho",
    name: "Izina",
    price: "Igiciro",
    search: "Shakisha",
    filter: "Akayunguruzo",
    loading: "Buri mu nzira...",
    signIn: "Injira",
    getStarted: "Tangira",
    
    // Settings
    businessInfo: "Amakuru y'ubucuruzi",
    security: "Umutekano",
    language: "Ururimi",
    businessName: "Izina ry'ubucuruzi",
    ownerName: "Izina ry'umuyobozi",
    emailAddress: "Aderesi ya imeri",
    saveChanges: "Bika amahinduka",
    changePin: "Hindura PIN",
    setPin: "Shiraho PIN",
    currentPin: "PIN y'ubu",
    newPin: "PIN nshya",
    confirmPin: "Emeza PIN",
    
    // Products
    productName: "Izina ry'icuruzwa",
    category: "Icyiciro",
    cost: "Igiciro",
    costPrice: "Igiciro",
    selling: "Kugurisha",
    sellingPrice: "Kugurisha",
    stock: "Ibihari",
    addProduct: "Igicuruzwa gishya",
    productsAvailable: "Ibicuruzwa biboneka",
    noProductsYet: "Nta bicuruzwa biraboneka. Kanda Igicuruzwa gishya utangire.",
    editProduct: "Hindura icuruzwa",
    deleteProduct: "Siba icuruzwa",
    stockQuantity: "Umubare w'stoki",
    initialStock: "Stoki y'ibanze",
    minimumStock: "Stoki buke",
    
    // Sales
    recordSale: "Andika ubucuruzi",
    recordSales: "Andika ubucuruzi",
    quantity: "Umubare",
    enterQuantity: "Andika umubare",
    paymentMethod: "Uburyo bwo kwishyura",
    saleDate: "Itariki y'ubucuruzi",
    cash: "Amafaranga",
    momoPay: "Momo Pay",
    card: "Kariye",
    airtelPay: "Airtel Pay",
    bankTransfer: "Kohereza mu banki",
    
    // Reports
    totalRevenue: "Amafaranga yose",
    totalProfit: "Inyungu yose",
    totalSales: "Ubucuruzi bwose",
    export: "Kohereza hanze",
    
    // Home
    runBusinessSmarter: "Koresha ubucuruzi bwawe mu buryo bwihuse na Trippo",
    features: "Imiterere",
    pricing: "Amafaranga",
    testimonials: "Ibyo abakoresha bavuga",
    whatOurUsersSay: "Ibyo abakoresha bacu bavuga",
    productManagement: "Ibicuruzwa",
    salesTracking: "Ubucuruzi",
    reportsAnalytics: "Raporo",
    offlineSupport: "Nta interineti",
    addEditManageInventory: "Ongeraho, hindura, kandi uyobore stoki yawe y'ibicuruzwa mu buryo bworoshye. Kureba uko stoki ikagenda kandi uyobore stoki yawe mu buryo bwihuse.",
    trackStockLevels: "Kureba uko stoki ikagenda",
    recordSalesTransactions: "Andika ubucuruzi kandi ukurebe amafaranga yinjiza n'inyungu mu gihe cyangwa. Kureba uko ubucuruzi bwawe bukagenda mu buryo bworoshye.",
    trackRevenueProfits: "Kureba amafaranga yinjiza n'inyungu",
    viewDetailedReports: "Reba raporo zuzuye n'imiterere y'ubucuruzi. Kora raporo zuzuze kugirango ukore ibyemezo byubucuruzi bifite amakuru.",
    generateComprehensiveAnalytics: "Kora raporo zuzuze",
    workOfflineAutoSync: "Kora nta interineti hamwe no guhuza amakuru mu gihe interineti isubira. Amakuru yawe azahoraho kandi akagera kuri buri gihe.",
    dataAlwaysSafeAccessible: "Amakuru yawe azahoraho kandi akagera kuri buri gihe",
    basicPlan: "Gisanzwe",
    proPlan: "Pro",
    enterprisePlan: "Ubucuruzi",
    customPlan: "Bitezimbere",
    perMonth: "/ukwezi",
    everythingInBasic: "Ibyose bya Gisanzwe",
    unlimitedProducts: "Ibicuruzwa byuzuye",
    advancedAnalyticsInsights: "Raporo zuzuze & ubushishozi",
    exportReports: "Kohereza raporo (PDF, Excel)",
    prioritySupport: "Gufasha byibanze",
    everythingInPro: "Ibyose bya Pro",
    multiUserAccess: "Kugera abakoresha benshi",
    advancedSecurityFeatures: "Imiterere y'umutekano yuzuye",
    apiAccessIntegrations: "Kugera API & guhuza",
    dedicatedAccountManager: "Uyobora konti witezimbere",
    everythingInEnterprise: "Ibyose by'Ubucuruzi",
    customFeatureDevelopment: "Gukora imiterere bitezimbere",
    whiteLabelSolution: "Igisubizo cy'izina ryawe",
    onPremiseDeployment: "Gushyira mu nzu yawe",
    prioritySupport247: "Gufasha byibanze 24/7",
    subscribe: "Kwiyandikisha",
    trippoTransformedInventory: "Trippo yahinduye uko tuyobora stoki. Kwakira kwatangiye ku kugira ingorane zo kureba ibicuruzwa kugeza ku 90% by'itsinda ryacu bakoresha buri munsi. Byamenyekanye cyane mu bucuruzi bwacu.",
    mostUsefulInventoryTool: "Igikoresho cy'stoki gikoreshwa cyane navugamo. Ni vuba, kuyobora uko stoki ikagenda neza, interineti yoroshye, ikora nta interineti... ibintu byose byashyizwe hamwe neza kubucuruzi buke.",
    bestInventoryManagementFlexibility: "Ubuyobozibwe bw'stoki bwiza bufite ubwoba: wiyobora uko wifuza kureba. Mu Trippo, ushobora gukora uyobozibwe bw'ibicuruzwa gisanzwe, raporo zuzuze, cyangwa raporo zuzuze zose - byose mu gikoresho kimwe.",
    storeManagerRetailCo: "Uyobora iduka, Retail Co.",
    businessOwnerChenTrading: "Umuyobozi w'ubucuruzi, Chen Trading",
    operationsDirectorWilliamsSupply: "Umuyobozi w'ibikorwa, Williams Supply",
    productColumn: "Icuruzwa",
    resourcesColumn: "Imikoreshereze",
    companyColumn: "Sosiyete",
    legalColumn: "Amategeko",
    connectColumn: "Kwiyunga",
    featuresLink: "Imiterere",
    pricingLink: "Amafaranga",
    enterpriseLink: "Ubucuruzi",
    reportsLink: "Raporo",
    analyticsLink: "Raporo",
    documentationLink: "Inyandiko",
    supportLink: "Gufasha",
    blogLink: "Blog",
    guidesLink: "Amabwiriza",
    apiLink: "API",
    aboutLink: "Ibyerekeye",
    careersLink: "Akazi",
    contactLink: "Kwiyunga",
    pressLink: "Itangazamakuru",
    termsOfServiceLink: "Amabwiriza y'ikoresha",
    privacyPolicyLink: "Politiki y'ubwigenge",
    dataUseLink: "Gukoresha amakuru",
    securityLink: "Umutekano",
    twitterLink: "X (Twitter)",
    linkedinLink: "LinkedIn",
    youtubeLink: "YouTube",
    copyright: "© 2025 Trippo.",
    allRightsReserved: "Uburenganzira bwose burabitswe.",
    productInventoryManagement: "Uyobozibwe bw'stoki y'ibicuruzwa",
    salesTrackingRecording: "Kureba n'andika ubucuruzi",
    basicReportsAnalytics: "Raporo zisanzwe n'ubushishozi",
    offlineSupportSync: "Gufasha nta interineti hamwe no guhuza",
    upTo100Products: "Kugeza ku bicuruzwa 100",
    
    // Dashboard
    todaysRevenue: "Amafaranga y'u munsi",
    todaysProfit: "Inyungu y'u munsi",
    weekRevenue: "Amafaranga y'icyumweru",
    weekProfit: "Inyungu y'icyumweru",
    monthRevenue: "Amafaranga y'uku kwezi",
    monthProfit: "Inyungu y'uku kwezi",
    yearRevenue: "Amafaranga y'uku mwaka",
    yearProfit: "Inyungu y'uku mwaka",
    periodToday: "Uyu munsi",
    periodWeek: "Icyumweru",
    periodMonth: "Ukwezi",
    periodYear: "Umwaka",
    vsYesterday: "ugereranyije n'ejo",
    vsLastWeek: "ugereranyije n'icyumweru gishize",
    vsLastMonth: "ugereranyije n'ukwe gushize",
    vsLastYear: "ugereranyije n'umwaka ushize",
    todaysItems: "Ibintu by'u munsi",
    currentStockValue: "Agaciro k'stoki",
    items: "ibintu",
    recordNewSale: "Andika ubucuruzi bushya",
    bulkAdd: "Ongeraho byinshi",
    singleSale: "Ubucuruzi bumwe",
    selectProduct: "Hitamo icuruzwa",
    suggestedPrice: "Igiciro giteganyijwe",
    youCanChangeThis: "Urashobora guhindura",
    availableStock: "Stoki buhari",
    addRow: "Ongeraho umurongo",
    spreadsheetMode: "Imbonerahamwe",
    spreadsheetHint: "Uzuza imirongo nk'uburyo bwa Excel, hanyuma ubike byose icyarimwe. Urashobora guhindura n'ibisanzwe.",
    saveAll: "Bika byose",
    hello: "Muraho",
    greetingFallback: "Inshuti",
    quickActions: "Ibyibanze",
    quickActionsHint: "Kanda kugirango ukore ibikorwa byihuse",
    servicesToday: "Serivisi z'uyu munsi",
    servicesRecorded: "serivisi zakozwe",
    activeServices: "Serivisi ziboneka",
    servicesInSystem: "serivisi muri sisitemu",
    recentActivity: "Biheruka",
    salesAndExpenses: "Serivisi n'ibyakoreshejwe",
    recentSalesAndExpenses: "Serivisi n'ibyakoreshejwe",
    recentSales: "Serivisi za vuba",
    salesExpenseBalance: "Serivisi n'ibyakoreshejwe",
    netFlow: "Inyungu rusange",
    latestActivity: "Ibikorwa biheruka",
    noActivity: "Nta bikorwa",
    noRecentActivity: "Nta bikorwa biheruka",
    details: "Ibisobanuro",
    amountRwf: "Amafaranga (Rwf)",
    searchProductsAndServices: "Shakisha ibicuruzwa cyangwa serivisi...",
    packageLabel: "Igipaki",
    productOrService: "Igicuruzwa / Serivisi",
    saleMode: "Uburyo bwo kugurisha",
    sellByQuantity: "Kugurisha ku mubare",
    sellWholePackage: "Kugurisha igipaki cyose",
    cost: "Igiciro cy'inguzanyo",
    revenueMinusCost: "(Amafaranga − inguzanyo)",
    expenseExamplePlaceholder: "nka: Umuriro, Ubukode...",
    expenseCategoryPlaceholder: "nka: Ibikoresho",
    expenseNotePlaceholder: "Andika ibisobanuro...",
    presets: "Ibyihuse",
    mostUsed: "Byinshi ukoresha",
    savePreset: "Bika nk'icyihuse",
    addMultipleSalesHint: "Andika ubucuruzi bwinshi icyarimwe",
    serviceBadge: "Serivisi",
    typeLabel: "Ubwoko",
    
    // Products Page
    allProducts: "Ibicuruzwa byose",
    addNewProduct: "Ongeraho icuruzwa gishya",
    backToProducts: "Subira ku bicuruzwa",
    productType: "Ubwoko bw'icuruzwa",
    packageQuantity: "Umubare w'ibintu mu gipaki",
    minStockAlert: "Icyitonderwa cy'stoki",
    status: "Imiterere",
    actions: "Ibyakozwe",
    noProducts: "Ntacyo cyabonetse",
    sortBy: "Gutondekanya",
    newest: "Gishya",
    oldest: "Gishaje",
    nameAsc: "Izina (A-Z)",
    nameDesc: "Izina (Z-A)",
    priceAsc: "Igiciro (Guke-Gukomeye)",
    priceDesc: "Igiciro (Gukomeye-Guke)",
    allCategories: "Ubwoko bwose",
    allStatus: "Imiterere yose",
    inStock: "Buriho",
    lowStock: "Stoki buke",
    outOfStock: "Ntacyo cyabonetse",
    bulkAddProducts: "Ongeraho ibicuruzwa byinshi",
    productTypeVariant: "Ubwoko/Icyihindurwa cy'icuruzwa (Bibasha)",
    enterProductName: "Injiza izina ry'icuruzwa",
    enterCategory: "Injiza ubwoko",
    enterPrice: "Injiza igiciro",
    enterStock: "Injiza stoki",
    addMultipleProducts: "Ongeraho ibicuruzwa byinshi hamwe",
    selectProductFirst: "Hitamo icuruzwa mbere",
    item: "kintu",
    allPrices: "Ibiciro byose",
    filterPriceUnder5k: "Munsi ya 5,000 RWF",
    filterPrice5kTo20k: "5,000 – 20,000 RWF",
    filterPriceOver20k: "Hejuru ya 20,000 RWF",
    allRoles: "Inshingano zose",
    allDisciplines: "Imyitwarire yose",
    allAttendance: "Kwitabira kwose",
    allPaymentMethods: "Uburyo bwose bwo kwishyura",
    allSaleTypes: "Ubwoko bwose",
    saleTypeProduct: "Ibicuruzwa",
    saleTypeService: "Serivisi",
    allBusinessTypes: "Ubwoko bwose bw'ubucuruzi",
    allClientTypes: "Ubwoko bwose bw'abakiriya",
    filterHasSchedules: "Bafite gahunda",
    filterHasActiveSchedules: "Gahunda zikora",
    filterHasOverdueSchedules: "Gahunda zarenze igihe",
    stockAsc: "Stoki (Nke-Nini)",
    stockDesc: "Stoki (Nini-Nke)",
    filterLast30Days: "Iminsi 30 ishize",
    allWorkers: "Abakozi bose",
    
    // Sales Page
    allSales: "Ubucuruzi bwose",
    filterSales: "Gutondekanya ubucuruzi",
    startDate: "Itariki yatangira",
    endDate: "Itariki yarangiye",
    noSales: "Ntacyo cyabonetse",
    product: "Ibicuruzwa",
    revenue: "Amafaranga",
    profit: "Inyungu",
    date: "Itariki",
    payment: "Kwishyura",
    bulkSaleMode: "Uburyo bwo kwandika ubucuruzi byinshi",
    addMultipleSales: "Ongeraho ubucuruzi byinshi hamwe",
    recording: "Buri mu nzira...",
    
    // Reports Page
    salesReport: "Raporo y'ubucuruzi",
    dateRange: "Igihe",
    last7Days: "Iminsi 7 ishize",
    last30Days: "Iminsi 30 ishize",
    last90Days: "Iminsi 90 ishize",
    thisMonth: "Uku kwezi",
    lastMonth: "Ukwezi gushize",
    thisYear: "Uku mwaka",
    custom: "Bihagije",
    exportPdf: "Kohereza PDF",
    exportExcel: "Kohereza Excel",
    salesTrend: "Ibiheruka gukorwa (mu minsi 7)",
    salesTrendLast7Days: "Ibiheruka gukorwa (mu minsi 7)",
    topProducts: "Ibicuruzwa by'ibanze",
    salesByCategory: "Ubucuruzi by'ubwoko",
    paymentMethods: "Uburyo bwo kwishyura",
    
    // Common Messages
    confirmDelete: "Emeza gusiba",
    areYouSure: "Urasabye?",
    thisActionCannotBeUndone: "Iki gikorwa ntikigishobora guhindurwa.",
    yesDelete: "Yego, Siba",
    noCancel: "Oya, Kureka",
    success: "Byagenze neza",
    error: "Ikosa",
    saved: "Byabitswe",
    updated: "Byahinduwe",
    deleted: "Byasibwe",
    failed: "Byanze",
    pleaseTryAgain: "Nyamuneka gerageza nanone",

    // Expenses
    oneTimeExpense: "Ibyasohotse",
    recurringExpenses: "Ibikunda gusohoka",
    expenseTitle: "Izina ry'icyasohotse",
    amount: "Amafaranga",
    note: "Detaye",
    noteOptional: "Detaye (si ngombwa)",
    saveExpense: "Bika ibyakozwe",
    addMultipleExpenses: "Ongeraho ibyasohotse byinshi hamwe",
    addExpensesBtn: "Ongeraho ibyasohotse",
    recentExpenses: "Ibiheruka gusohoka",

    addService: "Ongeraho serivisi",
    addMultipleServices: "Ongeraho serivisi nyinshi hamwe",
    addServicesBtn: "Ongeraho serivisi",
    editService: "Hindura serivisi",
    serviceName: "Izina rya serivisi",
    noServicesFound: "Nta serivisi ziboneka.",
    noServicesAddFirst: "Nta serivisi ziboneka. Banza wongereho serivisi.",
    recordService: "Andika serivisi",
    selectService: "Hitamo serivisi",
    selectWorker: "Hitamo umukozi",
    invalidInput: "Amakuru atari yo",
    validServiceRequired: "Andika izina rya serivisi n'igiciro cyemewe.",
    serviceUpdated: "Serivisi yahinduwe",
    serviceAdded: "Serivisi yongeweho",
    serviceDeleted: "Serivisi yasibwe",
    deleteServiceConfirm: "Siba serivisi",
    nameRequired: "Izina rirakenewe",
    enterProductNameMsg: "Andika izina ry'icuruzwa.",
    duplicateProduct: "Igicuruzwa cyamaze kubaho",
    duplicateProductDesc: "Hari igicuruzwa gifite iri zina n'icyiciro.",
    productUpdated: "Igicuruzwa cyahinduwe",
    productAdded: "Igicuruzwa cyongeweho",
    changesSaved: "Impinduka zabitswe neza.",
    productSaved: "Igicuruzwa cyabitswe neza.",
    addWorker: "Ongeraho umukozi",
    addMultipleWorkers: "Ongeraho abakozi benshi hamwe",
    addWorkersBtn: "Ongeraho abakozi",
    editWorker: "Hindura umukozi",
    noWorkersFound: "Nta bakozi babonetse.",
    noWorkersAddFirst: "Nta bakozi babonetse. Kanda Ongeraho umukozi utangire.",
    editSale: "Hindura ibyakozwe",
    updateStock: "Hindura ibihari",
    updateStockFor: "Hindura ingano y'ibihari bya",
    enterStockQuantity: "Andika ingano y'ibihari",
    minimumStockLabel: "Ibihari by'ubusa",
    stockUpdated: "Ibihari byahinduwe",
    invalidStock: "Ibihari bitari byo",
    invalidStockDesc: "Andika ingano y'ibihari yemewe.",
    updateFailed: "Guhindura byanze",
    recordExpense: "Andika ibyasohotse",
    record: "Andika",
    welcomeToTrippo: "Murakaza neza muri Trippo",
    createAccount: "Fungura konti",
    enterYourPin: "Andika PIN yawe",
    forgotPin: "Wibagiwe PIN?",
    sendVerificationCode: "Ohereza kode yo kwemeza",
    verificationCode: "Kode yo kwemeza imeri",
    resendCode: "Ohereza kode nanone",
    sendingCode: "Birimo kohereza kode...",
    creatingAccount: "Birimo gufungura konti...",
    resetYourPin: "Hindura PIN yawe",
    phoneNumber: "Telefone",
    fullName: "Amazina yose",

    expensePresetSavedDesc: "Ikiguzi cyabitswe nk'icyihuse.",
    productOutOfStock: "Icuruzwa rirangiye muri stoki",
    productOutOfStockRemovedSuffix: "ntikiboneka muri stoki kandi cyakuweho mu mahitamo.",
    productOutOfStockCannotSellSuffix: "ntikiboneka muri stoki kandi ntigishobora kugurishwa.",
    workerRequired: "Hitamo umukozi",
    invalidPriceShort: "Igiciro kitari cyo",
    insufficientStock: "Stoki ntihagije",
    insufficientStockBulkDesc: "Ntibishoboka kwandika ubu bucuruzi: {list}. Ntushobora kugurisha birenze ibiri muri stoki.",
    salesRecorded: "Ubucuruzi bwanditswe",
    salesRecordedBulkDesc: "Handitswe neza ubucuruzi {count}.",
    noSalesRecorded: "Nta bucuruzi bwanditswe",
    noSalesRecordedDesc: "Andika nibura ubucuruzi bumwe bwuzuye.",
    missingInformation: "Amakuru abura",
    fillAllRequired: "Uzuza ibisabwa byose.",
    selectServiceWorker: "Hitamo umukozi utanga serivisi.",
    invalidAmount: "Amafaranga atari yo",
    serviceAmountMustBePositive: "Amafaranga ya serivisi agomba kurenza 0.",
    workerNotFound: "Umukozi ntaboneka",
    selectValidWorker: "Hitamo umukozi wemewe.",
    serviceRecorded: "Serivisi yanditswe",
    serviceRecordedDesc: "{product} yakozwe na {worker} ku RWF {amount}",
    enterQuantityDesc: "Andika umubare.",
    invalidQuantity: "Umubare utari wo",
    invalidQuantityDesc: "Andika umubare nyawo urenze 0.",
    invalidPriceDesc: "Injiza igiciro cyemewe (umubare wuzuye).",
    needWholePackageStock: "Hakeneye nibura {need} muri stoki (hari {stock}).",
    onlyItemsInStock: "Hari gusa {stock} {items} muri stoki.",
    itemSingular: "ikintu",
    itemsPlural: "ibintu",
    saleRecorded: "Ubucuruzi bwanditswe",
    saleRecordedDesc: "Handitswe neza: {qty}x {product}",
    saleRecordedOffline: "Ubucuruzi bwanditswe (nta interineti)",
    saleRecordedOfflineWithProduct: "Handitswe neza: {qty}x {product}. Bizahuzwa interineti igarutse.",
    saleRecordedOfflineGeneric: "Ubucuruzi bwanditswe nta interineti. Bizahuzwa interineti igarutse.",
    recordFailed: "Kwandika byanze",
    recordFailedDesc: "Kwandika ubucuruzi byanze. Reba interneti wongere ugerageze.",
    expenseNameAmountRequired: "Andika izina ry'ikiguzi n'amafaranga nyayo.",
    expenseRecorded: "Ikiguzi cyanditswe",
    expenseRecordedDesc: "Ikiguzi cyabitswe neza.",
    saveFailed: "Kwandika byanze",
    saveExpenseFailed: "Kwandika ikiguzi byanze.",
    activitySaleLabel: "Serivisi",
    activityExpenseLabel: "Ikiguzi",
    activityEmptyHint: "Serivisi n'ibyakoreshejwe bizagaragara hano",
    viewMoreInSales: "Reba byinshi muri Sales",
    invalidQuantityShort: "Umubare utari wo",
    onlyItemsAvailable: "Hari gusa {stock} {items}",
    chartSalesLabel: "Ubucuruzi",
    daySun: "Ku wa 7",
    dayMon: "Ku wa 1",
    dayTue: "Ku wa 2",
    dayWed: "Ku wa 3",
    dayThu: "Ku wa 4",
    dayFri: "Ku wa 5",
    daySat: "Ku wa 6",
    pricePerItem: "Igiciro ku kintu",
    priceForWholePackageLabel: "Igiciro cy'ipaki yose",
    priceWholePackageCalc: "Igiciro ku kintu: {base} rwf × {qty} = {total} rwf (ipaki yose)",
    priceFromPackageCalc: "Igiciro ku kintu: {perItem} rwf (kuva {base} rwf ÷ {qty})",
    maximumQuantity: "Umubare ntarengwa",
    stockLabel: "Ibihari",
    boxOf: "Agafuka ka {qty}",
    noProductsSearchHint: "Nta bicuruzwa bibonetse. Gerageza indi shakiro.",
  },
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    products: "Services",
    services: "Services",
    inventories: "Stocks",
    workers: "Travailleurs",
    worker: "Travailleur",
    expenses: "Dépenses",
    billing: "Facturation",
    sales: "Ventes",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    sidebarSectionOverview: "Aperçu",
    sidebarSectionOperations: "Opérations",
    sidebarSectionFinance: "Finances",
    sidebarSectionInsights: "Analyses",
    sidebarSectionAccount: "Compte",
    
    // Common
    save: "Enregistrer",
    update: "Mettre à jour",
    updating: "Mise à jour...",
    saving: "Enregistrement...",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    search: "Rechercher",
    filter: "Filtrer",
    loading: "Chargement...",
    signIn: "Connexion",
    getStarted: "Commencer",
    close: "Fermer",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    yes: "Oui",
    no: "Non",
    all: "Tout",
    none: "Aucun",
    total: "Total",
    subtotal: "Sous-total",
    name: "Nom",
    category: "Catégorie",
    price: "Prix",
    stock: "Stock",
    quantity: "Quantité",
    description: "Description",
    optional: "Optionnel",
    required: "Obligatoire",
    
    // Settings
    businessInfo: "Informations sur l'entreprise",
    security: "Sécurité",
    language: "Langue",
    businessName: "Nom de l'entreprise",
    ownerName: "Nom du responsable",
    emailAddress: "Adresse e-mail",
    saveChanges: "Enregistrer les modifications",
    changePin: "Changer le PIN",
    setPin: "Définir le PIN",
    currentPin: "PIN actuel",
    newPin: "Nouveau PIN",
    confirmPin: "Confirmer le PIN",
    
    // Sales (labels)
    recordSale: "Enregistrer une vente",
    recordSales: "Enregistrer des ventes",
    enterQuantity: "Saisir la quantité",
    paymentMethod: "Mode de paiement",
    saleDate: "Date de vente",
    cash: "Espèces",
    momoPay: "Momo",
    card: "Carte",
    airtelPay: "Airtel Money",
    bankTransfer: "Virement bancaire",
    
    // Dashboard KPIs (time periods)
    todaysRevenue: "Revenu d'aujourd'hui",
    todaysProfit: "Bénéfice (net) d'aujourd'hui",
    weekRevenue: "Revenu de la semaine",
    weekProfit: "Bénéfice (net) de la semaine",
    monthRevenue: "Revenu du mois",
    monthProfit: "Bénéfice (net) du mois",
    yearRevenue: "Revenu de l'année",
    yearProfit: "Bénéfice (net) de l'année",
    periodToday: "Aujourd'hui",
    periodWeek: "Semaine",
    periodMonth: "Mois",
    periodYear: "Année",
    vsYesterday: "vs hier",
    vsLastWeek: "vs semaine dernière",
    vsLastMonth: "vs mois dernier",
    vsLastYear: "vs année dernière",
    todaysItems: "Services d'aujourd'hui",
    currentStockValue: "Valeur du stock actuel",
    items: "articles",
    recordNewSale: "Enregistrer une nouvelle vente",
    bulkAdd: "Ajout groupé",
    singleSale: "Vente unique",
    selectProduct: "Sélectionner un produit",
    suggestedPrice: "Prix suggéré",
    youCanChangeThis: "Vous pouvez modifier",
    availableStock: "Stock disponible",
    addRow: "Ajouter une ligne",
    spreadsheetMode: "Tableur",
    spreadsheetHint: "Remplissez les lignes comme dans Excel, puis enregistrez tout d'un coup. Les lignes existantes sont modifiables.",
    saveAll: "Tout enregistrer",
    hello: "Bonjour",
    greetingFallback: "Utilisateur",
    quickActions: "Actions rapides",
    quickActionsHint: "Cliquez pour effectuer des actions rapides",
    servicesToday: "Services d'aujourd'hui",
    servicesRecorded: "services enregistrés",
    activeServices: "Services actifs",
    servicesInSystem: "services dans le système",
    recentActivity: "Récent",
    salesAndExpenses: "Ventes et dépenses",
    recentSalesAndExpenses: "Ventes récentes et dépenses",
    recentSales: "Ventes récentes",
    salesExpenseBalance: "Ventes vs dépenses",
    netFlow: "Flux net",
    latestActivity: "Activité récente",
    noActivity: "Aucune activité",
    noRecentActivity: "Aucune activité récente",
    details: "Détails",
    amountRwf: "Montant (RWF)",
    searchProductsAndServices: "Rechercher produits et services...",
    packageLabel: "Paquet",
    productOrService: "Produit / Service",
    saleMode: "Mode de vente",
    sellByQuantity: "Vendre à l'unité",
    sellWholePackage: "Vendre le paquet entier",
    cost: "Coût",
    revenueMinusCost: "(Revenu − coût)",
    expenseExamplePlaceholder: "ex. : Services, Loyer...",
    expenseCategoryPlaceholder: "ex. : Fournitures",
    expenseNotePlaceholder: "Ajouter des détails...",
    presets: "Favoris",
    mostUsed: "Les plus utilisés",
    savePreset: "Enregistrer favori",
    addMultipleSalesHint: "Ajouter plusieurs ventes à la fois",
    serviceBadge: "Service",
    typeLabel: "Type",
    revenue: "Revenu",
    profit: "Bénéfice",
    product: "Produit",
    date: "Date",
    payment: "Paiement",
    recording: "Enregistrement...",
    addMultipleSales: "Ajouter plusieurs ventes à la fois",
    enterPrice: "Saisir le prix",
    sellingPrice: "Prix de vente",
    
    // Expenses
    oneTimeExpense: "Dépense ponctuelle",
    recurringExpenses: "Dépenses récurrentes",
    expenseTitle: "Titre de la dépense",
    amount: "Montant",
    note: "Note",
    noteOptional: "Note (optionnel)",
    saveExpense: "Enregistrer la dépense",
    addMultipleExpenses: "Ajouter plusieurs dépenses à la fois",
    addExpensesBtn: "Ajouter les dépenses",
    recentExpenses: "Dépenses récentes",
    recordExpense: "Enregistrer une dépense",
    record: "Enregistrer",

    // Modals
    addService: "Ajouter un service",
    addMultipleServices: "Ajouter plusieurs services à la fois",
    addServicesBtn: "Ajouter les services",
    editService: "Modifier le service",
    serviceName: "Nom du service",
    noServicesFound: "Aucun service trouvé.",
    noServicesAddFirst: "Aucun service trouvé. Ajoutez un service d'abord.",
    recordService: "Enregistrer un service",
    selectService: "Sélectionner un service",
    selectWorker: "Choisir un travailleur",
    noWorkersFound: "Aucun travailleur trouvé.",
    noWorkersAddFirst: "Aucun travailleur trouvé. Cliquez sur Ajouter un travailleur.",
    addWorker: "Ajouter un travailleur",
    addMultipleWorkers: "Ajouter plusieurs travailleurs à la fois",
    addWorkersBtn: "Ajouter les travailleurs",
    editWorker: "Modifier le travailleur",
    editSale: "Modifier la vente",
    
    // Common messages
    confirmDelete: "Confirmer la suppression",
    areYouSure: "Êtes-vous sûr ?",
    thisActionCannotBeUndone: "Cette action ne peut pas être annulée.",
    yesDelete: "Oui, supprimer",
    noCancel: "Non, annuler",
    success: "Succès",
    error: "Erreur",
    saved: "Enregistré",
    updated: "Mis à jour",
    deleted: "Supprimé",
    failed: "Échec",
    pleaseTryAgain: "Veuillez réessayer",

    salesTrendLast7Days: "Tendance des ventes (7 derniers jours)",
    expensePresetSavedDesc: "Dépense enregistrée comme favori rapide.",
    productOutOfStock: "Produit en rupture de stock",
    productOutOfStockRemovedSuffix: "est en rupture de stock et a été retiré de la sélection.",
    productOutOfStockCannotSellSuffix: "est en rupture de stock et ne peut pas être vendu.",
    workerRequired: "Travailleur requis",
    invalidPriceShort: "Prix invalide",
    insufficientStock: "Stock insuffisant",
    insufficientStockBulkDesc: "Impossible d'enregistrer les ventes pour : {list}. Vous ne pouvez pas vendre plus que la quantité disponible.",
    salesRecorded: "Ventes enregistrées",
    salesRecordedBulkDesc: "{count} vente(s) enregistrée(s) avec succès.",
    noSalesRecorded: "Aucune vente enregistrée",
    noSalesRecordedDesc: "Veuillez remplir au moins une vente complète.",
    missingInformation: "Informations manquantes",
    fillAllRequired: "Veuillez remplir tous les champs obligatoires.",
    selectServiceWorker: "Veuillez sélectionner qui a effectué le service.",
    invalidAmount: "Montant invalide",
    serviceAmountMustBePositive: "Le montant du service doit être supérieur à 0.",
    workerNotFound: "Travailleur introuvable",
    selectValidWorker: "Veuillez sélectionner un travailleur valide.",
    serviceRecorded: "Service enregistré",
    serviceRecordedDesc: "{product} par {worker} pour {amount} RWF",
    enterQuantityDesc: "Veuillez saisir la quantité.",
    invalidQuantity: "Quantité invalide",
    invalidQuantityDesc: "Veuillez saisir une quantité valide supérieure à 0.",
    invalidPriceDesc: "Entrez un prix valide (nombre positif ou zéro).",
    needWholePackageStock: "Il faut au moins {need} en stock pour vendre un paquet entier ({stock} disponible(s)).",
    onlyItemsInStock: "Seulement {stock} {items} disponible(s) en stock.",
    itemSingular: "article",
    itemsPlural: "articles",
    saleRecorded: "Vente enregistrée",
    saleRecordedDesc: "Vente enregistrée : {qty}x {product}",
    saleRecordedOffline: "Vente enregistrée (hors ligne)",
    saleRecordedOfflineWithProduct: "Vente enregistrée : {qty}x {product}. Synchronisation à la reconnexion.",
    saleRecordedOfflineGeneric: "Vente enregistrée hors ligne. Synchronisation à la reconnexion.",
    recordFailed: "Échec de l'enregistrement",
    recordFailedDesc: "Impossible d'enregistrer la vente. Vérifiez votre connexion et réessayez.",
    expenseNameAmountRequired: "Veuillez indiquer le nom et un montant valide.",
    expenseRecorded: "Dépense enregistrée",
    expenseRecordedDesc: "Dépense enregistrée avec succès.",
    saveFailed: "Échec de l'enregistrement",
    saveExpenseFailed: "Impossible d'enregistrer la dépense.",
    activitySaleLabel: "Vente",
    activityExpenseLabel: "Dépense",
    activityEmptyHint: "Les ventes et dépenses récentes apparaîtront ici",
    viewMoreInSales: "Voir plus dans Ventes",
    invalidQuantityShort: "Quantité invalide",
    onlyItemsAvailable: "Seulement {stock} {items} disponible(s)",
    chartSalesLabel: "Ventes",
    daySun: "Dim",
    dayMon: "Lun",
    dayTue: "Mar",
    dayWed: "Mer",
    dayThu: "Jeu",
    dayFri: "Ven",
    daySat: "Sam",
    pricePerItem: "Prix à l'unité",
    priceForWholePackageLabel: "Prix du paquet entier",
    priceWholePackageCalc: "Prix à l'unité : {base} rwf × {qty} = {total} rwf (paquet entier)",
    priceFromPackageCalc: "Prix à l'unité : {perItem} rwf (de {base} rwf ÷ {qty})",
    maximumQuantity: "Quantité maximale",
    stockLabel: "Stock",
    boxOf: "Paquet de {qty}",
    noProductsSearchHint: "Aucun élément trouvé. Essayez une autre recherche.",
    noProducts: "Aucun produit trouvé",
  },
};

export const getTranslation = (key: keyof Translations, language: Language = "en"): string => {
  return (
    extendedTranslations[language]?.[key] ??
    translations[language]?.[key] ??
    (language === "fr" ? frMissing[key] : undefined) ??
    extendedTranslations.en?.[key] ??
    translations.en?.[key] ??
    key
  );
};

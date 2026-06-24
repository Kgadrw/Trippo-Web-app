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
  income: string;
  finance: string;
  incomeStatements: string;
  incomeSources: string;
  incomeSource: string;
  incomeSourcePlaceholder: string;
  incomeBySource: string;
  expenditure: string;
  totalIncome: string;
  totalExpenditure: string;
  totalPayroll: string;
  currentBalance: string;
  payroll: string;
  recordPayroll: string;
  editPayroll: string;
  employeeName: string;
  payPeriod: string;
  payrollStatus: string;
  paid: string;
  pending: string;
  noPayrollYet: string;
  payrollEmptyHint: string;
  payrollRecorded: string;
  payrollRecordedDesc: string;
  payrollRemovedDesc: string;
  savePayrollFailed: string;
  deletePayrollFailed: string;
  payrollNameAmountRequired: string;
  bills: string;
  recordBill: string;
  editBill: string;
  billTitle: string;
  billExamplePlaceholder: string;
  billNameAmountRequired: string;
  billRecorded: string;
  billRecordedDesc: string;
  billRemovedDesc: string;
  saveBillFailed: string;
  deleteBillFailed: string;
  markBillPaidFailed: string;
  noBillsYet: string;
  billsEmptyHint: string;
  billPaid: string;
  billPaidDesc: string;
  billPaidHint: string;
  billStatus: string;
  pendingBills: string;
  paidBills: string;
  allBills: string;
  markAsPaid: string;
  vendor: string;
  vendorPlaceholder: string;
  taxes: string;
  recordTax: string;
  editTax: string;
  taxTitle: string;
  taxType: string;
  taxAuthority: string;
  taxAuthorityPlaceholder: string;
  taxPeriod: string;
  taxExamplePlaceholder: string;
  taxNameAmountRequired: string;
  taxRecorded: string;
  taxRecordedDesc: string;
  taxRemovedDesc: string;
  saveTaxFailed: string;
  deleteTaxFailed: string;
  markTaxPaidFailed: string;
  noTaxesYet: string;
  taxesEmptyHint: string;
  taxPaid: string;
  taxPaidDesc: string;
  taxPaidHint: string;
  outstandingTaxes: string;
  dueWithin30Days: string;
  taxObligations: string;
  bankDeposits: string;
  recordDeposit: string;
  editDeposit: string;
  depositTitle: string;
  depositDate: string;
  depositExamplePlaceholder: string;
  depositNameAmountRequired: string;
  depositCustomPeriodRequired: string;
  depositRecorded: string;
  depositRecordedDesc: string;
  depositUpdated: string;
  depositUpdatedDesc: string;
  depositRemovedDesc: string;
  saveDepositFailed: string;
  deleteDepositFailed: string;
  noDepositsYet: string;
  depositsEmptyHint: string;
  budgetPeriod: string;
  budgetPeriodMonthly: string;
  budgetPeriodQuarterly: string;
  budgetPeriodYearly: string;
  budgetPeriodCustom: string;
  budgetPeriodHint: string;
  budgetCovers: string;
  viewBudgetFor: string;
  totalDeposited: string;
  usedBalance: string;
  availableBalance: string;
  availableBalanceHint: string;
  activeDeposits: string;
  periodStart: string;
  periodEnd: string;
  depositReferencePlaceholder: string;
  bankAccount: string;
  transactionTypeDeposit: string;
  loans: string;
  addLoan: string;
  editLoan: string;
  loanTitle: string;
  loanTitlePlaceholder: string;
  lender: string;
  lenderPlaceholder: string;
  loanType: string;
  loanTypeBusiness: string;
  loanTypeWorkingCapital: string;
  loanTypeEquipment: string;
  loanTypeVehicle: string;
  loanTypeLineOfCredit: string;
  loanTypeOther: string;
  principalAmount: string;
  installmentAmount: string;
  interestRate: string;
  termMonths: string;
  paymentFrequency: string;
  maturityDate: string;
  nextDueDate: string;
  remainingBalance: string;
  loanStatus: string;
  loanStatusActive: string;
  loanStatusOverdue: string;
  loanStatusPaidOff: string;
  loanAccountNumber: string;
  collateral: string;
  collateralPlaceholder: string;
  contactPerson: string;
  contactPhone: string;
  recordLoanPayment: string;
  paymentHistory: string;
  paymentAmount: string;
  paymentDate: string;
  principalPortion: string;
  interestPortion: string;
  loanRequiredFields: string;
  loanRecorded: string;
  loanRecordedDesc: string;
  loanUpdated: string;
  loanUpdatedDesc: string;
  loanRemovedDesc: string;
  saveLoanFailed: string;
  deleteLoanFailed: string;
  recordLoanPaymentFailed: string;
  loanPaymentRecorded: string;
  loanPaymentRecordedDesc: string;
  loanPaymentAmountRequired: string;
  loanPaymentExpenseHint: string;
  loanDeleteHasPayments: string;
  noLoansYet: string;
  loansEmptyHint: string;
  totalOutstanding: string;
  dueThisMonth: string;
  loanPaymentsDue: string;
  overdueLoans: string;
  activeLoans: string;
  totalPaidOnLoans: string;
  noPaymentsYet: string;
  customers: string;
  addCustomer: string;
  editCustomer: string;
  customerName: string;
  customer: string;
  selectCustomer: string;
  customerCreated: string;
  customerCreatedDesc: string;
  customerUpdated: string;
  customerUpdatedDesc: string;
  customerRemovedDesc: string;
  saveCustomerFailed: string;
  deleteCustomerFailed: string;
  customerNameRequired: string;
  noCustomersYet: string;
  customersEmptyHint: string;
  viewStatement: string;
  downloadStatement: string;
  loadCustomerActivityFailed: string;
  vendors: string;
  addVendor: string;
  editVendor: string;
  vendorName: string;
  selectVendor: string;
  vendorCreated: string;
  vendorCreatedDesc: string;
  vendorUpdated: string;
  vendorUpdatedDesc: string;
  vendorRemovedDesc: string;
  saveVendorFailed: string;
  deleteVendorFailed: string;
  vendorNameRequired: string;
  noVendorsYet: string;
  vendorsEmptyHint: string;
  loadVendorActivityFailed: string;
  accounts: string;
  addAccount: string;
  editAccount: string;
  accountName: string;
  accountType: string;
  accountCreated: string;
  accountCreatedDesc: string;
  accountUpdated: string;
  accountUpdatedDesc: string;
  accountRemovedDesc: string;
  saveAccountFailed: string;
  deleteAccountFailed: string;
  accountNameRequired: string;
  noAccountsYet: string;
  accountsEmptyHint: string;
  openingBalance: string;
  transferFunds: string;
  fromAccount: string;
  toAccount: string;
  selectAccount: string;
  paymentAccount: string;
  noAccountSelected: string;
  financialStatements: string;
  financialStatementsHint: string;
  profitLoss: string;
  balanceSheet: string;
  cashFlow: string;
  dashHelpReceivables: string;
  dashHelpPayables: string;
  dashHelpCashFlow: string;
  dashHelpIncomeExpense: string;
  dashHelpTopExpenses: string;
  dashHelpMonthlyKpis: string;
  dashHelpUpcomingBills: string;
  dashHelpRecentTransactions: string;
  helpIncome: string;
  helpCustomers: string;
  helpInvoices: string;
  helpVendors: string;
  helpBankDeposits: string;
  helpAccounts: string;
  helpFinancialStatements: string;
  helpBankReconciliation: string;
  helpCategoryBudgets: string;
  helpLoans: string;
  helpBills: string;
  helpTaxes: string;
  helpExpenditure: string;
  helpPayroll: string;
  helpTransactions: string;
  helpProducts: string;
  helpSales: string;
  helpDocuments: string;
  helpReports: string;
  helpAutomations: string;
  helpCalendar: string;
  helpTeamOverview: string;
  helpTeamTasks: string;
  helpTeamFinanceTasks: string;
  helpTeamMembers: string;
  loadStatementsFailed: string;
  asOfDate: string;
  generateReport: string;
  totalExpenses: string;
  netProfit: string;
  assets: string;
  cashAndBank: string;
  accountsReceivable: string;
  inventoryValue: string;
  totalAssets: string;
  liabilitiesAndEquity: string;
  accountsPayable: string;
  loanLiabilities: string;
  totalLiabilities: string;
  equity: string;
  operatingCashIn: string;
  operatingCashOut: string;
  netOperatingCash: string;
  financingDeposits: string;
  netChangeInCash: string;
  bankReconciliation: string;
  bankReconciliationHint: string;
  closingBalance: string;
  reconciledCount: string;
  unreconciledCount: string;
  reconciled: string;
  noReconciliationEntries: string;
  transactionType: string;
  refresh: string;
  transfer: string;
  transferComplete: string;
  transferCompleteDesc: string;
  transferFailed: string;
  transferInvalid: string;
  categoryBudgets: string;
  addCategoryBudget: string;
  categoryBudgetRequired: string;
  budgetCreated: string;
  budgetCreatedDesc: string;
  saveBudgetFailed: string;
  deleteBudgetFailed: string;
  budgetRemovedDesc: string;
  loadBudgetSummaryFailed: string;
  totalBudget: string;
  totalActual: string;
  viewPeriod: string;
  budget: string;
  actual: string;
  budgetRules: string;
  noBudgetsYet: string;
  budgetsEmptyHint: string;
  noSalesYet: string;
  salesEmptyHint: string;
  saleRequiredFields: string;
  saveSaleFailed: string;
  balanceDue: string;
  totalPaid: string;
  email: string;
  phone: string;
  invoices: string;
  createInvoice: string;
  editInvoice: string;
  invoiceTitle: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceStatus_draft: string;
  invoiceStatus_sent: string;
  invoiceStatus_paid: string;
  invoiceStatus_overdue: string;
  unpaidInvoices: string;
  noInvoicesYet: string;
  invoicesEmptyHint: string;
  invoiceRequiredFields: string;
  invoiceCreated: string;
  invoiceCreatedDesc: string;
  invoiceUpdated: string;
  invoiceUpdatedDesc: string;
  invoiceRemovedDesc: string;
  saveInvoiceFailed: string;
  deleteInvoiceFailed: string;
  markInvoiceSentFailed: string;
  markInvoicePaidFailed: string;
  invoiceSent: string;
  invoiceSentDesc: string;
  invoicePaid: string;
  invoicePaidDesc: string;
  recurringInvoiceCreated: string;
  recurringInvoiceCreatedDesc: string;
  lineItems: string;
  addLine: string;
  unitPrice: string;
  description: string;
  issueDate: string;
  paymentTerms: string;
  paymentTermsPlaceholder: string;
  recurringInvoice: string;
  markAsSent: string;
  downloadPdf: string;
  referenceNumber: string;
  referenceNumberPlaceholder: string;
  dueDate: string;
  overdue: string;
  transactions: string;
  noTransactionsYet: string;
  transactionTypeIncome: string;
  transactionTypeExpense: string;
  transactionTypePayroll: string;
  recordIncome: string;
  editIncome: string;
  incomeTitle: string;
  incomeExamplePlaceholder: string;
  incomeNameAmountRequired: string;
  incomeRecorded: string;
  incomeRecordedDesc: string;
  saveIncomeFailed: string;
  incomeRemovedDesc: string;
  deleteIncomeFailed: string;
  noIncomeYet: string;
  incomeEmptyHint: string;
  uploadReceipt: string;
  changeReceipt: string;
  viewReceipt: string;
  receipt: string;
  receiptUploadHint: string;
  other: string;
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
  deleteConfirmTitle: string;
  deleteConfirmDesc: string;
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
  bankAccountName: string;
  bankAccountNumber: string;
  bankAccountNamePlaceholder: string;
  bankAccountNumberPlaceholder: string;
  
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
  ourPartners: string;
  homeTestimonial1Attribution: string;
  homeTestimonial2Attribution: string;
  homeTestimonial3Attribution: string;
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
  todaysExpenses: string;
  todaysExpenseCount: string;
  weekExpenses: string;
  weekExpenseCount: string;
  monthExpenses: string;
  monthExpenseCount: string;
  yearExpenses: string;
  yearExpenseCount: string;
  expensesRecorded: string;
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
  viewMoreInExpenses: string;
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
  billingPromptsUnavailable: string;
  billingPromptsUnavailableDesc: string;
  billingWebhookMode: string;
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
  freeTrialOneDayLeft: string;
  freeTrialDaysLeft: string;
  plusTrialEnded: string;
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
  reportOverview: string;
  reportSalesSection: string;
  reportFinanceSection: string;
  reportInventorySection: string;
  platformSummary: string;
  platformReportsSubtitle: string;
  outstanding: string;
  active: string;
  noIncomeFound: string;
  noDataForPeriod: string;
  uncategorized: string;
  retailValue: string;
  noProductsFound: string;
  salesPerformanceTitle: string;
  salesPerformanceEmptyHint: string;
  revenueMix: string;
  revenueTrend: string;
  sold: string;
  positiveBalance: string;
  negativeBalance: string;

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
  billingNoOtpHint: string;
  settingsHelpSupport: string;
  settingsHelpSupportDesc: string;
  callSupport: string;
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
  profilePictureChange: string;
  profilePictureRemove: string;
  profilePictureHint: string;
  profilePictureInvalidType: string;
  profilePictureTooLarge: string;
  profilePictureUploadedTitle: string;
  profilePictureUploadedDesc: string;
  profilePictureRemovedTitle: string;
  profilePictureRemovedDesc: string;
  workspaceMembersAvatars: string;
  workspaceMembersOthers: string;
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

  // Business calendar
  businessCalendarTitle: string;
  businessCalendarSubtitle: string;
  calLoadFailed: string;
  calLoadingActivity: string;
  calTitleRequired: string;
  calEventUpdated: string;
  calEventCreated: string;
  calSaveFailed: string;
  calEventDeleted: string;
  calDeleteFailed: string;
  calEventCompleted: string;
  calFilterType: string;
  calAllTypes: string;
  calViewItem: string;
  calSourceEvent: string;
  calSourceSale: string;
  calSourceIncome: string;
  calSourceExpense: string;
  calSourceBill: string;
  calSourceTax: string;
  calSourceInvoice: string;
  calSourcePayroll: string;
  calSourceDeposit: string;
  calToday: string;
  calViewDay: string;
  calViewWeek: string;
  calViewMonth: string;
  calViewYear: string;
  calAddEvent: string;
  calEditEvent: string;
  calAutomationLegend: string;
  calSelectedDay: string;
  calNoEventsDay: string;
  calCompleted: string;
  calCancelled: string;
  calMarkComplete: string;
  calAutomationItem: string;
  calViewAutomation: string;
  calEventTitle: string;
  calEventTitlePlaceholder: string;
  calEventType: string;
  calEventDate: string;
  calAllDay: string;
  calStartTime: string;
  calEndTime: string;
  calLocation: string;
  calLocationPlaceholder: string;
  calDescription: string;
  calStatus: string;
  calStatusScheduled: string;
  calReminder: string;
  calReminderNone: string;
  calReminder15: string;
  calReminder60: string;
  calReminderDay: string;
  calDeleteTitle: string;
  calDeleteDesc: string;
  calEventTypeMeeting: string;
  calEventTypeActivity: string;
  calEventTypeAppointment: string;
  calEventTypeDeadline: string;
  calEventTypeEvent: string;
  calEventTypeReminder: string;
  calEventTypeOther: string;

  // Team / project management
  team: string;
  teamOverview: string;
  teamAllTasks: string;
  teamFinanceTasks: string;
  teamMembers: string;
  teamOverviewTitle: string;
  teamOverviewSubtitle: string;
  teamTotalTasks: string;
  teamCompletionRate: string;
  teamActiveMembers: string;
  teamMembersHint: string;
  teamInProgress: string;
  teamInProgressHint: string;
  teamProgressByMember: string;
  teamNoMemberProgress: string;
  teamUnknownMember: string;
  teamRecentCompletions: string;
  teamNoRecentCompletions: string;
  teamManageTasks: string;
  teamManageMembers: string;
  teamTasksSubtitle: string;
  teamAssignTask: string;
  teamEditTask: string;
  teamFilterStatus: string;
  teamFilterMember: string;
  teamNoTasks: string;
  teamDone: string;
  teamTaskTitle: string;
  teamAssignee: string;
  teamStatus: string;
  teamPriority: string;
  teamDueDate: string;
  teamMarkComplete: string;
  teamCompleteTask: string;
  teamCompletionNote: string;
  teamCompletionNotePlaceholder: string;
  teamCompletionNotifyHint: string;
  teamDepartment: string;
  teamMonth: string;
  teamSelectMember: string;
  teamStatusTodo: string;
  teamStatusInProgress: string;
  teamStatusDone: string;
  teamDeptGeneral: string;
  teamDeptFinance: string;
  teamDeptOperations: string;
  teamDeptSales: string;
  teamDeptMarketing: string;
  teamDeptHr: string;
  teamLoadFailed: string;
  teamTitleRequired: string;
  teamAssigneeRequired: string;
  teamTaskUpdated: string;
  teamTaskCreated: string;
  teamTaskCompleted: string;
  teamTaskDeleted: string;
  teamSaveFailed: string;
  teamDeleteFailed: string;
  teamMembersSubtitle: string;
  teamAddMember: string;
  teamEditMember: string;
  teamNoMembers: string;
  teamJobTitle: string;
  teamInactive: string;
  teamMemberNameRequired: string;
  teamMemberUpdated: string;
  teamMemberCreated: string;
  teamMemberDeleted: string;
  teamImportFromPayroll: string;
  teamImportFromPayrollTitle: string;
  teamImportFromPayrollSubtitle: string;
  teamImportFromPayrollEmpty: string;
  teamImportFromPayrollAllExist: string;
  teamImportFromPayrollSelectAll: string;
  teamImportFromPayrollImport: string;
  teamImportFromPayrollSuccess: string;
  teamImportFromPayrollAlreadyMember: string;
  teamImportFromPayrollRecords: string;
  teamImportFromPayrollNote: string;
  teamImportFromPayrollFailed: string;

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
  automationTypeLabel: string;
  automationTypeFilter: string;
  allAutomationTypes: string;
  automationTypePaymentReminder: string;
  automationTypePaymentLink: string;
  automationTypeInvoice: string;
  automationTypeReport: string;
  automationTypePayroll: string;
  automationTypeTaxBill: string;
  automationTypeFollowUp: string;
  automationTypeCustom: string;
  automationPurposeHint: string;
  automationTitlePhPaymentReminder: string;
  automationTitlePhPaymentLink: string;
  automationTitlePhInvoice: string;
  automationTitlePhReport: string;
  automationTitlePhPayroll: string;
  automationTitlePhTaxBill: string;
  automationTitlePhFollowUp: string;
  automationTitlePhCustom: string;
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
    dashboard: "Overview",
    products: "Products",
    services: "Services",
    inventories: "Inventories",
    workers: "Workers",
    worker: "Worker",
    expenses: "Expenses",
    income: "Income",
    finance: "Finance",
    incomeStatements: "Income",
    incomeSources: "Income",
    incomeSource: "Income Source",
    incomeSourcePlaceholder: "e.g. Sales, Services, Rent...",
    incomeBySource: "Income by Source",
    expenditure: "Expenditure",
    totalIncome: "Total Income",
    totalExpenditure: "Total Expenditure",
    totalPayroll: "Total Payroll",
    currentBalance: "Current Balance",
    payroll: "Payroll",
    recordPayroll: "Record Payroll",
    editPayroll: "Edit Payroll",
    employeeName: "Employee",
    payPeriod: "Pay Period",
    payrollStatus: "Status",
    paid: "Paid",
    pending: "Pending",
    noPayrollYet: "No payroll recorded yet",
    payrollEmptyHint: "Track salary payments to see total payroll outflow.",
    payrollRecorded: "Payroll Recorded",
    payrollRecordedDesc: "Payroll saved successfully.",
    payrollRemovedDesc: "Payroll removed.",
    savePayrollFailed: "Failed to save payroll.",
    deletePayrollFailed: "Failed to delete payroll.",
    payrollNameAmountRequired: "Please provide employee name, amount, and pay period.",
    bills: "Bills",
    recordBill: "Add Bill",
    editBill: "Edit Bill",
    billTitle: "Bill Title",
    billExamplePlaceholder: "e.g. Rent, Electricity, Supplier invoice...",
    billNameAmountRequired: "Please provide bill title and valid amount.",
    billRecorded: "Bill Added",
    billRecordedDesc: "Bill saved. It will appear as pending until paid.",
    billRemovedDesc: "Bill removed.",
    saveBillFailed: "Failed to save bill.",
    deleteBillFailed: "Failed to delete bill.",
    markBillPaidFailed: "Failed to mark bill as paid.",
    noBillsYet: "No bills yet",
    billsEmptyHint: "Track bills you need to pay. Once paid, they become expenditures.",
    billPaid: "Bill Paid",
    billPaidDesc: "Bill marked as paid and recorded as an expenditure.",
    billPaidHint: "This will create an expenditure and mark the bill as paid.",
    billStatus: "Status",
    pendingBills: "Pending",
    paidBills: "Paid",
    allBills: "All Bills",
    markAsPaid: "Mark as Paid",
    vendor: "Vendor",
    vendorPlaceholder: "Who to pay",
    taxes: "Tax",
    recordTax: "Add Tax",
    editTax: "Edit Tax",
    taxTitle: "Tax Title",
    taxType: "Tax Type",
    taxAuthority: "Tax Authority",
    taxAuthorityPlaceholder: "e.g. RRA",
    taxPeriod: "Tax Period",
    taxExamplePlaceholder: "e.g. Q1 VAT, January PAYE...",
    taxNameAmountRequired: "Please provide tax title, type, and valid amount.",
    taxRecorded: "Tax Added",
    taxRecordedDesc: "Tax obligation saved. Pay before the due date to avoid penalties.",
    taxRemovedDesc: "Tax obligation removed.",
    saveTaxFailed: "Failed to save tax.",
    deleteTaxFailed: "Failed to delete tax.",
    markTaxPaidFailed: "Failed to mark tax as paid.",
    noTaxesYet: "No tax obligations yet",
    taxesEmptyHint: "List taxes your business owes so you can pay on time and avoid penalties.",
    taxPaid: "Tax Paid",
    taxPaidDesc: "Tax marked as paid and recorded as an expenditure.",
    taxPaidHint: "This will create an expenditure and mark the tax as paid.",
    outstandingTaxes: "Outstanding Taxes",
    dueWithin30Days: "Due Within 30 Days",
    taxObligations: "obligations",
    bankDeposits: "Bank Deposits",
    recordDeposit: "Record Deposit",
    editDeposit: "Edit Deposit",
    depositTitle: "Deposit Title",
    depositDate: "Deposit Date",
    depositExamplePlaceholder: "e.g. Monthly operating budget, Q1 capital...",
    depositNameAmountRequired: "Please provide a title and deposit amount.",
    depositCustomPeriodRequired: "Please set both start and end dates for a custom budget period.",
    depositRecorded: "Deposit Recorded",
    depositRecordedDesc: "Bank deposit saved. It is now part of your available budget.",
    depositUpdated: "Deposit Updated",
    depositUpdatedDesc: "Bank deposit updated successfully.",
    depositRemovedDesc: "Bank deposit removed.",
    saveDepositFailed: "Failed to save bank deposit.",
    deleteDepositFailed: "Failed to delete bank deposit.",
    noDepositsYet: "No bank deposits yet",
    depositsEmptyHint: "Record money deposited to your bank so you can track available budget against spending.",
    budgetPeriod: "Budget Period",
    budgetPeriodMonthly: "Monthly",
    budgetPeriodQuarterly: "Quarterly",
    budgetPeriodYearly: "Yearly",
    budgetPeriodCustom: "Custom",
    budgetPeriodHint: "How long this deposit should cover your spending plan.",
    budgetCovers: "Covers",
    viewBudgetFor: "View budget for",
    totalDeposited: "Total Deposited",
    usedBalance: "Used Balance",
    availableBalance: "Available Balance",
    availableBalanceHint: "Deposited minus expenditure and payroll in this period",
    activeDeposits: "active deposits",
    periodStart: "Period Start",
    periodEnd: "Period End",
    depositReferencePlaceholder: "Bank slip or transfer reference",
    bankAccount: "Bank Account",
    transactionTypeDeposit: "Bank Deposit",
    loans: "Loans",
    addLoan: "Add Loan",
    editLoan: "Edit Loan",
    loanTitle: "Loan Name",
    loanTitlePlaceholder: "e.g. Business expansion loan",
    lender: "Lender",
    lenderPlaceholder: "e.g. Bank of Kigali",
    loanType: "Loan Type",
    loanTypeBusiness: "Business Loan",
    loanTypeWorkingCapital: "Working Capital",
    loanTypeEquipment: "Equipment",
    loanTypeVehicle: "Vehicle",
    loanTypeLineOfCredit: "Line of Credit",
    loanTypeOther: "Other",
    principalAmount: "Principal",
    installmentAmount: "Installment",
    interestRate: "Interest Rate",
    termMonths: "Term (months)",
    paymentFrequency: "Payment Frequency",
    maturityDate: "Maturity Date",
    nextDueDate: "Next Due Date",
    remainingBalance: "Remaining",
    loanStatus: "Status",
    loanStatusActive: "Active",
    loanStatusOverdue: "Overdue",
    loanStatusPaidOff: "Paid Off",
    loanAccountNumber: "Loan Account #",
    collateral: "Collateral",
    collateralPlaceholder: "Asset pledged as security",
    contactPerson: "Contact Person",
    contactPhone: "Contact Phone",
    recordLoanPayment: "Record Payment",
    paymentHistory: "Payment History",
    paymentAmount: "Payment Amount",
    paymentDate: "Payment Date",
    principalPortion: "Principal",
    interestPortion: "Interest",
    loanRequiredFields: "Please provide loan name, lender, principal, and installment amount.",
    loanRecorded: "Loan Added",
    loanRecordedDesc: "Loan saved. Track payments and remaining balance here.",
    loanUpdated: "Loan Updated",
    loanUpdatedDesc: "Loan details updated successfully.",
    loanRemovedDesc: "Loan removed.",
    saveLoanFailed: "Failed to save loan.",
    deleteLoanFailed: "Failed to delete loan.",
    recordLoanPaymentFailed: "Failed to record loan payment.",
    loanPaymentRecorded: "Payment Recorded",
    loanPaymentRecordedDesc: "Payment saved and added to your expenditures.",
    loanPaymentAmountRequired: "Please enter a valid payment amount.",
    loanPaymentExpenseHint: "This payment will be recorded as an expenditure under the loan category.",
    loanDeleteHasPayments: "Cannot delete a loan that already has payments. Mark it paid off instead.",
    noLoansYet: "No loans yet",
    loansEmptyHint: "Add business loans to track installments, remaining balance, and payment history.",
    totalOutstanding: "Total Outstanding",
    dueThisMonth: "Due This Month",
    loanPaymentsDue: "payments due",
    overdueLoans: "overdue loans",
    activeLoans: "active loans",
    totalPaidOnLoans: "Total Paid",
    noPaymentsYet: "No payments recorded yet",
    customers: "Customers",
    addCustomer: "Add Customer",
    editCustomer: "Edit Customer",
    customerName: "Customer Name",
    customer: "Customer",
    selectCustomer: "Select customer",
    customerCreated: "Customer Added",
    customerCreatedDesc: "Customer profile saved.",
    customerUpdated: "Customer Updated",
    customerUpdatedDesc: "Customer profile updated.",
    customerRemovedDesc: "Customer removed.",
    saveCustomerFailed: "Failed to save customer.",
    deleteCustomerFailed: "Failed to delete customer.",
    customerNameRequired: "Customer name is required.",
    noCustomersYet: "No customers yet",
    customersEmptyHint: "Add customers who pay your business to track balances and invoices.",
    viewStatement: "View Statement",
    downloadStatement: "Download Statement PDF",
    loadCustomerActivityFailed: "Failed to load customer activity.",
    vendors: "Vendors",
    addVendor: "Add Vendor",
    editVendor: "Edit Vendor",
    vendorName: "Vendor Name",
    selectVendor: "Select vendor",
    vendorCreated: "Vendor Added",
    vendorCreatedDesc: "Vendor profile saved.",
    vendorUpdated: "Vendor Updated",
    vendorUpdatedDesc: "Vendor profile updated.",
    vendorRemovedDesc: "Vendor removed.",
    saveVendorFailed: "Failed to save vendor.",
    deleteVendorFailed: "Failed to delete vendor.",
    vendorNameRequired: "Vendor name is required.",
    noVendorsYet: "No vendors yet",
    vendorsEmptyHint: "Add suppliers you pay to track bills and payment history.",
    loadVendorActivityFailed: "Failed to load vendor activity.",
    accounts: "Accounts",
    addAccount: "Add Account",
    editAccount: "Edit Account",
    accountName: "Account Name",
    accountType: "Account Type",
    accountCreated: "Account Added",
    accountCreatedDesc: "Cash or bank account saved.",
    accountUpdated: "Account Updated",
    accountUpdatedDesc: "Account details updated.",
    accountRemovedDesc: "Account archived.",
    saveAccountFailed: "Failed to save account.",
    deleteAccountFailed: "Failed to delete account.",
    accountNameRequired: "Account name is required.",
    noAccountsYet: "No accounts yet",
    accountsEmptyHint: "Add cash, bank, MoMo, or Airtel accounts to track balances.",
    openingBalance: "Opening Balance",
    transferFunds: "Transfer Funds",
    fromAccount: "From Account",
    toAccount: "To Account",
    selectAccount: "Select account",
    paymentAccount: "Payment account",
    noAccountSelected: "No account selected",
    financialStatements: "Financial Statements",
    financialStatementsHint: "Profit & loss, balance sheet, and cash flow for your business.",
    profitLoss: "Profit & Loss",
    balanceSheet: "Balance Sheet",
    cashFlow: "Cash Flow",
    dashHelpReceivables:
      "Money customers owe you. Tracks unpaid invoices (or income you recorded). Current = not yet due; Overdue = past the due date. Tap + New to add income or create an invoice.",
    dashHelpPayables:
      "Money you owe vendors and suppliers. Total shows all unpaid bills. Current = not yet overdue; Overdue = past the due date. Tap + New to record a bill.",
    dashHelpCashFlow:
      "Money moving in and out for the selected fiscal year. Green = income received; red = expenses paid. Opening and closing cash show your position at the start and end of the year.",
    dashHelpIncomeExpense:
      "Monthly money in vs money out for the selected year. Cash = when paid or received; Accrual = includes unpaid bills and invoices by due date. Details below show each source.",
    dashHelpTopExpenses:
      "Your largest expense categories for the selected year. Use this to see where most of your spending goes.",
    dashHelpMonthlyKpis:
      "Quick snapshot for the current month — all money in (sales, income, invoices, deposits, loans) vs all money out (expenditure, payroll, bills, taxes).",
    dashHelpUpcomingBills:
      "Bills due in the next 30 days. Tap View all to manage bills, mark paid, or record new ones.",
    dashHelpRecentTransactions:
      "Latest income and expense activity across your accounts. Tap View all for the full transaction list.",
    helpIncome:
      "Record money your business receives — sales, services, or other income. Each entry can include payment method, account, and a receipt.",
    helpCustomers:
      "Keep a list of customers you sell to or invoice. Use customers when creating invoices or tracking who owes you money.",
    helpInvoices:
      "Create and send invoices to customers. Track unpaid, current, and overdue amounts until payment is received.",
    helpVendors:
      "Suppliers and companies you buy from. Link vendors to bills so you know who you owe and what you purchased.",
    helpBankDeposits:
      "Record cash or mobile money moved into a bank account. Helps reconcile physical cash with your bank balance.",
    helpAccounts:
      "Cash, bank, and mobile money accounts where money is held. Income and expenses can be assigned to an account.",
    helpFinancialStatements:
      "Profit & loss, balance sheet, and cash flow reports for a date range. Export PDFs for your records or accountant.",
    helpBankReconciliation:
      "Match account transactions against your bank records. Mark items as reconciled when they appear on your statement.",
    helpCategoryBudgets:
      "Set spending limits by category for a month or year. Compare actual expenses to your budget to stay on track.",
    helpLoans:
      "Track money borrowed or lent — principal, repayments, and remaining balance.",
    helpBills:
      "Bills you owe vendors. Record due dates, mark as paid, and see current vs overdue payables.",
    helpTaxes:
      "Tax obligations and payments — amounts due, filing dates, and what you have already paid.",
    helpExpenditure:
      "Day-to-day business spending. Categorize expenses and attach receipts for accurate records.",
    helpPayroll:
      "Employee and contractor payments. Record pay runs, amounts, and payment dates.",
    helpTransactions:
      "All money movements across accounts — income, expenses, transfers, and payroll in one list.",
    helpProducts:
      "Your product catalog — names, prices, stock levels, and categories. Stock updates when you record sales.",
    helpSales:
      "Record product or service sales. Revenue and profit are tracked using your product costs and prices.",
    helpDocuments:
      "Store company files — contracts, licenses, receipts, and other documents in one place.",
    helpReports:
      "Exportable reports for sales, finance, and inventory. Filter by day, week, month, or year and download PDF or Excel.",
    helpAutomations:
      "Schedule emails and reminders to customers — follow-ups, promotions, and recurring messages.",
    helpCalendar:
      "See income, expenses, bills, taxes, payroll, and custom events on a calendar. Plan around due dates and cash needs.",
    helpTeamOverview:
      "Monthly snapshot of team tasks — completion rate, active members, and who is working on what.",
    helpTeamTasks:
      "Assign tasks to team members, set due dates, and track status from to-do through done.",
    helpTeamFinanceTasks:
      "Finance department tasks — monthly close, reconciliations, tax filings, and other finance work items.",
    helpTeamMembers:
      "People on your team — names, roles, departments, and contact details for task assignment.",
    loadStatementsFailed: "Failed to load financial statements",
    asOfDate: "As of date",
    generateReport: "Generate report",
    totalExpenses: "Total expenses",
    netProfit: "Net profit",
    assets: "Assets",
    cashAndBank: "Cash & bank",
    accountsReceivable: "Accounts receivable",
    inventoryValue: "Inventory value",
    totalAssets: "Total assets",
    liabilitiesAndEquity: "Liabilities & equity",
    accountsPayable: "Accounts payable",
    loanLiabilities: "Loan liabilities",
    totalLiabilities: "Total liabilities",
    equity: "Equity",
    operatingCashIn: "Operating cash in",
    operatingCashOut: "Operating cash out",
    netOperatingCash: "Net operating cash",
    financingDeposits: "Financing deposits",
    netChangeInCash: "Net change in cash",
    bankReconciliation: "Bank Reconciliation",
    bankReconciliationHint: "Match account transactions against your bank records.",
    closingBalance: "Closing balance",
    reconciledCount: "Reconciled",
    unreconciledCount: "Unreconciled",
    reconciled: "Reconciled",
    noReconciliationEntries: "No transactions in this period for the selected account.",
    transactionType: "Type",
    refresh: "Refresh",
    transfer: "Transfer",
    transferComplete: "Transfer Complete",
    transferCompleteDesc: "Funds moved between accounts.",
    transferFailed: "Transfer failed.",
    transferInvalid: "Select accounts and enter a valid amount.",
    categoryBudgets: "Category Budgets",
    addCategoryBudget: "Add Category Budget",
    categoryBudgetRequired: "Category and budget amount are required.",
    budgetCreated: "Budget Added",
    budgetCreatedDesc: "Category budget saved.",
    saveBudgetFailed: "Failed to save budget.",
    deleteBudgetFailed: "Failed to delete budget.",
    budgetRemovedDesc: "Budget rule removed.",
    loadBudgetSummaryFailed: "Failed to load budget summary.",
    totalBudget: "Total Budget",
    totalActual: "Total Spent",
    viewPeriod: "View period",
    budget: "Budget",
    actual: "Actual",
    budgetRules: "Budget Rules",
    noBudgetsYet: "No category budgets yet",
    budgetsEmptyHint: "Set spending limits by expense category.",
    noSalesYet: "No sales recorded yet",
    salesEmptyHint: "Record product sales to track revenue and stock.",
    saleRequiredFields: "Select a product and quantity.",
    saveSaleFailed: "Failed to record sale.",
    balanceDue: "Balance Due",
    totalPaid: "Total Paid",
    email: "Email",
    phone: "Phone",
    invoices: "Invoices",
    createInvoice: "Create Invoice",
    editInvoice: "Edit Invoice",
    invoiceTitle: "Invoice Title",
    invoiceNumber: "Invoice #",
    invoiceStatus: "Status",
    invoiceStatus_draft: "Draft",
    invoiceStatus_sent: "Sent",
    invoiceStatus_paid: "Paid",
    invoiceStatus_overdue: "Overdue",
    unpaidInvoices: "Unpaid Invoices",
    noInvoicesYet: "No invoices yet",
    invoicesEmptyHint: "Create invoices to bill customers and track payments.",
    invoiceRequiredFields: "Please provide a title and at least one line item.",
    invoiceCreated: "Invoice Created",
    invoiceCreatedDesc: "Invoice saved as draft.",
    invoiceUpdated: "Invoice Updated",
    invoiceUpdatedDesc: "Invoice updated successfully.",
    invoiceRemovedDesc: "Invoice removed.",
    saveInvoiceFailed: "Failed to save invoice.",
    deleteInvoiceFailed: "Failed to delete invoice.",
    markInvoiceSentFailed: "Failed to mark invoice as sent.",
    markInvoicePaidFailed: "Failed to mark invoice as paid.",
    invoiceSent: "Invoice Sent",
    invoiceSentDesc: "Invoice marked as sent.",
    invoicePaid: "Invoice Paid",
    invoicePaidDesc: "Payment recorded and added to income.",
    recurringInvoiceCreated: "Recurring Invoice",
    recurringInvoiceCreatedDesc: "Next recurring invoice draft created.",
    lineItems: "Line Items",
    addLine: "Add line",
    unitPrice: "Unit Price",
    description: "Description",
    issueDate: "Issue Date",
    paymentTerms: "Payment Terms",
    paymentTermsPlaceholder: "e.g. Due within 14 days",
    recurringInvoice: "Recurring invoice",
    markAsSent: "Mark as Sent",
    downloadPdf: "Download PDF",
    referenceNumber: "Reference Number",
    referenceNumberPlaceholder: "Filing or payment reference",
    dueDate: "Due Date",
    overdue: "Overdue",
    transactions: "Transactions",
    noTransactionsYet: "No transactions yet",
    transactionTypeIncome: "Income",
    transactionTypeExpense: "Expense",
    transactionTypePayroll: "Payroll",
    recordIncome: "Record Income",
    editIncome: "Edit Income",
    incomeTitle: "Income Title",
    incomeExamplePlaceholder: "e.g. Client payment, Sales deposit...",
    incomeNameAmountRequired: "Please provide income title and valid amount.",
    incomeRecorded: "Income Recorded",
    incomeRecordedDesc: "Income saved successfully.",
    saveIncomeFailed: "Failed to save income.",
    incomeRemovedDesc: "Income removed.",
    deleteIncomeFailed: "Failed to delete income.",
    noIncomeYet: "No income recorded yet",
    incomeEmptyHint: "Record money coming into your business to grow your balance.",
    uploadReceipt: "Upload receipt",
    changeReceipt: "Change file",
    viewReceipt: "View receipt",
    receipt: "Receipt",
    receiptUploadHint: "Image or PDF, max 5 MB",
    other: "Other",
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
    close: "Close",
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
    bankAccountName: "Bank / account name",
    bankAccountNumber: "Account number",
    bankAccountNamePlaceholder: "e.g. Bank of Kigali",
    bankAccountNumberPlaceholder: "e.g. 1234567890",
    
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
    productManagement: "Services & Stock",
    salesTracking: "Sales & Expenses",
    reportsAnalytics: "Workers & Reports",
    offlineSupport: "Billing & Offline",
    addEditManageInventory: "Manage your services, products, and stock levels from one dashboard. Add items, track inventory, and stay on top of what you sell.",
    trackStockLevels: "Track stock levels",
    recordSalesTransactions: "Record sales, log expenses, and see revenue and profit on your dashboard. Know exactly how your business is performing each day.",
    trackRevenueProfits: "Track revenue and profits",
    viewDetailedReports: "Manage your workers, view sales and expense reports, and export insights to understand trends and grow your business.",
    generateComprehensiveAnalytics: "Generate comprehensive analytics",
    workOfflineAutoSync: "Subscribe with MTN MoMo or Airtel Money. Keep working offline and your data syncs automatically when you are back online.",
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
    trippoTransformedInventory: "Trippo helps me track every service and sale at my salon. I manage workers, see daily revenue on the dashboard, and finally know where my money goes.",
    mostUsefulInventoryTool: "We moved from notebooks to Trippo for sales and expenses. The reports show what sells best each week — it saves us hours every month.",
    bestInventoryManagementFlexibility: "Paying for Plus with MoMo was easy. Even when internet drops, I record sales offline and everything syncs when we are back online.",
    storeManagerRetailCo: "Store Manager, Retail Co.",
    businessOwnerChenTrading: "Business Owner, Chen Trading",
    operationsDirectorWilliamsSupply: "Operations Director, Williams Supply",
    ourPartners: "Our Partners",
    homeTestimonial1Attribution: "Claudine Mukamana · Kigali",
    homeTestimonial2Attribution: "Jean Bosco Niyonzima · Nyamirambo",
    homeTestimonial3Attribution: "Espérance Uwase · Remera",
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
    todaysExpenses: "Today's Expenses",
    todaysExpenseCount: "Today's Expense Count",
    weekExpenses: "This Week's Expenses",
    weekExpenseCount: "This Week's Expense Count",
    monthExpenses: "This Month's Expenses",
    monthExpenseCount: "This Month's Expense Count",
    yearExpenses: "This Year's Expenses",
    yearExpenseCount: "This Year's Expense Count",
    expensesRecorded: "expenses recorded",
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
    filterPriceUnder5k: "Under 5,000 Rwf",
    filterPrice5kTo20k: "5,000 – 20,000 Rwf",
    filterPriceOver20k: "Over 20,000 Rwf",
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
    salesTrend: "Income & Expenses",
    salesTrendLast7Days: "Income & Expenses (Last 7 Days)",
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
    serviceRecordedDesc: "{product} by {worker} for Rwf {amount}",
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
    activityEmptyHint: "Recent expenses will appear here",
    viewMoreInSales: "View more in Sales",
    viewMoreInExpenses: "View more in Expenses",
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
    priceWholePackageCalc: "Price per item: {base} Rwf × {qty} = {total} Rwf (whole package)",
    priceFromPackageCalc: "Price per item: {perItem} Rwf (from {base} Rwf ÷ {qty})",
    maximumQuantity: "Maximum Quantity",
    stockLabel: "Stock",
    boxOf: "Box of {qty}",
    noProductsSearchHint: "No items found. Try a different search.",
  },
  rw: {
    // Navigation
    dashboard: "Incamake",
    products: "Ibicuruzwa",
    services: "Serivisi",
    inventories: "Ibicuruzwa",
    workers: "Abakozi",
    worker: "Umukozi",
    expenses: "Ibyasohotse",
    income: "Amafaranga yinjiye",
    finance: "Imari",
    incomeStatements: "Amafaranga yinjiye",
    incomeSources: "Amafaranga yinjiye",
    incomeSource: "Inkomoko",
    incomeSourcePlaceholder: "nka: Ubucuruzi, Serivisi...",
    incomeBySource: "Amafaranga ukurikije inkomoko",
    expenditure: "Ibyasohotse",
    totalIncome: "Amafaranga yinjiye yose",
    totalExpenditure: "Ibyasohotse byose",
    totalPayroll: "Imishahara yose",
    currentBalance: "Asigaye",
    payroll: "Imishahara",
    recordPayroll: "Andika umushahara",
    editPayroll: "Hindura umushahara",
    employeeName: "Umukozi",
    payPeriod: "Ukwezi kw'ishyura",
    payrollStatus: "Imiterere",
    paid: "Yishyuwe",
    pending: "Irategereje",
    noPayrollYet: "Nta mishahara yanditswe",
    payrollEmptyHint: "Andika imishahara kugira ngo ubone amafaranga yasohotse.",
    payrollRecorded: "Umushahara wanditswe",
    payrollRecordedDesc: "Umushahara wabitswe neza.",
    payrollRemovedDesc: "Umushahara wakuweho.",
    savePayrollFailed: "Kubika umushahara byanze.",
    deletePayrollFailed: "Gusiba umushahara byanze.",
    payrollNameAmountRequired: "Andika izina ry'umukozi, amafaranga, n'ukwezi.",
    bills: "Inyemezabuguzi",
    recordBill: "Ongeraho inyemezabuguzi",
    editBill: "Hindura inyemezabuguzi",
    billTitle: "Izina ry'inyemezabuguzi",
    billExamplePlaceholder: "nka: Ubukode, Amashanyarazi...",
    billNameAmountRequired: "Andika izina n'amafaranga nyayo.",
    billRecorded: "Inyemezabuguzi yongeweho",
    billRecordedDesc: "Yabitswe. Izagaragara nk'itegereje kugeza wishyura.",
    billRemovedDesc: "Inyemezabuguzi yakuweho.",
    saveBillFailed: "Kubika inyemezabuguzi byanze.",
    deleteBillFailed: "Gusiba inyemezabuguzi byanze.",
    markBillPaidFailed: "Kwemeza ko wishyuye byanze.",
    noBillsYet: "Nta nyemezabuguzi birabaho",
    billsEmptyHint: "Andika ibyo ugomba kwishyura. Niwishyura, biba ibyasohotse.",
    billPaid: "Yishyuwe",
    billPaidDesc: "Yemejwe ko yishyuwe kandi yanditswe mu byasohotse.",
    billPaidHint: "Ibi bizakora ikiguzi kandi byemeze ko wishyuye.",
    billStatus: "Imiterere",
    pendingBills: "Zitegereje",
    paidBills: "Zishyuwe",
    allBills: "Zose",
    markAsPaid: "Emeza ko yishyuwe",
    vendor: "Uwutanga serivisi",
    vendorPlaceholder: "Uwishyura",
    taxes: "Imisoro",
    recordTax: "Ongeraho Umusoro",
    editTax: "Hindura Umusoro",
    taxTitle: "Izina ry'Umusoro",
    taxType: "Ubwoko bw'Umusoro",
    taxAuthority: "Ikigo cy'Imisoro",
    taxAuthorityPlaceholder: "urugero RRA",
    taxPeriod: "Igihe cy'Umusoro",
    taxExamplePlaceholder: "urugero VAT Q1, PAYE Mutarama...",
    taxNameAmountRequired: "Shyiramo izina, ubwoko n'amafaranga y'umusoro.",
    taxRecorded: "Umusoro Wanditswe",
    taxRecordedDesc: "Umusoro wabitswe. Wishyure mbere y'itariki ntarengwa.",
    taxRemovedDesc: "Umusoro wavanywe.",
    saveTaxFailed: "Kubika umusoro byanze.",
    deleteTaxFailed: "Gusiba umusoro byanze.",
    markTaxPaidFailed: "Gushyira umusoro nk'uwishyuwe byanze.",
    noTaxesYet: "Nta misoro yanditswe",
    taxesEmptyHint: "Andika imisoro ubucuruzi bwawe bukwiye kugira ngo wishyure ku gihe.",
    taxPaid: "Umusoro Wishyuwe",
    taxPaidDesc: "Umusoro wishyuwe kandi wanditswe mu mafaranga yasohotse.",
    taxPaidHint: "Ibi bizongeramo amafaranga yasohotse kandi umusoro uzashyirwa nk'uwishyuwe.",
    outstandingTaxes: "Imisoro Isigaye",
    dueWithin30Days: "Igihe ntarengwa mu minsi 30",
    taxObligations: "ibisabwa",
    bankDeposits: "Amafaranga yashyizwe mu banki",
    recordDeposit: "Andika amafaranga yashyizwe",
    editDeposit: "Hindura amafaranga yashyizwe",
    depositTitle: "Izina ry'amafaranga",
    depositDate: "Itariki yashyizwaho",
    depositExamplePlaceholder: "urugero: Ingengo y'imari y'ukwezi...",
    depositNameAmountRequired: "Andika izina n'amafaranga yashyizwe.",
    depositCustomPeriodRequired: "Shyiraho itariki yo gutangira n'iyo kurangira.",
    depositRecorded: "Amafaranga yanditswe",
    depositRecordedDesc: "Amafaranga yashyizwe mu banki yabitswe. Ari ingengo y'imari iboneka.",
    depositUpdated: "Byavuguruwe",
    depositUpdatedDesc: "Amafaranga yashyizwe mu banki byavuguruwe neza.",
    depositRemovedDesc: "Amafaranga yashyizwe mu banki yakuweho.",
    saveDepositFailed: "Kubika byanze.",
    deleteDepositFailed: "Gusiba byanze.",
    noDepositsYet: "Nta mafaranga yashyizwe mu banki",
    depositsEmptyHint: "Andika amafaranga yashyizwe mu banki kugira ngo ukurikire ingengo y'imari.",
    budgetPeriod: "Igihe cy'ingengo y'imari",
    budgetPeriodMonthly: "Ukwezi",
    budgetPeriodQuarterly: "Igihembwe",
    budgetPeriodYearly: "Umwaka",
    budgetPeriodCustom: "Icyitegererezo",
    budgetPeriodHint: "Igihe iyi depositi igomba gufasha mu gucunga amafaranga.",
    budgetCovers: "Irakora kugeza",
    viewBudgetFor: "Reba ingengo y'imari ya",
    totalDeposited: "Byose Byashyizwe",
    usedBalance: "Byakoreshejwe",
    availableBalance: "Asigaye",
    availableBalanceHint: "Byashyizwe bakuweho ibyasohotse n'imishahara muri iki gihe",
    activeDeposits: "depositi zikora",
    periodStart: "Itangira",
    periodEnd: "Irangira",
    depositReferencePlaceholder: "Nomero y'inyemezabwishyu cyangwa kohereza",
    bankAccount: "Konti ya banki",
    transactionTypeDeposit: "Amafaranga mu banki",
    loans: "Inguzanyo",
    addLoan: "Ongeraho inguzanyo",
    editLoan: "Hindura inguzanyo",
    loanTitle: "Izina ry'inguzanyo",
    loanTitlePlaceholder: "urugero: Inguzanyo yo kwagura ubucuruzi",
    lender: "Utanga inguzanyo",
    lenderPlaceholder: "urugero: Bank of Kigali",
    loanType: "Ubwoko bw'inguzanyo",
    loanTypeBusiness: "Inguzanyo y'ubucuruzi",
    loanTypeWorkingCapital: "Amafaranga y'imikorere",
    loanTypeEquipment: "Ibikoresho",
    loanTypeVehicle: "Imodoka",
    loanTypeLineOfCredit: "Umurongo w'inguzanyo",
    loanTypeOther: "Ibindi",
    principalAmount: "Inguzanyo y'ibanze",
    installmentAmount: "Ubwishyu buri gihe",
    interestRate: "Igipimo cy'inyungu",
    termMonths: "Igihe (amezi)",
    paymentFrequency: "Inshuro zo kwishyura",
    maturityDate: "Itariki irangira",
    nextDueDate: "Itariki ikurikira",
    remainingBalance: "Asigaye",
    loanStatus: "Imiterere",
    loanStatusActive: "Irakora",
    loanStatusOverdue: "Yarenze igihe",
    loanStatusPaidOff: "Yarishyuwe",
    loanAccountNumber: "Nomero ya konti y'inguzanyo",
    collateral: "Ingwate",
    collateralPlaceholder: "Umutungo washyizweho ingwate",
    contactPerson: "Umuntu wo guhamagara",
    contactPhone: "Telefone",
    recordLoanPayment: "Andika ubwishyu",
    paymentHistory: "Amateka y'ubwishyu",
    paymentAmount: "Amafaranga yishyuwe",
    paymentDate: "Itariki yo kwishyura",
    principalPortion: "Inguzanyo y'ibanze",
    interestPortion: "Inyungu",
    loanRequiredFields: "Andika izina, utanga inguzanyo, inguzanyo y'ibanze n'ubwishyu.",
    loanRecorded: "Inguzanyo yanditswe",
    loanRecordedDesc: "Inguzanyo yabitswe. Kurikirana ubwishyu n'asigaye hano.",
    loanUpdated: "Byavuguruwe",
    loanUpdatedDesc: "Inguzanyo yavuguruwe neza.",
    loanRemovedDesc: "Inguzanyo yakuweho.",
    saveLoanFailed: "Kubika byanze.",
    deleteLoanFailed: "Gusiba byanze.",
    recordLoanPaymentFailed: "Kwandika ubwishyu byanze.",
    loanPaymentRecorded: "Ubwishyu bwanditswe",
    loanPaymentRecordedDesc: "Ubwishyu bwabitswe kandi bwongewe mu byasohotse.",
    loanPaymentAmountRequired: "Andika amafaranga y'ubwishyu.",
    loanPaymentExpenseHint: "Ubu bwishyu buzandikwa nk'ikiguzi mu byiciro by'inguzanyo.",
    loanDeleteHasPayments: "Ntushobora gusiba inguzanyo ifite ubwishyu. Byarangiye byishyuwe.",
    noLoansYet: "Nta nguzanyo",
    loansEmptyHint: "Ongeraho inguzanyo z'ubucuruzi kugira ngo ukurikire ubwishyu n'asigaye.",
    totalOutstanding: "Byose Bisigaye",
    dueThisMonth: "Bikenewe Uku Kwezi",
    loanPaymentsDue: "ubwishyu bukenewe",
    overdueLoans: "inguzanyo zarenze igihe",
    activeLoans: "inguzanyo zikora",
    totalPaidOnLoans: "Byose Byishyuwe",
    noPaymentsYet: "Nta bwishyu bwanditswe",
    customers: "Abakiriya",
    addCustomer: "Ongeraho umukiriya",
    editCustomer: "Hindura umukiriya",
    customerName: "Izina ry'umukiriya",
    customer: "Umukiriya",
    selectCustomer: "Hitamo umukiriya",
    customerCreated: "Umukiriya yongewe",
    customerCreatedDesc: "Umukiriya wabitswe.",
    customerUpdated: "Byavuguruwe",
    customerUpdatedDesc: "Umukiriya yavuguruwe.",
    customerRemovedDesc: "Umukiriya yakuweho.",
    saveCustomerFailed: "Kubika byanze.",
    deleteCustomerFailed: "Gusiba byanze.",
    customerNameRequired: "Andika izina ry'umukiriya.",
    noCustomersYet: "Nta bakiriya",
    customersEmptyHint: "Ongeraho abakiriya kugira ngo ukurikire amafaranga n'invoices.",
    viewStatement: "Reba statement",
    downloadStatement: "Kuramo statement PDF",
    loadCustomerActivityFailed: "Kubona amakuru byanze.",
    vendors: "Abatanga",
    addVendor: "Ongeraho uwutanga",
    editVendor: "Hindura uwutanga",
    vendorName: "Izina ry'uwutanga",
    selectVendor: "Hitamo uwutanga",
    vendorCreated: "Uwutanga yongewe",
    vendorCreatedDesc: "Uwutanga wabitswe.",
    vendorUpdated: "Byavuguruwe",
    vendorUpdatedDesc: "Uwutanga yavuguruwe.",
    vendorRemovedDesc: "Uwutanga yakuweho.",
    saveVendorFailed: "Kubika byanze.",
    deleteVendorFailed: "Gusiba byanze.",
    vendorNameRequired: "Andika izina ry'uwutanga.",
    noVendorsYet: "Nta batanga",
    vendorsEmptyHint: "Ongeraho abatanga kugira ngo ukurikire amafaranga n'amateka yo kwishyura.",
    loadVendorActivityFailed: "Kubona amakuru byanze.",
    accounts: "Konti",
    addAccount: "Ongeraho konti",
    editAccount: "Hindura konti",
    accountName: "Izina rya konti",
    accountType: "Ubwoko bwa konti",
    accountCreated: "Konti yongewe",
    accountCreatedDesc: "Konti yabitswe.",
    accountUpdated: "Byavuguruwe",
    accountUpdatedDesc: "Konti yavuguruwe.",
    accountRemovedDesc: "Konti yakuweho.",
    saveAccountFailed: "Kubika byanze.",
    deleteAccountFailed: "Gusiba byanze.",
    accountNameRequired: "Andika izina rya konti.",
    noAccountsYet: "Nta konti",
    accountsEmptyHint: "Ongeraho konti za cash, banki, MoMo cyangwa Airtel.",
    openingBalance: "Amafaranga yambere",
    transferFunds: "Kohereza amafaranga",
    fromAccount: "Kuva kuri konti",
    toAccount: "Kujya kuri konti",
    selectAccount: "Hitamo konti",
    paymentAccount: "Konti yishyurwa",
    noAccountSelected: "Nta konti yatoranyijwe",
    financialStatements: "Imyanzuro y'imari",
    financialStatementsHint: "Inyungu n'igihombo, impapuro z'imari, n'imigendekere y'amafaranga.",
    profitLoss: "Inyungu n'igihombo",
    balanceSheet: "Impapuro z'imari",
    cashFlow: "Imigendekere y'amafaranga",
    dashHelpReceivables:
      "Amafaranga abakiriya bagufitiye. Bikurikirana inyemezabuguzi zitishyuwe (cyangwa amafaranga winjije). By'ubu = ntibirageze; Byarenze igihe = byarenze itariki yo kwishyura. Kanda + New wongere amafaranga winjije cyangwa inyemezabuguzi.",
    dashHelpPayables:
      "Amafaranga utishyura abacuruzi. Igiteranyo cyerekana fagitire zose zitishyuwe. By'ubu = ntizirenze igihe; Byarenze igihe = zirenze itariki yo kwishyura. Kanda + New wandike fagitire.",
    dashHelpCashFlow:
      "Imigendekere y'amafaranga mu mwaka w'imari wahisemo. Icyatsi = amafaranga winjije; Ibara ry'umutuku = amafaranga yasohotse. Amafaranga yo gutangira no kurangiza byerekana uko wifashe mu ntangiriro n'impera z'umwaka.",
    dashHelpIncomeExpense:
      "Amafaranga winjije n'ayasohotse buri kwezi. Cash = igihe amafaranga yinjiye cyangwa yasohotse; Accrual = igihe byanditswe. Igiteranyo ntikirimo imisoro.",
    dashHelpTopExpenses:
      "Ibyiciro by'ingenzi byo kwishyura mu mwaka wahisemo. Bikugufasha kumenya aho amafaranga menshi yagiye.",
    dashHelpMonthlyKpis:
      "Incamake y'ukwezi kuriki — inyungu zinjiye, ibyo wishyuye, inyungu, n'imisoro isigaye.",
    dashHelpUpcomingBills:
      "Amafaranga agomba kwishyurwa mu minsi 30 iri imbere. Kanda View all kugira ngo uyobore amafaranga.",
    dashHelpRecentTransactions:
      "Ibikorwa bya vuba by'inyungu n'ibyo wishyura. Kanda View all urebe urutonde rwose.",
    helpIncome:
      "Andika amafaranga ubucuruzi bwakira — ibicuruzwa, serivisi, cyangwa indi nyungu. Buri byanditswe birashobora kugira uburyo bwo kwishyura, konti, n'inyemezabwishyu.",
    helpCustomers:
      "Bika urutonde rw'abakiriya ugurira cyangwa utanga invoice. Koresha abakiriya mu gukora invoices no gukurikirana abagufitiye.",
    helpInvoices:
      "Kora no kohereza invoices ku bakiriya. Kurikirana amafaranga atarishyurwa, ari mu gihe, n'ayarenze igihe.",
    helpVendors:
      "Abatanga ibicuruzwa n'amakoperative ugura kuri bo. Huza abatanga n'amafaranga kugira ngo umenye uwo ufitiye.",
    helpBankDeposits:
      "Andika amafaranga cyangwa mobile money yinjiye mu konti ya banki. Bifasha guhuza cash n'uburinganire bwa banki.",
    helpAccounts:
      "Konti za cash, banki, na mobile money aho amafaranga abikwa. Inyungu n'ibyo wishyura birashobora guhabwa konti.",
    helpFinancialStatements:
      "Raporo z'inyungu n'igihombo, balance sheet, na cash flow ku gihe cyagenwe. Kuramo PDF ku bw'inyandiko cyangwa umucungamari.",
    helpBankReconciliation:
      "Huza ibikorwa bya konti n'inyandiko za banki. Shyira akamenyetso ko byahujwe iyo byagaragaye ku statement.",
    helpCategoryBudgets:
      "Shyiraho imipaka yo kwishyura ku byiciro ku kwezi cyangwa umwaka. Gereranya ibyo wishyuye n'ingengo y'imari.",
    helpLoans:
      "Kurikirana amafaranga yinjijwe cyangwa yatanzwe — ingingo, kwishyura, n'asigaye.",
    helpBills:
      "Amafaranga ufitiye abatanga. Andika itariki yo kwishyura, shyira akamenyetso ko byishyuwe, urebe ibiri mu gihe n'ibirenze.",
    helpTaxes:
      "Inshingano n'ubwishyu bw'imisoro — amafaranga akenewe, itariki zo gutanga, n'ibyo wamaze kwishyura.",
    helpExpenditure:
      "Ibikorwa bya buri munsi byo kwishyura. Shyira mu byiciro kandi ongeraho inyemezabwishyu.",
    helpPayroll:
      "Kwishyura abakozi n'abakora ku gahato. Andika amafaranga n'itariki zo kwishyura.",
    helpTransactions:
      "Imihindagurikire y'amafaranga muri konti zose — inyungu, ibyo wishyura, transfers, na payroll.",
    helpProducts:
      "Urutonde rw'ibicuruzwa — amazina, ibiciro, stock, n'ibyiciro. Stock ihinduka iyo wanditse ibicuruzwa.",
    helpSales:
      "Andika ibicuruzwa cyangwa serivisi byagurishijwe. Inyungu n'inyungu zikurikiranwa ukoresheje ibiciro by'ibicuruzwa.",
    helpDocuments:
      "Bika inyandiko z'ikigo — amasezerano, uruhushya, inyemezabwishyu, n'indi nyandiko.",
    helpReports:
      "Raporo zishobora gukurwamo za sales, imari, na stock. Hitamo umunsi, icyumweru, ukwezi cyangwa umwaka.",
    helpAutomations:
      "Tegura email n'ibutsa ku bakiriya — gukurikirana, promosiyo, n'ubutumwa buhoraho.",
    helpCalendar:
      "Reba inyungu, ibyo wishyura, amafaranga, imisoro, payroll, n'ibikorwa ku kalendari. Tegura ukurikije amatariki.",
    helpTeamOverview:
      "Incamake y'ibikorwa by'itsinda ku kwezi — igipimo cyo kurangiza, abanyamuryango, n'uko bigenda.",
    helpTeamTasks:
      "Shyira ibikorwa ku banyamuryango, shyiraho itariki, ukurikirane uko bigenda kuva todo kugeza done.",
    helpTeamFinanceTasks:
      "Ibikorwa by'ishami ry'imari — gufunga ukwezi, reconciliation, gutanga imisoro, n'ibindi.",
    helpTeamMembers:
      "Abantu bo mu itsinda — amazina, imirimo, amashami, n'amakuru yo guhamagara.",
    loadStatementsFailed: "Byanze gupakira imyanzuro y'imari",
    asOfDate: "Ku itariki",
    generateReport: "Kora raporo",
    totalExpenses: "Amafaranga yose yasohotse",
    netProfit: "Inyungu rusange",
    assets: "Umutungo",
    cashAndBank: "Amafaranga na banki",
    accountsReceivable: "Abakiriye",
    inventoryValue: "Agaciro k'ibicuruzwa",
    totalAssets: "Umutungo wose",
    liabilitiesAndEquity: "Inyongera n'ubwishingizi",
    accountsPayable: "Abishyurwa",
    loanLiabilities: "Inguzanyo zisigaye",
    totalLiabilities: "Inyongera yose",
    equity: "Ubwishingizi",
    operatingCashIn: "Amafaranga yinjiye mu bikorwa",
    operatingCashOut: "Amafaranga yasohotse mu bikorwa",
    netOperatingCash: "Amafaranga asigaye mu bikorwa",
    financingDeposits: "Amafaranga yashyizwe mu banki",
    netChangeInCash: "Impinduka y'amafaranga",
    bankReconciliation: "Guhuza na banki",
    bankReconciliationHint: "Huza ibikorwa bya konti n'inyandiko za banki.",
    closingBalance: "Amafaranga asigaye",
    reconciledCount: "Byahujwe",
    unreconciledCount: "Bitarahuza",
    reconciled: "Byahujwe",
    noReconciliationEntries: "Nta bikorwa muri iyi minsi kuri iyi konti.",
    transactionType: "Ubwoko",
    refresh: "Ongera ugerageze",
    transfer: "Kohereza",
    transferComplete: "Byoherejwe",
    transferCompleteDesc: "Amafaranga yoherejwe hagati ya konti.",
    transferFailed: "Kohereza byanze.",
    transferInvalid: "Hitamo konti n'amafaranga.",
    categoryBudgets: "Ingengo y'imari",
    addCategoryBudget: "Ongeraho ingengo",
    categoryBudgetRequired: "Andika category n'amafaranga.",
    budgetCreated: "Ingengo yongewe",
    budgetCreatedDesc: "Ingengo y'imari yabitswe.",
    saveBudgetFailed: "Kubika byanze.",
    deleteBudgetFailed: "Gusiba byanze.",
    budgetRemovedDesc: "Ingengo yakuweho.",
    loadBudgetSummaryFailed: "Kubona incamake byanze.",
    totalBudget: "Ingengo yose",
    totalActual: "Byakoreshejwe",
    viewPeriod: "Igihe",
    budget: "Ingengo",
    actual: "Byakoreshejwe",
    budgetRules: "Amategeko y'ingengo",
    noBudgetsYet: "Nta ngengo",
    budgetsEmptyHint: "Shyiraho imipaka y'amafaranga ku category.",
    noSalesYet: "Nta bucuruzi",
    salesEmptyHint: "Andika ubucuruzi kugira ngo ukurikire amafaranga n'stoki.",
    saleRequiredFields: "Hitamo icuruzwa n'umubare.",
    saveSaleFailed: "Kwandika ubucuruzi byanze.",
    balanceDue: "Asigaye",
    totalPaid: "Byishyuwe",
    email: "Imeli",
    phone: "Telefone",
    invoices: "Invoices",
    createInvoice: "Kora invoice",
    editInvoice: "Hindura invoice",
    invoiceTitle: "Izina rya invoice",
    invoiceNumber: "Invoice #",
    invoiceStatus: "Imiterere",
    invoiceStatus_draft: "Draft",
    invoiceStatus_sent: "Yoherejwe",
    invoiceStatus_paid: "Yishyuwe",
    invoiceStatus_overdue: "Yarenze igihe",
    unpaidInvoices: "Invoices zitishyuwe",
    noInvoicesYet: "Nta invoices",
    invoicesEmptyHint: "Kora invoices kugira ngo wishyure abakiriya.",
    invoiceRequiredFields: "Andika izina n'ibintu by'invoice.",
    invoiceCreated: "Invoice yakoze",
    invoiceCreatedDesc: "Invoice yabitswe.",
    invoiceUpdated: "Byavuguruwe",
    invoiceUpdatedDesc: "Invoice yavuguruwe.",
    invoiceRemovedDesc: "Invoice yakuweho.",
    saveInvoiceFailed: "Kubika byanze.",
    deleteInvoiceFailed: "Gusiba byanze.",
    markInvoiceSentFailed: "Kohereza byanze.",
    markInvoicePaidFailed: "Kwemeza kwishyura byanze.",
    invoiceSent: "Yoherejwe",
    invoiceSentDesc: "Invoice yemejwe ko yoherejwe.",
    invoicePaid: "Yishyuwe",
    invoicePaidDesc: "Kwishyura kwanditswe mu mafranga yinjiye.",
    recurringInvoiceCreated: "Invoice isubiramo",
    recurringInvoiceCreatedDesc: "Invoice ikurikira yakoze.",
    lineItems: "Ibintu",
    addLine: "Ongeraho umurongo",
    unitPrice: "Igiciro kimwe",
    description: "Ibisobanuro",
    issueDate: "Itariki yatanzwe",
    paymentTerms: "Amabwiriza yo kwishyura",
    paymentTermsPlaceholder: "urugero: mu minsi 14",
    recurringInvoice: "Invoice isubiramo",
    markAsSent: "Emeza ko yoherejwe",
    downloadPdf: "Kuramo PDF",
    referenceNumber: "Nomero y'Icyitonderwa",
    referenceNumberPlaceholder: "Nomero yo gutanga cyangwa kwishyura",
    dueDate: "Itariki yo kwishyura",
    overdue: "Yarenze igihe",
    transactions: "Ibikorwa",
    noTransactionsYet: "Nta bikorwa by'imari birabaho",
    transactionTypeIncome: "Amafaranga yinjiye",
    transactionTypeExpense: "Ikiguzi",
    transactionTypePayroll: "Umushahara",
    recordIncome: "Andika amafaranga yinjiye",
    editIncome: "Hindura amafaranga yinjiye",
    incomeTitle: "Izina ry'amafaranga",
    incomeExamplePlaceholder: "nka: Kwishyurwa n'umukiriya...",
    incomeNameAmountRequired: "Andika izina n'amafaranga nyayo.",
    incomeRecorded: "Amafaranga yanditswe",
    incomeRecordedDesc: "Amafaranga yinjiye yabitswe neza.",
    saveIncomeFailed: "Kubika amafaranga byanze.",
    incomeRemovedDesc: "Amafaranga yakuweho.",
    deleteIncomeFailed: "Gusiba byanze.",
    noIncomeYet: "Nta mafaranga yinjiye",
    incomeEmptyHint: "Andika amafaranga ubucuruzi bwakira kugira ngo ubone asigaye.",
    uploadReceipt: "Shyiraho inyemezabwishyu",
    changeReceipt: "Hindura dosiye",
    viewReceipt: "Reba inyemezabwishyu",
    receipt: "Inyemezabwishyu",
    receiptUploadHint: "Ifoto cyangwa PDF, max 5 MB",
    other: "Ibindi",
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
    close: "Funga",
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
    bankAccountName: "Izina rya banki / konti",
    bankAccountNumber: "Nomero ya konti",
    bankAccountNamePlaceholder: "urugero Bank of Kigali",
    bankAccountNumberPlaceholder: "urugero 1234567890",
    
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
    productManagement: "Serivisi & Stoki",
    salesTracking: "Ubucuruzi & Amafaranga",
    reportsAnalytics: "Abakozi & Raporo",
    offlineSupport: "Kwishyura & Nta interineti",
    addEditManageInventory: "Yobora serivisi, ibicuruzwa, n'uburyo stoki ikagenda mu dashibodi imwe. Ongeraho ibintu, kureba stoki, kandi umenye ibyo ugurisha.",
    trackStockLevels: "Kureba uko stoki ikagenda",
    recordSalesTransactions: "Andika ubucuruzi, andika amafaranga yakoreshejwe, kandi urebe amafaranga yinjiza n'inyungu ku dashibodi. Menya uko ubucuruzi bwawe bukagenda buri munsi.",
    trackRevenueProfits: "Kureba amafaranga yinjiza n'inyungu",
    viewDetailedReports: "Yobora abakozi bawe, reba raporo z'ubucuruzi n'amafaranga, kandi ukurebe imiterere kugirango ukure ubucuruzi bwawe.",
    generateComprehensiveAnalytics: "Kora raporo zuzuze",
    workOfflineAutoSync: "Iyandikishe ukoresheje MTN MoMo cyangwa Airtel Money. Komeza ukora nta interineti — amakuru yawe ahuzwa mu buryo bwikora igihe interineti isubira.",
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
    trippoTransformedInventory: "Trippo imfasha gukurikirana serivisi n'ubucuruzi mu iduka ryanjye. Nyobora abakozi, mbona amafaranga yinjira buri munsi ku dashibodi, none ndabona aho amafaranga yanjye ajya.",
    mostUsefulInventoryTool: "Twavuye mu bitabo tujya kuri Trippo kubucuruzi n'amafaranga. Raporo ziratwereka ibyo bigurishwa cyane buri cyumweru — bitwungurura amasaha menshi buri kwezi.",
    bestInventoryManagementFlexibility: "Kwishyura Plus na MoMo byoroshye. N'igihe interineti igenda, ndakomeza kwandika ubucuruzi nta interineti kandi byose bihuzwa igihe interineti isubira.",
    storeManagerRetailCo: "Uyobora iduka, Retail Co.",
    businessOwnerChenTrading: "Umuyobozi w'ubucuruzi, Chen Trading",
    operationsDirectorWilliamsSupply: "Umuyobozi w'ibikorwa, Williams Supply",
    ourPartners: "Abafatanyabikorwa bacu",
    homeTestimonial1Attribution: "Claudine Mukamana · Kigali",
    homeTestimonial2Attribution: "Jean Bosco Niyonzima · Nyamirambo",
    homeTestimonial3Attribution: "Espérance Uwase · Remera",
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
    todaysExpenses: "Ibyasohotse uyu munsi",
    todaysExpenseCount: "Umubare w'ibyasohotse uyu munsi",
    weekExpenses: "Ibyasohotse icyumweru",
    weekExpenseCount: "Umubare w'ibyasohotse icyumweru",
    monthExpenses: "Ibyasohotse uku kwezi",
    monthExpenseCount: "Umubare w'ibyasohotse uku kwezi",
    yearExpenses: "Ibyasohotse uku mwaka",
    yearExpenseCount: "Umubare w'ibyasohotse uku mwaka",
    expensesRecorded: "ibyasohotse byanditswe",
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
    filterPriceUnder5k: "Munsi ya 5,000 Rwf",
    filterPrice5kTo20k: "5,000 – 20,000 Rwf",
    filterPriceOver20k: "Hejuru ya 20,000 Rwf",
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
    salesTrend: "Amafarango yinjiye n'ibyasohotse",
    salesTrendLast7Days: "Amafarango yinjiye n'ibyasohotse (mu minsi 7)",
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
    serviceRecordedDesc: "{product} yakozwe na {worker} ku Rwf {amount}",
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
    activityEmptyHint: "Ibyasohotse biheruka bizagaragara hano",
    viewMoreInSales: "Reba byinshi muri Sales",
    viewMoreInExpenses: "Reba byinshi muri Ibyasohotse",
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
    priceWholePackageCalc: "Igiciro ku kintu: {base} Rwf × {qty} = {total} Rwf (ipaki yose)",
    priceFromPackageCalc: "Igiciro ku kintu: {perItem} Rwf (kuva {base} Rwf ÷ {qty})",
    maximumQuantity: "Umubare ntarengwa",
    stockLabel: "Ibihari",
    boxOf: "Agafuka ka {qty}",
    noProductsSearchHint: "Nta bicuruzwa bibonetse. Gerageza indi shakiro.",
  },
  fr: {
    // Navigation
    dashboard: "Aperçu",
    products: "Services",
    services: "Services",
    inventories: "Stocks",
    workers: "Travailleurs",
    worker: "Travailleur",
    expenses: "Dépenses",
    income: "Revenus",
    finance: "Finances",
    incomeStatements: "Revenus",
    incomeSources: "Revenus",
    incomeSource: "Source de revenu",
    incomeSourcePlaceholder: "ex. : Ventes, Services...",
    incomeBySource: "Revenus par source",
    expenditure: "Dépenses",
    totalIncome: "Revenus totaux",
    totalExpenditure: "Dépenses totales",
    totalPayroll: "Paie totale",
    currentBalance: "Solde actuel",
    payroll: "Paie",
    recordPayroll: "Enregistrer la paie",
    editPayroll: "Modifier la paie",
    employeeName: "Employé",
    payPeriod: "Période de paie",
    payrollStatus: "Statut",
    paid: "Payé",
    pending: "En attente",
    noPayrollYet: "Aucune paie enregistrée",
    payrollEmptyHint: "Suivez les salaires pour voir les sorties de paie.",
    payrollRecorded: "Paie enregistrée",
    payrollRecordedDesc: "Paie enregistrée avec succès.",
    payrollRemovedDesc: "Paie supprimée.",
    savePayrollFailed: "Échec de l'enregistrement de la paie.",
    deletePayrollFailed: "Échec de la suppression de la paie.",
    payrollNameAmountRequired: "Indiquez l'employé, le montant et la période.",
    bills: "Factures",
    recordBill: "Ajouter une facture",
    editBill: "Modifier la facture",
    billTitle: "Titre de la facture",
    billExamplePlaceholder: "ex. : Loyer, Électricité, Fournisseur...",
    billNameAmountRequired: "Indiquez le titre et un montant valide.",
    billRecorded: "Facture ajoutée",
    billRecordedDesc: "Enregistrée. Elle reste en attente jusqu'au paiement.",
    billRemovedDesc: "Facture supprimée.",
    saveBillFailed: "Échec de l'enregistrement de la facture.",
    deleteBillFailed: "Échec de la suppression de la facture.",
    markBillPaidFailed: "Échec du marquage comme payée.",
    noBillsYet: "Aucune facture pour l'instant",
    billsEmptyHint: "Suivez les factures à payer. Une fois payées, elles deviennent des dépenses.",
    billPaid: "Facture payée",
    billPaidDesc: "Marquée comme payée et enregistrée en dépense.",
    billPaidHint: "Cela créera une dépense et marquera la facture comme payée.",
    billStatus: "Statut",
    pendingBills: "En attente",
    paidBills: "Payées",
    allBills: "Toutes",
    markAsPaid: "Marquer comme payée",
    vendor: "Fournisseur",
    vendorPlaceholder: "À qui payer",
    taxes: "Impôts",
    recordTax: "Ajouter un impôt",
    editTax: "Modifier l'impôt",
    taxTitle: "Titre de l'impôt",
    taxType: "Type d'impôt",
    taxAuthority: "Autorité fiscale",
    taxAuthorityPlaceholder: "ex. RRA",
    taxPeriod: "Période fiscale",
    taxExamplePlaceholder: "ex. TVA T1, PAYE janvier...",
    taxNameAmountRequired: "Veuillez indiquer le titre, le type et un montant valide.",
    taxRecorded: "Impôt ajouté",
    taxRecordedDesc: "Obligation fiscale enregistrée. Payez avant la date d'échéance.",
    taxRemovedDesc: "Obligation fiscale supprimée.",
    saveTaxFailed: "Échec de l'enregistrement de l'impôt.",
    deleteTaxFailed: "Échec de la suppression de l'impôt.",
    markTaxPaidFailed: "Échec du marquage comme payé.",
    noTaxesYet: "Aucune obligation fiscale",
    taxesEmptyHint: "Listez les impôts dus pour payer à temps et éviter les pénalités.",
    taxPaid: "Impôt payé",
    taxPaidDesc: "Impôt marqué comme payé et enregistré en dépense.",
    taxPaidHint: "Cela créera une dépense et marquera l'impôt comme payé.",
    outstandingTaxes: "Impôts en cours",
    dueWithin30Days: "Échéance sous 30 jours",
    taxObligations: "obligations",
    bankDeposits: "Dépôts bancaires",
    recordDeposit: "Enregistrer un dépôt",
    editDeposit: "Modifier le dépôt",
    depositTitle: "Titre du dépôt",
    depositDate: "Date du dépôt",
    depositExamplePlaceholder: "ex. : Budget mensuel, capital T1...",
    depositNameAmountRequired: "Veuillez indiquer un titre et un montant.",
    depositCustomPeriodRequired: "Veuillez définir les dates de début et de fin.",
    depositRecorded: "Dépôt enregistré",
    depositRecordedDesc: "Le dépôt bancaire est enregistré et fait partie de votre budget disponible.",
    depositUpdated: "Dépôt mis à jour",
    depositUpdatedDesc: "Le dépôt bancaire a été mis à jour.",
    depositRemovedDesc: "Dépôt bancaire supprimé.",
    saveDepositFailed: "Échec de l'enregistrement du dépôt.",
    deleteDepositFailed: "Échec de la suppression du dépôt.",
    noDepositsYet: "Aucun dépôt bancaire",
    depositsEmptyHint: "Enregistrez l'argent déposé en banque pour suivre le budget disponible face aux dépenses.",
    budgetPeriod: "Période budgétaire",
    budgetPeriodMonthly: "Mensuel",
    budgetPeriodQuarterly: "Trimestriel",
    budgetPeriodYearly: "Annuel",
    budgetPeriodCustom: "Personnalisé",
    budgetPeriodHint: "Durée pendant laquelle ce dépôt couvre vos dépenses prévues.",
    budgetCovers: "Couvre",
    viewBudgetFor: "Voir le budget pour",
    totalDeposited: "Total déposé",
    usedBalance: "Solde utilisé",
    availableBalance: "Solde disponible",
    availableBalanceHint: "Dépôts moins dépenses et paie sur cette période",
    activeDeposits: "dépôts actifs",
    periodStart: "Début de période",
    periodEnd: "Fin de période",
    depositReferencePlaceholder: "Référence du virement ou reçu bancaire",
    bankAccount: "Compte bancaire",
    transactionTypeDeposit: "Dépôt bancaire",
    loans: "Prêts",
    addLoan: "Ajouter un prêt",
    editLoan: "Modifier le prêt",
    loanTitle: "Nom du prêt",
    loanTitlePlaceholder: "ex. : Prêt d'expansion",
    lender: "Prêteur",
    lenderPlaceholder: "ex. : Bank of Kigali",
    loanType: "Type de prêt",
    loanTypeBusiness: "Prêt commercial",
    loanTypeWorkingCapital: "Fonds de roulement",
    loanTypeEquipment: "Équipement",
    loanTypeVehicle: "Véhicule",
    loanTypeLineOfCredit: "Ligne de crédit",
    loanTypeOther: "Autre",
    principalAmount: "Capital",
    installmentAmount: "Mensualité",
    interestRate: "Taux d'intérêt",
    termMonths: "Durée (mois)",
    paymentFrequency: "Fréquence de paiement",
    maturityDate: "Date d'échéance finale",
    nextDueDate: "Prochaine échéance",
    remainingBalance: "Restant dû",
    loanStatus: "Statut",
    loanStatusActive: "Actif",
    loanStatusOverdue: "En retard",
    loanStatusPaidOff: "Remboursé",
    loanAccountNumber: "N° de compte prêt",
    collateral: "Garantie",
    collateralPlaceholder: "Actif mis en garantie",
    contactPerson: "Personne de contact",
    contactPhone: "Téléphone",
    recordLoanPayment: "Enregistrer un paiement",
    paymentHistory: "Historique des paiements",
    paymentAmount: "Montant du paiement",
    paymentDate: "Date de paiement",
    principalPortion: "Capital",
    interestPortion: "Intérêts",
    loanRequiredFields: "Veuillez indiquer le nom, le prêteur, le capital et la mensualité.",
    loanRecorded: "Prêt ajouté",
    loanRecordedDesc: "Prêt enregistré. Suivez les paiements et le solde restant ici.",
    loanUpdated: "Prêt mis à jour",
    loanUpdatedDesc: "Détails du prêt mis à jour.",
    loanRemovedDesc: "Prêt supprimé.",
    saveLoanFailed: "Échec de l'enregistrement du prêt.",
    deleteLoanFailed: "Échec de la suppression du prêt.",
    recordLoanPaymentFailed: "Échec de l'enregistrement du paiement.",
    loanPaymentRecorded: "Paiement enregistré",
    loanPaymentRecordedDesc: "Paiement enregistré et ajouté aux dépenses.",
    loanPaymentAmountRequired: "Veuillez saisir un montant de paiement valide.",
    loanPaymentExpenseHint: "Ce paiement sera enregistré comme dépense dans la catégorie prêt.",
    loanDeleteHasPayments: "Impossible de supprimer un prêt avec des paiements enregistrés.",
    noLoansYet: "Aucun prêt",
    loansEmptyHint: "Ajoutez vos prêts pour suivre les mensualités, le solde restant et l'historique.",
    totalOutstanding: "Total restant dû",
    dueThisMonth: "Échéance ce mois",
    loanPaymentsDue: "paiements dus",
    overdueLoans: "prêts en retard",
    activeLoans: "prêts actifs",
    totalPaidOnLoans: "Total remboursé",
    noPaymentsYet: "Aucun paiement enregistré",
    customers: "Clients",
    addCustomer: "Ajouter un client",
    editCustomer: "Modifier le client",
    customerName: "Nom du client",
    customer: "Client",
    selectCustomer: "Sélectionner un client",
    customerCreated: "Client ajouté",
    customerCreatedDesc: "Profil client enregistré.",
    customerUpdated: "Client mis à jour",
    customerUpdatedDesc: "Profil client mis à jour.",
    customerRemovedDesc: "Client supprimé.",
    saveCustomerFailed: "Échec de l'enregistrement du client.",
    deleteCustomerFailed: "Échec de la suppression du client.",
    customerNameRequired: "Le nom du client est requis.",
    noCustomersYet: "Aucun client",
    customersEmptyHint: "Ajoutez vos clients pour suivre soldes et factures.",
    viewStatement: "Voir le relevé",
    downloadStatement: "Télécharger le relevé PDF",
    loadCustomerActivityFailed: "Échec du chargement de l'activité client.",
    vendors: "Fournisseurs",
    addVendor: "Ajouter un fournisseur",
    editVendor: "Modifier le fournisseur",
    vendorName: "Nom du fournisseur",
    selectVendor: "Sélectionner un fournisseur",
    vendorCreated: "Fournisseur ajouté",
    vendorCreatedDesc: "Profil fournisseur enregistré.",
    vendorUpdated: "Fournisseur mis à jour",
    vendorUpdatedDesc: "Profil fournisseur mis à jour.",
    vendorRemovedDesc: "Fournisseur supprimé.",
    saveVendorFailed: "Échec de l'enregistrement du fournisseur.",
    deleteVendorFailed: "Échec de la suppression du fournisseur.",
    vendorNameRequired: "Le nom du fournisseur est requis.",
    noVendorsYet: "Aucun fournisseur",
    vendorsEmptyHint: "Ajoutez vos fournisseurs pour suivre factures et paiements.",
    loadVendorActivityFailed: "Échec du chargement de l'activité fournisseur.",
    accounts: "Comptes",
    addAccount: "Ajouter un compte",
    editAccount: "Modifier le compte",
    accountName: "Nom du compte",
    accountType: "Type de compte",
    accountCreated: "Compte ajouté",
    accountCreatedDesc: "Compte enregistré.",
    accountUpdated: "Compte mis à jour",
    accountUpdatedDesc: "Compte mis à jour.",
    accountRemovedDesc: "Compte archivé.",
    saveAccountFailed: "Échec de l'enregistrement du compte.",
    deleteAccountFailed: "Échec de la suppression du compte.",
    accountNameRequired: "Le nom du compte est requis.",
    noAccountsYet: "Aucun compte",
    accountsEmptyHint: "Ajoutez des comptes espèces, banque, MoMo ou Airtel.",
    openingBalance: "Solde d'ouverture",
    transferFunds: "Transférer des fonds",
    fromAccount: "Du compte",
    toAccount: "Vers le compte",
    selectAccount: "Sélectionner un compte",
    paymentAccount: "Compte de paiement",
    noAccountSelected: "Aucun compte sélectionné",
    financialStatements: "États financiers",
    financialStatementsHint: "Compte de résultat, bilan et flux de trésorerie.",
    profitLoss: "Compte de résultat",
    balanceSheet: "Bilan",
    cashFlow: "Flux de trésorerie",
    dashHelpReceivables:
      "Argent que vos clients vous doivent. Suit les factures impayées (ou revenus enregistrés). En cours = pas encore échu ; En retard = après la date d'échéance. Appuyez sur + Nouveau pour ajouter un revenu ou une facture.",
    dashHelpPayables:
      "Argent que vous devez aux fournisseurs. Le total affiche toutes les factures impayées. En cours = pas encore en retard ; En retard = après la date d'échéance. Appuyez sur + Nouveau pour enregistrer une facture.",
    dashHelpCashFlow:
      "Entrées et sorties d'argent pour l'exercice sélectionné. Vert = revenus encaissés ; rouge = dépenses payées. Les soldes d'ouverture et de clôture montrent votre position en début et fin d'année.",
    dashHelpIncomeExpense:
      "Revenus vs dépenses par mois. Trésorerie = quand l'argent est reçu ou payé ; Exercice = quand c'est enregistré. Les totaux excluent les taxes.",
    dashHelpTopExpenses:
      "Vos plus grandes catégories de dépenses pour l'année sélectionnée. Voyez où va la majorité de vos dépenses.",
    dashHelpMonthlyKpis:
      "Aperçu du mois en cours — revenus encaissés, dépenses payées, profit et taxes restantes.",
    dashHelpUpcomingBills:
      "Factures à payer dans les 30 prochains jours. Voir tout pour gérer et enregistrer des factures.",
    dashHelpRecentTransactions:
      "Dernières entrées et sorties sur vos comptes. Voir tout pour la liste complète.",
    helpIncome:
      "Enregistrez l'argent reçu par l'entreprise — ventes, services ou autres revenus. Chaque entrée peut inclure mode de paiement, compte et reçu.",
    helpCustomers:
      "Liste des clients à qui vous vendez ou facturez. Utilisez-les pour les factures et le suivi des créances.",
    helpInvoices:
      "Créez et envoyez des factures. Suivez les montants impayés, en cours et en retard jusqu'au paiement.",
    helpVendors:
      "Fournisseurs et entreprises auprès desquels vous achetez. Liez-les aux factures fournisseurs.",
    helpBankDeposits:
      "Enregistrez les espèces ou mobile money déposés en banque. Aide à rapprocher la caisse du solde bancaire.",
    helpAccounts:
      "Comptes caisse, banque et mobile money. Les revenus et dépenses peuvent être affectés à un compte.",
    helpFinancialStatements:
      "Compte de résultat, bilan et flux de trésorerie sur une période. Export PDF pour vos archives ou comptable.",
    helpBankReconciliation:
      "Rapprochez les opérations du compte avec votre relevé bancaire. Marquez les lignes réconciliées.",
    helpCategoryBudgets:
      "Fixez des plafonds de dépenses par catégorie pour un mois ou une année. Comparez au réel.",
    helpLoans:
      "Suivez les emprunts ou prêts — capital, remboursements et solde restant.",
    helpBills:
      "Factures fournisseurs à payer. Dates d'échéance, marquage payé, montants en cours et en retard.",
    helpTaxes:
      "Obligations et paiements fiscaux — montants dus, dates de déclaration et déjà payés.",
    helpExpenditure:
      "Dépenses courantes de l'entreprise. Catégorisez et joignez des reçus.",
    helpPayroll:
      "Paiements salariés et prestataires. Enregistrez les montants et dates de paie.",
    helpTransactions:
      "Tous les mouvements entre comptes — revenus, dépenses, virements et paie.",
    helpProducts:
      "Catalogue produits — noms, prix, stocks et catégories. Le stock se met à jour lors des ventes.",
    helpSales:
      "Enregistrez ventes de produits ou services. Revenus et marges selon vos coûts et prix.",
    helpDocuments:
      "Stockez les fichiers de l'entreprise — contrats, licences, reçus et autres documents.",
    helpReports:
      "Rapports exportables ventes, finance et stock. Filtrez par jour, semaine, mois ou année en PDF ou Excel.",
    helpAutomations:
      "Planifiez e-mails et rappels clients — relances, promotions et messages récurrents.",
    helpCalendar:
      "Visualisez revenus, dépenses, factures, taxes, paie et événements sur un calendrier.",
    helpTeamOverview:
      "Vue mensuelle des tâches — taux d'achèvement, membres actifs et répartition du travail.",
    helpTeamTasks:
      "Assignez des tâches, fixez des échéances et suivez le statut de à faire à terminé.",
    helpTeamFinanceTasks:
      "Tâches du service finance — clôture mensuelle, rapprochements, déclarations fiscales, etc.",
    helpTeamMembers:
      "Membres de l'équipe — noms, rôles, départements et coordonnées pour l'assignation.",
    loadStatementsFailed: "Échec du chargement des états financiers",
    asOfDate: "À la date du",
    generateReport: "Générer le rapport",
    totalExpenses: "Total des dépenses",
    netProfit: "Résultat net",
    assets: "Actifs",
    cashAndBank: "Trésorerie et banque",
    accountsReceivable: "Créances clients",
    inventoryValue: "Valeur des stocks",
    totalAssets: "Total actif",
    liabilitiesAndEquity: "Passif et capitaux propres",
    accountsPayable: "Dettes fournisseurs",
    loanLiabilities: "Dettes d'emprunt",
    totalLiabilities: "Total passif",
    equity: "Capitaux propres",
    operatingCashIn: "Encaissements d'exploitation",
    operatingCashOut: "Décaissements d'exploitation",
    netOperatingCash: "Trésorerie nette d'exploitation",
    financingDeposits: "Dépôts de financement",
    netChangeInCash: "Variation nette de trésorerie",
    bankReconciliation: "Rapprochement bancaire",
    bankReconciliationHint: "Rapprochez les transactions du compte avec vos relevés bancaires.",
    closingBalance: "Solde de clôture",
    reconciledCount: "Rapprochées",
    unreconciledCount: "Non rapprochées",
    reconciled: "Rapproché",
    noReconciliationEntries: "Aucune transaction sur cette période pour ce compte.",
    transactionType: "Type",
    refresh: "Actualiser",
    transfer: "Transférer",
    transferComplete: "Transfert effectué",
    transferCompleteDesc: "Fonds déplacés entre comptes.",
    transferFailed: "Échec du transfert.",
    transferInvalid: "Sélectionnez les comptes et un montant valide.",
    categoryBudgets: "Budgets par catégorie",
    addCategoryBudget: "Ajouter un budget",
    categoryBudgetRequired: "Catégorie et montant requis.",
    budgetCreated: "Budget ajouté",
    budgetCreatedDesc: "Budget enregistré.",
    saveBudgetFailed: "Échec de l'enregistrement du budget.",
    deleteBudgetFailed: "Échec de la suppression du budget.",
    budgetRemovedDesc: "Règle de budget supprimée.",
    loadBudgetSummaryFailed: "Échec du chargement du résumé budget.",
    totalBudget: "Budget total",
    totalActual: "Total dépensé",
    viewPeriod: "Période",
    budget: "Budget",
    actual: "Réel",
    budgetRules: "Règles de budget",
    noBudgetsYet: "Aucun budget par catégorie",
    budgetsEmptyHint: "Définissez des limites par catégorie de dépenses.",
    noSalesYet: "Aucune vente enregistrée",
    salesEmptyHint: "Enregistrez les ventes pour suivre revenus et stock.",
    saleRequiredFields: "Sélectionnez un produit et une quantité.",
    saveSaleFailed: "Échec de l'enregistrement de la vente.",
    balanceDue: "Solde dû",
    totalPaid: "Total payé",
    email: "E-mail",
    phone: "Téléphone",
    invoices: "Factures",
    createInvoice: "Créer une facture",
    editInvoice: "Modifier la facture",
    invoiceTitle: "Titre de la facture",
    invoiceNumber: "Facture n°",
    invoiceStatus: "Statut",
    invoiceStatus_draft: "Brouillon",
    invoiceStatus_sent: "Envoyée",
    invoiceStatus_paid: "Payée",
    invoiceStatus_overdue: "En retard",
    unpaidInvoices: "Factures impayées",
    noInvoicesYet: "Aucune facture",
    invoicesEmptyHint: "Créez des factures pour vos clients et suivez les paiements.",
    invoiceRequiredFields: "Veuillez indiquer un titre et au moins une ligne.",
    invoiceCreated: "Facture créée",
    invoiceCreatedDesc: "Facture enregistrée en brouillon.",
    invoiceUpdated: "Facture mise à jour",
    invoiceUpdatedDesc: "Facture mise à jour.",
    invoiceRemovedDesc: "Facture supprimée.",
    saveInvoiceFailed: "Échec de l'enregistrement de la facture.",
    deleteInvoiceFailed: "Échec de la suppression de la facture.",
    markInvoiceSentFailed: "Échec de l'envoi de la facture.",
    markInvoicePaidFailed: "Échec du paiement de la facture.",
    invoiceSent: "Facture envoyée",
    invoiceSentDesc: "Facture marquée comme envoyée.",
    invoicePaid: "Facture payée",
    invoicePaidDesc: "Paiement enregistré dans les revenus.",
    recurringInvoiceCreated: "Facture récurrente",
    recurringInvoiceCreatedDesc: "Prochaine facture récurrente créée.",
    lineItems: "Lignes",
    addLine: "Ajouter une ligne",
    unitPrice: "Prix unitaire",
    issueDate: "Date d'émission",
    paymentTerms: "Conditions de paiement",
    paymentTermsPlaceholder: "ex. : Paiement sous 14 jours",
    recurringInvoice: "Facture récurrente",
    markAsSent: "Marquer comme envoyée",
    downloadPdf: "Télécharger PDF",
    referenceNumber: "Numéro de référence",
    referenceNumberPlaceholder: "Référence de déclaration ou paiement",
    dueDate: "Date d'échéance",
    overdue: "En retard",
    transactions: "Transactions",
    noTransactionsYet: "Aucune transaction pour l'instant",
    transactionTypeIncome: "Revenu",
    transactionTypeExpense: "Dépense",
    transactionTypePayroll: "Paie",
    recordIncome: "Enregistrer un revenu",
    editIncome: "Modifier le revenu",
    incomeTitle: "Titre du revenu",
    incomeExamplePlaceholder: "ex. : Paiement client, dépôt...",
    incomeNameAmountRequired: "Indiquez le titre et un montant valide.",
    incomeRecorded: "Revenu enregistré",
    incomeRecordedDesc: "Revenu enregistré avec succès.",
    saveIncomeFailed: "Impossible d'enregistrer le revenu.",
    incomeRemovedDesc: "Revenu supprimé.",
    deleteIncomeFailed: "Impossible de supprimer le revenu.",
    noIncomeYet: "Aucun revenu enregistré",
    incomeEmptyHint: "Enregistrez l'argent entrant pour suivre votre solde.",
    uploadReceipt: "Joindre un reçu",
    changeReceipt: "Changer le fichier",
    viewReceipt: "Voir le reçu",
    receipt: "Reçu",
    receiptUploadHint: "Image ou PDF, max 5 Mo",
    other: "Autre",
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
    bankAccountName: "Nom de la banque / compte",
    bankAccountNumber: "Numéro de compte",
    bankAccountNamePlaceholder: "ex. Bank of Kigali",
    bankAccountNumberPlaceholder: "ex. 1234567890",
    
    // Dashboard KPIs (time periods)
    todaysRevenue: "Revenu d'aujourd'hui",
    todaysProfit: "Bénéfice (net) d'aujourd'hui",
    todaysExpenses: "Dépenses d'aujourd'hui",
    todaysExpenseCount: "Nombre de dépenses aujourd'hui",
    weekExpenses: "Dépenses de la semaine",
    weekExpenseCount: "Nombre de dépenses cette semaine",
    monthExpenses: "Dépenses du mois",
    monthExpenseCount: "Nombre de dépenses ce mois",
    yearExpenses: "Dépenses de l'année",
    yearExpenseCount: "Nombre de dépenses cette année",
    expensesRecorded: "dépenses enregistrées",
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
    amountRwf: "Montant (Rwf)",
    searchProductsAndServices: "Rechercher produits et services...",
    packageLabel: "Paquet",
    productOrService: "Produit / Service",
    saleMode: "Mode de vente",
    sellByQuantity: "Vendre à l'unité",
    sellWholePackage: "Vendre le paquet entier",
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
    serviceRecordedDesc: "{product} par {worker} pour {amount} Rwf",
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
    activityEmptyHint: "Les dépenses récentes apparaîtront ici",
    viewMoreInSales: "Voir plus dans Ventes",
    viewMoreInExpenses: "Voir plus dans Dépenses",
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
    priceWholePackageCalc: "Prix à l'unité : {base} Rwf × {qty} = {total} Rwf (paquet entier)",
    priceFromPackageCalc: "Prix à l'unité : {perItem} Rwf (de {base} Rwf ÷ {qty})",
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

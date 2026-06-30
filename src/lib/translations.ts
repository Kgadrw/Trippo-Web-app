import { extendedTranslations } from "./translationsExtended";

export type Language = "en";

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
  overdueThisMonth: string;
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
  helpAssets: string;
  assetAdd: string;
  assetEdit: string;
  assetUpdated: string;
  assetAdded: string;
  assetSaveFailed: string;
  assetMissingTitle: string;
  assetInvalidCost: string;
  assetActiveCount: string;
  assetPurchaseValue: string;
  assetCurrentValue: string;
  assetWarrantyExpiring: string;
  assetMaintenanceDue: string;
  assetTag: string;
  assetType: string;
  assetManufacturer: string;
  assetModel: string;
  assetPurchaseDate: string;
  assetPurchaseCost: string;
  assetAssignedTo: string;
  assetLocation: string;
  assetWarranty: string;
  assetSelectAssignee: string;
  assetManualAssignee: string;
  assetViewDetails: string;
  assetDeleteTitle: string;
  assetDeleteDesc: string;
  assetTypeVehicle: string;
  assetTypeMachinery: string;
  assetTypeTechnology: string;
  assetTypeEquipment: string;
  assetTypeFurniture: string;
  assetTypeBuilding: string;
  assetTypeOther: string;
  assetStatusActive: string;
  assetStatusInUse: string;
  assetStatusMaintenance: string;
  assetStatusRetired: string;
  assetStatusDisposed: string;
  assetBackToRegister: string;
  assetProfileLoadFailed: string;
  assetProfileNotFound: string;
  assetTabOverview: string;
  assetTabDepreciation: string;
  assetTabMaintenance: string;
  assetTabHistory: string;
  assetUsefulLife: string;
  assetMonths: string;
  assetAssignCustody: string;
  assetScheduleMaintenance: string;
  assetRecordAudit: string;
  assetUpcomingMaintenance: string;
  assetNoMaintenance: string;
  assetCustodyHistory: string;
  assetNoCustodyHistory: string;
  assetCurrentCustodian: string;
  assetNoDepreciation: string;
  assetPeriod: string;
  assetOpeningValue: string;
  assetDepreciation: string;
  assetAccumulated: string;
  assetClosingValue: string;
  assetMarkComplete: string;
  assetMaintenanceScheduled: string;
  assetMaintenanceCompleted: string;
  assetAuditRecorded: string;
  assetCustodyUpdated: string;
  assetAuditSummary: string;
  assetNoHistory: string;
  assetEventRegistered: string;
  assetEventUpdated: string;
  assetEventAssigned: string;
  assetEventReturned: string;
  assetEventMaintenance: string;
  assetEventAudit: string;
  assetEventStatusChange: string;
  assetEventDisposed: string;
  helpApprovals: string;
  helpReports: string;
  helpAutomations: string;
  helpCalendar: string;
  helpCorpCalOverview: string;
  helpCorpCalAnnouncements: string;
  helpTeamOverview: string;
  helpTeamTasks: string;
  helpTeamFinanceTasks: string;
  helpTeamMembers: string;
  helpTeamLeave: string;
  helpHrOverview: string;
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
  workspaceChatTitle: string;
  workspaceChatSubtitle: string;
  workspaceChatPlaceholder: string;
  workspaceChatEmpty: string;
  workspaceChatSend: string;
  workspaceChatOpen: string;
  workspaceChatClose: string;
  workspaceChatLoadFailed: string;
  workspaceChatSendFailed: string;
  workspaceChatMessageInfo: string;
  workspaceChatDeliveredTo: string;
  workspaceChatSeenBy: string;
  workspaceChatNoSeenYet: string;
  workspaceChatNoRecipients: string;
  workspaceChatActiveUsers: string;
  workspaceChatNoActiveUsers: string;
  workspaceChatMentionEveryone: string;
  workspaceChatMentionHint: string;
  directChatTitle: string;
  directChatSearchPeople: string;
  directChatNoPeople: string;
  directChatSelectPerson: string;
  directChatSelectPersonHint: string;
  directChatStartConversation: string;
  directChatTapToChat: string;
  directChatYou: string;
  directChatEmptyTitle: string;
  directChatEmptyBody: string;
  directChatLoadFailed: string;
  directChatLoadThreadsFailed: string;
  directChatOpenFailed: string;
  directChatSendFailed: string;
  directChatScrollDown: string;
  directChatWorkspaceOnlyTitle: string;
  directChatWorkspaceOnlyBody: string;
  directChatAttach: string;
  directChatAttachFailed: string;
  directChatRemoveAttachment: string;
  directChatEdit: string;
  directChatDelete: string;
  directChatEditing: string;
  directChatCancelEdit: string;
  directChatEditFailed: string;
  directChatDeleteFailed: string;
  directChatMessageDeleted: string;
  directChatDeleteConfirm: string;
  directChatEdited: string;
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
  calSourceLeave: string;
  calSourceMilestone: string;
  calSourceClientMeeting: string;
  calSourceAnnouncement: string;
  corpCalOverviewTitle: string;
  corpCalOverviewSubtitle: string;
  corpCalOpenCalendar: string;
  corpCalOpenAnnouncements: string;
  corpCalUpcomingMeetings: string;
  corpCalClientMeetings: string;
  corpCalLeaveWindows: string;
  corpCalLeaveHint: string;
  corpCalMilestones: string;
  corpCalMilestoneHint: string;
  corpCalAnnouncements: string;
  corpCalAutomations: string;
  corpCalAutomationHint: string;
  corpCalAlignmentTitle: string;
  corpCalAlignmentBody: string;
  corpCalOpenAutomations: string;
  corpCalOpenLeave: string;
  corpCalOpenProjects: string;
  corpAnnTitle: string;
  corpAnnSubtitle: string;
  corpAnnAdd: string;
  corpAnnEdit: string;
  corpAnnEmpty: string;
  corpAnnLoadFailed: string;
  corpAnnSaveFailed: string;
  corpAnnSaved: string;
  corpAnnDeleted: string;
  corpAnnDeleteConfirm: string;
  corpAnnAllStatuses: string;
  corpAnnColTitle: string;
  corpAnnColScope: string;
  corpAnnColPriority: string;
  corpAnnColDates: string;
  corpAnnColStatus: string;
  corpAnnBody: string;
  corpAnnStartDate: string;
  corpAnnEndDate: string;
  corpAnnRegion: string;
  corpAnnSelectRegion: string;
  corpAnnScopeWorkspace: string;
  corpAnnScopeRegional: string;
  corpAnnScopeGlobal: string;
  corpAnnPriorityNormal: string;
  corpAnnPriorityHigh: string;
  corpAnnPriorityCritical: string;
  corpAnnStatusDraft: string;
  corpAnnStatusPublished: string;
  corpAnnStatusArchived: string;
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
  teamOverviewTasksDone: string;
  teamOverviewMembersActive: string;
  teamOverviewMemberChartHint: string;
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
  categoryCreateNew: string;
  categoryManage: string;
  categoryName: string;
  categoryNamePlaceholder: string;
  categoryCreated: string;
  categoryCreateFailed: string;
  categoryDeleted: string;
  categoryDeleteFailed: string;
  categoryNoCustom: string;
  selectCategory: string;
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

  hrPeople: string;
  hrOverview: string;
  hrOverviewTitle: string;
  hrOverviewSubtitle: string;
  hrLeave: string;
  hrOrgChart: string;
  hrOrgChartTitle: string;
  hrOrgChartSubtitle: string;
  hrOrgChartEmpty: string;
  hrProfileLoadFailed: string;
  hrProfileNotFound: string;
  hrBackToPeople: string;
  hrTabOverview: string;
  hrTabLeave: string;
  hrTabPayroll: string;
  hrEmployeeNumber: string;
  hrHireDate: string;
  hrReportsTo: string;
  hrAnnualLeave: string;
  hrSickLeave: string;
  hrDaysLeft: string;
  hrContactDetails: string;
  hrLocation: string;
  hrEmergencyContact: string;
  hrDirectReports: string;
  hrNoDirectReports: string;
  hrNoLeaveHistory: string;
  hrOpenLeave: string;
  hrRecentPayrollTotal: string;
  hrNoPayrollHistory: string;
  hrOpenPayroll: string;
  hrEmploymentFullTime: string;
  hrEmploymentPartTime: string;
  hrEmploymentContract: string;
  hrEmploymentIntern: string;
  hrDetailsSection: string;
  hrEmploymentType: string;
  hrManager: string;
  hrNoManager: string;
  hrLeaveAllowances: string;
  hrActiveEmployees: string;
  hrPendingLeaveRequests: string;
  hrViewPeople: string;
  hrViewOrgChart: string;
  helpHrOrgChart: string;
  hrLinkedWorkspaceUser: string;
  hrNoLinkedUser: string;
  hrComingSoonTitle: string;
  hrComingSoonBody: string;
  hrComingSoonRecruitment: string;
  hrComingSoonAttendance: string;
  hrComingSoonContracts: string;

  projectOverviewTitle: string;
  projectOverviewSubtitle: string;
  projectViewAll: string;
  projectTotalProjects: string;
  projectOpenTasks: string;
  projectOverdueMilestones: string;
  projectCompletedCount: string;
  projectVelocityTasks: string;
  projectVelocityTasksHint: string;
  projectVelocityHours: string;
  projectVelocityHoursHint: string;
  projectNoVelocityData: string;
  projectAllProjects: string;
  projectAllProjectsSubtitle: string;
  projectAdd: string;
  projectEdit: string;
  projectName: string;
  projectStatus: string;
  projectLead: string;
  projectTargetEnd: string;
  projectStartDate: string;
  projectClient: string;
  projectSelectLead: string;
  projectNoLead: string;
  projectEmpty: string;
  projectLoadFailed: string;
  projectNameRequired: string;
  projectUpdated: string;
  projectCreated: string;
  projectSaveFailed: string;
  projectDeleted: string;
  projectDeleteTitle: string;
  projectDeleteBody: string;
  projectAllStatuses: string;
  projectStatusPlanning: string;
  projectStatusActive: string;
  projectStatusOnHold: string;
  projectStatusCompleted: string;
  projectStatusCancelled: string;
  projectPriorityLow: string;
  projectPriorityMedium: string;
  projectPriorityHigh: string;
  projectProfileLoadFailed: string;
  projectProfileNotFound: string;
  projectBackToList: string;
  projectTabOverview: string;
  projectTabMilestones: string;
  projectTabTasks: string;
  projectTabTeam: string;
  projectTabTime: string;
  projectTaskProgress: string;
  projectTasksDone: string;
  projectMilestoneProgress: string;
  projectHoursLogged: string;
  projectTeamSize: string;
  projectAddMilestone: string;
  projectNoMilestones: string;
  projectMilestoneTitle: string;
  projectMilestonePending: string;
  projectMilestoneInProgress: string;
  projectMilestoneCompleted: string;
  projectNoDueDate: string;
  projectAddTask: string;
  projectNoTasks: string;
  projectUnassignedTasks: string;
  projectUnassigned: string;
  projectTaskTitle: string;
  projectMilestone: string;
  projectAssignee: string;
  projectEstimatedHours: string;
  projectAddMember: string;
  projectNoMembers: string;
  projectMemberRole: string;
  projectMemberAddFailed: string;
  projectSelectMember: string;
  projectLogTime: string;
  projectNoTimeEntries: string;
  projectTask: string;
  projectNoTaskLinked: string;
  projectHours: string;
  projectTimeNote: string;
  helpProjectOverview: string;
  helpProjectList: string;

  notes: string;
  crmOverviewTitle: string;
  crmOverviewSubtitle: string;
  crmOpenPipeline: string;
  crmOpenContacts: string;
  crmTotalContacts: string;
  crmPendingQuotes: string;
  crmActiveContracts: string;
  crmLeadFunnel: string;
  crmLeadFunnelHint: string;
  crmPipelineByStage: string;
  crmPipelineByStageHint: string;
  crmDealValue: string;
  crmDealCount: string;
  crmOmnichannelTitle: string;
  crmOmnichannelBody: string;
  crmPipelineTitle: string;
  crmPipelineSubtitle: string;
  crmAddDeal: string;
  crmDealTitle: string;
  crmProbability: string;
  crmDealCreated: string;
  crmLoadFailed: string;
  crmSaveFailed: string;
  crmStageLead: string;
  crmStageQualified: string;
  crmStageProposal: string;
  crmStageNegotiation: string;
  crmStageWon: string;
  crmStageLost: string;
  crmContactsTitle: string;
  crmContactsSubtitle: string;
  crmAddContact: string;
  crmAllLifecycle: string;
  crmLifecycle: string;
  crmLifecycleLead: string;
  crmLifecycleProspect: string;
  crmLifecycleCustomer: string;
  crmLifecycleInactive: string;
  crmCompany: string;
  crmSource: string;
  crmNoContacts: string;
  crmProfileLoadFailed: string;
  crmContactNotFound: string;
  crmBackToContacts: string;
  crmNoContactInfo: string;
  crmOpenDeals: string;
  crmNoDeals: string;
  crmRecentQuotes: string;
  crmCommunicationTimeline: string;
  crmCommunicationTimelineHint: string;
  crmActivityType: string;
  crmChannel: string;
  crmActivitySubject: string;
  crmActivityBody: string;
  crmLogActivity: string;
  crmNoActivities: string;
  crmActivityLogged: string;
  crmActivityNote: string;
  crmActivityCall: string;
  crmActivityEmail: string;
  crmActivityMeeting: string;
  crmActivityMessage: string;
  crmChannelInternal: string;
  crmChannelPhone: string;
  crmChannelEmail: string;
  crmChannelSms: string;
  crmChannelWhatsapp: string;
  crmChannelInPerson: string;
  crmChannelOther: string;
  crmContracts: string;
  crmQuotesTitle: string;
  crmQuotesSubtitle: string;
  crmAddQuote: string;
  crmQuoteNumber: string;
  crmQuoteStatus: string;
  crmQuoteAmount: string;
  crmQuoteTitle: string;
  crmValidUntil: string;
  crmLineItems: string;
  crmAddLine: string;
  crmQuoteLinesRequired: string;
  crmQuoteCreated: string;
  crmMarkSent: string;
  crmConvertToInvoice: string;
  crmQuoteConverted: string;
  crmNoQuotes: string;
  crmQuoteDraft: string;
  crmQuoteSent: string;
  crmQuoteAccepted: string;
  crmQuoteRejected: string;
  crmQuoteExpired: string;
  crmAllStatuses: string;
  crmContractsTitle: string;
  crmContractsSubtitle: string;
  crmAddContract: string;
  crmContractTitle: string;
  crmContractStatus: string;
  crmContractValue: string;
  crmRenewalDate: string;
  crmContractStart: string;
  crmContractEnd: string;
  crmActivateContract: string;
  crmContractCreated: string;
  crmNoContracts: string;
  crmContractDraft: string;
  crmContractActive: string;
  crmContractExpired: string;
  crmContractTerminated: string;

  docOverviewTitle: string;
  docOverviewSubtitle: string;
  docOpenRegistry: string;
  docOpenArchive: string;
  docTotalDocuments: string;
  docExpiringSoon: string;
  docSignedCount: string;
  docSharedCount: string;
  docArchiveTitle: string;
  docUpload: string;
  docArchiveEmpty: string;
  docOpenFailed: string;
  docRegistryType: string;
  docRegistryStatus: string;
  docEffectiveDate: string;
  docExpiryDate: string;
  docLoadFailed: string;
  docRegistryTitle: string;
  docRegistrySubtitle: string;
  docAllTypes: string;
  docAllStatuses: string;
  docRegistryEmpty: string;
  docTitle: string;
  docTypeGeneral: string;
  docTypeContract: string;
  docTypePolicy: string;
  docTypeTemplate: string;
  docStatusDraft: string;
  docStatusActive: string;
  docStatusArchived: string;
  docStatusExpired: string;
  docProfileLoadFailed: string;
  docShareAdded: string;
  docSaveFailed: string;
  docVersionRestored: string;
  docSigned: string;
  docVerifyComplete: string;
  docNotFound: string;
  docBackToArchive: string;
  docTabOverview: string;
  docTabVersions: string;
  docTabSharing: string;
  docTabSignatures: string;
  docViewFile: string;
  docContentHash: string;
  docArchiveStats: string;
  docVersionsTotal: string;
  docSharesTotal: string;
  docSignaturesTotal: string;
  docCurrentVersion: string;
  docNoVersions: string;
  docRestoreVersion: string;
  docShareWith: string;
  docSelectMember: string;
  docSharePermission: string;
  docAddShare: string;
  docSharingWorkspaceOnly: string;
  docNoShares: string;
  docSign: string;
  docVerifySignatures: string;
  docNoSignatures: string;
  docShareView: string;
  docShareDownload: string;
  docShareEdit: string;

  helpCrmOverview: string;
  helpCrmPipeline: string;
  helpCrmContacts: string;
  helpCrmQuotes: string;
  helpCrmContracts: string;
  helpDocOverview: string;
  helpDocArchive: string;
  helpDocRegistry: string;

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

export const translations: Record<Language, Partial<Translations>> = {
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
    overdueThisMonth: "Overdue This Month",
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
      "Quick snapshot for the selected period — all money in vs all money out. Profit is the margin earned on sales (selling price minus cost), not total income.",
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
    helpDocOverview:
      "Document management snapshot — contracts, policies, expiring items, and signed files across your workspace.",
    helpDocArchive:
      "Upload and browse all company documents. Each upload creates a versioned record with searchable metadata.",
    helpDocRegistry:
      "Contract and policy registry — filter by type and status, track effective and expiry dates.",
    helpAssets:
      "Register vehicles, machinery, and IT hardware. Track custody, maintenance, depreciation, warranty expiry, and audit history.",
    helpApprovals:
      "Review expenses, bills, and payroll submitted by workspace members. Approve or reject before they affect reports and payments.",
    helpReports:
      "Exportable reports for sales, finance, and inventory. Filter by day, week, month, or year and download PDF or Excel.",
    helpAutomations:
      "Schedule emails and reminders to customers — follow-ups, promotions, and recurring messages.",
    helpCalendar:
      "Unified calendar view — meetings, leave, milestones, announcements, automations, and finance dates in one timeline.",
    helpCorpCalOverview:
      "Corporate calendar snapshot — upcoming meetings, leave windows, delivery milestones, and company announcements across your workspace.",
    helpCorpCalAnnouncements:
      "Publish workspace, regional, or company-wide announcements with start and end dates visible on the corporate calendar.",
    helpTeamOverview:
      "Monthly snapshot of team tasks — completion rate, active members, and who is working on what.",
    helpTeamTasks:
      "Assign tasks to team members, set due dates, and track status from to-do through done.",
    helpTeamFinanceTasks:
      "Finance department tasks — monthly close, reconciliations, tax filings, and other finance work items.",
    helpTeamMembers:
      "People on your team — names, roles, departments, and contact details for task assignment.",
    helpTeamLeave:
      "Request time off and track approval status. Team members submit leave; workspace owners and admins approve or reject.",
    helpHrOverview:
      "Headcount, pending leave, and org structure. People, leave, and payroll live here — separate from task tracking in Team.",
    helpProjectOverview:
      "Portfolio snapshot with velocity charts — tasks completed and hours logged over the last four weeks.",
    helpProjectList:
      "Create projects, map milestones, assign cross-functional teams, and track deliverables from planning through completion.",
    helpCrmOverview:
      "Lead funnel, pipeline value, and recent customer activity across your CRM workspace.",
    helpCrmPipeline:
      "Move deals through stages from lead to won — track value and probability at each step.",
    helpCrmContacts:
      "Unified customer database with lifecycle stages from lead through customer.",
    helpCrmQuotes:
      "Create quotations with line items, mark as sent, and convert accepted quotes to invoices.",
    helpCrmContracts:
      "Track contract terms, renewal dates, and active agreements with customers.",
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
};

export const getTranslation = (key: keyof Translations): string => {
  return extendedTranslations.en?.[key] ?? translations.en?.[key] ?? key;
};

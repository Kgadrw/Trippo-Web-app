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
  logout: string;
  
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
  recentExpenses: string;

  // Modals — services & products
  addService: string;
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
  editWorker: string;
  noWorkersFound: string;
  noWorkersAddFirst: string;
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
    logout: "Logout",
    
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
    recentExpenses: "Recent Expenses",

    addService: "Add Service",
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
    logout: "Sohoka",
    
    // Common
    save: "Bika",
    update: "Hindura",
    updating: "Birimo guhindura...",
    saving: "Birimo kubika...",
    cancel: "Kureka",
    delete: "Siba",
    edit: "Hindura",
    add: "Ongeraho",
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
    recentExpenses: "Ibiheruka gusohoka",

    addService: "Ongeraho serivisi",
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
  },
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    products: "Services",
    sales: "Ventes",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    
    // Common
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    search: "Rechercher",
    filter: "Filtrer",
    loading: "Chargement...",
    signIn: "Connexion",
    getStarted: "Commencer",
    
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
    quantity: "Quantité",
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
    todaysItems: "Services d'aujourd'hui",
    
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
  },
};

export const getTranslation = (key: keyof Translations, language: Language = "en"): string => {
  return translations[language]?.[key] || translations.en?.[key] || key;
};

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export const api = createApi({
  reducerPath: "api",
  // Default is 60s — bumped so switching between pages you've already
  // visited this session reuses cached data instead of re-fetching and
  // showing the skeleton loader again every time.
  keepUnusedDataFor: 300,
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "Product",
    "Category",
    "Brand",
    "Supplier",
    "Purchase",
    "Sale",
    "Inventory",
    "Employee",
    "EmployeeTransaction",
    "Broker",
    "BrokerTransaction",
    "Expense",
    "Customer",
    "Due",
    "DuePayment",
    "Dashboard",
    "Report",
    "ActivityLog",
    "Settings",
    "Me",
    "Account",
  ],
  endpoints: (builder) => ({
    // --- auth ---
    signup: builder.mutation({
      query: (body) => ({ url: "/auth/signup", method: "POST", body }),
    }),
    login: builder.mutation({
      query: (credentials) => ({ url: "/auth/login", method: "POST", body: credentials }),
    }),
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["Me"],
    }),
    updateMe: builder.mutation({
      query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
    }),

    // --- catalog: products ---
    getProducts: builder.query({
      query: (params) => ({ url: "/products", params }),
      providesTags: ["Product"],
    }),
    getProduct: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: ["Product"],
    }),
    createProduct: builder.mutation({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: ["Product", "ActivityLog"],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Product", "ActivityLog"],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Product", "ActivityLog"],
    }),

    // --- catalog: categories / brands / suppliers ---
    getCategories: builder.query({
      query: () => "/categories",
      providesTags: ["Category"],
    }),
    createCategory: builder.mutation({
      query: (name) => ({ url: "/categories", method: "POST", body: { name } }),
      invalidatesTags: ["Category", "ActivityLog"],
    }),
    updateCategory: builder.mutation({
      query: ({ id, name }) => ({ url: `/categories/${id}`, method: "PATCH", body: { name } }),
      invalidatesTags: ["Category", "Product", "ActivityLog"],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
      invalidatesTags: ["Category", "ActivityLog"],
    }),
    getBrands: builder.query({
      query: () => "/brands",
      providesTags: ["Brand"],
    }),
    createBrand: builder.mutation({
      query: (name) => ({ url: "/brands", method: "POST", body: { name } }),
      invalidatesTags: ["Brand", "ActivityLog"],
    }),
    updateBrand: builder.mutation({
      query: ({ id, name }) => ({ url: `/brands/${id}`, method: "PATCH", body: { name } }),
      invalidatesTags: ["Brand", "Product", "ActivityLog"],
    }),
    deleteBrand: builder.mutation({
      query: (id) => ({ url: `/brands/${id}`, method: "DELETE" }),
      invalidatesTags: ["Brand", "ActivityLog"],
    }),
    getSuppliers: builder.query({
      query: () => "/suppliers",
      providesTags: ["Supplier"],
    }),
    createSupplier: builder.mutation({
      query: (body) => ({ url: "/suppliers", method: "POST", body }),
      invalidatesTags: ["Supplier", "ActivityLog"],
    }),
    updateSupplier: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/suppliers/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Supplier", "ActivityLog"],
    }),

    // --- purchases ---
    getPurchases: builder.query({
      query: (params) => ({ url: "/purchases", params }),
      providesTags: ["Purchase"],
    }),
    createPurchase: builder.mutation({
      query: (body) => ({ url: "/purchases", method: "POST", body }),
      invalidatesTags: ["Purchase", "Product", "Inventory", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- sales ---
    getSales: builder.query({
      query: (params) => ({ url: "/sales", params }),
      providesTags: ["Sale"],
    }),
    createSale: builder.mutation({
      query: (body) => ({ url: "/sales", method: "POST", body }),
      invalidatesTags: ["Sale", "Product", "Inventory", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- inventory ---
    getStockOverview: builder.query({
      query: (params) => ({ url: "/inventory", params }),
      providesTags: ["Inventory"],
    }),
    createAdjustment: builder.mutation({
      query: (body) => ({ url: "/inventory/adjustments", method: "POST", body }),
      invalidatesTags: ["Product", "Inventory", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- employees ---
    getEmployees: builder.query({
      query: () => "/employees",
      providesTags: ["Employee"],
    }),
    createEmployee: builder.mutation({
      query: (body) => ({ url: "/employees", method: "POST", body }),
      invalidatesTags: ["Employee", "ActivityLog"],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/employees/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Employee", "ActivityLog"],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({ url: `/employees/${id}`, method: "DELETE" }),
      invalidatesTags: ["Employee", "ActivityLog"],
    }),
    getEmployeeTransactions: builder.query({
      query: (params) => ({ url: "/employees/transactions/all", params }),
      providesTags: ["EmployeeTransaction"],
    }),
    createEmployeeTransaction: builder.mutation({
      query: (body) => ({ url: "/employees/transactions", method: "POST", body }),
      invalidatesTags: ["EmployeeTransaction", "Employee", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- brokers ---
    getBrokers: builder.query({
      query: () => "/brokers",
      providesTags: ["Broker"],
    }),
    createBroker: builder.mutation({
      query: (body) => ({ url: "/brokers", method: "POST", body }),
      invalidatesTags: ["Broker", "ActivityLog"],
    }),
    updateBroker: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/brokers/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Broker", "ActivityLog"],
    }),
    deleteBroker: builder.mutation({
      query: (id) => ({ url: `/brokers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Broker", "ActivityLog"],
    }),
    getBrokerTransactions: builder.query({
      query: (params) => ({ url: "/brokers/transactions/all", params }),
      providesTags: ["BrokerTransaction"],
    }),
    createBrokerTransaction: builder.mutation({
      query: (body) => ({ url: "/brokers/transactions", method: "POST", body }),
      invalidatesTags: ["BrokerTransaction", "Broker", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- expenses ---
    getExpenses: builder.query({
      query: (params) => ({ url: "/expenses", params }),
      providesTags: ["Expense"],
    }),
    createExpense: builder.mutation({
      query: (body) => ({ url: "/expenses", method: "POST", body }),
      invalidatesTags: ["Expense", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- customers / dues / payments ---
    getCustomers: builder.query({
      query: () => "/customers",
      providesTags: ["Customer"],
    }),
    createCustomer: builder.mutation({
      query: (body) => ({ url: "/customers", method: "POST", body }),
      invalidatesTags: ["Customer", "ActivityLog"],
    }),
    getDues: builder.query({
      query: (params) => ({ url: "/dues", params }),
      providesTags: ["Due"],
    }),
    createDue: builder.mutation({
      query: (body) => ({ url: "/dues", method: "POST", body }),
      invalidatesTags: ["Due", "Customer", "Dashboard", "Report", "ActivityLog"],
    }),
    updateDue: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/dues/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Due", "Customer", "Dashboard", "Report", "ActivityLog"],
    }),
    deleteDue: builder.mutation({
      query: (id) => ({ url: `/dues/${id}`, method: "DELETE" }),
      invalidatesTags: ["Due", "Customer", "Dashboard", "Report", "ActivityLog"],
    }),
    getDuePayments: builder.query({
      query: (params) => ({ url: "/dues/payments", params }),
      providesTags: ["DuePayment"],
    }),
    createDuePayment: builder.mutation({
      query: (body) => ({ url: "/dues/payments", method: "POST", body }),
      invalidatesTags: ["Due", "DuePayment", "Customer", "Dashboard", "Report", "ActivityLog"],
    }),

    // --- dashboard / reports / activity / settings ---
    getDashboard: builder.query({
      query: () => "/dashboard",
      providesTags: ["Dashboard"],
    }),
    getReport: builder.query({
      query: (period) => ({ url: "/reports", params: { period } }),
      providesTags: ["Report"],
    }),
    getInvoice: builder.query({
      query: (params) => ({ url: "/reports/invoice", params }),
      providesTags: ["Report"],
    }),
    getActivityLogs: builder.query({
      query: (params) => ({ url: "/activity-logs", params }),
      providesTags: ["ActivityLog"],
    }),
    getSettings: builder.query({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({ url: "/settings", method: "PATCH", body }),
      invalidatesTags: ["Settings", "Inventory", "Dashboard", "ActivityLog"],
    }),

    // --- users (account management) ---
    getUsers: builder.query({
      query: () => "/users",
      providesTags: ["Account"],
    }),
    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({ url: `/users/${id}/role`, method: "PATCH", body: { role } }),
      invalidatesTags: ["Account", "ActivityLog"],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["Account", "ActivityLog"],
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useGetSalesQuery,
  useCreateSaleMutation,
  useGetStockOverviewQuery,
  useCreateAdjustmentMutation,
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeeTransactionsQuery,
  useCreateEmployeeTransactionMutation,
  useGetBrokersQuery,
  useCreateBrokerMutation,
  useUpdateBrokerMutation,
  useDeleteBrokerMutation,
  useGetBrokerTransactionsQuery,
  useCreateBrokerTransactionMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useGetDuesQuery,
  useCreateDueMutation,
  useUpdateDueMutation,
  useDeleteDueMutation,
  useGetDuePaymentsQuery,
  useCreateDuePaymentMutation,
  useGetDashboardQuery,
  useGetReportQuery,
  useLazyGetInvoiceQuery,
  useGetActivityLogsQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
} = api;

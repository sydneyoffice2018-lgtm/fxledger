export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  active?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  wechat?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id';
  idNumber?: string;
  idExpiry?: string;
  dateOfBirth?: string;
  bankName?: string;
  bankAccount?: string;
  bankBsb?: string;
  notes?: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  customerId: number;
  currency: string;
  balance: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  customerId: number;
  walletId: number;
  type: 'deposit' | 'withdrawal' | 'exchange_in' | 'exchange_out' | 'transfer_in' | 'transfer_out';
  currency: string;
  amount: string;
  balanceAfter: string;
  note?: string;
  exchangeOrderId?: number;
  createdAt: string;
  customerName?: string;
}

export interface ExchangeOrder {
  id: number;
  customerId: number;
  supplierId?: number;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  marketRate: string;
  ourRate: string;
  feeRate: string;
  feeAmount: string;
  profit: string;
  note?: string;
  createdAt: string;
  customerName?: string;
  supplierName?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  wechat?: string;
  bankName?: string;
  bankAccount?: string;
  bankBsb?: string;
  supportedCurrencies: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: number;
  supplierId: number;
  exchangeOrderId: number;
  customerId: number;
  currency: string;
  amount: string;
  status: 'pending' | 'completed' | 'cancelled';
  note?: string;
  completedAt?: string;
  createdAt: string;
  supplierName?: string;
  customerName?: string;
  customerBankName?: string;
  customerBankAccount?: string;
  customerBankBsb?: string;
  orderFromCurrency?: string;
  orderToCurrency?: string;
  orderFromAmount?: string;
  orderToAmount?: string;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedAt: string;
}

export interface DashStats {
  todayExchanges: number;
  todayProfit: number;
  monthExchanges: number;
  monthProfit: number;
  totalCustomers: number;
  recentTransactions: Transaction[];
}

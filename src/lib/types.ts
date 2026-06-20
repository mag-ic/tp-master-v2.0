
export enum StockStatus {
  IN_STOCK = 'En stock',
  LOW_STOCK = 'Stock bas',
  OUT_OF_STOCK = 'Rupture de stock'
}

export enum PaymentStatus {
  PAID = 'Payé',
  PARTIAL = 'Partiel',
  UNPAID = 'Non payé',
  OVERDUE = 'En retard'
}

export enum PaymentMethod {
  CHEQUE = 'Chèque',
  VIREMENT = 'Virement',
  ESPECES = 'Espèces',
  AVANCE = 'Avance'
}

export enum ChequeStatus {
  RECEIVED = 'Reçu',
  DEPOSITED = 'Déposé',
  CLEARED = 'Encaissé',
  BOUNCED = 'Impayé'
}

export enum SAVStatus {
  NEW = 'Nouveau',
  DIAGNOSTIC = 'Diagnostic',
  REPAIR = 'En réparation',
  EXCHANGE = 'Échange',
  CLOSED = 'Clôturé'
}

export type EntityType = 'client' | 'supplier';
export type StockType = 'NEUF' | 'DECLASSE';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  email: string;
  phone: string;
  address: string;
  city?: string;
  ice?: string;
  ifId?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  declassedStock: number;
}

export interface SparePart {
  id: string;
  name: string;
  sku: string;
  productId: string;
  productName: string;
  stock: number;
  price: number;
  category: string;
}

export interface InvoiceItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
}

export interface PaymentHistoryEntry {
  date: string;
  amount: number;
  method: PaymentMethod;
  chequeId?: string;
}

export interface Cheque {
  id: string;
  number: string;
  bank: string;
  amount: number;
  dueDate: string;
  receivedDate: string;
  status: ChequeStatus;
  reference: string; // Numéro de facture ou BL
  partnerName: string;
  type: 'IN' | 'OUT'; // IN pour client, OUT pour fournisseur
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  date: string;
  dueDate: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  isReceived?: boolean;
  items: InvoiceItem[];
  history?: PaymentHistoryEntry[];
}

export interface Charge {
  id: string;
  reference?: string;
  supplierName?: string;
  description: string;
  category: string;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  date: string;
  method: PaymentMethod;
  history?: PaymentHistoryEntry[];
  responsible?: string;
}

export interface DeliveryItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number; // HT
  totalPrice: number; // HT
  stockType: StockType;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  items: DeliveryItem[];
  totalHT: number;
  totalTTC: number;
  date: string;
  paymentMethod: PaymentMethod;
  clientId: string;
  clientName: string;
}

export interface StockEntryItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number; // HT
}

export interface StockEntry {
  id: string;
  entryNumber: string;
  purchaseOrderNumber: string;
  items: StockEntryItem[];
  totalHT: number;
  totalTTC: number;
  date: string;
  supplierId: string;
  supplierName: string;
  attachmentUrl?: string;
  linkedAdvanceIds?: string[];
}

export interface SAVTicket {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  description: string;
  solution?: string;
  status: SAVStatus;
  createdAt: string;
  updatedAt: string;
  cost?: number;
}

export interface Apport {
  id: string;
  reference: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  description: string;
}

export interface SupplierAdvance {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  method: PaymentMethod;
  description: string;
  status: 'DISPONIBLE' | 'UTILISÉE' | 'ANNULÉE';
  linkedEntryNumber?: string;
}

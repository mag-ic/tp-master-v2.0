import { Product, Payment, Entity, Charge, SAVTicket, PaymentStatus, PaymentMethod, SAVStatus, Cheque, ChequeStatus } from './types';

// Logo Trading Partnerships
export const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAABQBAMAAAD1pGfRAAAAG1BMVEUAAABrYmY6OjpqYmZqYmZqYmZqYmZqYmZqYmZqYmZ/pU10AAAACXRSTlMAESIzRFVmd4iZp70nAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+YDBxEVKx8Zt+8AAAL2SURBVHja7ZtNb9NAEIZf766drpM2atNKaSstUqoqVatUVarSUnGptFTcVlxqXFpcapxaXFpcWpxaXFpcWpxaXFpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwaXFqcGlxanBpcWpwAfgH9gYIDlP0BwAAAABJRU5ErkJggg==';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'MacBook Pro M3 14"', sku: 'AAPL-MBP-M3-14', category: 'Informatique', price: 18500, stock: 12, minStock: 5 },
  { id: 'prod-2', name: 'Écran Dell UltraSharp 27"', sku: 'DELL-U2723QE', category: 'Périphériques', price: 4200, stock: 3, minStock: 5 },
  { id: 'prod-3', name: 'Souris Logitech MX Master 3S', sku: 'LOGI-MX3S', category: 'Accessoires', price: 850, stock: 25, minStock: 10 },
  { id: 'prod-4', name: 'Clavier Keychron K2 V2', sku: 'KCHR-K2-V2', category: 'Accessoires', price: 1100, stock: 8, minStock: 5 },
  { id: 'prod-5', name: 'Serveur NAS Synology DS923+', sku: 'SYNO-DS923', category: 'Informatique', price: 5800, stock: 2, minStock: 3 }
];

export const INITIAL_CONTACTS: Entity[] = [
  { id: 'ent-1', name: 'ALFA SOLUTIONS SARL', type: 'client', email: 'contact@alfasolutions.ma', phone: '0522445566', address: 'Angle Bd Zerktouni, Casablanca', ice: '001554433220001', ifId: '45896321' },
  { id: 'ent-2', name: 'DIGITAL CONNECT', type: 'client', email: 'billing@digitalconnect.ma', phone: '0661223344', address: 'Rue Ibn Toufail, Marrakech', ice: '002887766550012', ifId: '12547896' },
  { id: 'ent-3', name: 'TECH DISTRI MAROC', type: 'supplier', email: 'sales@techdistri.com', phone: '0522112233', address: 'ZI Sapino, Nouaceur', ice: '003998877660045', ifId: '98745632' },
  { id: 'ent-4', name: 'OFFICE SUPPLY AGADIR', type: 'supplier', email: 'info@officesupply.ma', phone: '0528223344', address: 'Avenue Hassan II, Agadir', ice: '001112223330099', ifId: '33366699' }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1', invoiceNumber: 'INV-24-001', customerName: 'ALFA SOLUTIONS SARL', amount: 22200, paidAmount: 22200, date: '2024-03-01', dueDate: '2024-03-15', status: PaymentStatus.PAID, method: PaymentMethod.VIREMENT, isReceived: true,
    items: [{ productName: 'MacBook Pro M3 14"', sku: 'AAPL-MBP-M3-14', quantity: 1, unitPriceHT: 18500, totalHT: 18500 }],
    history: [{ date: '2024-03-02', amount: 22200, method: PaymentMethod.VIREMENT }]
  },
  {
    id: 'pay-2', invoiceNumber: 'INV-24-002', customerName: 'DIGITAL CONNECT', amount: 15120, paidAmount: 5000, date: '2024-03-10', dueDate: '2024-03-24', status: PaymentStatus.PARTIAL, method: PaymentMethod.CHEQUE, isReceived: false,
    items: [{ productName: 'Écran Dell UltraSharp 27"', sku: 'DELL-U2723QE', quantity: 3, unitPriceHT: 4200, totalHT: 12600 }],
    history: [{ date: '2024-03-11', amount: 5000, method: PaymentMethod.CHEQUE }]
  },
  {
    id: 'pay-3', invoiceNumber: 'INV-24-010', customerName: 'ALFA SOLUTIONS SARL', amount: 60850, paidAmount: 60850, date: '2024-03-15', dueDate: '2024-03-30', status: PaymentStatus.PAID, method: PaymentMethod.CHEQUE, isReceived: true,
    items: [{ productName: 'Lot Matériel Informatique', sku: 'LOT-INFO', quantity: 1, unitPriceHT: 50708.33, totalHT: 50708.33 }],
    history: [{ date: '2024-03-15', amount: 60850, method: PaymentMethod.CHEQUE }]
  }
];

export const INITIAL_CHARGES: Charge[] = [
  { id: 'chg-1', reference: 'AR-24-001', supplierName: 'TECH DISTRI MAROC', description: 'Achat initial stock', category: 'Marchandises', amount: 45000, paidAmount: 15000, status: PaymentStatus.PARTIAL, date: '2024-02-25', method: PaymentMethod.CHEQUE, history: [{ date: '2024-02-26', amount: 15000, method: PaymentMethod.CHEQUE }] },
  { id: 'chg-2', description: 'Loyer Bureau Casablanca', category: 'Loyer', amount: 7500, paidAmount: 7500, status: PaymentStatus.PAID, date: '2024-03-01', method: PaymentMethod.VIREMENT, history: [{ date: '2024-03-01', amount: 7500, method: PaymentMethod.VIREMENT }] }
];

export const INITIAL_SAV_TICKETS: SAVTicket[] = [
  { id: 'sav-1', ticketNumber: 'SAV-884422', clientId: 'ent-1', clientName: 'ALFA SOLUTIONS SARL', productId: 'prod-1', productName: 'MacBook Pro M3 14"', description: 'Pixels morts sur l\'écran', status: SAVStatus.DIAGNOSTIC, createdAt: '2024-03-12', updatedAt: '2024-03-14', cost: 0 }
];

export const INITIAL_CHEQUES: Cheque[] = [
  { id: 'chq-1', number: 'CH-990011', bank: 'Attijariwafa Bank', amount: 5000, dueDate: '2024-03-20', receivedDate: '2024-03-10', status: ChequeStatus.RECEIVED, reference: 'INV-24-002', partnerName: 'DIGITAL CONNECT', type: 'IN' },
  { id: 'chq-2', number: 'CH-884455', bank: 'BMCE', amount: 15000, dueDate: '2024-03-05', receivedDate: '2024-02-25', status: ChequeStatus.DEPOSITED, reference: 'AR-24-001', partnerName: 'TECH DISTRI MAROC', type: 'OUT' },
  { id: 'chq-3', number: 'CH-772233', bank: 'CIH Bank', amount: 12500, dueDate: '2024-02-15', receivedDate: '2024-02-01', status: ChequeStatus.CLEARED, reference: 'INV-23-999', partnerName: 'ALFA SOLUTIONS SARL', type: 'IN' },
  { id: 'chq-4', number: 'CH-112233', bank: 'BCP', amount: 8400, dueDate: '2024-03-18', receivedDate: '2024-03-15', status: ChequeStatus.BOUNCED, reference: 'INV-24-005', partnerName: 'CLIENT DIVERS', type: 'IN' },
  { id: 'chq-5', number: '665682', bank: 'Banque Populaire', amount: 60850, dueDate: '2024-04-10', receivedDate: '2024-03-15', status: ChequeStatus.RECEIVED, reference: 'INV-24-010', partnerName: 'ALFA SOLUTIONS SARL', type: 'IN' }
];

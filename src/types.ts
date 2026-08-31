export interface Person {
  email: string;
  fullName?: string;
  bankAccount?: string;
  bankType?: 'CBE' | 'Telebirr';
  lastPaidAt?: string;
}

export interface Division {
  id: string;
  name: string;
  emails: string[]; // references Person.email
}

export interface PayoutRecord {
  name: string;
  email: string;
  earned: number; // USD
  paid: number;   // USD
  flagged: number; // USD
  owed: number;   // USD
  originalOwed?: number; // baseline limit for conversational planning
  bankAccount?: string; // matched from DB
  bankType?: 'CBE' | 'Telebirr'; // matched from DB
  fullNameDB?: string; // matched from DB
  owedETB?: number; // calculated: owed * exchangeRate
  selected: boolean; // UI selection for payout inclusion
  lastPaidAt?: string; // matched from DB
}

export interface GoogleApiConfig {
  clientId: string;
  apiKey: string;
  spreadsheetId: string;
}

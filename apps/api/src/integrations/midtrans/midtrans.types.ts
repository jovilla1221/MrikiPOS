export interface CreateQrisChargeInput {
  orderId: string;
  grossAmount: number;
  customerDetails?: {
    first_name?: string;
    phone?: string;
  };
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface QrisChargeResponse {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  orderId: string;
  grossAmount: string;
  paymentType: string;
  transactionTime: string;
  transactionStatus: string;
  qrString?: string;
  qrUrl?: string;
  actions?: Array<{
    name: string;
    method: string;
    url: string;
  }>;
  rawResponse?: Record<string, any>;
}

export interface MidtransStatusResponse {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  orderId: string;
  grossAmount: string;
  paymentType: string;
  transactionTime: string;
  transactionStatus: string;
  fraudStatus?: string;
  signatureKey?: string;
}

export interface MidtransWebhookPayload {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency?: string;
  settlement_time?: string;
  expiry_time?: string;
}

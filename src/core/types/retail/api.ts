export interface ApiAuthHeaders {
  "x-client-id": string;
  "x-client-secret": string;
}

export interface PublicProductDTO {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockLevel: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  category: string;
  maxQuantity: number;
}

export interface PublicOrderItemDTO {
  sku: string;
  quantity: number;
}

export interface PublicOrderRequestDTO {
  externalReference: string; // e.g. Shopify Order ID
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: PublicOrderItemDTO[];
  shippingAddress?: string;
  paymentStatus: "PAID" | "PENDING";
  paymentMethod: string;
}

export interface PublicOrderResponseDTO {
  orderId: string;
  status: "RECEIVED" | "PROCESSING" | "REJECTED";
  totalAmount: number;
  estimatedDelivery?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  code: number; // HTTP Status Code equivalent
  details?: string;
}

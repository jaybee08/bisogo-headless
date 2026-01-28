export type CartItem = {
  key: string; // unique (productId + variationId + attributes)
  productId: number;
  variationId?: number;
  slug: string;
  name: string;
  image?: string | null;
  price: number; // numeric, in store currency
  currency?: string;
  quantity: number;
  attributes?: Record<string, string>; // chosen attributes for variants
};

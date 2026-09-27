export interface ServiceProductUsage {
  productId: number;
  productName: string;
  quantityMl: number;
  unitValue: number;
  productValue: number;
  chargedValue?: number;
}

export interface ServiceRecord {
  id?: number;
  name: string;
  items: ServiceProductUsage[];
  operationalValue: number;
  totalProductValue: number;
  totalValue: number;
}

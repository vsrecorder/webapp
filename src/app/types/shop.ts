export type ShopType = {
  id: number;
  name: string;
  zip_code: string;
  prefecture_id: number;
  prefecture_name: string;
  address: string;
  tel: string;
  business_hours: string;
  url: string;
};

export type ShopGetResponseType = {
  keyword: string;
  count: number;
  shops: ShopType[];
};

interface ProductWithSizes {
  sizes: { ml: number; price: number }[];
}

/** Returns undefined if the product has no size at that exact ml - the caller decides how to handle it. */
export function unitPriceForMl(product: ProductWithSizes, ml: number): number | undefined {
  return product.sizes.find((s) => s.ml === ml)?.price;
}

import { fetchStore, json, PRODUCT_IDS, publicProduct } from "./_store.mjs";

export async function GET() {
  try {
    const ids = PRODUCT_IDS.join(",");
    const data = await fetchStore(`/wp-json/wc/store/v1/products?include=${ids}&per_page=${PRODUCT_IDS.length}`);
    if (!Array.isArray(data)) throw new Error("Unexpected catalog response");
    const products = PRODUCT_IDS.map(id => data.find(product => product.id === id))
      .filter(product => product?.type === "variable" && product.is_in_stock && product.is_purchasable)
      .map(publicProduct);
    if (products.length === 0) throw new Error("No available knits");
    return json({ products }, 200, "public, max-age=60");
  } catch (error) {
    console.error("Knit catalog request failed", error);
    return json({ error: "The knit collection is temporarily unavailable." }, 503);
  }
}

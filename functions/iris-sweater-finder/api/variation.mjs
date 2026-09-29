import { fetchStore, json, PRODUCT_IDS, publicProduct } from "./_store.mjs";

export async function GET(request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1 || id > 10000000) {
    return json({ error: "Choose a valid variation." }, 400);
  }
  try {
    const product = await fetchStore(`/wp-json/wc/store/v1/products/${id}`);
    if (product.type !== "variation" || !PRODUCT_IDS.includes(product.parent)) {
      return json({ error: "That variation is not part of this knit edit." }, 404);
    }
    return json({ product: publicProduct(product) });
  } catch (error) {
    console.error("Knit variation request failed", error);
    return json({ error: "We could not confirm that style right now." }, 503);
  }
}

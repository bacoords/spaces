export const STORE_ORIGIN = "https://woo-demo-store-10-9.mystagingwebsite.com";
export const PRODUCT_IDS = [820, 819, 818, 817, 44, 43, 41];

export function publicProduct(product) {
  return {
    id: product.id,
    parent: product.parent,
    type: product.type,
    name: product.name,
    permalink: product.permalink,
    variation: product.variation,
    prices: product.prices,
    images: (product.images || []).map(({ src, alt, name }) => ({ src, alt, name })),
    attributes: (product.attributes || []).map(({ name, terms }) => ({ name, terms })),
    variations: product.variations || [],
    is_in_stock: product.is_in_stock,
    is_purchasable: product.is_purchasable
  };
}

export function json(data, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff"
    }
  });
}

export async function fetchStore(path) {
  const url = new URL(path, STORE_ORIGIN);
  if (url.origin !== STORE_ORIGIN || !url.pathname.startsWith("/wp-json/wc/store/v1/products")) {
    throw new Error("Invalid store path");
  }
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Store API returned ${response.status}`);
  return response.json();
}

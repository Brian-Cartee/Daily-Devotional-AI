export interface PlayProduct {
  itemId: string;
  title: string;
  description: string;
  price: string;
}

export interface PlayPurchaseResult {
  purchaseToken: string;
  productId: string;
}

const PLAY_BILLING_METHOD = "https://play.google.com/billing";

export async function getPlayProducts(skus: string[]): Promise<PlayProduct[]> {
  try {
    const service = await (window as any).getDigitalGoodsService(PLAY_BILLING_METHOD);
    const details = await service.getDetails(skus);
    return details.map((d: any) => ({
      itemId: d.itemId,
      title: d.title,
      description: d.description,
      price: d.price?.value ? `${d.price.value} ${d.price.currency}` : "",
    }));
  } catch {
    return [];
  }
}

export async function purchasePlayProduct(sku: string): Promise<PlayPurchaseResult | null> {
  try {
    const request = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }],
      { total: { label: "Total", amount: { currency: "USD", value: "0" } } }
    );
    const canMake = await request.canMakePayment();
    if (!canMake) return null;

    const response = await request.show();
    const token = response.details?.purchaseToken;
    if (!token) {
      await response.complete("fail");
      return null;
    }
    await response.complete("success");
    return { purchaseToken: token, productId: sku };
  } catch {
    return null;
  }
}

export async function verifyPlayPurchase(purchaseToken: string, productId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/payments/play-billing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseToken, productId }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

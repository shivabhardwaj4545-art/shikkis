import defaultDb from '../db/client.js';

export interface CartItemInput {
  variant_id: string;
  quantity: number;
}

export interface CartLineItem {
  variant_id: string;
  product_id: string;
  category_id: string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  image_url: string;
  quantity: number;
  stock: number;
  unit_mrp_paise: number;
  unit_product_discount_percent: number;
  unit_base_price_paise: number;
  unit_auto_discount_paise: number;
  unit_final_price_paise: number;
  line_mrp_paise: number;
  line_subtotal_paise: number;
  applied_auto_offer?: {
    id: string;
    name: string;
    discount_paise: number;
  };
}

export interface NamedDiscount {
  offer_id: string;
  name: string;
  code: string | null;
  discount_paise: number;
}

export interface CartBreakdown {
  items: CartLineItem[];
  subtotal_mrp_paise: number;
  subtotal_paise: number; // after base product discounts
  total_discount_paise: number;
  discounts: NamedDiscount[];
  coupon?: {
    code: string;
    name: string;
    discount_paise: number;
  } | undefined;
  coupon_error?: string | undefined;
  shipping_paise: number;
  tax_paise: number;
  total_paise: number;
  applied_offers: Array<{
    id: string;
    name: string;
    type: string;
    discount_paise: number;
  }>;
}

interface OfferDbRow {
  id: string;
  name: string;
  code: string | null;
  type: 'percent' | 'flat' | 'bxgy' | 'free_shipping';
  value: number;
  max_discount: number | null;
  min_cart_value: number;
  starts_at: string;
  ends_at: string;
  is_active: number;
  stackable: number;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  scope: 'all' | 'category' | 'product';
  scope_ids: string;
  priority: number;
}

/**
 * Pure function: calculateCart
 * The authoritative, single source of truth for all discount and pricing calculations.
 * Used identically by cart preview and order placement.
 */
export async function calculateCart(
  itemsInput: CartItemInput[],
  userId?: string,
  couponCode?: string,
  dbOverride?: any
): Promise<CartBreakdown> {
  const db = dbOverride || defaultDb;

  // 1. Handle empty cart
  if (!itemsInput || itemsInput.length === 0) {
    return {
      items: [],
      subtotal_mrp_paise: 0,
      subtotal_paise: 0,
      total_discount_paise: 0,
      discounts: [],
      shipping_paise: 0,
      tax_paise: 0,
      total_paise: 0,
      applied_offers: [],
    };
  }

  // 2. Fetch product & variant details
  const getVariantStmt = db.prepare(`
    SELECT
      pv.id as variant_id, pv.product_id, pv.size, pv.color, pv.stock, pv.price_override,
      p.category_id, p.name as product_name, p.mrp, p.discount_percent, p.sku, p.images
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = ? AND pv.is_active = 1 AND p.is_active = 1
  `);

  const lineItems: CartLineItem[] = [];
  let subtotalMrp = 0;
  let subtotalBase = 0;

  for (const item of itemsInput) {
    if (item.quantity <= 0) continue;

    const row = (await getVariantStmt.get(item.variant_id)) as any;
    if (!row) continue;

    const unitMrp = Number(row.price_override ?? row.mrp);
    const baseDiscount = Math.round((unitMrp * Number(row.discount_percent)) / 100);
    const unitBasePrice = unitMrp - baseDiscount;

    let images: string[] = [];
    try {
      images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [];
    } catch {
      images = [];
    }

    const lineMrp = unitMrp * item.quantity;
    const lineSubtotal = unitBasePrice * item.quantity;

    subtotalMrp += lineMrp;
    subtotalBase += lineSubtotal;

    lineItems.push({
      variant_id: row.variant_id,
      product_id: row.product_id,
      category_id: row.category_id,
      product_name: row.product_name,
      sku: row.sku,
      size: row.size,
      color: row.color,
      image_url: images[0] || '/placeholder.jpg',
      quantity: item.quantity,
      stock: Number(row.stock),
      unit_mrp_paise: unitMrp,
      unit_product_discount_percent: Number(row.discount_percent),
      unit_base_price_paise: unitBasePrice,
      unit_auto_discount_paise: 0,
      unit_final_price_paise: unitBasePrice,
      line_mrp_paise: lineMrp,
      line_subtotal_paise: lineSubtotal,
    });
  }

  // 3. Load active offers where is_active = 1 and now between starts_at and ends_at
  const activeOffers = (await db
    .prepare(`
      SELECT *
      FROM offers
      WHERE is_active = 1
        AND CURRENT_TIMESTAMP BETWEEN starts_at AND ends_at
      ORDER BY priority DESC
    `)
    .all()) as OfferDbRow[];

  const appliedOffers: Array<{ id: string; name: string; type: string; discount_paise: number }> = [];
  const discounts: NamedDiscount[] = [];
  let nonStackableAutoApplied = false;

  // 4. Apply auto-offers (code IS NULL) matching scope
  const autoOffers = activeOffers.filter((o) => o.code === null || o.code === '');

  for (const offer of autoOffers) {
    const minCartValue = Number(offer.min_cart_value);
    const offerValue = Number(offer.value);
    const maxDiscount = offer.max_discount !== null ? Number(offer.max_discount) : null;

    // Check minimum cart value
    if (minCartValue > 0 && subtotalBase < minCartValue) {
      continue;
    }

    // Check usage limit
    if (offer.usage_limit && Number(offer.used_count) >= Number(offer.usage_limit)) {
      continue;
    }

    // Check per_user_limit
    if (userId && Number(offer.per_user_limit) > 0) {
      const redemptions = (await db
        .prepare('SELECT COUNT(*) as count FROM offer_redemptions WHERE offer_id = ? AND user_id = ?')
        .get(offer.id, userId)) as { count: string | number };
      if (redemptions && Number(redemptions.count) >= Number(offer.per_user_limit)) {
        continue;
      }
    }

    // Determine matching line items by scope
    let matchingItems: CartLineItem[] = [];
    if (offer.scope === 'all') {
      matchingItems = lineItems;
    } else if (offer.scope === 'category') {
      try {
        const catIds: string[] = typeof offer.scope_ids === 'string' ? JSON.parse(offer.scope_ids || '[]') : offer.scope_ids || [];
        matchingItems = lineItems.filter((it) => catIds.includes(it.category_id));
      } catch {
        matchingItems = [];
      }
    } else if (offer.scope === 'product') {
      try {
        const prdIds: string[] = typeof offer.scope_ids === 'string' ? JSON.parse(offer.scope_ids || '[]') : offer.scope_ids || [];
        matchingItems = lineItems.filter((it) => prdIds.includes(it.product_id));
      } catch {
        matchingItems = [];
      }
    }

    if (matchingItems.length === 0) continue;

    let offerTotalDiscount = 0;

    if (offer.type === 'percent') {
      for (const it of matchingItems) {
        const lineDiscount = Math.round((it.line_subtotal_paise * offerValue) / 100);
        offerTotalDiscount += lineDiscount;
      }
      if (maxDiscount !== null && offerTotalDiscount > maxDiscount) {
        offerTotalDiscount = maxDiscount;
      }
    } else if (offer.type === 'flat') {
      const matchingSubtotal = matchingItems.reduce((acc, it) => acc + it.line_subtotal_paise, 0);
      offerTotalDiscount = Math.min(offerValue, matchingSubtotal);
      if (maxDiscount !== null && offerTotalDiscount > maxDiscount) {
        offerTotalDiscount = maxDiscount;
      }
    }

    if (offerTotalDiscount > 0) {
      // Distribute discount across matching lines
      const matchingSubtotal = matchingItems.reduce((acc, it) => acc + it.line_subtotal_paise, 0);
      let distributedSoFar = 0;

      for (let i = 0; i < matchingItems.length; i++) {
        const it = matchingItems[i];
        let lineShare = 0;
        if (i === matchingItems.length - 1) {
          lineShare = offerTotalDiscount - distributedSoFar;
        } else {
          lineShare = Math.round((it.line_subtotal_paise / matchingSubtotal) * offerTotalDiscount);
          distributedSoFar += lineShare;
        }

        const unitShare = Math.round(lineShare / it.quantity);
        it.unit_auto_discount_paise += unitShare;
        it.unit_final_price_paise = Math.max(0, it.unit_base_price_paise - it.unit_auto_discount_paise);
        it.applied_auto_offer = {
          id: offer.id,
          name: offer.name,
          discount_paise: lineShare,
        };
      }

      discounts.push({
        offer_id: offer.id,
        name: offer.name,
        code: null,
        discount_paise: offerTotalDiscount,
      });

      appliedOffers.push({
        id: offer.id,
        name: offer.name,
        type: offer.type,
        discount_paise: offerTotalDiscount,
      });

      if (!offer.stackable) {
        nonStackableAutoApplied = true;
      }

      // Stop after highest priority auto-offer if non-stackable
      if (!offer.stackable) break;
    }
  }

  // Subtotal after auto discounts
  const autoDiscountTotal = discounts.reduce((acc, d) => acc + d.discount_paise, 0);
  let currentSubtotal = Math.max(0, subtotalBase - autoDiscountTotal);

  // 5. Apply Coupon if supplied
  let couponResult: { code: string; name: string; discount_paise: number } | undefined;
  let couponError: string | undefined;
  let freeShippingApplied = false;

  if (couponCode && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();

    // Query for coupon
    const couponOffer = (await db
      .prepare('SELECT * FROM offers WHERE UPPER(code) = ?')
      .get(cleanCode)) as OfferDbRow | undefined;

    const nowIso = new Date().toISOString();

    if (!couponOffer) {
      couponError = 'Invalid coupon code.';
    } else if (!couponOffer.is_active) {
      couponError = 'This coupon is no longer active.';
    } else if (couponOffer.starts_at > nowIso || couponOffer.ends_at < nowIso) {
      couponError = 'This coupon has expired.';
    } else if (nonStackableAutoApplied) {
      // Reject when a non-stackable auto-offer already applied
      couponError = 'Cannot combine coupon with current automatic promotional offers.';
    } else if (Number(couponOffer.min_cart_value) > 0 && currentSubtotal < Number(couponOffer.min_cart_value)) {
      const reqRupees = Math.round(Number(couponOffer.min_cart_value) / 100);
      couponError = `Minimum cart value of ₹${reqRupees} required for this coupon.`;
    } else if (couponOffer.usage_limit && Number(couponOffer.used_count) >= Number(couponOffer.usage_limit)) {
      couponError = 'Coupon usage limit has been reached.';
    } else if (userId && Number(couponOffer.per_user_limit) > 0) {
      const redemptions = (await db
        .prepare('SELECT COUNT(*) as count FROM offer_redemptions WHERE offer_id = ? AND user_id = ?')
        .get(couponOffer.id, userId)) as { count: string | number };
      if (redemptions && Number(redemptions.count) >= Number(couponOffer.per_user_limit)) {
        couponError = 'You have already used this coupon the maximum allowed number of times.';
      }
    }

    // If no error, calculate coupon discount
    if (!couponError && couponOffer) {
      let couponDiscount = 0;
      const offerVal = Number(couponOffer.value);
      const maxDisc = couponOffer.max_discount !== null ? Number(couponOffer.max_discount) : null;

      if (couponOffer.type === 'percent') {
        couponDiscount = Math.round((currentSubtotal * offerVal) / 100);
        if (maxDisc !== null && couponDiscount > maxDisc) {
          couponDiscount = maxDisc;
        }
      } else if (couponOffer.type === 'flat') {
        couponDiscount = Math.min(offerVal, currentSubtotal);
        if (maxDisc !== null && couponDiscount > maxDisc) {
          couponDiscount = maxDisc;
        }
      } else if (couponOffer.type === 'free_shipping') {
        freeShippingApplied = true;
      }

      if (couponDiscount > 0 || couponOffer.type === 'free_shipping') {
        couponResult = {
          code: couponOffer.code || cleanCode,
          name: couponOffer.name,
          discount_paise: couponDiscount,
        };

        if (couponDiscount > 0) {
          discounts.push({
            offer_id: couponOffer.id,
            name: couponOffer.name,
            code: couponOffer.code,
            discount_paise: couponDiscount,
          });

          appliedOffers.push({
            id: couponOffer.id,
            name: couponOffer.name,
            type: couponOffer.type,
            discount_paise: couponDiscount,
          });

          currentSubtotal = Math.max(0, currentSubtotal - couponDiscount);
        }
      }
    }
  }

  // 6. Calculate Shipping
  let shippingPaise = 15000;
  if (freeShippingApplied || currentSubtotal >= 250000 || currentSubtotal === 0) {
    shippingPaise = 0;
  }

  // 7. Calculate 5% GST Tax on final taxable subtotal
  const taxPaise = Math.round(currentSubtotal * 0.05);

  // 8. Total Amount
  const totalPaise = currentSubtotal + shippingPaise + taxPaise;
  const totalDiscountPaise = discounts.reduce((acc, d) => acc + d.discount_paise, 0);

  return {
    items: lineItems,
    subtotal_mrp_paise: subtotalMrp,
    subtotal_paise: currentSubtotal,
    total_discount_paise: totalDiscountPaise,
    discounts,
    coupon: couponResult,
    coupon_error: couponError,
    shipping_paise: shippingPaise,
    tax_paise: taxPaise,
    total_paise: totalPaise,
    applied_offers: appliedOffers,
  };
}

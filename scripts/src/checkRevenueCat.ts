import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProducts,
  listOfferings,
  listEntitlements,
  listPackages,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const IOS_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  console.log("=== PRODUCTS ===");
  const { data: products, error: productsError } = await listProducts({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (productsError) { console.error("Products error:", productsError); }
  else { console.log(JSON.stringify(products?.items?.map(p => ({ id: p.id, display_name: p.display_name, store_identifier: p.store_identifier, app_id: p.app_id, type: p.type })), null, 2)); }

  console.log("\n=== ENTITLEMENTS ===");
  const { data: entitlements, error: entitlementsError } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (entitlementsError) { console.error("Entitlements error:", entitlementsError); }
  else { console.log(JSON.stringify(entitlements?.items?.map(e => ({ id: e.id, display_name: e.display_name, lookup_key: e.lookup_key })), null, 2)); }

  console.log("\n=== OFFERINGS ===");
  const { data: offerings, error: offeringsError } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (offeringsError) { console.error("Offerings error:", offeringsError); }
  else {
    for (const offering of offerings?.items ?? []) {
      console.log(`Offering: ${offering.display_name} (${offering.lookup_key}) - ${offering.is_current ? "CURRENT" : "not current"}`);
      const { data: pkgs } = await listPackages({
        client,
        path: { project_id: PROJECT_ID, offering_id: offering.id },
        query: { limit: 20 },
      });
      for (const pkg of pkgs?.items ?? []) {
        console.log(`  Package: ${pkg.display_name} (${pkg.lookup_key})`);
      }
    }
  }

  console.log("\n=== iOS APP ID ===");
  console.log("Apple App Store App ID:", IOS_APP_ID);
}

main().catch(console.error);

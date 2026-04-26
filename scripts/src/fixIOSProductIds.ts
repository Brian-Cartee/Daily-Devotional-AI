import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProducts,
  createProduct,
  listOfferings,
  listPackages,
  getProductsFromPackage,
  attachProductsToPackage,
  detachProductsFromPackage,
  getProductsFromEntitlement,
  attachProductsToEntitlement,
  detachProductsFromEntitlement,
  listEntitlements,
  deleteProduct,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const IOS_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  // Step 1: Get existing iOS products
  const { data: products } = await listProducts({ client, path: { project_id: PROJECT_ID }, query: { limit: 20 } });
  const iosProducts = products!.items.filter((p) => p.app_id === IOS_APP_ID);
  const oldMonthly = iosProducts.find((p) => p.store_identifier === "shepherds_path_monthly")!;
  const oldAnnual = iosProducts.find((p) => p.store_identifier === "shepherds_path_annual")!;
  console.log("Old monthly:", oldMonthly.id, oldMonthly.store_identifier);
  console.log("Old annual:", oldAnnual.id, oldAnnual.store_identifier);

  // Step 2: Create new iOS products with correct store identifiers
  console.log("\nCreating new iOS monthly product with store_identifier: monthly_pro");
  const { data: newMonthly, error: newMonthlyErr } = await createProduct({
    client,
    path: { project_id: PROJECT_ID },
    body: {
      store_identifier: "monthly_pro",
      type: "subscription",
      app_id: IOS_APP_ID,
      display_name: "Monthly Pro – Shepherd's Path",
    } as any,
  });
  if (newMonthlyErr) { console.error("Failed to create monthly:", newMonthlyErr); return; }
  console.log("Created monthly:", newMonthly!.id, newMonthly!.store_identifier);

  console.log("\nCreating new iOS annual product with store_identifier: annual_pro");
  const { data: newAnnual, error: newAnnualErr } = await createProduct({
    client,
    path: { project_id: PROJECT_ID },
    body: {
      store_identifier: "annual_pro",
      type: "subscription",
      app_id: IOS_APP_ID,
      display_name: "Annual Pro – Shepherd's Path",
    } as any,
  });
  if (newAnnualErr) { console.error("Failed to create annual:", newAnnualErr); return; }
  console.log("Created annual:", newAnnual!.id, newAnnual!.store_identifier);

  // Step 3: Get offerings and packages
  const { data: offerings } = await listOfferings({ client, path: { project_id: PROJECT_ID }, query: { limit: 20 } });
  const currentOffering = offerings!.items.find((o) => o.is_current)!;
  console.log("\nCurrent offering:", currentOffering.id, currentOffering.lookup_key);

  const { data: pkgs } = await listPackages({ client, path: { project_id: PROJECT_ID, offering_id: currentOffering.id }, query: { limit: 20 } });
  const monthlyPkg = pkgs!.items.find((p) => p.lookup_key === "$rc_monthly")!;
  const annualPkg = pkgs!.items.find((p) => p.lookup_key === "$rc_annual")!;
  console.log("Monthly package:", monthlyPkg.id);
  console.log("Annual package:", annualPkg.id);

  // Step 4: Swap products in packages
  console.log("\nSwapping products in monthly package...");
  await detachProductsFromPackage({ client, path: { project_id: PROJECT_ID, offering_id: currentOffering.id, package_id: monthlyPkg.id }, body: { product_ids: [oldMonthly.id] } });
  await attachProductsToPackage({ client, path: { project_id: PROJECT_ID, offering_id: currentOffering.id, package_id: monthlyPkg.id }, body: { product_ids: [newMonthly!.id] } });
  console.log("Monthly package updated.");

  console.log("\nSwapping products in annual package...");
  await detachProductsFromPackage({ client, path: { project_id: PROJECT_ID, offering_id: currentOffering.id, package_id: annualPkg.id }, body: { product_ids: [oldAnnual.id] } });
  await attachProductsToPackage({ client, path: { project_id: PROJECT_ID, offering_id: currentOffering.id, package_id: annualPkg.id }, body: { product_ids: [newAnnual!.id] } });
  console.log("Annual package updated.");

  // Step 5: Swap products in entitlement
  const { data: entitlements } = await listEntitlements({ client, path: { project_id: PROJECT_ID }, query: { limit: 20 } });
  const proEntitlement = entitlements!.items.find((e) => e.lookup_key === "pro")!;
  console.log("\nUpdating entitlement:", proEntitlement.id);
  await detachProductsFromEntitlement({ client, path: { project_id: PROJECT_ID, entitlement_id: proEntitlement.id }, body: { product_ids: [oldMonthly.id, oldAnnual.id] } });
  await attachProductsToEntitlement({ client, path: { project_id: PROJECT_ID, entitlement_id: proEntitlement.id }, body: { product_ids: [newMonthly!.id, newAnnual!.id] } });
  console.log("Entitlement updated.");

  // Step 6: Delete old iOS products
  console.log("\nDeleting old iOS products...");
  await deleteProduct({ client, path: { project_id: PROJECT_ID, product_id: oldMonthly.id } });
  await deleteProduct({ client, path: { project_id: PROJECT_ID, product_id: oldAnnual.id } });
  console.log("Old products deleted.");

  console.log("\n✓ Done! RevenueCat iOS products now match App Store Connect:");
  console.log("  Monthly: monthly_pro");
  console.log("  Annual:  annual_pro");
}

main().catch(console.error);

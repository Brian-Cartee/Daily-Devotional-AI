import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Shepherd's Path";

// Monthly product
const MONTHLY_PRODUCT_IDENTIFIER = "shepherds_path_monthly";
const MONTHLY_PLAY_STORE_IDENTIFIER = "shepherds_path_monthly:monthly";
const MONTHLY_DISPLAY_NAME = "Monthly – Shepherd's Path";
const MONTHLY_USER_FACING_TITLE = "Shepherd's Path Monthly";
const MONTHLY_DURATION = "P1M";
const MONTHLY_PRICES = [
  { amount_micros: 5990000, currency: "USD" }, // $5.99
];

// Annual product
const ANNUAL_PRODUCT_IDENTIFIER = "shepherds_path_annual";
const ANNUAL_PLAY_STORE_IDENTIFIER = "shepherds_path_annual:annual";
const ANNUAL_DISPLAY_NAME = "Annual – Shepherd's Path";
const ANNUAL_USER_FACING_TITLE = "Shepherd's Path Annual";
const ANNUAL_DURATION = "P1Y";
const ANNUAL_PRICES = [
  { amount_micros: 44990000, currency: "USD" }, // $44.99
];

const APP_STORE_APP_NAME = "Shepherd's Path iOS";
const APP_STORE_BUNDLE_ID = "com.shepherdspath.app";
const PLAY_STORE_APP_NAME = "Shepherd's Path Android";
const PLAY_STORE_PACKAGE_NAME = "com.shepherdspath.app";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "Shepherd's Path Pro";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ────────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ───────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let app: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!app) throw new Error("No test store app found");
  console.log("Test store app:", app.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products ───────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeId: string,
    displayName: string,
    title: string,
    duration: string,
    isTestStore: boolean
  ): Promise<Product> => {
    const existing = existingProducts.items?.find((p) => p.store_identifier === storeId && p.app_id === targetApp.id);
    if (existing) { console.log(label + " product exists:", existing.id); return existing; }

    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = title;
    }

    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error("Failed to create " + label + " product");
    console.log("Created " + label + " product:", created.id);
    return created;
  };

  const monthlyTest = await ensureProduct(app, "Monthly Test", MONTHLY_PRODUCT_IDENTIFIER, MONTHLY_DISPLAY_NAME, MONTHLY_USER_FACING_TITLE, MONTHLY_DURATION, true);
  const monthlyAppStore = await ensureProduct(appStoreApp, "Monthly AppStore", MONTHLY_PRODUCT_IDENTIFIER, MONTHLY_DISPLAY_NAME, MONTHLY_USER_FACING_TITLE, MONTHLY_DURATION, false);
  const monthlyPlayStore = await ensureProduct(playStoreApp, "Monthly PlayStore", MONTHLY_PLAY_STORE_IDENTIFIER, MONTHLY_DISPLAY_NAME, MONTHLY_USER_FACING_TITLE, MONTHLY_DURATION, false);

  const annualTest = await ensureProduct(app, "Annual Test", ANNUAL_PRODUCT_IDENTIFIER, ANNUAL_DISPLAY_NAME, ANNUAL_USER_FACING_TITLE, ANNUAL_DURATION, true);
  const annualAppStore = await ensureProduct(appStoreApp, "Annual AppStore", ANNUAL_PRODUCT_IDENTIFIER, ANNUAL_DISPLAY_NAME, ANNUAL_USER_FACING_TITLE, ANNUAL_DURATION, false);
  const annualPlayStore = await ensureProduct(playStoreApp, "Annual PlayStore", ANNUAL_PLAY_STORE_IDENTIFIER, ANNUAL_DISPLAY_NAME, ANNUAL_USER_FACING_TITLE, ANNUAL_DURATION, false);

  // ── Test Store Prices ──────────────────────────────────────────────────────
  const addPrices = async (productId: string, prices: { amount_micros: number; currency: string }[], label: string) => {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: productId },
      body: { prices },
    });
    if (error) {
      if (error && typeof error === "object" && "type" in error && (error as any)["type"] === "resource_already_exists") {
        console.log(label + " prices already exist");
      } else {
        throw new Error("Failed to add " + label + " prices");
      }
    } else {
      console.log("Added " + label + " prices");
    }
  };

  await addPrices(monthlyTest.id, MONTHLY_PRICES, "Monthly");
  await addPrices(annualTest.id, ANNUAL_PRICES, "Annual");

  // ── Entitlement ────────────────────────────────────────────────────────────
  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existing = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existing) {
    console.log("Entitlement exists:", existing.id);
    entitlement = existing;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEnt.id);
    entitlement = newEnt;
  }

  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: [monthlyTest.id, monthlyAppStore.id, monthlyPlayStore.id, annualTest.id, annualAppStore.id, annualPlayStore.id] },
  });
  if (attachEntErr) {
    if ((attachEntErr as any).type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  // ── Offering ───────────────────────────────────────────────────────────────
  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ───────────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  const ensurePackage = async (lookupKey: string, displayName: string): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === lookupKey);
    if (existing) { console.log("Package exists:", existing.id); return existing; }
    const { data: newPkg, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering!.id },
      body: { lookup_key: lookupKey, display_name: displayName },
    });
    if (error) throw new Error("Failed to create package " + lookupKey);
    console.log("Created package:", newPkg.id);
    return newPkg;
  };

  const monthlyPkg = await ensurePackage("$rc_monthly", "Monthly");
  const annualPkg = await ensurePackage("$rc_annual", "Annual");

  const attachPackage = async (pkg: Package, products: Product[]) => {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: { products: products.map((p) => ({ product_id: p.id, eligibility_criteria: "all" as const })) },
    });
    if (error) {
      if ((error as any).type === "unprocessable_entity_error") {
        console.log("Products already attached to package", pkg.id);
      } else {
        throw new Error("Failed to attach products to package " + pkg.id);
      }
    } else {
      console.log("Attached products to package", pkg.id);
    }
  };

  await attachPackage(monthlyPkg, [monthlyTest, monthlyAppStore, monthlyPlayStore]);
  await attachPackage(annualPkg, [annualTest, annualAppStore, annualPlayStore]);

  // ── API Keys ───────────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: app.id } });
  const { data: appStoreKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: playStoreKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", app.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement:", ENTITLEMENT_IDENTIFIER);
  console.log("Public API Key - Test Store:", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Public API Key - App Store:", appStoreKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Public API Key - Play Store:", playStoreKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);

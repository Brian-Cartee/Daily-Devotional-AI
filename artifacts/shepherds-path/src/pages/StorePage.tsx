import { motion } from "framer-motion";
import { ShoppingBag, ExternalLink, Package } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { ShepherdCrookMark } from "@/components/ShepherdCrookMark";

const STORE_URL = "https://my-store-10fb787.creator-spring.com/";

const PRODUCTS = [
  {
    id: 1,
    name: "Find Your Path",
    type: "Unisex Hoodie",
    price: "$40.99",
    image: "https://mockup-api.teespring.com/v3/image/wBDhDxSUbmgkkOQWyG2hIIii2sU/800/800.jpg",
    url: "https://my-store-10fb787.creator-spring.com/listing/find-your-path-faith-cross-t?product=227&variation=2664",
    colors: ["#1a1a1a", "#2b52aa", "#1d2b4e"],
    colorNames: ["Black", "Royal Blue", "Navy"],
    accent: "from-primary via-violet-500 to-indigo-500",
    badge: "Most Popular",
  },
  {
    id: 2,
    name: "Find Your Path",
    type: "Classic Crew Tee",
    price: "$26.99",
    image: "https://mockup-api.teespring.com/v3/image/9eUPVMNvJ3ubK_Ep0hRHScViGe4/800/800.jpg",
    url: "https://my-store-10fb787.creator-spring.com/listing/find-your-path-faith-cross-t?product=2&variation=2232",
    colors: ["#6b4fa0", "#d9649e", "#1d2b4e", "#1a1a1a", "#4a6fa5"],
    colorNames: ["Purple", "Pink", "Navy", "Black", "Denim"],
    accent: "from-violet-500 via-primary to-amber-400",
    badge: null,
  },
  {
    id: 3,
    name: "Find Your Path",
    type: "Women's Classic Tee",
    price: "$26.99",
    image: "https://mockup-api.teespring.com/v3/image/5BZe0aHY3ZV_Tmi2BCaU4t9vM2Y/800/800.jpg",
    url: "https://my-store-10fb787.creator-spring.com/listing/find-your-path-faith-cross-t?product=87&variation=2325",
    colors: ["#1a1a1a", "#1d2b4e", "#6b4fa0"],
    colorNames: ["Black", "Navy", "Purple"],
    accent: "from-rose-400 via-violet-500 to-primary",
    badge: null,
  },
  {
    id: 4,
    name: "Find Your Path",
    type: "Faith Cross Mug",
    price: "$15.99",
    image: "https://mockup-api.teespring.com/v3/image/v2czRS_WcIEyei3pZ5QFFTk4VGk/800/800.jpg",
    url: "https://my-store-10fb787.creator-spring.com/listing/find-your-path-faith-cross-t?product=1565&variation=104921",
    colors: ["#1a1a1a", "#1d2b4e"],
    colorNames: ["Black", "Deep Navy"],
    accent: "from-amber-400 via-orange-400 to-primary",
    badge: "Great Gift",
  },
];

export default function StorePage() {
  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background pt-14 pb-32">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary/10 via-violet-500/5 to-amber-500/5 border-b border-border/40">
          <div className="max-w-xl mx-auto px-5 py-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm"
            >
              <ShepherdCrookMark className="w-8 h-8 text-primary opacity-90" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-2">Shepherd's Path Merch</p>
              <h1 className="text-[24px] font-bold text-foreground leading-tight mb-2">Wear your faith.</h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Simple designs. Faithful message. Every item ships print-on-demand — no inventory, always fresh.
              </p>
            </motion.div>
            <motion.a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              data-testid="link-visit-full-store"
              className="mt-5 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-[13px] font-semibold px-5 py-2 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Browse full store
              <ExternalLink className="w-3 h-3 opacity-60" />
            </motion.a>
          </div>
        </div>

        {/* Products */}
        <div className="max-w-xl mx-auto px-4 py-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">Current Collection</p>

          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.map((product, i) => (
              <motion.a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                data-testid={`card-product-${product.id}`}
                className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm flex flex-col group hover:shadow-md hover:border-primary/30 transition-all duration-200"
              >
                {/* Accent bar */}
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${product.accent}`} />

                {/* Badge */}
                {product.badge && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
                      {product.badge}
                    </span>
                  </div>
                )}

                {/* Product image */}
                <div className="aspect-square bg-muted/40 overflow-hidden">
                  <img
                    src={product.image}
                    alt={`${product.name} ${product.type}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="px-3 pt-3 pb-3 flex flex-col flex-1">
                  <p className="text-[11px] font-bold text-foreground leading-tight">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-tight">{product.type}</p>

                  {/* Color dots */}
                  <div className="flex items-center gap-1 mb-3">
                    {product.colors.map((color, j) => (
                      <div
                        key={j}
                        title={product.colorNames[j]}
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[14px] font-bold text-foreground">{product.price}</span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:gap-1.5 transition-all">
                      Shop
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Fulfillment note */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3.5"
          >
            <Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              All items are printed and shipped by Spring. Orders typically ship within 3–5 business days and arrive in 7–12 days (US). Checkout and fulfillment handled securely by Spring.
            </p>
          </motion.div>

          {/* Full store CTA */}
          <motion.a
            href={STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            data-testid="link-full-store-bottom"
            className="mt-4 flex items-center justify-center gap-2 w-full rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary text-[14px] font-semibold py-4 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            View all items on Spring
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </motion.a>
        </div>
      </div>
    </>
  );
}

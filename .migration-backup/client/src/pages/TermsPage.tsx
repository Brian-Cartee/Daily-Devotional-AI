import { useEffect } from "react";
import { Link } from "wouter";
import { NavBar } from "@/components/NavBar";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const YEAR = new Date().getFullYear();

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service — Shepherd's Path";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-2xl mx-auto px-5 pt-24 pb-28">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Terms of Service</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Last updated: January 2025</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            By using Shepherd's Path — whether through the web app, mobile app, or SMS service — you agree to these terms. We've written them plainly. Please read them.
          </p>

          {[
            {
              heading: "What Shepherd's Path is",
              body: "Shepherd's Path is a faith-based application providing daily devotionals, Bible study tools, guided journeys, prayer support, and Scripture-grounded reflection. It is designed to support and deepen personal faith — it is not a replacement for community, pastoral care, or professional counseling.",
            },
            {
              heading: "Using the app",
              body: "You may use Shepherd's Path for personal, non-commercial use. You agree not to misuse the service — including attempting to extract, scrape, or redistribute content or AI outputs at scale. You are responsible for how you use the guidance provided. Shepherd's Path does not provide medical, legal, or psychological advice.",
            },
            {
              heading: "SMS service",
              body: "By texting +1 (833) 962-9341, you opt into our SMS prayer and devotional service. Standard messaging rates may apply. Text STOP to unsubscribe at any time. Text HELP for assistance. We do not sell or share your phone number. See our Privacy Policy for how we handle SMS data.",
            },
            {
              heading: "Pro subscription",
              body: "Shepherd's Path offers optional paid features through a Pro subscription, billed monthly or annually. Payment is processed through the platform you use to subscribe: Stripe (web), Google Play Billing (Android), or Apple App Store (iOS). You may cancel at any time through the platform you subscribed on; cancellation takes effect at the end of your current billing period. For web subscriptions, refund requests are handled on a case-by-case basis — reach us at support@shepherdspathai.com. For Android and iOS subscriptions, refunds are subject to Google Play and Apple App Store policies respectively.",
            },
            {
              heading: "Content and AI",
              body: "Devotionals, reflections, prayers, and pastoral responses are generated with the assistance of AI and are grounded in Scripture. We do not claim these outputs are inspired Scripture or infallible. They are tools to support your engagement with God's Word. Always compare what you read against the Bible itself.",
            },
            {
              heading: "Intellectual property",
              body: "The Shepherd's Path name, logo, design, and original content are owned by Shepherd's Path. Scripture quotations are in the public domain (KJV, ASV, WEB) unless otherwise noted. You may share devotionals and reflections for personal and ministry use with attribution.",
            },
            {
              heading: "Availability",
              body: "We aim for Shepherd's Path to be available at all times, but we cannot guarantee uninterrupted service. We may update, modify, or discontinue features with reasonable notice. We will not delete your journal data without prior notice.",
            },
            {
              heading: "Limitation of liability",
              body: "Shepherd's Path is provided as-is. We are not liable for decisions made based on app content, for service interruptions, or for any indirect or consequential damages. Your use of the app is at your own discretion.",
            },
            {
              heading: "Changes to these terms",
              body: "We may update these terms as the app grows. Continued use after changes constitutes acceptance. Significant changes will be noted on this page.",
            },
            {
              heading: "Contact",
              body: "Questions about these terms? Email us at support@shepherdspathai.com — we respond personally.",
            },
          ].map(({ heading, body }) => (
            <section key={heading} className="mb-7">
              <h2 className="text-[15px] font-bold text-foreground mb-2">{heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </section>
          ))}

          <div className="mt-10 pt-6 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground/60">
            <span>© {YEAR} Shepherd's Path. All rights reserved.</span>
            <Link href="/" className="hover:text-foreground transition-colors underline underline-offset-2">
              Back to home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

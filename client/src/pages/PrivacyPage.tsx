import { useEffect } from "react";
import { Link } from "wouter";
import { NavBar } from "@/components/NavBar";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const YEAR = new Date().getFullYear();

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — Shepherd's Path";
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
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Last updated: January 2025</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Shepherd's Path is built on trust. This policy explains plainly what we collect, what we don't, and how we handle the information you share with us.
          </p>

          {[
            {
              heading: "What we collect",
              body: "Shepherd's Path does not require an account to use. We use a session identifier stored in your browser to save your journal entries, streak data, and bookmarks locally. If you text our prayer line (+1 833-962-9341), your phone number and message are received by our SMS provider (Twilio) and used solely to send your scripture and prayer response. We do not store, sell, or share SMS content.",
            },
            {
              heading: "AI-generated responses",
              body: "When you interact with the pastoral guidance, devotional, or study features, your input is sent to OpenAI to generate a response. We do not store the content of these conversations beyond your current session. OpenAI's own privacy policy governs how they handle data sent through their API.",
            },
            {
              heading: "Analytics and tracking",
              body: "We do not use third-party advertising trackers. We may collect anonymous usage data (pages visited, features used) solely to improve the app. This data is never tied to your identity.",
            },
            {
              heading: "Your journal",
              body: "Your journal entries — prayers, reflections, scriptures, and sermon notes — are stored on our servers linked only to your anonymous session ID. We cannot see or access the content of your journal entries. You can delete your data at any time by contacting us.",
            },
            {
              heading: "Cookies",
              body: "We use a single session cookie to keep your journal and preferences available across visits. We do not use advertising or tracking cookies.",
            },
            {
              heading: "Children",
              body: "Shepherd's Path is intended for users 13 years and older. We do not knowingly collect personal information from children under 13.",
            },
            {
              heading: "Changes to this policy",
              body: "We may update this policy as the app grows. Significant changes will be noted on this page with an updated date. Continued use of the app after changes constitutes acceptance.",
            },
            {
              heading: "Contact",
              body: "Questions about your privacy or data? Reach us at support@shepherdspathai.com — we respond personally.",
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

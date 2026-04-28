import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { getSessionId } from "@/lib/session";

const FEATURES = [
  "Daily Devotional",
  "Ask Path AI (Guidance)",
  "Bible Reading",
  "Prayer Wall",
  "Life Season Journey",
  "Memory Verses",
  "Sermon Mode",
  "Verse of the Day",
  "Journal",
];

const IMPROVEMENTS = [
  "More personalization",
  "Faster responses",
  "Better Bible study tools",
  "More prayer features",
  "Improved design / navigation",
  "iOS / mobile app experience",
  "More content variety",
  "Something else",
];

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteFeature, setFavoriteFeature] = useState("");
  const [improvementArea, setImprovementArea] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please give an overall rating before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const sessionId = getSessionId();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          overallRating: rating,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          favoriteFeature: favoriteFeature || undefined,
          improvementArea: improvementArea || undefined,
          suggestions: suggestions.trim() || undefined,
          wouldRecommend: wouldRecommend ?? undefined,
          platform: "web",
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-500 mb-5" />
        <h1 className="text-2xl font-semibold mb-3">Thank you for your feedback</h1>
        <p className="text-foreground/65 max-w-sm mb-8 leading-relaxed">
          Your thoughts help shape Shepherd's Path into something truly useful. We're grateful you took the time.
        </p>
        <Link href="/" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
          ← Back to Shepherd's Path
        </Link>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition-colors mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to app
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">t</span>
            </div>
            <span className="text-sm font-medium text-foreground/60">Shepherd's Path</span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Beta Tester Feedback</h1>
          <p className="text-foreground/60 text-sm leading-relaxed">
            You're among the first people to use Shepherd's Path. Your honest experience — what resonates, what feels off — directly shapes what we build next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Overall experience <span className="text-foreground/40">(required)</span>
            </label>
            <div className="flex gap-2" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  data-testid={`star-rating-${star}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-border"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-xs text-foreground/50 mt-2">
                {["", "Needs a lot of work", "Below expectations", "It's okay", "Pretty good", "Excellent"][displayRating]}
              </p>
            )}
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="name">Your name <span className="text-foreground/40 font-normal">(optional)</span></label>
              <input
                id="name"
                type="text"
                data-testid="input-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="email">Email <span className="text-foreground/40 font-normal">(optional)</span></label>
              <input
                id="email"
                type="email"
                data-testid="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="For follow-up"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Favorite Feature */}
          <div>
            <label className="block text-sm font-medium mb-2">What feature did you use most or find most valuable?</label>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <button
                  key={f}
                  type="button"
                  data-testid={`feature-${f.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => setFavoriteFeature(favoriteFeature === f ? "" : f)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    favoriteFeature === f
                      ? "bg-primary text-white border-primary"
                      : "border-border text-foreground/70 hover:border-primary/40"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Improvement Area */}
          <div>
            <label className="block text-sm font-medium mb-2">What's the biggest area that needs improvement?</label>
            <div className="flex flex-wrap gap-2">
              {IMPROVEMENTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  data-testid={`improvement-${i.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => setImprovementArea(improvementArea === i ? "" : i)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    improvementArea === i
                      ? "bg-primary text-white border-primary"
                      : "border-border text-foreground/70 hover:border-primary/40"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Would Recommend */}
          <div>
            <label className="block text-sm font-medium mb-2">Would you recommend Shepherd's Path to a friend or church member?</label>
            <div className="flex gap-3">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  data-testid={`recommend-${val ? "yes" : "no"}`}
                  onClick={() => setWouldRecommend(wouldRecommend === val ? null : val)}
                  className={`px-5 py-2 text-sm rounded-md border transition-colors ${
                    wouldRecommend === val
                      ? "bg-primary text-white border-primary"
                      : "border-border text-foreground/70 hover:border-primary/40"
                  }`}
                >
                  {val ? "Yes" : "Not yet"}
                </button>
              ))}
            </div>
          </div>

          {/* Open text */}
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="suggestions">
              Anything else? What would make this genuinely part of your daily faith life?
            </label>
            <textarea
              id="suggestions"
              data-testid="input-suggestions"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              rows={5}
              placeholder="Be as honest as you want. We're listening."
              maxLength={2000}
              className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
            {suggestions.length > 1800 && (
              <p className="text-xs text-foreground/40 mt-1 text-right">{suggestions.length}/2000</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            data-testid="button-submit-feedback"
            disabled={submitting}
            className="w-full py-3 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Submit Feedback"}
          </button>

          <p className="text-center text-xs text-foreground/40 pb-6">
            Your feedback is private and only seen by the Shepherd's Path team.
          </p>
        </form>
      </div>
    </div>
  );
}

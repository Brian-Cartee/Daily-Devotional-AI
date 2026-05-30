/**
 * Starter library for sermon segment indexing (admin + batch seed).
 * Ingest each video once — AI segments transcripts into emotion-tagged moments.
 */

export type CuratedSermonSeed = {
  youtubeId: string;
  title: string;
  preacher: string;
};

export const CURATED_SERMON_SEED: CuratedSermonSeed[] = [
  { youtubeId: "HBKJkRpFJgE", title: "Walking with God Through Pain and Suffering", preacher: "Tim Keller" },
  { youtubeId: "PZ5q00eKLq4", title: "The Prodigal God", preacher: "Tim Keller" },
  { youtubeId: "eCNE0_V3wbI", title: "Identity in Christ", preacher: "Tim Keller" },
  { youtubeId: "PV2yEHi5KLQ", title: "Waiting on God — When He Seems Silent", preacher: "Louie Giglio" },
  { youtubeId: "UJGX5nFfbhU", title: "Anxiety and the Peace That Passes Understanding", preacher: "Louie Giglio" },
  { youtubeId: "FZiOmaTFnzU", title: "Facing Suffering with Faith", preacher: "David Platt" },
  { youtubeId: "6_GJRN0Z8MY", title: "Forgiveness: Releasing What We Cannot Hold", preacher: "David Platt" },
  { youtubeId: "oBxuVTgXI0M", title: "Crazy Love — Stop Settling for Comfortable", preacher: "Francis Chan" },
  { youtubeId: "CgqEUoA_V5g", title: "Doubt and the Darkness Before Dawn", preacher: "Matt Chandler" },
  { youtubeId: "w5FbxJ_E9kU", title: "Marriage: Two Broken People Becoming One", preacher: "Matt Chandler" },
];

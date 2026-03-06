import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function seedDatabase() {
  const today = new Date().toISOString().split("T")[0];
  const existingVerse = await storage.getVerseByDate(today);
  
  if (!existingVerse) {
    await storage.createVerse({
      reference: "Philippians 4:6-7",
      text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
      encouragement: "When you feel overwhelmed, remember that you don't have to carry the burden alone. Bring your worries to God, and He will replace your anxiety with His perfect peace.",
      date: today,
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed the DB at startup
  seedDatabase().catch(console.error);

  app.get(api.verses.getDaily.path, async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const verse = await storage.getVerseByDate(today);
    
    if (!verse) {
      return res.status(404).json({ message: "No verse found for today." });
    }
    
    res.json(verse);
  });

  app.post(api.ai.generate.path, async (req, res) => {
    try {
      const input = api.ai.generate.input.parse(req.body);
      const today = new Date().toISOString().split("T")[0];
      const verse = await storage.getVerseByDate(today);

      if (!verse) {
        return res.status(404).json({ message: "Verse not found to reflect on." });
      }

      let systemPrompt = "";
      let userPrompt = "";

      if (input.type === "reflection") {
        systemPrompt = "You are a thoughtful and empathetic spiritual guide. Write a short, encouraging devotional reflection based on the provided Bible verse. Keep it to 2-3 paragraphs.";
        userPrompt = `Please write a reflection on this verse: ${verse.reference} - "${verse.text}"`;
      } else if (input.type === "prayer") {
        systemPrompt = "You are a thoughtful and empathetic spiritual guide. Write a short, meaningful prayer based on the provided Bible verse. Keep it concise, genuine, and encouraging.";
        userPrompt = `Please write a prayer based on this verse: ${verse.reference} - "${verse.text}"`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // fallback model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      });

      const content = response.choices[0]?.message?.content || "Could not generate response.";

      res.status(200).json({ content });
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

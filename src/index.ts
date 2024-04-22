// cannister code goes here

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';

interface NewsArticle {
  id: string;
  title: string;
  body: string;
  source: string;
  author: string | null;
  publishedAt: Date;
  updatedAt: Date | null; // Added updatedAt field
}

const newsArticles = StableBTreeMap<string, NewsArticle>(0);

export default Server(() => {
  const app = express();
  app.use(express.json());

  app.post("/news", (req: Request, res: Response) => {
    const { title, body, source, author } = req.body;

    // Input validation
    if (!title || !body || !source) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const newArticle: NewsArticle = {
      id: uuidv4(),
      title,
      body,
      source,
      author: author || null,
      publishedAt: getCurrentDate(),
      updatedAt: null,
    };

    newsArticles.insert(newArticle.id, newArticle);
    res.json(newArticle);
  });

  app.get("/news", (req: Request, res: Response) => {
    const { source, publishedAfter } = req.query;

    let articles = newsArticles.values();

    // Filter by source if provided
    if (source) {
      articles = articles.filter(article => article.source === source);
    }

    // Filter by publishedAfter if provided
    if (publishedAfter) {
      const publishedAfterDate = new Date(publishedAfter as string);
      if (!isNaN(publishedAfterDate.getTime())) {
        articles = articles.filter(article => article.publishedAt >= publishedAfterDate);
      } else {
        return res.status(400).json({ error: 'Invalid publishedAfter date format.' });
      }
    }

    res.json(articles);
  });

  app.put("/news/:id", (req: Request, res: Response) => {
    const articleId = req.params.id;
    const articleOpt = newsArticles.get(articleId);
    if ("None" in articleOpt) {
      return res.status(404).json({ error: `News article with id=${articleId} not found` });
    }

    const existingArticle = articleOpt.Some;
    const updatedData = req.body;

    // Update specific properties based on request body
    const updatedArticle: NewsArticle = {
      ...existingArticle,
      ...updatedData,
      updatedAt: getCurrentDate(),
    };

    newsArticles.insert(articleId, updatedArticle);
    res.json(updatedArticle);
  });

  app.delete("/news/:id", (req: Request, res: Response) => {
    const articleId = req.params.id;
    const deletedArticle = newsArticles.remove(articleId);
    if ("None" in deletedArticle) {
      return res.status(404).json({ error: `News article with id=${articleId} not found` });
    }
    res.json(deletedArticle.Some);
  });

  return app.listen();
});

function getCurrentDate(): Date {
  return new Date(ic.time().valueOf() / 1000_000);
}

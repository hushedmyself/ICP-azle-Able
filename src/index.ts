// cannister code goes here

import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';

/**
 * `newsArticles` - it's a key-value datastructure that is used to store news articles.
 */
class NewsArticle {
  id: string;
  title: string;
  body: string;
  source: string;
  author: string | null;
  publishedAt: Date;

  constructor(
    title: string,
    body: string,
    source: string,
    author?: string
  ) {
    this.id = uuidv4();
    this.title = title;
    this.body = body;
    this.source = source;
    this.author = author || null;
    this.publishedAt = getCurrentDate();
  }
}

const newsArticles = StableBTreeMap<string, NewsArticle>(0);

export default Server(() => {
  const app = express();
  app.use(express.json());

  app.post("/news", (req, res) => {
    const { title, body, source, author } = req.body;
    const newArticle = new NewsArticle(title, body, source, author);
    newsArticles.insert(newArticle.id, newArticle);
    res.json(newArticle);
  });

  app.get("/news", (req, res) => {
    const source = req.query.source;
    const publishedAfterStr = req.query.publishedAfter; // String version of publishedAfter

    let articles = newsArticles.values();
    if (source) {
      articles = articles.filter(article => article.source === source);
    }

    if (publishedAfterStr) {
      try {
        const publishedAfter = new Date(''+publishedAfterStr); // Attempt conversion
        articles = articles.filter(article => article.publishedAt >= publishedAfter);
      } catch (error) {
        console.error("Error parsing publishedAfter:", error);
        // Handle invalid date format (optional: return error response)
      }
    }

    res.json(articles);
  });

  app.put("/news/:id", (req, res) => {
    const articleId = req.params.id;
    const articleOpt = newsArticles.get(articleId);
    if ("None" in articleOpt) {
      res.status(404).send(`News article with id=${articleId} not found`);
    } else {
      const existingArticle = articleOpt.Some;
      const updatedData = req.body;

      // Update specific properties based on request body
      const updatedArticle = {
        ...existingArticle,
        ...updatedData,
        updatedAt: getCurrentDate(),
      };

      newsArticles.insert(articleId, updatedArticle);
      res.json(updatedArticle);
    }
  });

  app.delete("/news/:id", (req, res) => {
    const messageId = req.params.id; // Changed from 'message' to 'id' for consistency
    const deletedMessage = newsArticles.remove(messageId);
    if ("None" in deletedMessage) {
      res.status(400).send(`News article with id=${messageId} not found`);
    } else {
      res.json(deletedMessage.Some);
    }
  });

  return app.listen();
});

function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}

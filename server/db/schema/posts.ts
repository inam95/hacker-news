import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { userTable } from "./auth";
import { commentsTable } from "./comments";
import { postUpvotesTable } from "./upvotes";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  content: text("content"),
  points: integer("points").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(userTable, {
    fields: [postsTable.userId],
    references: [userTable.id],
    relationName: "author",
  }),
  postUpvotes: many(postUpvotesTable, {
    relationName: "postUpvotes",
  }),
  comments: many(commentsTable),
}));

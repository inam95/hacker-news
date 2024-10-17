import { drizzle } from "drizzle-orm/postgres-js";

import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import postgres from "postgres";
import { z } from "zod";

import { sessionTable, userRelations, userTable } from "./db/schema/auth";
import { commentsRelations, commentsTable } from "./db/schema/comments";
import { postsRelations, postsTable } from "./db/schema/posts";
import {
  commentUpvotesRelations,
  commentUpvotesTable,
  postUpvotesRelations,
  postUpvotesTable,
} from "./db/schema/upvotes";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});

const processEnv = EnvSchema.parse(process.env);

const queryClient = postgres(processEnv.DATABASE_URL);
export const db = drizzle(queryClient, {
  schema: {
    user: userTable,
    session: sessionTable,
    posts: postsTable,
    comments: commentsTable,
    postUpvotes: postUpvotesTable,
    commentUpvotes: commentUpvotesTable,
    postsRelations,
    commentUpvotesRelations,
    postUpvotesRelations,
    userRelations,
    commentsRelations,
  },
});

export const adapter = new DrizzlePostgreSQLAdapter(db, sessionTable, userTable);

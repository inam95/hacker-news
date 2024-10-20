import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, asc, countDistinct, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/adapter";
import type { Context } from "@/context";
import { userTable } from "@/db/schema/auth";
import { commentsTable } from "@/db/schema/comments";
import { postsTable } from "@/db/schema/posts";
import { commentUpvotesTable, postUpvotesTable } from "@/db/schema/upvotes";
import { loggedIn } from "@/middleware/loggedIn";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import {
  createCommentSchema,
  createPostSchema,
  paginationSchema,
  type Comment,
  type PaginatedResponse,
  type Post,
  type SuccessResponse,
} from "@/shared/types";
import { getISOFormatDateQuery } from "@/lib/utils";

export const postsRouter = new Hono<Context>()
  .post("/", loggedIn, zValidator("form", createPostSchema), async (c) => {
    const { title, content, url } = c.req.valid("form");
    const user = c.get("user")!;

    const [post] = await db
      .insert(postsTable)
      .values({
        title,
        content,
        url,
        userId: user.id,
      })
      .returning({
        id: postsTable.id,
      });

    return c.json<SuccessResponse<{ id: number }>>(
      {
        success: true,
        message: "Post created",
        data: {
          id: post.id,
        },
      },
      201,
    );
  })
  .get("/", zValidator("query", paginationSchema), async (c) => {
    const { limit, order, page, sortBy, author, site } = c.req.valid("query");
    const user = c.get("user");

    const offset = (page - 1) * limit;
    const sortByColumn = sortBy === "points" ? postsTable.points : postsTable.createdAt;
    const sortOrder = order === "desc" ? desc(sortByColumn) : asc(sortByColumn);

    const [count] = await db
      .select({ count: countDistinct(postsTable.id) })
      .from(postsTable)
      .where(
        and(
          author ? eq(postsTable.userId, author) : undefined,
          site ? eq(postsTable.url, site) : undefined,
        ),
      );

    const postsQuery = db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        url: postsTable.url,
        content: postsTable.content,
        points: postsTable.points,
        createdAt: getISOFormatDateQuery(postsTable.createdAt),
        commentCount: postsTable.commentCount,
        author: {
          username: userTable.username,
          id: userTable.id,
        },
        isUpvoted: user
          ? sql<boolean>`CASE WHEN ${postUpvotesTable.userId} IS NOT NULL THEN true ELSE false END`
          : sql<boolean>`false`,
      })
      .from(postsTable)
      .leftJoin(userTable, eq(postsTable.userId, userTable.id))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset)
      .where(
        and(
          author ? eq(postsTable.userId, author) : undefined,
          site ? eq(postsTable.url, site) : undefined,
        ),
      );

    if (user) {
      postsQuery.leftJoin(
        postUpvotesTable,
        and(eq(postUpvotesTable.postId, postsTable.id), eq(postUpvotesTable.userId, user.id)),
      );
    }

    const posts = await postsQuery;

    return c.json<PaginatedResponse<Post>>(
      {
        data: posts as Post[],
        success: true,
        message: "Posts fetched",
        pagination: {
          page,
          totalPages: Math.ceil(count.count / limit),
        },
      },
      200,
    );
  })
  .post(
    "/:id/upvote",
    loggedIn,
    zValidator("param", z.object({ id: z.coerce.number() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user")!;

      let pointsChange: -1 | 1 = 1;

      const points = await db.transaction(async (tx) => {
        const [existingUpvote] = await tx
          .select()
          .from(postUpvotesTable)
          .where(and(eq(postUpvotesTable.postId, id), eq(postUpvotesTable.userId, user.id)))
          .limit(1);

        pointsChange = existingUpvote ? -1 : 1;

        const [updated] = await tx
          .update(postsTable)
          .set({
            points: sql<number>`${postsTable.points} + ${pointsChange}`,
          })
          .where(eq(postsTable.id, id))
          .returning({
            points: postsTable.points,
          });

        if (!updated) {
          throw new HTTPException(404, {
            message: "Post not found",
          });
        }

        if (existingUpvote) {
          await tx.delete(postUpvotesTable).where(eq(postUpvotesTable.id, existingUpvote.id));
        } else {
          await tx.insert(postUpvotesTable).values({
            postId: id,
            userId: user.id,
          });
        }

        return updated.points;
      });

      return c.json<SuccessResponse<{ count: number; isUpvoted: boolean }>>(
        {
          success: true,
          message: "Post updated",
          data: {
            count: points,
            isUpvoted: pointsChange === 1,
          },
        },
        200,
      );
    },
  )
  .post(
    "/:id/comment",
    loggedIn,
    zValidator("param", z.object({ id: z.coerce.number() })),
    zValidator("form", createCommentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { content } = c.req.valid("form");
      const user = c.get("user")!;

      const [comment] = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(postsTable)
          .set({
            commentCount: sql<number>`${postsTable.commentCount} + 1`,
          })
          .where(eq(postsTable.id, id))
          .returning({
            commentCount: postsTable.commentCount,
          });

        if (!updated) {
          throw new HTTPException(404, {
            message: "Post not found",
          });
        }

        return await tx
          .insert(commentsTable)
          .values({
            content,
            postId: id,
            userId: user.id,
          })
          .returning({
            id: commentsTable.id,
            userId: commentsTable.userId,
            postId: commentsTable.postId,
            content: commentsTable.content,
            points: commentsTable.points,
            depth: commentsTable.depth,
            parentCommentId: commentsTable.parentCommentId,
            createdAt: getISOFormatDateQuery(commentsTable.createdAt).as("created_at"),
            commentCount: commentsTable.commentCount,
          });
      });

      return c.json<SuccessResponse<Comment>>({
        success: true,
        message: "Comment created",
        data: {
          ...comment,
          commentUpvotes: [],
          childComments: [],
          author: {
            id: user.id,
            username: user.username,
          },
        } as Comment,
      });
    },
  )
  .get(
    "/:id/comments",
    zValidator("param", z.object({ id: z.coerce.number() })),
    zValidator(
      "query",
      paginationSchema.extend({
        includeChildren: z.boolean({ coerce: true }).optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const { limit, order: orderBy, page, sortBy, includeChildren } = c.req.valid("query");
      const user = c.get("user");

      const [postExists] = await db
        .select({ exists: sql`1` })
        .from(postsTable)
        .where(eq(postsTable.id, id))
        .limit(1);

      if (!postExists) {
        throw new HTTPException(404, {
          message: "Post not found",
        });
      }

      const offset = (page - 1) * limit;
      const sortByColumn = sortBy === "points" ? commentsTable.points : commentsTable.createdAt;
      const sortOrder = orderBy === "desc" ? desc(sortByColumn) : asc(sortByColumn);

      const [count] = await db
        .select({ count: countDistinct(commentsTable.id) })
        .from(commentsTable)
        .where(and(eq(commentsTable.postId, id), isNull(commentsTable.parentCommentId)));

      const comments = await db.query.comments.findMany({
        where: and(eq(commentsTable.postId, id), isNull(commentsTable.parentCommentId)),
        orderBy: sortOrder,
        limit,
        offset,
        with: {
          author: {
            columns: {
              id: true,
              username: true,
            },
          },
          commentUpvotes: {
            columns: {
              userId: true,
            },
            where: eq(commentUpvotesTable.userId, user?.id ?? ""),
            limit: 1,
          },
          childComments: {
            limit: includeChildren ? 2 : 0,
            with: {
              author: {
                columns: {
                  id: true,
                  username: true,
                },
              },
              commentUpvotes: {
                columns: {
                  userId: true,
                },
                where: eq(commentUpvotesTable.userId, user?.id ?? ""),
                limit: 1,
              },
            },
            orderBy: sortOrder,
            extras: {
              createdAt: getISOFormatDateQuery(commentsTable.createdAt).as("created_at"),
            },
          },
        },
        extras: {
          createdAt: getISOFormatDateQuery(commentsTable.createdAt).as("created_at"),
        },
      });

      return c.json<PaginatedResponse<Comment>>(
        {
          data: comments as Comment[],
          success: true,
          message: "Comments fetched",
          pagination: {
            page,
            totalPages: Math.ceil(count.count / limit),
          },
        },
        200,
      );
    },
  )
  .get("/:id", zValidator("param", z.object({ id: z.coerce.number() })), async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");

    const postsQuery = db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        url: postsTable.url,
        content: postsTable.content,
        points: postsTable.points,
        createdAt: getISOFormatDateQuery(postsTable.createdAt),
        commentCount: postsTable.commentCount,
        author: {
          username: userTable.username,
          id: userTable.id,
        },
        isUpvoted: user
          ? sql<boolean>`CASE WHEN ${postUpvotesTable.userId} IS NOT NULL THEN true ELSE false END`
          : sql<boolean>`false`,
      })
      .from(postsTable)
      .leftJoin(userTable, eq(postsTable.userId, userTable.id))
      .where(eq(postsTable.id, id));

    if (user) {
      postsQuery.leftJoin(
        postUpvotesTable,
        and(eq(postUpvotesTable.postId, postsTable.id), eq(postUpvotesTable.userId, user.id)),
      );
    }

    const [post] = await postsQuery;
    if (!post) {
      throw new HTTPException(404, {
        message: "Post not found",
      });
    }

    return c.json<SuccessResponse<Post>>({
      data: post as Post,
      success: true,
      message: "Post fetched",
    });
  });

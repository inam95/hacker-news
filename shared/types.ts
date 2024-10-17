import { insertCommentSchema } from "@/db/schema/comments";
import { insertPostSchema } from "@/db/schema/posts";
import { z } from "zod";

export type SuccessResponse<T = void> = {
  success: true;
  message: string;
} & (T extends void ? {} : { data: T });

export type ErrorResponse = {
  success: false;
  message: string;
  isFormError?: boolean;
};

export const loginSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(31)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(3).max(255),
});

export const createPostSchema = insertPostSchema
  .pick({
    title: true,
    url: true,
    content: true,
  })
  .refine((data) => data.url || data.content, {
    message: "Post must have either a URL or content",
    path: ["url", "content"],
  });

export const sortBySchema = z.enum(["points", "recent"]);
export const orderBySchema = z.enum(["asc", "desc"]);

export const paginationSchema = z.object({
  limit: z.number({ coerce: true }).optional().default(10),
  page: z.number({ coerce: true }).optional().default(1),
  sortBy: sortBySchema.optional().default("points"),
  orderBy: orderBySchema.optional().default("desc"),
  author: z.string().optional(),
  site: z.string().optional(),
});

export type Post = {
  id: number;
  title: string;
  url: string | null;
  content: string | null;
  points: number;
  createdAt: string;
  commentCount: number;
  author: {
    id: string;
    username: string;
  };
  isUpvoted: boolean;
};

export type Comment = {
  id: number;
  userId: string;
  content: string;
  points: number;
  depth: number;
  commentCount: number;
  createdAt: string;
  postId: number;
  parentCommentId: number | null;
  commentUpvotes: {
    userId: string;
  }[];
  author: {
    id: string;
    username: string;
  };
  childComments?: Comment[];
};

export type PaginatedResponse<T> = {
  pagination: {
    totalPages: number;
    page: number;
  };
  data: T[];
} & Omit<SuccessResponse, "data">;

export const createCommentSchema = insertCommentSchema.pick({
  content: true,
});

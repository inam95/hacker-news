import { createFileRoute } from "@tanstack/react-router";
import { infiniteQueryOptions, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { fallback, zodSearchValidator } from "@tanstack/router-zod-adapter";

import { z } from "zod";

import { orderSchema, sortBySchema } from "@/shared/types";
import { getPosts } from "@/lib/api";
import { useUpvotePost } from "@/lib/api-hooks";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { SortBar } from "@/components/sort-bar";

const homeSearchSchema = z.object({
  sortBy: fallback(sortBySchema, "points").default("points"),
  order: fallback(orderSchema, "desc").default("desc"),
  author: z.optional(fallback(z.string(), "")),
  site: z.optional(fallback(z.string(), "")),
});

export const Route = createFileRoute("/")({
  component: HomeComponent,
  validateSearch: zodSearchValidator(homeSearchSchema),
});

const postInfiniteQueryOptions = ({
  sortBy,
  order,
  author,
  site,
}: z.infer<typeof homeSearchSchema>) =>
  infiniteQueryOptions({
    queryKey: ["posts", { sortBy, order, author, site }],
    queryFn: ({ pageParam }) =>
      getPosts({ pageParam, pagination: { sortBy, order, author, site } }),
    initialPageParam: 1,
    staleTime: Infinity,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.pagination.totalPages <= lastPageParam) {
        return undefined;
      }
      return lastPageParam + 1;
    },
  });

function HomeComponent() {
  const { order, sortBy, author, site } = Route.useSearch();
  const { data, isFetchingNextPage, fetchNextPage, hasNextPage } = useSuspenseInfiniteQuery(
    postInfiniteQueryOptions({ order, sortBy, author, site }),
  );
  const upvoteMutation = useUpvotePost();
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Submissions</h1>
      <SortBar sortBy={sortBy} order={order} />
      <div className="space-y-4">
        {data?.pages.map((page) =>
          page.data.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpvote={() => upvoteMutation.mutate(post.id.toString())}
            />
          )),
        )}
      </div>
      <div className="mt-6">
        <Button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
          {isFetchingNextPage ? "Loading more..." : hasNextPage ? "Load more" : "No more posts"}
        </Button>
      </div>
    </div>
  );
}

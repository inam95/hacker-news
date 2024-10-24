import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

import { current, produce } from "immer";
import { toast } from "sonner";

import { Post, SuccessResponse } from "@/shared/types";

import { GetPostSuccessResponse, upvotePost } from "./api";

const updatePostUpvote = (draft: Post) => {
  draft.points += draft.isUpvoted ? -1 : +1;
  draft.isUpvoted = !draft.isUpvoted;
};

export const useUpvotePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upvotePost,
    onMutate: async (variable) => {
      let prevData;
      await queryClient.cancelQueries({ queryKey: ["post", Number(variable)] });
      queryClient.setQueryData<SuccessResponse<Post>>(
        ["post", Number(variable)],
        produce((draft) => {
          if (!draft) {
            return undefined;
          }
          updatePostUpvote(draft.data);
        }),
      );
      queryClient.setQueriesData<InfiniteData<GetPostSuccessResponse>>(
        { queryKey: ["posts"], type: "active" },
        produce((oldData) => {
          prevData = current(oldData);
          if (!oldData) {
            return undefined;
          }
          oldData.pages.forEach((page) => {
            page.data.forEach((post) => {
              if (post.id.toString() === variable) {
                updatePostUpvote(post);
              }
            });
          });
        }),
      );
      return { prevData };
    },
    onSuccess: (upvoteData, variable) => {
      queryClient.setQueryData<SuccessResponse<Post>>(
        ["post", Number(variable)],
        produce((draft) => {
          if (!draft) {
            return undefined;
          }
          draft.data.points = upvoteData.data.count;
          draft.data.isUpvoted = upvoteData.data.isUpvoted;
        }),
      );
      queryClient.setQueriesData<InfiniteData<GetPostSuccessResponse>>(
        { queryKey: ["posts"] },
        produce((oldData) => {
          if (!oldData) {
            return undefined;
          }
          oldData.pages.forEach((page) => {
            page.data.forEach((post) => {
              if (post.id.toString() === variable) {
                post.points = upvoteData.data.count;
                post.isUpvoted = upvoteData.data.isUpvoted;
              }
            });
          });
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["posts"], type: "inactive", refetchType: "none" });
    },
    onError: (error, variable, context) => {
      console.log(error);
      queryClient.invalidateQueries({ queryKey: ["post", Number(variable)] });
      toast.error("Failed to upvote post");
      if (context?.prevData) {
        queryClient.setQueriesData({ queryKey: ["posts"], type: "active" }, context.prevData);
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    },
  });
};

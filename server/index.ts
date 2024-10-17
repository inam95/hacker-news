import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { ErrorResponse } from "@/shared/types";

const app = new Hono();

app.get("/", (c) => {
  return c.text(" Hello Hono!");
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    const errResponse =
      error.res ??
      c.json<ErrorResponse>(
        {
          success: false,
          message: error.message,
          isFormError:
            error.cause && typeof error.cause === "object" && "form" in error.cause
              ? error.cause.form === true
              : false,
        },
        error.status,
      );

    return errResponse;
  }
  return c.json<ErrorResponse>(
    {
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : (error.stack ?? error.message),
    },
    500,
  );
});

export default app;

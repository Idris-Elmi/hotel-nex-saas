import { AppError } from "@/lib/errors";

function isMongooseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.constructor.name;
  return name === "MongooseError" || name === "MongoServerError" || name === "MongoBulkWriteError";
}

function getMongooseErrorMessage(error: Error): string {
  const err = error as unknown as Record<string, unknown>;
  if (err.code === 11000) {
    const keyValue = err.keyValue as Record<string, unknown> | undefined;
    const field = keyValue ? Object.keys(keyValue)[0] : "field";
    return `Duplicate value for ${field}`;
  }
  if (typeof err.message === "string" && err.message.includes("validation failed")) {
    return err.message;
  }
  return error.message || "Database error";
}

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function fail(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  if (isMongooseError(error)) {
    return Response.json(
      {
        error: "database_error",
        message: getMongooseErrorMessage(error as Error),
      },
      { status: 409 },
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return Response.json(
    {
      error: "internal_error",
      message,
    },
    { status: 500 },
  );
}

import { AppError } from "@/lib/errors";

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

  return Response.json(
    {
      error: "internal_error",
      message: "Unexpected server error",
    },
    { status: 500 },
  );
}

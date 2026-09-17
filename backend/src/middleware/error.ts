import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found", status: 404 });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, status: err.status });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error", status: 500 });
};

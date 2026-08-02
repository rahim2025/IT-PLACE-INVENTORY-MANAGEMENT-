import { ApiError } from "../utils/ApiError.js";

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || "Something went wrong.";
  let details = err instanceof ApiError ? err.details : undefined;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed.";
    details = Object.values(err.errors).map((e) => e.message);
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for "${err.path}".`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue ?? {});
    if (fields.includes("name") && fields.includes("brand")) {
      message = "This brand already has a product with that name. Use a different name, or pick a different brand.";
    } else {
      message = `That ${fields[0] ?? "field"} is already in use.`;
    }
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

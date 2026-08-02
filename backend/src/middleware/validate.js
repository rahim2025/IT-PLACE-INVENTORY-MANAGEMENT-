import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    throw new ApiError(
      400,
      "Some fields need attention.",
      result.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
}

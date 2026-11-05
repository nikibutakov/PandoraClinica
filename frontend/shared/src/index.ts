export { api, setOnUnauthorized, TOKEN_KEY } from "./api/client";
export { formatApiError } from "./api/errors";
export { AuthProvider, useAuth, useAuthActions } from "./auth/context";
export { RequireRole } from "./auth/RequireRole";
export { homePathByRole, parseJwt, restoreUser, USER_KEY } from "./auth/user";
export type { AuthUser, UserRole } from "./auth/user";
// Типы из OpenAPI-схемы: components["schemas"]["BoardOut"] и т.п.
export type { components, operations, paths } from "./api/schema";

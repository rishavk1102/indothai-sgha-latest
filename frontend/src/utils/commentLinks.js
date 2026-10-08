import { CLIENT_ROUTES } from "./clientWorkspace";
import { EMPLOYEE_ROUTES } from "./employeeWorkspace";

export function commentThreadPath({ role, submissionId, commentId }) {
  const base = role === "Client" ? CLIENT_ROUTES.submissions : EMPLOYEE_ROUTES.inbox;
  const params = new URLSearchParams();
  params.set("submission", String(submissionId));
  if (commentId != null) params.set("comment", String(commentId));
  return `${base}?${params.toString()}`;
}

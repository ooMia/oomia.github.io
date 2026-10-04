export function deriveAdmissionStatus(iteration) {
  return iteration == null || iteration === "" ? "Backlog" : "Todo";
}

export function assertDevelopmentStartAllowed({
  iteration,
  status,
  isArchived = false,
}) {
  if (isArchived) {
    throw new Error("Archived Project item cannot start Development.");
  }
  if (!iteration) {
    throw new Error(
      "Iteration commitment is required before Development start."
    );
  }

  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "done" || normalized === "cancelled") {
    throw new Error(
      `Terminal Project status cannot start Development: ${status}`
    );
  }
  if (normalized !== "todo" && normalized !== "in progress") {
    throw new Error(
      `Project status must be Todo or In progress before Development start: ${status ?? "unset"}`
    );
  }
}

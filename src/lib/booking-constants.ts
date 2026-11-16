export const MAX_UPCOMING_APPOINTMENTS = 5;

export const BOOKING_MESSAGES: Record<string, string> = {
  invalid: "Something was wrong with that request. Please try again.",
  not_found: "This doctor or appointment could not be found.",
  slot_unavailable: "That time is no longer available. Please pick another slot.",
  slot_taken: "Sorry, someone else just booked that time. Please pick another slot.",
  duplicate_doctor_day: "You already have an appointment with this doctor on that day.",
  overlap: "You already have another appointment at that time.",
  limit: `You can have at most ${MAX_UPCOMING_APPOINTMENTS} upcoming appointments. Cancel one, or wait until after a visit.`,
  busy: "We are very busy right now. Please try again in a moment.",
  too_late: "It is too late to cancel online. Please call the clinic.",
  not_cancellable: "This appointment can no longer be cancelled.",
};

export function isUpcoming(status: string, date: string, today: string) {
  return (status === "BOOKED" || status === "CHECKED_IN" || status === "IN_PROGRESS") && date >= today;
}

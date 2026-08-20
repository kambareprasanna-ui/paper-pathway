/**
 * Branded "paper ready for review" email with a deep link to /dqc/paper/<id>.
 * Sending needs a verified email domain for the project; until then this
 * resolves false and the in-app notification stays the delivery channel.
 */
export async function sendReviewEmail(_args: {
  to: string;
  paperId: string;
  courseLabel: string;
  dueAt: string;
}): Promise<boolean> {
  return false;
}

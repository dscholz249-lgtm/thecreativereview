// Throwaway route for milestone 1 DoD: verify that a thrown error reaches
// Sentry. Delete once we have real flows generating errors.
export const dynamic = "force-dynamic";

export default function SentryTestPage() {
  throw new Error("Sentry test error — milestone 1 verification");
}

import CheckoutRedirect from "./CheckoutRedirect";

export const metadata = { title: "Checkout — Agent Ready" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const { repo } = await searchParams;
  const stripeUrl = process.env.STRIPE_PAYMENT_URL || null;
  return <CheckoutRedirect repo={repo ?? null} stripeUrl={stripeUrl} />;
}

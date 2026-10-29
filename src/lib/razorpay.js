// Loads Razorpay Standard Checkout on demand and opens it for a subscription.
// Card and UPI details are entered inside Razorpay's own window; they never
// touch this app or our servers.
import { BRAND, CHECKOUT_THEME } from './config';
import { ApiError } from './errors';

const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(unavailable()));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(unavailable());
    };
    document.head.appendChild(script);
  });
  return loading;
}

function unavailable() {
  return new ApiError('CHECKOUT_UNAVAILABLE', 'Razorpay checkout didn’t load. Check your connection or pause your ad blocker, then try again.');
}

const TIER_NAMES = { core: 'Core', pro: 'Pro', elite: 'Elite' };

/** Resolves with Razorpay's response (payment id, subscription id, signature). */
export async function openCheckout(checkout) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve, reject) => {
    let lastFailure = null;
    const rzp = new Razorpay({
      key: checkout.key_id,
      subscription_id: checkout.subscription_id,
      name: BRAND.name,
      description: `${TIER_NAMES[checkout.plan.tier] ?? 'Plan'}, billed ${checkout.plan.interval}`,
      image: `${window.location.origin}/icon-192.png`,
      prefill: { name: checkout.prefill?.name ?? '', email: checkout.prefill?.email ?? '' },
      theme: { color: CHECKOUT_THEME },
      handler: (response) => resolve(response),
      modal: {
        confirm_close: true,
        ondismiss: () =>
          reject(new ApiError('DISMISSED', lastFailure
            ? `Payment failed: ${lastFailure}. You weren’t charged.`
            : 'Checkout closed. You weren’t charged.')),
      },
    });
    rzp.on('payment.failed', (event) => {
      lastFailure = event?.error?.description ?? 'the bank declined it';
    });
    rzp.open();
  });
}

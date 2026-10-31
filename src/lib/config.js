// Brand and build-time settings. Only public values live here: anything in
// a VITE_ variable ends up inside the JavaScript sent to every browser.
export const BRAND = {
  name: 'Vantaris',
  tagline: "Don't study finance. Do finance.",
  site: 'https://vantaris.finance',
  support: 'devs@vantaris.finance',
};

export const IS_DEMO = import.meta.env.MODE === 'demo';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Brand colour passed to Razorpay Checkout so the payment sheet matches the app.
export const CHECKOUT_THEME = '#171A1D'; // Razorpay modal accent: carbon, to match the monochrome UI

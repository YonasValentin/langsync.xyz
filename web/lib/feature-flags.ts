/**
 * Feature Flags
 *
 * Controls which premium features are enabled.
 * For the open-source / free version, AI features can be disabled
 * by setting NEXT_PUBLIC_ENABLE_AI=false (or omitting it).
 */

export const features = {
  /** Whether AI-powered translation is available */
  get ai(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_AI === "true";
  },

  /** Whether Stripe billing is enabled (cloud mode) */
  get billing(): boolean {
    return process.env.NEXT_PUBLIC_LANGSYNC_CLOUD === "true";
  },
};

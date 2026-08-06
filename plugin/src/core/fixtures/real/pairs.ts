/**
 * Index of real-handoff before/after fixture pairs.
 *
 * Consumed by the A-02 parse test now and by the A-03 (false-positive) and
 * A-04 (match-accuracy) calibration harnesses later. Kept out of `core/index`
 * so fixtures never ship in the plugin bundle — only tests import this module.
 *
 * NOTE: These are representative REST-shaped handoffs, not captures from a live
 * Figma account (see ./README.md and DEC-017). Swap them for real exports when
 * an API token is available; the loader and harness stay unchanged.
 */
import checkoutBefore from "./checkout/before.json";
import checkoutAfter from "./checkout/after.json";
import cardBefore from "./card/before.json";
import cardAfter from "./card/after.json";
import navBefore from "./nav/before.json";
import navAfter from "./nav/after.json";

export interface RealFixturePair {
  /** Stable identifier used in test names and calibration reports. */
  name: string;
  /** Short description of the change scenario the pair exercises. */
  scenario: string;
  before: unknown;
  after: unknown;
}

export const REAL_FIXTURE_PAIRS: readonly RealFixturePair[] = [
  {
    name: "checkout",
    scenario: "flow change: text edit, button resize, added error state",
    before: checkoutBefore,
    after: checkoutAfter,
  },
  {
    name: "card",
    scenario: "visual + typography + layout: fill, radius, padding, font size",
    before: cardBefore,
    after: cardAfter,
  },
  {
    name: "nav",
    scenario: "structural + component: removed item, variant state change",
    before: navBefore,
    after: navAfter,
  },
];

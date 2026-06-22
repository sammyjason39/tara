/**
 * Property-Based Tests for State Machine Transition Enforcement.
 *
 * Uses fast-check (fc.assert / fc.property) with vitest.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: full-module-production-audit, Property 2: State Machine Transition Enforcement
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateTransition,
  PO_STATES,
  TICKET_STATES,
  StateTransitionMap,
} from "../shared/business-rules";

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Get all states defined in a state map (keys) */
function getAllStates(stateMap: StateTransitionMap): string[] {
  return Object.keys(stateMap);
}

/** Get all valid (currentState, targetState) pairs from a state map */
function getValidTransitions(stateMap: StateTransitionMap): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [current, targets] of Object.entries(stateMap)) {
    for (const target of targets) {
      pairs.push([current, target]);
    }
  }
  return pairs;
}

/** Get all invalid (currentState, targetState) pairs from a state map */
function getInvalidTransitions(stateMap: StateTransitionMap): [string, string][] {
  const allStates = getAllStates(stateMap);
  const pairs: [string, string][] = [];
  for (const current of allStates) {
    const validTargets = stateMap[current];
    for (const target of allStates) {
      if (!validTargets.includes(target)) {
        pairs.push([current, target]);
      }
    }
  }
  return pairs;
}

// ─── Property 2: State Machine Transition Enforcement ───────────────────────
// Feature: full-module-production-audit, Property 2: State Machine Transition Enforcement

describe("Property 2: State Machine Transition Enforcement", () => {
  /**
   * Validates: Requirements 3.4, 17.2, 17.6
   */

  describe("PO_STATES — valid transitions return true", () => {
    const validPOTransitions = getValidTransitions(PO_STATES);

    test("for any valid (currentState, targetState) pair in PO_STATES adjacency map, validateTransition returns true", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validPOTransitions),
          ([currentState, targetState]) => {
            const result = validateTransition(currentState, targetState, PO_STATES);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("PO_STATES — invalid transitions return false", () => {
    const invalidPOTransitions = getInvalidTransitions(PO_STATES);

    test("for any (currentState, targetState) pair NOT in PO_STATES adjacency map, validateTransition returns false", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...invalidPOTransitions),
          ([currentState, targetState]) => {
            const result = validateTransition(currentState, targetState, PO_STATES);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("PO_STATES — unknown states return false", () => {
    const poStates = getAllStates(PO_STATES);
    // Generate arbitrary state names that are not in the map and not JS prototype properties
    const prototypeKeys = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'toLocaleString', 'propertyIsEnumerable'];
    const unknownStateArb = fc.stringMatching(/^[a-z][a-z_]{0,19}$/).filter(
      s => !poStates.includes(s) && !prototypeKeys.includes(s)
    );

    test("for any unknown current state with any target state, validateTransition returns false", () => {
      fc.assert(
        fc.property(
          unknownStateArb,
          fc.constantFrom(...poStates),
          (unknownState, targetState) => {
            const result = validateTransition(unknownState, targetState, PO_STATES);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("for any valid current state with an unknown target state, validateTransition returns false", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...poStates),
          unknownStateArb,
          (currentState, unknownTarget) => {
            const result = validateTransition(currentState, unknownTarget, PO_STATES);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("TICKET_STATES — valid transitions return true", () => {
    const validTicketTransitions = getValidTransitions(TICKET_STATES);

    test("for any valid (currentState, targetState) pair in TICKET_STATES adjacency map, validateTransition returns true", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validTicketTransitions),
          ([currentState, targetState]) => {
            const result = validateTransition(currentState, targetState, TICKET_STATES);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("TICKET_STATES — invalid transitions return false", () => {
    const invalidTicketTransitions = getInvalidTransitions(TICKET_STATES);

    test("for any (currentState, targetState) pair NOT in TICKET_STATES adjacency map, validateTransition returns false", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...invalidTicketTransitions),
          ([currentState, targetState]) => {
            const result = validateTransition(currentState, targetState, TICKET_STATES);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("TICKET_STATES — unknown states return false", () => {
    const ticketStates = getAllStates(TICKET_STATES);
    // Generate arbitrary state names that are not in the map and not JS prototype properties
    const prototypeKeys = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'toLocaleString', 'propertyIsEnumerable'];
    const unknownStateArb = fc.stringMatching(/^[a-z][a-z_]{0,19}$/).filter(
      s => !ticketStates.includes(s) && !prototypeKeys.includes(s)
    );

    test("for any unknown current state with any target state, validateTransition returns false", () => {
      fc.assert(
        fc.property(
          unknownStateArb,
          fc.constantFrom(...ticketStates),
          (unknownState, targetState) => {
            const result = validateTransition(unknownState, targetState, TICKET_STATES);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("for any valid current state with an unknown target state, validateTransition returns false", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ticketStates),
          unknownStateArb,
          (currentState, unknownTarget) => {
            const result = validateTransition(currentState, unknownTarget, TICKET_STATES);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Both entity types — transition is deterministic", () => {
    test("validateTransition is deterministic: same inputs always produce same output for PO", () => {
      const validPOTransitions = getValidTransitions(PO_STATES);
      const invalidPOTransitions = getInvalidTransitions(PO_STATES);
      const allPOPairs = [...validPOTransitions, ...invalidPOTransitions];

      fc.assert(
        fc.property(
          fc.constantFrom(...allPOPairs),
          ([currentState, targetState]) => {
            const result1 = validateTransition(currentState, targetState, PO_STATES);
            const result2 = validateTransition(currentState, targetState, PO_STATES);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("validateTransition is deterministic: same inputs always produce same output for Tickets", () => {
      const validTicketTransitions = getValidTransitions(TICKET_STATES);
      const invalidTicketTransitions = getInvalidTransitions(TICKET_STATES);
      const allTicketPairs = [...validTicketTransitions, ...invalidTicketTransitions];

      fc.assert(
        fc.property(
          fc.constantFrom(...allTicketPairs),
          ([currentState, targetState]) => {
            const result1 = validateTransition(currentState, targetState, TICKET_STATES);
            const result2 = validateTransition(currentState, targetState, TICKET_STATES);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

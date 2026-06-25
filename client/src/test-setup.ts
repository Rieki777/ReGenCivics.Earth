import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Only stub browser layout methods when running in a DOM environment.
// This file is loaded as a global setupFile for both jsdom (client tests) and
// Node (server tests); Element does not exist in the Node environment.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

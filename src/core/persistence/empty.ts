/**
 * Sandbox empty module to satisfy bundler requirements 
 * for node-specific sub-dependencies when building for the browser.
 */
export default {};
export const resolve = () => {};
export const join = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const promises = {
  readFile: async () => new Uint8Array(),
  writeFile: async () => {},
  mkdir: async () => {},
};

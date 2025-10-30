// _setup.mjs — template setup script
// This file must export a default async function `setup({ ctx, tools })` per
// the create-scaffold template contract. It must not run shell commands or
// perform side-effects at module import time.

export default async function setup({ ctx, tools } = {}) {
  const logger = (tools && tools.logger) ? tools.logger : { info: (...args) => console.log(...args) };

  logger.info('🚀 Template setup: no-op for test fixture.');
  logger.info('Handoff: run `npm install` and then `npm start` to run the project.');

  // Do not perform package installs or spawn processes here. Real template
  // setup should use the provided `tools` helpers to mutate files, ensure
  // blocks, or copy author assets. Keep this function idempotent.
}
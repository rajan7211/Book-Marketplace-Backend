// Only re-export the module so it can be imported from app.module.
// Service/DTO internals are intentionally NOT re-exported to avoid
// ambiguous-name collisions (e.g. AiService) when using `export *`.
export * from './ai.module';
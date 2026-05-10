// Schema tables land in chunk 2 (users, events, audit_log) and beyond.
// This barrel keeps the import path stable across chunks.
export {};

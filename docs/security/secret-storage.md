# Credential storage boundary

MIM Desktop persists API credentials through Electron `safeStorage`. The
encrypted envelope lives beside the portable settings file, while
`mim-settings.json` contains only non-secret preferences.

At startup Electron migrates the legacy plaintext fields, writes the encrypted
envelope first, and removes the plaintext values only after encryption
succeeds. Decrypted credentials are supplied only to the local Next.js child
process and remain server-side. Runtime updates travel back to Electron over the
existing fork IPC channel.

`GET /api/settings` returns only `apiKeysConfigured` booleans. It never returns
credential values. `POST /api/settings` accepts replacements, forwards them to
the secure store, and also returns only the redacted public contract.

When MIM runs as plain `next dev` without its Electron parent, legacy plaintext
credentials are removed from the settings file and hydrated only into the
current server process; new credentials are likewise session-only. MIMweb keeps
a user-provided Gemini key in React memory for the current page session and
removes the legacy browser-storage copy during its one-way migration.

# ADR 0001: Allow-All Policy with Server Cards

Date: 2025-08-09

## Context
Previous policy tracked/recommended counts. We now adopt allow-all installs with advisory deprecation and authoritative server_cards.

## Decision
- Any configurable server may be installed.
- Curated set managed via server_cards (initial 15–17), grown over time.
- Deprecation/not-recommended flags are advisory only.
- Guardrails: canonical paths, template hygiene, no runnable doobidoo/mcp-memory-service outside docs/research/.

## Consequences
- Simplifies adding servers.
- Requires schema and verification of server_cards.
- Encourages continuous external research for up-to-date configs.

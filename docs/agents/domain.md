# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `GLOSSARY.md` at the repo root.
- Relevant ADRs in `docs/adr/`.

If any of these files don't exist, proceed silently. Don't flag their absence or suggest creating them upfront; create them lazily when terms or decisions are resolved.

## File structure

This is a single-context repo:

/
├── GLOSSARY.md
└── docs/
└── adr/

## Use the glossary's vocabulary

When naming a domain concept in output, use the term defined in `GLOSSARY.md`. Don't substitute synonyms the glossary explicitly avoids. If a needed concept is missing, reconsider the terminology or note the glossary gap.

## Flag ADR conflicts

If a proposed change contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.

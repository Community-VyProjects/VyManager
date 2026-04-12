# Contributing to VyManager

**Thanks for contributing! This document explains how we work so we can move fast without breaking things.**

**[Development setup instructions](https://github.com/Community-VyProjects/VyManager?tab=readme-ov-file#development-setup)**

---

## Pull Requests

### Before you open a PR

- **Check the issue tracker first.** If you're building something that doesn't have an issue yet, open one. Even a quick "I'm going to work on X" issue helps avoid duplicate effort and gives others a chance to weigh in on approach before you write code.
- **One feature per PR.** Don't bundle a firewall fix, a sidebar tweak, and a new DHCP field into one PR. Keep them separate. Smaller PRs get reviewed faster and are easier to roll back if something goes wrong.
- **Branch from `main`.** Name your branch something descriptive: `feat/openvpn-support`, `fix/nat-modal-width`, `refactor/sidebar-responsive`. Not `my-changes` or `update`.

### What a good PR looks like

**Title:** Use conventional commit style. `feat: add OpenVPN server configuration`, `fix: NAT modal overflow on mobile`, `refactor: extract shared table scroll wrapper`. This keeps the changelog readable.

**Description:** Explain what you changed and why. Not a novel — a few sentences is fine. If it's a UI change, include a screenshot or short recording. If it changes behavior, say what the old behavior was and what the new behavior is.

**Testing:** Say what you tested. "Tested on VyOS 1.4 and 1.5" or "Tested on desktop and mobile" or "Verified with 3 DHCP pools and 15 static mappings." We don't have automated E2E tests yet, so manual testing notes are how we maintain quality.

**Scope:** If your PR touches more than ~400 lines of meaningful code (not counting generated files), consider whether it can be broken into smaller PRs. Large PRs sit in review longer and are harder to reason about.

### Review process

- Every PR needs at least one review before merge.
- Maintainers aim to do initial review within 48 hours. If it's taking longer, ping in Discord — it probably just got buried.
- Review comments are suggestions, not commands. If you disagree, say so and explain your reasoning. We're all learning.
- Don't take review personally. A "this could be simpler" comment is about the code, not about you.
- Once approved, the author merges.

### What will get a PR sent back

- No description or testing notes
- Multiple unrelated changes bundled together
- Breaking changes to the database schema without a migration
- Hardcoded values that should be configurable
- New features that only work on one VyOS version when both are feasible
- UI changes that break mobile responsiveness (once we have it)
- Skipping the capability endpoint pattern for version-aware features

### Commit messages

We use conventional commits. This isn't bureaucracy — it's what generates our changelog and helps us understand the git history six months from now.

- `feat:` — new feature or capability
- `fix:` — bug fix
- `refactor:` — code restructuring without behavior change
- `docs:` — documentation only
- `chore:` — build, CI, dependency updates
- `style:` — formatting, whitespace, no logic change

Squash your commits before merging if you have a messy history. The merge commit should tell a clean story.

---

## Architecture & Code Guidelines

### The three-layer pattern

Every VyOS configuration feature follows the same structure. Don't invent a new pattern — follow the existing one:

**Router** (API endpoint) → **Builder** (batch operations) → **Mapper** (version-specific VyOS commands)

Mappers have v1.4 and v1.5 implementations. The router calls the builder, the builder calls the mapper, the mapper returns the actual VyOS CLI paths. Every feature exposes a `/capabilities` endpoint so the frontend knows what's available for the connected version.

If you're adding a new feature, look at an existing one that's similar in complexity and follow its structure. The firewall module is a good reference for complex features. The dummy interface module is a good reference for simple ones.

### Frontend conventions

- Components live in `src/components/{feature}/`. One directory per feature area.
- API client functions live in `src/lib/api/{feature}.ts`.
- Every modal should have a create, edit, and delete variant.
- Use shadcn/ui components. Don't pull in new UI libraries without discussing it first.
- All new layouts must be responsive. Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`). If a table has more than 4 columns, it needs a horizontal scroll wrapper.
- State management through Zustand stores for global state, React state for local UI state.

### Backend conventions

- Routers go in `routers/{feature}/`.
- Builders go in `vyos_builders/{feature}/`.
- Mappers go in `vyos_mappers/{feature}/` with version subdirectories.
- Use the RBAC permission decorators on every endpoint. No unprotected configuration endpoints.
- Async everywhere. No blocking calls.
- Sensitive data (API keys, SSH keys, passwords) must be encrypted at rest using the existing encryption utilities.

### Database changes

- All schema changes go through Prisma migrations.
- Never edit a migration that's already been applied in production. Create a new one.
- If your feature needs new tables or columns, include the migration in your PR.
- Think about the upgrade path. Someone running the previous version should be able to run `prisma migrate deploy` and have everything work without manual steps.

---
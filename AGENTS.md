# AGENTS.md

This file is for AI agents and automation-oriented contributors working in this repository.

## Mission

Treat the current project as an engine seed, not just as a one-off demo.

When you make changes, prefer work that increases reuse:

- move hard-coded content toward configuration
- reduce special cases
- keep behavior stable while extracting systems
- document new conventions as soon as you create them

## First Things To Know

- The entire runtime currently lives in [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html).
- Runtime art loads from `Weliwel_Sprites/`.
- `Backup/` is not part of the live asset pipeline.
- There is no package manager, bundler, or test runner in this repository yet.
- The game loop is driven by `requestAnimationFrame`.
- The world is grid-based and rendered in an isometric projection.

## Non-Negotiable Behaviors Unless The User Asks Otherwise

- Preserve the current arrow-key mapping between input and world movement.
- Preserve tile-based movement and collision rules.
- Preserve the camera-follow behavior centered on the player.
- Preserve sprite grounding and depth sorting.
- Preserve browser-only execution unless there is a deliberate refactor plan.

If you intentionally change one of these, update both documentation files in the same task.

## Runtime Mental Model

Think of the prototype as five systems living in one file:

1. UI shell and controls
2. Asset manifest and sprite loading
3. World state and entity state
4. Update systems for player, NPC, camera, and animation
5. Render pipeline for background, tiles, and sorted entities

Do not patch one of these blindly without checking the others. Many behaviors depend on shared assumptions.

## Where Changes Usually Belong

Use these rules when deciding how to implement new work.

### Add or change map content

Edit the world data, not the movement code.

Primary touchpoints:

- `grid`
- `worldObjects`
- `occupancy`
- terrain color generation

Important: `occupancy` is built once from `worldObjects`. If you introduce dynamic solid objects, this will need to become a live system instead of a static `Map`.

### Add a new character

You will usually need to update all of these:

- asset naming convention or manifest generation
- `assets`
- render profiles for sprite bounds, pivots, and reference height
- character state creation
- update logic
- draw logic

Do not add a new character by copying large blocks unless there is no time to refactor. Prefer moving toward a character registry or actor list.

### Add interactions or gameplay systems

Create a system boundary first. Good next systems include:

- interaction detection
- trigger volumes
- dialogue
- inventory
- quests
- combat

Avoid embedding new gameplay rules directly into `render()` or low-level sprite-loading functions.

### Split the single file into modules

This is encouraged, but do it by system, not by random code chunks.

Suggested extraction order:

1. constants and content data
2. projection and drawing helpers
3. asset loading
4. animation and movement systems
5. NPC behavior
6. bootstrap and wiring

## Danger Zones

These parts are easy to break:

- Sprite alignment data: manual source bounds, pivots, and reference heights are critical to making characters stand correctly on tiles.
- `worldSortValue()`: small changes can break visual depth ordering.
- `projectMap()` and `screenProject()`: these define the world-to-screen contract.
- `directions`: input semantics, labels, and sprite direction selection all depend on this mapping.
- `computeSpriteMetrics()`: it contains fallback behavior and sprite trimming assumptions.
- `tryStartCharacterMove()`: this is the shared movement gate for both player and NPC behavior.

If you touch one of these, verify movement, facing, collisions, and sprite grounding together.

## Preferred Development Strategy

When asked to build a new game from this base:

1. Keep the prototype playable at every step.
2. Extract data before extracting abstractions.
3. Convert duplicated behavior into generic systems only after you understand the current assumptions.
4. Leave clear comments only where the code would otherwise be misleading.
5. Update docs when you introduce new conventions, asset rules, or system boundaries.

## Definition Of Done For Engine-Level Work

A change is not complete unless:

- the page still boots in the browser
- controls still behave coherently
- player and NPC movement still respect collisions
- the render order still looks correct
- documentation reflects any new extension rules

## Read Next

Read [docs/ARCHITECTURE.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/ARCHITECTURE.md) before making structural changes.


# Architecture

This document describes the live browser runtime that currently ships in [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html).

The project should be treated as an engine seed for an isometric, grid-based browser game. The runtime is still single-file today, but the important systems are now organized around reusable data registries and shared update loops instead of Weliwel-specific or Majisto-specific logic.

## Core Runtime Contracts

These contracts are still intentionally preserved:

- browser-only execution
- `requestAnimationFrame` main loop
- tile-based movement and collision
- isometric projection
- grounded sprite rendering
- depth sorting through `worldSortValue()`
- camera follow through `sceneConfig.cameraFollowActorId`
- original arrow-key to world-diagonal mapping

If you intentionally change one of those contracts, update this document and the README in the same task.

## Live Runtime Shape

The live runtime currently lives in one file, but it already breaks conceptually into these layers:

1. Scene shell markup and mobile touch overlay
2. Projection, trim, and render-profile data
3. Content registries for actors and props
4. Scene definition and runtime validation
5. Asset manifest generation and sprite loading
6. Shared actor update systems
7. Render pipeline

The older `battle-demo.*` files and the Pygame folder are not the active browser runtime.

## Content Model

The engine now separates reusable content definitions from placed scene instances.

### Reusable registries

- `renderProfiles`
  - manual sprite bounds, pivots, and reference heights for assets that need precise grounding
- `actorCatalog`
  - reusable character or creature definitions
  - examples: Weliwel, Majisto
- `propCatalog`
  - reusable object and scenery definitions
  - examples: mint trees and flower patches

### Placed scene data

- `sceneConfig`
  - scene-level roles such as camera follow and the primary human-controlled actor
- `sceneDefinition.actors`
  - concrete actor placements with stable ids
- `sceneDefinition.props`
  - concrete prop placements with stable ids

This is the main extension rule for the project now:

- add new reusable content in a catalog first
- place instances in `sceneDefinition`
- avoid copying behavior blocks for one-off entities

## Runtime Build Step

The live scene is assembled through `buildSceneRuntime(sceneDefinition)`.

That build step currently:

1. runs `validateSceneContent()`
2. creates prop runtime state from `propCatalog`
3. creates actor runtime state from `actorCatalog`
4. builds static solid occupancy from the placed props
5. creates `charactersById` for fast actor lookup

### Validation rules

`validateSceneContent()` exists so content mistakes fail loudly instead of silently producing broken scenes.

Current checks include:

- missing actor or prop types
- missing render profiles
- duplicate actor ids or prop ids
- out-of-bounds placements
- unknown sprite directions
- overlapping actor spawns
- overlapping solid props
- solid props placed on top of actor spawns
- invalid `sceneConfig` role ids

When adding new content, console validation errors should be the first place to look if the scene fails to boot cleanly.

## Actor Model

All characters and creatures use the same actor state shape created by `createCharacterState()`.

Important actor fields include:

- `id`, `label`, `actorType`
- `controller`
- `spritePrefix`, `metricsType`, `renderProfileId`
- tile position and interpolated render position
- animation state
- wander AI state
- greeting state
- `queuedIdleCycle`

This shared model is what makes it possible to add future characters or creatures without cloning Weliwel-specific code.

## Controllers

Actor behavior now routes through a shared controller dispatch:

- `human` -> `updateHumanCharacter()`
- `wanderer` -> `updateWanderCharacter()`
- unknown controllers -> `updatePassiveCharacter()`

`updateCharacters()` iterates every actor and chooses the right handler from `controllerHandlers`.

### Human control

Human control is scene-configured, not hard-coded to a specific actor name.

- `sceneConfig.primaryHumanActorId` identifies the actor that should respond to keyboard and touch input
- if that actor is not currently using the `human` controller, human input is effectively disabled
- corner touch zones map to world-diagonal movement
- center touch triggers the shared idle-cycle request

### Autonomous wandering

Wander behavior is shared across actors through:

- `scheduleCharacterIdle()`
- `scheduleCharacterWalk()`
- `attemptAutonomousMove()`
- `updateWanderCharacter()`

This is the current base AI for NPCs and creatures that should roam freely.

## Greeting System

Adjacency greetings are no longer hard-wired to Weliwel and Majisto.

`maybeStartGreetings()` scans actor pairs and triggers `startGreeting()` for any adjacent pair that:

- is on neighboring tiles
- has `canGreet`
- is not already latched as the active greeting pair
- is not already greeting

During a greeting:

- both actors stop wandering
- both actors face each other
- both actors play the idle animation
- both actors can resume their controller behavior after the greeting hold ends

This means any future actor or creature can participate just by using the shared actor model and leaving `canGreet` enabled.

## Asset Pipeline

Sprites are loaded from `Weliwel_Sprites/` through a generated manifest.

`makeManifest()` only loads the actor types and prop types that are actually present in the current scene.

### Actor naming convention

Actors currently use:

- `<SpritePrefix>_<frame>_<direction>.png`

Examples:

- `Weliwel_Idle_1_ur.png`
- `Majisto_Walking_3_ll.png`

### Prop naming convention

Props currently use:

- `<SpritePrefix>_<direction>.png`

Examples:

- `tree_ur.png`
- `redflower_ll.png`

### Metrics families

Sprite trimming and fallback bounds are grouped by `metricsType`.

Current metrics families are:

- `humanoid`
- `tree`
- `flower`

If a new creature or object does not fit an existing metrics family, add the new family in:

- `trimConfig`
- `fallbackBounds`

and add a `renderProfile` when automatic trimming is not enough.

## Render Pipeline

The render path is still compact and order-sensitive:

1. `drawBackground()`
2. `drawGround()`
3. `drawEntities()`

`drawEntities()` now builds one sorted list from:

- prop instances in `worldObjects`
- actor instances in `characters`

Important render contracts:

- `projectMap()` and `screenProject()` define world-to-screen projection
- `worldSortValue()` controls visual overlap ordering
- render profiles control grounding and clipping
- actor base height and prop scale still matter to final sprite placement

## Extension Workflow

### Add a new character or creature

1. Add a reusable definition to `actorCatalog`.
2. Choose a `controller` such as `wanderer` or `human`.
3. Set `metricsType`, `baseHeight`, and optional `renderProfileId`.
4. Add a placed instance to `sceneDefinition.actors`.
5. Add new sprite files that follow the actor naming convention.
6. Reload and fix any validation errors before debugging behavior.

### Add a new object or prop

1. Add a reusable definition to `propCatalog`.
2. Set `kind`, `metricsType`, `baseHeight`, `scale`, and `solid`.
3. Add a placed instance to `sceneDefinition.props`.
4. Add a render profile if automatic trimming is not enough.
5. Reload and fix any validation errors before tuning visuals.

### Add a new controller type

1. Create a new shared update function.
2. Register it in `controllerHandlers`.
3. Stage actors against it through `actorCatalog` or scene-instance overrides.
4. Keep the actor state generic unless the new behavior truly needs new fields.

## Danger Zones

These are still the easiest places to break the scene:

- `projectMap()` and `screenProject()`
- `worldSortValue()`
- `computeSpriteMetrics()`
- `renderProfiles`
- `tryStartCharacterMove()`
- `controllerHandlers`
- `makeManifest()`

If you touch one of those, verify movement, collisions, facing, greeting behavior, grounding, and sort order together.

## Current Limitations

The engine is more reusable now, but it still has clear limits:

- single-file browser runtime
- one active scene definition
- one primary-human control slot
- static prop occupancy map
- no interaction/dialogue/inventory/combat system yet
- no save/load
- no package manager or automated test runner

Those limits are acceptable for now as long as new work keeps moving data and behavior toward reusable systems instead of new special cases.

# WalkingLegoTest

This repository currently ships a browser-only isometric garden scene in [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html). The live runtime is meant to be an engine seed: it already supports data-driven actors, props, sprite grounding profiles, wandering AI, and adjacency greetings, and it is structured so new content can be added without copying large gameplay blocks.

## Run It

- There is no build step and no dependency install for the browser runtime.
- Open [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html) in a browser.
- If your browser blocks local sprite loading from `file://`, serve the folder with a simple static server and open it through `http://localhost/...`.

## Current Controls

- `C`: toggle debug grounding markers.
- `I`: trigger the primary human actor's idle cycle when a human-controlled actor is configured.
- Arrow keys and corner/center touch controls are only active when the configured primary actor uses the `human` controller.
- In the current default scene, Weliwel and Majisto both use the `wanderer` controller, so the garden runs autonomously.

Important: the world still uses the original isometric direction contract. `ArrowUp` means upper-right in world space, `ArrowRight` means lower-right, `ArrowDown` means lower-left, and `ArrowLeft` means upper-left.

## Live Files

- [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html): the live browser runtime, including markup, CSS, data registries, update systems, asset loading, and rendering.
- [docs/ARCHITECTURE.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/ARCHITECTURE.md): browser runtime structure and extension rules.
- `Weliwel_Sprites/`: runtime sprites used by the live scene.
- [run_pygame.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/run_pygame.py) and `pygame_port/`: older parallel prototype code.
- `battle-demo.css` and `battle-demo.js`: legacy browser experiment files that are not the active runtime.
- `Backup/`: non-live art backup content.

## Content Model

The runtime now separates reusable definitions from placed scene instances:

- `actorCatalog`: reusable definitions for characters and creatures.
- `propCatalog`: reusable definitions for world objects and scenery.
- `renderProfiles`: manual grounding and clipping profiles for sprites that need explicit bounds and pivots.
- `sceneDefinition.actors`: actor instances placed in the current scene.
- `sceneDefinition.props`: prop instances placed in the current scene.
- `buildSceneRuntime()`: builds live runtime state from the scene definition.
- `validateSceneContent()`: fails early when an actor, prop, render profile, id, or placement is invalid.

This means the normal path for adding content is:

1. Add a reusable actor or creature type in `actorCatalog`.
2. Add a reusable prop or object type in `propCatalog` if needed.
3. Add or reuse a render profile in `renderProfiles` if the sprite cannot rely on automatic trimming.
4. Place concrete instances in `sceneDefinition`.

## Adding Characters And Creatures

To add a new actor cleanly:

1. Add a new entry in `actorCatalog` with a label, sprite prefix, controller type, metrics type, base render height, and optional `renderProfileId`.
2. Add the actor to `sceneDefinition.actors` with an `id`, `actorType`, tile position, and facing direction.
3. If the new sprite has different foot placement or bounding behavior, add a render profile in `renderProfiles`.
4. If the new actor should not participate in greetings, set `canGreet: false`.
5. Reload the page and use any validation error in the console as the first source of truth if the actor does not spawn.

The shared controller layer currently understands:

- `human`: driven by the configured `sceneConfig.primaryHumanActorId`
- `wanderer`: autonomous roaming AI
- any unknown controller falls back to a passive idle pose, which makes it safe to stage future controller types incrementally

Current character sprite naming still follows:

- `Weliwel_<frame>_<direction>.png`
- `Majisto_<frame>_<direction>.png`
- future actors should follow the same `<SpritePrefix>_<frame>_<direction>.png` pattern

## Adding Objects

To add a new prop cleanly:

1. Add a reusable definition in `propCatalog` with a label, sprite prefix, metrics type, base height, scale, and solidity.
2. Add a placed instance in `sceneDefinition.props`.
3. If the prop needs manual bounds or pivots, add a render profile and reference it from the prop definition.
4. Keep `metricsType` aligned with the trim/fallback families already in the runtime: `humanoid`, `tree`, or `flower`, unless you also add a new metrics family.

Current prop sprite naming still follows:

- `tree_<direction>.png`
- `redflower_<direction>.png`
- `whiteflower_<direction>.png`
- `yellowflower_<direction>.png`

## Current Strengths

- Browser-only runtime with no JavaScript dependencies
- Data-driven actor and prop registries instead of one-off placement code
- Shared movement, animation, greeting, and render logic across actor instances
- Camera follow, depth sorting, and grounded sprite rendering still preserved
- Scene stays playable while content grows

## Current Limitations

- The browser runtime is still a single-file implementation
- One live scene definition
- One primary-human control slot
- Static prop occupancy map
- No interaction system, inventory, dialogue, combat, quests, or save/load yet

## Start Here When Growing The Engine

1. Add content to catalogs and scene definitions before adding new special-case logic.
2. Prefer generic actor or prop behaviors over naming checks.
3. Keep render profile changes and sprite additions in the same task.
4. Update [docs/ARCHITECTURE.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/ARCHITECTURE.md) whenever you introduce a new content convention or runtime boundary.

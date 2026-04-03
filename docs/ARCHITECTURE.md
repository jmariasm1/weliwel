# Architecture

This document explains the browser runtime as it exists today, not as a hypothetical future engine.

The repository also contains a parallel Pygame port in [run_pygame.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/run_pygame.py) and `pygame_port/`. That runtime mirrors the same gameplay and rendering contract, but this document continues to describe the HTML implementation as the reference behavior.

## Overview

The current browser application is a self-contained scene implemented in one HTML file. It combines:

- full-screen scene presentation
- canvas rendering
- asset loading
- world data
- player movement
- NPC behavior
- animation timing

The code is wrapped in an IIFE, so there is no module system yet.

## Runtime Flow

The startup and frame lifecycle is:

1. `boot()` runs.
2. The canvas is sized and an initial render happens.
3. Keyboard, pointer-touch, and development controls are wired.
4. `preloadAssets()` loads sprite files from `Weliwel_Sprites/`.
5. Once assets are ready, player and NPC idle states are initialized.
6. `requestAnimationFrame(loop)` drives the game forever.
7. Each frame updates movement, AI, camera, animation, and then renders.

In practical terms, the main orchestration is:

- `boot()`: setup and asset preload
- `loop(now)`: update plus render every frame
- `render()`: draw background, ground, and entities

## Main State Objects

### Scene state

`scene` stores:

- canvas width
- canvas height
- device pixel ratio

This state is refreshed by `resizeCanvas()`.

### Grid state

`grid` defines the world:

- `width`
- `height`
- `tileWidth`
- `tileHeight`
- `tileDepth`

Every gameplay position is tile-based. Rendering converts tile coordinates into screen coordinates later.

### Direction contract

`directions` maps keyboard arrows to:

- tile delta: `dx`, `dy`
- sprite direction key
- human-readable label

This is one of the most important contracts in the project. Input, facing, labels, and animation all depend on it.

### Assets

`assets` is the runtime sprite store:

- `assets.player`
- `assets.majisto`
- `assets.tree`
- `assets.flowers`

Sprites are loaded into this structure after `preloadAssets()`.

### Static world content

`worldObjects` is the current map content. Each object describes:

- `kind`
- `label`
- `x`, `y`
- direction or flower type where relevant
- `solid`
- `scale`
- `shadow`

`occupancy` is derived from `worldObjects` and is used for collision lookups.

Important limitation: `occupancy` assumes static props. It is not designed for dynamic solid objects that move or spawn during play.

### Character state

`createCharacterState()` returns the shared state model for moving characters:

- tile position: `x`, `y`
- render position: `renderX`, `renderY`
- interpolation values: `fromX`, `fromY`, `toX`, `toY`
- movement flags and timing
- facing direction
- animation state
- idle-cycle state
- blocked feedback timing

`player` and `majisto` both use this structure. `majisto` adds AI-specific fields such as:

- `aiDirectionKey`
- `aiDecisionAt`
- `aiWalkUntil`
- `lastRespondedPlayerIdleRunId`

## Coordinate System

The world is tile-based and uses a projected isometric layout.

Two helpers define the projection:

- `projectMap(gridX, gridY)`: converts tile coordinates to projected map coordinates
- `screenProject(gridX, gridY)`: converts projected map coordinates into screen positions using scene size and camera offset

Arrow keys do not mean literal screen directions:

- `ArrowUp`: upper-right in world space
- `ArrowRight`: lower-right
- `ArrowDown`: lower-left
- `ArrowLeft`: upper-left

This is intentional and should be documented whenever controls change.

## Asset Pipeline

The asset system is lightweight but has several important rules.

### Manifest generation

`makeManifest()` builds the list of files to preload using naming conventions.

Expected patterns include:

- `Weliwel_<frame>_<direction>.png`
- `Majisto_<frame>_<direction>.png`
- `tree_<direction>.png`
- `<flower>_<direction>.png`

### Sprite loading

`loadSprite()` loads each image and prepares render metrics.

### Sprite metrics

The project supports two ways of getting sprite bounds:

1. Automatic trimming through `computeSpriteMetrics()`
2. Manual overrides for known assets

Manual override tables currently exist for:

- Weliwel
- Majisto
- flowers

These tables define:

- source bounds
- pivot point
- reference height

This is why the sprites stand correctly on the tiles. If you change art without updating these values, characters may appear to float, sink, or clip.

### Fallback behavior

If automatic trimming fails, the code falls back to predefined bounds in `fallbackBounds`.

## Animation System

Characters can be in two animation families:

- `walking`
- `idle`

Important sequences:

- `walkingSequence`
- `idleSequence`
- `idleCycleSequence`

Animation flow:

- `setCharacterAnimation()` switches animation modes
- `stepCharacterAnimation()` advances frames over time
- idle cycles are scheduled with `scheduleNextIdleCycle()`

The player and NPC share the same animation machinery.

## Movement And Collision

Shared movement logic lives in `tryStartCharacterMove()`.

That function:

- reads a direction
- updates facing
- computes the next tile
- checks map bounds
- checks `occupancy`
- checks other characters
- starts interpolated movement if the tile is free

Player-specific flow:

- input is tracked in `pressedControls`
- `getActiveDirectionKey()` chooses the most recently pressed active direction
- `updateMovement()` either starts a move or interpolates the current move

NPC-specific flow:

- `updateMajistoMovement()` manages idle, wandering, movement continuation, and collision fallback

## NPC Behavior

Majisto is a simple autonomous actor, but the code already shows a useful pattern for future game agents.

Current behavior includes:

- random idle windows
- random walk windows
- retrying movement when blocked
- reacting when the player performs an idle cycle nearby

The behavior helpers are:

- `scheduleMajistoIdle()`
- `scheduleMajistoWalk()`
- `maybeMajistoRespondToWeliwelIdle()`
- `maybePickMajistoBehavior()`
- `attemptMajistoMove()`

This is still character-specific logic, not a generic AI system.

## Camera

The camera is a simple follow camera:

- it targets the player's interpolated position
- it moves smoothly toward that target each frame

The logic lives in `updateCamera()`.

If future games need cutscenes, room transitions, or multiple targets, this system will need to be generalized.

## Render Pipeline

Rendering happens in three broad passes:

1. `drawBackground()`
2. `drawGround()`
3. `drawEntities()`

### Background

The background is painted procedurally using gradients and simple shapes.

### Ground

The ground is drawn tile by tile using:

- `tileTone`
- `drawTile()`
- `shade()`

The grass variation is procedural and based on `hashTile()`.

### Entities

`drawEntities()` merges props and characters into one list, sorts by depth, and draws them in order.

Depth ordering depends on `worldSortValue()`.

This is a core engine behavior. If you later support taller actors, bridges, stacked floors, or partial overlap rules, this function will need redesign.

## Input And UI

The browser runtime now renders as a full-screen game surface with no visible readout panel or text overlays.

Important wiring functions:

- `wireKeyboard()`
- `wireTouchControls()`

`wireTouchControls()` treats the scene itself as the mobile interface:

- top-left corner: `ArrowLeft` / upper-left movement
- top-right corner: `ArrowUp` / upper-right movement
- bottom-right corner: `ArrowRight` / lower-right movement
- bottom-left corner: `ArrowDown` / lower-left movement
- center zone: trigger Weliwel's idle cycle

Corner presses start movement immediately and can be held to continue moving after each tile step.

Development-only helpers:

- `toggleMarkerVisibility()`
- `C` keyboard shortcut
- `I` keyboard shortcut for forced idle testing

## Current Extension Points

If you want to build a new game from this base, the cleanest early extension points are:

### 1. Content extraction

Move these out of inline code and into game data:

- grid definition
- static objects
- character definitions
- animation timing constants
- AI tuning values
- color palettes

### 2. Actor generalization

Replace explicit `player` and `majisto` handling with:

- an actor list
- per-actor controller types such as player, wanderer, scripted, or static

### 3. Map system

Introduce reusable map data with:

- dimensions
- terrain metadata
- spawn points
- prop placement
- collision layers

### 4. Interaction system

Add tile or proximity-based interactions before adding larger gameplay systems.

### 5. File structure refactor

Once the constants and content are extracted, split systems into modules.

## Recommended Next Refactor

If the goal is "one engine, several games," the next high-value step is not a complete rewrite.

The best next step is:

1. Create a single `gameConfig` or `sceneConfig` object.
2. Move `grid`, `worldObjects`, character spawn data, and tuning constants into it.
3. Rewrite the current functions to read from that config.
4. Only then extract modules.

This keeps the prototype working while making the content portable.

## What This Project Is Not Yet

To avoid false assumptions, this project does not yet provide:

- reusable scene loading
- entity-component architecture
- pathfinding
- save/load
- combat systems
- dialogue systems
- audio systems
- build tooling
- automated tests

That is fine. The current prototype is still valuable because it already defines the rendering and movement contract a future engine can grow around.


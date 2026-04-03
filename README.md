# WalkingLegoTest

This repository is a browser-first prototype that should serve as the starting point for a small isometric game engine and future games built on top of it.

Right now the project is a single playable scene with two runtimes:

- One player-controlled character: Weliwel
- One autonomous NPC: Majisto
- A fixed 13x13 isometric grid
- Static blocking props: trees and flowers
- Canvas-based rendering with a camera that follows the player
- A full-screen browser play surface with keyboard and mobile tap controls
- Sprite loading, trimming, and manual sprite alignment profiles
- A parallel Pygame desktop port that preserves the same movement and rendering contract

The code already proves the most important engine foundations:

- Tile-to-screen projection
- Depth sorting
- Character animation state
- Grid collision
- Basic NPC behavior
- Runtime asset preloading

It is not yet a general-purpose engine. Most data is still hard-coded inside `index.html` or the mirrored Python config. The goal of this documentation is to make that current state understandable and safe to extend.

## Run It

Browser runtime:

- There is no build step and no dependency install.
- Open [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html) in a browser.
- If your browser blocks local asset loading from `file://`, serve the folder with any simple static server and open the page through `http://localhost/...`.

Pygame runtime:

- Install the one Python dependency with `python -m pip install -r requirements.txt`
- Start the desktop port with `python run_pygame.py`
- See [docs/PYGAME_PORT.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/PYGAME_PORT.md) for the Python runtime structure

## Controls

- `ArrowUp`: move upper-right in world space
- `ArrowRight`: move lower-right
- `ArrowDown`: move lower-left
- `ArrowLeft`: move upper-left
- `C`: toggle development markers
- `I`: trigger Weliwel's idle animation cycle
- Touch in the browser: tap near the top-left corner to move upper-left, top-right for upper-right, bottom-right for lower-right, bottom-left for lower-left, and the center area to trigger Weliwel's idle animation

Important: the arrow keys still map to the diagonal axes of the isometric world, not to screen-up and screen-right movement.

## Project Layout

- [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html): the entire browser application, including HTML, CSS, and JavaScript engine logic
- [run_pygame.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/run_pygame.py): entry point for the Pygame desktop port
- `pygame_port/`: Python runtime modules for config, asset loading, and gameplay/rendering systems
- `Weliwel_Sprites/`: runtime sprite assets used by both runtimes
- `Backup/`: duplicate or fallback art assets, not referenced by runtime code
- [docs/ARCHITECTURE.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/ARCHITECTURE.md): technical breakdown of the browser engine
- [docs/PYGAME_PORT.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/PYGAME_PORT.md): technical notes for the parallel Python/Pygame runtime
- [AGENTS.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/AGENTS.md): working guide for AI agents and automation-oriented contributors

## What Exists Today

The project is best understood as a vertical slice of an engine rather than a finished engine.

Current strengths:

- Clean playable prototype in the browser with no external JavaScript dependencies
- Full-screen browser presentation with direct on-surface touch controls
- Parallel browser and Pygame runtimes that share the same movement and render contract
- Sprite-based rendering with good visual grounding on tiles
- Collision between player, NPC, and static world objects
- Autonomous NPC movement and idle response behavior
- Useful debug marker toggle for anchor-point checking

Current limitations:

- Browser code is still single-file
- One hard-coded map
- One player and one NPC wired explicitly into logic
- No game state serialization
- No interaction system, inventory, dialogue, quests, combat, or audio
- No scene loader or content pipeline beyond naming conventions
- No automated tests

## Start Here When Building A New Game

Use this order when turning the prototype into a reusable base:

1. Read [docs/ARCHITECTURE.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/ARCHITECTURE.md) to understand the current browser runtime flow.
2. Read [docs/PYGAME_PORT.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/PYGAME_PORT.md) if you are extending the desktop runtime.
3. Decide what is engine code and what is game content.
4. Move hard-coded content into data objects first:
   - grid size
   - map objects
   - character definitions
   - sprite manifests
   - tuning values such as movement speed and AI timing
5. Only after the data is externalized, split the engine into separate files or modules.
6. Add the next missing system as a reusable subsystem instead of a one-off patch:
   - interaction
   - dialogue
   - triggers
   - multiple maps
   - save/load

## Recommended Refactor Direction

If this repository is going to become the base for several games, the safest medium-term target is:

- `src/engine/`: rendering, animation, input, camera, movement, collisions
- `src/content/`: maps, characters, props, sprite manifests
- `src/game/`: game-specific rules and behaviors
- `assets/`: runtime sprites and other art

Before that refactor, the smallest high-value improvement is to extract the hard-coded constants in `index.html` and `pygame_port/config.py` into configuration objects that both runtimes can share.

## Documentation Map

- Humans starting the project: read this file first
- AI agents making changes: read [AGENTS.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/AGENTS.md) first
- Anyone changing browser systems or architecture: read [docs/ARCHITECTURE.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/ARCHITECTURE.md)
- Anyone extending the desktop runtime: read [docs/PYGAME_PORT.md](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/docs/PYGAME_PORT.md)

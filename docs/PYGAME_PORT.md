# Pygame Port

This repository now includes a parallel Python/Pygame runtime for the same Weliwel and Majisto prototype.

Important:

- The browser scene in [index.html](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/index.html) still exists unchanged.
- The Pygame port is an additional runtime, not a replacement for the HTML version.
- The port preserves the same movement contract, tile collisions, camera follow behavior, sprite grounding rules, and depth sorting assumptions.

## Run It

1. Install the Python dependency:
   `python -m pip install -r requirements.txt`
2. Start the desktop version:
   `python run_pygame.py`

## File Map

- [run_pygame.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/run_pygame.py): entry point for the desktop runtime
- [pygame_port/config.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/pygame_port/config.py): extracted game content, world data, sprite profiles, and tuning constants
- [pygame_port/assets.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/pygame_port/assets.py): manifest generation, sprite loading, cropping, and render metric preservation
- [pygame_port/runtime.py](/D:/New%20folder%20(4)/GPT%20Apps/WalkingLegoTest/pygame_port/runtime.py): update loop, input handling, NPC behavior, camera, and drawing

## Porting Rules

When extending the Pygame version, keep these contracts aligned with the HTML scene unless the task explicitly asks for a behavior change:

- `ArrowUp` moves upper-right in world space.
- `ArrowRight` moves lower-right.
- `ArrowDown` moves lower-left.
- `ArrowLeft` moves upper-left.
- Movement remains tile-based.
- Static world collisions still come from the configured world objects.
- Camera follow still targets Weliwel's interpolated position.
- Entity draw order still depends on projected world depth rather than insertion order.

## Asset Notes

- The Pygame port reuses the same `Weliwel_Sprites/` folder.
- Character and flower grounding still use the manual source bounds, pivots, and reference heights from the browser version.
- Tree sprites still use computed trimming with the same fallback bounds strategy.

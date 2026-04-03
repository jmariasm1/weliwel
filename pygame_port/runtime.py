from __future__ import annotations

import math
import random
from dataclasses import dataclass
from pathlib import Path

import pygame

from .assets import AssetStore, SpriteFrame, load_assets
from .config import (
    CONTROL_LINES,
    DEFAULT_WINDOW_SIZE,
    DIRECTION_LABEL_BY_SPRITE,
    DIRECTION_ORDER,
    DIRECTIONS,
    EYEBROW,
    FPS,
    GRID,
    IDLE_CYCLE_SEQUENCE,
    LEDE,
    MIN_WINDOW_SIZE,
    PANEL_LEGEND_ITEMS,
    READY_HINT,
    READY_STATUS,
    STATUS_PILL_TEXT,
    TERRAIN_PALETTE,
    TITLE,
    TRIM_CONFIG,
    WALKING_SEQUENCE,
    WINDOW_TITLE,
    WORLD_OBJECTS,
)


PAGE_BG_TOP = (223, 246, 234)
PAGE_BG_BOTTOM = (139, 184, 144)
PANEL_BG = (14, 44, 28, 214)
PANEL_BORDER = (224, 249, 227, 48)
PANEL_TEXT = (245, 255, 239)
PANEL_TEXT_MUTED = (190, 210, 193)
SCENE_BORDER = (255, 255, 255, 32)
STATUS_BG = (20, 48, 33, 190)
MARKER_COLOR = (7, 18, 13)
LEGEND_SWATCH = {
    "player": (214, 169, 64),
    "blocked": (255, 134, 102),
    "safe": (91, 165, 111),
}
SCENE_SKY_TOP = (217, 247, 239)
SCENE_SKY_MID = (159, 213, 165)
SCENE_SKY_BOTTOM = (90, 148, 100)

KEY_TO_DIRECTION = {
    pygame.K_UP: "ArrowUp",
    pygame.K_RIGHT: "ArrowRight",
    pygame.K_DOWN: "ArrowDown",
    pygame.K_LEFT: "ArrowLeft",
}


@dataclass
class Layout:
    panel_rect: pygame.Rect
    scene_rect: pygame.Rect


@dataclass
class CameraState:
    x: float = 0.0
    y: float = 0.0


@dataclass
class CharacterState:
    x: int
    y: int
    render_x: float
    render_y: float
    from_x: float
    from_y: float
    to_x: float
    to_y: float
    moving: bool
    move_started_at: float
    move_duration: float
    direction: str
    animation: str
    frame_index: int
    frame_timer: float
    idle_frame: str
    idle_cycle_active: bool
    idle_cycle_index: int
    idle_cycle_run_id: int
    next_idle_cycle_at: float
    blocked_until: float
    ai_direction_key: str | None = None
    ai_decision_at: float = 0.0
    ai_walk_until: float = 0.0
    last_responded_player_idle_run_id: int = 0


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def ease_in_out_sine(value: float) -> float:
    return -(math.cos(math.pi * value) - 1.0) / 2.0


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def shade(color: tuple[int, int, int], amount: int) -> tuple[int, int, int]:
    return (
        int(clamp(color[0] + amount, 0, 255)),
        int(clamp(color[1] + amount, 0, 255)),
        int(clamp(color[2] + amount, 0, 255)),
    )


def lerp_color(start: tuple[int, int, int], end: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return (
        int(start[0] + (end[0] - start[0]) * amount),
        int(start[1] + (end[1] - start[1]) * amount),
        int(start[2] + (end[2] - start[2]) * amount),
    )


def create_character_state(x: int, y: int, direction: str) -> CharacterState:
    return CharacterState(
        x=x,
        y=y,
        render_x=float(x),
        render_y=float(y),
        from_x=float(x),
        from_y=float(y),
        to_x=float(x),
        to_y=float(y),
        moving=False,
        move_started_at=0.0,
        move_duration=200.0,
        direction=direction,
        animation="idle",
        frame_index=0,
        frame_timer=0.0,
        idle_frame="Idle_1",
        idle_cycle_active=False,
        idle_cycle_index=0,
        idle_cycle_run_id=0,
        next_idle_cycle_at=math.inf,
        blocked_until=0.0,
    )


def tile_key(x: int, y: int) -> str:
    return f"{x},{y}"


def hash_tile(x: int, y: int) -> int:
    value = ((x * 92837111) ^ (y * 689287499) ^ (x * y * 97)) & 0xFFFFFFFF
    return value - 0x100000000 if value & 0x80000000 else value


class Game:
    def __init__(self, root_dir: Path) -> None:
        pygame.init()
        pygame.display.set_caption(WINDOW_TITLE)
        self.window = pygame.display.set_mode(DEFAULT_WINDOW_SIZE, pygame.RESIZABLE)
        self.clock = pygame.time.Clock()
        self.root_dir = root_dir
        self.random = random.Random()
        self.layout = self.compute_layout(self.window.get_size())
        self.fonts = self._build_fonts()
        self.camera = CameraState()
        self.pressed_controls: dict[str, float] = {}
        self.show_markers = False
        self.state_label = "Loading sprites..."
        self.hint_label = "Loading sprite sheet..."
        self.status_label = "Preparing the garden..."
        self.running = True
        self.world_objects = WORLD_OBJECTS
        self.occupancy = {tile_key(obj.x, obj.y): obj for obj in self.world_objects}
        self.tile_tones = [
            [hex_to_rgb(TERRAIN_PALETTE[abs(hash_tile(x, y)) % len(TERRAIN_PALETTE)]) for x in range(GRID.width)]
            for y in range(GRID.height)
        ]
        self.player = create_character_state(2, 9, "ur")
        self.majisto = create_character_state(10, 9, "ll")
        self.assets = self._load_assets()
        self._initialize_runtime()

    def _build_fonts(self) -> dict[str, pygame.font.Font]:
        return {
            "eyebrow": pygame.font.SysFont("trebuchetms", 14, bold=True),
            "title": pygame.font.SysFont("trebuchetms", 34, bold=True),
            "body": pygame.font.SysFont("trebuchetms", 16),
            "small": pygame.font.SysFont("trebuchetms", 13),
            "label": pygame.font.SysFont("trebuchetms", 12, bold=True),
            "value": pygame.font.SysFont("trebuchetms", 20, bold=True),
            "scene": pygame.font.SysFont("trebuchetms", 15, bold=True),
        }

    def _load_assets(self) -> AssetStore:
        return load_assets(self.root_dir / "Weliwel_Sprites")

    def _initialize_runtime(self) -> None:
        now = float(pygame.time.get_ticks())
        self.player.idle_frame = "Idle_1"
        self.majisto.idle_frame = "Idle_1"
        self.schedule_next_idle_cycle(self.player, now)
        self.schedule_next_idle_cycle(self.majisto, now)
        self.majisto.ai_decision_at = now + self.random_between(500.0, 1400.0)
        self.majisto.ai_direction_key = None
        self.majisto.ai_walk_until = 0.0
        self.state_label = "Idle"
        self.hint_label = READY_HINT
        self.status_label = READY_STATUS

    def compute_layout(self, size: tuple[int, int]) -> Layout:
        width = max(size[0], MIN_WINDOW_SIZE[0])
        height = max(size[1], MIN_WINDOW_SIZE[1])
        padding = 20 if width >= 1200 else 14
        gap = 20 if width >= 1200 else 14
        usable_width = width - padding * 2 - gap
        panel_width = min(max(280, int(width * 0.24)), 360)
        panel_width = min(panel_width, usable_width - 360)
        panel_width = max(panel_width, 260)
        scene_width = usable_width - panel_width
        panel_rect = pygame.Rect(padding, padding, panel_width, height - padding * 2)
        scene_rect = pygame.Rect(panel_rect.right + gap, padding, scene_width, height - padding * 2)
        return Layout(panel_rect=panel_rect, scene_rect=scene_rect)

    def resize(self, size: tuple[int, int]) -> None:
        width = max(size[0], MIN_WINDOW_SIZE[0])
        height = max(size[1], MIN_WINDOW_SIZE[1])
        self.window = pygame.display.set_mode((width, height), pygame.RESIZABLE)
        self.layout = self.compute_layout((width, height))

    def random_between(self, minimum: float, maximum: float) -> float:
        return minimum + self.random.random() * (maximum - minimum)

    def schedule_next_idle_cycle(self, character: CharacterState, now: float) -> None:
        character.next_idle_cycle_at = now + 9000.0 + self.random.random() * 21000.0

    def pick_random_direction(self, excluded_direction_key: str | None = None) -> str:
        pool = [key for key in DIRECTION_ORDER if key != excluded_direction_key]
        return self.random.choice(pool)

    def start_character_idle_cycle(self, character: CharacterState, now: float) -> None:
        if character.animation != "idle":
            self.set_character_animation(character, "idle", now)
        character.idle_cycle_active = True
        character.idle_cycle_index = 0
        character.frame_timer = 0.0
        character.idle_frame = IDLE_CYCLE_SEQUENCE[0]
        character.idle_cycle_run_id += 1

    def are_characters_adjacent(self, left: CharacterState, right: CharacterState) -> bool:
        return abs(left.x - right.x) + abs(left.y - right.y) == 1

    def get_direction_key_toward(self, source: CharacterState, target: CharacterState) -> str | None:
        delta_x = target.x - source.x
        delta_y = target.y - source.y
        for direction_key in DIRECTION_ORDER:
            direction = DIRECTIONS[direction_key]
            if direction.dx == delta_x and direction.dy == delta_y:
                return direction_key
        return None

    def activate_control(self, direction_key: str, now: float) -> None:
        self.pressed_controls[direction_key] = now

    def deactivate_control(self, direction_key: str) -> None:
        self.pressed_controls.pop(direction_key, None)

    def clear_controls(self) -> None:
        self.pressed_controls.clear()

    def get_active_direction_key(self) -> str | None:
        best_key: str | None = None
        best_time = -math.inf
        for direction_key in DIRECTION_ORDER:
            pressed_at = self.pressed_controls.get(direction_key)
            if pressed_at is None:
                continue
            if pressed_at >= best_time:
                best_key = direction_key
                best_time = pressed_at
        return best_key

    def toggle_marker_visibility(self) -> None:
        self.show_markers = not self.show_markers
        self.status_label = "Anchor markers: ON" if self.show_markers else "Anchor markers: OFF"

    def trigger_idle_cycle(self, now: float) -> None:
        if self.player.moving:
            self.status_label = "Stop moving before forcing idle animation."
            return
        self.set_character_animation(self.player, "idle", now)
        self.start_character_idle_cycle(self.player, now)
        self.status_label = "Manual idle cycle triggered."

    def project_map(self, grid_x: float, grid_y: float) -> tuple[float, float]:
        map_x = (grid_x - grid_y) * GRID.tile_width * 0.5
        map_y = (grid_x + grid_y) * GRID.tile_height * 0.5
        return (map_x, map_y)

    def screen_project(self, grid_x: float, grid_y: float, scene_size: tuple[int, int]) -> tuple[float, float]:
        map_x, map_y = self.project_map(grid_x, grid_y)
        return (
            map_x + scene_size[0] * 0.5 + self.camera.x,
            map_y + scene_size[1] * 0.28 + self.camera.y,
        )

    def world_sort_value(self, entity_kind: str, x: float, y: float) -> float:
        bias = 0.06 if entity_kind in ("player", "majisto") else 0.02
        return y + x + bias

    def get_current_character_frame(self, character: CharacterState) -> str:
        if character.animation == "walking":
            return WALKING_SEQUENCE[character.frame_index % len(WALKING_SEQUENCE)]
        return character.idle_frame

    def set_character_animation(self, character: CharacterState, animation: str, now: float) -> None:
        if character.animation == animation:
            return
        character.animation = animation
        character.frame_index = 0
        character.frame_timer = 0.0
        if animation == "walking":
            character.idle_frame = "Idle_1"
            character.idle_cycle_active = False
            return
        character.idle_frame = "Idle_1"
        character.idle_cycle_active = False
        character.idle_cycle_index = 0
        self.schedule_next_idle_cycle(character, now)
    def step_character_animation(self, character: CharacterState, delta_ms: float, now: float) -> None:
        if character.animation == "walking":
            duration = 86.0
            character.frame_timer += delta_ms
            while character.frame_timer >= duration:
                character.frame_timer -= duration
                character.frame_index = (character.frame_index + 1) % len(WALKING_SEQUENCE)
            return

        if not character.idle_cycle_active:
            character.idle_frame = "Idle_1"
            if now >= character.next_idle_cycle_at:
                self.start_character_idle_cycle(character, now)
            return

        duration = 230.0
        character.frame_timer += delta_ms
        while character.frame_timer >= duration:
            character.frame_timer -= duration
            character.idle_cycle_index += 1
            if character.idle_cycle_index >= len(IDLE_CYCLE_SEQUENCE):
                character.idle_cycle_active = False
                character.idle_cycle_index = 0
                character.idle_frame = "Idle_1"
                self.schedule_next_idle_cycle(character, now)
                return
            character.idle_frame = IDLE_CYCLE_SEQUENCE[character.idle_cycle_index]

    def get_blocking_character_at(self, next_x: int, next_y: int, moving_character: CharacterState) -> tuple[CharacterState, str] | None:
        if moving_character is not self.player and self.player.x == next_x and self.player.y == next_y:
            return (self.player, "Weliwel")
        if moving_character is not self.majisto and self.majisto.x == next_x and self.majisto.y == next_y:
            return (self.majisto, "Majisto")
        return None

    def try_start_character_move(self, character: CharacterState, direction_key: str, now: float) -> dict[str, object]:
        direction = DIRECTIONS.get(direction_key)
        if direction is None:
            return {"moved": False}

        character.direction = direction.sprite
        next_x = character.x + direction.dx
        next_y = character.y + direction.dy
        out_of_bounds = next_x < 0 or next_y < 0 or next_x >= GRID.width or next_y >= GRID.height
        target_key = tile_key(next_x, next_y)
        blocking_object = None if out_of_bounds else self.occupancy.get(target_key)
        blocking_character = None if out_of_bounds else self.get_blocking_character_at(next_x, next_y, character)

        if out_of_bounds or blocking_object or blocking_character:
            return {
                "moved": False,
                "next_x": next_x,
                "next_y": next_y,
                "out_of_bounds": out_of_bounds,
                "blocking_object": blocking_object,
                "blocking_character": blocking_character,
            }

        character.from_x = character.render_x
        character.from_y = character.render_y
        character.to_x = float(next_x)
        character.to_y = float(next_y)
        character.x = next_x
        character.y = next_y
        character.move_started_at = now
        character.moving = True
        self.set_character_animation(character, "walking", now)
        return {"moved": True, "next_x": next_x, "next_y": next_y}

    def try_start_move(self, direction_key: str, now: float) -> bool:
        result = self.try_start_character_move(self.player, direction_key, now)
        if result["moved"]:
            self.state_label = "Walking"
            self.status_label = "Walking..."
            self.hint_label = "Hold a direction to keep moving through the clearing."
            return True

        self.player.blocked_until = now + 520.0
        self.set_character_animation(self.player, "idle", now)
        self.state_label = "Idle"
        blocking_object = result.get("blocking_object")
        blocking_character = result.get("blocking_character")
        next_x = int(result.get("next_x", self.player.x))
        next_y = int(result.get("next_y", self.player.y))
        if blocking_object is not None:
            self.status_label = f"{blocking_object.label} blocks that tile."
            self.hint_label = f"Collision active: {blocking_object.label} occupies ({next_x}, {next_y})."
        elif blocking_character is not None:
            _, label = blocking_character
            self.status_label = f"{label} blocks that tile."
            self.hint_label = f"{label} is occupying ({next_x}, {next_y})."
        else:
            self.status_label = "The edge of the map blocks that tile."
            self.hint_label = "Weliwel cannot move outside the garden grid."
        return False

    def try_start_majisto_move(self, direction_key: str, now: float) -> bool:
        result = self.try_start_character_move(self.majisto, direction_key, now)
        if result["moved"]:
            return True
        self.majisto.blocked_until = now + 420.0
        self.set_character_animation(self.majisto, "idle", now)
        return False

    def update_player_movement(self, now: float) -> None:
        active_direction = self.get_active_direction_key()
        if not self.player.moving:
            self.player.render_x = float(self.player.x)
            self.player.render_y = float(self.player.y)
            if active_direction is not None:
                self.try_start_move(active_direction, now)
            else:
                self.set_character_animation(self.player, "idle", now)
                if self.player.blocked_until and now > self.player.blocked_until:
                    self.player.blocked_until = 0.0
                    self.status_label = "Ready to move."
            return

        elapsed = now - self.player.move_started_at
        progress = clamp(elapsed / self.player.move_duration, 0.0, 1.0)
        eased = ease_in_out_sine(progress)
        self.player.render_x = self.player.from_x + (self.player.to_x - self.player.from_x) * eased
        self.player.render_y = self.player.from_y + (self.player.to_y - self.player.from_y) * eased

        if progress >= 1.0:
            self.player.moving = False
            self.player.render_x = self.player.to_x
            self.player.render_y = self.player.to_y
            if not (active_direction and self.try_start_move(active_direction, now)):
                self.set_character_animation(self.player, "idle", now)
                self.state_label = "Idle"
                self.status_label = "Ready to move."

    def schedule_majisto_idle(self, now: float, minimum_delay: float = 900.0, maximum_delay: float = 2800.0) -> None:
        self.majisto.ai_direction_key = None
        self.majisto.ai_walk_until = 0.0
        self.majisto.ai_decision_at = now + self.random_between(minimum_delay, maximum_delay)
        self.set_character_animation(self.majisto, "idle", now)

    def schedule_majisto_walk(self, now: float, direction_key: str | None = None) -> None:
        self.majisto.ai_direction_key = direction_key or self.pick_random_direction()
        self.majisto.ai_walk_until = now + self.random_between(1100.0, 3600.0)
        if self.majisto.ai_decision_at < now:
            self.majisto.ai_decision_at = now

    def maybe_majisto_respond_to_weliwel_idle(self, now: float) -> bool:
        if self.majisto.moving or not self.player.idle_cycle_active:
            return False
        if self.player.idle_cycle_run_id <= 0 or self.majisto.last_responded_player_idle_run_id == self.player.idle_cycle_run_id:
            return False
        if not self.are_characters_adjacent(self.majisto, self.player):
            return False

        look_direction_key = self.get_direction_key_toward(self.majisto, self.player)
        if look_direction_key is not None:
            self.majisto.direction = DIRECTIONS[look_direction_key].sprite
        self.majisto.ai_direction_key = None
        self.majisto.ai_walk_until = 0.0
        self.majisto.ai_decision_at = now + self.random_between(1400.0, 3400.0)
        self.majisto.last_responded_player_idle_run_id = self.player.idle_cycle_run_id
        self.start_character_idle_cycle(self.majisto, now)
        return True

    def maybe_pick_majisto_behavior(self, now: float) -> None:
        if self.majisto.ai_direction_key or now < self.majisto.ai_decision_at:
            return
        if self.random.random() < 0.45:
            self.schedule_majisto_idle(now, 1300.0, 5400.0)
            return
        self.schedule_majisto_walk(now)

    def attempt_majisto_move(self, now: float, max_attempts: int = 3) -> bool:
        for _ in range(max_attempts):
            if self.majisto.ai_direction_key is None:
                return False
            if self.try_start_majisto_move(self.majisto.ai_direction_key, now):
                return True
            if self.random.random() < 0.5:
                self.schedule_majisto_idle(now, 700.0, 1900.0)
                return False
            self.schedule_majisto_walk(now, self.pick_random_direction(self.majisto.ai_direction_key))
        self.schedule_majisto_idle(now, 700.0, 1700.0)
        return False

    def update_majisto_movement(self, now: float) -> None:
        if not self.majisto.moving:
            self.majisto.render_x = float(self.majisto.x)
            self.majisto.render_y = float(self.majisto.y)
            if self.maybe_majisto_respond_to_weliwel_idle(now):
                return

            if self.majisto.ai_direction_key and now >= self.majisto.ai_walk_until:
                if self.random.random() < 0.5:
                    self.schedule_majisto_idle(now, 900.0, 2600.0)
                    return
                self.schedule_majisto_walk(now, self.pick_random_direction(self.majisto.ai_direction_key))

            self.maybe_pick_majisto_behavior(now)

            if self.majisto.ai_direction_key is None:
                self.set_character_animation(self.majisto, "idle", now)
                return

            if not self.attempt_majisto_move(now, 3):
                self.set_character_animation(self.majisto, "idle", now)
            return

        elapsed = now - self.majisto.move_started_at
        progress = clamp(elapsed / self.majisto.move_duration, 0.0, 1.0)
        eased = ease_in_out_sine(progress)
        self.majisto.render_x = self.majisto.from_x + (self.majisto.to_x - self.majisto.from_x) * eased
        self.majisto.render_y = self.majisto.from_y + (self.majisto.to_y - self.majisto.from_y) * eased

        if progress >= 1.0:
            self.majisto.moving = False
            self.majisto.render_x = self.majisto.to_x
            self.majisto.render_y = self.majisto.to_y
            if self.majisto.ai_direction_key is None or now >= self.majisto.ai_walk_until:
                if self.random.random() < 0.55:
                    self.schedule_majisto_idle(now, 850.0, 2600.0)
                    return
                self.schedule_majisto_walk(now, self.pick_random_direction(self.majisto.ai_direction_key))
            if not self.attempt_majisto_move(now, 2):
                self.set_character_animation(self.majisto, "idle", now)

    def update_camera(self) -> None:
        anchor_x, anchor_y = self.project_map(self.player.render_x, self.player.render_y)
        target_x = -anchor_x
        target_y = self.layout.scene_rect.height * 0.22 - anchor_y
        self.camera.x += (target_x - self.camera.x) * 0.12
        self.camera.y += (target_y - self.camera.y) * 0.12

    def update(self, delta_ms: float, now: float) -> None:
        self.update_player_movement(now)
        self.update_majisto_movement(now)
        self.update_camera()
        self.step_character_animation(self.player, delta_ms, now)
        self.step_character_animation(self.majisto, delta_ms, now)

    def handle_events(self, now: float) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                continue

            if event.type == pygame.VIDEORESIZE:
                self.resize((event.w, event.h))
                continue

            if hasattr(pygame, "WINDOWFOCUSLOST") and event.type == pygame.WINDOWFOCUSLOST:
                self.clear_controls()
                continue

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_c:
                    self.toggle_marker_visibility()
                    continue
                if event.key == pygame.K_i:
                    self.trigger_idle_cycle(now)
                    continue
                direction_key = KEY_TO_DIRECTION.get(event.key)
                if direction_key is not None:
                    self.activate_control(direction_key, now)
                continue

            if event.type == pygame.KEYUP:
                direction_key = KEY_TO_DIRECTION.get(event.key)
                if direction_key is not None:
                    self.deactivate_control(direction_key)

    def wrap_text(self, font: pygame.font.Font, text: str, max_width: int) -> list[str]:
        if not text:
            return [""]
        words = text.split()
        lines: list[str] = []
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if font.size(candidate)[0] <= max_width:
                current = candidate
                continue
            lines.append(current)
            current = word
        lines.append(current)
        return lines

    def draw_wrapped_text(
        self,
        surface: pygame.Surface,
        font: pygame.font.Font,
        text: str,
        color: tuple[int, int, int],
        rect: pygame.Rect,
        line_gap: int = 4,
        max_lines: int | None = None,
    ) -> int:
        lines = self.wrap_text(font, text, rect.width)
        if max_lines is not None:
            lines = lines[:max_lines]
        y = rect.y
        for line in lines:
            rendered = font.render(line, True, color)
            surface.blit(rendered, (rect.x, y))
            y += rendered.get_height() + line_gap
        return y

    def draw_alpha_rect(
        self,
        surface: pygame.Surface,
        rect: pygame.Rect,
        color: tuple[int, int, int, int],
        border_radius: int,
        border_color: tuple[int, int, int, int] | None = None,
        border_width: int = 1,
    ) -> None:
        overlay = pygame.Surface(rect.size, pygame.SRCALPHA)
        pygame.draw.rect(overlay, color, overlay.get_rect(), border_radius=border_radius)
        if border_color is not None:
            pygame.draw.rect(overlay, border_color, overlay.get_rect(), width=border_width, border_radius=border_radius)
        surface.blit(overlay, rect.topleft)
    def fill_page_background(self) -> None:
        width, height = self.window.get_size()
        for y in range(height):
            amount = y / max(1, height - 1)
            color = lerp_color(PAGE_BG_TOP, PAGE_BG_BOTTOM, amount)
            pygame.draw.line(self.window, color, (0, y), (width, y))

    def draw_panel(self) -> None:
        rect = self.layout.panel_rect
        self.draw_alpha_rect(self.window, rect, PANEL_BG, border_radius=24, border_color=PANEL_BORDER)
        cursor_x = rect.x + 22
        cursor_y = rect.y + 20
        max_width = rect.width - 44

        eyebrow = self.fonts["eyebrow"].render(EYEBROW, True, PANEL_TEXT_MUTED)
        self.window.blit(eyebrow, (cursor_x, cursor_y))
        cursor_y += eyebrow.get_height() + 8

        cursor_y = self.draw_wrapped_text(
            self.window,
            self.fonts["title"],
            TITLE,
            (255, 251, 232),
            pygame.Rect(cursor_x, cursor_y, max_width, 96),
            line_gap=2,
        )
        cursor_y += 6

        cursor_y = self.draw_wrapped_text(
            self.window,
            self.fonts["body"],
            LEDE,
            PANEL_TEXT,
            pygame.Rect(cursor_x, cursor_y, max_width, 76),
            line_gap=4,
        )
        cursor_y += 10

        facing = DIRECTION_LABEL_BY_SPRITE.get(self.player.direction, "Upper-right")
        stats = (
            ("Facing", facing),
            ("Tile Position", f"({self.player.x}, {self.player.y})"),
            ("Movement State", self.state_label),
        )
        for label, value in stats:
            card_rect = pygame.Rect(cursor_x, cursor_y, max_width, 54)
            self.draw_alpha_rect(
                self.window,
                card_rect,
                (255, 255, 255, 16),
                border_radius=14,
                border_color=(255, 255, 255, 20),
            )
            label_surface = self.fonts["label"].render(label.upper(), True, PANEL_TEXT_MUTED)
            value_surface = self.fonts["value"].render(value, True, (255, 255, 255))
            self.window.blit(label_surface, (card_rect.x + 12, card_rect.y + 10))
            self.window.blit(value_surface, (card_rect.x + 12, card_rect.y + 24))
            cursor_y += card_rect.height + 8

        for swatch_key, text in PANEL_LEGEND_ITEMS:
            card_rect = pygame.Rect(cursor_x, cursor_y, max_width, 64)
            self.draw_alpha_rect(
                self.window,
                card_rect,
                (255, 255, 255, 16),
                border_radius=14,
                border_color=(255, 255, 255, 16),
            )
            swatch_rect = pygame.Rect(card_rect.x + 12, card_rect.y + 20, 16, 16)
            pygame.draw.ellipse(self.window, LEGEND_SWATCH[swatch_key], swatch_rect)
            text_rect = pygame.Rect(card_rect.x + 36, card_rect.y + 10, card_rect.width - 48, card_rect.height - 16)
            self.draw_wrapped_text(self.window, self.fonts["small"], text, PANEL_TEXT, text_rect, line_gap=2)
            cursor_y += card_rect.height + 8

        controls_rect = pygame.Rect(cursor_x, cursor_y, max_width, 118)
        self.draw_alpha_rect(
            self.window,
            controls_rect,
            (255, 255, 255, 14),
            border_radius=14,
            border_color=(255, 255, 255, 16),
        )
        controls_title = self.fonts["label"].render("CONTROLS", True, PANEL_TEXT_MUTED)
        self.window.blit(controls_title, (controls_rect.x + 12, controls_rect.y + 10))
        line_y = controls_rect.y + 28
        for line in CONTROL_LINES:
            rendered = self.fonts["small"].render(line, True, PANEL_TEXT)
            self.window.blit(rendered, (controls_rect.x + 12, line_y))
            line_y += rendered.get_height() + 2
        cursor_y += controls_rect.height + 8

        hint_rect = pygame.Rect(cursor_x, cursor_y, max_width, rect.bottom - cursor_y - 20)
        self.draw_alpha_rect(
            self.window,
            hint_rect,
            (255, 255, 255, 14),
            border_radius=14,
            border_color=(255, 255, 255, 16),
        )
        hint_title = self.fonts["label"].render("HINT", True, PANEL_TEXT_MUTED)
        self.window.blit(hint_title, (hint_rect.x + 12, hint_rect.y + 10))
        self.draw_wrapped_text(
            self.window,
            self.fonts["body"],
            self.hint_label,
            PANEL_TEXT,
            pygame.Rect(hint_rect.x + 12, hint_rect.y + 30, hint_rect.width - 24, hint_rect.height - 42),
            line_gap=4,
        )

    def draw_scene_background(self, surface: pygame.Surface) -> None:
        width, height = surface.get_size()
        split = int(height * 0.56)
        for y in range(height):
            if y <= split:
                amount = y / max(1, split)
                color = lerp_color(SCENE_SKY_TOP, SCENE_SKY_MID, amount)
            else:
                amount = (y - split) / max(1, height - split)
                color = lerp_color(SCENE_SKY_MID, SCENE_SKY_BOTTOM, amount)
            pygame.draw.line(surface, color, (0, y), (width, y))

        pygame.draw.circle(surface, (255, 249, 214), (int(width * 0.12), int(height * 0.12)), 66)
        clouds = (
            pygame.Rect(int(width * 0.13), int(height * 0.12), 220, 56),
            pygame.Rect(int(width * 0.42), int(height * 0.17), 280, 64),
            pygame.Rect(int(width * 0.66), int(height * 0.1), 180, 48),
        )
        for rect in clouds:
            overlay = pygame.Surface(rect.size, pygame.SRCALPHA)
            pygame.draw.ellipse(overlay, (255, 255, 255, 40), overlay.get_rect())
            surface.blit(overlay, rect.topleft)

    def draw_tile(self, surface: pygame.Surface, center_x: float, center_y: float, fill: tuple[int, int, int]) -> None:
        half_w = GRID.tile_width * 0.5
        half_h = GRID.tile_height * 0.5
        depth = GRID.tile_depth
        top = [
            (center_x, center_y - half_h),
            (center_x + half_w, center_y),
            (center_x, center_y + half_h),
            (center_x - half_w, center_y),
        ]
        left = [
            (center_x - half_w, center_y),
            (center_x, center_y + half_h),
            (center_x, center_y + half_h + depth),
            (center_x - half_w, center_y + depth),
        ]
        right = [
            (center_x + half_w, center_y),
            (center_x, center_y + half_h),
            (center_x, center_y + half_h + depth),
            (center_x + half_w, center_y + depth),
        ]
        pygame.draw.polygon(surface, fill, top)
        pygame.draw.polygon(surface, shade(fill, -18), left)
        pygame.draw.polygon(surface, shade(fill, -28), right)
        pygame.draw.polygon(surface, (255, 255, 255), top, width=1)

    def draw_ground(self, surface: pygame.Surface) -> None:
        scene_size = surface.get_size()
        for y in range(GRID.height):
            for x in range(GRID.width):
                position = self.screen_project(x, y, scene_size)
                self.draw_tile(surface, position[0], position[1], self.tile_tones[y][x])

    def draw_location_marker(self, surface: pygame.Surface, anchor_x: float, anchor_y: float, radius_x: int, radius_y: int, alpha: int) -> None:
        marker = pygame.Surface((radius_x * 2, radius_y * 2), pygame.SRCALPHA)
        pygame.draw.ellipse(marker, (*MARKER_COLOR, alpha), marker.get_rect())
        surface.blit(marker, (int(round(anchor_x - radius_x)), int(round(anchor_y - radius_y))))

    def draw_sprite(self, surface: pygame.Surface, sprite: SpriteFrame, anchor_x: float, anchor_y: float, target_height: float) -> None:
        scaled_surface, pivot_x, pivot_y = sprite.get_scaled(target_height)
        surface.blit(scaled_surface, (int(round(anchor_x - pivot_x)), int(round(anchor_y - pivot_y))))

    def get_marker_radius(self, entity_kind: str) -> tuple[int, int, int]:
        if entity_kind in ("player", "majisto"):
            return (17, 8, 44)
        if entity_kind == "tree":
            return (18, 9, 36)
        return (12, 6, 36)

    def draw_entities(self, surface: pygame.Surface) -> None:
        scene_size = surface.get_size()
        entities = [
            *({"kind": obj.kind, "x": obj.x, "y": obj.y, "object": obj} for obj in self.world_objects),
            {"kind": "player", "x": self.player.render_x, "y": self.player.render_y},
            {"kind": "majisto", "x": self.majisto.render_x, "y": self.majisto.render_y},
        ]
        entities.sort(key=lambda entity: self.world_sort_value(entity["kind"], entity["x"], entity["y"]))

        for entity in entities:
            position = self.screen_project(entity["x"], entity["y"], scene_size)
            anchor_x = position[0]
            anchor_y = position[1] + GRID.tile_height * 0.18
            kind = entity["kind"]

            if kind in ("player", "majisto"):
                character = self.player if kind == "player" else self.majisto
                assets = self.assets.player if kind == "player" else self.assets.majisto
                frame = self.get_current_character_frame(character)
                sprite = assets.get(character.direction, {}).get(frame)
                if sprite is None:
                    continue
                if self.show_markers:
                    radius_x, radius_y, alpha = self.get_marker_radius(kind)
                    self.draw_location_marker(surface, anchor_x, anchor_y, radius_x, radius_y, alpha)
                self.draw_sprite(surface, sprite, anchor_x, anchor_y, 180.0)
                continue

            world_object = entity["object"]
            sprite = (
                self.assets.tree.get(world_object.direction)
                if world_object.kind == "tree"
                else self.assets.flowers.get(world_object.flower or "", {}).get(world_object.direction)
            )
            if sprite is None:
                continue
            if self.show_markers:
                radius_x, radius_y, alpha = self.get_marker_radius(world_object.kind)
                self.draw_location_marker(surface, anchor_x, anchor_y, radius_x, radius_y, alpha)
            base_height = 192.0 if world_object.kind == "tree" else 108.0
            render_offset_y = TRIM_CONFIG.render_offset_y_by_type.get(world_object.kind, 0)
            self.draw_sprite(surface, sprite, anchor_x, anchor_y + render_offset_y, base_height * world_object.scale)

    def draw_scene_status(self, scene_surface: pygame.Surface) -> None:
        status_rect = pygame.Rect(18, 18, scene_surface.get_width() - 36, 60)
        self.draw_alpha_rect(scene_surface, status_rect, STATUS_BG, border_radius=999, border_color=(255, 255, 255, 26))
        line_1 = self.fonts["scene"].render(STATUS_PILL_TEXT, True, PANEL_TEXT)
        line_2 = self.fonts["small"].render(self.status_label, True, (255, 251, 232))
        scene_surface.blit(line_1, (status_rect.x + 14, status_rect.y + 10))
        scene_surface.blit(line_2, (status_rect.x + 14, status_rect.y + 32))

    def render(self) -> None:
        self.fill_page_background()
        self.draw_panel()

        scene_rect = self.layout.scene_rect
        scene_surface = self.window.subsurface(scene_rect)
        self.draw_scene_background(scene_surface)
        self.draw_ground(scene_surface)
        self.draw_entities(scene_surface)
        self.draw_scene_status(scene_surface)
        pygame.draw.rect(self.window, SCENE_BORDER, scene_rect, width=1, border_radius=28)
        pygame.display.flip()

    def run(self) -> int:
        while self.running:
            delta_ms = float(self.clock.tick(FPS))
            now = float(pygame.time.get_ticks())
            self.handle_events(now)
            self.update(delta_ms, now)
            self.render()
        pygame.quit()
        return 0


def run_game(root_dir: Path) -> int:
    game = Game(root_dir)
    return game.run()

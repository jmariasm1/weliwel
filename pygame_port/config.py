from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


WINDOW_TITLE = "Weliwel & Majisto Walkabout (Pygame)"
DEFAULT_WINDOW_SIZE = (1480, 900)
MIN_WINDOW_SIZE = (960, 820)
FPS = 60

EYEBROW = "Orthogonal 3D View"
TITLE = "Weliwel & Majisto Walkabout"
LEDE = (
    "The arrow keys follow the diagonal world axes: up moves upper-right, "
    "right moves lower-right, down moves lower-left, and left moves upper-left."
)
PANEL_LEGEND_ITEMS = (
    (
        "player",
        "Weliwel is player-controlled, and Majisto roams autonomously with the same idle and walking loops.",
    ),
    (
        "blocked",
        "Trees and flowers block movement, and Weliwel and Majisto also collide with each other.",
    ),
    (
        "safe",
        "Open grass tiles are walkable. Hold a direction to keep moving across the garden.",
    ),
)
CONTROL_LINES = (
    "ArrowUp -> Upper-right",
    "ArrowRight -> Lower-right",
    "ArrowDown -> Lower-left",
    "ArrowLeft -> Upper-left",
    "C -> Toggle location markers",
    "I -> Trigger Weliwel idle cycle",
)
READY_HINT = (
    "Use arrows to move Weliwel. Majisto chooses when to idle or walk on its own. "
    "C toggles markers, I triggers Weliwel idle."
)
READY_STATUS = "Ready to move. Majisto is roaming."
STATUS_PILL_TEXT = "Weliwel follows your keys while Majisto wanders on its own."


@dataclass(frozen=True)
class GridConfig:
    width: int
    height: int
    tile_width: int
    tile_height: int
    tile_depth: int


@dataclass(frozen=True)
class DirectionSpec:
    dx: int
    dy: int
    sprite: str
    label: str


@dataclass(frozen=True)
class RectSpec:
    x: int
    y: int
    width: int
    height: int
    type_name: str = "default"


@dataclass(frozen=True)
class PivotSpec:
    x: float
    y: float


@dataclass(frozen=True)
class SpriteProfile:
    source_by_direction: Mapping[str, RectSpec]
    pivot_by_direction: Mapping[str, PivotSpec]
    reference_height_by_direction: Mapping[str, int]


@dataclass(frozen=True)
class WorldObject:
    kind: str
    label: str
    x: int
    y: int
    direction: str
    solid: bool
    scale: float
    shadow: float
    flower: str | None = None


@dataclass(frozen=True)
class TrimConfig:
    alpha_threshold: int
    padding_x: int
    padding_top: int
    padding_bottom: int
    extra_padding_by_type: Mapping[str, Mapping[str, int]]
    pivot_y_factor_by_type: Mapping[str, float]
    pivot_x_factor_by_type: Mapping[str, float]
    render_offset_y_by_type: Mapping[str, int]
    matte_alpha_cutoff_by_type: Mapping[str, int]
    matte_rgb_cutoff: int


GRID = GridConfig(width=13, height=13, tile_width=124, tile_height=64, tile_depth=20)

DIRECTIONS = {
    "ArrowUp": DirectionSpec(dx=0, dy=-1, sprite="ur", label="Upper-right"),
    "ArrowRight": DirectionSpec(dx=1, dy=0, sprite="lr", label="Lower-right"),
    "ArrowDown": DirectionSpec(dx=0, dy=1, sprite="ll", label="Lower-left"),
    "ArrowLeft": DirectionSpec(dx=-1, dy=0, sprite="ul", label="Upper-left"),
}
DIRECTION_ORDER = ("ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft")
DIRECTION_LABEL_BY_SPRITE = {spec.sprite: spec.label for spec in DIRECTIONS.values()}

IDLE_SEQUENCE = ("Idle_1", "Idle_2", "Idle_3")
IDLE_CYCLE_SEQUENCE = ("Idle_1", "Idle_2", "Idle_3", "Idle_2")
WALKING_SEQUENCE = (
    "Idle_1",
    "Walking_1",
    "Walking_2",
    "Walking_3",
    "Idle_1",
    "Walking_4",
    "Walking_5",
    "Walking_6",
)
FLOWER_TYPES = ("redflower", "whiteflower", "yellowflower")

TRIM_CONFIG = TrimConfig(
    alpha_threshold=1,
    padding_x=20,
    padding_top=24,
    padding_bottom=32,
    extra_padding_by_type={
        "player": {"x": 16, "top": 28, "bottom": 24},
        "tree": {"x": 8, "top": 6, "bottom": 14},
        "flower": {"x": 14, "top": 12, "bottom": 52},
    },
    pivot_y_factor_by_type={
        "player": 0.88,
        "tree": 0.84,
        "flower": 0.93,
    },
    pivot_x_factor_by_type={
        "player": 0.5,
        "tree": 0.5,
        "flower": 0.5,
    },
    render_offset_y_by_type={
        "player": 0,
        "tree": 30,
        "flower": 0,
    },
    matte_alpha_cutoff_by_type={
        "default": 170,
        "flower": 18,
    },
    matte_rgb_cutoff=30,
)

FALLBACK_BOUNDS = {
    "player": RectSpec(x=220, y=80, width=640, height=770, type_name="player"),
    "tree": RectSpec(x=190, y=50, width=700, height=910, type_name="tree"),
    "flower": RectSpec(x=250, y=250, width=580, height=520, type_name="flower"),
}

FLOWER_SOURCE_BY_DIRECTION = {
    "ur": RectSpec(x=370, y=350, width=381, height=411),
    "ul": RectSpec(x=253, y=438, width=361, height=371),
    "lr": RectSpec(x=466, y=490, width=361, height=319),
    "ll": RectSpec(x=337, y=552, width=365, height=319),
}

FLOWER_PIVOT_BY_DIRECTION = {
    "ur": PivotSpec(x=539.39, y=719.78),
    "ul": PivotSpec(x=451.54, y=781.97),
    "lr": PivotSpec(x=627.52, y=781.88),
    "ll": PivotSpec(x=539.8, y=844.04),
}

PLAYER_SOURCE_BY_DIRECTION = {
    "ur": RectSpec(x=300, y=0, width=561, height=816),
    "ul": RectSpec(x=35, y=110, width=745, height=706),
    "lr": RectSpec(x=300, y=150, width=745, height=725),
    "ll": RectSpec(x=219, y=150, width=561, height=763),
}

PLAYER_PIVOT_BY_DIRECTION = {
    "ur": PivotSpec(x=605.56, y=700.53),
    "ul": PivotSpec(x=472.49, y=700.51),
    "lr": PivotSpec(x=563.4, y=765.1),
    "ll": PivotSpec(x=526.65, y=773.58),
}

PLAYER_REFERENCE_HEIGHT_BY_DIRECTION = {
    "ur": 792,
    "ul": 663,
    "lr": 686,
    "ll": 724,
}

MAJISTO_SOURCE_BY_DIRECTION = {
    "ur": RectSpec(x=275, y=0, width=635, height=788),
    "ul": RectSpec(x=13, y=69, width=792, height=719),
    "lr": RectSpec(x=275, y=109, width=792, height=741),
    "ll": RectSpec(x=170, y=109, width=635, height=741),
}

MAJISTO_PIVOT_BY_DIRECTION = {
    "ur": PivotSpec(x=640.1, y=696.7),
    "ul": PivotSpec(x=472.0, y=697.0),
    "lr": PivotSpec(x=557.5, y=756.6),
    "ll": PivotSpec(x=508.5, y=766.1),
}

MAJISTO_REFERENCE_HEIGHT_BY_DIRECTION = {
    "ur": 788,
    "ul": 719,
    "lr": 741,
    "ll": 741,
}

CHARACTER_RENDER_PROFILES = {
    "player": SpriteProfile(
        source_by_direction=PLAYER_SOURCE_BY_DIRECTION,
        pivot_by_direction=PLAYER_PIVOT_BY_DIRECTION,
        reference_height_by_direction=PLAYER_REFERENCE_HEIGHT_BY_DIRECTION,
    ),
    "majisto": SpriteProfile(
        source_by_direction=MAJISTO_SOURCE_BY_DIRECTION,
        pivot_by_direction=MAJISTO_PIVOT_BY_DIRECTION,
        reference_height_by_direction=MAJISTO_REFERENCE_HEIGHT_BY_DIRECTION,
    ),
}

WORLD_OBJECTS = (
    WorldObject(kind="tree", label="Mint tree", x=3, y=2, direction="ur", solid=True, scale=1.28, shadow=0.92),
    WorldObject(kind="tree", label="Mint tree", x=6, y=2, direction="ul", solid=True, scale=1.28, shadow=0.92),
    WorldObject(kind="tree", label="Mint tree", x=9, y=3, direction="ll", solid=True, scale=1.28, shadow=0.92),
    WorldObject(kind="tree", label="Mint tree", x=10, y=6, direction="lr", solid=True, scale=1.28, shadow=0.92),
    WorldObject(kind="tree", label="Mint tree", x=5, y=8, direction="ur", solid=True, scale=1.28, shadow=0.92),
    WorldObject(kind="tree", label="Mint tree", x=8, y=10, direction="ul", solid=True, scale=1.28, shadow=0.92),
    WorldObject(
        kind="flower",
        flower="redflower",
        label="Red flowers",
        x=2,
        y=5,
        direction="lr",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="yellowflower",
        label="Yellow flowers",
        x=4,
        y=6,
        direction="ur",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="whiteflower",
        label="White flowers",
        x=7,
        y=5,
        direction="ll",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="redflower",
        label="Red flowers",
        x=11,
        y=4,
        direction="ul",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="yellowflower",
        label="Yellow flowers",
        x=9,
        y=8,
        direction="lr",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="whiteflower",
        label="White flowers",
        x=3,
        y=10,
        direction="ur",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="redflower",
        label="Red flowers",
        x=6,
        y=10,
        direction="ll",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
    WorldObject(
        kind="flower",
        flower="yellowflower",
        label="Yellow flowers",
        x=1,
        y=8,
        direction="ul",
        solid=True,
        scale=0.86,
        shadow=0.56,
    ),
)

TERRAIN_PALETTE = ("#7ab26e", "#89bc78", "#6ea864", "#9ecf8a")

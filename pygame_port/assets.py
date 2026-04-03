from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pygame

from .config import (
    CHARACTER_RENDER_PROFILES,
    DIRECTION_ORDER,
    FALLBACK_BOUNDS,
    FLOWER_PIVOT_BY_DIRECTION,
    FLOWER_SOURCE_BY_DIRECTION,
    FLOWER_TYPES,
    IDLE_SEQUENCE,
    TRIM_CONFIG,
    WALKING_SEQUENCE,
    PivotSpec,
    RectSpec,
)


@dataclass(frozen=True)
class ManifestEntry:
    kind: str
    direction: str
    type_name: str
    src: Path
    frame: str | None = None
    flower: str | None = None


@dataclass(frozen=True)
class SpriteMetrics:
    rect: pygame.Rect
    pivot: tuple[float, float]
    reference_height: float


@dataclass
class SpriteFrame:
    surface: pygame.Surface
    pivot: tuple[float, float]
    reference_height: float
    _scaled_cache: dict[int, tuple[pygame.Surface, float, float]] = field(default_factory=dict, init=False, repr=False)

    def get_scaled(self, target_height: float) -> tuple[pygame.Surface, float, float]:
        key = max(1, int(round(target_height)))
        cached = self._scaled_cache.get(key)
        if cached is not None:
            return cached

        scale = key / self.reference_height
        width = max(1, int(round(self.surface.get_width() * scale)))
        scaled = pygame.transform.smoothscale(self.surface, (width, key))
        scaled_pivot = (self.pivot[0] * scale, self.pivot[1] * scale)
        cached = (scaled, scaled_pivot[0], scaled_pivot[1])
        self._scaled_cache[key] = cached
        return cached


@dataclass
class AssetStore:
    player: dict[str, dict[str, SpriteFrame]] = field(default_factory=dict)
    majisto: dict[str, dict[str, SpriteFrame]] = field(default_factory=dict)
    tree: dict[str, SpriteFrame] = field(default_factory=dict)
    flowers: dict[str, dict[str, SpriteFrame]] = field(default_factory=dict)


def _rect_from_spec(spec: RectSpec) -> pygame.Rect:
    return pygame.Rect(spec.x, spec.y, spec.width, spec.height)


def _pivot_from_spec(spec: PivotSpec) -> tuple[float, float]:
    return (spec.x, spec.y)


def _manual_metrics(entry: ManifestEntry) -> SpriteMetrics | None:
    if entry.kind in CHARACTER_RENDER_PROFILES and entry.frame is not None:
        profile = CHARACTER_RENDER_PROFILES[entry.kind]
        source = profile.source_by_direction.get(entry.direction)
        pivot = profile.pivot_by_direction.get(entry.direction)
        reference_height = profile.reference_height_by_direction.get(entry.direction)
        if source and pivot and reference_height:
            return SpriteMetrics(
                rect=_rect_from_spec(source),
                pivot=_pivot_from_spec(pivot),
                reference_height=float(reference_height),
            )

    if entry.kind == "flower":
        source = FLOWER_SOURCE_BY_DIRECTION.get(entry.direction)
        pivot = FLOWER_PIVOT_BY_DIRECTION.get(entry.direction)
        if source and pivot:
            return SpriteMetrics(
                rect=_rect_from_spec(source),
                pivot=_pivot_from_spec(pivot),
                reference_height=float(source.height),
            )

    return None


def _is_matte_candidate(alpha: int, red: int, green: int, blue: int, type_name: str) -> bool:
    alpha_cutoff = TRIM_CONFIG.matte_alpha_cutoff_by_type.get(
        type_name,
        TRIM_CONFIG.matte_alpha_cutoff_by_type["default"],
    )
    return (
        alpha < alpha_cutoff
        and red <= TRIM_CONFIG.matte_rgb_cutoff
        and green <= TRIM_CONFIG.matte_rgb_cutoff
        and blue <= TRIM_CONFIG.matte_rgb_cutoff
    )


def _fallback_metrics(fallback: RectSpec) -> SpriteMetrics:
    return SpriteMetrics(
        rect=_rect_from_spec(fallback),
        pivot=(fallback.x + fallback.width * 0.5, fallback.y + fallback.height),
        reference_height=float(fallback.height),
    )


def _compute_sprite_metrics(surface: pygame.Surface, fallback: RectSpec) -> SpriteMetrics:
    try:
        width, height = surface.get_size()
        min_x = width
        min_y = height
        max_x = 0
        max_y = 0
        found = False
        type_name = fallback.type_name

        surface.lock()
        try:
            for y in range(height):
                for x in range(width):
                    red, green, blue, alpha = surface.get_at((x, y))
                    is_renderable = alpha >= TRIM_CONFIG.alpha_threshold and not _is_matte_candidate(
                        alpha,
                        red,
                        green,
                        blue,
                        type_name,
                    )
                    if not is_renderable:
                        continue
                    found = True
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
        finally:
            surface.unlock()

        if not found:
            return _fallback_metrics(fallback)

        raw_min_x = min_x
        raw_min_y = min_y
        raw_max_x = max_x
        raw_max_y = max_y
        raw_width = raw_max_x - raw_min_x + 1
        raw_height = raw_max_y - raw_min_y + 1

        extra = TRIM_CONFIG.extra_padding_by_type.get(type_name, {"x": 0, "top": 0, "bottom": 0})
        min_x = max(0, min_x - TRIM_CONFIG.padding_x - extra["x"])
        min_y = max(0, min_y - TRIM_CONFIG.padding_top - extra["top"])
        max_x = min(width - 1, max_x + TRIM_CONFIG.padding_x + extra["x"])
        max_y = min(height - 1, max_y + TRIM_CONFIG.padding_bottom + extra["bottom"])

        rect = pygame.Rect(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1)
        pivot_x = rect.x + rect.width * TRIM_CONFIG.pivot_x_factor_by_type.get(type_name, 0.5)
        pivot_y = rect.y + rect.height * TRIM_CONFIG.pivot_y_factor_by_type.get(type_name, 0.9)
        reference_height = float(rect.height)

        if type_name == "flower":
            rect = pygame.Rect(0, 0, width, height)
            reference_height = float(raw_height)
            search_start_y = max(raw_min_y, raw_max_y - 20)
            sum_x = 0.0
            sum_y = 0.0
            count = 0

            surface.lock()
            try:
                for y in range(search_start_y, raw_max_y + 1):
                    for x in range(raw_min_x, raw_max_x + 1):
                        red, green, blue, alpha = surface.get_at((x, y))
                        is_renderable = alpha >= TRIM_CONFIG.alpha_threshold and not _is_matte_candidate(
                            alpha,
                            red,
                            green,
                            blue,
                            type_name,
                        )
                        is_base_pixel = is_renderable and (green >= red + 6 or alpha >= 42)
                        if not is_base_pixel:
                            continue
                        sum_x += x
                        sum_y += y
                        count += 1
            finally:
                surface.unlock()

            if count > 8:
                pivot_x = sum_x / count
                pivot_y = sum_y / count
            else:
                pivot_x = raw_min_x + raw_width * 0.5
                pivot_y = raw_min_y + raw_height

        return SpriteMetrics(rect=rect, pivot=(pivot_x, pivot_y), reference_height=reference_height)
    except pygame.error:
        return _fallback_metrics(fallback)


def make_manifest(asset_root: Path) -> list[ManifestEntry]:
    frames = tuple(dict.fromkeys((*IDLE_SEQUENCE, *WALKING_SEQUENCE)))
    manifest: list[ManifestEntry] = []

    for direction_key in DIRECTION_ORDER:
        direction = {
            "ArrowUp": "ur",
            "ArrowRight": "lr",
            "ArrowDown": "ll",
            "ArrowLeft": "ul",
        }[direction_key]

        for kind, prefix in (("player", "Weliwel"), ("majisto", "Majisto")):
            for frame in frames:
                manifest.append(
                    ManifestEntry(
                        kind=kind,
                        direction=direction,
                        frame=frame,
                        type_name="player",
                        src=asset_root / f"{prefix}_{frame}_{direction}.png",
                    )
                )

        manifest.append(
            ManifestEntry(
                kind="tree",
                direction=direction,
                type_name="tree",
                src=asset_root / f"tree_{direction}.png",
            )
        )

        for flower in FLOWER_TYPES:
            manifest.append(
                ManifestEntry(
                    kind="flower",
                    flower=flower,
                    direction=direction,
                    type_name="flower",
                    src=asset_root / f"{flower}_{direction}.png",
                )
            )

    return manifest


def _load_sprite(entry: ManifestEntry) -> SpriteFrame:
    source_surface = pygame.image.load(str(entry.src)).convert_alpha()
    metrics = _manual_metrics(entry) or _compute_sprite_metrics(source_surface, FALLBACK_BOUNDS[entry.type_name])
    rect = metrics.rect.clip(source_surface.get_rect())
    if rect.width <= 0 or rect.height <= 0:
        raise ValueError(f"Sprite bounds for {entry.src.name} are empty.")

    cropped = source_surface.subsurface(rect).copy()
    local_pivot = (metrics.pivot[0] - rect.x, metrics.pivot[1] - rect.y)
    return SpriteFrame(surface=cropped, pivot=local_pivot, reference_height=metrics.reference_height)


def load_assets(asset_root: Path) -> AssetStore:
    if not asset_root.exists():
        raise FileNotFoundError(f"Could not find sprite folder: {asset_root}")

    store = AssetStore()
    for entry in make_manifest(asset_root):
        sprite = _load_sprite(entry)
        if entry.kind in ("player", "majisto") and entry.frame is not None:
            character_assets = getattr(store, entry.kind)
            character_assets.setdefault(entry.direction, {})[entry.frame] = sprite
            continue

        if entry.kind == "tree":
            store.tree[entry.direction] = sprite
            continue

        if entry.flower is None:
            continue
        store.flowers.setdefault(entry.flower, {})[entry.direction] = sprite

    return store

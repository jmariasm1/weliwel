from __future__ import annotations

from pathlib import Path

from pygame_port import run_game


def main() -> int:
    return run_game(Path(__file__).resolve().parent)


if __name__ == "__main__":
    raise SystemExit(main())

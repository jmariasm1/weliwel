(() => {
  const sceneShell = document.getElementById("sceneShell");
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");

  const ui = {
    phaseLabel: document.getElementById("phaseLabel"),
    roundLabel: document.getElementById("roundLabel"),
    statusLine: document.getElementById("statusLine"),
    turnRibbon: document.getElementById("turnRibbon"),
    heroPanel: document.getElementById("heroPanel"),
    enemyPanel: document.getElementById("enemyPanel"),
    actionTitle: document.getElementById("actionTitle"),
    actionSubtitle: document.getElementById("actionSubtitle"),
    actionButtons: document.getElementById("actionButtons"),
    forecastPanel: document.getElementById("forecastPanel"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultBody: document.getElementById("resultBody"),
    restartButton: document.getElementById("restartButton"),
  };

  const scene = {
    width: 0,
    height: 0,
    dpr: window.devicePixelRatio || 1,
  };

  const directions = {
    ArrowUp: { dx: 0, dy: -1, sprite: "ur", label: "Upper-right" },
    ArrowRight: { dx: 1, dy: 0, sprite: "lr", label: "Lower-right" },
    ArrowDown: { dx: 0, dy: 1, sprite: "ll", label: "Lower-left" },
    ArrowLeft: { dx: -1, dy: 0, sprite: "ul", label: "Upper-left" },
  };

  const directionOrder = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
  const idleSequence = ["Idle_1", "Idle_2", "Idle_3"];
  const idleCycleSequence = ["Idle_1", "Idle_2", "Idle_3", "Idle_2"];
  const walkingSequence = [
    "Idle_1",
    "Walking_1",
    "Walking_2",
    "Walking_3",
    "Idle_1",
    "Walking_4",
    "Walking_5",
    "Walking_6",
  ];

  const gameConfig = {
    title: "Brick Garden Duel",
    grid: {
      width: 13,
      height: 13,
      tileWidth: 124,
      tileHeight: 64,
      tileDepth: 20,
    },
    actorDrawHeight: 180,
    startMapId: "brickGardenDuel",
    cameraFollowActorId: "weliwel",
    introDelayMs: 260,
  };

  const grid = gameConfig.grid;

  const trimConfig = {
    alphaThreshold: 1,
    paddingX: 20,
    paddingTop: 24,
    paddingBottom: 32,
    extraPaddingByType: {
      player: { x: 16, top: 28, bottom: 24 },
      tree: { x: 8, top: 6, bottom: 14 },
      flower: { x: 14, top: 12, bottom: 52 },
    },
    pivotYFactorByType: {
      player: 0.88,
      tree: 0.84,
      flower: 0.93,
    },
    pivotXFactorByType: {
      player: 0.5,
      tree: 0.5,
      flower: 0.5,
    },
    renderOffsetYByType: {
      player: 0,
      tree: 30,
      flower: 0,
    },
    matteAlphaCutoffByType: {
      default: 170,
      flower: 18,
    },
    matteRgbCutoff: 30,
  };

  const fallbackBounds = {
    player: { x: 220, y: 80, width: 640, height: 770, typeName: "player" },
    tree: { x: 190, y: 50, width: 700, height: 910, typeName: "tree" },
    flower: { x: 250, y: 250, width: 580, height: 520, typeName: "flower" },
  };

  const flowerSourceByDirection = {
    ur: { x: 370, y: 350, width: 381, height: 411 },
    ul: { x: 253, y: 438, width: 361, height: 371 },
    lr: { x: 466, y: 490, width: 361, height: 319 },
    ll: { x: 337, y: 552, width: 365, height: 319 },
  };

  const flowerPivotByDirection = {
    ur: { x: 539.39, y: 719.78 },
    ul: { x: 451.54, y: 781.97 },
    lr: { x: 627.52, y: 781.88 },
    ll: { x: 539.8, y: 844.04 },
  };

  const renderProfiles = {
    weliwel: {
      sourceByDirection: {
        ur: { x: 300, y: 0, width: 561, height: 816 },
        ul: { x: 35, y: 110, width: 745, height: 706 },
        lr: { x: 300, y: 150, width: 745, height: 725 },
        ll: { x: 219, y: 150, width: 561, height: 763 },
      },
      pivotByDirection: {
        ur: { x: 605.56, y: 700.53 },
        ul: { x: 472.49, y: 700.51 },
        lr: { x: 563.4, y: 765.1 },
        ll: { x: 526.65, y: 773.58 },
      },
      referenceHeightByDirection: {
        ur: 792,
        ul: 663,
        lr: 686,
        ll: 724,
      },
    },
    majisto: {
      sourceByDirection: {
        ur: { x: 275, y: 0, width: 635, height: 788 },
        ul: { x: 13, y: 69, width: 792, height: 719 },
        lr: { x: 275, y: 109, width: 792, height: 741 },
        ll: { x: 170, y: 109, width: 635, height: 741 },
      },
      pivotByDirection: {
        ur: { x: 640.1, y: 696.7 },
        ul: { x: 472.0, y: 697.0 },
        lr: { x: 557.5, y: 756.6 },
        ll: { x: 508.5, y: 766.1 },
      },
      referenceHeightByDirection: {
        ur: 788,
        ul: 719,
        lr: 741,
        ll: 741,
      },
    },
  };

  const skillCatalog = {
    studStrike: {
      id: "studStrike",
      name: "Stud Strike",
      hotkey: "1",
      description: "Melee strike for 7 damage. Gains +2 damage if Weliwel moved at least 2 tiles this turn.",
      kind: "attack",
      target: "enemy",
      minRange: 1,
      maxRange: 1,
      damage: 7,
      cooldown: 0,
      palette: "#ffd768",
    },
    brickToss: {
      id: "brickToss",
      name: "Brick Toss",
      hotkey: "2",
      description: "Ranged throw for 5 damage at 2 to 3 tiles.",
      kind: "attack",
      target: "enemy",
      minRange: 2,
      maxRange: 3,
      damage: 5,
      cooldown: 0,
      palette: "#ffc287",
    },
    guardUp: {
      id: "guardUp",
      name: "Guard Up",
      hotkey: "3",
      description: "Self-buff. Grants 4 shield until Majisto completes their next action.",
      kind: "buff",
      target: "self",
      cooldown: 2,
      shield: 4,
      palette: "#92ddff",
    },
    runeBolt: {
      id: "runeBolt",
      name: "Rune Bolt",
      hotkey: "1",
      description: "Arcane bolt for 6 damage at 2 to 4 tiles.",
      kind: "attack",
      target: "enemy",
      minRange: 2,
      maxRange: 4,
      damage: 6,
      cooldown: 0,
      palette: "#95c0ff",
    },
    hexSnap: {
      id: "hexSnap",
      name: "Hex Snap",
      hotkey: "2",
      description: "Hexes a target for 4 damage and applies Slow for the next turn.",
      kind: "attack",
      target: "enemy",
      minRange: 1,
      maxRange: 3,
      damage: 4,
      cooldown: 2,
      palette: "#c9b3ff",
      applyStatus: {
        type: "slow",
        durationTurns: 1,
      },
    },
    pulseBurst: {
      id: "pulseBurst",
      name: "Pulse Burst",
      hotkey: "3",
      description: "Detonates adjacent tiles for 5 damage.",
      kind: "attack",
      target: "burst",
      minRange: 1,
      maxRange: 1,
      damage: 5,
      cooldown: 2,
      palette: "#7ad6ff",
    },
  };

  const unitCatalog = {
    weliwel: {
      id: "weliwel",
      name: "Weliwel",
      team: "hero",
      controller: "player",
      assetPrefix: "Weliwel",
      renderProfileId: "weliwel",
      role: "Brick Knight",
      blurb: "A fast LEGO duelist who wins by seizing angles, striking hard, and timing Guard Up well.",
      maxHp: 24,
      move: 4,
      speed: 6,
      skillIds: ["studStrike", "brickToss", "guardUp"],
      themeClass: "hero",
      accentColor: "#f7c24f",
    },
    majisto: {
      id: "majisto",
      name: "Majisto",
      team: "enemy",
      controller: "ai",
      assetPrefix: "Majisto",
      renderProfileId: "majisto",
      role: "Arcane Tactician",
      blurb: "A zoning mage who prefers open sight-lines, safe spacing, and punishing overextension.",
      maxHp: 20,
      move: 3,
      speed: 5,
      skillIds: ["runeBolt", "hexSnap", "pulseBurst"],
      themeClass: "enemy",
      accentColor: "#75b2ff",
    },
  };

  const battleMaps = {
    brickGardenDuel: {
      id: "brickGardenDuel",
      name: "Brick Garden Duel",
      terrainPalette: ["#7ab26e", "#89bc78", "#6ea864", "#9ecf8a"],
      props: [
        { kind: "tree", label: "Mint tree", x: 6, y: 5, direction: "ur", solid: true, scale: 1.28, shadow: 0.92 },
        { kind: "tree", label: "Mint tree", x: 7, y: 7, direction: "ul", solid: true, scale: 1.28, shadow: 0.92 },
        { kind: "tree", label: "Mint tree", x: 5, y: 8, direction: "ll", solid: true, scale: 1.28, shadow: 0.92 },
        { kind: "flower", flower: "redflower", label: "Red flowers", x: 4, y: 7, direction: "lr", solid: true, scale: 0.86, shadow: 0.56 },
        { kind: "flower", flower: "yellowflower", label: "Yellow flowers", x: 6, y: 6, direction: "ur", solid: true, scale: 0.86, shadow: 0.56 },
        { kind: "flower", flower: "whiteflower", label: "White flowers", x: 8, y: 6, direction: "ll", solid: true, scale: 0.86, shadow: 0.56 },
      ],
      roster: [
        { id: "weliwel", unitId: "weliwel", team: "hero", controller: "player", x: 3, y: 9, direction: "ur" },
        { id: "majisto", unitId: "majisto", team: "enemy", controller: "ai", x: 9, y: 4, direction: "ll" },
      ],
    },
  };

  const assets = {
    characters: {},
    tree: {},
    flowers: {},
  };

  const camera = {
    x: 0,
    y: 0,
  };

  const runtime = {
    isLoaded: false,
    previousFrameTime: 0,
    map: null,
    tileTone: [],
    staticOccupancy: new Map(),
    actors: [],
    actorsById: new Map(),
  };

  const debug = {
    showMarkers: false,
  };

  let battleState = createBattleState();

  function createBattleState() {
    return {
      phase: "intro",
      activeActorId: null,
      round: 0,
      turnQueue: [],
      turnIndex: 0,
      cursor: { x: 0, y: 0 },
      reachableTiles: new Map(),
      targetableTiles: new Set(),
      pathPreview: [],
      selectedSkillId: null,
      effects: [],
      winnerId: null,
      enemyPlan: null,
      enemyThinkAt: 0,
      continuationAt: 0,
      pendingContinuation: null,
      hintText: "Preloading battle.",
      selectedTileActorId: null,
    };
  }

  function hashTile(x, y) {
    return (x * 92837111) ^ (y * 689287499) ^ (x * y * 97);
  }

  function tileKey(x, y) {
    return `${x},${y}`;
  }

  function parseTileKey(key) {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeInOutSine(value) {
    return -(Math.cos(Math.PI * value) - 1) / 2;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function manhattanDistance(aX, aY, bX, bY) {
    return Math.abs(aX - bX) + Math.abs(aY - bY);
  }

  function teamPriority(team) {
    return team === "hero" ? 0 : 1;
  }

  function isWithinBounds(x, y) {
    return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
  }

  function buildTileTone(mapConfig) {
    return Array.from({ length: grid.height }, (_, y) =>
      Array.from({ length: grid.width }, (_, x) => {
        const palette = mapConfig.terrainPalette;
        return palette[Math.abs(hashTile(x, y)) % palette.length];
      })
    );
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    scene.width = bounds.width;
    scene.height = bounds.height;
    scene.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * scene.dpr);
    canvas.height = Math.round(bounds.height * scene.dpr);
    ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function projectMap(gridX, gridY) {
    const mapX = (gridX - gridY) * grid.tileWidth * 0.5;
    const mapY = (gridX + gridY) * grid.tileHeight * 0.5;
    return { x: mapX, y: mapY };
  }

  function screenProject(gridX, gridY) {
    const position = projectMap(gridX, gridY);
    return {
      x: position.x + scene.width * 0.5 + camera.x,
      y: position.y + scene.height * 0.28 + camera.y,
    };
  }

  function screenToTile(screenX, screenY) {
    const mapX = screenX - scene.width * 0.5 - camera.x;
    const mapY = screenY - scene.height * 0.28 - camera.y;
    const approxX = Math.round(mapX / grid.tileWidth + mapY / grid.tileHeight);
    const approxY = Math.round(mapY / grid.tileHeight - mapX / grid.tileWidth);
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let y = approxY - 1; y <= approxY + 1; y += 1) {
      for (let x = approxX - 1; x <= approxX + 1; x += 1) {
        if (!isWithinBounds(x, y)) {
          continue;
        }
        const center = screenProject(x, y);
        const dx = Math.abs(screenX - center.x) / (grid.tileWidth * 0.5);
        const dy = Math.abs(screenY - center.y) / (grid.tileHeight * 0.5);
        const score = dx + dy;
        if (score <= 1.08 && score < bestScore) {
          best = { x, y };
          bestScore = score;
        }
      }
    }

    return best;
  }

  function worldSortValue(entity) {
    const depthBias = entity.kind === "actor" ? 0.06 : 0.02;
    return entity.y + entity.x + depthBias;
  }

  function shade(hex, amount) {
    const value = hex.replace("#", "");
    const number = Number.parseInt(value, 16);
    const r = clamp(((number >> 16) & 255) + amount, 0, 255);
    const g = clamp(((number >> 8) & 255) + amount, 0, 255);
    const b = clamp((number & 255) + amount, 0, 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getCurrentMap() {
    return runtime.map;
  }

  function getActor(actorId) {
    return runtime.actorsById.get(actorId) || null;
  }

  function getLivingActors() {
    return runtime.actors.filter((actor) => actor.hp > 0);
  }

  function getOpponentActors(actor) {
    return getLivingActors().filter((candidate) => candidate.team !== actor.team);
  }

  function getActorAt(x, y, excludeActorId = null) {
    return runtime.actors.find((actor) => actor.id !== excludeActorId && actor.hp > 0 && actor.x === x && actor.y === y) || null;
  }

  function isStaticTileBlocked(x, y) {
    return runtime.staticOccupancy.has(tileKey(x, y));
  }

  function makeManifest() {
    const manifest = [];
    const directionsList = ["ur", "ul", "lr", "ll"];
    const characterFrames = Array.from(new Set([...idleSequence, ...walkingSequence]));

    for (const direction of directionsList) {
      for (const unit of Object.values(unitCatalog)) {
        for (const frame of characterFrames) {
          manifest.push({
            kind: "character",
            unitId: unit.id,
            direction,
            frame,
            type: "player",
            src: `Weliwel_Sprites/${unit.assetPrefix}_${frame}_${direction}.png`,
          });
        }
      }

      manifest.push({
        kind: "tree",
        direction,
        type: "tree",
        src: `Weliwel_Sprites/tree_${direction}.png`,
      });

      for (const flower of ["redflower", "whiteflower", "yellowflower"]) {
        manifest.push({
          kind: "flower",
          flower,
          direction,
          type: "flower",
          src: `Weliwel_Sprites/${flower}_${direction}.png`,
        });
      }
    }

    return manifest;
  }

  function isMatteCandidate(alpha, r, g, b, typeName = "default") {
    const alphaCutoff = trimConfig.matteAlphaCutoffByType[typeName] ?? trimConfig.matteAlphaCutoffByType.default;
    return alpha < alphaCutoff && r <= trimConfig.matteRgbCutoff && g <= trimConfig.matteRgbCutoff && b <= trimConfig.matteRgbCutoff;
  }

  function computeSpriteMetrics(image, fallback) {
    try {
      const typeName = fallback.typeName || "default";
      const probe = document.createElement("canvas");
      probe.width = image.naturalWidth;
      probe.height = image.naturalHeight;
      const probeCtx = probe.getContext("2d", { willReadFrequently: true });
      probeCtx.drawImage(image, 0, 0);
      const pixels = probeCtx.getImageData(0, 0, probe.width, probe.height).data;
      let minX = probe.width;
      let minY = probe.height;
      let maxX = 0;
      let maxY = 0;
      let found = false;

      for (let y = 0; y < probe.height; y += 1) {
        for (let x = 0; x < probe.width; x += 1) {
          const index = (y * probe.width + x) * 4;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const alpha = pixels[index + 3];
          const isRenderable = alpha >= trimConfig.alphaThreshold && !isMatteCandidate(alpha, r, g, b, typeName);
          if (!isRenderable) {
            continue;
          }
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }

      if (!found) {
        return {
          bounds: fallback,
          pivot: { x: fallback.x + fallback.width * 0.5, y: fallback.y + fallback.height },
          referenceHeight: fallback.height,
        };
      }

      const rawBounds = {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };
      const extra = trimConfig.extraPaddingByType[typeName] || { x: 0, top: 0, bottom: 0 };
      const bounds = {
        x: Math.max(0, minX - trimConfig.paddingX - extra.x),
        y: Math.max(0, minY - trimConfig.paddingTop - extra.top),
        width: Math.min(probe.width - 1, maxX + trimConfig.paddingX + extra.x) - Math.max(0, minX - trimConfig.paddingX - extra.x) + 1,
        height: Math.min(probe.height - 1, maxY + trimConfig.paddingBottom + extra.bottom) - Math.max(0, minY - trimConfig.paddingTop - extra.top) + 1,
      };
      let pivotX = bounds.x + bounds.width * (trimConfig.pivotXFactorByType[typeName] ?? 0.5);
      let pivotY = bounds.y + bounds.height * (trimConfig.pivotYFactorByType[typeName] ?? 0.9);
      let referenceHeight = bounds.height;

      if (typeName === "flower") {
        bounds.x = 0;
        bounds.y = 0;
        bounds.width = probe.width;
        bounds.height = probe.height;
        referenceHeight = rawBounds.height;
        pivotX = rawBounds.x + rawBounds.width * 0.5;
        pivotY = rawBounds.y + rawBounds.height;
      }

      return {
        bounds,
        pivot: { x: pivotX, y: pivotY },
        referenceHeight,
      };
    } catch (error) {
      return {
        bounds: fallback,
        pivot: { x: fallback.x + fallback.width * 0.5, y: fallback.y + fallback.height },
        referenceHeight: fallback.height,
      };
    }
  }

  function loadSprite(entry) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const fallback = fallbackBounds[entry.type];
        let metrics = computeSpriteMetrics(image, fallback);

        if (entry.kind === "character") {
          const profile = renderProfiles[entry.unitId];
          const source = profile?.sourceByDirection?.[entry.direction];
          const pivot = profile?.pivotByDirection?.[entry.direction];
          const referenceHeight = profile?.referenceHeightByDirection?.[entry.direction];
          if (source && pivot && referenceHeight) {
            metrics = { bounds: source, pivot, referenceHeight };
          }
        }

        if (entry.kind === "flower") {
          const source = flowerSourceByDirection[entry.direction];
          const pivot = flowerPivotByDirection[entry.direction];
          if (source && pivot) {
            metrics = { bounds: source, pivot, referenceHeight: source.height };
          }
        }

        resolve({ ...entry, image, bounds: metrics.bounds, pivot: metrics.pivot, referenceHeight: metrics.referenceHeight });
      };
      image.onerror = () => reject(new Error(`Could not load ${entry.src}`));
      image.src = entry.src;
    });
  }

  async function preloadAssets() {
    const manifest = makeManifest();
    const loadedSprites = await Promise.all(manifest.map(loadSprite));

    for (const sprite of loadedSprites) {
      if (sprite.kind === "character") {
        assets.characters[sprite.unitId] ||= {};
        assets.characters[sprite.unitId][sprite.direction] ||= {};
        assets.characters[sprite.unitId][sprite.direction][sprite.frame] = sprite;
        continue;
      }

      if (sprite.kind === "tree") {
        assets.tree[sprite.direction] = sprite;
        continue;
      }

      assets.flowers[sprite.flower] ||= {};
      assets.flowers[sprite.flower][sprite.direction] = sprite;
    }
  }

  function createActorState(spawnConfig) {
    const unit = unitCatalog[spawnConfig.unitId];
    const cooldowns = Object.fromEntries(unit.skillIds.map((skillId) => [skillId, 0]));
    return {
      id: spawnConfig.id,
      unitId: unit.id,
      team: spawnConfig.team || unit.team,
      controller: spawnConfig.controller || unit.controller,
      name: unit.name,
      role: unit.role,
      x: spawnConfig.x,
      y: spawnConfig.y,
      renderX: spawnConfig.x,
      renderY: spawnConfig.y,
      fromX: spawnConfig.x,
      fromY: spawnConfig.y,
      toX: spawnConfig.x,
      toY: spawnConfig.y,
      moving: false,
      moveStartedAt: 0,
      moveDuration: 175,
      direction: spawnConfig.direction,
      animation: "idle",
      frameIndex: 0,
      frameTimer: 0,
      idleFrame: "Idle_1",
      idleCycleActive: false,
      idleCycleIndex: 0,
      idleCycleRunId: 0,
      nextIdleCycleAt: Number.POSITIVE_INFINITY,
      queuedPath: [],
      onPathComplete: null,
      hp: unit.maxHp,
      maxHp: unit.maxHp,
      baseMove: unit.move,
      currentMoveAllowance: unit.move,
      speed: unit.speed,
      skillIds: [...unit.skillIds],
      cooldowns,
      statuses: { slowTurns: 0 },
      slowExpiresAfterTurn: false,
      shield: 0,
      shieldExpiresAfterActorId: null,
      movedThisTurn: false,
      actedThisTurn: false,
      movedTilesThisTurn: 0,
      flashUntil: 0,
      themeClass: unit.themeClass,
    };
  }

  function scheduleNextIdleCycle(actor, now) {
    actor.nextIdleCycleAt = now + 9000 + randomBetween(0, 21000);
  }

  function setCharacterAnimation(actor, animation, now) {
    if (actor.animation === animation) {
      return;
    }
    actor.animation = animation;
    actor.frameIndex = 0;
    actor.frameTimer = 0;

    if (animation === "walking") {
      actor.idleFrame = "Idle_1";
      actor.idleCycleActive = false;
      return;
    }

    actor.idleFrame = "Idle_1";
    actor.idleCycleActive = false;
    actor.idleCycleIndex = 0;
    scheduleNextIdleCycle(actor, now ?? performance.now());
  }

  function startCharacterIdleCycle(actor, now) {
    if (actor.animation !== "idle") {
      setCharacterAnimation(actor, "idle", now);
    }
    actor.idleCycleActive = true;
    actor.idleCycleIndex = 0;
    actor.frameTimer = 0;
    actor.idleFrame = idleCycleSequence[0];
    actor.idleCycleRunId += 1;
  }

  function stepCharacterAnimation(actor, deltaMs, now) {
    if (actor.hp <= 0) {
      actor.idleFrame = "Idle_1";
      return;
    }

    if (actor.animation === "walking") {
      const duration = 86;
      actor.frameTimer += deltaMs;
      while (actor.frameTimer >= duration) {
        actor.frameTimer -= duration;
        actor.frameIndex = (actor.frameIndex + 1) % walkingSequence.length;
      }
      return;
    }

    if (!actor.idleCycleActive) {
      actor.idleFrame = "Idle_1";
      if (now >= actor.nextIdleCycleAt) {
        startCharacterIdleCycle(actor, now);
      }
      return;
    }

    const duration = 230;
    actor.frameTimer += deltaMs;
    while (actor.frameTimer >= duration) {
      actor.frameTimer -= duration;
      actor.idleCycleIndex += 1;
      if (actor.idleCycleIndex >= idleCycleSequence.length) {
        actor.idleCycleActive = false;
        actor.idleCycleIndex = 0;
        actor.idleFrame = "Idle_1";
        scheduleNextIdleCycle(actor, now);
        return;
      }
      actor.idleFrame = idleCycleSequence[actor.idleCycleIndex];
    }
  }

  function getCurrentCharacterFrame(actor) {
    if (actor.animation === "walking") {
      return walkingSequence[actor.frameIndex % walkingSequence.length];
    }
    return actor.idleFrame;
  }

  function resetBattle() {
    const mapConfig = battleMaps[gameConfig.startMapId];
    runtime.map = mapConfig;
    runtime.tileTone = buildTileTone(mapConfig);
    runtime.staticOccupancy = new Map(mapConfig.props.filter((prop) => prop.solid).map((prop) => [tileKey(prop.x, prop.y), prop]));
    runtime.actors = mapConfig.roster.map(createActorState);
    runtime.actorsById = new Map(runtime.actors.map((actor) => [actor.id, actor]));

    const now = performance.now();
    for (const actor of runtime.actors) {
      actor.idleFrame = "Idle_1";
      scheduleNextIdleCycle(actor, now);
    }

    battleState = createBattleState();
    battleState.phase = "intro";
    battleState.cursor = { x: 3, y: 9 };
    battleState.hintText = "Weliwel and Majisto square off inside the Brick Garden.";
    battleState.continuationAt = now + gameConfig.introDelayMs;
    battleState.pendingContinuation = () => advanceToNextTurn(performance.now());
    ui.resultOverlay.classList.add("hidden");
    updateCamera(true);
    renderHud();
  }

  function buildTurnQueue() {
    return getLivingActors()
      .slice()
      .sort((left, right) => {
        if (right.speed !== left.speed) {
          return right.speed - left.speed;
        }
        return teamPriority(left.team) - teamPriority(right.team);
      })
      .map((actor) => actor.id);
  }

  function getEffectiveMove(actor) {
    return Math.max(0, actor.baseMove - (actor.statuses.slowTurns > 0 ? 1 : 0));
  }

  function tickCooldowns(actor) {
    for (const skillId of actor.skillIds) {
      if (actor.cooldowns[skillId] > 0) {
        actor.cooldowns[skillId] -= 1;
      }
    }
  }

  function advanceToNextTurn(now) {
    if (battleState.winnerId) {
      return;
    }

    const livingActors = getLivingActors();
    if (livingActors.length <= 1) {
      declareWinner(livingActors[0]?.id || null);
      return;
    }

    if (!battleState.turnQueue.length || battleState.turnIndex >= battleState.turnQueue.length) {
      battleState.turnQueue = buildTurnQueue();
      battleState.turnIndex = 0;
      battleState.round += 1;
    }

    const nextActorId = battleState.turnQueue[battleState.turnIndex];
    const actor = getActor(nextActorId);
    if (!actor || actor.hp <= 0) {
      battleState.turnIndex += 1;
      advanceToNextTurn(now);
      return;
    }

    startTurn(actor, now);
  }

  function startTurn(actor, now) {
    tickCooldowns(actor);
    actor.currentMoveAllowance = getEffectiveMove(actor);
    actor.movedThisTurn = false;
    actor.actedThisTurn = false;
    actor.movedTilesThisTurn = 0;
    actor.queuedPath = [];
    actor.onPathComplete = null;
    actor.slowExpiresAfterTurn = actor.statuses.slowTurns > 0;

    battleState.activeActorId = actor.id;
    battleState.selectedSkillId = null;
    battleState.targetableTiles = new Set();
    battleState.pathPreview = [];
    battleState.cursor = { x: actor.x, y: actor.y };
    battleState.reachableTiles = computeReachableTiles(actor);
    battleState.enemyPlan = null;
    battleState.selectedTileActorId = actor.id;
    battleState.hintText = actor.controller === "player"
      ? `${actor.name} acts first. Move across the garden, then choose a skill or wait.`
      : `${actor.name} studies the battlefield for the strongest line of play.`;

    if (actor.controller === "player") {
      battleState.phase = "moveSelect";
    } else {
      battleState.phase = "enemyTurn";
      battleState.enemyThinkAt = now + 520;
    }

    renderHud();
  }

  function computeReachableTiles(actor) {
    const queue = [{ x: actor.x, y: actor.y }];
    const reachable = new Map([[tileKey(actor.x, actor.y), { x: actor.x, y: actor.y, cost: 0, previousKey: null }]]);

    while (queue.length) {
      const current = queue.shift();
      const currentEntry = reachable.get(tileKey(current.x, current.y));

      for (const directionKey of directionOrder) {
        const direction = directions[directionKey];
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;
        const nextCost = currentEntry.cost + 1;
        const key = tileKey(nextX, nextY);

        if (!isWithinBounds(nextX, nextY) || nextCost > actor.currentMoveAllowance || isStaticTileBlocked(nextX, nextY)) {
          continue;
        }

        if (getActorAt(nextX, nextY, actor.id)) {
          continue;
        }

        const bestExisting = reachable.get(key);
        if (bestExisting && bestExisting.cost <= nextCost) {
          continue;
        }

        reachable.set(key, { x: nextX, y: nextY, cost: nextCost, previousKey: tileKey(current.x, current.y) });
        queue.push({ x: nextX, y: nextY });
      }
    }

    return reachable;
  }

  function buildPathToTile(reachableTiles, x, y) {
    const path = [];
    let currentKey = tileKey(x, y);
    if (!reachableTiles.has(currentKey)) {
      return path;
    }

    while (currentKey) {
      const entry = reachableTiles.get(currentKey);
      if (!entry) {
        break;
      }
      path.push({ x: entry.x, y: entry.y });
      currentKey = entry.previousKey;
    }

    return path.reverse();
  }

  function getDirectionKeyBetween(fromX, fromY, toX, toY) {
    return directionOrder.find((directionKey) => {
      const direction = directions[directionKey];
      return fromX + direction.dx === toX && fromY + direction.dy === toY;
    }) || null;
  }

  function startQueuedMove(actor, path, now, onComplete) {
    actor.queuedPath = path.slice(1);
    actor.onPathComplete = onComplete || null;

    if (!actor.queuedPath.length) {
      setCharacterAnimation(actor, "idle", now);
      if (typeof actor.onPathComplete === "function") {
        const callback = actor.onPathComplete;
        actor.onPathComplete = null;
        callback();
      }
      return;
    }

    continueQueuedMove(actor, now);
  }

  function continueQueuedMove(actor, now) {
    if (!actor.queuedPath.length) {
      actor.moving = false;
      setCharacterAnimation(actor, "idle", now);
      if (typeof actor.onPathComplete === "function") {
        const callback = actor.onPathComplete;
        actor.onPathComplete = null;
        callback();
      }
      return;
    }

    const nextTile = actor.queuedPath.shift();
    const directionKey = getDirectionKeyBetween(actor.x, actor.y, nextTile.x, nextTile.y);
    if (!directionKey) {
      continueQueuedMove(actor, now);
      return;
    }

    actor.direction = directions[directionKey].sprite;
    actor.fromX = actor.renderX;
    actor.fromY = actor.renderY;
    actor.toX = nextTile.x;
    actor.toY = nextTile.y;
    actor.x = nextTile.x;
    actor.y = nextTile.y;
    actor.moveStartedAt = now;
    actor.moving = true;
    actor.movedThisTurn = true;
    actor.movedTilesThisTurn += 1;
    setCharacterAnimation(actor, "walking", now);
  }

  function updateActorMovement(actor, now) {
    if (!actor.moving) {
      actor.renderX = actor.x;
      actor.renderY = actor.y;
      return;
    }

    const elapsed = now - actor.moveStartedAt;
    const progress = clamp(elapsed / actor.moveDuration, 0, 1);
    const eased = easeInOutSine(progress);
    actor.renderX = actor.fromX + (actor.toX - actor.fromX) * eased;
    actor.renderY = actor.fromY + (actor.toY - actor.fromY) * eased;

    if (progress >= 1) {
      actor.moving = false;
      actor.renderX = actor.toX;
      actor.renderY = actor.toY;
      if (actor.queuedPath.length) {
        continueQueuedMove(actor, now);
      } else {
        setCharacterAnimation(actor, "idle", now);
        if (typeof actor.onPathComplete === "function") {
          const callback = actor.onPathComplete;
          actor.onPathComplete = null;
          callback();
        }
      }
    }
  }

  function areAnyActorsMoving() {
    return runtime.actors.some((actor) => actor.moving);
  }

  function updateCamera(immediate = false) {
    const focusActor = getActor(gameConfig.cameraFollowActorId) || getActor(battleState.activeActorId) || runtime.actors[0];
    if (!focusActor) {
      return;
    }

    const anchor = projectMap(focusActor.renderX, focusActor.renderY);
    const targetX = -anchor.x;
    const targetY = scene.height * 0.22 - anchor.y;

    if (immediate) {
      camera.x = targetX;
      camera.y = targetY;
      return;
    }

    camera.x += (targetX - camera.x) * 0.12;
    camera.y += (targetY - camera.y) * 0.12;
  }

  function getMarkerRadius(entityKind) {
    if (entityKind === "actor") {
      return { x: 17, y: 8, alpha: 0.17 };
    }
    if (entityKind === "tree") {
      return { x: 18, y: 9, alpha: 0.14 };
    }
    return { x: 12, y: 6, alpha: 0.14 };
  }

  function drawBackground() {
    ctx.clearRect(0, 0, scene.width, scene.height);
    const sky = ctx.createLinearGradient(0, 0, 0, scene.height);
    sky.addColorStop(0, "#eef7d3");
    sky.addColorStop(0.5, "#a7d195");
    sky.addColorStop(1, "#4a7e53");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, scene.width, scene.height);

    ctx.fillStyle = "rgba(255, 244, 202, 0.52)";
    ctx.beginPath();
    ctx.arc(scene.width * 0.14, scene.height * 0.13, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.ellipse(scene.width * 0.22, scene.height * 0.16, 122, 30, 0.08, 0, Math.PI * 2);
    ctx.ellipse(scene.width * 0.5, scene.height * 0.2, 148, 36, -0.03, 0, Math.PI * 2);
    ctx.ellipse(scene.width * 0.78, scene.height * 0.12, 102, 24, 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTile(centerX, centerY, fill) {
    const halfW = grid.tileWidth * 0.5;
    const halfH = grid.tileHeight * 0.5;
    const depth = grid.tileDepth;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - halfH);
    ctx.lineTo(centerX + halfW, centerY);
    ctx.lineTo(centerX, centerY + halfH);
    ctx.lineTo(centerX - halfW, centerY);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX - halfW, centerY);
    ctx.lineTo(centerX, centerY + halfH);
    ctx.lineTo(centerX, centerY + halfH + depth);
    ctx.lineTo(centerX - halfW, centerY + depth);
    ctx.closePath();
    ctx.fillStyle = shade(fill, -18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX + halfW, centerY);
    ctx.lineTo(centerX, centerY + halfH);
    ctx.lineTo(centerX, centerY + halfH + depth);
    ctx.lineTo(centerX + halfW, centerY + depth);
    ctx.closePath();
    ctx.fillStyle = shade(fill, -28);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - halfH);
    ctx.lineTo(centerX + halfW, centerY);
    ctx.lineTo(centerX, centerY + halfH);
    ctx.lineTo(centerX - halfW, centerY);
    ctx.closePath();
    ctx.stroke();
  }

  function drawTileOverlay(centerX, centerY, fill, stroke, lineWidth = 2) {
    const halfW = grid.tileWidth * 0.5;
    const halfH = grid.tileHeight * 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - halfH);
    ctx.lineTo(centerX + halfW, centerY);
    ctx.lineTo(centerX, centerY + halfH);
    ctx.lineTo(centerX - halfW, centerY);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function drawGround() {
    ctx.save();
    ctx.shadowColor = "rgba(11, 25, 17, 0.22)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 18;
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const position = screenProject(x, y);
        drawTile(position.x, position.y, runtime.tileTone[y][x]);
      }
    }
    ctx.restore();
  }

  function drawMoveAndTargetHighlights(now) {
    const pulse = 0.55 + Math.sin(now * 0.01) * 0.14;
    const activeActor = getActor(battleState.activeActorId);

    if (battleState.phase === "moveSelect" && activeActor) {
      for (const entry of battleState.reachableTiles.values()) {
        const position = screenProject(entry.x, entry.y);
        const isCurrentTile = entry.x === activeActor.x && entry.y === activeActor.y;
        drawTileOverlay(
          position.x,
          position.y,
          isCurrentTile ? `rgba(255, 236, 158, ${0.12 + pulse * 0.12})` : "rgba(104, 216, 146, 0.22)",
          isCurrentTile ? `rgba(255, 229, 130, ${0.54 + pulse * 0.18})` : "rgba(186, 255, 208, 0.2)",
          isCurrentTile ? 2.8 : 1.6
        );
      }
    }

    if (battleState.phase === "targetSelect") {
      for (const key of battleState.targetableTiles) {
        const tile = parseTileKey(key);
        const position = screenProject(tile.x, tile.y);
        drawTileOverlay(position.x, position.y, "rgba(255, 110, 110, 0.26)", "rgba(255, 214, 214, 0.4)", 2);
      }
    }

    for (const tile of battleState.pathPreview) {
      const position = screenProject(tile.x, tile.y);
      drawTileOverlay(position.x, position.y, "rgba(255, 227, 124, 0.16)", "rgba(255, 238, 169, 0.48)", 1.8);
    }

    const cursorPosition = screenProject(battleState.cursor.x, battleState.cursor.y);
    drawTileOverlay(
      cursorPosition.x,
      cursorPosition.y,
      `rgba(255, 231, 124, ${0.12 + pulse * 0.1})`,
      `rgba(255, 244, 193, ${0.78 + pulse * 0.16})`,
      3
    );

    for (const effect of battleState.effects) {
      if (effect.layer === "ground") {
        drawEffect(effect, now);
      }
    }
  }

  function drawLocationMarker(anchorX, anchorY, radiusX, radiusY, alpha) {
    ctx.fillStyle = `rgba(7, 18, 13, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSprite(sprite, anchorX, anchorY, targetHeight) {
    const source = sprite.bounds;
    const referenceHeight = sprite.referenceHeight || source.height;
    const scale = targetHeight / referenceHeight;
    const targetWidth = source.width * scale;
    const pivotX = (sprite.pivot?.x ?? source.x + source.width * 0.5) - source.x;
    const pivotY = (sprite.pivot?.y ?? source.y + source.height) - source.y;
    ctx.drawImage(sprite.image, source.x, source.y, source.width, source.height, anchorX - pivotX * scale, anchorY - pivotY * scale, targetWidth, targetHeight);
  }

  function drawActor(actor, anchorX, anchorY, now) {
    const sprite = assets.characters[actor.unitId]?.[actor.direction]?.[getCurrentCharacterFrame(actor)];
    if (!sprite) {
      return;
    }

    if (debug.showMarkers) {
      const marker = getMarkerRadius("actor");
      drawLocationMarker(anchorX, anchorY, marker.x, marker.y, marker.alpha);
    }

    ctx.fillStyle = actor.team === "hero" ? "rgba(247, 194, 79, 0.28)" : "rgba(117, 178, 255, 0.28)";
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    if (actor.shield > 0) {
      ctx.strokeStyle = "rgba(160, 226, 255, 0.76)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY - 30, 34, 46, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (actor.flashUntil > now) {
      const flashAlpha = clamp((actor.flashUntil - now) / 280, 0, 1) * 0.38;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY - 34, 38, 52, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    if (actor.hp <= 0) {
      ctx.globalAlpha = 0.46;
    }
    drawSprite(sprite, anchorX, anchorY, gameConfig.actorDrawHeight);
    ctx.restore();

    const hpWidth = 42;
    const hpRatio = actor.maxHp > 0 ? actor.hp / actor.maxHp : 0;
    ctx.fillStyle = "rgba(9, 12, 10, 0.62)";
    ctx.fillRect(anchorX - hpWidth * 0.5, anchorY - 132, hpWidth, 6);
    ctx.fillStyle = actor.themeClass === "hero" ? "#f5c057" : "#76b4ff";
    ctx.fillRect(anchorX - hpWidth * 0.5, anchorY - 132, hpWidth * hpRatio, 6);
  }

  function drawEntities(now) {
    const entities = [
      ...getCurrentMap().props.map((object) => ({ kind: object.kind, x: object.x, y: object.y, object })),
      ...runtime.actors.map((actor) => ({ kind: "actor", x: actor.renderX, y: actor.renderY, actor })),
    ].sort((left, right) => worldSortValue(left) - worldSortValue(right));

    for (const entity of entities) {
      const position = screenProject(entity.x, entity.y);
      const anchorX = position.x;
      const anchorY = position.y + grid.tileHeight * 0.18;

      if (entity.kind === "actor") {
        drawActor(entity.actor, anchorX, anchorY, now);
        continue;
      }

      const object = entity.object;
      const sprite = object.kind === "tree" ? assets.tree[object.direction] : assets.flowers[object.flower]?.[object.direction];
      if (!sprite) {
        continue;
      }

      if (debug.showMarkers) {
        const marker = getMarkerRadius(object.kind);
        drawLocationMarker(anchorX, anchorY, marker.x, marker.y, marker.alpha);
      }

      const baseHeight = object.kind === "tree" ? 192 : 108;
      const renderOffsetY = trimConfig.renderOffsetYByType[object.kind] || 0;
      drawSprite(sprite, anchorX, anchorY + renderOffsetY, baseHeight * object.scale);
    }
  }

  function drawEffect(effect, now) {
    const progress = clamp((now - effect.createdAt) / effect.duration, 0, 1);

    if (effect.kind === "tilePulse") {
      const position = screenProject(effect.x, effect.y);
      const alpha = (1 - progress) * effect.alpha;
      drawTileOverlay(position.x, position.y, `rgba(${effect.rgb.join(", ")}, ${alpha * 0.28})`, `rgba(${effect.rgb.join(", ")}, ${alpha})`, 2.2);
      return;
    }

    if (effect.kind === "floatingText") {
      const position = screenProject(effect.x, effect.y);
      const rise = progress * 44;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = effect.color;
      ctx.font = `700 ${effect.fontSize || 18}px "Trebuchet MS"`;
      ctx.textAlign = "center";
      ctx.fillText(effect.text, position.x, position.y - 96 - rise);
      ctx.restore();
      return;
    }

    if (effect.kind === "projectile") {
      const from = screenProject(effect.fromX, effect.fromY);
      const to = screenProject(effect.toX, effect.toY);
      const midX = from.x + (to.x - from.x) * progress;
      const midY = from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * (effect.arcHeight || 28);
      ctx.save();
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - 50);
      ctx.lineTo(midX, midY - 40);
      ctx.stroke();
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(midX, midY - 40, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (effect.kind === "slashArc") {
      const position = screenProject(effect.x, effect.y);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(position.x + 6, position.y - 46, 32 + progress * 16, -0.9, 0.4);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (effect.kind === "burstRing") {
      const position = screenProject(effect.x, effect.y);
      const radius = 18 + progress * 42;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(position.x, position.y - 40, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawAirEffects(now) {
    for (const effect of battleState.effects) {
      if (effect.layer !== "ground") {
        drawEffect(effect, now);
      }
    }
  }

  function render(now = performance.now()) {
    drawBackground();
    if (!runtime.map || !runtime.tileTone.length) {
      return;
    }
    ctx.save();
    drawGround();
    drawMoveAndTargetHighlights(now);
    drawEntities(now);
    drawAirEffects(now);
    ctx.restore();
  }

  function addEffect(effect) {
    battleState.effects.push(effect);
  }

  function updateEffects(now) {
    battleState.effects = battleState.effects.filter((effect) => now - effect.createdAt <= effect.duration);
  }

  function getTargetTilesForSkill(actor, skill, fromX = actor.x, fromY = actor.y) {
    if (skill.target === "self") {
      return new Set([tileKey(fromX, fromY)]);
    }

    const opponents = getOpponentActors(actor);
    const targetTiles = new Set();

    if (skill.target === "burst") {
      for (const enemy of opponents) {
        if (manhattanDistance(fromX, fromY, enemy.x, enemy.y) === 1) {
          targetTiles.add(tileKey(enemy.x, enemy.y));
        }
      }
      return targetTiles;
    }

    for (const enemy of opponents) {
      const distance = manhattanDistance(fromX, fromY, enemy.x, enemy.y);
      if (distance >= skill.minRange && distance <= skill.maxRange) {
        targetTiles.add(tileKey(enemy.x, enemy.y));
      }
    }

    return targetTiles;
  }

  function getActionMenuEntries(actor) {
    const entries = actor.skillIds.map((skillId) => {
      const skill = skillCatalog[skillId];
      const cooldown = actor.cooldowns[skillId];
      const hasTarget = getTargetTilesForSkill(actor, skill).size > 0 || skill.target === "self";
      return {
        type: "skill",
        label: skill.name,
        meta: cooldown > 0 ? `CD ${cooldown}` : `Hotkey ${skill.hotkey}`,
        hotkey: skill.hotkey,
        disabled: cooldown > 0 || (!hasTarget && skill.target !== "self"),
        onSelect: () => beginSkillSelection(actor, skill),
        skillId,
      };
    });

    entries.push({
      type: "wait",
      label: "Wait",
      meta: "Hotkey 4",
      hotkey: "4",
      disabled: false,
      onSelect: () => finishTurn(actor, performance.now(), `${actor.name} waits and holds position.`),
    });

    return entries;
  }

  function beginSkillSelection(actor, skill) {
    if (battleState.phase !== "actionMenu" || actor.cooldowns[skill.id] > 0) {
      return;
    }

    battleState.selectedSkillId = skill.id;

    if (skill.target === "self") {
      resolveSkill(actor, skill, [actor], performance.now());
      return;
    }

    if (skill.target === "burst") {
      const targets = getOpponentActors(actor).filter((enemy) => manhattanDistance(actor.x, actor.y, enemy.x, enemy.y) === 1);
      if (!targets.length) {
        battleState.hintText = `${skill.name} needs an adjacent target.`;
        renderHud();
        return;
      }
      resolveSkill(actor, skill, targets, performance.now());
      return;
    }

    battleState.targetableTiles = getTargetTilesForSkill(actor, skill);
    if (!battleState.targetableTiles.size) {
      battleState.hintText = `${skill.name} has no valid target from here.`;
      renderHud();
      return;
    }

    const firstTarget = parseTileKey([...battleState.targetableTiles][0]);
    battleState.cursor = { x: firstTarget.x, y: firstTarget.y };
    battleState.phase = "targetSelect";
    battleState.hintText = `Choose a target for ${skill.name}.`;
    updatePathPreview();
    renderHud();
  }

  function applyDamage(target, amount, now) {
    const absorbed = Math.min(target.shield, amount);
    if (absorbed > 0) {
      target.shield -= absorbed;
      addEffect({ kind: "floatingText", x: target.x, y: target.y, text: `Shield -${absorbed}`, color: "#b8ebff", createdAt: now, duration: 960, layer: "air", fontSize: 15 });
    }

    const hpDamage = Math.max(0, amount - absorbed);
    if (hpDamage > 0) {
      target.hp = clamp(target.hp - hpDamage, 0, target.maxHp);
      addEffect({ kind: "floatingText", x: target.x, y: target.y, text: `-${hpDamage}`, color: "#ffe7c8", createdAt: now + 70, duration: 980, layer: "air", fontSize: 18 });
    }

    target.flashUntil = now + 280;
    return { absorbed, hpDamage };
  }

  function setSkillCooldown(actor, skill) {
    if (skill.cooldown > 0) {
      actor.cooldowns[skill.id] = skill.cooldown + 1;
    }
  }

  function getEnemyActorForShieldExpiry(actor) {
    return getOpponentActors(actor)[0] || null;
  }

  function predictDamage(actor, skill, target) {
    let damage = skill.damage || 0;
    if (skill.id === "studStrike" && actor.movedTilesThisTurn >= 2) {
      damage += 2;
    }
    const absorbed = Math.min(target.shield, damage);
    const hpDamage = Math.max(0, damage - absorbed);
    return { totalDamage: damage, absorbed, hpDamage, wouldKO: hpDamage >= target.hp };
  }

  function resolveSkill(actor, skill, targets, now) {
    actor.actedThisTurn = true;
    setSkillCooldown(actor, skill);
    battleState.selectedSkillId = null;
    battleState.targetableTiles = new Set();

    if (skill.id === "guardUp") {
      actor.shield = skill.shield;
      actor.shieldExpiresAfterActorId = getEnemyActorForShieldExpiry(actor)?.id || null;
      addEffect({ kind: "burstRing", x: actor.x, y: actor.y, color: "#9fe1ff", createdAt: now, duration: 620, layer: "air" });
      addEffect({ kind: "floatingText", x: actor.x, y: actor.y, text: `Shield +${skill.shield}`, color: "#bfefff", createdAt: now, duration: 980, layer: "air", fontSize: 16 });
      battleState.hintText = `${actor.name} braces behind a stack of bright yellow studs.`;
      deferBattleStep(520, () => finishTurn(actor, performance.now(), `${actor.name} is shielded until the next enemy action.`), now);
      renderHud();
      return;
    }

    for (const target of targets) {
      addEffect({
        kind: "tilePulse",
        x: target.x,
        y: target.y,
        rgb: skill.palette === "#ffd768" ? [255, 216, 104] : skill.palette === "#ffc287" ? [255, 194, 135] : skill.palette === "#95c0ff" ? [149, 192, 255] : skill.palette === "#c9b3ff" ? [201, 179, 255] : [122, 214, 255],
        alpha: 0.72,
        createdAt: now,
        duration: 420,
        layer: "ground",
      });
    }

    if (skill.id === "studStrike") {
      addEffect({ kind: "slashArc", x: targets[0].x, y: targets[0].y, color: "#ffe382", createdAt: now, duration: 340, layer: "air" });
    } else if (skill.id === "brickToss" || skill.id === "runeBolt" || skill.id === "hexSnap") {
      addEffect({
        kind: "projectile",
        fromX: actor.x,
        fromY: actor.y,
        toX: targets[0].x,
        toY: targets[0].y,
        color: skill.id === "brickToss" ? "#ffca8f" : skill.id === "runeBolt" ? "#9ebfff" : "#d6c2ff",
        createdAt: now,
        duration: 360,
        layer: "air",
        arcHeight: skill.id === "brickToss" ? 48 : 24,
      });
    } else if (skill.id === "pulseBurst") {
      addEffect({ kind: "burstRing", x: actor.x, y: actor.y, color: "#8de3ff", createdAt: now, duration: 520, layer: "air" });
    }

    const outcomeSummary = [];
    for (const target of targets) {
      const prediction = predictDamage(actor, skill, target);
      applyDamage(target, prediction.totalDamage, now + 160);
      outcomeSummary.push(`${target.name} loses ${prediction.hpDamage} HP${prediction.absorbed ? ` and blocks ${prediction.absorbed}` : ""}`);
      if (skill.applyStatus?.type === "slow" && target.hp > 0) {
        target.statuses.slowTurns = Math.max(target.statuses.slowTurns, skill.applyStatus.durationTurns);
        addEffect({ kind: "floatingText", x: target.x, y: target.y, text: "Slow", color: "#d2c8ff", createdAt: now + 220, duration: 1100, layer: "air", fontSize: 15 });
      }
    }

    battleState.hintText = `${actor.name} uses ${skill.name}. ${outcomeSummary.join(". ")}.`;
    checkForBattleEnd(actor);
    if (battleState.winnerId) {
      renderHud();
      return;
    }

    deferBattleStep(620, () => finishTurn(actor, performance.now(), battleState.hintText), now);
    renderHud();
  }

  function clearExpiredShields(triggerActorId) {
    for (const actor of runtime.actors) {
      if (actor.shield > 0 && actor.shieldExpiresAfterActorId === triggerActorId) {
        actor.shield = 0;
        actor.shieldExpiresAfterActorId = null;
      }
    }
  }

  function finishTurn(actor, now, message) {
    if (actor.slowExpiresAfterTurn && actor.statuses.slowTurns > 0) {
      actor.statuses.slowTurns -= 1;
      actor.slowExpiresAfterTurn = false;
    }

    clearExpiredShields(actor.id);
    battleState.hintText = message || `${actor.name} ends their turn.`;
    battleState.phase = "resolve";
    battleState.reachableTiles = new Map();
    battleState.targetableTiles = new Set();
    battleState.pathPreview = [];
    battleState.selectedSkillId = null;

    deferBattleStep(360, () => {
      battleState.turnIndex += 1;
      advanceToNextTurn(performance.now());
    }, now);

    renderHud();
  }

  function deferBattleStep(delayMs, continuation, now = performance.now()) {
    battleState.phase = "resolve";
    battleState.continuationAt = now + delayMs;
    battleState.pendingContinuation = continuation;
  }

  function checkForBattleEnd(lastActor) {
    const livingActors = getLivingActors();
    if (livingActors.length <= 1) {
      declareWinner(livingActors[0]?.id || lastActor?.id || null);
    }
  }

  function declareWinner(actorId) {
    battleState.winnerId = actorId;
    const winner = getActor(actorId);
    const playerWon = winner?.team === "hero";
    battleState.phase = playerWon ? "victory" : "defeat";
    ui.resultOverlay.classList.remove("hidden");
    ui.resultKicker.textContent = playerWon ? "Victory" : "Defeat";
    ui.resultTitle.textContent = playerWon ? "Weliwel wins the Brick Garden Duel" : "Majisto controls the garden";
    ui.resultBody.textContent = playerWon
      ? "The LEGO duelist survives the opening tactical test. Restart to replay the encounter."
      : "Majisto's spacing and spell pressure claimed the first skirmish. Restart to take another shot.";
    renderHud();
  }

  function updatePathPreview() {
    battleState.pathPreview = [];
    if (battleState.phase === "moveSelect") {
      const key = tileKey(battleState.cursor.x, battleState.cursor.y);
      if (battleState.reachableTiles.has(key)) {
        battleState.pathPreview = buildPathToTile(battleState.reachableTiles, battleState.cursor.x, battleState.cursor.y);
      }
    }
  }

  function setCursorTile(x, y) {
    if (!isWithinBounds(x, y)) {
      return;
    }
    battleState.cursor = { x, y };
    const actorOnTile = getActorAt(x, y);
    battleState.selectedTileActorId = actorOnTile?.id || null;
    updatePathPreview();
  }

  function tryMoveCursor(directionKey) {
    const direction = directions[directionKey];
    if (!direction) {
      return;
    }
    const nextX = clamp(battleState.cursor.x + direction.dx, 0, grid.width - 1);
    const nextY = clamp(battleState.cursor.y + direction.dy, 0, grid.height - 1);
    setCursorTile(nextX, nextY);
    renderHud();
  }

  function confirmMoveSelection(now) {
    const activeActor = getActor(battleState.activeActorId);
    if (!activeActor || battleState.phase !== "moveSelect") {
      return;
    }

    const key = tileKey(battleState.cursor.x, battleState.cursor.y);
    if (!battleState.reachableTiles.has(key)) {
      battleState.hintText = "That tile is outside Weliwel's move range.";
      renderHud();
      return;
    }

    const path = buildPathToTile(battleState.reachableTiles, battleState.cursor.x, battleState.cursor.y);
    battleState.hintText = path.length > 1
      ? `${activeActor.name} advances ${path.length - 1} tile${path.length - 1 === 1 ? "" : "s"}.`
      : `${activeActor.name} holds position and prepares an action.`;

    deferBattleStep(0, () => {}, now);
    startQueuedMove(activeActor, path, now, () => {
      battleState.phase = "actionMenu";
      battleState.reachableTiles = new Map();
      battleState.pathPreview = [];
      battleState.targetableTiles = new Set();
      battleState.hintText = `${activeActor.name} is in position. Pick a skill or wait.`;
      renderHud();
    });
    renderHud();
  }

  function confirmTargetSelection(now) {
    const activeActor = getActor(battleState.activeActorId);
    const skill = skillCatalog[battleState.selectedSkillId];
    if (!activeActor || !skill || battleState.phase !== "targetSelect") {
      return;
    }

    const key = tileKey(battleState.cursor.x, battleState.cursor.y);
    if (!battleState.targetableTiles.has(key)) {
      battleState.hintText = "That tile is not a valid target.";
      renderHud();
      return;
    }

    const targetActor = getActorAt(battleState.cursor.x, battleState.cursor.y);
    if (!targetActor) {
      battleState.hintText = "Only living enemy units can be targeted.";
      renderHud();
      return;
    }

    resolveSkill(activeActor, skill, [targetActor], now);
  }

  function cancelCurrentSelection() {
    const activeActor = getActor(battleState.activeActorId);
    if (!activeActor) {
      return;
    }

    if (battleState.phase === "targetSelect") {
      battleState.phase = "actionMenu";
      battleState.targetableTiles = new Set();
      battleState.selectedSkillId = null;
      battleState.hintText = `${activeActor.name} returns to the command list.`;
      renderHud();
      return;
    }

    if (battleState.phase === "actionMenu") {
      battleState.phase = "moveSelect";
      battleState.reachableTiles = computeReachableTiles(activeActor);
      setCursorTile(activeActor.x, activeActor.y);
      battleState.hintText = `${activeActor.name} reconsiders the move.`;
      renderHud();
    }
  }

  function predictForecastText() {
    const activeActor = getActor(battleState.activeActorId);
    if (!activeActor) {
      return "The tactical forecast will appear once the duel is ready.";
    }

    if (battleState.phase === "moveSelect") {
      const tileAtCursor = tileKey(battleState.cursor.x, battleState.cursor.y);
      if (battleState.reachableTiles.has(tileAtCursor)) {
        const path = buildPathToTile(battleState.reachableTiles, battleState.cursor.x, battleState.cursor.y);
        const distance = Math.max(0, path.length - 1);
        const tileActor = getActorAt(battleState.cursor.x, battleState.cursor.y);
        if (tileActor && tileActor.id !== activeActor.id) {
          return `${tileActor.name} occupies this tile. Movement must route around living units.`;
        }
        return distance > 0
          ? `${activeActor.name} can reach this tile in ${distance} step${distance === 1 ? "" : "s"}.`
          : "Confirm the current tile to keep position and move straight to the action menu.";
      }
      return "Move the cursor to any highlighted tile, then press Enter or Space to lock movement.";
    }

    if (battleState.phase === "actionMenu") {
      const movedBonus = activeActor.movedTilesThisTurn >= 2 ? " Stud Strike is primed for +2 damage." : "";
      return `${activeActor.name} has moved ${activeActor.movedTilesThisTurn} tile${activeActor.movedTilesThisTurn === 1 ? "" : "s"} this turn.${movedBonus}`;
    }

    if (battleState.phase === "targetSelect") {
      const skill = skillCatalog[battleState.selectedSkillId];
      const targetActor = getActorAt(battleState.cursor.x, battleState.cursor.y);
      if (skill && targetActor) {
        const prediction = predictDamage(activeActor, skill, targetActor);
        const extras = [];
        if (prediction.absorbed > 0) {
          extras.push(`${prediction.absorbed} blocked by shield`);
        }
        if (skill.applyStatus?.type === "slow") {
          extras.push("applies Slow");
        }
        return `${skill.name} will deal ${prediction.hpDamage} HP damage to ${targetActor.name}${extras.length ? ` and ${extras.join(", ")}` : ""}.`;
      }
      return "Move the cursor onto a highlighted enemy tile, then confirm the target.";
    }

    if (battleState.phase === "enemyTurn") {
      return "Majisto is evaluating damage, spacing, and the safest line of fire.";
    }

    if (battleState.phase === "victory" || battleState.phase === "defeat") {
      return battleState.winnerId && getActor(battleState.winnerId)
        ? `${getActor(battleState.winnerId).name} controls the battlefield. Restart to replay the duel.`
        : "Restart to replay the duel.";
    }

    return battleState.hintText;
  }

  function formatCooldowns(actor) {
    return actor.skillIds
      .map((skillId) => {
        const skill = skillCatalog[skillId];
        const cooldown = actor.cooldowns[skillId];
        return `<span class="cooldown-pill ${cooldown > 0 ? "is-cooling" : "is-ready"}">${skill.name}: ${cooldown > 0 ? `CD ${cooldown}` : "Ready"}</span>`;
      })
      .join("");
  }

  function formatStatuses(actor) {
    const statuses = [];
    if (actor.shield > 0) {
      statuses.push('<span class="status-pill">Shield ' + actor.shield + "</span>");
    }
    if (actor.statuses.slowTurns > 0) {
      statuses.push('<span class="status-pill">Slow</span>');
    }
    return statuses.length ? statuses.join("") : '<span class="stat-pill">No active statuses</span>';
  }

  function buildUnitCard(actor, isActive) {
    const hpPercent = actor.maxHp > 0 ? (actor.hp / actor.maxHp) * 100 : 0;
    const shieldPercent = actor.maxHp > 0 ? (actor.shield / actor.maxHp) * 100 : 0;
    const activeSkillSummary = actor.skillIds.map((skillId) => skillCatalog[skillId].name).join(", ");
    return `
      <div class="unit-header">
        <div>
          <div class="unit-name">${actor.name}</div>
          <div class="unit-role">${actor.role}</div>
        </div>
        <div class="accent-chip ${actor.themeClass}">${isActive ? "Active" : actor.controller === "player" ? "Player" : "AI"}</div>
      </div>
      <div class="hp-rail">
        <div class="hp-fill" style="width:${hpPercent}%"></div>
        <div class="shield-fill" style="width:${shieldPercent}%"></div>
      </div>
      <div class="unit-stats">
        <span class="stat-pill">HP ${actor.hp}/${actor.maxHp}</span>
        <span class="stat-pill">Move ${actor.currentMoveAllowance}</span>
        <span class="stat-pill">Speed ${actor.speed}</span>
      </div>
      <div class="unit-statuses">${formatStatuses(actor)}</div>
      <div class="unit-cooldowns">${formatCooldowns(actor)}</div>
      <p class="unit-description">${unitCatalog[actor.unitId].blurb}</p>
      <div class="stat-pill">Skills: ${activeSkillSummary}</div>
    `;
  }

  function renderTurnRibbon() {
    const queue = battleState.turnQueue.length ? battleState.turnQueue : buildTurnQueue();
    ui.turnRibbon.innerHTML = queue
      .map((actorId) => {
        const actor = getActor(actorId);
        if (!actor) {
          return "";
        }
        const classes = [
          "turn-pill",
          actor.team === "hero" ? "is-hero" : "is-enemy",
          battleState.activeActorId === actor.id ? "is-active" : "",
        ].join(" ");
        return `<div class="${classes}">${actor.name}<br><span class="label">Speed ${actor.speed}</span></div>`;
      })
      .join("");
  }

  function renderActionButtons() {
    ui.actionButtons.innerHTML = "";
    const activeActor = getActor(battleState.activeActorId);

    if (!activeActor || battleState.phase === "enemyTurn" || battleState.phase === "resolve" || battleState.phase === "intro") {
      const disabledButton = document.createElement("button");
      disabledButton.type = "button";
      disabledButton.className = `hud-button ${activeActor?.team === "enemy" ? "enemy" : "primary"}`;
      disabledButton.disabled = true;
      disabledButton.innerHTML = `<span>${battleState.phase === "enemyTurn" ? "Majisto is thinking" : battleState.phase === "resolve" ? "Resolving action" : "Loading battle"}</span><span class="meta">...</span>`;
      ui.actionButtons.appendChild(disabledButton);
      return;
    }

    if (battleState.phase === "moveSelect") {
      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "hud-button primary";
      confirmButton.innerHTML = '<span>Confirm destination</span><span class="meta">Enter</span>';
      confirmButton.addEventListener("click", () => confirmMoveSelection(performance.now()));
      ui.actionButtons.appendChild(confirmButton);

      const holdButton = document.createElement("button");
      holdButton.type = "button";
      holdButton.className = "hud-button";
      holdButton.innerHTML = '<span>Hold position</span><span class="meta">Current tile</span>';
      holdButton.addEventListener("click", () => {
        setCursorTile(activeActor.x, activeActor.y);
        confirmMoveSelection(performance.now());
      });
      ui.actionButtons.appendChild(holdButton);
      return;
    }

    if (battleState.phase === "targetSelect") {
      const skill = skillCatalog[battleState.selectedSkillId];

      const confirmTarget = document.createElement("button");
      confirmTarget.type = "button";
      confirmTarget.className = "hud-button primary";
      confirmTarget.innerHTML = `<span>Confirm ${skill?.name || "target"}</span><span class="meta">Enter</span>`;
      confirmTarget.addEventListener("click", () => confirmTargetSelection(performance.now()));
      ui.actionButtons.appendChild(confirmTarget);

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "hud-button";
      cancelButton.innerHTML = '<span>Cancel targeting</span><span class="meta">Escape</span>';
      cancelButton.addEventListener("click", cancelCurrentSelection);
      ui.actionButtons.appendChild(cancelButton);
      return;
    }

    if (battleState.phase === "actionMenu") {
      for (const entry of getActionMenuEntries(activeActor)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `hud-button ${entry.type === "wait" ? "" : "primary"}`;
        button.disabled = entry.disabled;
        button.dataset.hotkey = entry.hotkey;
        button.innerHTML = `<span>${entry.label}</span><span class="meta">${entry.meta}</span>`;
        button.addEventListener("click", entry.onSelect);
        ui.actionButtons.appendChild(button);
      }
    }
  }

  function renderHud() {
    const hero = getActor("weliwel");
    const enemy = getActor("majisto");
    const activeActor = getActor(battleState.activeActorId);

    ui.phaseLabel.textContent = battleState.phase === "moveSelect"
      ? "Movement"
      : battleState.phase === "actionMenu"
      ? "Action Menu"
      : battleState.phase === "targetSelect"
      ? "Targeting"
      : battleState.phase === "enemyTurn"
      ? "Enemy Turn"
      : battleState.phase === "victory"
      ? "Victory"
      : battleState.phase === "defeat"
      ? "Defeat"
      : battleState.phase === "resolve"
      ? "Resolution"
      : "Intro";
    ui.roundLabel.textContent = `${Math.max(1, battleState.round)}`;
    ui.statusLine.textContent = battleState.hintText;

    if (hero) {
      ui.heroPanel.innerHTML = buildUnitCard(hero, battleState.activeActorId === hero.id);
      ui.heroPanel.classList.toggle("is-active", battleState.activeActorId === hero.id);
    }
    if (enemy) {
      ui.enemyPanel.innerHTML = buildUnitCard(enemy, battleState.activeActorId === enemy.id);
      ui.enemyPanel.classList.toggle("is-active", battleState.activeActorId === enemy.id);
    }

    renderTurnRibbon();
    renderActionButtons();
    ui.forecastPanel.textContent = predictForecastText();

    if (battleState.phase === "moveSelect") {
      ui.actionTitle.textContent = "Choose Movement";
      ui.actionSubtitle.textContent = "Highlight any reachable tile, then confirm Weliwel's route.";
    } else if (battleState.phase === "actionMenu") {
      ui.actionTitle.textContent = `${activeActor?.name || "Battle"} Commands`;
      ui.actionSubtitle.textContent = "Choose a skill from range or wait to pass the initiative.";
    } else if (battleState.phase === "targetSelect") {
      const skill = skillCatalog[battleState.selectedSkillId];
      ui.actionTitle.textContent = skill ? skill.name : "Targeting";
      ui.actionSubtitle.textContent = "Lock a highlighted target or escape back to the command list.";
    } else if (battleState.phase === "enemyTurn") {
      ui.actionTitle.textContent = "Majisto Is Planning";
      ui.actionSubtitle.textContent = "The AI scores damage, spacing, and safe end positions before acting.";
    } else if (battleState.phase === "resolve") {
      ui.actionTitle.textContent = "Resolving Action";
      ui.actionSubtitle.textContent = "Animations, damage, and status changes are being applied.";
    } else {
      ui.actionTitle.textContent = "Battle Controls";
      ui.actionSubtitle.textContent = "Restart to replay the duel or wait for the next tactical state.";
    }
  }

  function handleActionHotkey(key) {
    const activeActor = getActor(battleState.activeActorId);
    if (!activeActor || battleState.phase !== "actionMenu") {
      return false;
    }
    const entry = getActionMenuEntries(activeActor).find((candidate) => candidate.hotkey === key);
    if (!entry || entry.disabled) {
      return false;
    }
    entry.onSelect();
    return true;
  }

  function selectTileFromPointer(clientX, clientY, confirmSelection) {
    const bounds = canvas.getBoundingClientRect();
    const localX = clientX - bounds.left;
    const localY = clientY - bounds.top;
    const tile = screenToTile(localX, localY);
    if (!tile) {
      return;
    }
    setCursorTile(tile.x, tile.y);
    if (confirmSelection) {
      if (battleState.phase === "moveSelect") {
        confirmMoveSelection(performance.now());
      } else if (battleState.phase === "targetSelect") {
        confirmTargetSelection(performance.now());
      }
    } else {
      renderHud();
    }
  }

  function wireInput() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyC" && !event.repeat) {
        event.preventDefault();
        debug.showMarkers = !debug.showMarkers;
        return;
      }

      if (event.code === "KeyR" && !event.repeat) {
        event.preventDefault();
        resetBattle();
        return;
      }

      if (event.key in directions && ["moveSelect", "targetSelect"].includes(battleState.phase)) {
        event.preventDefault();
        tryMoveCursor(event.key);
        return;
      }

      if ((event.code === "Enter" || event.code === "Space") && !event.repeat) {
        if (battleState.phase === "moveSelect") {
          event.preventDefault();
          confirmMoveSelection(performance.now());
          return;
        }
        if (battleState.phase === "targetSelect") {
          event.preventDefault();
          confirmTargetSelection(performance.now());
          return;
        }
      }

      if (event.code === "Escape" && !event.repeat && ["targetSelect", "actionMenu"].includes(battleState.phase)) {
        event.preventDefault();
        cancelCurrentSelection();
        return;
      }

      if (!event.repeat && ["1", "2", "3", "4"].includes(event.key) && handleActionHotkey(event.key)) {
        event.preventDefault();
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!runtime.isLoaded || !["moveSelect", "targetSelect"].includes(battleState.phase)) {
        return;
      }
      selectTileFromPointer(event.clientX, event.clientY, false);
    });

    canvas.addEventListener("pointerdown", (event) => {
      if (!runtime.isLoaded || !["moveSelect", "targetSelect"].includes(battleState.phase)) {
        return;
      }
      event.preventDefault();
      selectTileFromPointer(event.clientX, event.clientY, true);
    });

    ui.restartButton.addEventListener("click", () => resetBattle());
  }

  function scoreEnemyAction(actor, skill, originX, originY, target, targetCount = 1) {
    const prediction = predictDamage(actor, skill, target);
    const distance = manhattanDistance(originX, originY, target.x, target.y);
    let score = prediction.hpDamage * 32;

    if (prediction.wouldKO) {
      score += 1000;
    }
    if (skill.id === "runeBolt") {
      score += distance * 6;
    }
    if (skill.id === "hexSnap") {
      score += target.statuses.slowTurns > 0 ? 8 : 34;
      score += distance * 4;
    }
    if (skill.id === "pulseBurst") {
      score += targetCount * 84;
    }
    if (distance === 1 && skill.id !== "pulseBurst") {
      score -= 72;
    }

    return score;
  }

  function planEnemyTurn(actor) {
    const reachable = computeReachableTiles(actor);
    const reachableEntries = [...reachable.values()];
    const enemies = getOpponentActors(actor);
    let bestAction = null;

    for (const entry of reachableEntries) {
      for (const skillId of actor.skillIds) {
        if (actor.cooldowns[skillId] > 0) {
          continue;
        }
        const skill = skillCatalog[skillId];

        if (skill.target === "burst") {
          const adjacentTargets = enemies.filter((enemy) => manhattanDistance(entry.x, entry.y, enemy.x, enemy.y) === 1);
          if (!adjacentTargets.length) {
            continue;
          }
          const burstScore = adjacentTargets.reduce((sum, enemy) => sum + scoreEnemyAction(actor, skill, entry.x, entry.y, enemy, adjacentTargets.length), 0);
          if (!bestAction || burstScore > bestAction.score) {
            bestAction = {
              score: burstScore,
              destination: { x: entry.x, y: entry.y },
              skillId: skill.id,
              targets: adjacentTargets.map((enemy) => enemy.id),
            };
          }
          continue;
        }

        for (const key of getTargetTilesForSkill(actor, skill, entry.x, entry.y)) {
          const targetTile = parseTileKey(key);
          const target = getActorAt(targetTile.x, targetTile.y);
          if (!target) {
            continue;
          }
          const score = scoreEnemyAction(actor, skill, entry.x, entry.y, target);
          if (!bestAction || score > bestAction.score) {
            bestAction = {
              score,
              destination: { x: entry.x, y: entry.y },
              skillId: skill.id,
              targets: [target.id],
            };
          }
        }
      }
    }

    if (bestAction) {
      return {
        type: "act",
        destination: bestAction.destination,
        skillId: bestAction.skillId,
        targets: bestAction.targets,
        path: buildPathToTile(reachable, bestAction.destination.x, bestAction.destination.y),
      };
    }

    let bestMove = null;
    for (const entry of reachableEntries) {
      const nearest = Math.min(...enemies.map((enemy) => manhattanDistance(entry.x, entry.y, enemy.x, enemy.y)));
      let score = -Math.abs(nearest - 3) * 24 - nearest * 2;
      if (nearest === 1) {
        score -= 36;
      }
      if (!bestMove || score > bestMove.score) {
        bestMove = {
          score,
          destination: { x: entry.x, y: entry.y },
          path: buildPathToTile(reachable, entry.x, entry.y),
        };
      }
    }

    return {
      type: "move",
      destination: bestMove?.destination || { x: actor.x, y: actor.y },
      skillId: null,
      targets: [],
      path: bestMove?.path || [{ x: actor.x, y: actor.y }],
    };
  }

  function executeEnemyPlan(actor, plan, now) {
    const performAction = () => {
      if (plan.skillId) {
        const skill = skillCatalog[plan.skillId];
        const targets = plan.targets.map((targetId) => getActor(targetId)).filter(Boolean);
        if (skill && targets.length) {
          resolveSkill(actor, skill, skill.target === "burst" ? targets : [targets[0]], performance.now());
          return;
        }
      }
      finishTurn(actor, performance.now(), `${actor.name} waits for a better angle next round.`);
    };

    const path = plan.path || [{ x: actor.x, y: actor.y }];
    if (path.length > 1) {
      battleState.hintText = `${actor.name} repositions before acting.`;
      deferBattleStep(0, () => {}, now);
      startQueuedMove(actor, path, now, () => {
        if (plan.skillId) {
          battleState.hintText = `${actor.name} commits to ${skillCatalog[plan.skillId].name}.`;
        }
        deferBattleStep(280, performAction, performance.now());
        renderHud();
      });
      renderHud();
      return;
    }

    deferBattleStep(240, performAction, now);
    renderHud();
  }

  function updateBattleFlow(now) {
    const activeActor = getActor(battleState.activeActorId);

    if (battleState.phase === "enemyTurn" && activeActor && !areAnyActorsMoving()) {
      if (!battleState.enemyPlan && now >= battleState.enemyThinkAt) {
        battleState.enemyPlan = planEnemyTurn(activeActor);
        executeEnemyPlan(activeActor, battleState.enemyPlan, now);
        return;
      }
    }

    if (battleState.pendingContinuation && !areAnyActorsMoving() && now >= battleState.continuationAt) {
      const continuation = battleState.pendingContinuation;
      battleState.pendingContinuation = null;
      continuation(now);
    }
  }

  function exposeDebugHandle() {
    window.__brickGardenBattle = {
      resetBattle,
      stepFrame(now = performance.now(), delta = 16) {
        for (const actor of runtime.actors) {
          updateActorMovement(actor, now);
          stepCharacterAnimation(actor, delta, now);
        }
        updateEffects(now);
        updateBattleFlow(now);
        updateCamera();
        return this.getState();
      },
      advanceTime(totalMs, steps = 20) {
        const start = performance.now();
        for (let index = 1; index <= steps; index += 1) {
          const now = start + (totalMs * index) / steps;
          this.stepFrame(now, totalMs / steps);
        }
        return this.getState();
      },
      selectMove(x, y) {
        setCursorTile(x, y);
        confirmMoveSelection(performance.now());
        return this.getState();
      },
      selectAction(skillId) {
        const actor = getActor(battleState.activeActorId);
        if (actor && skillCatalog[skillId]) {
          beginSkillSelection(actor, skillCatalog[skillId]);
        }
        return this.getState();
      },
      waitTurn() {
        const actor = getActor(battleState.activeActorId);
        if (actor && battleState.phase === "actionMenu") {
          finishTurn(actor, performance.now(), `${actor.name} waits and holds position.`);
        }
        return this.getState();
      },
      selectTarget(x, y) {
        setCursorTile(x, y);
        confirmTargetSelection(performance.now());
        return this.getState();
      },
      cancelSelection() {
        cancelCurrentSelection();
        return this.getState();
      },
      getState() {
        return {
          phase: battleState.phase,
          round: battleState.round,
          activeActorId: battleState.activeActorId,
          winnerId: battleState.winnerId,
          cursor: { ...battleState.cursor },
          actors: runtime.actors.map((actor) => ({
            id: actor.id,
            unitId: actor.unitId,
            team: actor.team,
            x: actor.x,
            y: actor.y,
            hp: actor.hp,
            shield: actor.shield,
            move: actor.currentMoveAllowance,
            cooldowns: { ...actor.cooldowns },
            statuses: { ...actor.statuses },
          })),
        };
      },
    };
  }

  function loop(now) {
    const delta = runtime.previousFrameTime ? now - runtime.previousFrameTime : 16;
    runtime.previousFrameTime = now;

    if (runtime.isLoaded) {
      for (const actor of runtime.actors) {
        updateActorMovement(actor, now);
        stepCharacterAnimation(actor, delta, now);
      }
      updateEffects(now);
      updateBattleFlow(now);
      updateCamera();
      render(now);
    } else {
      render(now);
    }

    requestAnimationFrame(loop);
  }

  function boot() {
    resizeCanvas();
    wireInput();
    exposeDebugHandle();
    render();

    preloadAssets()
      .then(() => {
        runtime.isLoaded = true;
        resetBattle();
      })
      .catch((error) => {
        console.error(error);
        battleState.hintText = "Asset loading failed. Open the project through a local server if file:// blocks sprites.";
        renderHud();
      });
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    updateCamera(true);
    render();
  });

  requestAnimationFrame(loop);
  boot();
})();

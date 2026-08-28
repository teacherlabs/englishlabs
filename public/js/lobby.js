(() => {
  const canvas = document.getElementById("lobby-canvas");
  const context = canvas.getContext("2d");
  const loading = document.getElementById("lobby-loading");
  const positionLabel = document.getElementById("lobby-position");
  const username = canvas.dataset.user;
  const generatorBase = "https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/";
  const keys = new Set();
  const player = { x: 480, y: 310, direction: "down", frame: 0, moving: false };
  const directionRows = { up: 0, left: 1, down: 2, right: 3 };
  let layers = [];
  let images = [];
  let lastTime = performance.now();
  const movementKeys = new Set(["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  function hashParams(hash) {
    return new URLSearchParams(hash.replace(/^#/, ""));
  }

  function pathsFromHash(params) {
    const bodyType = params.get("sex") === "female" ? "female" : "male";
    const headValue = params.get("head") || "";
    const expressionValue = params.get("expression") || "";
    const legsValue = params.get("legs") || "";
    const headType = headValue.toLowerCase().includes("female") ? "female" : bodyType;
    const expressionName = expressionValue.toLowerCase();
    const expression = expressionName.includes("look_l")
      ? "look_l"
      : expressionName.includes("look_r")
        ? "look_r"
        : expressionName.split("_")[0];
    const supportedExpressions = [
      "anger", "blush", "closed", "closing", "eyeroll", "happy",
      "neutral", "sad", "shame", "shock",
    ];
    const expressionFolder = ["look_l", "look_r"].includes(expression) || supportedExpressions.includes(expression)
      ? expression
      : "neutral";
    const paths = [`body/bodies/${bodyType}/walk.png`];
    if (legsValue.toLowerCase().startsWith("cuffed_pants")) {
      paths.push(`legs/cuffed/${bodyType === "male" ? "male" : "thin"}/walk.png`);
    }
    paths.push(`head/heads/human/${headType}/walk.png`);
    paths.push(`head/faces/${bodyType}/${expressionFolder}/walk.png`);
    return paths;
  }

  function loadImage(path, recolors = {}) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        const mappings = Object.values(recolors);
        if (!mappings.length) {
          resolve(image);
          return;
        }
        const recolored = document.createElement("canvas");
        recolored.width = image.width;
        recolored.height = image.height;
        const recolorContext = recolored.getContext("2d", { willReadFrequently: true });
        if (!recolorContext) {
          resolve(image);
          return;
        }
        recolorContext.drawImage(image, 0, 0);
        const pixels = recolorContext.getImageData(0, 0, image.width, image.height);
        for (let index = 0; index < pixels.data.length; index += 4) {
          if (pixels.data[index + 3] === 0) continue;
          for (const mapping of mappings) {
            const colorIndex = mapping.source.findIndex((color) => {
              const value = color.slice(1);
              return parseInt(value.slice(0, 2), 16) === pixels.data[index]
                && parseInt(value.slice(2, 4), 16) === pixels.data[index + 1]
                && parseInt(value.slice(4, 6), 16) === pixels.data[index + 2];
            });
            if (colorIndex < 0 || !mapping.target[colorIndex]) continue;
            const value = mapping.target[colorIndex].slice(1);
            pixels.data[index] = parseInt(value.slice(0, 2), 16);
            pixels.data[index + 1] = parseInt(value.slice(2, 4), 16);
            pixels.data[index + 2] = parseInt(value.slice(4, 6), 16);
            break;
          }
        }
        recolorContext.putImageData(pixels, 0, 0);
        resolve(recolored);
      };
      image.onerror = reject;
      const assetPath = path.startsWith("spritesheets/") ? path : `spritesheets/${path}`;
      image.src = `${generatorBase}${assetPath}`;
    });
  }

  function drawPlayer() {
    const frame = Math.floor(player.frame);
    const row = directionRows[player.direction];
    images.forEach((image) => {
      context.drawImage(image, frame * 64, row * 64, 64, 64, player.x - 32, player.y - 64, 64, 64);
    });
  }

  function update(delta) {
    const speed = 0.18 * delta;
    player.moving = false;
    if (keys.has("w") || keys.has("ArrowUp")) { player.y -= speed; player.direction = "up"; player.moving = true; }
    if (keys.has("s") || keys.has("ArrowDown")) { player.y += speed; player.direction = "down"; player.moving = true; }
    if (keys.has("a") || keys.has("ArrowLeft")) { player.x -= speed; player.direction = "left"; player.moving = true; }
    if (keys.has("d") || keys.has("ArrowRight")) { player.x += speed; player.direction = "right"; player.moving = true; }
    player.x = Math.max(32, Math.min(canvas.width - 32, player.x));
    player.y = Math.max(130, Math.min(canvas.height - 28, player.y));
    player.frame = player.moving ? (player.frame + delta * 0.012) % 9 : 0;
    positionLabel.textContent = `${Math.round(player.x)}, ${Math.round(player.y)}`;
  }

  function loop(now) {
    const delta = Math.min(50, now - lastTime);
    lastTime = now;
    update(delta);
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (movementKeys.has(key)) event.preventDefault();
    keys.add(key);
  });
  window.addEventListener("keyup", (event) => {
    if (event.target.matches("input, textarea, select")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (movementKeys.has(key)) event.preventDefault();
    keys.delete(key);
  });
  window.addEventListener("blur", () => keys.clear());

  fetch(`/api/profile/${encodeURIComponent(username)}/character`)
    .then((response) => response.ok ? response.json() : { characterHash: "sex=male" })
    .then((character) => {
      const params = hashParams(character.characterHash);
      const savedLayers = Array.isArray(character.layers)
        ? character.layers.filter((layer) => typeof layer.spritePath === "string")
        : [];
      const paths = savedLayers.length
        ? savedLayers.sort((a, b) => a.zPos - b.zPos)
        : pathsFromHash(params).map((spritePath) => ({ spritePath, recolors: {} }));
      layers = paths.map((layer) => ["layer", layer.spritePath]);
      return Promise.all(paths.map((layer) => loadImage(layer.spritePath, layer.recolors)));
    })
    .then((loadedImages) => {
      images = loadedImages;
      loading.hidden = true;
      requestAnimationFrame(loop);
    })
    .catch(() => {
      loading.textContent = "Character assets could not be loaded.";
    });
})();

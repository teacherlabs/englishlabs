(function () {
  const animationLayouts = {
    walk: { columns: 8, rows: 4, frameWidth: 64, frameHeight: 64 },
    slash: { columns: 6, rows: 4, frameWidth: 64, frameHeight: 64 },
    shoot: { columns: 13, rows: 4, frameWidth: 64, frameHeight: 64 },
    spell: { columns: 7, rows: 4, frameWidth: 64, frameHeight: 64 },
    thrust: { columns: 8, rows: 4, frameWidth: 64, frameHeight: 64 },
    idle: { columns: 1, rows: 4, frameWidth: 64, frameHeight: 64 },
    hurt: { columns: 6, rows: 1, frameWidth: 64, frameHeight: 64 },
  };

  const getAnimationLayout = (animation = "walk", payload = {}) => {
    const name = String(animation || "walk").toLowerCase();
    const base = animationLayouts[name] || animationLayouts.walk;
    return {
      ...base,
      frameWidth: Number(payload.frameWidth) || base.frameWidth,
      frameHeight: Number(payload.frameHeight) || base.frameHeight,
      columns: Number(payload.columns) || base.columns,
      rows: Number(payload.rows) || base.rows,
      animation: name,
    };
  };

  const getFrameRect = (animation, frameIndex, directionIndex, payload = {}) => {
    const layout = getAnimationLayout(animation, payload);
    const direction = Math.max(0, Math.min(layout.rows - 1, Number(directionIndex) || 0));
    const frame = Math.max(0, Math.min(layout.columns - 1, Number(frameIndex) || 0));
    return {
      ...layout,
      frame,
      direction,
      sx: frame * layout.frameWidth,
      sy: direction * layout.frameHeight,
    };
  };

  const getLayerSource = (layer) => {
    if (typeof layer === "string") return layer;
    if (!layer || typeof layer !== "object") return "";
    return layer.src || layer.url || layer.image || layer.dataUrl || "";
  };

  const loadImage = (source) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load a character layer."));
      image.src = source;
    });

  const bakeCharacterSpriteSheet = async (payload) => {
    const layers = payload?.layers || payload?.layerImages || payload?.spritesheetLayers;
    if ((!Array.isArray(layers) || layers.length === 0) && (payload?.spritesheetImage || payload?.image)) {
      return payload.spritesheetImage || payload.image;
    }
    if (!Array.isArray(layers) || layers.length === 0) {
      return "";
    }

    const layout = getAnimationLayout(payload.animation || "walk", payload);
    const frameWidth = layout.frameWidth;
    const frameHeight = layout.frameHeight;
    const columns = layout.columns;
    const rows = layout.rows;
    const canvas = document.createElement("canvas");
    canvas.width = Number(payload.width) || columns * frameWidth;
    canvas.height = Number(payload.height) || rows * frameHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create a character sprite canvas.");
    context.imageSmoothingEnabled = false;

    const orderedLayers = layers
      .map((layer, index) => ({ layer, index }))
      .sort((left, right) => {
        const leftOrder = Number(left.layer?.zIndex ?? left.layer?.z ?? left.index);
        const rightOrder = Number(right.layer?.zIndex ?? right.layer?.z ?? right.index);
        return leftOrder - rightOrder;
      });
    const images = await Promise.all(orderedLayers.map(({ layer }) => getLayerSource(layer)).map(loadImage));
    console.debug("Character sprite bake:", {
      selectedItem: payload.selectedItem || payload.item || "selected-character",
      animation: layout.animation,
      sheetDimensions: `${canvas.width}x${canvas.height}`,
      frameSize: `${frameWidth}x${frameHeight}`,
      frameCount: columns,
      directionRows: rows,
      currentFrame: "all",
    });
    images.forEach((image, index) => {
      const sourceIndex = orderedLayers[index].index;
      const sourceWidth = Number(payload.layerWidths?.[sourceIndex]) || image.naturalWidth;
      const sourceHeight = Number(payload.layerHeights?.[sourceIndex]) || image.naturalHeight;
      const sourceColumns = Math.max(1, Math.floor(sourceWidth / frameWidth));
      const sourceRows = Math.max(1, Math.floor(sourceHeight / frameHeight));
      for (let direction = 0; direction < Math.min(rows, sourceRows); direction += 1) {
        for (let frame = 0; frame < Math.min(columns, sourceColumns); frame += 1) {
          const sx = frame * frameWidth;
          const sy = direction * frameHeight;
          context.drawImage(
            image,
            sx,
            sy,
            frameWidth,
            frameHeight,
            sx,
            sy,
            frameWidth,
            frameHeight,
          );
        }
      }
    });
    return canvas.toDataURL("image/png");
  };

  window.characterAnimationLayouts = animationLayouts;
  window.getCharacterAnimationLayout = getAnimationLayout;
  window.getCharacterFrameRect = getFrameRect;
  window.bakeCharacterSpriteSheet = bakeCharacterSpriteSheet;
})();

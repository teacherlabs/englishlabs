(function () {
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
    if (!Array.isArray(layers) || layers.length === 0) {
      return payload?.spritesheetImage || payload?.image || "";
    }

    const frameWidth = Number(payload.frameWidth) || 64;
    const frameHeight = Number(payload.frameHeight) || 64;
    const columns = Number(payload.columns) || 9;
    const rows = Number(payload.rows) || 4;
    const canvas = document.createElement("canvas");
    canvas.width = Number(payload.width) || columns * frameWidth;
    canvas.height = Number(payload.height) || rows * frameHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create a character sprite canvas.");
    context.imageSmoothingEnabled = false;

    const images = await Promise.all(layers.map(getLayerSource).map(loadImage));
    images.forEach((image) => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    });
    return canvas.toDataURL("image/png");
  };

  window.bakeCharacterSpriteSheet = bakeCharacterSpriteSheet;
})();

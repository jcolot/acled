const getAverageRGB = (imgEl) => {
  const blockSize = 5;
  const defaultRGB = { r: 0, g: 0, b: 0 };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext?.('2d');

  if (!context) {
    return defaultRGB;
  }

  const height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
  const width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

  context.drawImage(imgEl, 0, 0);

  let data;
  try {
    data = context.getImageData(0, 0, width, height);
  } catch (error) {
    console.error('Error: ', error);
    return defaultRGB;
  }

  const length = data.data.length;
  const rgb = { r: 0, g: 0, b: 0 };
  let count = 0;

  for (let i = 0; i < length; i += blockSize * 4) {
    count++;
    rgb.r += data.data[i];
    rgb.g += data.data[i + 1];
    rgb.b += data.data[i + 2];
  }

  rgb.r = Math.floor(rgb.r / count);
  rgb.g = Math.floor(rgb.g / count);
  rgb.b = Math.floor(rgb.b / count);

  return rgb;
};

export default getAverageRGB;

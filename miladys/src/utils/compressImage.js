// Every admin photo upload (products, categories, testimonials, home
// sections, about) was reading the raw file straight into a base64 data
// URL with FileReader.readAsDataURL and sending that untouched to the
// backend, which stores it as-is in Postgres. A modern phone photo is
// commonly 3-8MB — none of these images are ever displayed anywhere on
// the site larger than a card or a banner, so that's 10-20x more pixel
// data than anything actually needs, multiplied by every product/category/
// testimonial, multiplied by every visitor. That's what was behind
// /api/categories alone shipping ~28MB for six categories, and (per the
// server logs) large uploads timing out/aborting entirely on slower
// connections.
//
// This resizes the image down to a sane max dimension and re-encodes it
// as JPEG at a reasonable quality before it ever becomes a data URL, so
// everything downstream (DB storage, API payloads, page load) is working
// with something actually sized for the web.
export function compressImageFile(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

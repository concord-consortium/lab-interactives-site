import fs from 'fs';
import path from 'path';

/**
 * Copies files from source to destination based on the provided map.
 * @param {Object} destRootDir - The destination directory where files will be copied.
 * @param {Object} fileMap - An object where keys are source file paths and values are destination file paths.
 */
export function copyFiles(destRootDir, fileMap) {
  for (const [src, dest] of Object.entries(fileMap)) {
    try {
      let finalDest = path.join(destRootDir, dest);

      // If src ends with a '/', recursively copy all files under src
      if (src.endsWith('/')) {
        if (!finalDest.endsWith('/')) {
          throw new Error(`Destination path must end with '/' when source is a directory: ${src}`);
        }

        const copyRecursive = (srcDir, destDir) => {
          const entries = fs.readdirSync(srcDir, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);

            if (entry.isDirectory()) {
              // Ensure the destination directory exists
              if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
              }
              copyRecursive(srcPath, destPath);
            } else {
              // Copy the file
              fs.copyFileSync(srcPath, destPath);
              console.log(`Copied: ${srcPath} -> ${destPath}`);
            }
          }
        };

        copyRecursive(src, finalDest);
        continue;
      }

      // If dest ends with a '/', append the filename from src
      if (finalDest.endsWith('/')) {
        const srcFileName = path.basename(src);
        finalDest = path.join(finalDest, srcFileName);
      }

      // Ensure the destination directory exists
      const destDir = path.dirname(finalDest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy the file
      fs.copyFileSync(src, finalDest);
      console.log(`Copied: ${src} -> ${finalDest}`);
    } catch (error) {
      console.error(`Failed to copy ${src} to ${dest}:`, error.message);
    }
  }
}

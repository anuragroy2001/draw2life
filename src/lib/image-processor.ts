// Image preprocessing utilities using OpenCV.js
// This will be loaded dynamically to avoid SSR issues

export interface ProcessedImage {
  data: string;
  width: number;
  height: number;
  processedAt: Date;
}

export interface ProcessingOptions {
  denoise?: boolean;
  edgeDetection?: boolean;
  threshold?: boolean;
  blur?: boolean;
  sharpen?: boolean;
}

class ImageProcessor {
  private opencv: any = null;
  private isLoaded = false;

  async loadOpenCV(): Promise<void> {
    if (this.isLoaded) return;

    return new Promise((resolve, reject) => {
      // Check if OpenCV is already loaded
      if (typeof (window as any).cv !== 'undefined') {
        this.opencv = (window as any).cv;
        this.isLoaded = true;
        resolve();
        return;
      }

      // Load OpenCV.js dynamically
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      
      script.onload = () => {
        // Wait for OpenCV to be ready
        const checkOpenCV = () => {
          if (typeof (window as any).cv !== 'undefined' && (window as any).cv.Mat) {
            this.opencv = (window as any).cv;
            this.isLoaded = true;
            resolve();
          } else {
            setTimeout(checkOpenCV, 100);
          }
        };
        checkOpenCV();
      };
      
      script.onerror = () => {
        console.warn('Failed to load OpenCV.js, image processing will be disabled');
        this.isLoaded = true; // Mark as loaded to prevent retries
        resolve(); // Don't reject, just continue without OpenCV
      };
      
      document.head.appendChild(script);
    });
  }

  async processImage(
    imageData: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessedImage> {
    await this.loadOpenCV();
    
    // If OpenCV is not available, return the original image
    if (!this.opencv || !this.opencv.Mat) {
      console.warn('OpenCV not available, returning original image');
      const img = new Image();
      img.src = imageData;
      
      return new Promise((resolve) => {
        img.onload = () => {
          resolve({
            data: imageData,
            width: img.width,
            height: img.height,
            processedAt: new Date(),
          });
        };
        img.onerror = () => {
          resolve({
            data: imageData,
            width: 0,
            height: 0,
            processedAt: new Date(),
          });
        };
      });
    }

    try {
      // Convert base64 to OpenCV Mat
      const img = new Image();
      img.src = imageData;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData_ctx = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const src = this.opencv.matFromImageData(imageData_ctx);
      const dst = new this.opencv.Mat();

      // Apply processing steps
      let processed = src.clone();

      // 1. Denoise
      if (options.denoise) {
        this.opencv.fastNlMeansDenoising(processed, dst, 3, 7, 21);
        processed = dst.clone();
      }

      // 2. Convert to grayscale for edge detection
      if (options.edgeDetection || options.threshold) {
        const gray = new this.opencv.Mat();
        this.opencv.cvtColor(processed, gray, this.opencv.COLOR_RGBA2GRAY);
        processed = gray.clone();
      }

      // 3. Edge detection
      if (options.edgeDetection) {
        const edges = new this.opencv.Mat();
        this.opencv.Canny(processed, edges, 50, 150);
        processed = edges.clone();
      }

      // 4. Threshold
      if (options.threshold) {
        const thresh = new this.opencv.Mat();
        this.opencv.threshold(processed, thresh, 127, 255, this.opencv.THRESH_BINARY);
        processed = thresh.clone();
      }

      // 5. Blur
      if (options.blur) {
        const blurred = new this.opencv.Mat();
        const kernel = this.opencv.getStructuringElement(this.opencv.MORPH_RECT, new this.opencv.Size(5, 5));
        this.opencv.morphologyEx(processed, blurred, this.opencv.MORPH_CLOSE, kernel);
        processed = blurred.clone();
      }

      // 6. Sharpen
      if (options.sharpen) {
        const sharpened = new this.opencv.Mat();
        const kernel = this.opencv.matFromArray(3, 3, this.opencv.CV_32FC1, [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0
        ]);
        this.opencv.filter2D(processed, sharpened, -1, kernel);
        processed = sharpened.clone();
      }

      // Convert back to base64
      const processedCanvas = document.createElement('canvas');
      const processedCtx = processedCanvas.getContext('2d');
      if (!processedCtx) throw new Error('Could not get processed canvas context');

      processedCanvas.width = processed.cols;
      processedCanvas.height = processed.rows;
      
      const processedImageData = processedCtx.createImageData(processed.cols, processed.rows);
      processed.copyTo(processedImageData.data);
      processedCtx.putImageData(processedImageData, 0, 0);

      const result: ProcessedImage = {
        data: processedCanvas.toDataURL('image/png'),
        width: processed.cols,
        height: processed.rows,
        processedAt: new Date(),
      };

      // Clean up
      src.delete();
      dst.delete();
      processed.delete();

      return result;

    } catch (error) {
      console.warn('Error processing image with OpenCV, returning original:', error);
      // Return original image if processing fails
      const img = new Image();
      img.src = imageData;
      
      return new Promise((resolve) => {
        img.onload = () => {
          resolve({
            data: imageData,
            width: img.width,
            height: img.height,
            processedAt: new Date(),
          });
        };
        img.onerror = () => {
          resolve({
            data: imageData,
            width: 0,
            height: 0,
            processedAt: new Date(),
          });
        };
      });
    }
  }

  async enhanceForAI(imageData: string): Promise<ProcessedImage> {
    // Optimize image for AI analysis
    return this.processImage(imageData, {
      denoise: true,
      edgeDetection: true,
      threshold: false,
      blur: false,
      sharpen: true,
    });
  }

  async detectShapes(imageData: string): Promise<ProcessedImage> {
    // Process image for shape detection
    return this.processImage(imageData, {
      denoise: true,
      edgeDetection: true,
      threshold: true,
      blur: false,
      sharpen: false,
    });
  }

  // Utility function to resize image for better AI processing
  async resizeForAI(imageData: string, maxSize: number = 1024): Promise<ProcessedImage> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            data: imageData,
            width: img.width,
            height: img.height,
            processedAt: new Date(),
          });
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve({
          data: canvas.toDataURL('image/png'),
          width,
          height,
          processedAt: new Date(),
        });
      };
      img.src = imageData;
    });
  }
}

export const imageProcessor = new ImageProcessor();

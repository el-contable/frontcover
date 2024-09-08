const sharp = require('sharp');
const fetch = require('node-fetch');
const vision = require('@google-cloud/vision');
const base64 = require('base64-js'); // If needed, install this with npm

// Decode your Google Cloud service account key from Base64
const decodedCredentials = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf-8');

// Initialize the Google Vision client with the decoded credentials
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials)
});

exports.handler = async function(event, context) {
  try {
    console.log("Function triggered with event:", event);

    // Parse the incoming request body to extract the base64 image
    const { image } = JSON.parse(event.body);
    console.log("Parsed image data:", image);  // Log base64 image data

    // Ensure the image is provided
    if (!image) {
      console.error("No image data found in request");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image data found' })
      };
    }

    // Decode the base64 image to a buffer
    const buffer = Buffer.from(image, 'base64');

    // Use sharp to detect and convert HEIC to JPEG, and compress JPEG images
    let processedImageBuffer;

    try {
      const metadata = await sharp(buffer).metadata();
      console.log("Image metadata:", metadata);

      if (metadata.format === 'heic') {
        console.log("Converting HEIC image to JPEG...");
        processedImageBuffer = await sharp(buffer)
          .resize({ width: 800 }) // Resize the image to a smaller width
          .jpeg({ quality: 60 }) // Convert to JPEG with compression
          .toBuffer();
      } else if (metadata.format === 'jpeg' || metadata.format === 'png') {
        console.log("Compressing image...");
        processedImageBuffer = await sharp(buffer)
          .resize({ width: 800 }) // Resize the image to a smaller width
          .jpeg({ quality: 60 }) // Compress JPEG with quality setting
          .toBuffer();
      } else {
        console.error("Unsupported image format:", metadata.format);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Unsupported image format' })
        };
      }

      console.log("Image processed successfully");

    } catch (sharpError) {
      console.error("Error processing image with sharp:", sharpError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error processing image' })
      };
    }

    // Google Vision API for text extraction (OCR)
    const [visionResult] = await client.textDetection({
      image: { content: processedImageBuffer.toString('base64') }
    });

    const extractedText = visionResult.textAnnotations[0]?.description || '';
    console.log("Extracted text from image:", extractedText);

    if (!extractedText) {
      console.error("No text detected in the image.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No text detected in the image' })
      };
    }

    // Send the extracted text to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an assistant that extracts book titles and authors from text."
          },
          {
            role: "user",
            content: `Here is the extracted text from a book cover: "${extractedText}". Can you identify the book title and author?`
          }
        ]
      })
    });

    const rawResponseBody = await response.text();  // Log raw response for debugging
    console.log("Raw Response Body from OpenAI:", rawResponseBody);

    // Handle non-JSON responses gracefully
    if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
      let data;
      try {
        data = JSON.parse(rawResponseBody);
        console.log("Parsed JSON Data:", data);
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Error parsing JSON response: ${jsonError.message}` })
        };
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const parsedText = data.choices[0].message.content;
        console.log("Parsed book data:", parsedText);

        return {
          statusCode: 200,
          body: JSON.stringify({ result: parsedText })
        };
      } else {
        console.error("Unexpected response format from OpenAI:", data);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Invalid response from OpenAI" })
        };
      }
    } else {
      console.error("Non-JSON Response from OpenAI:", rawResponseBody);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Received non-JSON response from OpenAI API" })
      };
    }
  } catch (error) {
    console.error("Error occurred during processing:", error.message || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Something went wrong during processing: ${error.message || error}` })
    };
  }
};

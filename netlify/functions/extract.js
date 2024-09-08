const fetch = require('node-fetch'); // Using require since we're using node-fetch@2

exports.handler = async function(event, context) {
  try {
    console.log("Function triggered with event:", event);

    // Log API Key (ensure it's set correctly, remove this for production to avoid exposing it)
    console.log("Using OpenAI API Key:", process.env.OPENAI_API_KEY);

    // Parse the incoming request body to extract the base64 image
    const { image } = JSON.parse(event.body);
    console.log("Parsed image data:", image);  // Log the base64 image data

    // Ensure the image is provided
    if (!image) {
      console.error("No image data found in request");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image data found' })
      };
    }

    // Log the start of the OpenAI API request
    console.log("Sending request to OpenAI...");

    // Make the request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure API key is correctly set
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an assistant that extracts book titles and authors from images of book covers."
          },
          {
            role: "user",
            content: `Here is an image of a book cover in base64 format: "${image}". Please extract the book title and author.`
          }
        ]
      })
    });

    // Log the raw response status and headers to inspect the API response
    console.log("Raw Response Status:", response.status);
    console.log("Raw Response Headers:", response.headers.raw());

    // Check if the response is OK (status code 200)
    if (!response.ok) {
      console.error("OpenAI API returned an error:", response.statusText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `OpenAI API Error: ${response.statusText}` })
      };
    }

    // Log and parse the response body
    const rawResponseBody = await response.text();  // Get raw response text to inspect if it's JSON or not
    console.log("Raw Response Body:", rawResponseBody);

    // Handle non-JSON responses gracefully
    if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
      let data;
      try {
        data = JSON.parse(rawResponseBody);  // Now safely attempt to parse JSON
        console.log("Parsed JSON Data:", data);  // Log the parsed JSON data
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Error parsing JSON response: ${jsonError.message}` })
        };
      }

      // Check if the OpenAI response contains the expected data
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const parsedText = data.choices[0].message.content;
        console.log("Parsed book data:", parsedText);

        // Return the parsed text (book title and author) to the frontend
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
      console.error("Non-JSON Response:", rawResponseBody);  // Handle if response isn't JSON
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Received non-JSON response from OpenAI API" })
      };
    }
  } catch (error) {
    console.error("Error occurred during processing:", error.message || error);  // Log the full error

    // Return a 500 status code with detailed error information
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Something went wrong during processing: ${error.message || error}` })
    };
  }
};

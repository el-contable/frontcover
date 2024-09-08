import fetch from 'node-fetch';

exports.handler = async function(event, context) {
  try {
    // Log the incoming event to verify if the function is being triggered
    console.log("Function triggered with event:", event);

    // Parse the incoming request body to extract the base64 image
    const { image } = JSON.parse(event.body);
    console.log("Parsed image data:", image); // Log the image data

    // Make sure the image is received properly
    if (!image) {
      console.error("No image data found in request");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image data found' })
      };
    }

    // Log the start of the OpenAI API request
    console.log("Sending request to OpenAI...");

    // Make the request to OpenAI API to extract book title and author from the image
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

    // Log the response from OpenAI
    const data = await response.json();
    console.log("Received response from OpenAI:", data);

    // Check if the OpenAI response contains the expected data
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const parsedText = data.choices[0].message.content;
      console.log("Parsed book data:", parsedText); // Log the parsed book info

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
  } catch (error) {
    console.error("Error occurred during processing:", error); // Log the error

    // Return a 500 status code if an error occurred
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong during processing' })
    };
  }
};

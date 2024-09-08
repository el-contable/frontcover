const fetch = require('node-fetch'); // Using require since we're downgrading to node-fetch@2

exports.handler = async function(event, context) {
  try {
    console.log("Function triggered with event:", event);

    const { image } = JSON.parse(event.body);
    console.log("Parsed image data:", image);

    if (!image) {
      console.error("No image data found in request");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image data found' })
      };
    }

    console.log("Sending request to OpenAI...");

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
            content: "You are an assistant that extracts book titles and authors from images of book covers."
          },
          {
            role: "user",
            content: `Here is an image of a book cover in base64 format: "${image}". Please extract the book title and author.`
          }
        ]
      })
    });

    const data = await response.json();
    console.log("Received response from OpenAI:", data);

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
  } catch (error) {
    console.error("Error occurred during processing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong during processing' })
    };
  }
};

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Parse the incoming request body
    const { image } = JSON.parse(event.body);

    console.log("Received image for processing...");

    // Make the request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure the API key is set
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
    console.log("OpenAI response:", data);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const parsedText = data.choices[0].message.content;
      return {
        statusCode: 200,
        body: JSON.stringify({ result: parsedText })
      };
    } else {
      console.error("Unexpected response format:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid response from OpenAI" })
      };
    }
  } catch (error) {
    console.error("Error during processing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong' })
    };
  }
};

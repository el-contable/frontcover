const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Parse the incoming request body to get the base64-encoded image
    const { image } = JSON.parse(event.body);

    // Make the request to OpenAI API for extracting book title and author
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Securely using environment variable for the API key
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

    const data = await response.json(); // Parse response from OpenAI API
    const parsedText = data.choices[0].message.content; // Extract the parsed text (book title and author)

    // Return the parsed text (book title and author) to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ result: parsedText })
    };
  } catch (error) {
    console.error(error); // Log any errors
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong' })
    };
  }
};

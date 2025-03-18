# Alexa-Gemini Bridge

![Alexa+Gemini](https://placehold.co/600x300?text=Alexa+Gemini+Bridge)

A Node.js application that bridges Amazon Alexa and Google's Gemini AI, enabling Alexa to leverage Gemini's powerful generative AI capabilities for answering questions.

## Overview

This project creates a bridge between Amazon Alexa and Google's Gemini AI model. It provides a custom Alexa skill that captures user queries, sends them to the Gemini AI API, and returns the responses back to the user through Alexa.

Key features:
- Child-safe responses (optimized for 7-year-old level understanding)
- Handles various question types through a flexible Alexa interaction model
- Cleans and formats Gemini responses for optimal speech delivery
- Deploys easily with Docker

## How It Works

1. **User Interaction**: The user activates the Alexa skill and asks a question
2. **Alexa Processing**: The Alexa skill captures the user's query and sends it to this server
3. **Gemini AI Query**: The server forwards the query to Gemini API with appropriate instructions
4. **Response Formatting**: The Gemini response is cleaned and formatted for voice delivery
5. **Alexa Response**: The formatted answer is sent back to Alexa, which speaks it to the user

## Technical Architecture

```
User → Alexa Skill → Alexa-Gemini Bridge → Gemini AI API → Response
```

The application is built using:
- Node.js
- Express
- Axios for API calls
- dotenv for environment variable management

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- An Amazon Developer account
- A Google Cloud account with Gemini API access (API key required)

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/alexa-gemini-bridge.git
   cd alexa-gemini-bridge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the server:
   ```bash
   node server.js
   ```

### Docker Deployment

The project includes Dockerfile and fly.toml for easy deployment to platforms like Fly.io:

```bash
fly deploy
```

## Setting Up the Alexa Skill

1. Create a new skill in the Alexa Developer Console
2. Use the sample utterances provided in `sample_utterances.txt`
3. Create a custom intent named `AskGeminiIntent` with a `Query` slot type
4. Configure the endpoint to point to your deployed instance of this server
5. Test and publish your skill

## Sample Utterances

The skill supports natural language patterns like:
- "ask {Query}"
- "tell me {Query}"
- "what is {Query}"
- "how to {Query}"
- "why {Query}"
- And many more (see sample_utterances.txt)

## Security Considerations

- The Gemini API key is stored as an environment variable
- Child-safe prompting is enforced through system instructions
- Response content is cleaned of potentially problematic elements

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- Google for the Gemini AI API
- Amazon for the Alexa Skills Kit
# alexa-gemini-bridge

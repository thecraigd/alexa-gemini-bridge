[![CraigDoesData][logo]][link]

[logo]: https://github.com/thecraigd/Python_SQL/raw/master/img/logo.png
[link]: https://www.craigdoesdata.com/

# Alexa-Gemini Bridge

A Node.js application that bridges Amazon Alexa and Google's Gemini AI, enabling Alexa to leverage Gemini's powerful generative AI capabilities for answering questions.

## Overview

This project creates a bridge between Amazon Alexa and Google's Gemini AI model. It provides a custom Alexa skill that captures user queries, sends them to the Gemini AI API, and returns the responses back to the user through Alexa.

Basically, I couldn't wait for Amazon to launch Alexa Plus, and I wanted to let my 7-year-old ask questions about dinosaurs and so on to Gemini using Alexa. So I built this (with some help from Claude).

Key features:
- Family-friendly responses
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
- A Google Cloud account with Gemini API access (API key required - Google is currently very generous with their API and you can get substantial free usage.)
- A fly.io account

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thecraigd/alexa-gemini-bridge.git
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

Install the fly.io cli:
```bash
brew install flyctl
```

Log into fly.io (create an account first, you can use email, github or google):
```bash
flyctl auth login
```

Deploy the application to fly.io
```bash
flyctl launch --name your-application-name --no-deploy
```

Set your Gemini API key as a secret in Fly.io:
```bash
flyctl secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

```bash
fly deploy
```

## Setting Up the Alexa Skill

### TL:DR Version:
1. Create a new skill in the Alexa Developer Console
2. Use the sample utterances provided in `sample_utterances.txt`
3. Create a custom intent named `AskGeminiIntent` with a `Query` slot type
4. Configure the endpoint to point to your deployed instance of this server
5. Test and publish your skill

### More detailed version:
Go to the Alexa Developer Console: https://developer.amazon.com/alexa/console/ask
Click "Create Skill".
Enter "Gemini Assistant" as the skill name.
Select "Custom" model.
Choose "Provision your own" for hosting.
Click "Create skill".
Choose "Start from scratch" template.
Click "Continue with template".

#### Set up the Invocation Name:
In the left sidebar, click on "Invocation".
Set the Skill Invocation Name to: gemini assistant.
Click "Save Model".

#### Create the Intent:
In the left sidebar, click on "Intents".
Click "Add Intent".
Create a custom intent named: AskGeminiIntent.
Add the following sample utterances (note that each utterance must be added individually to be accepted. You may want to experiment when it's up and running and add more or change some of these - treat these as WIP suggestions for now).

Scroll down to "Slots".
Add a slot named Query with slot type AMAZON.SearchQuery.
Click "Save Model".

#### Set up the Endpoint:
In the left sidebar, click on "Endpoint".
Select "HTTPS" as the Service Endpoint Type.
Under "Default Region", enter your Fly.io URL with the correct path:
https://your-application-name.fly.dev/alexa-gemini

From the dropdown, select "My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority".
Click "Save Endpoints".

#### Build and Test the Model:
Click "Build Model" in the top menu.
Wait for the build to complete (this may take a few minutes).
Once built, click on "Test" in the top menu.
Change the dropdown from "Off" to "Development".
In the Alexa simulator, type or say: "open gemini assistant".
Then try asking a question like: "tell me about the solar system".

#### Connect to Your Amazon Echo Device
Make sure your Echo device is set up and connected to the same Amazon account you used to create the skill.
Since your skill is in "Development" mode, it's automatically available on all your Echo devices linked to your Amazon developer account.
You can invoke it by saying: "Alexa, open gemini assistant".
Then ask your question: "What is the capital of France?".


## Sample Utterances
The skill supports natural language patterns like:
- "please {Query}"
- "ask {Query}"
- "tell me {Query}"
- "what is {Query}"
- "how to {Query}"
- "why {Query}"
- And many more (see sample_utterances.txt)

An important note here is that Alexa Skills require an invocation word, like the ones above. However, if I use e.g. "what is quantum computing?", the query that actually gets sent to Gemini is simply "quantum computng". Gemini is usually smart enough to work out what I want and provide acceptable output, but sometimes this leads to odd behaviour.

In practice, I simply use "please..." before each request, because this feels right to me (I always thank my chatbots) and it means Gemini gets the whole query to process, without the invocation words at the beginning cut off.

## Security Considerations

- The Gemini API key is stored as an environment variable
- Child-safe prompting is enforced through system instructions
- Response content is cleaned of potentially problematic elements

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- [Google for the Gemini AI API](https://aistudio.google.com/)
- [Amazon for the Alexa Skills Kit](https://developer.amazon.com/alexa/console/ask/)
# alexa-gemini-bridge

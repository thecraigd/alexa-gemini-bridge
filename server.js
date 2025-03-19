const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.send('Alexa-Gemini Bridge is running!');
});

// Main endpoint for Alexa Skill
app.post('/alexa-gemini', async (req, res) => {
  try {
    console.log('Received Alexa request:', JSON.stringify(req.body));

    // Near the top of your app.post('/alexa-gemini', ...) handler:
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    console.log('Request type:', req.body.request.type);
    if (req.body.request.intent) {
      console.log('Intent name:', req.body.request.intent.name);
      console.log('Intent slots:', JSON.stringify(req.body.request.intent.slots, null, 2));
    }
    
    // Handle LaunchRequest (when the skill is opened without a specific query)
    if (req.body.request.type === 'LaunchRequest') {
      return res.json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Welcome to Gemini. What would you like to know?'
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: 'You can ask me any question. What would you like to know?'
            }
          },
          shouldEndSession: false
        }
      });
    }
    
    // Handle SessionEndedRequest
    if (req.body.request.type === 'SessionEndedRequest') {
      return res.json({
        version: '1.0',
        response: {
          shouldEndSession: true
        }
      });
    }
    
    // Handle IntentRequest
    if (req.body.request.type === 'IntentRequest') {
      const intent = req.body.request.intent;
      
      // Handle built-in Amazon intents
      if (intent.name === 'AMAZON.StopIntent' || intent.name === 'AMAZON.CancelIntent') {
        return res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'Goodbye!'
            },
            shouldEndSession: true
          }
        });
      }
      
      // Handle help intent
      if (intent.name === 'AMAZON.HelpIntent') {
        return res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'You can ask me any question, and I\'ll use Gemini to find an answer. What would you like to know?'
            },
            reprompt: {
              outputSpeech: {
                type: 'PlainText',
                text: 'What would you like to ask?'
              }
            },
            shouldEndSession: false
          }
        });
      }
      
      // Handle our custom AskGeminiIntent
      if (intent.name === 'AskGeminiIntent') {
        // Extract the user's query from the slot
        let userQuery = '';
        if (intent.slots && intent.slots.Query && intent.slots.Query.value) {
          userQuery = intent.slots.Query.value;
        } else {
          return res.json({
            version: '1.0',
            response: {
              outputSpeech: {
                type: 'PlainText',
                text: 'I didn\'t catch your question. Could you please try again?'
              },
              reprompt: {
                outputSpeech: {
                  type: 'PlainText',
                  text: 'What would you like to ask?'
                }
              },
              shouldEndSession: false
            }
          });
        }
        
        console.log('User query:', userQuery);
        
        // Call Gemini API
        // Combine the system prompt with the user's query
        const promptText = ` Keep your response family-friendly. ${userQuery}`;

        const geminiResponse = await axios.post(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent',
          {
            contents: [{ parts: [{ text: promptText }] }]
            },
          {
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    }
          }
        );
        
        // Extract text response from Gemini
        const geminiText = geminiResponse.data.candidates[0].content.parts[0].text;
        
        // Clean up the response for speech
        // Remove markdown formatting, URLs, code blocks, etc.
        let cleanText = geminiText
          .replace(/```[\s\S]*?```/g, 'I have some code for you, but it would be better to view it on a screen.')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace [text](url) with just text
          .replace(/https?:\/\/\S+/g, 'a link')
          .replace(/\*\*/g, '') // Remove bold formatting
          .replace(/\*/g, '') // Remove italic formatting
          .replace(/#+ /g, '') // Remove heading markers
          .replace(/\n\n/g, ' ') // Replace double newlines with space
          .replace(/\n/g, ' '); // Replace single newlines with space
          
        // Limit the length for Alexa (Alexa has SSML limits)
        if (cleanText.length > 7500) {
          cleanText = cleanText.substring(0, 7500) + "... There is more information, but I'll pause here.";
        }
        
        // Format response for Alexa
        return res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'SSML',
              ssml: `<speak>${cleanText}</speak>`
            },
            card: {
              type: 'Simple',
              title: `Q: ${userQuery}`,
              content: geminiText.substring(0, 8000) // Cards have a character limit
            },
            reprompt: {
              outputSpeech: {
                type: 'PlainText',
                text: 'Is there anything else you want to know?'
              }
            },
            shouldEndSession: false
          }
        });
      }
    }
    
    // Fallback for unhandled requests
    return res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'I\'m not sure how to help with that. Try asking a question instead.'
        },
        reprompt: {
          outputSpeech: {
            type: 'PlainText',
            text: 'What would you like to ask?'
          }
        },
        shouldEndSession: false
      }
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Send a graceful error response to Alexa
    return res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Sorry, I encountered an error while processing your request. Please try again in a moment.'
        },
        shouldEndSession: true
      }
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
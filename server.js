const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.send('Alexa-Gemini Bridge is running!');
});

// In-memory cache for quick responses and to help with debugging
const responseCache = new Map();

// Main endpoint for Alexa Skill
app.post('/alexa-gemini', async (req, res) => {
  try {
    // Generate a unique request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${requestId}] Received Alexa request type: ${req.body.request.type}`);

    // Handle LaunchRequest (when the skill is opened without a specific query)
    if (req.body.request.type === 'LaunchRequest') {
      const response = {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Welcome, big dog. What would you like to know?'
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: 'You can ask me any question. What would you like to know?'
            }
          },
          shouldEndSession: false
        }
      };
      console.log(`[${requestId}] Sending launch response`);
      return res.json(response);
    }
    
    // Handle SessionEndedRequest
    if (req.body.request.type === 'SessionEndedRequest') {
      console.log(`[${requestId}] Ending session`);
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
      console.log(`[${requestId}] Intent name: ${intent.name}`);
      
      // Handle built-in Amazon intents
      if (intent.name === 'AMAZON.StopIntent' || intent.name === 'AMAZON.CancelIntent' || intent.name === 'AMAZON.NoIntent') {
        const response = {
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'Catch ya on the flippy dippy!'
            },
            shouldEndSession: true
          }
        };
        console.log(`[${requestId}] Sending stop/cancel response`);
        return res.json(response);
      }
      
      // Handle help intent
      if (intent.name === 'AMAZON.HelpIntent') {
        const response = {
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
        };
        console.log(`[${requestId}] Sending help response`);
        return res.json(response);
      }

      // Handle test intent for basic connectivity verification
      if (intent.name === 'TestIntent') {
        const response = {
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'This is a test response. If you hear this, basic connectivity is working.'
            },
            shouldEndSession: false
          }
        };
        console.log(`[${requestId}] Sending test response`);
        return res.json(response);
      }
      
      // Handle our custom AskGeminiIntent
      if (intent.name === 'AskGeminiIntent') {
        // Extract the user's query from the slot
        let userQuery = '';
        if (intent.slots && intent.slots.Query && intent.slots.Query.value) {
          userQuery = intent.slots.Query.value;
        } else {
          const response = {
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
          };
          console.log(`[${requestId}] No query provided`);
          return res.json(response);
        }
        
        console.log(`[${requestId}] User query: ${userQuery}`);
        
        // Check cache first (for fast response and debugging help)
        if (responseCache.has(userQuery)) {
          console.log(`[${requestId}] Cache hit for query`);
          return res.json(responseCache.get(userQuery));
        }

        try {
          // Set up a timeout for the Gemini API call
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          // Call Gemini API with timeout handling
          console.log(`[${requestId}] Calling Gemini API`);
          const promptText = `${userQuery}`;
          
          const geminiResponse = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:GenerateContent?key=x-goog-api-key',
            {
              contents: [{ parts: [{ text: promptText }] }]
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY
              },
              signal: controller.signal
            }
          );
          
          // Clear the timeout since we got a response
          clearTimeout(timeoutId);
          
          console.log(`[${requestId}] Received Gemini response`);
          
          // Validate response structure
          if (!geminiResponse.data || 
              !geminiResponse.data.candidates || 
              !geminiResponse.data.candidates[0] || 
              !geminiResponse.data.candidates[0].content || 
              !geminiResponse.data.candidates[0].content.parts || 
              !geminiResponse.data.candidates[0].content.parts[0] || 
              typeof geminiResponse.data.candidates[0].content.parts[0].text !== 'string') {
            throw new Error('Invalid Gemini API response structure');
          }
          
          // Extract and clean text response from Gemini
          let geminiText = geminiResponse.data.candidates[0].content.parts[0].text;
          console.log(`[${requestId}] Raw response length: ${geminiText.length}`);
          
          // Ultra-robust text cleaning for SSML and Alexa
          let cleanText = geminiText
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, 'I have some code examples that would be better viewed on a screen.')
            // Remove inline code
            .replace(/`([^`]+)`/g, '$1')
            // Remove URLs and replace with generic text
            .replace(/https?:\/\/\S+/g, 'a link')
            // Remove markdown links and just keep the text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove formatting characters
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#+ /g, '')
            // Replace bullets with simple text
            .replace(/- /g, ', ')
            // Normalize whitespace
            .replace(/\n\n+/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
          // Plain text simplification - no SSML to avoid any parsing issues
          // Convert all text to plain text speech for maximum compatibility
          
          // Limit length - Alexa has strict limits
          if (cleanText.length > 2500) {
            // Start very conservative for testing, can increase later
            cleanText = cleanText.substring(0, 2500) + ". That's the beginning of what I know. Would you like me to continue?";
          }
          
          console.log(`[${requestId}] Cleaned response length: ${cleanText.length}`);
          
          // Create the simplest possible Alexa response
          const alexaResponse = {
            version: '1.0',
            response: {
              outputSpeech: {
                type: 'PlainText',
                text: cleanText
              },
              card: {
                type: 'Simple',
                title: `Q: ${userQuery}`,
                content: geminiText.substring(0, 7000) // Cards have a character limit
              },
              reprompt: {
                outputSpeech: {
                  type: 'PlainText',
                  text: 'Is there anything else you want to know?'
                }
              },
              shouldEndSession: false
            }
          };
          
          // Cache the response for quick retrieval and debugging
          responseCache.set(userQuery, alexaResponse);
          
          // Keep cache size manageable
          if (responseCache.size > 100) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
          }
          
          console.log(`[${requestId}] Sending successful response`);
          return res.json(alexaResponse);
          
        } catch (error) {
          console.error(`[${requestId}] Error calling Gemini API:`, error.message);
          
          // Provide a specific error message for timeout
          let errorMessage = 'Sorry, I encountered an error processing your question. Please try again.';
          if (error.name === 'AbortError') {
            errorMessage = 'Sorry, it took too long to get your answer. Please try a simpler question or try again later.';
          } else if (error.response) {
            console.error(`[${requestId}] API error details:`, error.response.data);
          }
          
          // Send a very simple error response
          const errorResponse = {
            version: '1.0',
            response: {
              outputSpeech: {
                type: 'PlainText',
                text: errorMessage
              },
              shouldEndSession: false
            }
          };
          
          console.log(`[${requestId}] Sending error response`);
          return res.json(errorResponse);
        }
      }
    }
    
    // Fallback for unhandled requests
    console.log(`[${requestId}] Unhandled request type`);
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
    console.error('Unexpected error processing request:', error);
    
    // Send a very simple error response
    return res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Sorry, something went wrong. Please try again in a moment.'
        },
        shouldEndSession: false
      }
    });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
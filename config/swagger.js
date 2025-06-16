
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notes API',
      version: '1.0.0',
      description: 'A REST API for managing user authentication and notes',
      contact: {
        name: 'API Support',
        email: 'your-email@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.production.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['firstname', 'lastname', 'email', 'password', 'contactNumber'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            firstname: {
              type: 'string',
              description: 'User first name'
            },
            lastname: {
              type: 'string',
              description: 'User last name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            contactNumber: {
              type: 'string',
              description: 'User contact number'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          }
        },
        Note: {
          type: 'object',
          required: ['title', 'body'],
          properties: {
            _id: {
              type: 'string',
              description: 'Note ID'
            },
            title: {
              type: 'string',
              description: 'Note title'
            },
            body: {
              type: 'string',
              description: 'Note body content'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who owns this note'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: false
            },
            message: {
              type: 'string'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
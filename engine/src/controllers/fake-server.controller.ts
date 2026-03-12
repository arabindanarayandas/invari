import { Request, Response } from 'express';

/**
 * Fake Server Controller
 *
 * This controller simulates a real API server for testing purposes.
 * It always returns 200 OK with mock data, allowing the proxy to be tested
 * without needing external API dependencies.
 */
export class FakeServerController {
  /**
   * Handle all requests to the fake server
   * Returns a 200 OK response with mock data based on the HTTP method
   */
  handleRequest(req: Request, res: Response) {
    console.log('\n========== FAKE SERVER REQUEST ==========');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', req.query);

    // Generate mock response based on HTTP method
    let responseData: any;

    switch (req.method.toUpperCase()) {
      case 'GET':
        responseData = {
          success: true,
          message: 'GET request successful',
          data: {
            id: 'mock-id-12345',
            timestamp: new Date().toISOString(),
            path: req.path,
            query: req.query,
          },
        };
        break;

      case 'POST':
        responseData = {
          success: true,
          message: 'POST request successful',
          data: {
            id: 'mock-id-67890',
            created: true,
            timestamp: new Date().toISOString(),
            receivedData: req.body,
          },
        };
        break;

      case 'PUT':
        responseData = {
          success: true,
          message: 'PUT request successful',
          data: {
            id: 'mock-id-12345',
            updated: true,
            timestamp: new Date().toISOString(),
            receivedData: req.body,
          },
        };
        break;

      case 'PATCH':
        responseData = {
          success: true,
          message: 'PATCH request successful',
          data: {
            id: 'mock-id-12345',
            patched: true,
            timestamp: new Date().toISOString(),
            receivedData: req.body,
          },
        };
        break;

      case 'DELETE':
        responseData = {
          success: true,
          message: 'DELETE request successful',
          data: {
            id: 'mock-id-12345',
            deleted: true,
            timestamp: new Date().toISOString(),
          },
        };
        break;

      default:
        responseData = {
          success: true,
          message: `${req.method} request successful`,
          data: {
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        };
    }

    console.log('✓ Returning 200 OK with mock data');
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('========== FAKE SERVER COMPLETE ==========\n');

    // Always return 200 OK
    res.status(200).json(responseData);
  }
}

export const fakeServerController = new FakeServerController();

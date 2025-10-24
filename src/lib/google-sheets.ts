import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export interface ParsedResponse {
  [key: string]: string | number;
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  formId: string;
}

class GoogleSheetsService {
  private auth: JWT | null = null;
  private sheets: any = null;

  constructor() {
    // Don't initialize during build time - will be initialized when needed
  }

  private initialize() {
    if (this.auth && this.sheets) {
      return; // Already initialized
    }

    // Check if credentials are available
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error('Google Sheets credentials not configured');
    }

    // Initialize Google Sheets API with service account
    this.auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Create a user-specific folder (spreadsheet) for storing responses
   */
  async createUserFolder(userId: string, folderName: string): Promise<string> {
    this.initialize();
    
    try {
      // Create a new spreadsheet for the user
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: folderName,
          },
          sheets: [{
            properties: {
              title: 'Responses',
              gridProperties: {
                rowCount: 1000,
                columnCount: 10,
              },
            },
          }],
        },
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId!;
      
      // Add headers to the sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Responses!A1:D1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Timestamp', 'Question', 'Response', 'User ID']],
        },
      });

      // Format headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 4,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          }],
        },
      });

      console.log(`Created user folder: ${folderName} (${spreadsheetId})`);
      return spreadsheetId;
      
    } catch (error) {
      console.error('Error creating user folder:', error);
      throw new Error('Failed to create user folder');
    }
  }

  /**
   * Parse transcribed text to extract structured data
   * Example: "My Name is Keval" -> { Name: "Keval" }
   */
  parseTranscription(text: string): ParsedResponse {
    const result: ParsedResponse = {};
    const lowerText = text.toLowerCase();

    // Common patterns for data extraction
    const patterns = [
      // Name patterns
      { regex: /(?:my name is|i am|name is|i'm)\s+([a-zA-Z\s]+)/i, key: 'Name' },
      { regex: /(?:call me|you can call me)\s+([a-zA-Z\s]+)/i, key: 'Name' },
      
      // Age patterns
      { regex: /(?:i am|age is|i'm)\s+(\d+)\s+(?:years old|years)/i, key: 'Age' },
      { regex: /(?:my age is|age)\s+(\d+)/i, key: 'Age' },
      
      // Email patterns
      { regex: /(?:my email is|email is|email)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, key: 'Email' },
      
      // Phone patterns
      { regex: /(?:my phone is|phone is|phone number is|phone)\s+([\d\s\-\(\)\+]+)/i, key: 'Phone' },
      
      // City patterns
      { regex: /(?:i live in|from|city is|located in)\s+([a-zA-Z\s]+)/i, key: 'City' },
      
      // Gender patterns
      { regex: /(?:i am|gender is|i'm)\s+(male|female|other)/i, key: 'Gender' },
      
      // Address patterns
      { regex: /(?:my address is|address is|live at)\s+([a-zA-Z0-9\s,.-]+)/i, key: 'Address' },
      
      // Company patterns
      { regex: /(?:i work at|work for|company is|employed at)\s+([a-zA-Z0-9\s&.-]+)/i, key: 'Company' },
      
      // Job title patterns
      { regex: /(?:i am a|job title is|position is|work as)\s+([a-zA-Z\s]+)/i, key: 'Job Title' },
    ];

    // Extract data using patterns
    patterns.forEach(pattern => {
      const match = text.match(pattern.regex);
      if (match && match[1]) {
        let value = match[1].trim();
        
        // Clean up the extracted value
        if (pattern.key === 'Age') {
          value = parseInt(value).toString();
        } else if (pattern.key === 'Phone') {
          // Clean phone number
          value = value.replace(/\D/g, '');
        } else if (pattern.key === 'Gender') {
          value = value.toLowerCase();
        }
        
        result[pattern.key] = value;
      }
    });

    // If no structured data found, store the raw text
    if (Object.keys(result).length === 0) {
      result['Response'] = text;
    }

    return result;
  }

  /**
   * Create or get a Google Sheet for a form
   */
  async createOrGetSheet(formId: string, formTitle: string): Promise<SheetConfig> {
    this.initialize();
    try {
      // Check if sheet already exists for this form
      const existingSheet = await this.findSheetByFormId(formId);
      if (existingSheet) {
        return existingSheet;
      }

      // Create new spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `${formTitle} - Responses`,
          },
          sheets: [{
            properties: {
              title: 'Form Responses',
            },
          }],
        },
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId!;
      
      // Store form-sheet mapping in a metadata sheet
      await this.storeFormSheetMapping(formId, spreadsheetId, formTitle);

      return {
        spreadsheetId,
        sheetName: 'Form Responses',
        formId,
      };
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      throw new Error('Failed to create Google Sheet');
    }
  }

  /**
   * Find existing sheet for a form
   */
  private async findSheetByFormId(formId: string): Promise<SheetConfig | null> {
    try {
      // This would typically query a database or metadata sheet
      // For now, we'll implement a simple approach
      return null;
    } catch (error) {
      console.error('Error finding sheet:', error);
      return null;
    }
  }

  /**
   * Store form-sheet mapping
   */
  private async storeFormSheetMapping(formId: string, spreadsheetId: string, formTitle: string) {
    // This would store the mapping in a database or metadata sheet
    // For now, we'll implement a simple approach
    console.log(`Form ${formId} mapped to sheet ${spreadsheetId}`);
  }

  /**
   * Add response data to Google Sheet
   */
  async addResponse(sheetConfig: SheetConfig, parsedData: ParsedResponse, timestamp: string = new Date().toISOString()) {
    this.initialize();
    try {
      const { spreadsheetId, sheetName } = sheetConfig;

      // Get current sheet data to determine headers
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`, // Get first row (headers)
      });

      const existingHeaders = response.data.values?.[0] || [];
      const newHeaders = Object.keys(parsedData);
      
      // Find new headers that don't exist yet
      const headersToAdd = newHeaders.filter(header => !existingHeaders.includes(header));
      
      // Add new headers if any
      if (headersToAdd.length > 0) {
        const allHeaders = [...existingHeaders, ...headersToAdd];
        
        // Update headers row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!1:1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [allHeaders],
          },
        });
      }

      // Prepare row data
      const allHeaders = [...existingHeaders, ...headersToAdd];
      const rowData = allHeaders.map(header => parsedData[header] || '');
      
      // Add timestamp if not already present
      if (!allHeaders.includes('Timestamp')) {
        rowData.unshift(timestamp);
        allHeaders.unshift('Timestamp');
        
        // Update headers to include timestamp
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!1:1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [allHeaders],
          },
        });
      } else {
        const timestampIndex = allHeaders.indexOf('Timestamp');
        rowData[timestampIndex] = timestamp;
      }

      // Append new row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });

      console.log('Response added to Google Sheet successfully');
      return { success: true, spreadsheetId };
    } catch (error) {
      console.error('Error adding response to Google Sheet:', error);
      throw new Error('Failed to add response to Google Sheet');
    }
  }

  /**
   * Add a response to a user-specific folder
   */
  async addResponseToUserFolder(folderId: string, transcription: string, questionText: string, userId: string): Promise<void> {
    this.initialize();
    
    try {
      const parsedData = this.parseTranscription(transcription);
      const timestamp = new Date().toISOString();
      
      // First, try to find an existing responses sheet in the folder
      let responsesSheetId = folderId;
      
      try {
        // Check if the folder ID is actually a spreadsheet ID
        const spreadsheet = await this.sheets.spreadsheets.get({
          spreadsheetId: folderId,
        });
        
        // If it's a spreadsheet, use it directly
        responsesSheetId = folderId;
        
        // Check if it has a "Responses" sheet, if not create one
        const hasResponsesSheet = spreadsheet.data.sheets?.some(
          sheet => sheet.properties?.title === 'Responses'
        );
        
        if (!hasResponsesSheet) {
          // Add a new "Responses" sheet
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: folderId,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: 'Responses',
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 10,
                    },
                  },
                },
              }],
            },
          });
          
          // Add headers
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: folderId,
            range: 'Responses!A1:D1',
            valueInputOption: 'RAW',
            requestBody: {
              values: [['Timestamp', 'Question', 'Response', 'User ID']],
            },
          });
        }
        
      } catch (error) {
        // If folderId is not a spreadsheet, create a new one in the folder
        // For now, we'll create a new spreadsheet with the folder name
        const newSpreadsheet = await this.sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: `VoiceForm Responses - ${new Date().toLocaleDateString()}`,
            },
            sheets: [{
              properties: {
                title: 'Responses',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10,
                },
              },
            }],
          },
        });
        
        responsesSheetId = newSpreadsheet.data.spreadsheetId!;
        
        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: responsesSheetId,
          range: 'Responses!A1:D1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['Timestamp', 'Question', 'Response', 'User ID']],
          },
        });
      }
      
      // Prepare the row data with standard format
      const rowData = [
        timestamp,
        questionText,
        transcription,
        userId,
        ...Object.values(parsedData)
      ];
      
      // Add the response to the responses sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: responsesSheetId,
        range: 'Responses!A:Z',
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });
      
      console.log(`Added response to user folder: ${responsesSheetId}`);
      
    } catch (error) {
      console.error('Error adding response to user folder:', error);
      throw new Error('Failed to add response to user folder');
    }
  }

  /**
   * Delete a spreadsheet (for cleanup)
   */
  async deleteSpreadsheet(spreadsheetId: string): Promise<void> {
    this.initialize();
    
    try {
      // Note: Google Sheets API doesn't have a direct delete method
      // In a real implementation, you'd use Google Drive API to move to trash
      // For now, we'll just log that we would delete it
      console.log(`Would delete spreadsheet: ${spreadsheetId}`);
      
      // In production, you'd use:
      // const drive = google.drive({ version: 'v3', auth: this.auth });
      // await drive.files.delete({ fileId: spreadsheetId });
      
    } catch (error) {
      console.error('Error deleting spreadsheet:', error);
      throw new Error('Failed to delete spreadsheet');
    }
  }

  /**
   * Get sheet URL for sharing
   */
  getSheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }
}

export const googleSheetsService = new GoogleSheetsService();

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
   * Get sheet URL for sharing
   */
  getSheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }
}

export const googleSheetsService = new GoogleSheetsService();

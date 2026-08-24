import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BSEClientService {
  private readonly logger = new Logger(BSEClientService.name);

  // Environment Variables
  private readonly env = process.env.BSE_ENV || 'uat';
  private readonly memberCode = process.env.BSE_MEMBER_CODE;
  private readonly password = process.env.BSE_PASSWORD;
  private readonly apiKey = process.env.BSE_API_KEY;

  private get baseUrl() {
    return this.env === 'production' 
      ? 'https://bsestarmf.in' 
      : 'https://bsestarmfdemo.bseindia.com';
  }

  private get registrationEndpoint() {
    return `${this.baseUrl}/StarMFCommonAPI/ClientMaster/Registration`;
  }

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the 75-field pipe-separated parameter string for BSE Client Registration
   */
  private generateParamString(clientCode: string, user: any): string {
    const fn = user.profile?.fullName?.split(' ')[0] || 'FirstName';
    const ln = user.profile?.fullName?.split(' ')[1] || 'LastName';
    const dob = '01/01/1990'; // Should format user.userProfile.dateOfBirth
    const pan = 'ABCDE1234F'; // Dummy for now; actual user PAN should be fetched
    const mobile = user.mobile.replace('+91', '');
    const email = user.profile?.email || 'test@test.com';

    // The giant 75+ pipe separated fields. 
    // Format according to the BSE StAR MF API documentation (Page 73-86)
    // We populate only the mandatory fields and leave the rest blank.
    const fields = [
      clientCode, // Client Code
      fn,         // First Name
      '',         // Middle Name
      ln,         // Last Name
      '01',       // Tax Status (01 = Individual)
      'M',        // Gender
      dob,        // DOB
      '01',       // Occupation Code (01 = Business)
      'SI',       // Holding Nature (SI = Single)
      '', '', '', '', '', '', '', '', '', '', '', '', // Nominee empty fields
      'N',        // Primary Holder PAN Exempt?
      '', '', '',
      pan,        // Primary Holder PAN
      '', '', '', '', '', '', '',
      'P',        // Client Type (P = Physical)
      '', '', '', '', '', '', '',
      'SB',       // Account Type 1
      '11415',    // Account No 1
      '',
      'HDFC0000001', // IFSC Code 1
      'Y',        // Default Bank Flag
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 
      `${fn} ${ln}`, // Cheque Name
      '01',       // Div pay mode (01 = Cheque)
      'ADD 1', 'ADD 2', 'ADD 3', 'MUMBAI', 'MA', '400001', 'INDIA', 
      '22721233', '', '', '', email, 'P', // Contact details
      '', '', '', '', '', '', '', '', '', '', '', mobile, 
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 
      'K', // KYC Type
      '', '', '', '', '', '', '', '', '', '', '', 'N', '', 'P', '', '', 'SE', 'SE'
    ];

    // Some fields might be trimmed or padded, we just join them.
    return fields.join('|') + '|';
  }

  /**
   * Registers a user in the BSE System to obtain a Unique Client Code (UCC)
   */
  async registerClient(userId: string) {
    if (!this.apiKey || !this.memberCode || !this.password) {
      this.logger.error('Missing BSE Credentials in environment variables for Registration.');
      throw new HttpException('BSE Configuration Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 1. Fetch User Data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, bseClient: true }
    });

    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    // 2. Generate Client Code (UCC)
    // BSE Client Code can be max 10 chars. E.g., 'TA' + last 8 of UUID
    let clientCode = user.bseClient?.clientCode;
    if (!clientCode) {
      clientCode = `TA${userId.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
    }

    // 3. Build Param String
    const paramString = this.generateParamString(clientCode, user);

    const payload = {
      UserId: this.memberCode + "01", // Usually MemberCode + 01 for UserID in JSON API
      MemberCode: this.memberCode,
      Password: this.password,
      RegnType: user.bseClient ? "MOD" : "NEW",
      Param: paramString,
      Filler1: "",
      Filler2: ""
    };

    try {
      this.logger.log(`Registering Client with BSE. UCC: ${clientCode}`);
      
      const response = await axios.post(this.registrationEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'APIKEY': this.apiKey,
        },
      });

      const data = response.data;
      
      // Expected Response: {"Status": "0", "Remarks": "CLIENT REGISTERED SUCCESSFULLY", ...}
      if (data.Status === "0") {
        this.logger.log(`Client ${clientCode} registered successfully in BSE.`);
        
        // Save to DB
        await this.prisma.bseClient.upsert({
          where: { userId: user.id },
          update: { status: 'REGISTERED', bseRemarks: data.Remarks },
          create: {
            userId: user.id,
            clientCode: clientCode,
            status: 'REGISTERED',
            bseRemarks: data.Remarks
          }
        });

        return { success: true, clientCode, remarks: data.Remarks };
      } else {
        this.logger.error(`BSE Client Registration Failed: ${data.Remarks}`);
        
        await this.prisma.bseClient.upsert({
          where: { userId: user.id },
          update: { status: 'FAILED', bseRemarks: data.Remarks },
          create: {
            userId: user.id,
            clientCode: clientCode,
            status: 'FAILED',
            bseRemarks: data.Remarks
          }
        });

        throw new HttpException(`BSE Registration Failed: ${data.Remarks}`, HttpStatus.BAD_REQUEST);
      }

    } catch (error: any) {
      this.logger.error(`BSE Client Registration Request Failed: ${error.message}`);
      throw new HttpException('BSE Client Registration Request Failed', HttpStatus.BAD_GATEWAY);
    }
  }
}

import { CrewComponent, CrewComponentGroup, CrewComponentRequest } from '../types/api.types';

export interface RegistrationData {
  email: string;
  password: string;
  bypassCaptcha?: boolean;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  bypassCaptcha?: boolean;
}

export class TestDataGenerator {
  // ============ BASIC DATA GENERATORS ============
  
  static generateEmail(): string {
    const timestamp = Date.now();
    return `test.user.${timestamp}@example.com`;
  }

  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static generateCompanyName(): string {
    const companies = ['PT KARYA INTI HUTAMA', 'PT MAJU BERSAMA', 'PT SUKSES JAYA'];
    const timestamp = Date.now();
    return `${companies[Math.floor(Math.random() * companies.length)]} ${timestamp}`;
  }

  static generateStakeholderName(): string {
    const stakeholders = ['PT STAKEHOLDER A', 'PT STAKEHOLDER B', 'PT STAKEHOLDER C'];
    const timestamp = Date.now();
    return `${stakeholders[Math.floor(Math.random() * stakeholders.length)]} ${timestamp}`;
  }

  static generatePassword(): string {
    return 'TestPassword123!';
  }

  static generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // ============ EXTENDED DATA GENERATORS ============

  static generateRandomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateRandomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  static generateRandomDate(startDate: Date, endDate: Date): Date {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const randomTime = Math.random() * (endTime - startTime) + startTime;
    return new Date(randomTime);
  }

  static getRandomArrayElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  static getRandomSubset<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  // Di dalam class TestDataGenerator
static generateUser(): {
  name: string;
  email: string;
  password: string;
  companyId: string | null;
} {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    email: `test.user.${timestamp}@example.com`,
    password: 'TestPassword123!',
    companyId: null, // Atau generateUUID() kalau mau pakai ID dummy
  };
}


  // ============ SECURE DATA GENERATORS ============

  /**
   * Generate a secure password that meets common requirements
   */
  static generateSecurePassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // Fill the rest with random characters
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = password.length; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * Generate a valid phone number
   */
  static generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const firstPart = Math.floor(Math.random() * 900) + 100;
    const secondPart = Math.floor(Math.random() * 9000) + 1000;
    
    return `+1${areaCode}${firstPart}${secondPart}`;
  }

  /**
   * Generate Indonesian phone number
   */
  static generateIndonesianPhoneNumber(): string {
    const prefixes = ['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'];
    const prefix = this.getRandomArrayElement(prefixes);
    const suffix = Math.floor(Math.random() * 90000000) + 10000000;
    
    return `${prefix}${suffix}`;
  }

  /**
   * Generate Indonesian address
   */
  static generateIndonesianAddress(): string {
    const streets = ['Jl. Sudirman', 'Jl. Thamrin', 'Jl. Gatot Subroto', 'Jl. Kuningan', 'Jl. Rasuna Said'];
    const cities = ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang'];
    const provinces = ['DKI Jakarta', 'Jawa Timur', 'Jawa Barat', 'Sumatera Utara', 'Jawa Tengah'];
    
    const street = this.getRandomArrayElement(streets);
    const number = this.generateRandomNumber(1, 999);
    const city = this.getRandomArrayElement(cities);
    const province = this.getRandomArrayElement(provinces);
    const postalCode = this.generateRandomNumber(10000, 99999);
    
    return `${street} No. ${number}, ${city}, ${province} ${postalCode}`;
  }

  // ============ AUTHENTICATION DATA GENERATORS ============

  /**
   * Generate random registration data
   */
  static generateRegistrationData(): RegistrationData {
    const randomId = this.generateRandomString(8);
    const timestamp = Date.now();
    
    return {
      email: `test${randomId}${timestamp}@testmail.com`,
      password: this.generateSecurePassword(),
      bypassCaptcha: true,
      firstName: `Test${randomId}`,
      lastName: `User${timestamp}`,
      phoneNumber: this.generatePhoneNumber()
    };
  }

  /**
   * Generate user data for different roles
   */
  static generateUserByRole(role: string): RegistrationData {
    const baseData = this.generateRegistrationData();
    
    switch (role) {
      case 'admin':
        return {
          ...baseData,
          email: `admin${this.generateRandomString(6)}@admin.com`,
          firstName: 'Admin',
          lastName: 'User'
        };
      case 'crew':
        return {
          ...baseData,
          email: `crew${this.generateRandomString(6)}@crew.com`,
          firstName: 'Crew',
          lastName: 'Member'
        };
      case 'client':
        return {
          ...baseData,
          email: `client${this.generateRandomString(6)}@client.com`,
          firstName: 'Client',
          lastName: 'User'
        };
      default:
        return baseData;
    }
  }

  /**
   * Create invalid credentials for testing
   */
  static createInvalidCredentials() {
    const validEmail = `test${this.generateRandomString(6)}@test.com`;
    const validPassword = this.generateSecurePassword();
    
    return {
      wrongEmail: {
        email: `wrong${this.generateRandomString(6)}@test.com`,
        password: validPassword,
        bypassCaptcha: true
      },
      wrongPassword: {
        email: validEmail,
        password: 'wrongpassword123',
        bypassCaptcha: true
      },
      malformedEmail: {
        email: 'invalid.email.format',
        password: validPassword,
        bypassCaptcha: true
      },
      emptyCredentials: {
        email: '',
        password: '',
        bypassCaptcha: true
      },
      nullCredentials: {
        email: null,
        password: null,
        bypassCaptcha: true
      }
    };
  }

  /**
   * Generate boundary test data
   */
  static generateBoundaryTestData() {
    return {
      maxLengthEmail: `${'a'.repeat(240)}@test.com`,
      maxLengthPassword: 'A1!' + 'a'.repeat(125),
      minLengthPassword: 'A1!a1234',
      specialCharEmail: `test+special.email@sub-domain.test-mail.com`,
      unicodePassword: 'Tëst123!@#',
      emptySpaceEmail: ' test@test.com ',
      emptySpacePassword: ' password123 ',
      maxLengthName: 'A'.repeat(255),
      minLengthName: 'A',
      unicodeName: 'José María',
      maxLengthPhone: '+1234567890123456789',
      minLengthPhone: '+1234567890'
    };
  }

  // ============ CREW COMPONENT DATA GENERATORS ============

  /**
   * Create sample crew component
   */
  static createSampleComponent(overrides: Partial<CrewComponent> = {}): CrewComponent {
    return {
      tempId: this.generateUUID(),
      componentName: 'Sample Component',
      fieldType: 'Single Text',
      items: null,
      defaultValue: null,
      ...overrides
    };
  }

  /**
   * Create sample crew component group
   */
  static createSampleGroup(overrides: Partial<CrewComponentGroup> = {}): CrewComponentGroup {
    return {
      tempId: this.generateUUID(),
      name: 'Sample Group',
      type: 'Single Data',
      category: 'Profile',
      components: [
        this.createSampleComponent({
          componentName: 'First Name',
          fieldType: 'Single Text'
        }),
        this.createSampleComponent({
          componentName: 'Last Name',
          fieldType: 'Single Text'
        })
      ],
      ...overrides
    };
  }

  /**
   * Create sample select component with options
   */
  static createSelectComponent(name: string, options: Array<{label: string, value: string}>, defaultValue?: string): CrewComponent {
    return {
      tempId: this.generateUUID(),
      componentName: name,
      fieldType: 'Single Select',
      items: options,
      defaultValue: defaultValue || options[0]?.value || null
    };
  }

  /**
   * Create emergency contact group template
   */
  static createEmergencyContactGroup(): CrewComponentGroup {
    return {
      tempId: this.generateUUID(),
      name: 'Emergency Contact',
      type: 'Single Data',
      category: 'Profile',
      components: [
        this.createSampleComponent({
          componentName: 'Full Name',
          fieldType: 'Single Text'
        }),
        this.createSelectComponent('Relation', [
          { label: 'Mother', value: 'MOTHER' },
          { label: 'Father', value: 'FATHER' },
          { label: 'Spouse', value: 'SPOUSE' },
          { label: 'Sibling', value: 'SIBLING' }
        ], 'MOTHER'),
        this.createSampleComponent({
          componentName: 'Phone Number',
          fieldType: 'Phone Number'
        }),
        this.createSampleComponent({
          componentName: 'Email',
          fieldType: 'Email'
        })
      ]
    };
  }

  /**
   * Create basic information group template
   */
  static createBasicInfoGroup(): CrewComponentGroup {
    return {
      tempId: this.generateUUID(),
      name: 'Basic Information',
      type: 'Single Data',
      category: 'Profile',
      components: [
        this.createSampleComponent({
          componentName: 'First Name',
          fieldType: 'Single Text'
        }),
        this.createSampleComponent({
          componentName: 'Middle Name',
          fieldType: 'Single Text'
        }),
        this.createSampleComponent({
          componentName: 'Last Name',
          fieldType: 'Single Text'
        }),
        this.createSampleComponent({
          componentName: 'Date of Birth',
          fieldType: 'Date'
        }),
        this.createSelectComponent('Gender', [
          { label: 'Male', value: 'MALE' },
          { label: 'Female', value: 'FEMALE' }
        ])
      ]
    };
  }

  /**
   * Create certificate group template
   */
  static createCertificateGroup(): CrewComponentGroup {
    return {
      tempId: this.generateUUID(),
      name: 'Professional Certificate',
      type: 'Multiple Data',
      category: 'Certificate',
      components: [
        this.createSampleComponent({
          componentName: 'Certificate Name',
          fieldType: 'Single Text'
        }),
        this.createSampleComponent({
          componentName: 'Issuing Authority',
          fieldType: 'Single Text'
        }),
        this.createSampleComponent({
          componentName: 'Issue Date',
          fieldType: 'Date'
        }),
        this.createSampleComponent({
          componentName: 'Expiry Date',
          fieldType: 'Date'
        }),
        this.createSampleComponent({
          componentName: 'Certificate Number',
          fieldType: 'Single Text'
        })
      ]
    };
  }

  /**
   * Create complete request for testing
   */
  static createCompleteRequest(): CrewComponentRequest {
    return {
      groups: {
        add: [
          this.createBasicInfoGroup(),
          this.createEmergencyContactGroup(),
          this.createCertificateGroup()
        ]
      }
    };
  }

  /**
   * Create update request template
   */
  static createUpdateRequest(groupId: string, componentId: string): CrewComponentRequest {
    return {
      groups: {
        update: [
          {
            id: groupId,
            name: 'Updated Group Name',
            type: 'Multiple Data',
            category: 'Document'
          }
        ]
      },
      components: {
        update: [
          {
            id: componentId,
            groupId: groupId,
            componentName: 'Updated Component Name',
            fieldType: 'Email',
            items: null,
            defaultValue: null
          }
        ]
      }
    };
  }

  /**
   * Create delete request template
   */
  static createDeleteRequest(groupIds: string[], componentIds: string[]): CrewComponentRequest {
    return {
      groups: {
        delete: groupIds
      },
      components: {
        delete: componentIds
      }
    };
  }

  // ============ BUSINESS DATA GENERATORS ============

  /**
   * Generate employee data
   */
  static generateEmployeeData() {
    const firstNames = ['Ahmad', 'Budi', 'Siti', 'Dewi', 'Rudi', 'Ani', 'Joko', 'Sri'];
    const lastNames = ['Wijaya', 'Santoso', 'Rahayu', 'Kurniawan', 'Susanto', 'Pratiwi', 'Setiawan', 'Lestari'];
    const departments = ['IT', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales'];
    const positions = ['Manager', 'Supervisor', 'Staff', 'Analyst', 'Coordinator', 'Specialist'];
    
    return {
      employeeId: `EMP${this.generateRandomNumber(1000, 9999)}`,
      firstName: this.getRandomArrayElement(firstNames),
      lastName: this.getRandomArrayElement(lastNames),
      email: this.generateEmail(),
      phoneNumber: this.generateIndonesianPhoneNumber(),
      department: this.getRandomArrayElement(departments),
      position: this.getRandomArrayElement(positions),
      joinDate: this.generateRandomDate(new Date('2020-01-01'), new Date()),
      salary: this.generateRandomNumber(5000000, 20000000),
      address: this.generateIndonesianAddress()
    };
  }

  /**
   * Generate project data
   */
  static generateProjectData() {
    const projectTypes = ['Development', 'Infrastructure', 'Maintenance', 'Research', 'Implementation'];
    const statuses = ['Planning', 'In Progress', 'Testing', 'Completed', 'On Hold'];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    
    return {
      projectId: `PROJ${this.generateRandomNumber(1000, 9999)}`,
      projectName: `Project ${this.generateRandomString(8)}`,
      projectType: this.getRandomArrayElement(projectTypes),
      status: this.getRandomArrayElement(statuses),
      priority: this.getRandomArrayElement(priorities),
      startDate: this.generateRandomDate(new Date('2024-01-01'), new Date()),
      endDate: this.generateRandomDate(new Date(), new Date('2025-12-31')),
      budget: this.generateRandomNumber(100000000, 1000000000),
      description: `This is a test project for ${this.getRandomArrayElement(projectTypes).toLowerCase()} purposes.`,
      clientName: this.generateCompanyName(),
      projectManager: `Manager ${this.generateRandomString(6)}`
    };
  }

  /**
   * Generate document data
   */
  static generateDocumentData() {
    const documentTypes = ['Contract', 'Invoice', 'Report', 'Proposal', 'Certificate', 'License'];
    const statuses = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Expired'];
    
    return {
      documentId: `DOC${this.generateRandomNumber(1000, 9999)}`,
      documentName: `${this.getRandomArrayElement(documentTypes)} ${this.generateRandomString(6)}`,
      documentType: this.getRandomArrayElement(documentTypes),
      status: this.getRandomArrayElement(statuses),
      createdDate: this.generateRandomDate(new Date('2024-01-01'), new Date()),
      expiryDate: this.generateRandomDate(new Date(), new Date('2025-12-31')),
      version: `v${this.generateRandomNumber(1, 5)}.${this.generateRandomNumber(0, 9)}`,
      author: `Author ${this.generateRandomString(6)}`,
      description: `Test document for ${this.getRandomArrayElement(documentTypes).toLowerCase()} purposes.`,
      fileSize: this.generateRandomNumber(1024, 10485760), // 1KB to 10MB
      fileName: `document_${this.generateRandomString(8)}.pdf`
    };
  }

  /**
   * Generate vessel data
   */
  static generateVesselData() {
    const vesselTypes = ['Container Ship', 'Bulk Carrier', 'Tanker', 'Cargo Ship', 'Passenger Ship'];
    const flags = ['Indonesia', 'Singapore', 'Panama', 'Liberia', 'Marshall Islands'];
    const statuses = ['Active', 'Inactive', 'Maintenance', 'Dry Dock', 'Sailing'];
    
    return {
      vesselId: `VSL${this.generateRandomNumber(1000, 9999)}`,
      vesselName: `MV ${this.generateRandomString(10).toUpperCase()}`,
      vesselType: this.getRandomArrayElement(vesselTypes),
      flag: this.getRandomArrayElement(flags),
      status: this.getRandomArrayElement(statuses),
      imoNumber: `IMO${this.generateRandomNumber(1000000, 9999999)}`,
      callSign: this.generateRandomString(6).toUpperCase(),
      grossTonnage: this.generateRandomNumber(1000, 100000),
      netTonnage: this.generateRandomNumber(500, 50000),
      length: this.generateRandomNumber(50, 400),
      width: this.generateRandomNumber(10, 60),
      builtYear: this.generateRandomNumber(1980, 2024),
      owner: this.generateCompanyName(),
      homePort: this.getRandomArrayElement(['Jakarta', 'Surabaya', 'Singapore', 'Hong Kong'])
    };
  }

  /**
   * Generate financial data
   */
  static generateFinancialData() {
    const currencies = ['IDR', 'USD', 'EUR', 'SGD', 'JPY'];
    const transactionTypes = ['Income', 'Expense', 'Transfer', 'Investment', 'Loan'];
    const categories = ['Operations', 'Marketing', 'HR', 'IT', 'Maintenance', 'Travel'];
    
    return {
      transactionId: `TXN${this.generateRandomNumber(100000, 999999)}`,
      amount: this.generateRandomNumber(100000, 100000000),
      currency: this.getRandomArrayElement(currencies),
      transactionType: this.getRandomArrayElement(transactionTypes),
      category: this.getRandomArrayElement(categories),
      description: `Test transaction for ${this.getRandomArrayElement(categories).toLowerCase()}`,
      transactionDate: this.generateRandomDate(new Date('2024-01-01'), new Date()),
      reference: `REF${this.generateRandomString(8)}`,
      accountFrom: `ACC${this.generateRandomNumber(1000000, 9999999)}`,
      accountTo: `ACC${this.generateRandomNumber(1000000, 9999999)}`,
      approvedBy: `Approver ${this.generateRandomString(6)}`,
      status: this.getRandomArrayElement(['Pending', 'Approved', 'Rejected', 'Processed'])
    };
  }

  /**
   * Generate bulk test data
   */
  static generateBulkData<T>(generator: () => T, count: number): T[] {
    return Array.from({ length: count }, () => generator());
  }

  /**
   * Generate test data with specific patterns
   */
  static generateDataWithPattern(pattern: string, count: number): string[] {
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      let data = pattern;
      data = data.replace(/\{random\}/g, this.generateRandomString(6));
      data = data.replace(/\{number\}/g, this.generateRandomNumber(1000, 9999).toString());
      data = data.replace(/\{timestamp\}/g, Date.now().toString());
      data = data.replace(/\{uuid\}/g, this.generateUUID());
      results.push(data);
    }
    return results;
  }
}
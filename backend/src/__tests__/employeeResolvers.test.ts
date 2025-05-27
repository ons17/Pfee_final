// test/employeeResolvers.test.ts
import bcrypt from 'bcrypt';
import { employeeResolvers } from '../graphql/resolvers/employeeResolvers';
import sql from 'mssql';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

jest.mock('mssql');
jest.mock('nodemailer');

const mockPool = {
  request: jest.fn().mockReturnThis(),
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
};

const mockContext = {
  pool: mockPool as unknown as sql.ConnectionPool,
};

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Employee Resolvers', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------
  // Query: employees
  // -----------------------------------------
  it('should fetch all employees', async () => {
    const mockData = {
      recordset: [
        {
          idEmployee: '1',
          nom_employee: 'Alice',
          email_employee: 'alice@example.com',
          password_employee: 'pwd',
          idEquipe: 'T1',
          role: 'user',
          disabledUntil: null,
          equipeName: 'Equipe A',
        },
      ],
    };

    mockPool.query.mockResolvedValue(mockData);

    const result = await employeeResolvers.Query.employees({}, {}, mockContext);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0].nomEmployee).toBe('Alice');
    expect(result.message).toBe('Employees fetched successfully');
  });

  // -----------------------------------------
  // Query: employee by ID
  // -----------------------------------------
  it('should fetch a specific employee by ID', async () => {
    const mockData = {
      recordset: [
        {
          idEmployee: '2',
          nom_employee: 'Bob',
          email_employee: 'bob@example.com',
          password_employee: 'pwd',
          idEquipe: 'T2',
          role: 'admin',
          disabledUntil: null,
          equipeName: 'Equipe B',
        },
      ],
    };

    mockPool.query.mockResolvedValue(mockData);

    const result = await employeeResolvers.Query.employee({}, { id: '2' }, mockContext);

    expect(result.nomEmployee).toBe('Bob');
    expect(result.emailEmployee).toBe('bob@example.com');
  });

  it('should throw an error if employee is not found', async () => {
    mockPool.query.mockResolvedValue({ recordset: [] });

    await expect(employeeResolvers.Query.employee({}, { id: 'nonexistent-id' }, mockContext))
      .rejects.toThrow('Employee not found');
  });

  // -----------------------------------------
  // Mutation: createEmployee
  // -----------------------------------------
  it('should create a new employee', async () => {
    const input = {
      nomEmployee: 'Charlie',
      emailEmployee: 'charlie@example.com',
      passwordEmployee: 'secret',
      idEquipe: 'T3',
      role: 'user',
      disabledUntil: undefined,
    };

    mockPool.query
      .mockResolvedValueOnce({ recordset: [] }) // Check if email exists
      .mockResolvedValueOnce({}); // Insert employee

    const result = await employeeResolvers.Mutation.createEmployee({}, input, mockContext);

    expect(result.nomEmployee).toBe('Charlie');
    expect(result.emailEmployee).toBe('charlie@example.com');
    expect(result.idEquipe).toBe('T3');
    expect(result.role).toBe('user');
    expect(result.passwordEmployee).not.toBe('secret');
    expect(typeof result.passwordEmployee).toBe('string');
    expect(await bcrypt.compare('secret', result.passwordEmployee)).toBe(true);
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------
  // Mutation: updateEmployee
  // -----------------------------------------
  it('should update an employee', async () => {
    const args = {
      id: '3',
      nomEmployee: 'Charlie Updated',
      emailEmployee: 'charlie-updated@example.com',
      passwordEmployee: 'newpassword',
      idEquipe: 'T4',
      role: 'admin',
      disabledUntil: '2025-12-31',
    };

    const mockData = {
      recordset: [
        {
          idEmployee: '3',
          nom_employee: 'Charlie Updated',
          email_employee: 'charlie-updated@example.com',
          role: 'admin',
          idEquipe: 'T4',
          disabledUntil: '2025-12-31T00:00:00.000Z',
          equipeName: null,
        },
      ],
    };

    mockPool.query
      .mockResolvedValueOnce({}) // Update employee
      .mockResolvedValueOnce(mockData); // Fetch updated employee

    const result = await employeeResolvers.Mutation.updateEmployee({}, args, mockContext);

    expect(result).toEqual({
      idEmployee: '3',
      nomEmployee: 'Charlie Updated',
      emailEmployee: 'charlie-updated@example.com',
      role: 'admin',
      idEquipe: 'T4',
      disabledUntil: '2025-12-31T00:00:00.000Z',
      equipe: null,
    });
  });

  // -----------------------------------------
  // Mutation: deleteEmployee
  // -----------------------------------------
  it('should delete an employee', async () => {
    const id = '4';

    mockPool.query.mockResolvedValue({});

    const result = await employeeResolvers.Mutation.deleteEmployee({}, { id }, mockContext);

    expect(result.message).toBe('Employee deleted successfully');
  });

  // -----------------------------------------
  // Mutation: sendEmailToEmployee
  // -----------------------------------------
  it('should send email to employee', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({ response: '250 OK: Message delivered' });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const args = {
      id: '123',
      subject: 'Welcome!',
      message: 'Hello and welcome!',
    };

    mockPool.query.mockResolvedValueOnce({
      recordset: [
        {
          email_employee: 'someone@example.com',
          password_employee: 'password123',
        },
      ],
    });

    const result = await employeeResolvers.Mutation.sendEmailToEmployee({}, args, mockContext);

    expect(result).toBe(true);
  });
});

// Additional tests for employeeResolvers.test.ts

describe('Additional Employee Resolvers Tests', () => {
  // -----------------------------------------
  // Query: searchEmployees
  // -----------------------------------------
  it('should search employees with filters', async () => {
    const filters = { nomEmployee: 'Alice', emailEmployee: 'alice@example.com' };
    const mockData = {
      recordset: [
        {
          idEmployee: '1',
          nom_employee: 'Alice',
          email_employee: 'alice@example.com',
          password_employee: 'pwd',
          idEquipe: 'T1',
          role: 'user',
          disabledUntil: null,
          equipeName: 'Equipe A',
        },
      ],
    };

    mockPool.query.mockResolvedValue(mockData);

    const result = await employeeResolvers.Query.searchEmployees({}, { filters }, mockContext);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0].nomEmployee).toBe('Alice');
    expect(result.employees[0].emailEmployee).toBe('alice@example.com');
    expect(result.message).toBe('Employees searched successfully');
  });

  it('should return all employees if no filters are provided', async () => {
    const mockData = {
      recordset: [
        { idEmployee: '1', nom_employee: 'Alice', email_employee: 'alice@example.com', role: 'user', idEquipe: 'T1', disabledUntil: null, equipeName: 'Equipe A' },
        { idEmployee: '2', nom_employee: 'Bob', email_employee: 'bob@example.com', role: 'admin', idEquipe: 'T2', disabledUntil: null, equipeName: 'Equipe B' },
      ],
    };

    mockPool.query.mockResolvedValue(mockData);

    const result = await employeeResolvers.Query.searchEmployees({}, { filters: {} }, mockContext);

    expect(result.employees).toHaveLength(2);
    expect(result.message).toBe('Employees searched successfully');
  });

  // -----------------------------------------
  // Mutation: loginEmployee
  // -----------------------------------------
  it('should log in an employee with valid credentials', async () => {
    const args = { email: 'alice@example.com', password: 'password123' };
    const mockData = {
      recordset: [
        {
          idEmployee: '1',
          nom_employee: 'Alice',
          email_employee: 'alice@example.com',
          password_employee: await bcrypt.hash('password123', 10),
          role: 'user',
        },
      ],
    };

    mockPool.query.mockResolvedValue(mockData);

    const result = await employeeResolvers.Mutation.loginEmployee({}, args, mockContext);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Login successful');
    expect(result.token).toBeDefined();
    expect(result.employee.nomEmployee).toBe('Alice');
  });

  it('should fail to log in an employee with invalid credentials', async () => {
    const args = { email: 'alice@example.com', password: 'wrongpassword' };
    const mockData = {
      recordset: [
        {
          idEmployee: '1',
          nom_employee: 'Alice',
          email_employee: 'alice@example.com',
          password_employee: await bcrypt.hash('password123', 10),
          role: 'user',
        },
      ],
    };

    mockPool.query.mockResolvedValue(mockData);

    await expect(employeeResolvers.Mutation.loginEmployee({}, args, mockContext)).rejects.toThrow('Invalid email or password');
  });

  // -----------------------------------------
  // Mutation: resetPassword
  // -----------------------------------------
  it('should reset an employee password with a valid token', async () => {
    const token = jwt.sign({ email: 'alice@example.com' }, 'your_secret_key', { expiresIn: '1h' });
    const args = { token, newPassword: 'newpassword123' };

    mockPool.query.mockResolvedValue({});

    const result = await employeeResolvers.Mutation.resetPassword({}, args, mockContext);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Password reset successfully');
  });

  it('should fail to reset password with an invalid token', async () => {
    const args = { token: 'invalidtoken', newPassword: 'newpassword123' };

    await expect(employeeResolvers.Mutation.resetPassword({}, args, mockContext)).rejects.toThrow('Invalid or expired token');
  });
});

// We recommend installing an extension to run jest tests.

// test/employeeResolvers.test.ts
import { employeeResolvers } from '../graphql/resolvers/employeeResolvers';
import sql from 'mssql';
import nodemailer from 'nodemailer';

jest.mock('mssql');
jest.mock('nodemailer');

describe('Employee Resolvers', () => {
  const mockPool = {
    request: jest.fn().mockReturnThis(),
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };

  const mockContext = {
    pool: mockPool as unknown as sql.ConnectionPool,
  };

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

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'onssbenamara3@gmail.com',
      to: 'someone@example.com',
      subject: args.subject,
      html: expect.stringContaining(args.message),
    });

    expect(result).toBe(true);
  });
});

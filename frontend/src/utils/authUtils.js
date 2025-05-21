export const isAdmin = () => {
  const admin = JSON.parse(localStorage.getItem('administrateur'));
  // Check specifically for admin role
  return admin?.role?.toLowerCase() === 'admin';
};

export const isSupervisor = () => {
  const admin = JSON.parse(localStorage.getItem('administrateur'));
  // Check specifically for supervisor role
  return admin?.role?.toLowerCase() === 'supervisor';
};

export const isEmployee = () => {
  const employee = JSON.parse(localStorage.getItem('employee'));
  return !!employee;
};

export const validatePassword = (enteredPassword) => {
  const storedPassword = localStorage.getItem('password');
  
  if (!enteredPassword || !storedPassword) {
    return false;
  }

  // Trim both passwords to remove any extra spaces
  const trimmedEnteredPassword = enteredPassword.trim();
  const trimmedStoredPassword = storedPassword.trim();

  // Compare trimmed passwords
  return trimmedEnteredPassword === trimmedStoredPassword;
};
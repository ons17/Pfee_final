export const isAdmin = () => {
  const admin = JSON.parse(localStorage.getItem('administrateur') || 'null');
  return !!admin;
};

export const isEmployee = () => {
  const employee = JSON.parse(localStorage.getItem('employee'));
  console.log('Employee Object:', employee); // Debug log
  return !!employee; // Return true if the employee object exists
};

export const validatePassword = (password) => {
  // Add your password validation logic here
  return true;
};
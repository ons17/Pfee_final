export const isAdmin = () => {
  const admin = JSON.parse(localStorage.getItem('administrateur'));
  return admin?.role?.toLowerCase() === 'admin'; // Ensure the role is "admin"
};

export const isEmployee = () => {
  const employee = JSON.parse(localStorage.getItem('employee'));
  console.log('Employee Object:', employee); // Debug log
  return !!employee; // Return true if the employee object exists
};

export const validatePassword = (enteredPassword) => {
  const storedPassword = localStorage.getItem('password');
  console.log('Comparing Entered Password:', enteredPassword, 'with Stored Password:', storedPassword); // Debug log

  // Trim both passwords to remove any extra spaces
  const trimmedEnteredPassword = enteredPassword.trim();
  const trimmedStoredPassword = storedPassword.trim();

  console.log('Trimmed Entered Password:', trimmedEnteredPassword, 'Trimmed Stored Password:', trimmedStoredPassword); // Debug log

  return trimmedEnteredPassword === trimmedStoredPassword; // Compare trimmed passwords
};
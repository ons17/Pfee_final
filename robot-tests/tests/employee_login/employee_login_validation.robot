*** Settings ***
Documentation     Form Validation Test Suite for Employee Login
Resource          ../../keywords/employee_login_keywords.resource
Test Setup        employee_login_keywords.Open Browser To Employee Login Page
Test Teardown     Close Browser

*** Test Cases ***
Empty Form Validation
    [Documentation]    Tests form validation with empty fields
    [Tags]    validation    negative
    Submit Employee Login Form
    employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.

Empty Email Field
    [Documentation]    Tests validation with empty email
    [Tags]    validation    email    required
    Fill Text    ${PASSWORD_INPUT}    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.

Empty Password Field
    [Documentation]    Tests validation with empty password
    [Tags]    validation    password    required
    Fill Text    ${EMAIL_INPUT}    ${EMPLOYEE_EMAIL}
    Submit Employee Login Form
    employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.

Invalid Email Format
    [Documentation]    Tests email format validation
    [Tags]    validation    email    format
    Input Employee Credentials    invalid-email    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.

Special Characters In Email
    [Documentation]    Tests email validation with special characters
    [Tags]    validation    email    security
    Input Employee Credentials    test@#$%^&*()    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.
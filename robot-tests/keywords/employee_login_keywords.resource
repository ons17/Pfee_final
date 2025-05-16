*** Settings ***
Documentation     Keywords for Employee Login Testing
Resource          ../resources/common.resource
Resource          ../resources/locators/employee_login_locators.resource
Resource          ../resources/employee_common.resource

*** Variables ***
${EMPLOYEE_EMAIL}         zeidimohamedtaher13@gmail.com
${EMPLOYEE_PASSWORD}      mohamed
${EMPLOYEE_LOGIN_URL}     ${SITE_URL}/EmployeeLogin

*** Keywords ***
Open Browser To Employee Login Page
    [Documentation]    Opens browser and navigates to employee login page
    New Browser       browser=${BROWSER}    headless=${HEADLESS}
    New Context      viewport={'width': 1920, 'height': 1080}
    New Page         ${EMPLOYEE_LOGIN_URL}
    Wait For Elements State    ${LOGO_IMG}    visible    timeout=${TIMEOUT}

Input Employee Credentials
    [Documentation]    Enters employee login credentials
    [Arguments]    ${email}    ${password}
    Fill Text    input#email1    ${email}
    Fill Text    input#password1    ${password}

Submit Employee Login Form
    [Documentation]    Submits the employee login form
    Click    button:has-text("Sign In")
    
Verify Employee Login Success
    [Documentation]    Verifies successful login redirect and storage
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}
    Get Url    ==    ${SITE_URL}/app
    ${token}=    Evaluate JavaScript    localStorage.getItem('token')
    Should Not Be Empty    ${token}
    ${employee}=    Evaluate JavaScript    localStorage.getItem('employee')
    Should Not Be Empty    ${employee}

Clear Employee Login Form
    [Documentation]    Clears all form fields
    Fill Text    ${EMAIL_INPUT}    ${EMPTY}
    Fill Text    ${PASSWORD_INPUT}    ${EMPTY}
    Uncheck Checkbox    ${REMEMBER_ME_CB}

Wait For Employee Error Message
    [Documentation]    Waits for error message to appear
    [Arguments]    ${expected_message}
    Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}

Verify Local Storage Contains Employee Data
    [Documentation]    Verifies employee data in localStorage
    ${token}=    Get Local Storage Item    token
    Should Not Be Empty    ${token}
    ${employee}=    Get Local Storage Item    employee
    Should Not Be Empty    ${employee}

Toggle Employee Remember Me
    [Documentation]    Toggles and verifies remember me checkbox
    Check Checkbox    ${REMEMBER_ME_CB}
    Get Property    ${REMEMBER_ME_CB}    checked    ==    ${TRUE}

Verify Employee Page Elements
    [Documentation]    Verifies all UI elements are present
    Wait For Elements State    img[alt="Logo"]        visible    timeout=${TIMEOUT}
    Wait For Elements State    input#email1     visible    timeout=${TIMEOUT}
    Wait For Elements State    input#password1  visible    timeout=${TIMEOUT}
    Wait For Elements State    \#rememberme1  visible    timeout=${TIMEOUT}
    Wait For Elements State    "Sign In"   visible    timeout=${TIMEOUT}

Check Remember Me Checkbox State
    [Arguments]    ${expected}
    ${checked}=    Get Attribute    selector=#rememberme1    attribute=checked
    ${checked_str}=    Convert To String    ${checked}
    ${checked_str}=    Evaluate    str(${checked_str}).lower()
    Should Be Equal    ${checked}    ${expected}
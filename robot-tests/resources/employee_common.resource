*** Settings ***
Documentation     Common resources for employee functionality
Library           Browser
Library           BuiltIn
Resource          common.resource

*** Variables ***
# Browser configuration
${BROWSER}              chromium
${HEADLESS}             ${False}
${SITE_URL}             http://localhost:5173
${EMPLOYEE_EMAIL}       zeidimohamedtaher13@gmail.com
${EMPLOYEE_PASSWORD}    mohamed
${TIMEOUT}             6s

# UI Elements
${LOGO_IMG}            img[alt="Logo"]
${EMAIL_INPUT}         input#email1
${PASSWORD_INPUT}      input#password1
${REMEMBER_ME_CB}      input#rememberme1
${SIGNIN_BUTTON}       button.w-full
${ERROR_MESSAGE}       .text-red-500
${DASHBOARD_TEXT}      text="Dashboard"

${EMPLOYEE_NAME}         Mohamed Taher
${EMPLOYEE_ROLE}         Employee

*** Keywords ***
Open Browser To Employee Login Page
    [Documentation]    Opens browser and navigates to the employee login page
    New Browser    browser=${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': 1920, 'height': 1080}
    New Page    ${SITE_URL}/EmployeeLogin
    Wait For Elements State    ${LOGO_IMG}    visible    timeout=${TIMEOUT}

Employee Login With Credentials
    [Documentation]    Performs employee login with given credentials
    [Arguments]    ${email}    ${password}
    Fill Text    ${EMAIL_INPUT}    ${email}
    Fill Text    ${PASSWORD_INPUT}    ${password}
    Click    ${SIGNIN_BUTTON}

Verify Employee Remember Me Functionality
    [Documentation]    Tests the employee remember me checkbox functionality
    Check Checkbox    ${REMEMBER_ME_CB}
    Get Checkbox State    ${REMEMBER_ME_CB}    ==    checked
    Uncheck Checkbox    ${REMEMBER_ME_CB}
    Get Checkbox State    ${REMEMBER_ME_CB}    ==    unchecked

Verify Employee Login Page Elements
    [Documentation]    Verifies all essential elements are present on employee login page
    Wait For Elements State    ${LOGO_IMG}    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${EMAIL_INPUT}    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${PASSWORD_INPUT}    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${REMEMBER_ME_CB}    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${SIGNIN_BUTTON}    visible    timeout=${TIMEOUT}

Clear Employee Login Fields
    [Documentation]    Clears employee login form fields
    Fill Text    ${EMAIL_INPUT}    ${EMPTY}
    Fill Text    ${PASSWORD_INPUT}    ${EMPTY}

Verify Employee Local Storage Item
    [Documentation]    Verifies an item in localStorage for employee
    [Arguments]    ${key}    ${expected_value}
    ${value}=    Evaluate JavaScript    localStorage.getItem('${key}')
    Should Be Equal    ${value}    ${expected_value}

Clear Employee Browser Storage
    [Documentation]    Clears browser storage for employee session
    LocalStorage Clear
    SessionStorage Clear

Wait For Employee Error Message
    [Documentation]    Waits for employee login error message
    [Arguments]    ${expected_message}
    Wait For Elements State    ${ERROR_MESSAGE}    visible    timeout=${TIMEOUT}
    Get Text    ${ERROR_MESSAGE}    ==    ${expected_message}

Verify Employee Dashboard Access
    [Documentation]    Verifies successful navigation to employee dashboard
    Wait For Elements State    ${DASHBOARD_TEXT}    visible    timeout=${TIMEOUT}
    Get Url    ==    ${SITE_URL}/app

Get Employee Form State
    [Documentation]    Gets the state of employee login form fields
    ${email_value}=    Get Property    ${EMAIL_INPUT}    value
    ${password_value}=    Get Property    ${PASSWORD_INPUT}    value
    ${remember_checked}=    Get Checkbox State    ${REMEMBER_ME_CB}
    RETURN    ${email_value}    ${password_value}    ${remember_checked}

Execute Employee JavaScript
    [Documentation]    Executes JavaScript in employee login context
    [Arguments]    ${script}
    ${result}=    Evaluate JavaScript    null    ${script}
    RETURN    ${result}

Get Local Storage Item
    [Documentation]    Gets an item from localStorage
    [Arguments]    ${key}
    ${value}=    Evaluate JavaScript    localStorage.getItem('${key}')
    RETURN    ${value}

Get Focused Element
    [Documentation]    Gets the currently focused element
    ${focused}=    Evaluate JavaScript    document.activeElement
    RETURN    ${focused}

Verify Employee Dashboard Elements
    [Documentation]    Verifies all essential elements are present on employee dashboard
    Wait For Elements State    h1:has-text("Time Tracking")    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${PROJECT_DROPDOWN}    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${TASK_DROPDOWN}    visible    timeout=${TIMEOUT}
    Wait For Elements State    ${TIMER_BUTTON}    visible    timeout=${TIMEOUT}
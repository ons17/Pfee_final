*** Settings ***
Documentation     Common resources for time tracking tests
Library           Browser
Library           BuiltIn

*** Variables ***
# Browser configuration
${BROWSER}              chromium
${HEADLESS}             ${False}
${SITE_URL}             http://localhost:5173
${TIMEOUT}              10s

# Test data
${EMPLOYEE_EMAIL}       zeidimohamedtaher13@gmail.com
${EMPLOYEE_PASSWORD}    mohamed


${VALID_EMAIL}          onssbenamara3@gmail.com
${VALID_PASSWORD}       ons123
# UI Elements
${LOGO_IMG}            img[alt="Logo"]    # Logo image selector

*** Keywords ***
Open Browser To Login Page
    [Documentation]    Opens browser and navigates to the login page
    New Browser    browser=${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': 1920, 'height': 1080}
    New Page    ${SITE_URL}
    Wait For Elements State    ${LOGO_IMG}    visible    timeout=${TIMEOUT}

Login With Credentials
    [Documentation]    Performs login with given credentials
    [Arguments]    ${email}    ${password}
    Fill Text    input#email1    ${email}
    Fill Text    .p-password input    ${password}
    Click    "Sign In"

Login With Invalid CSRF
    [Documentation]    Attempts login with invalid CSRF token
    Fill Text    input#email1    ${VALID_EMAIL}
    Fill Text    .p-password input    ${VALID_PASSWORD}
    ${headers}=    Create Dictionary    X-CSRF-TOKEN=invalid
    Try To Click    button[aria-label="Sign In"]

Verify Remember Me Functionality
    [Documentation]    Tests the remember me checkbox functionality
    ${checkbox}=    Set Variable    css=#rememberme1 input[type="checkbox"]
    Check Checkbox    ${checkbox}
    Get Checkbox State    ${checkbox}    ==    checked
    Uncheck Checkbox    ${checkbox}
    Get Checkbox State    ${checkbox}    ==    unchecked

Verify Login Page Elements
    [Documentation]    Verifies all essential elements are present on login page
    Wait For Elements State    img[alt="Logo"]    visible    timeout=${TIMEOUT}
    Wait For Elements State    input#email1    visible    timeout=${TIMEOUT}
    Wait For Elements State    .p-password input    visible    timeout=${TIMEOUT}
    Wait For Elements State    \#google-signin-button    visible    timeout=${TIMEOUT}
    Wait For Elements State    \#rememberme1    visible    timeout=${TIMEOUT}
    Wait For Elements State    text="Sign In"    visible    timeout=${TIMEOUT}

Clear Login Fields
    [Documentation]    Clears email and password input fields
    Fill Text    input#email1    ${EMPTY}
    Fill Text    .p-password input    ${EMPTY}

Verify Local Storage Item
    [Documentation]    Verifies an item in localStorage
    [Arguments]    ${key}    ${expected_value}
    ${value}=    Evaluate JavaScript    localStorage.getItem('${key}')
    Should Be Equal    ${value}    ${expected_value}

Evaluate Local Storage
    [Documentation]    Evaluates localStorage in the browser
    [Arguments]    ${key}
    ${value}=    Evaluate JavaScript    null    localStorage.getItem('${key}')
    RETURN    ${value}

Clear Local Storage
    [Documentation]    Clears browser localStorage
    Evaluate JavaScript    null    localStorage.clear()

Clear Browser Storage
    [Documentation]    Clears browser localStorage and sessionStorage
    LocalStorage Clear
    SessionStorage Clear

Get Active Element Properties
    [Documentation]    Gets properties of the currently active element
    ${active}=    Get Active Element
    RETURN    ${active}

Wait For Error Message
    [Documentation]    Waits for error message to appear
    [Arguments]    ${expected_message}
    Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}
    Get Text    .text-red-500    ==    ${expected_message}

Execute JavaScript
    [Documentation]    Executes JavaScript in the browser context
    [Arguments]    ${script}
    ${result}=    Evaluate JavaScript    null    ${script}
    RETURN    ${result}

Get Focused Element
    [Documentation]    Gets the currently focused element
    [Arguments]    ${expected_selector}
    ${focused}=    Get Page State    state=focused
    Should Be Equal    ${focused}    ${expected_selector}

Wait For Toast Message
    [Documentation]    Waits for a toast message with specific severity
    [Arguments]    ${severity}    ${timeout}=${TIMEOUT}
    Wait For Elements State    .p-toast-message-${severity}    visible    timeout=${timeout}

Wait For Loading To Complete
    [Documentation]    Waits for loading indicator to disappear
    Wait For Elements State    .loading-overlay    detached    timeout=${TIMEOUT}

Verify Page Title
    [Documentation]    Verifies the page title
    [Arguments]    ${expected_title}
    Get Text    h1    ==    ${expected_title}

Get Current Timer Value
    [Documentation]    Gets the current timer display value
    ${timer_text}=    Get Text    [data-test="timer-display"]
    RETURN    ${timer_text}

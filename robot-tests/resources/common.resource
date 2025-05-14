*** Settings ***
Documentation     Common resources and keywords for testing
Library           Browser
Library           BuiltIn

*** Variables ***
# Browser configuration
${BROWSER}              chromium    # Changed to chromium for better stability
${HEADLESS}             ${False}   # Run tests in headless mode if True
${SITE_URL}             http://localhost:5173
${VALID_EMAIL}          onssbenamara3@gmail.com
${VALID_PASSWORD}       ons123
${TIMEOUT}             20s          # Increased timeout for better reliability

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

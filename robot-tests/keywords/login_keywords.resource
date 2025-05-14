*** Settings ***
Documentation     Keywords for login page testing
Resource          ../resources/common.resource
Resource          ../resources/locators/login_locators.resource

*** Keywords ***
Verify Page Elements
    [Documentation]    Verifies that all essential page elements are present
    Wait For Elements State    ${LOGO_IMG}        visible    timeout=${TIMEOUT}
    Wait For Elements State    ${EMAIL_INPUT}     visible    timeout=${TIMEOUT}
    Wait For Elements State    ${PASSWORD_INPUT}  visible    timeout=${TIMEOUT}
    Wait For Elements State    ${OR_TEXT}         visible    timeout=${TIMEOUT}
    Wait For Elements State    ${GOOGLE_BUTTON}   visible    timeout=${TIMEOUT}
    Wait For Elements State    ${REMEMBER_ME_CB}  visible    timeout=${TIMEOUT}

Input Login Credentials
    [Documentation]    Inputs email and password into login form
    [Arguments]    ${email}    ${password}
    Fill Text    ${EMAIL_INPUT}     ${email}
    Fill Text    ${PASSWORD_INPUT}  ${password}

Submit Login Form
    [Documentation]    Submits the login form
    Click    button.w-full

Toggle Password Visibility
    [Documentation]    Toggles password visibility and verifies the state
    Click    ${PASSWORD_TOGGLE}
    Get Attribute    ${PASSWORD_INPUT}    type    ==    text
    Click    ${PASSWORD_TOGGLE}
    Get Attribute    ${PASSWORD_INPUT}    type    ==    password

Toggle Remember Me
    [Documentation]    Toggles remember me checkbox and verifies its state
    Check Checkbox    ${REMEMBER_ME_CB}
    Get Checkbox State    ${REMEMBER_ME_CB}    ==    checked
    Uncheck Checkbox    ${REMEMBER_ME_CB}
    Get Checkbox State    ${REMEMBER_ME_CB}    ==    unchecked

Clear Login Form
    [Documentation]    Clears all form fields
    Fill Text    ${EMAIL_INPUT}    ${EMPTY}
    Fill Text    ${PASSWORD_INPUT}    ${EMPTY}
    Uncheck Checkbox    ${REMEMBER_ME_CB}

Verify Local Storage
    [Documentation]    Verifies value in localStorage
    [Arguments]    ${key}    ${expected_value}
    ${value}=    Evaluate JavaScript    localStorage.getItem('${key}')
    Should Be Equal    ${value}    ${expected_value}

Clear Local Storage
    [Documentation]    Clears browser localStorage
    Evaluate JavaScript    localStorage.clear()

Get Local Storage Item
    [Documentation]    Gets item from localStorage
    [Arguments]    ${key}
    ${value}=    Evaluate JavaScript    document    localStorage.getItem('${key}')
    RETURN    ${value}

Wait For Error Message
    [Documentation]    Waits for error message to appear
    [Arguments]    ${message}
    Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}
    Get Text    .text-red-500    ==    ${message}

Keyboard Key
    [Documentation]    Presses a keyboard key
    [Arguments]    ${action}    ${key}
    Keyboard Key    ${action}    ${key}
*** Settings ***
Documentation     UI Test Suite for Employee Login Page
Resource          ../../keywords/employee_login_keywords.resource
Test Setup        employee_login_keywords.Open Browser To Employee Login Page
Test Teardown     Close Browser

*** Test Cases ***
Verify All UI Elements Present
    [Documentation]    Verifies presence and properties of all UI elements
    [Tags]    ui    smoke
    Verify Employee Page Elements

Input Field Properties
    [Documentation]    Verifies input field properties and attributes
    [Tags]    ui    inputs
    Get Property    ${EMAIL_INPUT}    type    ==    text
    Get Property    ${EMAIL_INPUT}    placeholder    ==    Email address
    Get Property    ${PASSWORD_INPUT}    type    ==    password
    Get Property    ${PASSWORD_INPUT}    placeholder    ==    Password

Remember Me Checkbox State
    [Documentation]    Tests remember me checkbox initial state and toggle
    [Tags]    ui    checkbox
    Get Property    ${REMEMBER_ME_CB}    checked    ==    ${FALSE}
    Toggle Employee Remember Me
    Get Property    ${REMEMBER_ME_CB}    checked    ==    ${TRUE}

Form Field Clearing
    [Documentation]    Tests clearing form fields functionality
    [Tags]    ui    form
    Input Employee Credentials    ${EMPLOYEE_EMAIL}    ${EMPLOYEE_PASSWORD}
    Clear Employee Login Form
    Get Property    ${EMAIL_INPUT}    value    ==    ${EMPTY}
    Get Property    ${PASSWORD_INPUT}    value    ==    ${EMPTY}

Error Message Styling
    [Documentation]    Verifies error message styling
    [Tags]    ui    error
    Submit Employee Login Form
    Wait For Elements State    ${ERROR_MESSAGE}    visible
    Get Style    ${ERROR_MESSAGE}    color    ==    rgb(239, 68, 68)
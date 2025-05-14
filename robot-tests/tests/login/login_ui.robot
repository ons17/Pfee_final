*** Settings ***
Documentation     UI Test Suite for Login Page
...               Tests the visual elements and interactions of the login page
Resource          ../../keywords/login_keywords.resource
Test Setup        Open Browser To Login Page
Test Teardown     Close Browser

*** Test Cases ***
Verify All UI Elements Present
    [Documentation]    Verifies all UI elements are present and visible
    [Tags]    ui    smoke
    Verify Page Elements

Test Password Visibility Toggle
    [Documentation]    Tests password visibility toggle functionality
    [Tags]    ui    password
    Input Login Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    Toggle Password Visibility

Test Remember Me Checkbox
    [Documentation]    Tests remember me checkbox functionality
    [Tags]    ui    checkbox
    Toggle Remember Me

Test Form Field Clearing
    [Documentation]    Tests clearing form fields
    [Tags]    ui    form
    Input Login Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    Clear Login Form
    Get Text    ${EMAIL_INPUT}    ==    ${EMPTY}
    Get Text    ${PASSWORD_INPUT}    ==    ${EMPTY}
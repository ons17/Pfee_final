*** Settings ***
Documentation     Security Test Suite for Employee Login
Resource          ../../keywords/employee_login_keywords.resource
Test Setup        employee_login_keywords.Open Browser To Employee Login Page
Test Teardown     Close Browser

*** Test Cases ***
Password Field Security
    [Documentation]    Tests password field security features
    [Tags]    security    password
    Fill Text    ${PASSWORD_INPUT}    ${EMPLOYEE_PASSWORD}
    Get Property    ${PASSWORD_INPUT}    type    ==    password

Session Timeout Test
    [Documentation]    Tests session timeout behavior
    [Tags]    security    session
    Input Employee Credentials    ${EMPLOYEE_EMAIL}    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    Sleep    2s    # Simulating session timeout
    Reload
    Get Url    ==    ${SITE_URL}/login

XSS Prevention
    [Documentation]    Tests XSS prevention in login fields
    [Tags]    security    xss
    Input Employee Credentials    <script>alert('xss')</script>    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.